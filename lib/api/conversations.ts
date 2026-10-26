import "server-only";

import type { sendPropertyChatMessageEmails } from "@/lib/email";
import { createClient } from "@/utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PropertyChatMessageInput {
  propertyId: string;
  conversationId: string | null;
  accessToken: string;
  guestName: string | null;
  guestEmail: string;
  content: string;
}

type PropertyChatMessageResult =
  | {
      success: true;
      conversationId: string;
      email: Parameters<typeof sendPropertyChatMessageEmails>[0];
    }
  | {
      success: false;
      status: 404 | 503;
      error: string;
    };

export async function sendPropertyChatMessage(
  input: PropertyChatMessageInput,
): Promise<PropertyChatMessageResult> {
  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, title, host_id")
    .eq("id", input.propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error("Property chat property lookup failed:", propertyError.message);
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
    console.error("Property chat host lookup failed:", hostError.message);
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

  const { data: conversationId, error: messageSaveError } = await supabase.rpc(
    "create_property_chat_message",
    {
      p_property_id: property.id,
      p_conversation_id: input.conversationId,
      p_guest_access_token: input.accessToken,
      p_guest_email: input.guestEmail,
      p_guest_name: input.guestName,
      p_content: input.content,
    },
  );

  if (messageSaveError) {
    if (messageSaveError.code === "P0002") {
      return {
        success: false,
        status: 404,
        error: "This property is no longer available.",
      };
    }
    console.error(
      "Property chat message could not be saved:",
      messageSaveError.message,
    );
    return {
      success: false,
      status: 503,
      error: "Your message could not be saved. Please try again.",
    };
  }

  if (typeof conversationId !== "string") {
    console.error("Property chat RPC did not return a conversation ID.");
    return {
      success: false,
      status: 503,
      error: "Your message could not be saved. Please try again.",
    };
  }

  return {
    success: true,
    conversationId,
    email: {
      hostEmail: host.email,
      hostName: host.full_name || "the host",
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      propertyName: property.title || "this property",
      message: input.content,
    },
  };
}
