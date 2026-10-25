import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading admin sign in...
        </div>
      }
    >
      <AdminLoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminLoginContent({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;
  return <AdminLoginForm errorCode={error} />;
}
