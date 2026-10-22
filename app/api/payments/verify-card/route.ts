import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") ?? "";
  const propertyId = searchParams.get("property_id") ?? "";

  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(reference) ||
    !/^[0-9a-f-]{36}$/i.test(propertyId)
  ) {
    return NextResponse.json(
      { error: "The payment reference is invalid." },
      { status: 400 },
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Paystack verification failed: PAYSTACK_SECRET_KEY is not configured.");
    return NextResponse.json(
      { error: "Payment verification is temporarily unavailable." },
      { status: 503 },
    );
  }

  let paystackResponse: Response;
  try {
    paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Paystack verification request failed:", error);
    return NextResponse.json(
      { error: "Unable to reach the payment provider. Please try again." },
      { status: 502 },
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await paystackResponse.json();
  } catch {
    console.error("Paystack verification returned invalid JSON.");
    return NextResponse.json(
      { error: "The payment provider returned an invalid response." },
      { status: 502 },
    );
  }

  if (
    !paystackResponse.ok ||
    !isRecord(responseBody) ||
    responseBody.status !== true ||
    !isRecord(responseBody.data)
  ) {
    console.error("Paystack could not verify payment reference:", reference);
    return NextResponse.json(
      { error: "We could not verify this payment. Please contact support if you were charged." },
      { status: 400 },
    );
  }

  const transaction = responseBody.data;
  const metadata = transaction.metadata;
  const isSuccessful =
    transaction.status === "success" &&
    transaction.reference === reference &&
    transaction.currency === "KES" &&
    typeof transaction.amount === "number" &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    isRecord(metadata) &&
    metadata.property_id === propertyId;

  if (!isSuccessful) {
    return NextResponse.json(
      { error: "This payment was not successful for this property." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    verified: true,
    amount: transaction.amount,
    currency: transaction.currency,
  });
}
