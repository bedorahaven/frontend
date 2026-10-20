"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Building2,
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import type { PropertyWithMedia } from "@/types/properties";
import { deleteProperty } from "@/lib/api/properties";
import toast from "react-hot-toast";

interface PropertiesTableProps {
  properties: PropertyWithMedia[];
}

export function PropertiesTable({ properties }: PropertiesTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] =
    useState<PropertyWithMedia | null>(null);
  const pageSize = 5;

  const handleDelete = async (property: PropertyWithMedia) => {
    setDeletingPropertyId(property.id);
    try {
      const result = await deleteProperty(property.id);
      if (!result.success) {
        toast.error(result.error || "Unable to delete this listing.");
        return;
      }

      toast.success("Listing deleted.");
      if (result.warning) toast.error(result.warning);
      setPropertyToDelete(null);
      router.refresh();
    } catch (error) {
      console.error("Listing deletion failed:", error);
      toast.error("Unable to delete this listing. Please try again.");
    } finally {
      setDeletingPropertyId(null);
    }
  };

  // Filter and sort properties natively
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.country?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [properties, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredProperties.length / pageSize) || 1;
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Empty State Handling
  if (!properties || properties.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-foreground">No properties listed yet</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          You haven&apos;t added any properties to your hosting account. Create your first listing to start accepting guest bookings.
        </p>
        <div className="mt-6">
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Property</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties by title or city..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs"
          />
        </div>
        <Link
          href="/host/listings/new"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Property</span>
        </Link>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs font-bold text-muted-foreground">
                <Button
                  variant="ghost"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="-ml-3 h-8 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <span>Property</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Price / Night</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Details</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProperties.length > 0 ? (
              paginatedProperties.map((property) => {
                const imageUrl = property.property_media?.[0]?.media_url || "/bedora_icon.png";
                const categoryFormatted = property.category
                  ? property.category.replace("_", " ").toUpperCase()
                  : "TRENDING";
                const formattedPrice = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "KES",
                }).format(property.price_per_night || 0);

                return (
                  <TableRow key={property.id} className="border-border transition-colors hover:bg-muted/30">
                    <TableCell className="py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          <Image
                            src={imageUrl}
                            alt={property.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {property.title}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{property.city}, {property.country}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-[10px] font-bold tracking-wider text-secondary-foreground">
                        {categoryFormatted}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-xs font-semibold">
                      {formattedPrice}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      <span>{property.bedrooms} beds</span> &bull; <span>{property.bathrooms} baths</span> &bull; <span>Max {property.max_guests} guests</span>
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      {property.is_active ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                          <XCircle className="h-4 w-4" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/host/listings/${property.id}/edit`}
                          aria-label={`Edit ${property.title}`}
                          title="Edit listing"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <Link
                          href={`/properties/${property.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${property.title} in a new tab`}
                          title="View listing"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
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
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deletingPropertyId === property.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                  No matching properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 text-xs font-semibold"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-8 text-xs font-semibold"
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
      <DialogContent
        showCloseButton={deletingPropertyId === null}
      >
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
            disabled={
              propertyToDelete === null || deletingPropertyId !== null
            }
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
