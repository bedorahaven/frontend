'use server';
import { PropertyInsertInput, PropertyMediaInsertInput } from '@/types/properties';
import { createClient } from '@/utils/supabase/server';
  import { revalidatePath } from 'next/cache';

export async function listProperties() {
  try {
    const supabase = await createClient();
    const { data: properties, error } = await supabase
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
    const supabase = await createClient();

    // 1. Fetch property details and media
    const { data: property, error } = await supabase
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', property.host_id)
        .maybeSingle();

      if (profileError) {
        console.error(`Profile fetch error for host_id ${property.host_id}:`, profileError.message);
      } else {
        hostData = profile;
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
export async function createProperty(
  propertyData: Omit<PropertyInsertInput, 'host_id'>, // Omit host_id from client input
  mediaData: Omit<PropertyMediaInsertInput, 'property_id'>[]
) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user securely on the server
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    // 2. Insert property record, explicitly binding host_id to user.id
    const { data: newProperty, error: propertyError } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        host_id: user.id, // <-- Enforces correct secure host_id
      })
      .select()
      .single();

    if (propertyError || !newProperty) {
      console.error('Property creation error:', propertyError?.message);
      return { success: false, error: propertyError?.message || 'Failed to create property.' };
    }

    // 3. Insert media records...
    if (mediaData && mediaData.length > 0) {
      const mediaPayload = mediaData.map((media, index) => ({
        property_id: newProperty.id,
        media_url: media.media_url,
        media_public_id: media.media_public_id,
        media_type: media.media_type || 'image',
        display_order: media.display_order ?? index,
      }));

      await supabase.from('property_media').insert(mediaPayload);
    }

    return { success: true, propertyId: newProperty.id };
  } catch (err: unknown) {
    console.error('Exception creating property:', err);
    return { success: false, error: (err as Error)?.message || 'An unexpected error occurred.' };
  }
}
