import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Building2, CalendarDays, Wallet, BookmarkCheck } from "lucide-react";
import { PropertiesTable } from "@/components/host/PropertiesTable";
import { listHostProperties } from "@/lib/api/properties";
import { SummaryCard } from "@/components/host/SummaryCard";

export default function HostListingsPage() {
  return (
    <Suspense fallback={<HostListingsLoading />}>
      <HostListingsContent />
    </Suspense>
  );
}

async function HostListingsContent() {
  await connection();

  const supabase = await createClient();

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const currentDate = new Date().toISOString();

  // 2. Fetch properties and booking statistics concurrently for maximum performance
  const [properties, reservationsRes, activeBookingsRes, earningsRes] = await Promise.all([
    listHostProperties(),
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

  // Calculate unique properties that currently have a future reservation
  const activeBookedPropertyIds = new Set(
    activeBookingsRes.data?.map((r) => r.property_id) || []
  );
  const activeBookedPropertiesCount = activeBookedPropertyIds.size;

  // Calculate cumulative earnings
  const totalEarnings =
    earningsRes.data?.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0) || 0;

  const formattedEarnings = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KSh",
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
      description: "Properties with ongoing guest stays",
    },
    {
      title: "Total Reservations",
      value: totalReservations,
      icon: CalendarDays,
      description: "Cumulative bookings received",
    },
    {
      title: "Total Earnings",
      value: formattedEarnings,
      icon: Wallet,
      description: "Revenue from completed stays",
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Hidden on mobile, shown on desktop (md+) */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here is a summary of your hosting business performance.
        </p>
      </div>

      {/* Summary Cards Section (Horizontal scroll on mobile, responsive grid on desktop) */}
       <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
              {stats.map(({ title, value, icon, description }) => (
                <div
                  key={title}
                  className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink"
                >
                  <SummaryCard
                    label={title}
                    value={String(value)}
                    detail={description}
                    icon={icon}
                    accent="blue"
                  />
                </div>
              ))}
            </div>

      {/* Properties Management Table Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">Your Properties</h2>
          <p className="text-xs text-muted-foreground">
            Manage your listings, check status, and track property pricing.
          </p>
        </div>

        <PropertiesTable properties={properties} />
      </div>
    </div>
  );
}

function HostListingsLoading() {
  return (
    <div className="animate-pulse space-y-8 p-4 md:p-8" aria-label="Loading listings">
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
