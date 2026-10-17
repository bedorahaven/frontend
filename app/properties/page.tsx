import { listProperties } from '@/lib/api/properties';
import { ExploreFeed } from '@/components/explore-feed';

// Removed legacy revalidate export for Next.js 16 compatibility

export default async function PropertiesPage() {
  const properties = await listProperties();

  return (
    <main className="min-h-screen bg-background text-foreground py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ExploreFeed initialProperties={properties} userCity="Nairobi" />
      </div>
    </main>
  );
}
