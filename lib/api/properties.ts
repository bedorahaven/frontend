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

export async function getHostPropertyForEdit(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(*)')
      .eq('id', id)
      .eq('host_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Host property fetch error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching host property:', error);
    return null;
  }
}

export async function updateProperty(
  id: string,
  propertyData: Omit<PropertyInsertInput, 'host_id'>,
  mediaData: (Omit<PropertyMediaInsertInput, 'property_id'> & { id?: string })[]
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    const { data: property, error: ownershipError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('host_id', user.id)
      .maybeSingle();

    if (ownershipError || !property) {
      if (ownershipError) console.error('Property ownership check failed:', ownershipError.message);
      return { success: false, error: 'Property not found or you do not have permission to edit it.' };
    }

    if (mediaData.length === 0) {
      return { success: false, error: 'Keep at least one property photo or video.' };
    }

    for (const media of mediaData.filter((item) => !item.id)) {
      let mediaUrl: URL;
      try {
        mediaUrl = new URL(media.media_url);
      } catch {
        return { success: false, error: 'A media URL is invalid.' };
      }
      if (mediaUrl.protocol !== 'https:' || mediaUrl.hostname !== 'res.cloudinary.com') {
        return { success: false, error: 'Property media must be hosted on Cloudinary.' };
      }
    }

    const { data: existingMedia, error: mediaFetchError } = await supabase
      .from('property_media')
      .select('id')
      .eq('property_id', id);

    if (mediaFetchError || !existingMedia) {
      console.error('Property media fetch error:', mediaFetchError?.message);
      return { success: false, error: 'Unable to load existing property media.' };
    }

    const existingIds = new Set(existingMedia.map((media) => media.id));
    const submittedIds = mediaData.flatMap((media) => media.id ? [media.id] : []);
    if (
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.some((mediaId) => !existingIds.has(mediaId))
    ) {
      return { success: false, error: 'One or more media items do not belong to this property.' };
    }

    const updateData: Omit<PropertyInsertInput, 'host_id'> = {
      title: propertyData.title,
      description: propertyData.description,
      category: propertyData.category,
      price_per_night: propertyData.price_per_night,
      max_guests: propertyData.max_guests,
      bedrooms: propertyData.bedrooms,
      beds: propertyData.beds,
      bathrooms: propertyData.bathrooms,
      country: propertyData.country,
      state: propertyData.state,
      city: propertyData.city,
      address: propertyData.address,
      latitude: propertyData.latitude,
      longitude: propertyData.longitude,
      amenities: propertyData.amenities,
      is_active: propertyData.is_active,
      google_maps_url: propertyData.google_maps_url,
    };
    const newMedia = mediaData
      .filter((media) => !media.id)
      .map((media, index) => ({
        property_id: id,
        media_url: media.media_url,
        media_public_id: media.media_public_id,
        media_type: media.media_type || 'image',
        display_order: media.display_order ?? index,
      }));

    let insertedMediaIds: string[] = [];
    if (newMedia.length > 0) {
      const { data: insertedMedia, error: insertMediaError } = await supabase
        .from('property_media')
        .insert(newMedia)
        .select('id');

      if (insertMediaError) {
        console.error('Property media insertion error:', insertMediaError.message);
        return { success: false, error: 'New property media could not be saved.' };
      }
      insertedMediaIds = insertedMedia?.map((media) => media.id) ?? [];
    }

    const { data: updatedProperty, error: propertyError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .eq('host_id', user.id)
      .select('id')
      .maybeSingle();

    if (propertyError || !updatedProperty) {
      if (propertyError) console.error('Property update error:', propertyError.message);
      if (insertedMediaIds.length > 0) {
        const { error: rollbackError } = await supabase
          .from('property_media')
          .delete()
          .eq('property_id', id)
          .in('id', insertedMediaIds);
        if (rollbackError) {
          console.error('Unable to roll back new property media:', rollbackError.message);
        }
      }
      return { success: false, error: propertyError?.message || 'Property could not be updated.' };
    }

    const retainedIds = new Set(submittedIds);
    const removedIds = [...existingIds].filter((mediaId) => !retainedIds.has(mediaId));
    if (removedIds.length > 0) {
      const { error: deleteMediaError } = await supabase
        .from('property_media')
        .delete()
        .eq('property_id', id)
        .in('id', removedIds);

      if (deleteMediaError) {
        console.error('Property media removal error:', deleteMediaError.message);
        return { success: false, error: 'Property details were updated, but removed media could not be saved.' };
      }
    }

    revalidatePath('/host');
    revalidatePath('/host/listings');
    revalidatePath(`/host/listings/${id}/edit`);
    revalidatePath(`/properties/${id}`);
    return { success: true, propertyId: id };
  } catch (error) {
    console.error('Exception updating property:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}

export async function deleteProperty(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    const { data: property, error: ownershipError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('host_id', user.id)
      .maybeSingle();

    if (ownershipError || !property) {
      if (ownershipError) console.error('Property ownership check failed:', ownershipError.message);
      return { success: false, error: 'Property not found or you do not have permission to delete it.' };
    }

    const { data: deletedProperty, error: propertyError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('host_id', user.id)
      .select('id')
      .maybeSingle();

    if (propertyError || !deletedProperty) {
      if (propertyError) console.error('Property deletion error:', propertyError.message);
      return { success: false, error: propertyError?.message || 'Property could not be deleted.' };
    }

    const { error: mediaError } = await supabase
      .from('property_media')
      .delete()
      .eq('property_id', id);

    if (mediaError) {
      console.error('Property media cleanup error after listing deletion:', mediaError.message);
    }

    revalidatePath('/host');
    revalidatePath('/host/listings');
    revalidatePath(`/properties/${id}`);
    return {
      success: true,
      warning: mediaError
        ? 'The listing was deleted, but its media records could not be cleaned up.'
        : undefined,
    };
  } catch (error) {
    console.error('Exception deleting property:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}
