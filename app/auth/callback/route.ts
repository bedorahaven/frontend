import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

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
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        if (isHostIntent && profile.role !== 'host') {
          return NextResponse.redirect(`${origin}/onboarding?role=host`);
        }

        if (profile.role === 'host') {
          return NextResponse.redirect(`${origin}/host`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
}
