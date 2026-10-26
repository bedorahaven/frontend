"use server";

import type { Transaction } from "@/types/transactions";
import type {
  HostEarningsBooking,
  HostEarningsProperty,
  HostEarningsTransaction,
  HostEarningsGuest,
} from "@/types/host-earnings";
import { createClient } from "@/utils/supabase/server";

const QUERY_PAGE_SIZE = 500;

export interface HostEarningsData {
  propertiesCount: number;
  bookingsCount: number;
  transactions: HostEarningsTransaction[];
}

export async function getHostEarnings(): Promise<HostEarningsData> {
  return getEarningsForRole(false);
}

export async function getAdminEarnings(): Promise<HostEarningsData> {
  return getEarningsForRole(true);
}

async function getEarningsForRole(adminMode: boolean): Promise<HostEarningsData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to view earnings.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Earnings role verification error:", profileError.message);
    throw new Error("Unable to verify your access to earnings.");
  }
  if ((adminMode && profile?.role !== "admin") || (!adminMode && profile?.role !== "host")) {
    throw new Error(
      adminMode
        ? "You do not have permission to view platform earnings."
        : "You do not have permission to view host earnings.",
    );
  }

  const properties: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    host_id: string;
  }[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    let propertiesQuery = supabase
      .from("properties")
      .select("id, title, city, country, host_id")
      .order("id")
      .range(offset, offset + QUERY_PAGE_SIZE - 1);

    if (!adminMode) propertiesQuery = propertiesQuery.eq("host_id", user.id);
    const { data, error } = await propertiesQuery;

    if (error) {
      console.error("Earnings properties fetch error:", error.message);
      throw new Error("Unable to load properties for earnings.");
    }

    properties.push(...(data ?? []));
    if (!data || data.length < QUERY_PAGE_SIZE) break;
  }

  const hostProperties = properties as HostEarningsProperty[];
  const propertyById = new Map(hostProperties.map((property) => [property.id, property]));
  const propertyIds = hostProperties.map((property) => property.id);

  if (propertyIds.length === 0) {
    return { propertiesCount: 0, bookingsCount: 0, transactions: [] };
  }

  const hostBookings: HostEarningsBooking[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    let bookingsQuery = supabase
      .from("bookings")
      .select("id, property_id, guest_id, check_in, check_out, guests_count, total_nights")
      .order("id")
      .range(offset, offset + QUERY_PAGE_SIZE - 1);

    if (!adminMode) bookingsQuery = bookingsQuery.in("property_id", propertyIds);
    const { data, error } = await bookingsQuery;

    if (error) {
      console.error("Earnings bookings fetch error:", error.message);
      throw new Error("Unable to load bookings for earnings.");
    }

    hostBookings.push(...((data ?? []) as HostEarningsBooking[]));
    if (!data || data.length < QUERY_PAGE_SIZE) break;
  }

  const bookingById = new Map(hostBookings.map((booking) => [booking.id, booking]));
  const bookingIds = hostBookings.map((booking) => booking.id);

  const transactions: Transaction[] = [];
  if (adminMode || bookingIds.length > 0) {
    for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
      let transactionsQuery = supabase
        .from("transactions")
        .select("*")
        .order("id")
        .range(offset, offset + QUERY_PAGE_SIZE - 1);

      if (!adminMode) transactionsQuery = transactionsQuery.in("booking_id", bookingIds);
      const { data, error } = await transactionsQuery;

      if (error) {
        console.error("Earnings transactions fetch error:", error.message);
        throw new Error("Unable to load transaction history.");
      }

      transactions.push(...((data ?? []) as Transaction[]));
      if (!data || data.length < QUERY_PAGE_SIZE) break;
    }
  }

  const hostTransactions = transactions;
  const guestIds = [
    ...new Set(
      hostBookings
        .map((booking) => booking.guest_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const hostIds = adminMode
    ? [...new Set(properties.map((property) => property.host_id))]
    : [];
  let guestById = new Map<string, HostEarningsGuest>();

  const [guestsResult, hostsResult] = await Promise.all([
    guestIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", guestIds)
      : Promise.resolve({ data: [], error: null }),
    hostIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", hostIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (guestsResult.error) {
    console.error("Earnings guest details fetch error:", guestsResult.error.message);
  } else {
    guestById = new Map(
      ((guestsResult.data ?? []) as HostEarningsGuest[]).map((guest) => [guest.id, guest]),
    );
  }

  if (hostsResult.error) {
    console.error("Earnings host details fetch error:", hostsResult.error.message);
  }

  const hostsById = new Map(
    (hostsResult.data ?? []).map((host) => [host.id, host]),
  );

  return {
    propertiesCount: hostProperties.length,
    bookingsCount: hostBookings.length,
    transactions: hostTransactions.map((transaction) => {
      const booking = bookingById.get(transaction.booking_id);
      const property = booking ? propertyById.get(booking.property_id) ?? null : null;
      return {
        ...transaction,
        booking: booking ?? null,
        property: property
          ? {
              ...property,
              ...(adminMode
                ? { host_profile: hostsById.get(property.host_id ?? "") ?? null }
                : {}),
            }
          : null,
        guest:
          booking?.guest_id ? guestById.get(booking.guest_id) ?? null : null,
      };
    }),
  };
}
