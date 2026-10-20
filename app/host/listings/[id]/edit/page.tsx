import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/host/ListingForm";
import { getHostPropertyForEdit } from "@/lib/api/properties";
import { createClient } from "@/utils/supabase/server";

interface EditListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/host/listings/${id}/edit`);
  }

  const property = await getHostPropertyForEdit(id);
  if (!property) notFound();

  return <ListingForm initialProperty={property} />;
}
