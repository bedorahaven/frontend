import { redirect } from "next/navigation";
import { Banknote, Building2, ReceiptText, CalendarCheck2 } from "lucide-react";
import { TransactionsTable } from "@/components/host/TransactionsTable";
import { getHostEarnings } from "@/lib/api/transactions";
import type { HostEarningsData } from "@/lib/api/transactions";

export default async function HostEarningsPage() {
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
      <main className="space-y-6 p-4 md:p-8">
        <PageHeading />
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Your earnings could not be loaded. Please refresh the page or try
          again later.
        </div>
      </main>
    );
  }

  const completedEarnings = earnings.transactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const pendingAmount = earnings.transactions
    .filter((transaction) => transaction.status === "pending")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  const currency =
    earnings.transactions.find((transaction) => transaction.currency)?.currency ??
    "KES";

  return (
    <main className="space-y-7 p-4 md:p-8">
      <PageHeading />

      <section aria-label="Earnings overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <TransactionsTable
        transactions={earnings.transactions}
        asOf={new Date().toISOString()}
      />
    </main>
  );
}

function PageHeading() {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Host workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Earnings
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Follow payment activity and completed earnings from bookings at your
          properties.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Earnings are calculated from completed transactions
      </p>
    </header>
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
  value: string;
  detail: string;
  icon: typeof Banknote;
  accent: "green" | "blue" | "violet" | "amber";
}) {
  const accentStyles = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "bg-accent/10 text-accent",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  }[accent];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accentStyles}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="absolute -bottom-8 -right-6 size-24 rounded-full bg-current opacity-[0.03]" />
    </article>
  );
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
