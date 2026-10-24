'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group';
import { Loader2, Search, Calendar, MapPin, CheckCircle2, BookmarkCheck } from 'lucide-react';
import { GuestLookupResult } from '@/types/bookings';

export default function GuestLookupPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<GuestLookupResult[]>([]);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const supabase = useMemo(() => createClient(), []);

  const lookupBookings = useCallback(async (
    searchTerm: string,
    contact?: string,
    bookingReference?: string,
  ) => {
    setLoading(true);
    setError('');
    setBookings([]);
    setOpenBookingId(null);

    try {
      const trimmedTerm = searchTerm.trim();
      const digits = trimmedTerm.replace(/\D/g, '');
      const isPhoneNumber =
        /^[+\d\s().-]+$/.test(trimmedTerm) && digits.length >= 7 && digits.length <= 15;
      const contactToSearch =
        contact ?? (trimmedTerm.includes('@') || isPhoneNumber ? trimmedTerm : null);

      const { data, error: rpcError } = contactToSearch
        ? await supabase.rpc('lookup_guest_bookings_by_contact', {
            p_search_contact: contactToSearch,
            p_booking_reference: bookingReference?.trim() || null,
          })
        : await supabase.rpc('lookup_guest_booking', {
            search_identifier: trimmedTerm,
          });

      if (rpcError) throw rpcError;

      const matches = (Array.isArray(data) ? data : data ? [data] : []) as GuestLookupResult[];
      matches.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

      if (matches.length === 0) {
        setError('No bookings found matching those details.');
        return;
      }

      setBookings(matches);
      setOpenBookingId(matches[0].booking_id);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? err.code
          : undefined;
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' &&
              err !== null &&
              'message' in err &&
              typeof err.message === 'string'
            ? err.message
            : null;

      if (code === 'PGRST202') {
        setError(
          'Phone lookup is not enabled in the database yet. Apply the latest Supabase migration and try again.',
        );
      } else {
        setError(message ?? 'An error occurred while looking up your booking.');
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contact = params.get('contact');

    if (contact) {
      const timeoutId = window.setTimeout(() => {
        setIdentifier(contact);
        void lookupBookings(contact, contact, params.get('ref') ?? undefined);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [lookupBookings]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    void lookupBookings(identifier);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Find Your Booking</h1>
          <p className="text-xs text-muted-foreground">
            Enter your Booking ID, phone number, or email to find your reservations.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Booking details</label>
            <InputGroup className="h-11 rounded-xl">
              <InputGroupAddon align="inline-start">
                <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder="Booking ID, phone, or email"
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

        {bookings.length > 0 && (
          <div className="mt-6 space-y-3">
            {bookings.map((booking) => {
              const isOpen = openBookingId === booking.booking_id;

              return (
                <section key={booking.booking_id} className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenBookingId(isOpen ? null : booking.booking_id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-sm truncate">{booking.property_title}</span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {booking.check_in} – {booking.check_out}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent">
                      {booking.status}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-5 pt-0 space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> {booking.status}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {booking.mpesa_receipt_number || 'Pending'}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {booking.city}, {booking.country}
                      </p>

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
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
