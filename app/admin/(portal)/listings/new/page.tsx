import { Suspense } from "react";
import { connection } from "next/server";
import { ListingForm } from "@/components/host/ListingForm";
import { listHostAccountsForAdmin } from "@/lib/api/properties";

export default function AdminNewListingPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-6 p-4 md:p-8">
          <div className="h-12 w-64 rounded-xl bg-muted" />
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
      }
    >
      <AdminNewListingContent />
    </Suspense>
  );
}

async function AdminNewListingContent() {
  await connection();
  const hosts = await listHostAccountsForAdmin();

  if (hosts.length === 0) {
    return (
      <main className="space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold">Create listing</h1>
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
          There are no host accounts to assign this listing to. Create or
          approve a host account first.
        </p>
      </main>
    );
  }

  return <ListingForm adminMode hostOptions={hosts} />;
}
