import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseReviews = createClient(supabaseUrl, supabaseKey);

export interface Review {
  id: string;
  property_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export async function listPropertyReviews(propertyId: string) {
  try {
    const { data: reviews, error } = await supabaseReviews
      .from('reviews')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error.message);
      return [];
    }

    return reviews || [];
  } catch (err) {
    console.error('Exception in listPropertyReviews:', err);
    return [];
  }
}

export async function getPropertyReviewStats(propertyId: string) {
  const reviews = await listPropertyReviews(propertyId);

  if (reviews.length === 0) {
    return { averageRating: 4.90, totalReviews: 0, reviews: [] };
  }

  const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
  const averageRating = Number((sum / reviews.length).toFixed(2));

  return {
    averageRating,
    totalReviews: reviews.length,
    reviews,
  };
}
