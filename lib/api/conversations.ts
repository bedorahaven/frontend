import "server-only";

import { sendPropertyInquiryEmails } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PropertyInquiryInput {
  propertyId: string;
  guestName: string | null;
  guestEmail: string;
  content: string;
}

type PropertyInquiryResult =
  | { success: true }
  | {
      success: false;
      status: 404 | 502 | 503;
      error: string;
      saved?: boolean;
    };

export async function createPropertyInquiry(
  input: PropertyInquiryInput,
): Promise<PropertyInquiryResult> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Property inquiry storage is not configured:", error);
    return {
      success: false,
      status: 503,
      error: "Messaging is temporarily unavailable. Please try again later.",
    };
  }

  const { data: property, error: propertyError } = await admin
    .from("properties")
    .select("id, title, host_id")
    .eq("id", input.propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error("Property inquiry lookup failed:", propertyError.message);
    return {
      success: false,
      status: 503,
      error: "Unable to contact this host right now.",
    };
  }
  if (!property) {
    return {
      success: false,
      status: 404,
      error: "This property is no longer available.",
    };
  }

  const { data: host, error: hostError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", property.host_id)
    .maybeSingle();

  if (hostError) {
    console.error("Property host lookup failed:", hostError.message);
    return {
      success: false,
      status: 503,
      error: "Unable to contact this host right now.",
    };
  }
  if (!host?.email || !EMAIL_PATTERN.test(host.email)) {
    return {
      success: false,
      status: 503,
      error: "This host does not have an available email address.",
    };
  }

  const session = await createClient();
  const {
    data: { user },
    error: userError,
  } = await session.auth.getUser();

  if (userError) {
    console.error("Property inquiry guest lookup failed:", userError.message);
    return {
      success: false,
      status: 503,
      error: "Unable to submit your message right now.",
    };
  }

  let guestId: string | null = null;
  if (user) {
    const { data: guestProfile, error: guestProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (guestProfileError) {
      console.error(
        "Property inquiry guest profile lookup failed:",
        guestProfileError.message,
      );
      return {
        success: false,
        status: 503,
        error: "Unable to submit your message right now.",
      };
    }
    guestId = guestProfile?.id ?? null;
  }

  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .insert({
      property_id: property.id,
      booking_id: null,
      guest_id: guestId,
      host_id: host.id,
      guest_email: input.guestEmail,
      guest_name: input.guestName,
    })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    console.error(
      "Property inquiry conversation could not be saved:",
      conversationError?.message ?? "No conversation was returned.",
    );
    return {
      success: false,
      status: 503,
      error: "Your message could not be saved. Please try again.",
    };
  }

  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: guestId,
    content: input.content,
  });

  if (messageError) {
    console.error(
      "Property inquiry message could not be saved:",
      messageError.message,
    );
    const { error: cleanupError } = await admin
      .from("conversations")
      .delete()
      .eq("id", conversation.id);
    if (cleanupError) {
      console.error(
        "Empty property inquiry conversation cleanup failed:",
        cleanupError.message,
      );
    }
    return {
      success: false,
      status: 503,
      error: "Your message could not be saved. Please try again.",
    };
  }

  try {
    await sendPropertyInquiryEmails({
      hostEmail: host.email,
      hostName: host.full_name || "the host",
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      propertyName: property.title || "this property",
      message: input.content,
    });
  } catch (error) {
    console.error("Property inquiry email delivery failed:", error);
    return {
      success: false,
      status: 502,
      error:
        "Your message was saved, but email delivery could not be confirmed. Please try again later.",
      saved: true,
    };
  }

  return { success: true };
}
