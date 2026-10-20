"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HostReservation } from "@/types/host-reservations";

const PAGE_SIZE = 8;

interface ReservationsTableProps {
  reservations: HostReservation[];
}

export function ReservationsTable({ reservations }: ReservationsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const statuses = useMemo(
    () =>
      [...new Set(reservations.map((reservation) => reservation.status?.toLowerCase()).filter(Boolean))] as string[],
    [reservations],
  );

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...reservations]
      .filter((reservation) => {
        if (statusFilter !== "all" && reservation.status?.toLowerCase() !== statusFilter) {
          return false;
        }
        if (!query) return true;
        const searchable = [
          reservation.id,
          reservation.property?.title,
          reservation.property?.city,
          reservation.guest?.full_name,
          getString(reservation.guest_name),
          getString(reservation.guest_email),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => getStartDate(b).localeCompare(getStartDate(a)));
  }, [reservations, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const visibleReservations = filteredReservations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatus = (value: string | null) => {
    if (value) {
      setStatusFilter(value);
      setPage(1);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">All reservations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search and review the details for each guest stay.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search guest, listing, or ID"
              aria-label="Search reservations"
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={updateStatus}>
            <SelectTrigger aria-label="Filter by reservation status" className="h-10 w-full text-sm sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleReservations.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {reservations.length === 0 ? "No reservations yet" : "No matching reservations"}
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            {reservations.length === 0
              ? "New guest bookings will appear here with their stay and contact details."
              : "Try a different search term or status filter."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Guest & listing</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stay</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Guests</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReservations.map((reservation) => (
                  <TableRow key={reservation.id} className="border-border/70">
                    <TableCell className="max-w-64 whitespace-normal px-5 py-4">
                      <GuestListing reservation={reservation} />
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        #{reservation.id.slice(0, 8)}
                      </p>
                    </TableCell>
                    <TableCell className="py-4">
                      <StayDetails reservation={reservation} />
                    </TableCell>
                    <TableCell className="py-4 text-sm text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        {getGuestCount(reservation)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-semibold text-foreground">
                      {formatPrice(reservation.total_price)}
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge status={reservation.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {visibleReservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <GuestListing reservation={reservation} />
                  <StatusBadge status={reservation.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stay</p>
                    <StayDetails reservation={reservation} className="mt-1" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Guests</p>
                    <p className="mt-1 text-xs text-foreground">{getGuestCount(reservation)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatPrice(reservation.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Booking ID</p>
                    <p className="mt-1 font-mono text-xs text-foreground">#{reservation.id.slice(0, 8)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {filteredReservations.length > 0 && (
        <footer className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredReservations.length)} of{" "}
            {filteredReservations.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-14 text-center text-xs text-muted-foreground">
              {page} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
            >
              <ChevronRight />
            </Button>
          </div>
        </footer>
      )}
    </section>
  );
}

function GuestListing({ reservation }: { reservation: HostReservation }) {
  const guestName =
    reservation.guest?.full_name ||
    getString(reservation.guest_name) ||
    getString(reservation.full_name) ||
    "Guest";
  const propertyName =
    reservation.property?.title || `Listing ${reservation.property_id.slice(0, 8)}`;
  const location = [reservation.property?.city, reservation.property?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-foreground">{guestName}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{propertyName}</p>
      {location && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{location}</span>
        </p>
      )}
      {(reservation.guest?.email || getString(reservation.guest_email)) && (
        <a
          href={`mailto:${reservation.guest?.email || getString(reservation.guest_email)}`}
          className="mt-1 block truncate text-[11px] text-accent hover:underline"
        >
          {reservation.guest?.email || getString(reservation.guest_email)}
        </a>
      )}
      {(reservation.guest?.phone_number || getString(reservation.phone_number)) && (
        <a
          href={`tel:${reservation.guest?.phone_number || getString(reservation.phone_number)}`}
          className="mt-1 block text-[11px] text-accent hover:underline"
        >
          {reservation.guest?.phone_number || getString(reservation.phone_number)}
        </a>
      )}
    </div>
  );
}

function StayDetails({
  reservation,
  className,
}: {
  reservation: HostReservation;
  className?: string;
}) {
  const startDate = getStartDate(reservation);
  const endDate = getEndDate(reservation);
  const nights = getNights(reservation, startDate, endDate);
  return (
    <div className={className}>
      <p className="text-xs font-medium text-foreground">
        {formatDate(startDate)} <span className="text-muted-foreground">to</span>{" "}
        {formatDate(endDate)}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {nights === null ? "Duration unavailable" : `${nights} ${nights === 1 ? "night" : "nights"}`}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized = status?.toLowerCase() ?? "unknown";
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    completed: "bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:text-sky-300",
    pending: "bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:text-amber-300",
    cancelled: "bg-destructive/10 text-destructive ring-destructive/20",
    canceled: "bg-destructive/10 text-destructive ring-destructive/20",
    rejected: "bg-destructive/10 text-destructive ring-destructive/20",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ring-1 ring-inset ${
        styles[normalized] ?? "bg-muted text-muted-foreground ring-border"
      }`}
    >
      {formatStatus(normalized)}
    </span>
  );
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getStartDate(reservation: HostReservation): string {
  return (
    getString(reservation.start_date) ??
    getString(reservation.check_in) ??
    ""
  );
}

function getEndDate(reservation: HostReservation): string {
  return getString(reservation.end_date) ?? getString(reservation.check_out) ?? "";
}

function getNights(
  reservation: HostReservation,
  startDate: string,
  endDate: string,
): number | null {
  const storedNights = Number(reservation.total_nights);
  if (Number.isFinite(storedNights) && storedNights > 0) return storedNights;
  if (!startDate || !endDate) return null;
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 86_400_000);
}

function getGuestCount(reservation: HostReservation): string {
  const count = Number(
    reservation.guests_count ?? reservation.guest_count ?? reservation.number_of_guests,
  );
  return Number.isFinite(count) && count > 0
    ? `${count} ${count === 1 ? "guest" : "guests"}`
    : "Not specified";
}

function formatDate(value: string): string {
  if (!value) return "Date unavailable";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPrice(value: number | string | null): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
