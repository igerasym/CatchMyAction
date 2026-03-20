import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "PHOTOGRAPHER";
  avatarUrl: string | null;
}

/** Get authenticated user or return 401 response */
export async function getAuthUser(): Promise<AuthUser | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user as AuthUser;
}

/** Verify the authenticated user owns a session */
export async function verifySessionOwner(sessionId: string, userId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { photographerId: true },
  });
  return session?.photographerId === userId;
}
