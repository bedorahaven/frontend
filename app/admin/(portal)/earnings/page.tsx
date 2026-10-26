import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { EarningsOverview } from "@/components/host/EarningsOverview";
import { WithdrawalRequestsTable } from "@/components/admin/WithdrawalRequestsTable";
import { getAdminEarnings } from "@/lib/api/transactions";
import type { HostEarningsData } from "@/lib/api/transactions";
import {
  getAdminWithdrawalRequests,
  type AdminWithdrawalRequest,
} from "@/lib/api/withdrawals";

export default function AdminEarningsPage() {
  return (
    <main className="space-y-7 p-4 md:p-8">
      <header>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Platform earnings
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Review payment activity across all listings and host accounts.
        </p>
      </header>
      <Suspense fallback={<EarningsLoading />}>
        <AdminEarningsContent />
      </Suspense>
    </main>
  );
}

async function AdminEarningsContent() {
  await connection();
  let earnings: HostEarningsData;
  let withdrawalRequests: AdminWithdrawalRequest[];

  try {
    [earnings, withdrawalRequests] = await Promise.all([
      getAdminEarnings(),
      getAdminWithdrawalRequests(),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load earnings.";
    if (message.includes("signed in")) {
      redirect("/admin/login?redirectTo=/admin/earnings");
    }

    console.error("Admin earnings page error:", error);
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
      >
        Platform earnings could not be loaded. Verify that the admin access
        migrations have been applied, then refresh.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <EarningsOverview earnings={earnings} adminMode />
      <WithdrawalRequestsTable requests={withdrawalRequests} />
    </div>
  );
}

function EarningsLoading() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Loading earnings">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible sm:pb-0">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-32 w-[85vw] max-w-[320px] shrink-0 snap-center rounded-2xl border border-border bg-muted sm:w-auto sm:max-w-none sm:shrink"
          />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-border bg-muted" />
    </div>
  );
}