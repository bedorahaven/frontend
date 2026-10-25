"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin-emails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminLoginFormProps {
  errorCode?: string;
}

export function AdminLoginForm({ errorCode }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsAllowed = isAdminEmail(normalizedEmail);

  const errorMessage =
    errorCode === "not_authorized"
      ? "That Google account is not authorized for the admin portal."
      : errorCode === "profile_check"
        ? "We could not verify your admin role. Please try again."
        : errorCode === "setup_failed"
          ? "Admin access is not set up yet. Contact the system administrator."
          : null;

  const handleGoogleSignIn = async () => {
    if (!emailIsAllowed || loading) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/admin")}`,
        queryParams: {
          login_hint: normalizedEmail,
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Admin Google sign-in failed:", error.message);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Admin sign in
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue with an approved administrator Google account.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="admin-email"
            className="text-xs font-semibold text-foreground"
          >
            Admin email
          </label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={normalizedEmail.length > 0 && !emailIsAllowed}
            aria-describedby="admin-email-feedback"
            className="h-11 rounded-xl"
          />
          <p
            id="admin-email-feedback"
            aria-live="polite"
            className={`min-h-4 text-xs ${
              normalizedEmail.length > 0 && !emailIsAllowed
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {normalizedEmail.length > 0 && !emailIsAllowed
              ? "This email is not authorized for the admin portal."
              : "Only approved administrator accounts can continue."}
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center text-xs text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!emailIsAllowed || loading}
          className="h-11 w-full gap-3 rounded-xl font-semibold"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.16 21.32 7.23 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.84 0 12s.43 3.87 1.18 5.39l4.09-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.16 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
          )}
          Continue with Google
        </Button>


      </section>
    </main>
  );
}
