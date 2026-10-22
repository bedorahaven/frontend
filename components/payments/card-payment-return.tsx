"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";

type PaymentState =
  | { status: "verifying" }
  | { status: "success"; amount: number; currency: string }
  | { status: "error"; message: string };

interface CardPaymentReturnProps {
  propertyId: string;
  reference: string | null;
  referenceMismatch: boolean;
}

function isVerificationResult(
  value: unknown,
): value is { verified: true; amount: number; currency: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "verified" in value &&
    value.verified === true &&
    "amount" in value &&
    typeof value.amount === "number" &&
    "currency" in value &&
    typeof value.currency === "string"
  );
}

function getErrorMessage(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return null;
}

export function CardPaymentReturn({
  propertyId,
  reference,
  referenceMismatch,
}: CardPaymentReturnProps) {
  const [payment, setPayment] = useState<PaymentState>({ status: "verifying" });
  const displayedPayment: PaymentState =
    !reference || referenceMismatch
      ? {
          status: "error",
          message: "The payment reference is missing or invalid.",
        }
      : payment;

  useEffect(() => {
    if (!reference || referenceMismatch) {
      return;
    }

    const paymentReference = reference;
    const controller = new AbortController();

    async function verifyPayment() {
      try {
        const params = new URLSearchParams({
          reference: paymentReference,
          property_id: propertyId,
        });
        const response = await fetch(`/api/payments/verify-card?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();

        if (!response.ok || !isVerificationResult(result)) {
          setPayment({
            status: "error",
            message:
              getErrorMessage(result) ??
              "We could not verify your payment. Please try again.",
          });
          return;
        }

        setPayment({
          status: "success",
          amount: result.amount,
          currency: result.currency,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Card payment return verification failed:", error);
        setPayment({
          status: "error",
          message: "Unable to verify your payment right now. Please try again.",
        });
      }
    }

    void verifyPayment();
    return () => controller.abort();
  }, [propertyId, reference, referenceMismatch]);

  const confettiPieces = Array.from({ length: 36 }, (_, index) => ({
    left: `${(index * 37) % 100}%`,
    delay: `${(index % 9) * 0.12}s`,
    duration: `${2.1 + (index % 6) * 0.22}s`,
    color: `hsl(${(index * 47) % 360} 82% 58%)`,
    rotation: `${(index * 53) % 360}deg`,
  }));

  return (
    <main className="relative isolate flex min-h-[80vh] items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground">
      {displayedPayment.status === "success" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {confettiPieces.map((piece, index) => (
            <span
              key={index}
              className="payment-confetti absolute top-[-12px] h-3 w-2 rounded-sm opacity-0"
              style={{
                left: piece.left,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                rotate: piece.rotation,
              }}
            />
          ))}
        </div>
      )}

      <section
        aria-live="polite"
        className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-10"
      >
        {displayedPayment.status === "verifying" && (
          <>
            <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-accent" />
            <h1 className="mt-6 text-2xl font-bold">Verifying your payment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we confirm your card payment with Paystack.
            </p>
          </>
        )}

        {displayedPayment.status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold">Payment successful!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Paystack verified your payment of{" "}
              <span className="font-semibold text-foreground">
                {displayedPayment.currency}{" "}
                {(displayedPayment.amount / 100).toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              .
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you for booking with Bedora Haven.
            </p>
          </>
        )}

        {displayedPayment.status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <CircleAlert className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Payment not verified</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {displayedPayment.message}
            </p>
          </>
        )}

        <Link
          href={`/properties/${propertyId}`}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to property
        </Link>
      </section>
    </main>
  );
}
