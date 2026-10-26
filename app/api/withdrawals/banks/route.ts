import { NextResponse } from "next/server";
import { getKenyanBanks } from "@/lib/paystack/banks";
import { createClient } from "@/utils/supabase/server";

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

  try {
    const banks = await getKenyanBanks();
    return NextResponse.json({
      banks: banks.map(({ name, code }) => ({ name, code })),
    });
  } catch (error) {
    console.error("Paystack Kenyan bank lookup failed:", error);
    const errorMessage =
      error instanceof Error &&
      error.message === "PAYSTACK_SECRET_KEY is not configured."
        ? "Bank transfers are temporarily unavailable."
        : "Unable to load Kenyan banks from Paystack.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 502 },
    );
  }
}
