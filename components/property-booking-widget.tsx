"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  Loader2,
  Calendar as CalendarIcon,
  ChevronDown,
  Users,
  CreditCard,
  Mail
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getPropertyBookedDates, createBooking } from "@/lib/api/bookings";
import { PropertyReviewsSummary } from "./property-reviews-summary";
import { GuestAccountAccess } from "@/components/guest-account-access";

interface BookingRecord {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  guests_count: number;
  total_price: number;
  status: string;
  payment_method: 'mpesa' | 'paystack';
}

interface PropertyBookingWidgetProps {
  property: {
    id: string;
    price_per_night: number;
    cleaning_fee?: number;
    max_guests?: number;
  };
}

export function PropertyBookingWidget({
  property,
}: PropertyBookingWidgetProps) {
  const basePrice = Number(property.price_per_night || 0);

  // Service fee: 3% of the base price
  const serviceFee = basePrice * 0.03;
  // Tax: 16% applied to base price + service fee
  const tax = (basePrice + serviceFee) * 0.16;
  const maxGuests = property.max_guests || 4;

  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [today, setToday] = useState<Date | undefined>(undefined);
  const [guestsCount, setGuestsCount] = useState<string>("1");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "paystack">("mpesa");

  const [bookedRanges, setBookedRanges] = useState<
    { check_in: string; check_out: string }[]
  >([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingWarning, setBookingWarning] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<BookingRecord | null>(
    null,
  );

  // Resolve availability before allowing date selection or checkout.
  useEffect(() => {
    let isActive = true;

    async function loadAvailability() {
      setAvailabilityStatus("loading");
      setAvailabilityError(null);

      try {
        const ranges = await getPropertyBookedDates(property.id);
        if (!isActive) return;
        setBookedRanges(ranges);
        setAvailabilityStatus("ready");
      } catch (error) {
        if (!isActive) return;
        console.error("Property availability could not be loaded:", error);
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Unable to load this property’s availability.",
        );
        setAvailabilityStatus("error");
      }
    }

    void loadAvailability();
    return () => {
      isActive = false;
    };
  }, [property.id]);

  const disabledDays = bookedRanges.map((range) => ({
    from: parseISO(range.check_in),
    to: subDays(parseISO(range.check_out), 1),
  }));

  const hasDateConflict = (start: Date, end: Date) =>
    bookedRanges.some((range) => {
      const bookedStart = parseISO(range.check_in);
      const bookedEnd = parseISO(range.check_out);
      return start < bookedEnd && end > bookedStart;
    });

  const nights =
    checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 1;
  const guestCountNum = Number(guestsCount) || 1;

  const guestMultiplier =
    guestCountNum > 2 ? 1 + (guestCountNum - 2) * 0.05 : 1;
  const nightlyRateWithGuests = Math.round(basePrice * guestMultiplier);
  const accommodationTotal = nightlyRateWithGuests * nights;
  const grandTotal = accommodationTotal + tax + serviceFee;

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setCheckIn(range.from);
      if (range.to && differenceInDays(range.to, range.from) <= 0) {
        setCheckOut(undefined);
        setErrorMessage("Check-out must be at least one day after check-in.");
        return;
      }

      if (range.to && hasDateConflict(range.from, range.to)) {
        setCheckOut(undefined);
        setErrorMessage(
          "Those dates include a night that is already reserved. Please choose different dates.",
        );
        return;
      }

      setCheckOut(range.to);
      setErrorMessage(null);
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
      setErrorMessage("Please select both check-in and check-out dates.");
      return;
    }

    if (differenceInDays(checkOut, checkIn) <= 0) {
      setErrorMessage("Check-out must be at least one day after check-in.");
      return;
    }

    if (availabilityStatus !== "ready") {
      setErrorMessage(
        availabilityError ??
          "Availability is still loading. Please wait and try again.",
      );
      return;
    }

    if (hasDateConflict(checkIn, checkOut)) {
      setCheckOut(undefined);
      setErrorMessage(
        "Those dates are no longer available. Please select another stay.",
      );
      return;
    }

    // Conditional Validation based on payment method
    if (paymentMethod === "mpesa") {
      const cleanPhone = phoneNumber.replace(/\s+/g, "");
      const phoneRegex = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
      if (!phoneRegex.test(cleanPhone)) {
        setErrorMessage(
          "Please enter a valid M-Pesa phone number (e.g., 0712345678).",
        );
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setErrorMessage("Please enter a valid email address for card processing.");
        return;
      }
    }

    setIsLoading(true);

    if (paymentMethod === "mpesa") {
      const cleanPhone = phoneNumber.replace(/\s+/g, "");
      const result = await createBooking({
        property_id: property.id,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        total_nights: nights,
        guests_count: guestCountNum,
        total_price: grandTotal,
        phone_number: cleanPhone,
        payment_method: "mpesa",
      });

      setIsLoading(false);

      if (result.success && result.booking) {
        setSuccessBooking(result.booking as BookingRecord);
        setBookingWarning(result.notificationWarning ?? null);
      } else {
        setErrorMessage(result.error || "Booking failed. Please try again.");
      }
    } else {
      // Card Checkout Initialization (Paystack)
      try {
        const res = await fetch("/api/payments/initialize-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: property.id,
            check_in: format(checkIn, "yyyy-MM-dd"),
            check_out: format(checkOut, "yyyy-MM-dd"),
            total_nights: nights,
            guests_count: guestCountNum,
            total_price: grandTotal,
            email: email.trim(),
          }),
        });

        const data: unknown = await res.json();
        setIsLoading(false);

        if (
          typeof data === "object" &&
          data !== null &&
          "authorization_url" in data &&
          typeof data.authorization_url === "string"
        ) {
          const authorizationUrl = new URL(data.authorization_url);
          if (
            authorizationUrl.protocol === "https:" &&
            authorizationUrl.hostname === "checkout.paystack.com"
          ) {
            window.location.href = authorizationUrl.toString();
            return;
          }
        }

        if (typeof data === "object" && data !== null && "error" in data) {
          setErrorMessage(
            typeof data.error === "string"
              ? data.error
              : "Could not initialize card payment gateway.",
          );
        } else {
          setErrorMessage("Could not initialize card payment gateway.");
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Card payment initialization failed:", error);
        setErrorMessage(
          error instanceof Error && error.message === "Failed to fetch"
            ? "Unable to reach the card payment service. Please check your connection and try again."
            : "Card payment could not be initialized. Please try again.",
        );
      }
    }
  };

  if (successBooking) {
    return (
      <div className="sticky top-24 rounded-3xl bg-card border border-border p-6 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold">M-Pesa Push Sent!</h3>
        {bookingWarning && (
          <p
            role="status"
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300"
          >
            {bookingWarning}
          </p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please check your phone (
          <span className="font-semibold text-foreground">{phoneNumber}</span>)
          and enter your M-Pesa PIN to complete payment of{" "}
          <span className="font-bold text-foreground">
            KSh {grandTotal.toLocaleString()}
          </span>
          .
        </p>
        <div className="p-4 rounded-xl bg-muted/30 border border-border text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking ID:</span>
            <span className="font-mono font-semibold">
              {successBooking.id.substring(0, 8)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in:</span>
            <span className="font-semibold">{successBooking.check_in}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out:</span>
            <span className="font-semibold">{successBooking.check_out}</span>
          </div>
        </div>
        <GuestAccountAccess
          initialMethod="phone"
          initialContact={phoneNumber}
        />
        <Button
          onClick={() => {
            setSuccessBooking(null);
            setCheckIn(undefined);
            setCheckOut(undefined);
          }}
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
          <span className="text-2xl font-extrabold text-foreground">
            KSh {basePrice.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground"> / night</span>
        </div>
        <PropertyReviewsSummary propertyId={property.id} />
      </div>

      <form onSubmit={handleReserve} className="space-y-4">
        {/* Stay Dates Picker */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Stay Dates
          </label>
          <Popover
            open={isCalendarOpen}
            onOpenChange={(open) => {
              if (open) {
                setToday(new Date());
                setErrorMessage(null);
              }
              setIsCalendarOpen(open);
            }}
          >
            <PopoverTrigger className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left font-normal">
              <div className="flex items-center gap-2.5 text-xs truncate">
                <CalendarIcon className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate font-semibold text-foreground">
                  {checkIn && checkOut
                    ? `${format(checkIn, "MMM dd, yyyy")} - ${format(checkOut, "MMM dd, yyyy")}`
                    : checkIn
                      ? `${format(checkIn, "MMM dd, yyyy")} - Select checkout`
                      : "Select check-in & check-out dates"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-4 bg-card border border-border shadow-2xl rounded-2xl z-50"
              align="center"
            >
              <DayPicker
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={handleDateSelect}
                disabled={[
                  ...(availabilityStatus !== "ready" ? [true] : []),
                  ...(today ? [{ before: today }] : []),
                  ...disabledDays,
                ]}
                numberOfMonths={1}
                className="text-xs font-sans"
              />
            </PopoverContent>
          </Popover>
          {availabilityStatus === "loading" && (
            <p className="text-xs text-muted-foreground">
              Checking availability…
            </p>
          )}
          {availabilityError && (
            <p role="alert" className="text-xs text-destructive">
              {availabilityError} Booking is disabled until availability can be checked.
            </p>
          )}
        </div>

        {/* Guests Select */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Guests
          </label>
          <Select
            value={guestsCount}
            onValueChange={(val) => setGuestsCount(val || "1")}
          >
            <SelectTrigger className="!h-11 w-full px-3.5 rounded-xl border-border bg-muted/30 hover:bg-muted/50 text-xs font-semibold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs truncate">
                <Users className="w-4 h-4 text-accent shrink-0" />
                <SelectValue placeholder="Guests" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border rounded-xl shadow-xl z-50">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                <SelectItem
                  key={num}
                  value={String(num)}
                  className="text-xs py-2.5 font-medium"
                >
                  {num} Guest{num > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fancy Shadcn-Styled Payment Method Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("mpesa")}
              className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                paymentMethod === "mpesa"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm"
                  : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>M-Pesa</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("paystack")}
              className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                paymentMethod === "paystack"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Credit Card</span>
            </button>
          </div>
        </div>

        {/* Conditional Input based on payment method */}
        {paymentMethod === "mpesa" ? (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
              M-Pesa Phone Number
            </label>
            <InputGroup className="!h-11 w-full rounded-xl border border-border bg-muted/30 px-3 hover:bg-muted/50 transition-colors flex items-center">
              <InputGroupAddon
                align="inline-start"
                className="text-xs font-bold text-muted-foreground pr-1.5 select-none flex items-center gap-1.5"
              >
                <span className="text-sm leading-none">🇰🇪</span>
                <span>+254</span>
              </InputGroupAddon>
              <InputGroupInput
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={9}
                required
                placeholder="712345678"
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const localNumber =
                    digits.startsWith("0") && digits.length >= 3
                      ? digits.slice(1)
                      : digits;
                  setPhoneNumber(localNumber.slice(0, 9));
                }}
                className="text-xs font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground/60"
              />
            </InputGroup>
          </div>
        ) : (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
              Guest Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || availabilityStatus !== "ready"}
          className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {paymentMethod === "mpesa"
                  ? "Triggering STK Push..."
                  : "Redirecting to Secure Pay..."}
              </span>
            </>
          ) : (
            <>
              {paymentMethod === "mpesa" ? (
                <Smartphone className="w-4 h-4" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>
                {paymentMethod === "mpesa"
                  ? "Reserve with M-Pesa"
                  : `Pay KSh ${grandTotal.toLocaleString()} with Card`}
              </span>
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        You won&apos;t be charged until confirmed
      </p>

      {/* Price breakdown */}
      <div className="space-y-3 pt-4 border-t border-border text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            KSh {nightlyRateWithGuests.toLocaleString()} × {nights} night
            {nights > 1 ? "s" : ""}{" "}
            {guestCountNum > 2 ? `(${guestCountNum} guests)` : ""}
          </span>
          <span>KSh {accommodationTotal.toLocaleString()}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax (16%)</span>
            <span>KSh {tax.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service fee (3%)</span>
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
