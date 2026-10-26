import { Home, MapPin, Star } from "lucide-react";
import type { ReviewForCards } from "@/lib/api/reviews";

interface ReviewCardsProps {
  reviews: ReviewForCards[];
  adminMode?: boolean;
}

function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ReviewCards({ reviews, adminMode = false }: ReviewCardsProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <Star className="size-5 fill-current" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          No reviews yet
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {adminMode
            ? "Guest reviews for booked properties will appear here."
            : "Guest reviews for your booked properties will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {reviews.map((review) => {
        const guestName = review.guest?.full_name || "Guest";
        const propertyName = review.property?.title || "Property";

        return (
          <article
            key={review.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
          >
            <header className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {getInitials(guestName) || "G"}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {guestName}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatReviewDate(review.created_at)}
                  </p>
                </div>
              </div>
              {review.booking_id && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Booking linked
                </span>
              )}
            </header>

            <div
              className="mt-4 flex items-center gap-1"
              aria-label={`${review.rating} out of 5 stars`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  aria-hidden="true"
                  className={`size-4 ${
                    star <= review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>

            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-foreground/90">
              {review.comment}
            </p>

            <footer className="mt-5 flex items-start gap-2 border-t border-border/70 pt-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Home className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {propertyName}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  {[review.property?.city, review.property?.country]
                    .filter(Boolean)
                    .join(", ") || "Location unavailable"}
                </p>
                {adminMode && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Host: {review.host_name || "Unknown host"}
                  </p>
                )}
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
