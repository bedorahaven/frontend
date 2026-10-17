'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Heart } from 'lucide-react';

interface PropertyActionsProps {
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    price_per_night: number | string;
    media_url?: string;
  };
  isLoggedIn?: boolean; // Pass user auth state from parent or check via supabase
}

export function PropertyActions({ property, isLoggedIn = false }: PropertyActionsProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Share Handler using Web Share API with clipboard fallback
  const handleShare = async () => {
    const shareData = {
      title: property.title,
      text: `Check out ${property.title} in ${property.city}, ${property.country} on Bedora for KSh ${Number(property.price_per_night).toLocaleString()} per night!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Sharing failed:', err);
        }
      }
    } else {
      // Fallback to clipboard copy
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  // 2. Save / Wishlist Handler with Auth Check
  const handleSave = () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?next=/properties/${property.id}`);
      return;
    }

    // Toggle saved state for logged-in users
    setIsSaved(prev => !prev);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Share Button */}
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-medium transition-colors shadow-sm relative"
        title="Share property"
      >
        <Share2 className="w-3.5 h-3.5 text-accent" />
        <span>{copied ? 'Link Copied!' : 'Share'}</span>
      </button>

      {/* Save / Favorite Button */}
      <button
        onClick={handleSave}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-medium transition-colors shadow-sm"
        title={isLoggedIn ? 'Save to wishlist' : 'Login to save'}
      >
        <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
        <span>{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
