import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Public client for unauthenticated guest reads
export const supabasePublic = createClient(supabaseUrl, supabaseKey);

export async function listProperties() {
  try {
    const { data: properties, error } = await supabasePublic
      .from('properties')
      .select(`
        *,
        property_media (media_url, media_type),
        host:host_id (id, full_name, avatar_url, is_verified, city)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error.message);
      return [];
    }

    if (!properties) return [];

    return properties.map(property => {
      const primaryMedia = property.property_media?.[0]?.media_url || '/bedora_icon.png';
      return {
        ...property,
        media_url: primaryMedia,
        category: property.category || 'trending',
      };
    });
  } catch (err) {
    console.error('Exception fetching properties:', err);
    return [];
  }
}

export async function getPropertyById(id: string) {
  try {
    const { data: property, error } = await supabasePublic
      .from('properties')
      .select(`
        *,
        property_media (media_url, media_type),
        host:host_id (id, full_name, avatar_url, is_verified, city, bio)
      `)
      .eq('id', id)
      .single();

    if (error || !property) {
      console.error('Property fetch error:', error?.message);
      return null;
    }

    const primaryMedia = property.property_media?.[0]?.media_url || '/bedora_icon.png';
    const allMedia = property.property_media?.map((m: { media_url: string }) => m.media_url) || [primaryMedia];

    return {
      ...property,
      media_url: primaryMedia,
      media_gallery: allMedia,
      category: property.category || 'trending',
      // Ensure amenities is parsed correctly if stored as JSONB array
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
    };
  } catch (err) {
    console.error('Exception fetching property by ID:', err);
    return null;
  }
}
