import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key on the server if available to bypass RLS restrictions safely
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabasePublic = createClient(supabaseUrl, supabaseKey);

export async function listProperties() {
  try {
    const { data: properties, error } = await supabasePublic
      .from('properties')
      .select(`
        *,
        property_media (media_url, media_type)
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
    // 1. Fetch property details and media
    const { data: property, error } = await supabasePublic
      .from('properties')
      .select(`
        *,
        property_media (media_url, media_type)
      `)
      .eq('id', id)
      .single();

    if (error || !property) {
      console.error('Property fetch error:', error?.message);
      return null;
    }

    // 2. Fetch host profile strictly using host_id
    let hostData = null;
    if (property.host_id) {
      const { data: profile, error: profileError } = await supabasePublic
        .from('profiles')
        .select('*')
        .eq('id', property.host_id)
        .maybeSingle();

      if (profileError) {
        console.error(`Profile fetch error for host_id ${property.host_id}:`, profileError.message);
      } else {
        hostData = profile;
        console.log('Successfully fetched host profile:', hostData?.full_name);
      }
    }

    const primaryMedia = property.property_media?.[0]?.media_url || '/bedora_icon.png';
    const allMedia = property.property_media?.map((m: { media_url: string }) => m.media_url) || [primaryMedia];

    return {
      ...property,
      media_url: primaryMedia,
      media_gallery: allMedia,
      category: property.category || 'trending',
      host: hostData,
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
    };
  } catch (err) {
    console.error('Exception fetching property by ID:', err);
    return null;
  }
}
