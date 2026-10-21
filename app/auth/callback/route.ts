import { NextResponse } from 'next/server';
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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch current profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isHostIntent = next.includes('/host');

        // 1. If profile doesn't exist yet
        if (!profile) {
          if (isHostIntent) {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Host',
              avatar_url: user.user_metadata?.avatar_url || null,
              role: 'host',
            });
            return NextResponse.redirect(`${origin}/host`);
          }

          // Default new users without explicit host intent to guest onboarding / lookup
          return NextResponse.redirect(`${origin}/lookup`);
        }

        // 2. Host intent management
        if (isHostIntent && profile.role !== 'host') {
          return NextResponse.redirect(`${origin}/onboarding?role=host`);
        }

        if (profile.role === 'host') {
          return NextResponse.redirect(`${origin}/host`);
        }

        // 3. Authenticated guest routing requirement
        if (profile.role === 'guest') {
          return NextResponse.redirect(`${origin}/lookup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
}
