'use server';
import { PropertyInsertInput, PropertyMediaInsertInput } from '@/types/properties';
import type { MediaType } from '@/types/properties';
import { revalidatePath } from 'next/cache';
import { getBrowserImageUrl } from '@/lib/cloudinary';
import { createClient } from '@/utils/supabase/server';

const MIN_PROPERTY_IMAGES = 4;
const MAX_PROPERTY_IMAGES = 8;
const MIN_PROPERTY_VIDEOS = 1;
const MAX_PROPERTY_VIDEOS = 3;
const PROPERTY_CATEGORIES = new Set([
  'trending',
  'beachfront',
  'cabins',
  'luxury',
  'countryside',
  'amazing_views',
]);

type PropertyMediaInput = Omit<PropertyMediaInsertInput, 'property_id'> & {
  id?: string;
};

function getPropertyValidationError(
  propertyData: Omit<PropertyInsertInput, 'host_id'>,
): string | null {
  const requiredTextFields = [
    propertyData.title,
    propertyData.description,
    propertyData.country,
    propertyData.state,
    propertyData.city,
    propertyData.address,
  ];

  if (
    requiredTextFields.some(
      (value) => typeof value !== 'string' || !value.trim(),
    ) ||
    typeof propertyData.category !== 'string' ||
    !PROPERTY_CATEGORIES.has(propertyData.category)
  ) {
    return 'Complete all required property details.';
  }

  const descriptionText = propertyData.description
    ?.replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
  const amenities = propertyData.amenities;

  if (!descriptionText) {
    return 'Complete all required property details.';
  }

  if (
    !Number.isFinite(propertyData.price_per_night) ||
    propertyData.price_per_night < 0 ||
    !Number.isInteger(propertyData.max_guests) ||
    (propertyData.max_guests ?? 0) < 1 ||
    !Number.isInteger(propertyData.bedrooms) ||
    (propertyData.bedrooms ?? -1) < 0 ||
    !Number.isInteger(propertyData.beds) ||
    (propertyData.beds ?? -1) < 0 ||
    !Number.isFinite(propertyData.bathrooms) ||
    (propertyData.bathrooms ?? 0) < 0.5 ||
    (propertyData.bathrooms ?? 0) * 2 !==
      Math.floor((propertyData.bathrooms ?? 0) * 2)
  ) {
    return 'Enter valid pricing and capacity values.';
  }

  if (
    !Array.isArray(amenities) ||
    amenities.length === 0 ||
    amenities.some((amenity) => typeof amenity !== 'string' || !amenity.trim())
  ) {
    return 'Select at least one amenity.';
  }

  const { latitude, longitude, google_maps_url: googleMapsUrl } = propertyData;
  if (
    (latitude == null) !== (longitude == null) ||
    (latitude != null &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude != null &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    return 'Enter valid latitude and longitude coordinates together.';
  }

  if (googleMapsUrl != null && googleMapsUrl !== '') {
    if (typeof googleMapsUrl !== 'string') {
      return 'Enter a valid Google Maps link.';
    }
    try {
      if (new URL(googleMapsUrl).protocol !== 'https:') {
        return 'The Google Maps link must use HTTPS.';
      }
    } catch {
      return 'Enter a valid Google Maps link.';
    }
  }

  return null;
}

function isCloudinaryUrl(value: string, mediaType: MediaType): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.includes(`/${mediaType}/upload/`)
    );
  } catch {
    return false;
  }
}

function getMediaValidationError(
  mediaData: readonly PropertyMediaInput[],
  existingMediaTypes?: Map<string, MediaType>,
): string | null {
  let imageCount = 0;
  let videoCount = 0;

  for (const media of mediaData) {
    const mediaType = media.id
      ? existingMediaTypes?.get(media.id)
      : media.media_type;

    if (mediaType !== 'image' && mediaType !== 'video') {
      return 'One or more media items have an invalid type.';
    }

    if (
      !media.id &&
      (typeof media.media_public_id !== 'string' ||
        !media.media_public_id.trim() ||
        typeof media.media_url !== 'string' ||
        !isCloudinaryUrl(media.media_url, mediaType))
    ) {
      return 'Property media must have a valid Cloudinary URL and ID.';
    }

    if (mediaType === 'image') imageCount += 1;
    else videoCount += 1;
  }

  if (imageCount < MIN_PROPERTY_IMAGES || imageCount > MAX_PROPERTY_IMAGES) {
    return `A property must have ${MIN_PROPERTY_IMAGES}-${MAX_PROPERTY_IMAGES} photos.`;
  }
  if (videoCount < MIN_PROPERTY_VIDEOS || videoCount > MAX_PROPERTY_VIDEOS) {
    return `A property must have ${MIN_PROPERTY_VIDEOS}-${MAX_PROPERTY_VIDEOS} videos.`;
  }

  return null;
}

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
      const primaryMedia = getBrowserImageUrl(
        property.property_media?.[0]?.media_url || '/bedora_icon.png',
      );
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

