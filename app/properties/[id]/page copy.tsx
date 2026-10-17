import { getPropertyById } from '@/lib/api/properties';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, MapPin, Wifi, Car, Tv, Coffee, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PropertyActions } from '@/components/property-actions';
import { PropertyReviewsSummary } from '@/components/property-reviews-summary';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  const price = Number(property.price_per_night || 15000);
  const cleaningFee = 2500;
  const serviceFee = 1500;
  const total = price + cleaningFee + serviceFee;
  const gallery = property.media_gallery || [property.media_url];

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">

      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/properties" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <span>← Back to Explore</span>
          </Link>
          {/* Interactive Share & Save Component */}
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
              <span>{property.city}, {property.country}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[320px] sm:h-[450px] rounded-3xl overflow-hidden border border-border">
          <div className="relative md:col-span-2 h-full bg-muted">
            <Image
              src={gallery[0]}
              alt={property.title}
              fill
              priority
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="hidden md:grid col-span-2 grid-cols-2 gap-3 h-full">
            <div className="relative h-full bg-muted">
              <Image src={gallery[1] || gallery[0]} alt="Gallery 2" fill className="object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="relative h-full bg-muted">
              <Image src={gallery[2] || gallery[0]} alt="Gallery 3" fill className="object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="relative h-full bg-muted">
              <Image src={gallery[3] || gallery[0]} alt="Gallery 4" fill className="object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="relative h-full bg-muted flex items-center justify-center bg-black/80 text-white font-bold text-xs">
              <span>+ View Gallery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Sticky Booking Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Entire stay hosted by Bedora Verified Host</h2>
              <p className="text-xs text-muted-foreground">4 guests • 2 bedrooms • 2 beds • 2 baths</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-accent">
              BH
            </div>
          </div>

          <div className="space-y-4 pb-6 border-b border-border">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Verified Stay & Instant Check-in</h3>
                <p className="text-xs text-muted-foreground">Self check-in via smart keypad with M-Pesa instant confirmation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Experienced Host</h3>
                <p className="text-xs text-muted-foreground">Top-rated host with a 100% response rate.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-6 border-b border-border">
            <h3 className="text-base font-bold">About this space</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {property.title} provides absolute comfort in {property.city}. Featuring high-speed fiber internet, luxury minimalist architecture, and secure parking.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold">What this place offers</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3"><Wifi className="w-4 h-4 text-foreground" /><span>Fast WiFi</span></div>
              <div className="flex items-center gap-3"><Car className="w-4 h-4 text-foreground" /><span>Free Parking</span></div>
              <div className="flex items-center gap-3"><Tv className="w-4 h-4 text-foreground" /><span>4K Smart TV</span></div>
              <div className="flex items-center gap-3"><Coffee className="w-4 h-4 text-foreground" /><span>Coffee Bar</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl bg-card border border-border p-6 shadow-xl space-y-6">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-foreground">KSh {price.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground"> / night</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-foreground" />
                <span>4.92</span>
              </div>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-border overflow-hidden text-xs">
              <div className="p-3 border-r border-border bg-muted/30">
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">Check-in</span>
                <span className="font-semibold text-foreground">Select date</span>
              </div>
              <div className="p-3 bg-muted/30">
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">Checkout</span>
                <span className="font-semibold text-foreground">Select date</span>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <span>Reserve with M-Pesa</span>
            </button>

            <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>

            <div className="space-y-3 pt-4 border-t border-border text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">KSh {price.toLocaleString()} × 2 nights</span><span>KSh {(price * 2).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cleaning fee</span><span>KSh {cleaningFee.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>KSh {serviceFee.toLocaleString()}</span></div>
              <div className="pt-3 border-t border-border flex justify-between font-bold text-sm"><span>Total before taxes</span><span>KSh {(total * 2).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
