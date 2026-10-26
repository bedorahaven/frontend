import Link from "next/link";
import { connection } from "next/server";
import { Users } from "lucide-react";
import { UsersTable } from "@/components/admin/UsersTable";
import type { AdminUser } from "@/components/admin/UsersTable";
import { createClient } from "@/utils/supabase/server";

const roleFilters = ["all", "guest", "host", "admin"] as const;
type RoleFilter = (typeof roleFilters)[number];

interface AdminUsersPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  return <AdminUsersContent searchParams={searchParams} />;
}

async function AdminUsersContent({ searchParams }: AdminUsersPageProps) {
  await connection();
  const { role: requestedRole } = await searchParams;
  const role: RoleFilter = roleFilters.includes(requestedRole as RoleFilter)
    ? (requestedRole as RoleFilter)
    : "all";
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone_number, avatar_url, role, city, state, country, is_active, is_verified, created_at",
    )
    .order("created_at", { ascending: false });

  if (role !== "all") {
    query = query.eq("role", role);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Admin users fetch failed:", error.message);
  }

  const users = (data ?? []) as AdminUser[];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div> 
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Users className="size-6" aria-hidden="true" />
            Manage users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse guest, host, and administrator accounts.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {data?.length.toLocaleString() ?? 0}{" "}
          {role === "all" ? "users" : `${role} accounts`}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Users could not be loaded. Verify the admin profile read policy has
          been applied, then refresh.
        </div>
      )}

      <nav
        aria-label="Filter users by role"
        className="flex gap-2 overflow-x-auto border-b border-border"
      >
        {roleFilters.map((filter) => {
          const href =
            filter === "all" ? "/admin/users" : `/admin/users?role=${filter}`;
          const isSelected = role === filter;

          return (
            <Link
              key={filter}
              href={href}
              aria-current={isSelected ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${
                isSelected
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter === "all" ? "All users" : `${filter}s`}
            </Link>
          );
        })}
      </nav>

      <UsersTable users={users} />
    </div>
  );
}
