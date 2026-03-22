import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/validation";

/** POST /api/auth/reset-password — set new password with token */
export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });

  const pwError = validatePassword(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const user = await (prisma.user as any).findFirst({ where: { verifyToken: token } });
  if (!user) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, verifyToken: null, emailVerified: true } as any,
  });

  return NextResponse.json({ reset: true });
}
