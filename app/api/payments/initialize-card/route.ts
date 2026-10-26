import { NextResponse } from "next/server";
import { calculateBookingPrice } from "@/lib/booking-pricing";
import { createClient } from "@/utils/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const propertyId = typeof body.property_id === "string" ? body.property_id : "";
  const checkInDate = typeof body.check_in === "string" ? body.check_in : "";
  const checkOutDate = typeof body.check_out === "string" ? body.check_out : "";
  const totalNights = body.total_nights;
  const guestsCount = body.guests_count;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const checkIn = parseDate(checkInDate);
  const checkOut = parseDate(checkOutDate);

  if (
    !/^[0-9a-f-]{36}$/i.test(propertyId) ||
    !emailPattern.test(email) ||
    checkIn === null ||
    checkOut === null ||
    checkOut <= checkIn ||
    typeof guestsCount !== "number" ||
    !Number.isInteger(guestsCount) ||
    guestsCount < 1 ||
    typeof totalNights !== "number" ||
    !Number.isInteger(totalNights) ||
    totalNights !== (checkOut - checkIn) / 86_400_000
  ) {
    return NextResponse.json(
      { error: "Enter a valid email, guest count, and stay date range." },
      { status: 400 },
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Paystack card initialization failed: PAYSTACK_SECRET_KEY is not configured.");
    return NextResponse.json(
      { error: "Card payments are temporarily unavailable. Please try another payment method." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: isAvailable, error: availabilityError } = await supabase.rpc(
    "is_property_available",
    {
      p_property_id: propertyId,
      p_check_in: checkInDate,
      p_check_out: checkOutDate,
    },
  );

  if (availabilityError) {
    console.error(
      "Paystack availability check failed:",
      availabilityError.message,
    );
    return NextResponse.json(
      { error: "Unable to verify availability. Please try again." },
      { status: 503 },
    );
  }

  if (isAvailable !== true) {
    return NextResponse.json(
      { error: "Those dates are no longer available. Please choose another stay." },
      { status: 409 },
    );
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, price_per_night, max_guests, is_active")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error("Paystack property lookup failed:", propertyError.message);
    return NextResponse.json(
      { error: "Unable to verify this property for booking." },
      { status: 500 },
    );
  }

  if (!property || property.is_active !== true) {
    return NextResponse.json(
      { error: "This property is unavailable for booking." },
      { status: 404 },
    );
  }

  if (
    typeof property.max_guests !== "number" ||
    guestsCount > property.max_guests
  ) {
    return NextResponse.json(
      { error: "Guest count exceeds this property's capacity." },
      { status: 400 },
    );
  }

  const basePrice = Number(property.price_per_night);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    console.error(`Property ${property.id} has invalid pricing.`);
    return NextResponse.json(
      { error: "Unable to verify this property's price." },
      { status: 500 },
    );
  }

  const pricing = calculateBookingPrice(basePrice, totalNights, guestsCount);
  const amountInMinorUnits = pricing.total * 100;

  if (!Number.isSafeInteger(amountInMinorUnits) || amountInMinorUnits <= 0) {
    return NextResponse.json(
      { error: "The calculated payment amount is invalid." },
      { status: 400 },
    );
  }

  let paystackResponse: Response;
  try {
    paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInMinorUnits,
        currency: "KES",
        callback_url: new URL(
          `/properties/${property.id}?payment=return`,
          request.url,
        ).toString(),
        metadata: {
          property_id: property.id,
          check_in: checkInDate,
          check_out: checkOutDate,
          total_nights: totalNights,
          guests_count: guestsCount,
          accommodation_total: pricing.accommodationTotal,
          service_fee: pricing.serviceFee,
          tax_fee: pricing.taxFee,
          total_amount: pricing.total,
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Paystack API request failed:", error);
    return NextResponse.json(
      { error: "Unable to reach the card payment provider. Please try again." },
      { status: 502 },
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await paystackResponse.json();
  } catch {
    console.error("Paystack returned an invalid JSON response.");
    return NextResponse.json(
      { error: "The card payment provider returned an invalid response." },
      { status: 502 },
    );
  }

  if (
    !paystackResponse.ok ||
    !isRecord(responseBody) ||
    responseBody.status !== true ||
    !isRecord(responseBody.data) ||
    typeof responseBody.data.authorization_url !== "string"
  ) {
    const providerMessage =
      isRecord(responseBody) && typeof responseBody.message === "string"
        ? responseBody.message
        : "Paystack could not initialize this payment.";
    console.error("Paystack initialization rejected:", providerMessage);
    return NextResponse.json(
      { error: "Card payment could not be initialized. Please try again or use another payment method." },
      { status: 502 },
    );
  }

  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(responseBody.data.authorization_url);
  } catch {
    console.error("Paystack returned an invalid authorization URL.");
    return NextResponse.json(
      { error: "The card payment provider returned an invalid checkout URL." },
      { status: 502 },
    );
  }

  if (
    authorizationUrl.protocol !== "https:" ||
    authorizationUrl.hostname !== "checkout.paystack.com"
  ) {
    console.error("Paystack returned an unexpected checkout URL.");
    return NextResponse.json(
      { error: "The card payment provider returned an invalid checkout URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    authorization_url: authorizationUrl.toString(),
  });
}
