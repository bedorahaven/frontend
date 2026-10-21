import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Building2, CalendarDays, Wallet, BookmarkCheck } from "lucide-react";
import { PropertiesTable } from "@/components/host/PropertiesTable";
import { listProperties } from "@/lib/api/properties";

export default function HostDashboardPage() {
  return (
    <Suspense fallback={<HostDashboardLoading />}>
      <HostDashboardContent />
    </Suspense>
  );
}

async function HostDashboardContent() {
  await connection();

  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const currentDate = new Date().toISOString();

  // 2. Fetch properties and booking statistics concurrently
  const [properties, reservationsRes, activeBookingsRes, earningsRes] = await Promise.all([
    listProperties(),
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("host_id", user.id),
    // Check reservations where check-out / end date is in the future
    supabase
      .from("reservations")
      .select("property_id")
      .eq("host_id", user.id)
      .gt("end_date", currentDate),
    supabase
      .from("reservations")
      .select("total_price")
      .eq("host_id", user.id)
      .eq("status", "completed"),
  ]);

  const totalProperties = properties.length;
  const totalReservations = reservationsRes.count || 0;

  // Calculate unique properties with active or future bookings
  const activeBookedPropertyIds = new Set(
    activeBookingsRes.data?.map((r) => r.property_id) || []
  );
  const activeBookedPropertiesCount = activeBookedPropertyIds.size;

  const totalEarnings =
    earningsRes.data?.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0) || 0;

  const formattedEarnings = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalEarnings);

  const stats = [
    {
      title: "Total Properties",
      value: totalProperties,
      icon: Building2,
      description: "Active listings under your account",
    },
    {
      title: "Active Booked Properties",
      value: activeBookedPropertiesCount,
      icon: BookmarkCheck,
      description: "Properties with ongoing or future stays",
    },
    {
      title: "Total Reservations",
      value: totalReservations,
      icon: CalendarDays,
      description: "Bookings received across all properties",
    },
    {
      title: "Total Earnings",
      value: formattedEarnings,
      icon: Wallet,
      description: "Cumulative revenue from completed stays",
    },
  ];

  // Slice the latest 5 properties for the overview page table display
  const latestProperties = properties.slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Hidden on mobile, shown on desktop (md+) */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here is a summary of your hosting business performance.
        </p>
      </div>

      {/* Horizontal scroll container on mobile, standard grid on sm/md+ */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
        {stats.map(({ title, value, icon: Icon, description }) => (
          <div
            key={title}
            className="group relative w-[85vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg sm:w-auto sm:max-w-none sm:shrink"
          >
            {/* Subtle top theme highlight line */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary opacity-60 transition-opacity group-hover:opacity-100" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </span>
              <div className="rounded-xl bg-accent/10 p-2.5 text-accent transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {value}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Properties Table Section (Showing latest 5 items) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">Recent Properties</h2>
          <p className="text-xs text-muted-foreground">
            A quick overview of your latest listings and status.
          </p>
        </div>

        <PropertiesTable properties={latestProperties} />
      </div>
    </div>
  );
}

function HostDashboardLoading() {
  return (
    <div className="animate-pulse space-y-8 p-4 md:p-8" aria-label="Loading dashboard">
      <div className="h-12 w-64 rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
