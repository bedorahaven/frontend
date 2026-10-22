import { GuestAccountAccess } from "@/components/guest-account-access";
import { GuestLogin } from "@/components/guest-login";

export default function GuestLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Guest sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the email address or phone number you used when
            booking. We will send a one-time verification code.
          </p>
        </div>
        <GuestLogin />
      </section>
    </main>
  );
}
