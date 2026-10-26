import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { WithdrawalPanel } from "@/components/host/WithdrawalPanel";
import { getHostEarnings } from "@/lib/api/transactions";
import {
  getHostWithdrawalData,
  type HostWithdrawalData,
} from "@/lib/api/withdrawals";

export default function HostWithdrawalsPage() {
  return (
    <main className="space-y-7 p-4 md:p-8">
      <header>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Withdrawals
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Manage your payout methods, request a withdrawal, and review its
          settlement status.
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

  let withdrawalData: HostWithdrawalData;
  let completedEarnings: number;
  try {
    const [earnings, data] = await Promise.all([
      getHostEarnings(),
      getHostWithdrawalData(),
    ]);
    withdrawalData = data;
    completedEarnings = earnings.transactions
      .filter(
        (transaction) =>
          transaction.status === "completed" && transaction.currency === "KES",
      )
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load withdrawals.";
    if (message.includes("signed in")) {
      redirect("/login?redirectTo=/host/withdrawals");
    }
    console.error("Host withdrawals page error:", error);
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
      >
        Your withdrawal details could not be loaded. Please refresh the page or
        try again later.
      </div>
    );
  }

  const reservedWithdrawals = withdrawalData.requests
    .filter((request) => ["pending", "completed"].includes(request.status))
    .reduce((total, request) => total + Number(request.amount || 0), 0);
  const availableBalance = Math.max(0, completedEarnings - reservedWithdrawals);

  return (
    <WithdrawalPanel
      availableBalance={availableBalance}
      payoutMethods={withdrawalData.payoutMethods}
      requests={withdrawalData.requests}
    />
  );
}

function WithdrawalsLoading() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted" />
  );
}
