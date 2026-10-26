"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, LoaderCircle, Plus, Wallet } from "lucide-react";
import toast from "react-hot-toast";
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
  requestWithdrawal,
  savePayoutMethod,
} from "@/lib/api/withdrawals";
import type { PayoutMethod, WithdrawalRequest } from "@/types/transactions";

interface KenyaBank {
  name: string;
  code: string;
}

interface WithdrawalPanelProps {
  availableBalance: number;
  payoutMethods: PayoutMethod[];
  requests: WithdrawalRequest[];
}

export function WithdrawalPanel({
  availableBalance,
  payoutMethods,
  requests,
}: WithdrawalPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [methodType, setMethodType] = useState<"bank" | "mpesa">("bank");
  const [banks, setBanks] = useState<KenyaBank[]>([]);
  const [bankError, setBankError] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showMethodForm, setShowMethodForm] = useState(payoutMethods.length === 0);

  useEffect(() => {
    let cancelled = false;

    async function loadBanks() {
      try {
        const response = await fetch("/api/withdrawals/banks", {
          cache: "no-store",
        });
        const body: unknown = await response.json();

        if (
          !response.ok ||
          typeof body !== "object" ||
          body === null ||
          !("banks" in body) ||
          !Array.isArray(body.banks)
        ) {
          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Unable to load Kenyan banks.";
          throw new Error(message);
        }

        const bankOptions = body.banks.filter(
          (bank): bank is KenyaBank =>
            typeof bank === "object" &&
            bank !== null &&
            "name" in bank &&
            typeof bank.name === "string" &&
            "code" in bank &&
            typeof bank.code === "string",
        );
        if (!cancelled) setBanks(bankOptions);
      } catch (error) {
        if (!cancelled) {
          setBankError(
            error instanceof Error
              ? error.message
              : "Unable to load Kenyan banks.",
          );
        }
      }
    }

    void loadBanks();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeMethodId = selectedMethodId || payoutMethods[0]?.id || "";

  const selectedMethod = useMemo(
    () => payoutMethods.find((method) => method.id === activeMethodId),
    [payoutMethods, activeMethodId],
  );

  const handleSaveMethod = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof savePayoutMethod>>;
      try {
        result = await savePayoutMethod({
          methodType,
          bankCode: methodType === "bank" ? bankCode : undefined,
          accountNumber: methodType === "bank" ? accountNumber : undefined,
          phoneNumber: methodType === "mpesa" ? phoneNumber : undefined,
        });
      } catch (error) {
        console.error("Saving payout method failed:", error);
        toast.error("Unable to save payout method. Please try again.");
        return;
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Payout method saved.");
      setShowMethodForm(false);
      setBankCode("");
      setAccountNumber("");
      setPhoneNumber("");
      router.refresh();
    });
  };

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMethod) {
      toast.error("Add and select a payout method first.");
      return;
    }

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof requestWithdrawal>>;
      try {
        result = await requestWithdrawal(selectedMethod.id, Number(amount));
      } catch (error) {
        console.error("Submitting withdrawal request failed:", error);
        toast.error("Unable to submit withdrawal request. Please try again.");
        return;
      }
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Withdrawal request submitted for manual review.");
      setAmount("");
      if (result.notificationWarning) toast.error(result.notificationWarning);
      router.refresh();
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Withdraw earnings
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Available balance is completed KES earnings less pending and
            completed withdrawals.
          </p>
        </div>
      </header>

      <div className="rounded-xl bg-muted/50 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Currently available
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          {formatKes(availableBalance)}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Payout methods
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMethodForm((visible) => !visible)}
            >
              <Plus className="size-4" aria-hidden="true" />
              {showMethodForm ? "Close" : "Add method"}
            </Button>
          </div>

          {payoutMethods.length > 0 ? (
            <div className="grid gap-2">
              {payoutMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    activeMethodId === method.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payoutMethod"
                    value={method.id}
                    checked={activeMethodId === method.id}
                    onChange={() => setSelectedMethodId(method.id)}
                    className="mt-1 accent-primary"
                  />
                  <Banknote
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 text-xs">
                    <span className="block font-semibold text-foreground">
                      {method.method_type === "bank"
                        ? method.bank_name
                        : "M-Pesa"}
                    </span>
                    <span className="mt-0.5 block truncate text-muted-foreground">
                      {method.method_type === "bank"
                        ? `${method.account_name} · Account ending ${method.account_number?.slice(-4)}`
                        : method.phone_number}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
              Add a bank account or M-Pesa number before requesting a
              withdrawal.
            </p>
          )}

          {showMethodForm && (
            <form
              onSubmit={handleSaveMethod}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">
                  Payout method
                </span>
                <Select
                  value={methodType}
                  onValueChange={(value) => {
                    if (value === "bank" || value === "mpesa") {
                      setMethodType(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Kenyan bank account</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              {methodType === "bank" ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-foreground">Bank</span>
                    <Select
                      value={bankCode}
                      onValueChange={(value) => {
                        setBankCode(value ?? "");
                      }}
                    >
                      <SelectTrigger className="h-10 w-full text-sm">
                        <SelectValue>
                          {banks.find((bank) => bank.code === bankCode)?.name ||
                            "Select bank"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bankError && (
                      <span role="alert" className="block text-xs text-destructive">
                        {bankError}
                      </span>
                    )}
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-foreground">Account number</span>
                    <Input
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={34}
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value)}
                      className="h-10"
                    />
                    <span className="block text-[11px] text-muted-foreground">
                      We verify the account with Paystack and save the account
                      name returned by the bank.
                    </span>
                  </label>
                </>
              ) : (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    M-Pesa phone number
                  </span>
                  <Input
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0712 345 678"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="h-10"
                  />
                  <span className="block text-[11px] text-muted-foreground">
                    Kenyan numbers only: 07xx, 01xx, or +254 format.
                  </span>
                </label>
              )}

              <Button type="submit" disabled={isPending || (methodType === "bank" && banks.length === 0)} className="w-full">
                {isPending && <LoaderCircle className="size-4 animate-spin" />}
                Save payout method
              </Button>
            </form>
          )}
        </div>

        <form onSubmit={handleRequest} className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Request a withdrawal
          </h3>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Amount (KES)</span>
            <Input
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              max="99999999.99"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 5000"
              className="h-10"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">
              Send to
            </span>
            <Select
              value={activeMethodId}
              onValueChange={(value) => setSelectedMethodId(value ?? "")}
            >
              <SelectTrigger className="h-10 w-full text-sm">
                <SelectValue placeholder="Select payout method" />
              </SelectTrigger>
              <SelectContent>
                {payoutMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.method_type === "bank"
                      ? `${method.bank_name} ···${method.account_number?.slice(-4)}`
                      : `M-Pesa ${method.phone_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Requests greater than your available balance are accepted and
            flagged for manual admin review. Settlement is handled manually.
          </p>
          <Button
            type="submit"
            disabled={isPending || payoutMethods.length === 0}
            className="w-full"
          >
            {isPending && <LoaderCircle className="size-4 animate-spin" />}
            Submit withdrawal request
          </Button>
        </form>
      </div>

      <WithdrawalHistory requests={requests} />
    </section>
  );
}

function WithdrawalHistory({ requests }: { requests: WithdrawalRequest[] }) {
  return (
    <div className="space-y-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          Withdrawal history
        </h3>
        <span className="text-xs text-muted-foreground">
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </span>
      </div>
      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          Your withdrawal requests will appear here.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatKes(Number(request.amount))}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatDestination(request)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDate(request.created_at)}
                </p>
              </div>
              <RequestStatus status={request.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
        styles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function formatDestination(request: WithdrawalRequest): string {
  if (request.payout_method_type === "bank") {
    return `${request.payout_bank_name} · ${request.payout_account_name} · account ending ${request.payout_account_number?.slice(-4)}`;
  }
  return `M-Pesa ${request.payout_phone_number}`;
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
