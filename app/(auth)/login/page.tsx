'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginFormSkeleton() {
  return (
    <div className="max-w-md w-full p-8 bg-card border border-border rounded-3xl shadow-sm space-y-6 text-center animate-pulse">
      {/* Title & Subtitle Skeleton */}
      <div className="space-y-2 flex flex-col items-center">
        <div className="h-6 w-3/4 bg-muted rounded-md" />
        <div className="h-3 w-5/6 bg-muted rounded-md" />
        <div className="h-3 w-2/3 bg-muted rounded-md" />
      </div>

      {/* Button Skeleton */}
      <div className="w-full h-11 bg-muted rounded-xl" />

      {/* Footer Text Skeleton */}
      <div className="flex justify-center items-center">
        <div className="h-3 w-4/5 bg-muted rounded-md" />
      </div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const roleParam = searchParams.get('role') || 'guest';

  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    toast.loading('Redirecting to Google...', { id: 'google-auth' });

    const targetPath = roleParam === 'host' ? '/host' : redirectTo;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetPath)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message, { id: 'google-auth' });
    }
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
        variant="outline"
        className="w-full h-11 rounded-xl border-border bg-background text-foreground hover:bg-muted font-bold text-xs gap-3 shadow-xs"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.16 21.32 7.23 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.84 0 12s.43 3.87 1.18 5.39l4.09-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.16 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
        )}
        Continue with Google
      </Button>
      <p className="text-xs text-muted-foreground">
        Already booked as a guest?{' '}
        <Link href="/guest" className="font-semibold text-accent underline">
          Sign in with email or phone
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
