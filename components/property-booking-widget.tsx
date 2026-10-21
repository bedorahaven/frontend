'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, Loader2, Calendar as CalendarIcon, ChevronDown, Users } from 'lucide-react';
// import { format, differenceInDays, parseISO, DateRange } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { format, differenceInDays, parseISO } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { getPropertyBookedDates, createBooking } from '@/lib/api/bookings';
import { PropertyReviewsSummary } from './property-reviews-summary';

interface BookingRecord {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  status: string;
}

interface PropertyBookingWidgetProps {
  property: {
    id: string;
    price_per_night: number;
    cleaning_fee?: number;
    max_guests?: number;
  };
}

export function PropertyBookingWidget({ property }: PropertyBookingWidgetProps) {
  const basePrice = Number(property.price_per_night || 0);
  const cleaningFee = Number(property.cleaning_fee || 0);
  const serviceFee = 1500;
  const maxGuests = property.max_guests || 4;

  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [today, setToday] = useState<Date | undefined>(undefined);
  const [guestsCount, setGuestsCount] = useState<string>('1');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [bookedRanges, setBookedRanges] = useState<{ check_in: string; check_out: string }[]>([]);

  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<BookingRecord | null>(null);

  // Fetch confirmed booked dates on mount
  useEffect(() => {
    async function loadAvailability() {
      const ranges = await getPropertyBookedDates(property.id);
      setBookedRanges(ranges);
    }
    loadAvailability();
  }, [property.id]);

  // Convert booked ranges into disabled intervals for react-day-picker
  const disabledDays = bookedRanges.map(range => ({
    from: parseISO(range.check_in),
    to: parseISO(range.check_out),
  }));

  // Calculate nights and logical totals (scaling with additional guests beyond 2)
  const nights = checkIn && checkOut ? Math.max(1, differenceInDays(checkOut, checkIn)) : 1;
  const guestCountNum = Number(guestsCount) || 1;

  const guestMultiplier = guestCountNum > 2 ? 1 + (guestCountNum - 2) * 0.05 : 1;
  const nightlyRateWithGuests = Math.round(basePrice * guestMultiplier);
  const accommodationTotal = nightlyRateWithGuests * nights;
  const grandTotal = accommodationTotal + cleaningFee + serviceFee;

  // Handle DayPicker range selection
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setCheckIn(range.from);
      setCheckOut(range.to);
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    } else {
      setCheckIn(undefined);
      setCheckOut(undefined);
    }
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!checkIn || !checkOut) {
      setErrorMessage('Please select both check-in and check-out dates.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const phoneRegex = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage('Please enter a valid M-Pesa phone number (e.g., 0712345678).');
      return;
    }

    setIsLoading(true);

    const result = await createBooking({
      property_id: property.id,
      check_in: format(checkIn, 'yyyy-MM-dd'),
      check_out: format(checkOut, 'yyyy-MM-dd'),
      total_nights: nights,
      guests_count: guestCountNum,
      total_price: grandTotal,
      phone_number: cleanPhone,
    });

    setIsLoading(false);

    if (result.success && result.booking) {
      setSuccessBooking(result.booking as BookingRecord);
    } else {
      setErrorMessage(result.error || 'Booking failed. Please try again.');
    }
  };

  if (successBooking) {
    return (
      <div className="sticky top-24 rounded-3xl bg-card border border-border p-6 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold">M-Pesa STK Push Sent!</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please check your phone (<span className="font-semibold text-foreground">{phoneNumber}</span>) and enter your M-Pesa PIN to complete payment of <span className="font-bold text-foreground">KSh {grandTotal.toLocaleString()}</span>.
        </p>
        <div className="p-4 rounded-xl bg-muted/30 border border-border text-left text-xs space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Booking ID:</span><span className="font-mono font-semibold">{successBooking.id.substring(0, 8)}...</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Check-in:</span><span className="font-semibold">{successBooking.check_in}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Check-out:</span><span className="font-semibold">{successBooking.check_out}</span></div>
        </div>
        <Button
          onClick={() => { setSuccessBooking(null); setCheckIn(undefined); setCheckOut(undefined); }}
          className="w-full"
        >
          Book Another Stay
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-3xl bg-card border border-border p-6 shadow-xl space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-extrabold text-foreground">KSh {basePrice.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground"> / night</span>
        </div>
        <PropertyReviewsSummary propertyId={property.id} />
      </div>

      <form onSubmit={handleReserve} className="space-y-4">
        {/* Stay Dates Picker */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">Stay Dates</label>
          <Popover
            open={isCalendarOpen}
            onOpenChange={(open) => {
              if (open) setToday(new Date());
              setIsCalendarOpen(open);
            }}
          >
            <PopoverTrigger
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left font-normal"
            >
              <div className="flex items-center gap-2.5 text-xs truncate">
                <CalendarIcon className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate font-semibold text-foreground">
                  {checkIn && checkOut
                    ? `${format(checkIn, 'MMM dd, yyyy')} - ${format(checkOut, 'MMM dd, yyyy')}`
                    : checkIn
                    ? `${format(checkIn, 'MMM dd, yyyy')} - Select checkout`
                    : 'Select check-in & check-out dates'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-card border border-border shadow-2xl rounded-2xl z-50" align="center">
              <DayPicker
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={handleDateSelect}
                disabled={[...(today ? [{ before: today }] : []), ...disabledDays]}
                numberOfMonths={1}
                className="text-xs font-sans"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Side-by-Side Grid: Guests & M-Pesa Phone */}
        <div className="grid grid-cols-1 gap-3 items-center">
          {/* Guests Select Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">Guests</label>
            <Select value={guestsCount} onValueChange={(val) => setGuestsCount(val || '1')}>
              <SelectTrigger className="!h-11 w-full px-3.5 rounded-xl border-border bg-muted/30 hover:bg-muted/50 text-xs font-semibold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs truncate">
                  <Users className="w-4 h-4 text-accent shrink-0" />
                  <SelectValue placeholder="Guests" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border rounded-xl shadow-xl z-50">
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={String(num)} className="text-xs py-2.5 font-medium">
                    {num} Guest{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* M-Pesa Phone Number Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">M-Pesa Phone</label>
            <InputGroup className="!h-11 w-full rounded-xl border border-border bg-muted/30 px-3 hover:bg-muted/50 transition-colors flex items-center">
              <InputGroupAddon align="inline-start" className="text-xs font-bold text-muted-foreground pr-1.5 select-none flex items-center gap-1.5">
                <span className="text-sm leading-none">🇰🇪</span>
                <span>+254</span>
              </InputGroupAddon>
              <InputGroupInput
                type="tel"
                required
                placeholder="712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-xs font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground/60"
              />
            </InputGroup>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Triggering STK Push...</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" />
              <span>Reserve with M-Pesa</span>
            </>
          )}
        </Button>
      </form>

      {/* M-Pesa Support Badge */}
      <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Instant M-Pesa STK Push Supported</span>
      </div>

      <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged until confirmed</p>

      {/* Price breakdown */}
      <div className="space-y-3 pt-4 border-t border-border text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            KSh {nightlyRateWithGuests.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''} {guestCountNum > 2 ? `(${guestCountNum} guests)` : ''}
          </span>
          <span>KSh {accommodationTotal.toLocaleString()}</span>
        </div>
        {cleaningFee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cleaning fee</span>
            <span>KSh {cleaningFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transaction fee</span>
          <span>KSh {serviceFee.toLocaleString()}</span>
        </div>
        <div className="pt-3 border-t border-border flex justify-between font-bold text-sm">
          <span>Total</span>
          <span>KSh {grandTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
