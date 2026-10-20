"use server";

import type { Transaction } from "@/types/transactions";
import type {
  HostEarningsBooking,
  HostEarningsProperty,
  HostEarningsTransaction,
  HostEarningsGuest,
} from "@/types/host-earnings";
import { createClient } from "@/utils/supabase/server";

export interface HostEarningsData {
  propertiesCount: number;
  bookingsCount: number;
  transactions: HostEarningsTransaction[];
}

export async function getHostEarnings(): Promise<HostEarningsData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to view host earnings.");
  }

  const { data: properties, error: propertyError } = await supabase
    .from("properties")
    .select("id, title, city, country")
    .eq("host_id", user.id);

  if (propertyError) {
    console.error("Host earnings properties fetch error:", propertyError.message);
    throw new Error("Unable to load your properties.");
  }

  const hostProperties = (properties ?? []) as HostEarningsProperty[];
  const propertyById = new Map(hostProperties.map((property) => [property.id, property]));
  const propertyIds = hostProperties.map((property) => property.id);

  if (propertyIds.length === 0) {
    return { propertiesCount: 0, bookingsCount: 0, transactions: [] };
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, property_id, guest_id, check_in, check_out, guests_count, total_nights")
    .in("property_id", propertyIds);

  if (bookingsError) {
    console.error("Host earnings bookings fetch error:", bookingsError.message);
    throw new Error("Unable to load bookings for your properties.");
  }

  const hostBookings = (bookings ?? []) as HostEarningsBooking[];
  const bookingById = new Map(hostBookings.map((booking) => [booking.id, booking]));
  const bookingIds = hostBookings.map((booking) => booking.id);

  if (bookingIds.length === 0) {
    return {
      propertiesCount: hostProperties.length,
      bookingsCount: 0,
      transactions: [],
    };
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  if (transactionsError) {
    console.error("Host earnings transactions fetch error:", transactionsError.message);
    throw new Error("Unable to load transaction history.");
  }

  const hostTransactions = (transactions ?? []) as Transaction[];
  const guestIds = [
    ...new Set(
      hostBookings
        .map((booking) => booking.guest_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  let guestById = new Map<string, HostEarningsGuest>();

  if (guestIds.length > 0) {
    const { data: guests, error: guestError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", guestIds);

    if (guestError) {
      console.error("Host earnings guest details fetch error:", guestError.message);
    } else {
      guestById = new Map(
        ((guests ?? []) as HostEarningsGuest[]).map((guest) => [guest.id, guest]),
      );
    }
  }

  return {
    propertiesCount: hostProperties.length,
    bookingsCount: hostBookings.length,
    transactions: hostTransactions.map((transaction) => {
      const booking = bookingById.get(transaction.booking_id);
      const property = booking ? propertyById.get(booking.property_id) ?? null : null;
      return {
        ...transaction,
        booking: booking ?? null,
        property,
        guest:
          booking?.guest_id ? guestById.get(booking.guest_id) ?? null : null,
      };
    }),
  };
}
