'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group';
import { Loader2, Search, Calendar, MapPin, CheckCircle2, BookmarkCheck } from 'lucide-react';
import {  GuestLookupResult } from '@/types/bookings';

export default function GuestLookupPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<GuestLookupResult | null>(null);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBooking(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_guest_booking', {
        search_identifier: identifier.trim(),
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setError('No booking found matching this Booking ID or M-Pesa receipt.');
      } else {
        setBooking(data[0] as GuestLookupResult);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while looking up your booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Find Your Booking</h1>
          <p className="text-xs text-muted-foreground">
            Enter your Booking ID to check your reservation status.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Booking ID</label>
            <InputGroup className="h-11 rounded-xl">
              <InputGroupAddon align="inline-start">
                <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder="e.g. QWE123RTY4"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="text-xs"
              />
            </InputGroup>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-xs gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lookup Booking
          </Button>
        </form>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive text-center font-medium">
            {error}
          </div>
        )}

        {booking && (
          <div className="mt-6 p-5 bg-muted/30 border border-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {booking.status}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{booking.mpesa_receipt_number || 'Pending'}</span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm">{booking.property_title}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {booking.city}, {booking.country}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground block">Check-in</span>
                <span className="font-bold flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" /> {booking.check_in}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Check-out</span>
                <span className="font-bold flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" /> {booking.check_out}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-semibold">
              <span>Total Paid</span>
              <span className="text-sm font-bold">KES {booking.total_price}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
