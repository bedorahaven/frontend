'use server';

import { createClient } from '@/utils/supabase/server';
import { sendHostBookingNotification } from '@/lib/email';
import { calculateBookingPrice } from '@/lib/booking-pricing';

export interface Booking {
  id: string;
  property_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  tax_fee: number;
  service_fee: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_method: 'mpesa' | 'paystack';
  guest_email?: string;
  phone_number?: string;
}

export async function getPropertyBookedDates(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_property_booked_dates', {
    p_property_id: propertyId,
  });

  if (error) {
    console.error('Booked date lookup failed:', error.message);
    throw new Error('Unable to load this property’s availability.');
  }

  if (
    !Array.isArray(data) ||
    data.some(
      (range) =>
        typeof range.check_in !== 'string' ||
        typeof range.check_out !== 'string',
    )
  ) {
    throw new Error('Availability response was invalid.');
  }

  return data;
}

export async function createBooking(payload: {
  property_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  phone_number?: string;
  guest_email?: string;
  payment_method: 'mpesa' | 'paystack';
}) {
  try {
    const checkInTime = Date.parse(`${payload.check_in}T00:00:00Z`);
    const checkOutTime = Date.parse(`${payload.check_out}T00:00:00Z`);
    if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime)) {
      throw new Error('Enter valid check-in and check-out dates.');
    }
    if (checkOutTime <= checkInTime) {
      throw new Error('Check-out must be at least one day after check-in.');
    }
    const expectedNights = (checkOutTime - checkInTime) / 86_400_000;
    if (payload.total_nights !== expectedNights) {
      throw new Error('The stay duration does not match the selected dates.');
    }

    const supabase = await createClient();
    const { data: pricingProperty, error: pricingPropertyError } = await supabase
      .from('properties')
      .select('price_per_night, max_guests, is_active')
      .eq('id', payload.property_id)
      .maybeSingle();

    if (pricingPropertyError) {
      console.error('Booking price lookup failed:', pricingPropertyError.message);
      throw new Error('Unable to verify this property’s price.');
    }
    if (!pricingProperty || pricingProperty.is_active !== true) {
      throw new Error('This property is unavailable for booking.');
    }
    if (
      typeof pricingProperty.max_guests !== 'number' ||
      payload.guests_count < 1 ||
      payload.guests_count > pricingProperty.max_guests
    ) {
      throw new Error('Guest count exceeds this property’s capacity.');
    }

    const pricing = calculateBookingPrice(
      Number(pricingProperty.price_per_night),
      payload.total_nights,
      payload.guests_count,
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: bookingId, error: bookingError } = await supabase.rpc(
      'create_guest_booking',
      {
        p_property_id: payload.property_id,
        p_check_in: payload.check_in,
        p_check_out: payload.check_out,
        p_total_nights: payload.total_nights,
        p_guests_count: payload.guests_count,
        p_total_price: pricing.total,
        p_payment_method: payload.payment_method,
        p_guest_email: payload.guest_email || null,
        p_phone_number: payload.phone_number || null,
      },
    );

    if (bookingError) {
      if (
        bookingError.code === '23P01' ||
        bookingError.message.toLowerCase().includes('already booked')
      ) {
         throw new Error('Selected dates are already booked. Please choose different dates.');
      }
      throw new Error(bookingError.message);
    }

    if (!bookingId) {
      throw new Error('Booking could not be created.');
    }

    let pricingWarning: string | undefined;
    const { error: feeError } = await supabase.rpc(
      'reconcile_booking_fees',
      { p_booking_id: bookingId },
    );
    if (feeError) {
      console.error('Booking fee persistence failed:', feeError.message);
      pricingWarning =
        'Your booking was created, but its settlement details could not be saved. Please contact support.';
    }

    const booking: Booking = {
      id: bookingId,
      property_id: payload.property_id,
      guest_id: user?.id ?? null,
      check_in: payload.check_in,
      check_out: payload.check_out,
      total_nights: payload.total_nights,
      guests_count: payload.guests_count,
      total_price: pricing.total,
      tax_fee: pricing.taxFee,
      service_fee: pricing.serviceFee,
      status: 'confirmed',
      payment_method: payload.payment_method,
      guest_email: payload.guest_email,
      phone_number: payload.phone_number,
    };

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('title, host_id')
      .eq('id', payload.property_id)
      .single();

    if (propertyError || !property) {
      console.error('Booking host lookup failed:', propertyError?.message);
      return {
        success: true,
        booking,
        notificationWarning:
          pricingWarning ??
          'Your booking was saved, but host details could not be loaded.',
      };
    }

    const { data: hostProfile, error: hostProfileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', property.host_id)
      .maybeSingle();

    if (hostProfileError) {
      console.error('Booking host email lookup failed:', hostProfileError.message);
      return {
        success: true,
        booking,
        notificationWarning:
          pricingWarning ??
          'Your booking was saved, but the host email could not be looked up.',
      };
    }

    if (!hostProfile?.email) {
      console.error(`No email found for host ${property.host_id}.`);
      return {
        success: true,
        booking,
        notificationWarning:
          pricingWarning ??
          'Your booking was saved, but no host email is available.',
      };
    }

    try {
      await sendHostBookingNotification({
        hostEmail: hostProfile.email,
        propertyName: property.title || 'Your Property',
        guestContact:
          payload.payment_method === 'mpesa'
            ? payload.phone_number || ''
            : payload.guest_email || '',
        checkIn: payload.check_in,
        checkOut: payload.check_out,
        totalNights: payload.total_nights,
        totalPrice: pricing.total,
        paymentMethod: payload.payment_method,
      });
    } catch (error) {
      console.error('Booking notification delivery failed:', error);
      return {
        success: true,
        booking,
        notificationWarning:
          pricingWarning ??
          'Your booking was saved, but the host notification email could not be sent.',
      };
    }

    return { success: true, booking, notificationWarning: pricingWarning };
  } catch (err: unknown) {
    console.error('Booking creation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to complete booking',
    };
  }
}
