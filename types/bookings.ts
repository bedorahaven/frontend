export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'; // Add any other statuses you have in your public.booking_status enum

export interface Booking {
  id: string; // uuid
  property_id: string; // uuid
  guest_id: string; // uuid
  check_in: string; // date (represented as string in JS, e.g. "YYYY-MM-DD")
  check_out: string; // date
  total_nights: number; // integer
  guests_count: number; // integer
  total_price: number; // numeric(10, 2)
  status: BookingStatus; // public.booking_status
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new booking (omitting auto-generated fields like id and timestamps)
export interface BookingInsertInput {
  property_id: string;
  guest_id?: string; // Optional if handled via default/session
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count?: number;
  total_price: number;
  status?: BookingStatus;
}

export interface GuestLookupResult {
  booking_id: string;
  property_title: string;
  city: string;
  country: string;
  check_in: string;
  check_out: string;
  total_price: number;
  status: BookingStatus;
  mpesa_receipt_number: string | null;
}
