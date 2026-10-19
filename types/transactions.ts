export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'; // Adjust based on your public.transaction_status enum options

export interface Transaction {
  id: string; // uuid
  booking_id: string; // uuid
  profile_id: string; // uuid
  amount: number; // numeric(10, 2)
  currency: string; // text (default 'KES')
  status: TransactionStatus; // public.transaction_status
  merchant_request_id: string | null; // text
  checkout_request_id: string | null; // text
  mpesa_receipt_number: string | null; // text
  phone_number: string; // text
  result_code: number | null; // integer
  result_desc: string | null; // text
  callback_metadata: Record<string, unknown> | null; // jsonb
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new transaction (e.g., when initiating an M-Pesa STK push)
export interface TransactionInsertInput {
  booking_id: string;
  profile_id: string;
  amount: number;
  currency?: string;
  status?: TransactionStatus;
  merchant_request_id?: string | null;
  checkout_request_id?: string | null;
  phone_number: string;
}
