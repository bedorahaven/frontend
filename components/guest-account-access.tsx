"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { completeGuestAccount } from "@/lib/api/guest-account";

type ContactMethod = "email" | "phone";
type Step = "contact" | "code" | "complete";

interface GuestAccountAccessProps {
  initialMethod?: ContactMethod;
  initialContact?: string;
}

function normalizeKenyanPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `254${digits.slice(1)}`;
  } else if (!digits.startsWith("254")) {
    digits = `254${digits}`;
  }

  return /^254(?:7|1)\d{8}$/.test(digits) ? `+${digits}` : null;
}

export function GuestAccountAccess({
  initialMethod,
  initialContact = "",
}: GuestAccountAccessProps) {
  const isCheckoutContact = Boolean(initialContact);
  const [method, setMethod] = useState<ContactMethod>(initialMethod ?? "email");
  const [contact, setContact] = useState(initialContact);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("contact");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestCode = async () => {
    setMessage(null);

    const email = contact.trim().toLowerCase();
    const phone = normalizeKenyanPhone(contact);
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (method === "phone" && !phone) {
      setMessage("Enter a valid Kenyan mobile number.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } =
      method === "email"
        ? await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
          })
        : await supabase.auth.signInWithOtp({
            phone: phone!,
            options: { shouldCreateUser: true },
          });
    setIsLoading(false);

    if (error) {
      console.error("Guest sign-in code request failed:", error.message);
      setMessage(
        method === "phone"
          ? "Could not send a code. Check that phone sign-in and an SMS provider are enabled in Supabase."
          : "Could not send a code. Please check your email sign-in settings and try again.",
      );
      return;
    }

    setStep("code");
    setMessage(
      `We sent a verification code to ${
        method === "email" ? email : phone
      }.`,
    );
  };

  const verifyCode = async () => {
    setMessage(null);
    const token = code.trim();
    if (!token) {
      setMessage("Enter the verification code.");
      return;
    }

    const email = contact.trim().toLowerCase();
    const phone = normalizeKenyanPhone(contact);
    if (method === "phone" && !phone) {
      setMessage("Enter a valid Kenyan mobile number.");
      setStep("contact");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: verifyError } =
      method === "email"
        ? await supabase.auth.verifyOtp({ email, token, type: "email" })
        : await supabase.auth.verifyOtp({ phone: phone!, token, type: "sms" });

    if (verifyError) {
      setIsLoading(false);
      setMessage("That code is invalid or expired. Request a new code and try again.");
      return;
    }

    const result = await completeGuestAccount();
    setIsLoading(false);

    if (!result.success) {
      setMessage(result.error ?? "Guest account verification failed.");
      return;
    }

    setStep("complete");
    setMessage(result.warning ?? null);
  };

  if (step === "complete") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left">
        <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          Guest account verified
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in and can access bookings made with this contact.
        </p>
        {message && (
          <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-background p-4 text-left">
      <div>
        <h4 className="font-semibold">Create your guest account</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Verify your checkout contact with a one-time code to sign in and manage
          your bookings.
        </p>
      </div>

      {step === "contact" && (
        <>
          {!isCheckoutContact && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={method === "email" ? "default" : "outline"}
                onClick={() => setMethod("email")}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={method === "phone" ? "default" : "outline"}
                onClick={() => setMethod("phone")}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone
              </Button>
            </div>
          )}
          <Input
            type={method === "email" ? "email" : "tel"}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={method === "email" ? "you@example.com" : "+254712345678"}
            readOnly={isCheckoutContact}
            autoComplete={method === "email" ? "email" : "tel"}
          />
          <Button
            type="button"
            onClick={requestCode}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Send verification code
          </Button>
        </>
      )}

      {step === "code" && (
        <>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Verification code"
          />
          <Button
            type="button"
            onClick={verifyCode}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Verify and sign in
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("contact");
              setCode("");
              setMessage(null);
            }}
            className="w-full text-center text-xs text-muted-foreground underline"
          >
            Use a different contact or request another code
          </button>
        </>
      )}

      {message && (
        <p
          role="status"
          className={`text-xs ${
            step === "code" && message.startsWith("We sent")
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-destructive"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
