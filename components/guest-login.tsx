'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Search, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Convert 2-letter ISO country code to Emoji Flag
function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface GeoData {
  countryCode: string;
  flag: string;
  dialCode: string;
  countryName: string;
}

export function GuestLogin() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');

  // IP / Geolocation state (Defaulting to Kenya)
  const [geo, setGeo] = useState<GeoData>({
    countryCode: 'KE',
    flag: '🇰🇪',
    dialCode: '+254',
    countryName: 'Kenya',
  });
  const [geoLoading, setGeoLoading] = useState(true);

  // Form inputs
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-detect visitor location using ipwhois.app
  useEffect(() => {
    async function detectLocation() {
      try {
        const res = await fetch('https://ipwhois.app/json/?objects=country_code,country_phone_code,country');
        if (res.ok) {
          const data = await res.json();
          if (data && data.country_code && data.country_phone_code) {
            const code = data.country_code.toUpperCase();
            const dial = data.country_phone_code.startsWith('+')
              ? data.country_phone_code
              : `+${data.country_phone_code}`;

            setGeo({
              countryCode: code,
              flag: getFlagEmoji(code),
              dialCode: dial,
              countryName: data.country || 'Detected Country',
            });
          }
        }
      } catch (err) {
        console.warn('IPWhois detection failed, defaulting to Kenya (+254):', err);
      } finally {
        setGeoLoading(false);
      }
    }

    detectLocation();
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    let fullContact = '';
    if (authMethod === 'phone') {
      const cleanedPhone = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanedPhone) {
        toast.error('Please enter a valid phone number.');
        return;
      }
      fullContact = `${geo.dialCode}${cleanedPhone}`;
    } else {
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address.');
        return;
      }
      fullContact = email.trim().toLowerCase();
    }

    setLoading(true);

    try {
      // Build lookup URL query parameters
      const queryParams = new URLSearchParams({
        contact: fullContact,
        ...(bookingReference.trim() ? { ref: bookingReference.trim().toUpperCase() } : {}),
      });

      // Redirect to the reservation lookup result page
      router.push(`/lookup/reservation?${queryParams.toString()}`);
      toast.success('Searching for your stay details...');
    } catch (error) {
      console.error('Lookup failed:', error);
      toast.error('Could not locate reservation. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold border border-accent/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Instant Booking Lookup</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Access Your Stay</h2>
        <p className="text-xs text-muted-foreground">
          Enter the phone number or email address you used during Paystack checkout.
        </p>
      </div>

      {/* Auth Method Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-muted rounded-2xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setAuthMethod('phone')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            authMethod === 'phone'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Phone Number</span>
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('email')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            authMethod === 'email'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Address</span>
        </button>
      </div>

      <form onSubmit={handleLookup} className="space-y-4">

        {/* PHONE NUMBER INPUT GROUP WITH IPWHOIS PREFIX/SUFFIX */}
        {authMethod === 'phone' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold block text-foreground">
              Checkout Phone Number
            </label>
            <div className="relative flex items-center rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent overflow-hidden transition-all">

              {/* Left Prefix: Country Flag + Dial Code */}
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-muted/50 border-r border-border text-xs font-bold shrink-0 select-none">
                {geoLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span className="text-base leading-none">{geo.flag}</span>
                    <span className="text-foreground">{geo.dialCode}</span>
                  </>
                )}
              </div>

              {/* Phone Input */}
              <Input
                type="tel"
                placeholder="712 345 678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm font-medium h-11 px-3"
              />

              {/* Right Suffix Indicator */}
              <div className="pr-3 shrink-0 text-muted-foreground">
                <Phone className="w-4 h-4 opacity-50" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground pl-1">
              Auto-detected country: <strong className="text-foreground">{geo.countryName}</strong>
            </p>
          </div>
        ) : (
          /* EMAIL INPUT GROUP */
          <div className="space-y-1.5">
            <label className="text-xs font-bold block text-foreground">
              Checkout Email Address
            </label>
            <div className="relative flex items-center rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-accent overflow-hidden transition-all">
              <Input
                type="email"
                placeholder="guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm font-medium h-11 px-3"
              />
              <div className="pr-3 shrink-0 text-muted-foreground">
                <Mail className="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Optional Booking Reference Code */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold block text-foreground">
            Booking Reference <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. BH-982341"
            value={bookingReference}
            onChange={(e) => setBookingReference(e.target.value)}
            className="rounded-2xl text-xs sm:text-sm font-mono uppercase h-11"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-2xl bg-accent text-accent-foreground font-bold text-xs gap-2 shadow-md hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Find My Reservation</span>
            </>
          )}
        </Button>
      </form>

      {/* Footer Note */}
      <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Instant receipt and check-in instructions access.</span>
      </div>
    </div>
  );
}
