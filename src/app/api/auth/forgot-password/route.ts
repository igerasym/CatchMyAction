import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** POST /api/auth/forgot-password — send password reset email */
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success (don't reveal if email exists)
  if (!user) return NextResponse.json({ sent: true });

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: token } as any,
  });

  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your CatchMyActions password",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #333;">Reset your password</h2>
        <p style="color: #666;">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        <p style="color: #999; font-size: 13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  return NextResponse.json({ sent: true });
}
