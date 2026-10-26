import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WithdrawalRequestsTable } from "@/components/admin/WithdrawalRequestsTable";
import {
  getAdminWithdrawalRequests,
  type AdminWithdrawalRequest,
} from "@/lib/api/withdrawals";

export default function AdminWithdrawalsPage() {
  return (
    <main className="space-y-7 p-4 md:p-8">
      <header>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Withdrawal requests
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Review host payout details and record the result of manual
          settlements.
        </p>
      </header>
      <Suspense fallback={<WithdrawalsLoading />}>
        <WithdrawalsContent />
      </Suspense>
    </main>
  );
}

async function WithdrawalsContent() {
  await connection();
  let requests: AdminWithdrawalRequest[];

  try {
    requests = await getAdminWithdrawalRequests();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load withdrawals.";
    if (message.includes("signed in")) {
      redirect("/admin/login?redirectTo=/admin/withdrawals");
    }
    console.error("Admin withdrawals page error:", error);
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
      >
        Withdrawal requests could not be loaded. Verify the admin access
        migrations have been applied, then refresh.
      </div>
    );
  }

  return <WithdrawalRequestsTable requests={requests} />;
}

function WithdrawalsLoading() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted" />
  );
}
