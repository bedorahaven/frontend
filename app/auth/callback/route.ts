import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/auth/admin-emails';
import { getLoginLocation } from '@/lib/auth/login-location';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Production-safe origin resolution
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || requestUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
  const origin = `${protocol}://${host}`;
  const loginLocation = getLoginLocation(request.headers);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (next === '/admin') {
          if (!isAdminEmail(user.email)) {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/admin/login?error=not_authorized`,
            );
          }

          const { data: adminAccess, error: adminAccessError } =
            await supabase.rpc('activate_admin_access');

          if (adminAccessError || adminAccess !== true) {
            console.error(
              'Admin access setup failed:',
              adminAccessError?.message ?? 'The admin account was not allowlisted.',
            );
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/admin/login?error=setup_failed`,
            );
          }

          await updateLoginLocation(supabase, loginLocation);
          return NextResponse.redirect(`${origin}/admin`);
        }

        // Fetch current profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const isHostIntent = next.includes('/host');
        let destination = `${origin}${next}`;

        // 1. If profile doesn't exist yet
        if (!profile) {
          if (isHostIntent) {
            const { error: profileError } = await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Host',
              avatar_url: user.user_metadata?.avatar_url || null,
              role: 'host',
            });
            if (profileError) {
              console.error('Host profile creation failed:', profileError.message);
              return NextResponse.redirect(
                `${origin}/login?error=Profile%20setup%20failed`,
              );
            }
            destination = `${origin}/host`;
          } else {
            destination = `${origin}/lookup`;
          }
        } else {
          // 2. Host intent management
          if (isHostIntent && profile.role !== 'host') {
            destination = `${origin}/onboarding?role=host`;
          } else if (profile.role === 'host') {
            destination = `${origin}/host`;
          } else if (profile.role === 'guest') {
            destination = `${origin}/lookup`;
          }
        }

        const { error: locationError } = await supabase.rpc(
          'update_my_login_location',
          {
            p_city: loginLocation.city,
            p_state: loginLocation.state,
            p_country: loginLocation.country,
          },
        );
        if (locationError) {
          console.error('Profile login location update failed:', locationError.message);
        }

        return NextResponse.redirect(destination);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (next === '/admin') {
    return NextResponse.redirect(
      `${origin}/admin/login?error=Authentication%20failed`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
}

async function updateLoginLocation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  location: ReturnType<typeof getLoginLocation>,
) {
  const { error } = await supabase.rpc('update_my_login_location', {
    p_city: location.city,
    p_state: location.state,
    p_country: location.country,
  });

  if (error) {
    console.error('Admin profile login location update failed:', error.message);
  }
}
