"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  BedDouble,
  Bath,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProperty } from "@/lib/api/properties";
import type { PropertyWithMedia } from "@/types/properties";
import toast from "react-hot-toast";

type ManagedProperty = PropertyWithMedia & {
  host_profile?: { full_name: string; email: string | null } | null;
};

interface PropertyCardsProps {
  properties: ManagedProperty[];
  adminMode?: boolean;
}

const PAGE_SIZE = 6;

export function PropertyCards({
  properties,
  adminMode = false,
}: PropertyCardsProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] =
    useState<PropertyWithMedia | null>(null);

  const filteredProperties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...properties]
      .filter(
        (property) =>
          !query ||
          property.title?.toLowerCase().includes(query) ||
          property.city?.toLowerCase().includes(query) ||
          property.country?.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [properties, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredProperties.length / PAGE_SIZE) || 1;
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleDelete = async (property: PropertyWithMedia) => {
    setDeletingPropertyId(property.id);
    try {
      const result = await deleteProperty(property.id, adminMode);
      if (!result.success) {
        toast.error(result.error || "Unable to delete this listing.");
        return;
      }

      toast.success("Listing deleted.");
      if (result.warning) toast.error(result.warning);
      setPropertyToDelete(null);
      setCurrentPage((page) =>
        Math.min(
          page,
          Math.max(1, Math.ceil((filteredProperties.length - 1) / PAGE_SIZE)),
        ),
      );
      router.refresh();
    } catch (error) {
      console.error("Listing deletion failed:", error);
      toast.error("Unable to delete this listing. Please try again.");
    } finally {
      setDeletingPropertyId(null);
    }
  };

  if (!properties || properties.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Building2 className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-foreground">
          No properties listed yet
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          You haven&apos;t added any properties to your hosting account. Create
          your first listing to start accepting guest bookings.
        </p>
        <Link
          href={adminMode ? "/admin/listings/new" : "/host/listings/new"}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Add Your First Property
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties by title or city..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search properties"
              className="h-10 pl-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSortOrder((order) => (order === "asc" ? "desc" : "asc"))
              }
              className="h-10 text-xs"
              aria-label={`Sort by date, currently ${sortOrder === "desc" ? "newest first" : "oldest first"}`}
            >
              <ArrowUpDown className="size-4" />
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </Button>
            <Link
              href={adminMode ? "/admin/listings/new" : "/host/listings/new"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Add Property
            </Link>
          </div>
        </div>

        {paginatedProperties.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProperties.map((property) => {
              const imageUrl =
                property.property_media?.[0]?.media_url || "/bedora_icon.png";
              const category = property.category
                ? property.category.replaceAll("_", " ")
                : "Trending";
              const price = new Intl.NumberFormat("en-KE", {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
              }).format(property.price_per_night || 0);

              return (
                <article key={property.id} className="group min-w-0">
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={imageUrl}
                      alt={property.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-[11px] font-semibold shadow-sm ${
                        property.is_active
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {property.is_active ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <XCircle className="size-3.5" />
                      )}
                      {property.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-background/95 px-3 py-1.5 text-[10px] font-semibold capitalize shadow-sm">
                      {category}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {property.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {[property.city, property.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                      {adminMode && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Host: {property.host_profile?.full_name || "Unknown"}
                          {property.host_profile?.email
                            ? ` · ${property.host_profile.email}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {price}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        / night
                      </span>
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble className="size-3.5" />
                      {property.bedrooms} beds
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Bath className="size-3.5" />
                      {property.bathrooms} baths
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      Up to {property.max_guests}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Link
                      href={
                        adminMode
                          ? `/admin/listings/${property.id}/edit`
                          : `/host/listings/${property.id}/edit`
                      }
                      aria-label={`Edit ${property.title}`}
                      title="Edit listing"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <Link
                      href={`/properties/${property.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${property.title} in a new tab`}
                      title="View listing"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <Eye className="size-4" />
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPropertyToDelete(property)}
                      disabled={deletingPropertyId === property.id}
                      aria-label={`Delete ${property.title}`}
                      title="Delete listing"
                      className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deletingPropertyId === property.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
            No matching properties found.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="h-9 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={propertyToDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingPropertyId === null) setPropertyToDelete(null);
        }}
      >
        <DialogContent showCloseButton={deletingPropertyId === null}>
          <DialogHeader>
            <DialogTitle>Delete listing?</DialogTitle>
            <DialogDescription>
              {propertyToDelete
                ? `Delete "${propertyToDelete.title}"? This will permanently remove the listing and its media records.`
                : "This will permanently remove the listing and its media records."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingPropertyId !== null}
              onClick={() => setPropertyToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={propertyToDelete === null || deletingPropertyId !== null}
              onClick={() => {
                if (propertyToDelete) void handleDelete(propertyToDelete);
              }}
            >
              {deletingPropertyId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete listing"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
