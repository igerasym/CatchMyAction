import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const CONTACT_EMAIL = "hello@catchmyactions.com";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`contact:${ip}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
  }

  const { name, email, subject, message } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  try {
    // Send via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "CatchMyAction <noreply@catchmyactions.com>",
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Contact] ${subject}: ${name}`,
      text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error("Contact email error:", err.message);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
