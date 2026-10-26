import { after, NextResponse } from "next/server";
import { sendPropertyChatMessageEmails } from "@/lib/email";
import { sendPropertyChatMessage } from "@/lib/api/conversations";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 10_000) {
    return NextResponse.json(
      { error: "The message is too large to submit." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const propertyId =
    typeof body.property_id === "string" ? body.property_id : "";
  const conversationId =
    typeof body.conversation_id === "string" ? body.conversation_id : null;
  const accessToken =
    typeof body.access_token === "string" ? body.access_token : "";
  const guestName =
    typeof body.guest_name === "string" ? body.guest_name.trim() : "";
  const guestEmail =
    typeof body.guest_email === "string"
      ? body.guest_email.trim().toLowerCase()
      : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (
    !UUID_PATTERN.test(propertyId) ||
    (conversationId !== null && !UUID_PATTERN.test(conversationId)) ||
    !UUID_PATTERN.test(accessToken) ||
    !EMAIL_PATTERN.test(guestEmail) ||
    guestEmail.length > 254 ||
    guestName.length > 100 ||
    content.length < 1 ||
    content.length > 2000
  ) {
    return NextResponse.json(
      { error: "Enter a valid email and a message up to 2,000 characters." },
      { status: 400 },
    );
  }

  const result = await sendPropertyChatMessage({
    propertyId,
    conversationId,
    accessToken,
    guestName: guestName || null,
    guestEmail,
    content,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  after(async () => {
    try {
      await sendPropertyChatMessageEmails(result.email);
    } catch (error) {
      console.error("Property chat email delivery failed:", error);
    }
  });

  return NextResponse.json(
    { conversation_id: result.conversationId },
    { status: 200 },
  );
}
