'use client';

import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getPropertyRatingSummary } from '@/lib/api/reviews';

interface PropertyReviewsSummaryProps {
  propertyId: string;
}

export function PropertyReviewsSummary({ propertyId }: PropertyReviewsSummaryProps) {
  const [rating, setRating] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    async function loadStats() {
      if (!propertyId) return;
      try {
        const stats = await getPropertyRatingSummary(propertyId);
        setRating(stats.rating);
        setCount(stats.count);
      } catch (error) {
        console.error('Property review summary failed:', error);
      }
    }

    loadStats();
  }, [propertyId]);

  return (
    <div className="flex items-center gap-1 font-semibold text-foreground">
      <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
      <span>{rating}</span>
      <span className="text-muted-foreground font-normal">
        ({count})
      </span>
    </div>
  );
}
