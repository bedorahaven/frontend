"use server";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPayoutVerificationCode,
  sendWithdrawalRequestNotification,
} from "@/lib/email";
import { getKenyanBanks } from "@/lib/paystack/banks";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  bankCode?: string;
  accountNumber?: string;
  phoneNumber?: string;
}): Promise<
  | { success: true; payoutMethodId: string; verificationRequired: boolean }
  | { success: false; error: string }
> {
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

  const bankCode = typeof input.bankCode === "string" ? input.bankCode.trim() : "";
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
    (!/^[A-Za-z0-9_-]{1,24}$/.test(bankCode) ||
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

  let bankName: string | null = null;
  let accountName: string | null = null;
  if (input.methodType === "bank") {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error(
        "Paystack payout account verification failed: PAYSTACK_SECRET_KEY is not configured.",
      );
      return {
        success: false,
        error: "Bank account verification is temporarily unavailable.",
      };
    }

    let banks: Awaited<ReturnType<typeof getKenyanBanks>>;
    try {
      banks = await getKenyanBanks();
    } catch (error) {
      console.error("Paystack bank directory request failed:", error);
      return {
        success: false,
        error: "Unable to verify the bank right now. Please try again.",
      };
    }

    const selectedBank = banks.find((bank) => bank.code === bankCode);
    if (!selectedBank) {
      return {
        success: false,
        error: "Select a valid Kenyan bank from the list.",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile?.full_name) {
      console.error("Payout bank owner profile lookup failed:", profileError?.message);
      return {
        success: false,
        error: "Unable to verify your account name. Please try again.",
      };
    }

    const resolveUrl = new URL("https://api.paystack.co/bank/resolve");
    resolveUrl.searchParams.set("account_number", accountNumber);
    resolveUrl.searchParams.set("bank_code", bankCode);

    let resolveResponse: Response;
    try {
      resolveResponse = await fetch(resolveUrl, {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("Paystack payout account resolution request failed:", error);
      return {
        success: false,
        error: "Unable to verify this account right now. Please try again.",
      };
    }

    let resolveBody: unknown;
    try {
      resolveBody = await resolveResponse.json();
    } catch {
      console.error("Paystack account resolution returned invalid JSON.");
      return {
        success: false,
        error: "Account verification returned an invalid response.",
      };
    }

    const resolvedData =
      isRecord(resolveBody) && isRecord(resolveBody.data)
        ? resolveBody.data
        : null;
    const providerMessage =
      isRecord(resolveBody) && typeof resolveBody.message === "string"
        ? resolveBody.message
        : null;
    const resolvedAccountName =
      resolveResponse.ok &&
      isRecord(resolveBody) &&
      resolveBody.status === true &&
      resolvedData &&
      typeof resolvedData.account_name === "string" &&
      resolvedData.account_name.trim().length >= 2
        ? resolvedData.account_name.trim()
        : null;

    if (!resolvedAccountName) {
      const detail =
        resolveResponse.ok &&
        isRecord(resolveBody) &&
        resolveBody.status === true &&
        resolvedData
          ? "Paystack accepted the request but did not return an account-holder name."
          : providerMessage
            ? `Paystack says: ${providerMessage.replace(/[\r\n]/g, " ").slice(0, 180)}`
            : "Paystack could not resolve this bank and account-number combination.";
      return {
        success: false,
        error: `${detail} The bank may be listed by Paystack but not support account resolution for this account type. Contact support or choose another payout method.`,
      };
    }
    bankName = selectedBank.name;
    accountName = resolvedAccountName.slice(0, 100);
    accountName = resolvedAccountName.slice(0, 100);

    if (!hasMatchingName(profile.full_name, accountName)) {
      return {
        success: false,
        error:
          "The bank account name does not match your registered profile name. Update your profile or use an account in your name.",
      };
    }
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Payout method admin client setup failed:", error);
    return {
      success: false,
      error: "Payout verification is temporarily unavailable.",
    };
  }

  const { data: inserted, error } = await admin
    .from("payout_methods")
    .insert({
    host_id: user.id,
    method_type: input.methodType,
    bank_name: input.methodType === "bank" ? bankName : null,
    bank_code: input.methodType === "bank" ? bankCode : null,
    account_name: input.methodType === "bank" ? accountName : null,
    account_number: input.methodType === "bank" ? accountNumber : null,
    phone_number: phoneNumber,
    verification_status: input.methodType === "bank" ? "verified" : "pending",
    verified_at: input.methodType === "bank" ? new Date().toISOString() : null,
  })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("Payout method save failed:", error?.message);
    return { success: false, error: "Unable to save payout method." };
  }

  revalidatePath("/host/withdrawals");
  return {
    success: true,
    payoutMethodId: inserted.id,
    verificationRequired: input.methodType === "mpesa",
  };
}

export async function beginPayoutMethodVerification(
  payoutMethodId: string,
): Promise<
  | { success: true; challengeId: string; maskedEmail: string }
  | { success: false; error: string }
> {
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
  if (!/^[0-9a-f-]{36}$/i.test(payoutMethodId)) {
    return { success: false, error: "Choose a valid payout method." };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  let email = authData.user?.email?.trim() || null;
  if (!email) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Payout verification profile email lookup failed:",
        profileError.message,
      );
      return {
        success: false,
        error: "Unable to load your account email. Please try again.",
      };
    }

    email = profile?.email?.trim() || null;
  }

  if (!email) {
    if (authError) {
      console.error("Payout verification auth email lookup failed:", authError.message);
    }
    return {
      success: false,
      error: "Add a valid email address to your account before verifying M-Pesa.",
    };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Payout verification admin client setup failed:", error);
    return { success: false, error: "Email verification is temporarily unavailable." };
  }
  const { data: method, error: methodError } = await admin
    .from("payout_methods")
    .select("id, method_type, verification_status")
    .eq("id", payoutMethodId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (methodError || !method || method.method_type !== "mpesa") {
    console.error("Payout verification method lookup failed:", methodError?.message);
    return { success: false, error: "The M-Pesa payout method is unavailable." };
  }
  if (method.verification_status === "verified") {
    return { success: false, error: "This M-Pesa payout method is already verified." };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentCodes, error: rateLimitError } = await admin
    .from("payout_method_verification_codes")
    .select("created_at")
    .eq("host_id", user.id)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: false })
    .limit(5);
  if (rateLimitError) {
    console.error("Payout verification rate limit check failed:", rateLimitError.message);
    return { success: false, error: "Unable to start email verification." };
  }
  if (recentCodes?.length === 5) {
    return {
      success: false,
      error: "Too many verification codes requested. Try again in an hour.",
    };
  }
  const latestCode = recentCodes?.[0];
  if (
    latestCode &&
    Date.now() - new Date(latestCode.created_at).getTime() < 60_000
  ) {
    return {
      success: false,
      error: "Wait one minute before requesting another verification code.",
    };
  }

  const { error: invalidateError } = await admin
    .from("payout_method_verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("host_id", user.id)
    .is("used_at", null);
  if (invalidateError) {
    console.error("Previous payout verification codes could not be invalidated:", invalidateError.message);
    return { success: false, error: "Unable to start email verification." };
  }

  const challengeId = randomUUID();
  const code = randomInt(100_000, 1_000_000).toString();
  const codeHash = hashPayoutCode(user.id, payoutMethodId, challengeId, code);
  const { error: insertError } = await admin
    .from("payout_method_verification_codes")
    .insert({
      id: challengeId,
      host_id: user.id,
      payout_method_id: payoutMethodId,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  if (insertError) {
    console.error("Payout verification challenge creation failed:", insertError.message);
    return { success: false, error: "Unable to start email verification." };
  }

  try {
    await sendPayoutVerificationCode({ email, code });
  } catch (error) {
    console.error("Payout verification email failed:", error);
    await admin
      .from("payout_method_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", challengeId);
    return {
      success: false,
      error: "We could not email your verification code. Please try again later.",
    };
  }

  return {
    success: true,
    challengeId,
    maskedEmail: maskEmail(email),
  };
}

export async function verifyPayoutMethodCode(
  payoutMethodId: string,
  challengeId: string,
  inputCode: string,
): Promise<{ success: true } | { success: false; error: string }> {
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
    !/^[0-9a-f-]{36}$/i.test(payoutMethodId) ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    !/^\d{6}$/.test(inputCode)
  ) {
    return { success: false, error: "Enter the six-digit email code." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Payout verification admin client setup failed:", error);
    return { success: false, error: "Email verification is temporarily unavailable." };
  }
  const { data: challenge, error } = await admin
    .from("payout_method_verification_codes")
    .select("id, payout_method_id, code_hash, attempts, expires_at, used_at")
    .eq("id", challengeId)
    .eq("host_id", user.id)
    .eq("payout_method_id", payoutMethodId)
    .maybeSingle();
  if (error || !challenge) {
    console.error("Payout verification challenge lookup failed:", error?.message);
    return { success: false, error: "This verification code is unavailable." };
  }
  if (challenge.used_at) {
    return { success: false, error: "This verification code has already been used." };
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await admin
      .from("payout_method_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", challengeId);
    return { success: false, error: "This code has expired. Request a new one." };
  }
  if (challenge.attempts >= 5) {
    return {
      success: false,
      error: "Too many incorrect attempts. Request a new verification code.",
    };
  }

  const expectedHash = hashPayoutCode(
    user.id,
    payoutMethodId,
    challengeId,
    inputCode,
  );
  const valid =
    challenge.code_hash.length === expectedHash.length &&
    timingSafeEqual(
      Buffer.from(challenge.code_hash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  if (!valid) {
      const { error: attemptError } = await admin.rpc(
        "increment_payout_verification_attempt",
        {
          verification_id: challengeId,
          verification_host_id: user.id,
        },
      );
    if (attemptError) {
      console.error("Payout verification attempt update failed:", attemptError.message);
    }
    return { success: false, error: "That code is incorrect. Check it and try again." };
  }

  const verifiedAt = new Date().toISOString();
  const { data: consumedCode, error: consumeError } = await admin
    .from("payout_method_verification_codes")
    .update({ used_at: verifiedAt })
    .eq("id", challengeId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (consumeError || !consumedCode) {
    console.error("Payout verification code consumption failed:", consumeError?.message);
    return {
      success: false,
      error: "This verification code has already been used. Request a new one.",
    };
  }

  const { data: updatedMethod, error: updateError } = await admin
    .from("payout_methods")
    .update({ verification_status: "verified", verified_at: verifiedAt })
    .eq("id", payoutMethodId)
    .eq("host_id", user.id)
    .eq("method_type", "mpesa")
    .select("id")
    .maybeSingle();
  if (updateError || !updatedMethod) {
    console.error("Payout method verification update failed:", updateError?.message);
    return { success: false, error: "Unable to verify this payout method." };
  }

  revalidatePath("/host/withdrawals");
  return { success: true };
}

export async function verifyBankPayoutMethod(
  payoutMethodId: string,
): Promise<{ success: true } | { success: false; error: string }> {
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
  if (!/^[0-9a-f-]{36}$/i.test(payoutMethodId)) {
    return { success: false, error: "Choose a valid payout method." };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Paystack payout account verification failed: missing secret key.");
    return {
      success: false,
      error: "Bank account verification is temporarily unavailable.",
    };
  }

  const admin = createAdminClient();
  const [{ data: method, error: methodError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin
        .from("payout_methods")
        .select("id, bank_code, bank_name, account_number, method_type")
        .eq("id", payoutMethodId)
        .eq("host_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
  if (
    methodError ||
    !method ||
    method.method_type !== "bank" ||
    !method.bank_code ||
    !method.account_number
  ) {
    console.error("Bank payout method lookup failed:", methodError?.message);
    return { success: false, error: "The bank payout method is unavailable." };
  }
  if (profileError || !profile?.full_name) {
    console.error("Bank payout owner profile lookup failed:", profileError?.message);
    return { success: false, error: "Unable to verify your registered name." };
  }

  const resolveUrl = new URL("https://api.paystack.co/bank/resolve");
  resolveUrl.searchParams.set("account_number", method.account_number);
  resolveUrl.searchParams.set("bank_code", method.bank_code);
  let response: Response;
  try {
    response = await fetch(resolveUrl, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Paystack bank account re-verification request failed:", error);
    return { success: false, error: "Unable to verify this bank account right now." };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { success: false, error: "Account verification returned an invalid response." };
  }
  const resolvedData =
    isRecord(body) && isRecord(body.data) ? body.data : null;
  if (
    !response.ok ||
    !isRecord(body) ||
    body.status !== true ||
    !resolvedData ||
    typeof resolvedData.account_name !== "string" ||
    !hasMatchingName(profile.full_name, resolvedData.account_name)
  ) {
    return {
      success: false,
      error:
        "The bank account name does not match your registered profile name, or the account could not be resolved.",
    };
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("payout_methods")
    .update({
      account_name: resolvedData.account_name.trim().slice(0, 100),
      verification_status: "verified",
      verified_at: verifiedAt,
    })
    .eq("id", method.id)
    .eq("host_id", user.id);
  if (updateError) {
    console.error("Bank payout verification update failed:", updateError.message);
    return { success: false, error: "Unable to update the bank verification status." };
  }

  revalidatePath("/host/withdrawals");
  return { success: true };
}

function hashPayoutCode(
  hostId: string,
  payoutMethodId: string,
  challengeId: string,
  code: string,
): string {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("A server-side secret is required to hash payout codes.");
  }
  return createHmac("sha256", secret)
    .update(`${hostId}:${payoutMethodId}:${challengeId}:${code}`)
    .digest("hex");
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "your email";
  return `${localPart[0]}***@${domain}`;
}

function hasMatchingName(profileName: string, bankName: string): boolean {
  const normalizeTokens = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length > 1) ?? [];
  const profileTokens = new Set(normalizeTokens(profileName));
  return normalizeTokens(bankName).some((token) => profileTokens.has(token));
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
  if (method.verification_status !== "verified") {
    return {
      success: false,
      error: "Verify this payout method before requesting a withdrawal.",
    };
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

  revalidatePath("/host/withdrawals");
  revalidatePath("/admin/withdrawals");

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
      "Your request is recorded, but the admin email notification could not be sent. Admins can still see it on the withdrawals page.";
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

  revalidatePath("/admin/withdrawals");
  revalidatePath("/host/withdrawals");
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
