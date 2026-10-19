export type UserRole = 'guest' | 'host' | 'admin'; // Adjust based on your public.user_role enum options

export interface Profile {
  id: string; // uuid (references auth.users)
  email: string; // text
  full_name: string; // text
  phone_number: string | null; // text
  avatar_url: string | null; // text
  role: UserRole; // public.user_role
  city: string | null; // text
  country: string | null; // text
  address: string | null; // text
  postal_code: string | null; // text
  bio: string | null; // text
  is_verified: boolean | null; // boolean
  is_active: boolean | null; // boolean
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

// Optional: Useful type for inserting or updating a profile
export interface ProfileUpdateInput {
  full_name?: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  postal_code?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
}
