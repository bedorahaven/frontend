'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const roleParam = searchParams.get('role') || 'guest';

  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);

    // Build target path based on role intent
    const targetPath = roleParam === 'host' ? '/host' : redirectTo;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetPath)}`,
      },
    });
  };

  return (
    <div className="max-w-md w-full p-8 bg-card border border-border rounded-3xl shadow-sm space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">
          {roleParam === 'host' ? 'Sign in to Become a Host' : 'Welcome to Bedora Haven'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {roleParam === 'host'
            ? 'List your space and start hosting guests across Kenya.'
            : 'Sign in to manage your bookings and saved stays.'}
        </p>
      </div>

      <Button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-xs gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Continue with Google
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
