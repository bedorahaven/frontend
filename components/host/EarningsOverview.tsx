import { Banknote, Building2, CalendarCheck2, ReceiptText } from "lucide-react";
import { SummaryCard } from "@/components/host/SummaryCard";
import { TransactionsTable } from "@/components/host/TransactionsTable";
import type { HostEarningsData } from "@/lib/api/transactions";

interface EarningsOverviewProps {
  earnings: HostEarningsData;
  adminMode?: boolean;
}

export function EarningsOverview({
  earnings,
  adminMode = false,
}: EarningsOverviewProps) {
  const completedAmounts = getAmountsByCurrency(earnings, "completed");
  const pendingAmounts = getAmountsByCurrency(earnings, "pending");
  const completedSummary = formatCurrencySummary(completedAmounts);
  const pendingSummary = formatCurrencySummary(pendingAmounts);
  const scope = adminMode ? "platform" : "your properties";

  return (
    <>
      <section
        aria-label="Earnings overview"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0"
      >
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink">
          <SummaryCard
            label="Completed earnings"
            value={completedSummary.value}
            detail={completedSummary.detail || "Successful payments received"}
            icon={Banknote}
            accent="green"
          />
        </div>
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink">
          <SummaryCard
            label="Transactions"
            value={earnings.transactions.length.toLocaleString()}
            detail="All payment attempts"
            icon={ReceiptText}
            accent="blue"
          />
        </div>
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink">
          <SummaryCard
            label="Total bookings"
            value={earnings.bookingsCount.toLocaleString()}
            detail={`Bookings across ${scope}`}
            icon={CalendarCheck2}
            accent="violet"
          />
        </div>
        <div className="w-[85vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink">
          <SummaryCard
            label={adminMode ? "Total listings" : "Your properties"}
            value={earnings.propertiesCount.toLocaleString()}
            detail={
              pendingAmounts.size > 0
                ? `${pendingSummary.detail || pendingSummary.value} pending`
                : adminMode
                  ? "Listings across all host accounts"
                  : "Listings in your host account"
            }
            icon={Building2}
            accent="amber"
          />
        </div>
      </section>

      <TransactionsTable
        transactions={earnings.transactions}
        adminMode={adminMode}
      />
    </>
  );
}

function getAmountsByCurrency(
  earnings: HostEarningsData,
  status: string,
): Map<string, number> {
  return earnings.transactions
    .filter((transaction) => transaction.status === status)
    .reduce((totals, transaction) => {
      const currency = transaction.currency || "KSh";
      totals.set(
        currency,
        (totals.get(currency) ?? 0) + Number(transaction.amount || 0),
      );
      return totals;
    }, new Map<string, number>());
}

function formatCurrencySummary(amounts: Map<string, number>): {
  value: string;
  detail: string;
} {
  const formatted = [...amounts].map(([currency, amount]) => {
    try {
      return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString("en-KE", {
        maximumFractionDigits: 0,
      })}`;
    }
  });

  if (formatted.length === 0) return { value: "0", detail: "" };
  if (formatted.length === 1) return { value: formatted[0], detail: "" };
  return {
    value: `${formatted.length} currencies`,
    detail: formatted.join(" · "),
  };
}
