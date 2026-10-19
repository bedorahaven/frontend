'use server';

import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/types/profile';

export interface CompleteOnboardingPayload {
  selectedRole: UserRole;
  fullName: string;
  businessName?: string;
  phoneNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  logoPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  bio?: string;
}

export async function completeOnboarding(payload: CompleteOnboardingPayload) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('No authenticated user found. Please log in again.');
    }

    const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const personalName = payload.fullName.trim() || defaultName;
    const isHost = payload.selectedRole === 'host';
    const phoneDigits = payload.phoneNumber?.replace(/\D/g, '') || '';

    if (isHost && payload.phoneNumber?.trim() && phoneDigits.length !== 9) {
      throw new Error('Enter a valid Kenyan phone number using exactly 9 digits.');
    }

    const profilePayload = {
      id: user.id,
      email: user.email!,
      full_name: personalName,
      business_name: isHost ? payload.businessName?.trim() || null : null,
      avatar_url: user.user_metadata?.avatar_url || null,
      logo_url: isHost ? payload.logoUrl || null : null,
      logo_public_id: isHost ? payload.logoPublicId || null : null,
      banner_url: isHost ? payload.bannerUrl || null : null,
      banner_public_id: isHost ? payload.bannerPublicId || null : null,
      role: payload.selectedRole,
      phone_number: isHost && phoneDigits ? `254${phoneDigits}` : null,
      city: isHost ? payload.city?.trim() || null : null,
      state: isHost ? payload.state?.trim() || null : null,
      country: isHost ? payload.country?.trim() || 'Kenya' : null,
      bio: isHost ? payload.bio?.trim() || null : null,
      is_verified: true,
      is_active: true,
    };

    const { error: dbError } = await supabase.from('profiles').upsert(profilePayload);
    if (dbError) throw new Error(dbError.message);

    const { error: userMetaError } = await supabase.auth.updateUser({
      data: {
        full_name: personalName,
        role: payload.selectedRole,
        city: profilePayload.city,
        state: profilePayload.state,
        country: profilePayload.country,
      },
    });

    if (userMetaError) throw new Error(userMetaError.message);

    return {
      success: true,
      redirectPath: isHost ? '/host' : '/'
    };
  } catch (err: unknown) {
    console.error('Onboarding server action error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to complete onboarding'
    };
  }
}
