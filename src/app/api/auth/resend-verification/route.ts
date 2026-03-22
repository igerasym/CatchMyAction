import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

/** POST /api/auth/resend-verification — resend verification email */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
  }) as any;

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ already: true });

  const verifyToken = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken } as any,
  });

  await sendVerificationEmail(user.email, verifyToken, user.name);

  return NextResponse.json({ sent: true });
}
