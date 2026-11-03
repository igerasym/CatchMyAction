import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { createResetToken } from "@/lib/reset-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { validateEmail } from "@/lib/validation";

/** POST /api/auth/forgot-password — send password reset email */
export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {}
  if (!email || !validateEmail(email)) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Throttle per IP and per address (stops mail-bombing someone's inbox)
  if (!rateLimit(`forgot:ip:${clientIp(req)}`, 10, 60 * 60 * 1000) || !rateLimit(`forgot:em:${email}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ sent: true }); // same answer either way — don't reveal anything
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, passwordHash: true },
  });

  // Always the same response (don't reveal whether the email exists); send in the background so
  // response time doesn't reveal it either.
  if (user?.passwordHash) {
    const token = createResetToken(user.id, user.passwordHash);
    sendPasswordResetEmail(user.email, token).catch((err) => console.error("Reset email error:", err));
  }

  return NextResponse.json({ sent: true });
}
