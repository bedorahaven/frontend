import { connection } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Home } from 'lucide-react';
import Image from 'next/image';

export const instant = false;

export default async function HostDashboard() {
  await connection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/host');
  }

  // Fetch host profile & properties
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'host') {
    redirect('/'); // Block non-hosts
  }

  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_media(*)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold">Host Dashboard</h1>
          <p className="text-xs text-muted-foreground">Welcome back, {profile.full_name}</p>
        </div>
        <Link href="/host/properties/new">
          <Button className="h-10 rounded-xl bg-accent text-accent-foreground font-bold text-xs gap-2">
            <Plus className="w-4 h-4" /> Add New Property
          </Button>
        </Link>
      </div>

      {/* Properties Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Listings</h2>
        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
                <div className="h-40 bg-muted rounded-xl relative overflow-hidden">
                  {property.property_media?.[0]?.media_url && (
                    <Image src={property.property_media[0].media_url} alt={property.title} className="object-cover w-full h-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm truncate">{property.title}</h3>
                  <p className="text-xs text-muted-foreground">{property.city}, {property.country}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-semibold">
                  <span>KES {property.price_per_night} / night</span>
                  <span className="text-accent">Active</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/20 border border-border rounded-2xl space-y-3">
            <Home className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">You haven&apos;t listed any properties yet.</p>
            <Link href="/host/properties/new">
              <Button size="sm" className="rounded-xl bg-accent text-accent-foreground font-bold text-xs">Create First Listing</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
