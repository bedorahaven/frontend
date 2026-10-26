import { Suspense } from "react";
import { connection } from "next/server";
import { Star } from "lucide-react";
import { ReviewCards } from "@/components/reviews/ReviewCards";
import { listReviewsForDashboard } from "@/lib/api/reviews";
import type { ReviewForCards } from "@/lib/api/reviews";

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<ReviewsLoading />}>
      <AdminReviewsContent />
    </Suspense>
  );
}

async function AdminReviewsContent() {
  await connection();
  let reviews: ReviewForCards[] = [];
  let loadError = false;

  try {
    reviews = await listReviewsForDashboard(true);
  } catch (error) {
    console.error("Admin reviews page failed:", error);
    loadError = true;
  }

  return (
    <main className="space-y-6 p-4 md:p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Star className="size-6 text-amber-500" aria-hidden="true" />
            Guest reviews
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Reviews across booked properties on the platform.
          </p>
        </div>
        {!loadError && (
          <p className="shrink-0 text-xs text-muted-foreground">
            {reviews.length.toLocaleString()} reviews
          </p>
        )}
      </header>

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          Reviews could not be loaded. Verify that the review access migration
          has been applied, then refresh.
        </div>
      ) : (
        <ReviewCards reviews={reviews} adminMode />
      )}
    </main>
  );
}

function ReviewsLoading() {
  return (
    <main className="animate-pulse space-y-6 p-4 md:p-8" aria-label="Loading reviews">
      <div className="h-12 w-64 rounded-xl bg-muted" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-64 rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}