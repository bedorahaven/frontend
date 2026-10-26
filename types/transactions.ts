export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'; // Adjust based on your public.transaction_status enum options
export type TransactionType = 'payment' | 'withdrawal';
export type PayoutMethodType = 'bank' | 'mpesa';

export interface Transaction {
  id: string; // uuid
  booking_id: string | null; // uuid; null for withdrawals
  profile_id: string; // uuid
  amount: number; // numeric(10, 2)
  currency: string; // text (default 'KES')
  transaction_type: TransactionType;
  status: TransactionStatus; // public.transaction_status
  merchant_request_id: string | null; // text
  checkout_request_id: string | null; // text
  mpesa_receipt_number: string | null; // text
  phone_number: string | null; // text
  payout_method_id: string | null;
  payout_method_type: PayoutMethodType | null;
  payout_bank_name: string | null;
  payout_bank_code: string | null;
  payout_account_name: string | null;
  payout_account_number: string | null;
  payout_phone_number: string | null;
  result_code: number | null; // integer
  result_desc: string | null; // text
  callback_metadata: Record<string, unknown> | null; // jsonb
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting a new transaction (e.g., when initiating an M-Pesa STK push)
export interface TransactionInsertInput {
  booking_id: string | null;
  profile_id: string;
  amount: number;
  currency?: string;
  transaction_type?: TransactionType;
  status?: TransactionStatus;
  merchant_request_id?: string | null;
  checkout_request_id?: string | null;
  phone_number?: string | null;
}

export interface PayoutMethod {
  id: string;
  host_id: string;
  method_type: PayoutMethodType;
  bank_name: string | null;
  bank_code: string | null;
  account_name: string | null;
  account_number: string | null;
  phone_number: string | null;
  verification_status: 'pending' | 'verified' | 'failed';
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest extends Transaction {
  transaction_type: 'withdrawal';
}
