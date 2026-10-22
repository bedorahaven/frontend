'use server';

import { createClient } from '@/utils/supabase/server';
import { sendHostBookingNotification } from '@/lib/email';

export interface Booking {
  id: string;
  property_id: string;
  guest_id?: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_method: 'mpesa' | 'paystack';
  guest_email?: string;
  phone_number?: string;
}

export async function getPropertyBookedDates(propertyId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('property_id', propertyId)
      .eq('status', 'confirmed');

    if (error) {
      console.warn('Error fetching booked dates:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Exception fetching booked dates:', err);
    return [];
  }
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
    const supabase = await createClient();

    // Get current authenticated user session if available
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Insert booking into 'bookings' table
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        property_id: payload.property_id,
        guest_id: user?.id || null,
        check_in: payload.check_in,
        check_out: payload.check_out,
        total_nights: payload.total_nights,
        guests_count: payload.guests_count,
        total_price: payload.total_price,
        status: 'confirmed', // Auto-confirm for test simulation
        payment_method: payload.payment_method,
        guest_email: payload.guest_email || null,
        phone_number: payload.phone_number || null,
      })
      .select()
      .single();

    if (bookingError) {
      if (bookingError.code === '23P01') {
        throw new Error('Selected dates are already booked. Please choose different dates.');
      }
      throw new Error(bookingError.message);
    }

    // 2. Fetch Property to get owner_id for transaction & email
    const { data: property } = await supabase
      .from('properties')
      .select('title, owner_id, profiles:owner_id(email)')
      .eq('id', payload.property_id)
      .single();

    const hostId = property?.owner_id || user?.id;

    // 3. Insert transaction record into 'transactions' table
    if (hostId) {
      const mockReceipt = `MOCK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const { error: txError } = await supabase.from('transactions').insert({
        booking_id: booking.id,
        profile_id: hostId,
        amount: payload.total_price,
        currency: 'KES',
        status: 'completed', // Recorded as completed upon mock success
        phone_number: payload.phone_number || 'N/A',
        mpesa_receipt_number: payload.payment_method === 'mpesa' ? mockReceipt : null,
        merchant_request_id: `REQ_${Date.now()}`,
        checkout_request_id: `CHK_${Date.now()}`,
        result_code: 0,
        result_desc: 'Transaction successful (Mock Test)',
      });

      if (txError) {
        console.warn('Transaction record creation failed:', txError.message);
      }
    }

    // 4. Send Resend email to Host
    const hostEmail = (
      property as unknown as { profiles?: { email?: string } | null } | null
    )?.profiles?.email;
    const propertyTitle = property?.title || 'Your Property';

    if (hostEmail) {
      await sendHostBookingNotification({
        hostEmail,
        propertyName: propertyTitle,
        guestContact:
          payload.payment_method === 'mpesa'
            ? payload.phone_number || ''
            : payload.guest_email || '',
        checkIn: payload.check_in,
        checkOut: payload.check_out,
        totalNights: payload.total_nights,
        totalPrice: payload.total_price,
        paymentMethod: payload.payment_method,
      });
    }

    return { success: true, booking };
  } catch (err: unknown) {
    console.error('Booking creation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to complete booking',
    };
  }
}
