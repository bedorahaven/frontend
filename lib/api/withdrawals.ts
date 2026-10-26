"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithdrawalRequestNotification } from "@/lib/email";
import type { PayoutMethod, PayoutMethodType, WithdrawalRequest } from "@/types/transactions";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const QUERY_PAGE_SIZE = 500;
const MAX_WITHDRAWAL_AMOUNT = 99_999_999.99;

export interface HostWithdrawalData {
  payoutMethods: PayoutMethod[];
  requests: WithdrawalRequest[];
}

export interface AdminWithdrawalRequest extends WithdrawalRequest {
  host: {
    full_name: string;
    email: string | null;
    phone_number: string | null;
  } | null;
}

export async function getHostWithdrawalData(): Promise<HostWithdrawalData> {
  const supabase = await createClient();
  const user = await requireRole(supabase, "host");

  const [{ data: payoutMethods, error: methodsError }, requests] =
    await Promise.all([
      supabase
        .from("payout_methods")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false }),
      listTransactionsByProfile(supabase, user.id, "withdrawal"),
    ]);

  if (methodsError) {
    console.error("Host payout methods fetch failed:", methodsError.message);
    throw new Error("Unable to load your payout methods.");
  }

  return {
    payoutMethods: (payoutMethods ?? []) as PayoutMethod[],
    requests: requests as WithdrawalRequest[],
  };
}

export async function savePayoutMethod(input: {
  methodType: PayoutMethodType;
  bankName?: string;
  bankCode?: string;
  accountName?: string;
  accountNumber?: string;
  phoneNumber?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  if (!input || typeof input !== "object") {
    return { success: false, error: "Enter valid payout details." };
  }

  let user: { id: string };
  try {
    user = await requireRole(supabase, "host");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Host access is required.",
    };
  }

  if (input.methodType !== "bank" && input.methodType !== "mpesa") {
    return { success: false, error: "Choose a supported payout method." };
  }

  const bankName = typeof input.bankName === "string" ? input.bankName.trim() : "";
  const bankCode = typeof input.bankCode === "string" ? input.bankCode.trim() : "";
  const accountName =
    typeof input.accountName === "string" ? input.accountName.trim() : "";
  const accountNumber =
    typeof input.accountNumber === "string"
      ? input.accountNumber.replace(/\s+/g, "")
      : "";
  const phoneNumber =
    input.methodType === "mpesa" && typeof input.phoneNumber === "string"
      ? normalizeKenyanPhone(input.phoneNumber)
      : null;

  if (
    input.methodType === "bank" &&
    (!bankName ||
      !/^[A-Za-z0-9_-]{1,24}$/.test(bankCode) ||
      accountName.length < 2 ||
      accountName.length > 100 ||
      !/^[A-Za-z0-9-]{4,34}$/.test(accountNumber))
  ) {
    return { success: false, error: "Enter valid bank and account details." };
  }
  if (input.methodType === "mpesa" && !phoneNumber) {
    return {
      success: false,
      error: "Enter a valid Kenyan M-Pesa number, for example 0712345678.",
    };
  }
  const { error } = await supabase.from("payout_methods").insert({
    host_id: user.id,
    method_type: input.methodType,
    bank_name: input.methodType === "bank" ? bankName : null,
    bank_code: input.methodType === "bank" ? bankCode : null,
    account_name: input.methodType === "bank" ? accountName : null,
    account_number: input.methodType === "bank" ? accountNumber : null,
    phone_number: phoneNumber,
  });

  if (error) {
    console.error("Payout method save failed:", error.message);
    return { success: false, error: "Unable to save payout method." };
  }

  revalidatePath("/host/earnings");
  return { success: true };
}

