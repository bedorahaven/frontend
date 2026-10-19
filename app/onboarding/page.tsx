'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, Home } from 'lucide-react';

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'host' ? 'host' : 'guest';

  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'guest' | 'host'>(initialRole);

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        role: selectedRole,
      });

      if (error) throw error;

      if (selectedRole === 'host') {
        router.push('/host');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: unknown) {
      console.error('Onboarding error:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full p-8 bg-card border border-border rounded-3xl shadow-sm space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">How will you use Bedora Haven?</h1>
        <p className="text-xs text-muted-foreground">
          Select your account type to personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSelectedRole('guest')}
          className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
            selectedRole === 'guest'
              ? 'border-accent bg-accent/10 text-foreground shadow-sm'
              : 'border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground'
          }`}
        >
          <UserCheck className="w-6 h-6 text-accent" />
          <div className="text-left">
            <p className="text-xs font-bold">Guest</p>
            <p className="text-[10px] text-muted-foreground">I want to book stays</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('host')}
          className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
            selectedRole === 'host'
              ? 'border-accent bg-accent/10 text-foreground shadow-sm'
              : 'border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground'
          }`}
        >
          <Home className="w-6 h-6 text-accent" />
          <div className="text-left">
            <p className="text-xs font-bold">Host</p>
            <p className="text-[10px] text-muted-foreground">I want to list properties</p>
          </div>
        </button>
      </div>

      <Button
        onClick={handleCompleteOnboarding}
        disabled={loading}
        className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-xs"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Loading onboarding...</div>}>
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
