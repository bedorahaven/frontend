import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ListingForm } from "@/components/host/ListingForm";
import {
  getAdminPropertyForEdit,
  listHostAccountsForAdmin,
} from "@/lib/api/properties";

interface AdminEditListingPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminEditListingPage({
  params,
}: AdminEditListingPageProps) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-6 p-4 md:p-8">
          <div className="h-12 w-64 rounded-xl bg-muted" />
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
      }
    >
      <AdminEditListingContent params={params} />
    </Suspense>
  );
}

async function AdminEditListingContent({
  params,
}: AdminEditListingPageProps) {
  await connection();
  const { id } = await params;
  const [property, hosts] = await Promise.all([
    getAdminPropertyForEdit(id),
    listHostAccountsForAdmin(),
  ]);

  if (!property) notFound();

  return (
    <ListingForm
      initialProperty={property}
      adminMode
      hostOptions={hosts}
    />
  );
}