export async function requestWithdrawal(
  payoutMethodId: string,
  amountInput: number,
): Promise<{ success: true; notificationWarning?: string } | { success: false; error: string }> {
  const supabase = await createClient();
  let user: { id: string };

  try {
    user = await requireRole(supabase, "host");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Host access is required.",
    };
  }

  if (
    !Number.isFinite(amountInput) ||
    amountInput <= 0 ||
    amountInput > MAX_WITHDRAWAL_AMOUNT ||
    Math.abs(amountInput * 100 - Math.round(amountInput * 100)) > 1e-8
  ) {
    return { success: false, error: "Enter a valid withdrawal amount." };
  }
  const amount = amountInput;
  if (!/^[0-9a-f-]{36}$/i.test(payoutMethodId)) {
    return { success: false, error: "Choose a valid payout method." };
  }

  const { data: method, error: methodError } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("id", payoutMethodId)
    .eq("host_id", user.id)
    .maybeSingle();

  if (methodError || !method) {
    console.error("Withdrawal payout method lookup failed:", methodError?.message);
    return { success: false, error: "The selected payout method is unavailable." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert({
      booking_id: null,
      profile_id: user.id,
      transaction_type: "withdrawal",
      amount,
      currency: "KES",
      status: "pending",
      phone_number: null,
      payout_method_id: method.id,
      payout_method_type: method.method_type,
      payout_bank_name: method.bank_name,
      payout_bank_code: method.bank_code,
      payout_account_name: method.account_name,
      payout_account_number: method.account_number,
      payout_phone_number: method.phone_number,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Withdrawal request insert failed:", insertError?.message);
    return {
      success: false,
      error: "Unable to submit your withdrawal request. Please try again.",
    };
  }

  revalidatePath("/host/earnings");
  revalidatePath("/admin/earnings");

  let notificationWarning: string | undefined;
  try {
    const admin = createAdminClient();
    const [{ data: host, error: hostError }, { data: admins, error: adminError }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle(),
        admin.from("profiles").select("email").eq("role", "admin"),
      ]);

    if (hostError || adminError) {
      throw new Error(
        hostError?.message ?? adminError?.message ?? "Unable to load notification recipients.",
      );
    }

    const adminEmails = [
      ...new Set(
        (admins ?? [])
          .map((profile) => profile.email?.trim())
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    if (!host) throw new Error("Host profile details are unavailable.");

    const destination =
      method.method_type === "bank"
        ? `${method.bank_name} account ending ${method.account_number?.slice(-4)}`
        : `M-Pesa ${maskPhone(method.phone_number ?? "")}`;

    await sendWithdrawalRequestNotification({
      adminEmails,
      hostName: host.full_name,
      hostEmail: host.email ?? "Not provided",
      amount,
      methodType: method.method_type,
      destination,
    });
  } catch (error) {
    console.error("Admin withdrawal email notification failed:", error);
    notificationWarning =
      "Your request is recorded, but the admin email notification could not be sent. Admins can still see it in the earnings page.";
  }

  return { success: true, notificationWarning };
}

export async function getAdminWithdrawalRequests(): Promise<AdminWithdrawalRequest[]> {
  const supabase = await createClient();
  await requireRole(supabase, "admin");
  const requests = await listTransactionsByProfile(supabase, null, "withdrawal");
  const hostIds = [...new Set(requests.map((request) => request.profile_id))];

  const { data: profiles, error } =
    hostIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, phone_number")
          .in("id", hostIds)
      : { data: [], error: null };

  if (error) {
    console.error("Admin withdrawal host lookup failed:", error.message);
    throw new Error("Unable to load host details for withdrawal requests.");
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return requests.map((request) => ({
    ...request,
    host: profilesById.get(request.profile_id) ?? null,
  })) as AdminWithdrawalRequest[];
}

export async function updateWithdrawalRequestStatus(
  requestId: string,
  status: "completed" | "failed",
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  try {
    await requireRole(supabase, "admin");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Admin access is required.",
    };
  }

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return { success: false, error: "Invalid withdrawal request." };
  }
  if (status !== "completed" && status !== "failed") {
    return { success: false, error: "Choose a valid settlement status." };
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("transaction_type", "withdrawal")
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Withdrawal status update failed:", error.message);
    return { success: false, error: "Unable to update this withdrawal request." };
  }
  if (!data) {
    return {
      success: false,
      error: "This request is no longer pending. Refresh the list and try again.",
    };
  }

  revalidatePath("/admin/earnings");
  revalidatePath("/host/earnings");
  return { success: true };
}

async function requireRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: "host" | "admin",
): Promise<{ id: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to manage withdrawals.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Withdrawal role verification failed:", error.message);
    throw new Error("Unable to verify your account role.");
  }
  if (profile?.role !== role) {
    throw new Error(`Only ${role}s can access this withdrawal action.`);
  }

  return { id: user.id };
}

async function listTransactionsByProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string | null,
  transactionType: "withdrawal",
): Promise<WithdrawalRequest[]> {
  const requests: WithdrawalRequest[] = [];

  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("transaction_type", transactionType)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + QUERY_PAGE_SIZE - 1);
    if (profileId) query = query.eq("profile_id", profileId);

    const { data, error } = await query;
    if (error) {
      console.error("Withdrawal requests fetch failed:", error.message);
      throw new Error("Unable to load withdrawal requests.");
    }

    requests.push(...((data ?? []) as WithdrawalRequest[]));
    if (!data || data.length < QUERY_PAGE_SIZE) break;
  }

  return requests;
}

function normalizeKenyanPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("+")
    ? compact.slice(1)
    : compact.startsWith("0")
      ? `254${compact.slice(1)}`
      : /^(7|1)\d{8}$/.test(compact)
        ? `254${compact}`
        : compact;
  return /^254(7|1)\d{8}$/.test(normalized) ? normalized : null;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 6)}***${phone.slice(-2)}`;
}
