import "server-only";

import { sendPropertyInquiryEmails } from "@/lib/email";
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
  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
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

  const { data: host, error: hostError } = await supabase
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

  const { error: inquiryError } = await supabase.rpc(
    "create_property_inquiry",
    {
      p_property_id: property.id,
      p_guest_email: input.guestEmail,
      p_guest_name: input.guestName,
      p_content: input.content,
    },
  );

  if (inquiryError) {
    if (inquiryError.code === "P0002") {
      return {
        success: false,
        status: 404,
        error: "This property is no longer available.",
      };
    }
    console.error("Property inquiry could not be saved:", inquiryError.message);
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
