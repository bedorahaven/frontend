"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function completeGuestAccount() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Verify your contact to sign in." };
  }

  if (!user.email_confirmed_at && !user.phone_confirmed_at) {
    return {
      success: false,
      error: "Your email address or phone number has not been verified yet.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Guest profile service is not configured:", error);
    return {
      success: false,
      error: "Guest account setup is temporarily unavailable. Please try again later.",
    };
  }

  const { data: profile, error: profileReadError } = await admin
    .from("profiles")
    .select("id, email, full_name, phone_number, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error("Guest profile lookup failed:", profileReadError.message);
    return {
      success: false,
      error: "We could not prepare your guest profile. Please try again.",
    };
  }

  const email = user.email?.trim().toLowerCase() || null;
  const phoneNumber = user.phone?.trim() || null;
  const fullName =
    profile?.full_name ||
    (email ? email.split("@")[0] : null) ||
    phoneNumber ||
    "Guest";

  const { error: profileUpsertError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: email ?? profile?.email ?? null,
      full_name: fullName,
      phone_number: phoneNumber ?? profile?.phone_number ?? null,
      role: profile?.role ?? "guest",
      is_verified: true,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileUpsertError) {
    console.error("Guest profile creation failed:", profileUpsertError.message);
    return {
      success: false,
      error: "We could not prepare your guest profile. Please try again.",
    };
  }

  const { error: bookingClaimError } = await supabase.rpc(
    "claim_guest_bookings",
  );

  if (bookingClaimError) {
    console.error("Guest booking account link failed:", bookingClaimError.message);
    return {
      success: true,
      warning:
        "Your account is ready, but we could not link your previous bookings yet.",
    };
  }

  return { success: true, warning: null };
}
