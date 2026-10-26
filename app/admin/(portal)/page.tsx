import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  HomeIcon,
  Users,
  UsersRound,
} from "lucide-react";
import { PropertyCards } from "@/components/host/PropertyCards";
import { SummaryCard } from "@/components/host/SummaryCard";
import { listAllPropertiesForAdmin } from "@/lib/api/properties";
import type { PropertyWithMedia } from "@/types/properties";

type AdminProperty = PropertyWithMedia & {
  host_profile: { full_name: string; email: string | null } | null;
};

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardLoading />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  await connection();

  const supabase = await createClient();

  let latestProperties: AdminProperty[] = [];
  let stats: {
    title: string;
    value: number;
    icon: typeof Building2;
    description: string;
  }[] = [];
  let dashboardError = false;

  try {
    const [
      properties,
      listingsCount,
      activeListingsCount,
      hostsCount,
      usersCount,
    ] = await Promise.all([
      listAllPropertiesForAdmin(10),
      supabase.from("properties").select("id", { count: "exact", head: true }),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "host"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const queryError =
      listingsCount.error ??
      activeListingsCount.error ??
      hostsCount.error ??
      usersCount.error;
    if (queryError) {
      throw queryError;
    }

    latestProperties = properties as AdminProperty[];
    stats = [
      {
        title: "Total Listings",
        value: listingsCount.count ?? 0,
        icon: Building2,
        description: "Listings across all host accounts",
      },
      {
        title: "Active Listings",
        value: activeListingsCount.count ?? 0,
        icon: BadgeCheck,
        description: "Listings currently available",
      },
      {
        title: "Host Accounts",
        value: hostsCount.count ?? 0,
        icon: Users,
        description: "Hosts with an account",
      },
      {
        title: "Total Accounts",
        value: usersCount.count ?? 0,
        icon: UsersRound,
        description: "Guest, host, and admin profiles",
      },
    ];
  } catch (error) {
    console.error("Admin dashboard data failed:", error);
    dashboardError = true;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <HomeIcon className="size-6" aria-hidden="true" />Dashboard Overview
          </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide overview of listings and user accounts.
        </p>
      </div>

      {dashboardError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          The dashboard summary and recent listings could not be loaded. Verify
          that the admin profile and listing access migrations have been
          applied, then refresh.
        </div>
      ) : (
        <>
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

          <section className="space-y-4 pt-2">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Recent listings
                </h2>
              </div>
              <Link
                href="/admin/listings"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent/80"
              >
                See all listings
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </header>
            <PropertyCards
              properties={latestProperties}
              adminMode={true}
              pageSize={10}
            />
          </section>
        </>
      )}
    </div>
  );
}

function AdminDashboardLoading() {
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
