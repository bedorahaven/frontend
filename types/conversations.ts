export interface Conversation {
  id: string; // uuid
  property_id: string; // uuid
  booking_id: string | null; // uuid; null for pre-booking inquiries
  guest_id: string | null; // uuid; null for anonymous guests
  host_id: string; // uuid
  guest_email: string | null;
  guest_name: string | null;
  updated_at: string; // timestamp with time zone
  created_at: string; // timestamp with time zone
}

export interface ConversationInsertInput {
  property_id: string;
  booking_id?: string | null;
  guest_id?: string | null;
  host_id: string;
  guest_email: string;
  guest_name?: string | null;
}

export interface Message {
  id: string; // uuid
  conversation_id: string; // uuid
  sender_id: string | null; // uuid; null for anonymous guests
  content: string; // text
  is_read: boolean | null; // boolean
  created_at: string; // timestamp with time zone
}

export interface MessageInsertInput {
  conversation_id: string;
  sender_id?: string | null;
  content: string;
  is_read?: boolean;
}
