import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EarningsOverview } from "@/components/host/EarningsOverview";
import { getHostEarnings } from "@/lib/api/transactions";
import type { HostEarningsData } from "@/lib/api/transactions";

export default function HostEarningsPage() {
  return (
    <main className="space-y-7 p-4 md:p-8">
      <PageHeading />
      <Suspense fallback={<EarningsLoading />}>
        <EarningsContent />
      </Suspense>
    </main>
  );
}

async function EarningsContent() {
  await connection();

  let earnings: HostEarningsData;
  try {
    earnings = await getHostEarnings();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load earnings.";
    if (message.includes("signed in")) {
      redirect("/login?redirectTo=/host/earnings");
    }
    console.error("Host earnings page error:", error);
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
      >
        Your earnings could not be loaded. Please refresh the page or try again
        later.
      </div>
    );
  }

  return (
    <EarningsOverview earnings={earnings} />
  );
}

function EarningsLoading() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Loading earnings">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-border bg-muted"
          />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-border bg-muted" />
    </div>
  );
}

function PageHeading() {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Earnings
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Earnings are calculated from completed transactions
        </p>
      </div>
    </header>
  );
}
