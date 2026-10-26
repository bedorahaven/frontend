import { NextResponse } from "next/server";
import { sendHostBookingNotification } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

  const reference = typeof body.reference === "string" ? body.reference : "";
  const propertyId = typeof body.property_id === "string" ? body.property_id : "";

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
  const customer = transaction.customer;
  const isSuccessful =
    transaction.status === "success" &&
    transaction.reference === reference &&
    transaction.currency === "KES" &&
    typeof transaction.amount === "number" &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    isRecord(metadata) &&
    metadata.property_id === propertyId &&
    typeof metadata.check_in === "string" &&
    typeof metadata.check_out === "string" &&
    typeof metadata.total_nights === "number" &&
    typeof metadata.guests_count === "number" &&
    typeof metadata.accommodation_total === "number" &&
    Number.isSafeInteger(metadata.accommodation_total) &&
    typeof metadata.service_fee === "number" &&
    Number.isSafeInteger(metadata.service_fee) &&
    typeof metadata.tax_fee === "number" &&
    Number.isSafeInteger(metadata.tax_fee) &&
    typeof metadata.total_amount === "number" &&
    Number.isSafeInteger(metadata.total_amount) &&
    metadata.accommodation_total + metadata.service_fee + metadata.tax_fee ===
      metadata.total_amount &&
    transaction.amount === metadata.total_amount * 100 &&
    isRecord(customer) &&
    typeof customer.email === "string";

  if (!isSuccessful) {
    return NextResponse.json(
      { error: "This payment was not successful for this property." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Card payment finalization is not configured:", error);
    return NextResponse.json(
      {
        verified: true,
        booking_confirmed: false,
        error:
          "Paystack received your payment, but booking confirmation is temporarily unavailable. Please contact support with your payment reference.",
      },
      { status: 503 },
    );
  }

  const { data: finalizedData, error: finalizeError } = await admin.rpc(
    "finalize_paystack_booking",
    {
      p_reference: reference,
      p_property_id: propertyId,
      p_check_in: metadata.check_in,
      p_check_out: metadata.check_out,
      p_total_nights: metadata.total_nights,
      p_guests_count: metadata.guests_count,
      p_amount_minor: transaction.amount,
      p_guest_email: customer.email,
      p_callback_metadata: {
        provider: "paystack",
        reference,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paid_at: transaction.paid_at ?? null,
        channel: transaction.channel ?? null,
      },
    },
  );

  if (
    finalizeError ||
    !isRecord(finalizedData) ||
    typeof finalizedData.booking_id !== "string"
  ) {
    console.error(
      "Paystack payment was verified but booking finalization failed:",
      finalizeError?.message ?? "The database returned an invalid finalization result.",
    );
    return NextResponse.json(
      {
        verified: true,
        booking_confirmed: false,
        error:
          "Paystack received your payment, but we could not confirm the booking yet. Please contact support with your payment reference.",
      },
      { status: 503 },
    );
  }

  const { error: feePersistenceError } = await admin
    .from("bookings")
    .update({
      service_fee: metadata.service_fee,
      tax_fee: metadata.tax_fee,
    })
    .eq("id", finalizedData.booking_id);

  if (feePersistenceError) {
    console.error(
      "Verified Paystack booking fee persistence failed:",
      feePersistenceError.message,
    );
  }

  let notificationStatus: "sent" | "pending" = "pending";
  const { data: notification, error: claimError } = await admin.rpc(
    "claim_paystack_booking_notification",
    { p_reference: reference },
  );

  if (claimError) {
    console.error(
      "Could not claim host booking notification:",
      claimError.message,
    );
  } else if (isRecord(notification) && notification.claimed === true) {
    try {
      if (
        typeof notification.host_email !== "string" ||
        typeof notification.property_name !== "string" ||
        typeof notification.guest_email !== "string" ||
        typeof notification.check_in !== "string" ||
        typeof notification.check_out !== "string" ||
        typeof notification.total_nights !== "number" ||
        typeof notification.total_price !== "number"
      ) {
        throw new Error("Host notification details are incomplete.");
      }

      const emailId = await sendHostBookingNotification({
        hostEmail: notification.host_email,
        propertyName: notification.property_name,
        guestContact: notification.guest_email,
        checkIn: notification.check_in,
        checkOut: notification.check_out,
        totalNights: notification.total_nights,
        totalPrice: notification.total_price,
        paymentMethod: "paystack",
      });

      const { error: sentError } = await admin.rpc(
        "complete_paystack_booking_notification",
        { p_reference: reference, p_resend_email_id: emailId },
      );

      if (sentError) {
        console.error(
          "Host email was accepted by Resend but notification state update failed:",
          sentError.message,
        );
      } else {
        notificationStatus = "sent";
      }
    } catch (error) {
      console.error("Host booking notification delivery failed:", error);
      const { error: failureUpdateError } = await admin.rpc(
        "fail_paystack_booking_notification",
        {
          p_reference: reference,
          p_error:
            error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed.",
        },
      );
      if (failureUpdateError) {
        console.error(
          "Could not record host notification failure:",
          failureUpdateError.message,
        );
      }
    }
  } else if (
    isRecord(notification) &&
    notification.status === "sent"
  ) {
    notificationStatus = "sent";
  }

  return NextResponse.json({
    verified: true,
    amount: transaction.amount,
    currency: transaction.currency,
    booking_confirmed: true,
    settlement_warning: feePersistenceError
      ? "Your booking is confirmed, but its settlement details could not be saved. Please contact support."
      : null,
    host_notification: notificationStatus,
    account_contact: customer.email,
    notification_warning:
      notificationStatus === "pending"
        ? "Your payment and booking are confirmed. We could not send the host notification email yet."
        : null,
  });
}
