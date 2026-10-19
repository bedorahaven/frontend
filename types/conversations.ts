export interface Conversation {
  id: string; // uuid
  property_id: string; // uuid
  booking_id: string; // uuid
  guest_id: string; // uuid
  host_id: string; // uuid
  updated_at: string; // timestamp with time zone
  created_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new conversation
export interface ConversationInsertInput {
  property_id: string;
  booking_id: string;
  guest_id: string;
  host_id: string;
}

export interface Message {
  id: string; // uuid
  conversation_id: string; // uuid
  sender_id: string; // uuid
  content: string; // text
  is_read: boolean | null; // boolean
  created_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new message
export interface MessageInsertInput {
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean;
}
