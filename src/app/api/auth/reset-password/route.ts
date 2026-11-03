import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/validation";
import { parseResetToken, verifyResetToken } from "@/lib/reset-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** POST /api/auth/reset-password — set new password with a signed, expiring token */
export async function POST(req: NextRequest) {
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });

  const pwError = validatePassword(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const parsed = parseResetToken(token);
  const user = parsed
    ? await prisma.user.findUnique({ where: { id: parsed.userId }, select: { id: true, passwordHash: true } })
    : null;
  if (!user || !user.passwordHash || !verifyResetToken(token, user.passwordHash)) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    // Clicking a link sent to the inbox proves email ownership
    data: { passwordHash, emailVerified: true },
  });

  return NextResponse.json({ reset: true });
}
