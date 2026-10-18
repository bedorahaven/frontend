import { getPropertyById } from '@/lib/api/properties';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Star, MapPin, Wifi, Car, Tv, Coffee, ShieldCheck, CheckCircle2, Smartphone, Award } from 'lucide-react';
import { PropertyActions } from '@/components/property-actions';
import { PropertyReviewsSummary } from '@/components/property-reviews-summary';
import { PropertyMap } from '@/components/property-map';
import { PropertyGalleryWrapper } from '@/components/property-gallery-wrapper';
import { PropertyBookingWidget } from '@/components/property-booking-widget';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PropertyDetailSkeleton />}>
      <PropertyDetailContent params={params} />
    </Suspense>
  );
}

async function PropertyDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  const price = Number(property.price_per_night || 0);
  const cleaningFee = Number(property.cleaning_fee || 0);
  const serviceFee = 1500;
  const total = price + cleaningFee + serviceFee;
  const gallery = property.media_gallery || [property.media_url];
  const host = property.host || {};

  const hostInitials = host.full_name
    ? host.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'BH';

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">

      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/properties" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <span>← Back to Explore</span>
          </Link>
          <PropertyActions property={property} isLoggedIn={false} />
        </div>

        {/* Title & Metadata */}
        <div className="mt-4 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
            <PropertyReviewsSummary propertyId={property.id} />
            <span>•</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>{property.address ? `${property.address}, ` : ''}{property.city}, {property.country}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      <PropertyGalleryWrapper gallery={gallery} title={property.title} />

      {/* Main Content & Sticky Booking Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-12">

          {/* Database Host Info Row */}
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Entire stay hosted by {host.full_name || 'Bedora Host'}</span>
                {host.is_verified && (
                  <span className="bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full font-semibold border border-accent/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {property.max_guests} guests • {property.bedrooms} bedrooms • {property.beds} beds • {property.bathrooms} baths
              </p>
            </div>

            {/* Host Avatar or Initials */}
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-accent/40 bg-accent/20 flex items-center justify-center font-bold text-accent shadow-md">
              {host.avatar_url ? (
                <Image src={host.avatar_url} alt={host.full_name || 'Host'} fill sizes="56px" className="object-cover" />
              ) : (
                <span>{hostInitials}</span>
              )}
            </div>
          </div>

          <div className="space-y-4 pb-6 border-b border-border">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Verified Stay & Instant Check-in</h3>
                <p className="text-xs text-muted-foreground">Self check-in via smart keypad with M-Pesa instant STK push confirmation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Award className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Experienced Host</h3>
                <p className="text-xs text-muted-foreground">{host.full_name || 'This host'} is committed to providing stellar stays for travelers.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-6 border-b border-border">
            <h3 className="text-base font-bold">About this space</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Database Amenities List */}
          <div className="space-y-4 pb-6 border-b border-border">
            <h3 className="text-base font-bold">What this place offers</h3>
            {property.amenities && property.amenities.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                {property.amenities.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 capitalize">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span>{amenity.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3"><Wifi className="w-4 h-4 text-foreground" /><span>Fast Fiber WiFi</span></div>
                <div className="flex items-center gap-3"><Car className="w-4 h-4 text-foreground" /><span>Secure Parking</span></div>
                <div className="flex items-center gap-3"><Tv className="w-4 h-4 text-foreground" /><span>4K Smart TV</span></div>
                <div className="flex items-center gap-3"><Coffee className="w-4 h-4 text-foreground" /><span>Coffee Bar</span></div>
              </div>
            )}
          </div>

          {/* Google Maps Location Section */}
          <PropertyMap
            lat={property.latitude ? Number(property.latitude) : undefined}
            lng={property.longitude ? Number(property.longitude) : undefined}
            city={property.city}
            country={property.country}
            address={property.address}
          />
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <PropertyBookingWidget property={property} />

      </div>
    </main>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse p-8 max-w-7xl mx-auto space-y-8">
      <div className="h-8 bg-muted rounded-xl w-1/3"></div>
      <div className="h-[400px] bg-muted rounded-3xl w-full"></div>
    </div>
  );
}
