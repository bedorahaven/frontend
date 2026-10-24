import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarDays, Clock3 } from "lucide-react";
import { ReservationsTable } from "@/components/host/ReservationsTable";
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
}

export default function HostReservationsPage() {
  return (
    <Suspense fallback={<ReservationsLoading />}>
      <HostReservationsContent />
    </Suspense>
  );
}

async function HostReservationsContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/host/reservations");
  }

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select("id, title, city, country")
    .eq("host_id", user.id);

  if (propertiesError) {
    console.error("Host reservation listings fetch error:", propertiesError.message);
    return (
      <main className="space-y-6 p-4 md:p-8">
        <header>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Reservations</h1>
        </header>
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Your listings could not be loaded, so reservations are unavailable.
          Please refresh the page or try again later.
        </div>
      </main>
    );
  }

  const properties = (propertiesData ?? []) as HostReservationProperty[];
  const propertyIds = properties.map((property) => property.id);
  const { data, error } =
    propertyIds.length > 0
      ? await supabase.from("bookings").select("*").in("property_id", propertyIds)
      : { data: [], error: null };

  if (error) {
    console.error("Host bookings fetch error:", error.message);
    return (
      <main className="space-y-6 p-4 md:p-8">
        <header>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Reservations</h1>
        </header>
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Reservations could not be loaded. Please refresh the page or try again
          later.
        </div>
      </main>
    );
  }

  const reservations = (data ?? []) as ReservationRecord[];
  const guestIds = [
    ...new Set(
      reservations
        .map((reservation) => reservation.guest_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const [guestsResult] = await Promise.all([
    guestIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email, phone_number, avatar_url")
          .in("id", guestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (guestsResult.error) {
    console.error("Reservation guest details fetch error:", guestsResult.error.message);
  }

  const propertiesWithMedia = properties.map((property) => ({
    ...property,
    property_media: [],
  }));
  const guests = (guestsResult.data ?? []) as HostReservationGuest[];
  const propertyById = new Map(propertiesWithMedia.map((property) => [property.id, property]));
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));

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

  const reservationRows = reservations.map((reservation) => {
    const guestId =
      typeof reservation.guest_id === "string" ? reservation.guest_id : null;
    return {
      ...reservation,
      property: propertyById.get(reservation.property_id) ?? null,
      guest: guestId ? guestById.get(guestId) ?? null : null,
    };
  }) as HostReservation[];

  return (
    <main className="space-y-7 p-4 md:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reservations
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Track guest stays, booking details, and reservation status across
            your properties.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Reservation activity for your listings
        </p>
      </header>

      <section
        aria-label="Reservation overview"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0"
      >
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none">
          <SummaryCard
            label="Total reservations"
            value={reservations.length}
            detail="All reservations across your listings"
            icon={CalendarDays}
            accent="blue"
          />
        </div>
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none">
          <SummaryCard
            label="Ongoing reservations"
            value={ongoingReservations}
            detail="Confirmed stays happening today"
            icon={Clock3}
            accent="green"
          />
        </div>
      </section>

      {guestsResult.error && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        >
          Some listing or guest profile details could not be loaded. The
          reservation records are still available below.
        </p>
      )}

      <ReservationsTable reservations={reservationRows} />
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

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof CalendarDays;
  accent: "blue" | "green";
}) {
  const accentStyles =
    accent === "green"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-accent/10 text-accent";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`flex size-11 items-center justify-center rounded-xl ${accentStyles}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="absolute -bottom-8 -right-6 size-24 rounded-full bg-current opacity-[0.03]" />
    </article>
  );
}
