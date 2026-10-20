export type PropertyCategory = 'trending' | 'beachfront' | 'cabins' | 'luxury' | 'countryside' | 'amazing_views'; // Adjust based on your public.property_category enum options

export interface Property {
  id: string; // uuid
  host_id: string; // uuid
  title: string; // text
  description: string; // text
  category: PropertyCategory; // public.property_category
  price_per_night: number; // numeric(10, 2)
  cleaning_fee: number | null; // numeric(10, 2)
  max_guests: number; // integer
  bedrooms: number; // integer
  beds: number; // integer
  bathrooms: number; // numeric(3, 1)
  country: string; // text
  state: string; // text
  city: string; // text
  address: string; // text
  latitude: number | null; // numeric(10, 8)
  longitude: number | null; // numeric(11, 8)
  amenities: string[] | Record<string, unknown> | null; // jsonb (usually array of strings or object)
  is_active: boolean | null; // boolean
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  google_maps_url: string | null; // text
}

// Optional: Useful type for inserting a new property
export interface PropertyInsertInput {
  host_id: string;
  title: string;
  description: string;
  category?: PropertyCategory;
  price_per_night: number;
  cleaning_fee?: number;
  max_guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  country: string;
  state: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[] | Record<string, unknown>;
  is_active?: boolean;
  google_maps_url?: string;
}

export type MediaType = 'image' | 'video'; // Adjust based on your public.media_type enum options

export interface PropertyMedia {
  id: string; // uuid
  property_id: string; // uuid
  media_url: string; // text
  media_public_id: string; // text
  media_type: MediaType; // public.media_type
  display_order: number | null; // integer
  created_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting property media
export interface PropertyMediaInsertInput {
  property_id: string;
  media_url: string;
  media_public_id: string;
  media_type?: MediaType;
  display_order?: number;
}
export interface PropertyWithMedia extends Property {
  property_media?: PropertyMedia[];
  media_gallery?: string[]; // Useful helper array of URLs
}
