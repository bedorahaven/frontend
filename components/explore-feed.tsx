"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Waves,
  Home as HomeIcon,
  Castle,
  Flame,
  Sparkles,
  Trees,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Hero } from "./hero";
import { PropertyReviewsSummary } from "./property-reviews-summary";

const CATEGORIES = [
  { id: "all", label: "All Stays", icon: Sparkles },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "beachfront", label: "Beachfront", icon: Waves },
  { id: "mansions", label: "Mansions", icon: Castle },
  { id: "cabins", label: "Cabins", icon: Trees },
  { id: "countryside", label: "Countryside", icon: HomeIcon },
];

interface Property {
  id: string;
  title: string;
  city: string;
  country: string;
  category?: string;
  price_per_night: number | string;
  media_url?: string;
}

export function ExploreFeed({
  initialProperties = [],
  userCity = "Nairobi",
}: {
  initialProperties?: Property[];
  userCity?: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Refs for horizontal scroll controls
  const localScrollRef = useRef<HTMLDivElement>(null);
  const otherScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.75;
      ref.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Filter properties based on category
  const filteredProperties =
    selectedCategory === "all"
      ? initialProperties
      : initialProperties.filter((p) => p.category === selectedCategory);

  // Group properties: User's city first, then others
  const localProperties = filteredProperties.filter(
    (p) => p.city.toLowerCase() === userCity.toLowerCase(),
  );
  const otherProperties = filteredProperties.filter(
    (p) => p.city.toLowerCase() !== userCity.toLowerCase(),
  );

  return (
    <div className="space-y-12 pb-20">
      {/* 1. NEXT.JS EXACT STYLE HERO BANNER */}
      <Hero />

      {/* 2. CATEGORY FILTER PILLS BAR */}
      <div className="sticky top-[73px] z-30 bg-background/95 backdrop-blur-md py-4 rounded-2xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto no-scrollbar px-4 sm:px-6 lg:px-8">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 border ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-md scale-105"
                    : "bg-card text-card-foreground border-border hover:border-foreground/50"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isSelected ? "text-background" : "text-muted-foreground"}`}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PROPERTIES HORIZONTAL SCROLL SECTIONS */}
      <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section A: In Your City / Detected Location */}
        {localProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Stays in {userCity}</span>
                <span className="text-xs font-normal bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full">
                  Popular near you
                </span>
              </h2>

              {/* Scroll Arrow Controls */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => scroll(localScrollRef, "left")}
                  className="p-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll(localScrollRef, "right")}
                  className="p-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Row */}
            <div
              ref={localScrollRef}
              className="flex gap-6 overflow-x-auto no-scrollbar pb-4 pt-2 snap-x snap-mandatory scroll-smooth"
            >
              {localProperties.map((property) => (
                <div
                  key={property.id}
                  className="w-[280px] sm:w-[310px] shrink-0 snap-start"
                >
                  <PropertyCard
                    property={property}
                    isFavorite={favorites.includes(property.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section B: Explore Other Destinations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {localProperties.length > 0
                ? "Explore Other Destinations"
                : "Available Stays"}
            </h2>

            {/* Scroll Arrow Controls */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll(otherScrollRef, "left")}
                className="p-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(otherScrollRef, "right")}
                className="p-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={otherScrollRef}
            className="flex gap-6 overflow-x-auto no-scrollbar pb-4 pt-2 snap-x snap-mandatory scroll-smooth"
          >
            {(localProperties.length > 0
              ? otherProperties
              : filteredProperties
            ).map((property) => (
              <div
                key={property.id}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start"
              >
                <PropertyCard
                  property={property}
                  isFavorite={favorites.includes(property.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-16 space-y-3 bg-card border border-border rounded-3xl">
              <p className="text-base font-bold">
                No properties found in this category.
              </p>
              <p className="text-xs text-muted-foreground">
                Try selecting &quot;All Stays&quot; or searching another
                category.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual property card with sleek hover zoom and glass CTA
function PropertyCard({
  property,
  isFavorite,
  onToggleFavorite,
}: {
  property: Property;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="group flex flex-col space-y-3 block"
    >
      <div className="relative aspect-[4/3] sm:aspect-square w-full overflow-hidden rounded-2xl bg-muted shadow-md border border-border/50">
        <Image
          src={property.media_url || "/bedora_icon.png"}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 280px, 310px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />

        {/* Dark Gradient Overlay on Hover for high contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Interactive CTA Badge on Hover */}
        <div className="absolute inset-x-4 bottom-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center justify-center">
          <span className="w-full py-2.5 px-4 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-foreground text-xs font-bold shadow-lg flex items-center justify-center gap-2 border border-white/20">
            <span>View Amenities & Stay</span>
            <span className="text-accent">→</span>
          </span>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => onToggleFavorite(property.id, e)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform shadow-lg z-10"
          aria-label="Save to Wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`}
          />
        </button>

        {/* City Badge */}
        <div className="absolute bottom-3 left-3 group-hover:opacity-0 transition-opacity duration-200 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-semibold text-white uppercase tracking-wider shadow-sm">
          {property.city}
        </div>
      </div>

      <div className="flex items-start justify-between px-1">
        <div className="w-full min-w-0 space-y-0.5 pr-2">
          <h3 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-accent transition-colors">
            {property.title}
          </h3>
          <div className="flex w-full items-center justify-between gap-2">
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {property.city}, {property.country}
            </p>
            <PropertyReviewsSummary propertyId={property.id} />
          </div>
        </div>
      </div>

      <div className="text-xs px-1">
        <span className="font-extrabold text-foreground text-sm">
          KSh {Number(property.price_per_night).toLocaleString()}
        </span>
        <span className="text-muted-foreground font-normal"> / night</span>
      </div>
    </Link>
  );
}
