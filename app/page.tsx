import { Suspense } from 'react';
import { headers } from 'next/headers';
import { Header } from "@/components/header";
import { ExploreFeed } from "@/components/explore-feed";
import { listProperties } from '@/lib/api/properties';

// Loading skeleton fallback while properties stream in
function ExploreFeedLoading() {
  return (
    <div className="space-y-8 py-8">
      <div className="h-48 w-full rounded-3xl bg-muted animate-pulse" />
      <div className="flex gap-3 overflow-hidden py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-muted animate-pulse shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function ExploreFeedWrapper() {
  // 1. Safely evaluate headers and user city
  const headersList = await headers();
  const vercelCity = headersList.get('x-vercel-ip-city');
  const userCity = vercelCity ? decodeURIComponent(vercelCity) : 'Nairobi';

  // 2. Fetch public properties via lib/api
  const properties = await listProperties();

  return <ExploreFeed initialProperties={properties} userCity={userCity} />;
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<ExploreFeedLoading />}>
          <ExploreFeedWrapper />
        </Suspense>
      </main>
    </div>
  );
}
