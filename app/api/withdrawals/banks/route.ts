import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface PaystackBank {
  name: string;
  code: string;
}

function isPaystackBank(value: unknown): value is PaystackBank {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    value.code.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to load payout banks." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Kenyan bank lookup role check failed:", profileError.message);
    return NextResponse.json(
      { error: "Unable to verify your host account." },
      { status: 500 },
    );
  }
  if (profile?.role !== "host") {
    return NextResponse.json({ error: "Only hosts can load payout banks." }, { status: 403 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Kenyan payout bank lookup failed: PAYSTACK_SECRET_KEY is not configured.");
    return NextResponse.json(
      { error: "Bank transfers are temporarily unavailable." },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(
      "https://api.paystack.co/bank?country=kenya&perPage=100",
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        next: { revalidate: 86_400 },
      },
    );
  } catch (error) {
    console.error("Paystack Kenyan bank lookup request failed:", error);
    return NextResponse.json(
      { error: "Unable to reach the bank directory. Please try again." },
      { status: 502 },
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error("Paystack bank directory returned invalid JSON.");
    return NextResponse.json(
      { error: "The bank directory returned an invalid response." },
      { status: 502 },
    );
  }

  if (
    !response.ok ||
    !isRecord(body) ||
    body.status !== true ||
    !Array.isArray(body.data)
  ) {
    const providerMessage =
      isRecord(body) && typeof body.message === "string" ? body.message : "Invalid response.";
    console.error("Paystack Kenyan bank lookup failed:", providerMessage);
    return NextResponse.json(
      { error: "Unable to load Kenyan banks from Paystack." },
      { status: 502 },
    );
  }

  const banks = body.data
    .filter(isPaystackBank)
    .map(({ name, code }) => ({ name, code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (banks.length === 0) {
    console.error("Paystack returned no Kenyan bank entries.");
    return NextResponse.json(
      { error: "No Kenyan banks are currently available from Paystack." },
      { status: 502 },
    );
  }

  return NextResponse.json({ banks });
}
