import { listProperties } from '@/lib/api/properties';
import { ExploreFeed } from '@/components/explore-feed';
import { Suspense } from 'react';
import { connection } from 'next/server';

export default function PropertiesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<PropertiesSkeleton />}>
          <PropertiesContent />
        </Suspense>
      </div>
    </main>
  );
}

async function PropertiesContent() {
  await connection();

  const properties = await listProperties();
  return <ExploreFeed initialProperties={properties} userCity="Nairobi" />;
}

function PropertiesSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-muted rounded-xl w-1/4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 bg-muted rounded-3xl"></div>
        ))}
      </div>
    </div>
  );
}
