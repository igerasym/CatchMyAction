import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** GET /api/auth/verify?token=xxx — verify email address */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid-token`);
  }

  const user = await (prisma.user as any).findFirst({
    where: { verifyToken: token },
  });

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid-token`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null } as any,
  });

  return NextResponse.redirect(`${APP_URL}/?verified=true`);
}
