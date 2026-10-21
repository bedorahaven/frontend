"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HostEarningsTransaction } from "@/types/host-earnings";

const PAGE_SIZE = 8;
type DateFilter = "all" | "30" | "90";

interface TransactionsTableProps {
  transactions: HostEarningsTransaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [asOf, setAsOf] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          transactions
            .map((transaction) => transaction.status?.toLowerCase())
            .filter((status): status is string => Boolean(status)),
        ),
      ].sort(),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const dateCutoff =
      dateFilter === "all" || asOf === null
        ? null
        : asOf - Number(dateFilter) * 24 * 60 * 60 * 1000;

    return [...transactions]
      .filter((transaction) => {
        if (
          statusFilter !== "all" &&
          transaction.status?.toLowerCase() !== statusFilter
        ) {
          return false;
        }
        if (
          dateCutoff !== null &&
          new Date(transaction.created_at).getTime() < dateCutoff
        ) {
          return false;
        }
        if (!query) return true;
        return [
          transaction.id,
          transaction.booking_id,
          transaction.mpesa_receipt_number,
          transaction.phone_number,
          transaction.property?.title,
          transaction.property?.city,
          transaction.guest?.full_name,
          transaction.guest?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [transactions, search, statusFilter, dateFilter, asOf]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  );
  const visibleTransactions = filteredTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatus = (value: string | null) => {
    if (value) {
      setStatusFilter(value);
      setPage(1);
    }
  };

  const updateDate = (value: string | null) => {
    if (value === "all" || value === "30" || value === "90") {
      setDateFilter(value);
      setAsOf(value === "all" ? null : Date.now());
      setPage(1);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Transactions
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Payment history for bookings at your properties.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_10rem_10rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search property, guest, receipt, ID"
              aria-label="Search transactions"
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={updateStatus}>
            <SelectTrigger
              aria-label="Filter transactions by status"
              className="h-10 text-sm"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={updateDate}>
            <SelectTrigger
              aria-label="Filter transactions by date"
              className="h-10 text-sm"
            >
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleTransactions.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CreditCard className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {transactions.length === 0
              ? "No transactions yet"
              : "No matching transactions"}
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            {transactions.length === 0
              ? "Payment records for your bookings will appear here."
              : "Try changing your search or filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Transaction
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Booking & property
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Guest
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-border/70">
                    <TableCell className="px-5 py-4">
                      <TransactionIdentity transaction={transaction} />
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal py-4">
                      <BookingProperty transaction={transaction} />
                    </TableCell>
                    <TableCell className="py-4">
                      <GuestInfo transaction={transaction} />
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="text-sm font-semibold text-foreground">
                        {formatAmount(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.phone_number && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {transaction.phone_number}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <TransactionStatus status={transaction.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {visibleTransactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <TransactionIdentity transaction={transaction} />
                  <TransactionStatus status={transaction.status} />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <BookingProperty transaction={transaction} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Guest
                    </p>
                    <GuestInfo transaction={transaction} className="mt-1" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </p>
                    {transaction.phone_number && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {transaction.phone_number}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {filteredTransactions.length > 0 && (
        <footer className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredTransactions.length)} of{" "}
            {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-14 text-center text-xs text-muted-foreground">
              {page} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
            >
              <ChevronRight />
            </Button>
          </div>
        </footer>
      )}
    </section>
  );
}

function TransactionIdentity({
  transaction,
}: {
  transaction: HostEarningsTransaction;
}) {
  return (
    <div>
      <p className="font-mono text-xs font-semibold text-foreground">
        {transaction.mpesa_receipt_number || `#${transaction.id.slice(0, 8)}`}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {formatDateTime(transaction.created_at)}
      </p>
    </div>
  );
}

function BookingProperty({
  transaction,
}: {
  transaction: HostEarningsTransaction;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground">
        {transaction.property?.title || "Property details unavailable"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Booking #{transaction.booking_id.slice(0, 8)}
        {transaction.property?.city ? ` · ${transaction.property.city}` : ""}
      </p>
      {transaction.booking?.check_in && transaction.booking.check_out && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(transaction.booking.check_in)} –{" "}
          {formatDate(transaction.booking.check_out)}
        </p>
      )}
    </div>
  );
}

function GuestInfo({
  transaction,
  className,
}: {
  transaction: HostEarningsTransaction;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-foreground">
        {transaction.guest?.full_name || "Guest"}
      </p>
      {transaction.guest?.email && (
        <p className="mt-1 max-w-44 truncate text-[11px] text-muted-foreground">
          {transaction.guest.email}
        </p>
      )}
    </div>
  );
}

function TransactionStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    completed:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    pending:
      "bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:text-amber-300",
    failed: "bg-destructive/10 text-destructive ring-destructive/20",
    cancelled: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ring-1 ring-inset ${
        styles[normalized] ?? "bg-muted text-muted-foreground ring-border"
      }`}
    >
      {formatStatus(normalized)}
    </span>
  );
}

function formatAmount(amount: number, currency: string): string {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KES",
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
