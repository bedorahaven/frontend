import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Banknote, Building2, ReceiptText, CalendarCheck2 } from "lucide-react";
import { TransactionsTable } from "@/components/host/TransactionsTable";
import { getHostEarnings } from "@/lib/api/transactions";
import type { HostEarningsData } from "@/lib/api/transactions";
import { SummaryCard } from "@/components/host/SummaryCard";

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

  const completedEarnings = earnings.transactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const pendingAmount = earnings.transactions
    .filter((transaction) => transaction.status === "pending")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  const currency =
    earnings.transactions.find((transaction) => transaction.currency)
      ?.currency ?? "KSh";

  return (
    <>
      {/* <section aria-label="Earnings overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"> */}
      <div
        aria-label="Earnings overview"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0"
      >
        <div
          key={"completedEarnings"}
          className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink"
        >
          <SummaryCard
            label="Completed earnings"
            value={formatCurrency(completedEarnings, currency)}
            detail="Successful payments received"
            icon={Banknote}
            accent="green"
          />
          <SummaryCard
            label="Transactions"
            value={earnings.transactions.length.toLocaleString()}
            detail="All payment attempts"
            icon={ReceiptText}
            accent="blue"
          />
          <SummaryCard
            label="Total bookings"
            value={earnings.bookingsCount.toLocaleString()}
            detail="Bookings across your properties"
            icon={CalendarCheck2}
            accent="violet"
          />
          <SummaryCard
            label="Your properties"
            value={earnings.propertiesCount.toLocaleString()}
            detail={
              pendingAmount > 0
                ? `${formatCurrency(pendingAmount, currency)} pending`
                : "Listings in your host account"
            }
            icon={Building2}
            accent="amber"
          />
        </div>
      </div>

      <TransactionsTable transactions={earnings.transactions} />
    </>
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
