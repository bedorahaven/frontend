"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CircleHelp,
  Home,
  LogOut,
  MessageSquare,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const navigationItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/listings", label: "Manage Listings", icon: Building2 },
  { href: "/admin/reviews", label: "Guest Reviews", icon: Star },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/earnings", label: "Earnings", icon: Wallet },
  { href: "/admin/messages", label: "Guest Messages", icon: MessageSquare },
  { href: "/admin/help", label: "Help Center", icon: CircleHelp },
];

function AdminNavContent() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-1 px-3 pt-5">
      {navigationItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Admin sign-out failed:", error.message);
      setLoggingOut(false);
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col md:flex-row">
      <aside className="hidden min-h-[calc(100vh-5rem)] w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Suspense
          fallback={
            <div className="p-4 text-xs text-muted-foreground">
              Loading menu...
            </div>
          }
        >
          <AdminNavContent />
        </Suspense>
        <div className="mt-auto px-3 pb-5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="size-4 shrink-0" />
            <span>{loggingOut ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading...
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
