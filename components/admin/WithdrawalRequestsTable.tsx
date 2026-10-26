"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  DataFilterBar,
  DataFilterSelect,
} from "@/components/ui/data-filter-bar";
import {
  updateWithdrawalRequestStatus,
  type AdminWithdrawalRequest,
} from "@/lib/api/withdrawals";
import { formatDate, formatKes } from "@/lib/utils";

const PAGE_SIZE = 10;
type StatusFilter = "all" | "pending" | "completed" | "failed" | "cancelled";

export function WithdrawalRequestsTable({
  requests,
}: {
  requests: AdminWithdrawalRequest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (!query) return true;

      return [
        request.id,
        request.host?.full_name,
        request.host?.email,
        request.host?.phone_number,
        request.payout_method_type,
        request.payout_bank_name,
        request.payout_account_name,
        request.payout_account_number,
        request.payout_phone_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [requests, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setSearchValue = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const setStatusValue = (value: string | null) => {
    if (
      value === "all" ||
      value === "pending" ||
      value === "completed" ||
      value === "failed" ||
      value === "cancelled"
    ) {
      setStatusFilter(value);
      setPage(1);
    }
  };

  const updateStatus = (requestId: string, status: "completed" | "failed") => {
    setUpdatingId(requestId);
    startTransition(async () => {
      try {
        const result = await updateWithdrawalRequestStatus(requestId, status);
        if (!result.success) {
          toast.error(result.error);
        } else {
          toast.success(
            status === "completed"
              ? "Withdrawal marked as completed."
              : "Withdrawal marked as failed.",
          );
          router.refresh();
        }
      } catch (error) {
        console.error("Updating withdrawal status failed:", error);
        toast.error("Unable to update this withdrawal request. Please try again.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Withdrawal requests
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review payout details and record the result of manual settlements.
          </p>
        </div>
        <DataFilterBar
          searchValue={search}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search host, method, or request ID"
          searchLabel="Search withdrawal requests"
          className="sm:grid-cols-[minmax(14rem,1fr)_minmax(10rem,12rem)]"
        >
          <DataFilterSelect
            value={statusFilter}
            onValueChange={setStatusValue}
            ariaLabel="Filter withdrawal requests by status"
            placeholder="Pending requests"
            options={[
              { value: "pending", label: "Pending" },
              { value: "all", label: "All statuses" },
              { value: "completed", label: "Completed" },
              { value: "failed", label: "Failed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </DataFilterBar>
      </header>

      {visible.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {requests.length === 0
              ? "No withdrawal requests"
              : "No matching requests"}
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            {requests.length === 0
              ? "New host requests will appear here for manual settlement."
              : "Try changing the search or status filter."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((request) => (
            <article
              key={request.id}
              className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(12rem,1fr)_minmax(17rem,1.2fr)_auto]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {request.host?.full_name || "Host profile unavailable"}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {request.host?.email || "No email on profile"}
                </p>
                {request.host?.phone_number && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.host.phone_number}
                  </p>
                )}
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Request #{request.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(request.created_at)}
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {request.payout_method_type === "bank"
                    ? "Bank account"
                    : "M-Pesa destination"}
                </p>
                {request.payout_method_type === "bank" ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {request.payout_bank_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.payout_account_name}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-foreground">
                      {request.payout_account_number}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Bank code: {request.payout_bank_code}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {request.payout_phone_number}
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 xl:items-end">
                <div>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {formatKes(Number(request.amount))}
                  </p>
                  <RequestStatus status={request.status} />
                </div>
                {request.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2 xl:flex">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => updateStatus(request.id, "completed")}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isPending && updatingId === request.id ? (
                        "Saving..."
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Completed
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => updateStatus(request.id, "failed")}
                    >
                      {isPending && updatingId === request.id ? (
                        "Saving..."
                      ) : (
                        <>
                          <XCircle className="size-4" aria-hidden="true" />
                          Failed
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <footer className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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

function RequestStatus({ status }: { status: string }) {
  const style =
    status === "pending"
      ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
      : status === "completed"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "bg-destructive/10 text-destructive";
  return (
    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${style}`}>
      {status}
    </span>
  );
}
