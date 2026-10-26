import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarDays, Clock3 } from "lucide-react";
import { ReservationsTable } from "@/components/host/ReservationsTable";
import { SummaryCard } from "@/components/host/SummaryCard";
import type {
  HostReservation,
  HostReservationGuest,
  HostReservationProperty,
} from "@/types/host-reservations";
import { createClient } from "@/utils/supabase/server";

interface ReservationRecord extends Record<string, unknown> {
  id: string;
  property_id: string;
  status: string | null;
  total_price: number | string | null;
  guest_id?: string | null;
}

export default function AdminReservationsPage() {
  return (
    <Suspense fallback={<ReservationsLoading />}>
      <AdminReservationsContent />
    </Suspense>
  );
}

async function AdminReservationsContent() {
  await connection();
  const supabase = await createClient();

  const [
    { data: reservationsData, error: reservationsError },
    { data: propertiesData, error: propertiesError },
  ] = await Promise.all([
    supabase.from("bookings").select("*"),
    supabase.from("properties").select("id, title, city, country, host_id"),
  ]);

  if (reservationsError || propertiesError) {
    if (reservationsError) {
      console.error("Admin bookings fetch error:", reservationsError.message);
    }
    if (propertiesError) {
      console.error("Admin reservation listings fetch error:", propertiesError.message);
    }

    return (
      <main className="space-y-6 p-4 md:p-8">
        <header>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reservations
          </h1>
        </header>
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Reservations could not be loaded. Verify that the admin reservation
          access migration has been applied, then refresh.
        </div>
      </main>
    );
  }

  const reservations = (reservationsData ?? []) as ReservationRecord[];
  const properties = propertiesData ?? [];
  const guestIds = [
    ...new Set(
      reservations
        .map((reservation) => reservation.guest_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const hostIds = [...new Set(properties.map((property) => property.host_id))];

  const [guestsResult, hostsResult] = await Promise.all([
    guestIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email, phone_number, avatar_url")
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
    console.error("Admin reservation guest details fetch error:", guestsResult.error.message);
  }
  if (hostsResult.error) {
    console.error("Admin reservation host details fetch error:", hostsResult.error.message);
  }

  const hostsById = new Map(
    (hostsResult.data ?? []).map((host) => [host.id, host]),
  );
  const propertiesWithHosts: HostReservationProperty[] = properties.map((property) => ({
    id: property.id,
    title: property.title,
    city: property.city,
    country: property.country,
    property_media: [],
    host_profile: hostsById.get(property.host_id) ?? null,
  }));
  const propertiesById = new Map(
    propertiesWithHosts.map((property) => [property.id, property]),
  );
  const guests = (guestsResult.data ?? []) as HostReservationGuest[];
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const reservationRows = reservations.map((reservation) => ({
    ...reservation,
    property: propertiesById.get(reservation.property_id) ?? null,
    guest:
      typeof reservation.guest_id === "string"
        ? guestsById.get(reservation.guest_id) ?? null
        : null,
  })) as HostReservation[];

  const today = new Date().toISOString().slice(0, 10);
  const ongoingReservations = reservations.filter((reservation) => {
    const rawStartDate = reservation.start_date ?? reservation.check_in;
    const rawEndDate = reservation.end_date ?? reservation.check_out;
    const status = String(reservation.status ?? "").toLowerCase();
    const isActiveStatus = !["cancelled", "canceled", "pending", "rejected"].includes(status);
    return (
      isActiveStatus &&
      typeof rawStartDate === "string" &&
      typeof rawEndDate === "string" &&
      rawStartDate.length >= 10 &&
      rawEndDate.length >= 10 &&
      rawStartDate.slice(0, 10) <= today &&
      rawEndDate.slice(0, 10) > today
    );
  }).length;

  return (
    <main className="space-y-7 p-4 md:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reservations
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Review guest stays and booking status across all platform listings.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {reservations.length.toLocaleString()} platform reservations
        </p>
      </header>

      <section
        aria-label="Reservation overview"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0"
      >
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none">
          <SummaryCard
            label="Total reservations"
            value={String(reservations.length)}
            detail="Bookings across all listings"
            icon={CalendarDays}
            accent="blue"
          />
        </div>
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none">
          <SummaryCard
            label="Ongoing reservations"
            value={String(ongoingReservations)}
            detail="Confirmed stays happening today"
            icon={Clock3}
            accent="green"
          />
        </div>
      </section>

      {(guestsResult.error || hostsResult.error) && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        >
          Some guest or host profile details could not be loaded. Reservation
          records are still available below.
        </p>
      )}

      <ReservationsTable reservations={reservationRows} adminMode />
    </main>
  );
}

function ReservationsLoading() {
  return (
    <div className="animate-pulse space-y-7 p-4 md:p-8" aria-label="Loading reservations">
      <div className="h-12 w-64 rounded-xl bg-muted" />
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
        {[...Array(2)].map((_, index) => (
          <div
            key={index}
            className="h-32 w-[85vw] max-w-[320px] shrink-0 snap-center rounded-2xl bg-muted sm:w-auto sm:max-w-none"
          />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-muted" />
    </div>
  );
}