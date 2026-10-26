export const SERVICE_FEE_RATE = 0.03;
export const TAX_RATE = 0.16;

export interface BookingPrice {
  nightlyRate: number;
  accommodationTotal: number;
  serviceFee: number;
  taxFee: number;
  total: number;
  hostPayout: number;
}

export function calculateBookingPrice(
  pricePerNight: number,
  nights: number,
  guests: number,
): BookingPrice {
  if (
    !Number.isFinite(pricePerNight) ||
    pricePerNight < 0 ||
    !Number.isInteger(nights) ||
    nights < 1 ||
    !Number.isInteger(guests) ||
    guests < 1
  ) {
    throw new Error("Booking price inputs are invalid.");
  }

  const guestMultiplier = guests > 2 ? 1 + (guests - 2) * 0.05 : 1;
  const nightlyRate = Math.round(pricePerNight * guestMultiplier);
  const accommodationTotal = nightlyRate * nights;
  const serviceFee = Math.round(accommodationTotal * SERVICE_FEE_RATE);
  const taxFee = Math.round((accommodationTotal + serviceFee) * TAX_RATE);

  return {
    nightlyRate,
    accommodationTotal,
    serviceFee,
    taxFee,
    total: accommodationTotal + serviceFee + taxFee,
    hostPayout: accommodationTotal,
  };
}
