import { Suspense } from "react";
import { connection } from "next/server";
import { Building2 } from "lucide-react";
import { PropertyCards } from "@/components/host/PropertyCards";
import {
  listAllPropertiesForAdmin,
} from "@/lib/api/properties";
import type { PropertyWithMedia } from "@/types/properties";

type AdminProperty = PropertyWithMedia & {
  host_profile: { full_name: string; email: string | null } | null;
};

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<AdminListingsLoading />}>
      <AdminListingsContent />
    </Suspense>
  );
}

async function AdminListingsContent() {
  await connection();

  let properties: AdminProperty[] = [];
  let loadError = false;
  try {
    properties = (await listAllPropertiesForAdmin()) as AdminProperty[];
  } catch (error) {
    console.error("Admin listings page failed:", error);
    loadError = true;
  }

  return (
    <main className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div> 
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Building2 className="size-6" aria-hidden="true" />
            Manage listings
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Review and manage properties across all host accounts.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {properties.length.toLocaleString()} listings
        </p>
      </header>

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Listings could not be loaded. Check that the admin property access
          migration has been applied, then refresh.
        </div>
      ) : (
        <PropertyCards properties={properties} adminMode />
      )}
    </main>
  );
}

function AdminListingsLoading() {
  return (
    <main className="animate-pulse space-y-6 p-4 md:p-8" aria-label="Loading listings">
      <div className="h-12 w-64 rounded-xl bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="aspect-[4/3] rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
