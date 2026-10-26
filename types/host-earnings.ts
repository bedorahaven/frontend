import type { Transaction } from "@/types/transactions";

export interface HostEarningsProperty {
  id: string;
  host_id?: string;
  title: string;
  city: string | null;
  country: string | null;
  host_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface HostEarningsBooking {
  id: string;
  property_id: string;
  guest_id: string | null;
  check_in: string | null;
  check_out: string | null;
  guests_count: number | null;
  total_nights: number | null;
}

export interface HostEarningsGuest {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface HostEarningsTransaction extends Transaction {
  booking: HostEarningsBooking | null;
  property: HostEarningsProperty | null;
  guest: HostEarningsGuest | null;
}
