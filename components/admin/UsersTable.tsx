"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { DataFilterBar } from "@/components/ui/data-filter-bar";
import type { UserRole } from "@/types/profile";
import { formatJoinedDate } from "@/lib/utils";

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  role: UserRole;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string;
}

interface UsersTableProps {
  users: AdminUser[];
}

const PAGE_SIZE = 12;

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...users]
      .filter((user) => {
        if (!query) return true;
        return [
          user.full_name,
          user.email,
          user.phone_number,
          user.role,
          user.city,
          user.state,
          user.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === "desc" ? -comparison : comparison;
      });
  }, [users, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DataFilterBar
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search by name, email, phone, or location"
          searchLabel="Search users"
          className="w-full sm:max-w-md"
        />
        <button
          type="button"
          onClick={() =>
            setSortOrder((order) => (order === "desc" ? "asc" : "desc"))
          }
          aria-label={`Sort by date, currently ${sortOrder === "desc" ? "newest first" : "oldest first"}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {sortOrder === "desc" ? (
            <ArrowDownWideNarrow className="size-4" />
          ) : (
            <ArrowUpWideNarrow className="size-4" />
          )}
          {sortOrder === "desc" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {visibleUsers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleUsers.map((user) => {
            const initials = user.full_name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("");
            const location = [user.city, user.state, user.country]
              .filter(Boolean)
              .join(", ");

            return (
              <article
                key={user.id}
                className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {user.avatar_url ? (
                      // Use a regular image to support avatars hosted by user-configured providers.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials || <UserRound className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {user.full_name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{user.email || "No email"}</span>
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold capitalize text-accent">
                    {user.role === "admin" && <ShieldCheck className="size-3" />}
                    {user.role}
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p className="flex min-w-0 items-center gap-2">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {user.phone_number || "No phone number"}
                    </span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{location || "Location not set"}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
                  <span
                    className={
                      user.is_active
                        ? "font-medium text-emerald-700 dark:text-emerald-300"
                        : "font-medium text-muted-foreground"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                    {user.is_verified ? " · Verified" : ""}
                  </span>
                  <time
                    dateTime={user.created_at}
                    title={new Date(user.created_at).toLocaleString()}
                    suppressHydrationWarning
                    className="text-muted-foreground"
                  >
                    Joined {formatJoinedDate(user.created_at)}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
          {users.length === 0 ? "No users found for this role." : "No matching users found."}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {filteredUsers.length.toLocaleString()} users · Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page === 1}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(current + 1, totalPages))
            }
            disabled={page === totalPages}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
