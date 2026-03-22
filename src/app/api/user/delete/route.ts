import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/user/delete — delete account (GDPR) */
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (authUser instanceof NextResponse) return authUser;

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user || !user.passwordHash) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 403 });

  // Delete all user data
  await prisma.purchase.deleteMany({ where: { userId: user.id } });
  await (prisma as any).photoClaim.deleteMany({ where: { userId: user.id } });
  // Delete sessions and their photos if photographer
  const sessions = await prisma.session.findMany({ where: { photographerId: user.id }, select: { id: true } });
  for (const s of sessions) {
    await prisma.purchase.deleteMany({ where: { photo: { sessionId: s.id } } });
    await prisma.photo.deleteMany({ where: { sessionId: s.id } });
  }
  await prisma.session.deleteMany({ where: { photographerId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ deleted: true });
}