export async function listHostProperties() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Host properties authentication error:', authError.message);
    throw new Error('Unable to verify your host account.');
  }

  if (!user) {
    throw new Error('You must be signed in to view your properties.');
  }

  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      *,
      property_media (media_url, media_type)
    `)
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Host properties fetch error:', error.message);
    throw new Error('Unable to load your properties.');
  }

  return (properties ?? []).map(property => {
    const primaryMedia = getBrowserImageUrl(
      property.property_media?.[0]?.media_url || '/bedora_icon.png',
    );
    return {
      ...property,
      media_url: primaryMedia,
      category: property.category || 'trending',
    };
  });
}

export async function listAllPropertiesForAdmin(limit?: number) {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('The listing limit must be a positive integer.');
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to manage listings.');
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (currentProfileError || currentProfile?.role !== 'admin') {
    throw new Error('You do not have permission to manage all listings.');
  }

  let propertyQuery = supabase
    .from('properties')
    .select('*, property_media (media_url, media_type)')
    .order('created_at', { ascending: false });

  if (limit !== undefined) {
    propertyQuery = propertyQuery.limit(limit);
  }

  const { data: properties, error: propertyError } = await propertyQuery;

  if (propertyError) {
    console.error('Admin properties fetch error:', propertyError.message);
    throw new Error('Unable to load all listings.');
  }

  const hostIds = [...new Set((properties ?? []).map((property) => property.host_id))];
  const { data: hosts, error: hostError } =
    hostIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', hostIds)
      : { data: [], error: null };

  if (hostError) {
    console.error('Admin listing host lookup error:', hostError.message);
    throw new Error('Unable to load listing owners.');
  }

  const hostsById = new Map((hosts ?? []).map((host) => [host.id, host]));

  return (properties ?? []).map((property) => ({
    ...property,
    media_url: getBrowserImageUrl(
      property.property_media?.[0]?.media_url || '/bedora_icon.png',
    ),
    category: property.category || 'trending',
    host_profile: hostsById.get(property.host_id) ?? null,
  }));
}

export async function listHostAccountsForAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to manage listings.');
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (currentProfileError || currentProfile?.role !== 'admin') {
    throw new Error('You do not have permission to manage hosts.');
  }

  const { data: hosts, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'host')
    .order('full_name');

  if (error) {
    console.error('Admin host list fetch error:', error.message);
    throw new Error('Unable to load host accounts.');
  }

  return hosts ?? [];
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

    const primaryMedia = getBrowserImageUrl(
      property.property_media?.[0]?.media_url || '/bedora_icon.png',
    );
    const allMedia = property.property_media?.map(
      (media: { media_url: string }) => getBrowserImageUrl(media.media_url),
    ) || [primaryMedia];

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
  mediaData: Omit<PropertyMediaInsertInput, 'property_id'>[],
  ownerHostId?: string,
) {
  try {
    const propertyValidationError = getPropertyValidationError(propertyData);
    if (propertyValidationError) {
      return { success: false, error: propertyValidationError };
    }

    const mediaValidationError = getMediaValidationError(mediaData);
    if (mediaValidationError) {
      return { success: false, error: mediaValidationError };
    }

    const supabase = await createClient();

    // 1. Get authenticated user securely on the server
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    let propertyHostId = user.id;
    if (ownerHostId) {
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (currentProfileError || currentProfile?.role !== 'admin') {
        return { success: false, error: 'Only an admin can assign a listing to a host.' };
      }

      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', ownerHostId)
        .eq('role', 'host')
        .maybeSingle();

      if (hostProfileError || !hostProfile) {
        return { success: false, error: 'Select a valid host for this listing.' };
      }
      propertyHostId = hostProfile.id;
    }

    // Keep ownership server-assigned; only admins may choose an existing host.
    const { data: newProperty, error: propertyError } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        host_id: propertyHostId,
      })
      .select()
      .single();

    if (propertyError || !newProperty) {
      console.error('Property creation error:', propertyError?.message);
      return { success: false, error: propertyError?.message || 'Failed to create property.' };
    }

    const mediaPayload = mediaData.map((media, index) => ({
      property_id: newProperty.id,
      media_url: media.media_url,
      media_public_id: media.media_public_id,
      media_type: media.media_type,
      display_order: media.display_order ?? index,
    }));
    const { error: mediaError } = await supabase
      .from('property_media')
      .insert(mediaPayload);

    if (mediaError) {
      console.error('Property media insertion error:', mediaError.message);
      const { error: cleanupError } = await supabase
        .from('properties')
        .delete()
        .eq('id', newProperty.id)
        .eq('host_id', propertyHostId);
      if (cleanupError) {
        console.error('Unable to clean up property after media insertion failure:', cleanupError.message);
      }
      return { success: false, error: 'Property photos and videos could not be saved.' };
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

export async function getAdminPropertyForEdit(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (currentProfileError || currentProfile?.role !== 'admin') return null;

  const { data, error } = await supabase
    .from('properties')
    .select('*, property_media(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Admin property fetch error:', error.message);
    return null;
  }

  return data;
}

export async function updateProperty(
  id: string,
  propertyData: Omit<PropertyInsertInput, 'host_id'>,
  mediaData: PropertyMediaInput[],
  ownerHostId?: string,
) {
  try {
    const propertyValidationError = getPropertyValidationError(propertyData);
    if (propertyValidationError) {
      return { success: false, error: propertyValidationError };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (currentProfileError) {
      console.error('Property editor role lookup failed:', currentProfileError.message);
      return { success: false, error: 'Unable to verify listing permissions.' };
    }
    const isAdmin = currentProfile?.role === 'admin';
    if (isAdmin && !ownerHostId) {
      return { success: false, error: 'Select a host for this listing.' };
    }
    if (isAdmin && ownerHostId) {
      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', ownerHostId)
        .eq('role', 'host')
        .maybeSingle();

      if (hostProfileError || !hostProfile) {
        return { success: false, error: 'Select a valid host for this listing.' };
      }
    }

    let propertyQuery = supabase
      .from('properties')
      .select('id')
      .eq('id', id);
    if (!isAdmin) propertyQuery = propertyQuery.eq('host_id', user.id);
    const { data: property, error: ownershipError } = await propertyQuery.maybeSingle();

    if (ownershipError || !property) {
      if (ownershipError) console.error('Property ownership check failed:', ownershipError.message);
      return { success: false, error: 'Property not found or you do not have permission to edit it.' };
    }

    const { data: existingMedia, error: mediaFetchError } = await supabase
      .from('property_media')
      .select('id, media_type')
      .eq('property_id', id);

    if (mediaFetchError || !existingMedia) {
      console.error('Property media fetch error:', mediaFetchError?.message);
      return { success: false, error: 'Unable to load existing property media.' };
    }

    const existingMediaTypes = new Map(
      existingMedia.map((media) => [media.id, media.media_type as MediaType]),
    );
    const existingIds = new Set(existingMedia.map((media) => media.id));
    const submittedIds = mediaData.flatMap((media) => media.id ? [media.id] : []);
    if (
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.some((mediaId) => !existingIds.has(mediaId))
    ) {
      return { success: false, error: 'One or more media items do not belong to this property.' };
    }

    const mediaValidationError = getMediaValidationError(mediaData, existingMediaTypes);
    if (mediaValidationError) {
      return { success: false, error: mediaValidationError };
    }

    const updateData: Omit<PropertyInsertInput, 'host_id'> & { host_id?: string } = {
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
    if (isAdmin && ownerHostId) updateData.host_id = ownerHostId;
    const newMedia = mediaData
      .filter((media) => !media.id)
      .map((media, index) => ({
        property_id: id,
        media_url: media.media_url,
        media_public_id: media.media_public_id,
        media_type: media.media_type,
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

    let updateQuery = supabase
      .from('properties')
      .update(updateData)
      .eq('id', id);
    if (!isAdmin) updateQuery = updateQuery.eq('host_id', user.id);
    const { data: updatedProperty, error: propertyError } = await updateQuery
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
    revalidatePath('/admin/listings');
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

export async function deleteProperty(id: string, adminMode = false) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please log in again.' };
    }

    if (adminMode) {
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (currentProfileError || currentProfile?.role !== 'admin') {
        return { success: false, error: 'Only admins can delete any listing.' };
      }
    }

    let propertyQuery = supabase
      .from('properties')
      .select('id')
      .eq('id', id);
    if (!adminMode) propertyQuery = propertyQuery.eq('host_id', user.id);
    const { data: property, error: ownershipError } = await propertyQuery.maybeSingle();

    if (ownershipError || !property) {
      if (ownershipError) console.error('Property ownership check failed:', ownershipError.message);
      return { success: false, error: 'Property not found or you do not have permission to delete it.' };
    }

    let deleteQuery = supabase
      .from('properties')
      .delete()
      .eq('id', id);
    if (!adminMode) deleteQuery = deleteQuery.eq('host_id', user.id);
    const { data: deletedProperty, error: propertyError } = await deleteQuery
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
    revalidatePath('/admin/listings');
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
