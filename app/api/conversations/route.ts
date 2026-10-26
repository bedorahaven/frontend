import { NextResponse } from "next/server";
import { createPropertyInquiry } from "@/lib/api/conversations";

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
  const guestName =
    typeof body.guest_name === "string" ? body.guest_name.trim() : "";
  const guestEmail =
    typeof body.guest_email === "string"
      ? body.guest_email.trim().toLowerCase()
      : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (
    !UUID_PATTERN.test(propertyId) ||
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

  const result = await createPropertyInquiry({
    propertyId,
    guestName: guestName || null,
    guestEmail,
    content,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, saved: result.saved },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
