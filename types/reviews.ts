export interface Review {
  id: string; // uuid
  property_id: string; // uuid
  booking_id: string | null; // uuid (can be null due to set null on delete)
  guest_id: string; // uuid
  rating: number; // integer (constrained between 1 and 5)
  comment: string; // text
  created_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new review
export interface ReviewInsertInput {
  property_id: string;
  booking_id?: string | null;
  guest_id: string;
  rating: number; // Must be between 1 and 5
  comment: string;
}
