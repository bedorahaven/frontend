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
  Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const navigationItems = [
  { href: "/host", label: "Dashboard", icon: Home },
  { href: "/host/listings", label: "Manage Listings", icon: Building2 },
  { href: "/host/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/host/earnings", label: "Earnings", icon: Wallet },
  { href: "/host/messages", label: "Guest Messages", icon: MessageSquare },
  { href: "/host/help", label: "Help Center", icon: CircleHelp },
];

function HostNavContent() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Host navigation"
      className="flex flex-col gap-1 px-3 pt-5"
    >
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
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function HostLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col md:flex-row">
      {/* Sidebar - Hidden on mobile, visible on desktop (md+) */}
      <aside className="hidden md:flex md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card md:min-h-[calc(100vh-5rem)] md:w-64">
        <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading menu...</div>}>
          <HostNavContent />
        </Suspense>

        <div className="px-3 pb-5 mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{loggingOut ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
