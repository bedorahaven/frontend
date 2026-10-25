import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminEmail } from "@/lib/auth/admin-emails";
import { createClient } from "@/utils/supabase/server";

export default async function AdminPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Verifying admin access...
        </div>
      }
    >
      <VerifiedAdminPortal>{children}</VerifiedAdminPortal>
    </Suspense>
  );
}

async function VerifiedAdminPortal({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/admin/login?error=not_authorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin role verification failed:", profileError.message);
    redirect("/admin/login?error=profile_check");
  }

  if (profile?.role !== "admin") {
    redirect("/admin/login?error=setup_failed");
  }

  return <AdminShell>{children}</AdminShell>;
}
