import React from 'react';
import { Star } from 'lucide-react';
import { getPropertyReviewStats } from '@/lib/api/reviews';

interface PropertyReviewsSummaryProps {
  propertyId: string;
}

export async function PropertyReviewsSummary({ propertyId }: PropertyReviewsSummaryProps) {
  const { averageRating, totalReviews } = await getPropertyReviewStats(propertyId);

  return (
    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-foreground shrink-0">
      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-foreground text-foreground" />
      <span>{averageRating}</span>
      <span className="text-muted-foreground font-normal">
        ({totalReviews})
      </span>
    </div>
  );
}
