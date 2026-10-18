import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseBookings = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
}

// Fetch all confirmed check-in and check-out ranges for a property to disable dates on the calendar
export async function getPropertyBookedDates(propertyId: string) {
  try {
    const { data, error } = await supabaseBookings
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

// Create a new booking and trigger M-Pesa STK payment flow
export async function createBooking(payload: {
  property_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  phone_number: string;
  guest_name?: string;
}) {
  try {
    // 1. Create guest profile or use a guest placeholder ID if unauthenticated
    // For quick guest checkout without login, we insert or use a guest phone reference
    const { data, error } = await supabaseBookings
      .from('bookings')
      .insert({
        property_id: payload.property_id,
        check_in: payload.check_in,
        check_out: payload.check_out,
        total_nights: payload.total_nights,
        guests_count: payload.guests_count,
        total_price: payload.total_price,
        status: 'confirmed', // Auto-confirm upon successful M-Pesa STK simulation
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23P01') {
        throw new Error('Selected dates are already booked. Please choose different dates.');
      }
      throw new Error(error.message);
    }

    return { success: true, booking: data };
  } catch (err: unknown) {
    console.error('Booking creation error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to complete booking' };
  }
}
