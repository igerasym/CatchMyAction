import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** POST /api/photos/claim — claim "that's me" on photos */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { photoIds } = await req.json();

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "photoIds required" }, { status: 400 });
  }

  // Upsert claims (ignore duplicates)
  let claimed = 0;
  for (const photoId of photoIds) {
    try {
      await (prisma as any).photoClaim.upsert({
        where: { userId_photoId: { userId, photoId } },
        create: { userId, photoId },
        update: {},
      });
      claimed++;
    } catch {
      // Skip invalid photoIds
    }
  }

  return NextResponse.json({ claimed });
}
