"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";
import {
  Search,
  Menu,
  Moon,
  Sun,
  Heart,
  MessageSquare,
  CalendarCheck,
  HelpCircle,
  Home,
  X,
  MapPin,
  Minus,
  Plus,
  LogOut,
  Building2,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Profile } from "@/types/profile";

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"where" | "dates" | "guests">(
    "where",
  );

  // Auth & Profile state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Search filter states
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState({ adults: 1, children: 0, infants: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch logged-in user and profile on mount
  useEffect(() => {
    async function getUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
    }

    getUserData();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Track window scroll
  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push("/");
  };

  const totalGuests = guests.adults + guests.children;
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";
  const displayEmail = user?.email || "";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const isHost = profile?.role === "host";

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md transition-all duration-300 ease-in-out ${
          isScrolled ? "py-3 shadow-md bg-background/95" : "py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* 1. Brand Logo / Icon */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div
              className={`relative transition-all duration-300 md:hidden ${isScrolled ? "w-7 h-7" : "w-9 h-9"}`}
            >
              <Image
                src="/bedora_icon.png"
                alt="Bedora Icon"
                fill
                sizes="36px"
                className="object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>

            <div
              className={`relative hidden md:block transition-all duration-300 ${isScrolled ? "w-28 h-7" : "w-36 h-9"}`}
            >
              <Image
                src="/bedora_logo.png"
                alt="Bedora Haven Logo"
                fill
                sizes="144px"
                className="object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
          </Link>

          {/* 2. Interactive Search Trigger Capsule (Desktop) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`hidden md:flex items-center border border-border rounded-full shadow-sm hover:shadow-md transition-all duration-300 bg-card text-card-foreground text-left ${
              isScrolled
                ? "py-1.5 px-3 gap-2 scale-95 opacity-95 text-xs"
                : "py-2 px-3 gap-1 scale-100 text-sm"
            }`}
          >
            <span className="px-3 font-semibold text-foreground border-r border-border hover:text-accent transition-colors">
              {location || "Anywhere"}
            </span>
            <span className="px-3 font-semibold text-foreground border-r border-border hover:text-accent transition-colors">
              Any week
            </span>
            <span className="px-3 text-muted-foreground font-normal flex items-center gap-2 hover:text-foreground transition-colors">
              <span>
                {totalGuests > 0
                  ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}`
                  : "Add guests"}
              </span>
              <span
                className={`rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-sm transition-all duration-300 ${
                  isScrolled ? "w-6 h-6" : "w-7 h-7"
                }`}
              >
                <Search
                  className={`transition-all duration-300 ${isScrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`}
                />
              </span>
            </span>
          </button>

          {/* 3. Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/lookup"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-full hover:bg-muted transition-colors text-foreground"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Lookup Booking
            </Link>

            {/* Show "Become a host" only if NOT logged in as a host */}
            {profile?.role !== "host" && (
              <Link
                href={
                  user
                    ? "/onboarding?role=host"
                    : "/login?redirectTo=/host&role=host"
                }
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-full hover:bg-muted transition-colors text-foreground"
              >
                <Home className="w-3.5 h-3.5" />
                Become a host
              </Link>
            )}

            {/* If they ARE a host, show a quick shortcut directly to their dashboard */}
            {profile?.role === "host" && (
              <Link
                href="/host"
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Host Dashboard
              </Link>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-foreground relative"
              aria-label="Toggle theme"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2.5 border border-border py-1.5 px-3 rounded-full hover:shadow-md transition-all bg-card text-card-foreground"
                aria-label="User menu"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden relative">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-[10px] uppercase">
                      {displayName.charAt(0)}
                    </span>
                  )}
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 text-card-foreground animate-in fade-in-80 zoom-in-95">
                  <div className="px-4 py-3 border-b border-border space-y-0.5">
                    <p className="text-sm font-bold truncate">{displayName}</p>
                    {displayEmail && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {displayEmail}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    {user ? (
                      <>
                        {/* HOST-ONLY AIRBNB / BOOKING.COM MENU */}
                        {isHost ? (
                          <>
                            <Link
                              href="/host"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors text-accent"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>Manage Listings</span>
                            </Link>
                            <Link
                              href="/host/reservations"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <CalendarDays className="w-4 h-4 text-muted-foreground" />
                              <span>Reservations</span>
                            </Link>
                            <Link
                              href="/host/earnings"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <Wallet className="w-4 h-4 text-muted-foreground" />
                              <span>Earnings & M-Pesa</span>
                            </Link>
                            <Link
                              href="/host/messages"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span>Guest Messages</span>
                            </Link>
                          </>
                        ) : (
                          /* GUEST MENU */
                          <>
                            <Link
                              href="/lookup"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                              <span>Lookup Booking</span>
                            </Link>
                            <Link
                              href="/wishlists"
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <Heart className="w-4 h-4 text-muted-foreground" />
                              <span>Saved Wishlists</span>
                            </Link>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Sign up
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="border-t border-border my-1"></div>

                  <div className="py-1">
                    {!isHost && (
                      <Link
                        href="/onboarding?role=host"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors font-medium"
                      >
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span>Become a host</span>
                      </Link>
                    )}
                    <Link
                      href="/help"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Help Center</span>
                    </Link>

                    {user && (
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive font-semibold hover:bg-muted transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Trigger */}
        <div className="md:hidden px-4 pt-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between border border-border rounded-full py-2.5 px-4 shadow-sm bg-card text-card-foreground hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-accent" />
              <div className="text-left">
                <p className="text-xs font-bold leading-none">Where to?</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Anywhere • Any week • Add guests
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold border border-border px-2 py-1 rounded-full text-muted-foreground">
              Search
            </span>
          </button>
        </div>
      </header>

      {/* --- AIRBNB-STYLE FULL SEARCH MODAL OVERLAY --- */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-start pt-4 sm:pt-10 px-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col mb-12">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="text-sm font-bold text-foreground">
                Search Stays
              </span>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-card grid grid-cols-3 gap-2 border-b border-border text-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab("where")}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeTab === "where"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                1. Where
              </button>
              <button
                onClick={() => setActiveTab("dates")}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeTab === "dates"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                2. Dates
              </button>
              <button
                onClick={() => setActiveTab("guests")}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeTab === "guests"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                3. Guests
              </button>
            </div>

            <div className="p-6 space-y-6">
              {activeTab === "where" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <label className="text-sm font-bold block">
                    Search Destinations in Kenya
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="e.g. Nairobi, Diani Beach, Naivasha, Mombasa"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Popular destinations
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["Nairobi", "Diani Beach", "Naivasha", "Watamu"].map(
                        (city) => (
                          <button
                            key={city}
                            onClick={() => {
                              setLocation(city);
                              setActiveTab("dates");
                            }}
                            className="py-2.5 px-3 rounded-xl border border-border text-xs font-medium hover:bg-accent/10 hover:border-accent transition-colors text-left"
                          >
                            📍 {city}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "dates" && (
                <div className="space-y-4 animate-in fade-in duration-150 text-center py-4">
                  <p className="text-sm font-bold">Select Stay Dates</p>
                  <p className="text-xs text-muted-foreground">
                    Flexible check-in options coming next on property pages.
                  </p>
                  <button
                    onClick={() => setActiveTab("guests")}
                    className="py-2 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted"
                  >
                    Set flexible dates →
                  </button>
                </div>
              )}

              {activeTab === "guests" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <p className="text-sm font-bold">Who&apos;s coming?</p>

                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-xs font-bold">Adults</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ages 13 or above
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        disabled={guests.adults <= 1}
                        onClick={() =>
                          setGuests({ ...guests, adults: guests.adults - 1 })
                        }
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {guests.adults}
                      </span>
                      <button
                        onClick={() =>
                          setGuests({ ...guests, adults: guests.adults + 1 })
                        }
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3">
                    <div>
                      <p className="text-xs font-bold">Children</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ages 2–12
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        disabled={guests.children <= 0}
                        onClick={() =>
                          setGuests({
                            ...guests,
                            children: guests.children - 1,
                          })
                        }
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {guests.children}
                      </span>
                      <button
                        onClick={() =>
                          setGuests({
                            ...guests,
                            children: guests.children + 1,
                          })
                        }
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <button
                onClick={() => {
                  setLocation("");
                  setGuests({ adults: 1, children: 0, infants: 0 });
                }}
                className="text-xs font-semibold underline text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>

              <button
                onClick={() => setIsSearchOpen(false)}
                className="py-2.5 px-6 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
