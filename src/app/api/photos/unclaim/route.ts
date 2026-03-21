import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

/** POST /api/photos/unclaim — remove "that's me" claim */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const { photoId } = await req.json();
  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  try {
    await (prisma as any).photoClaim.delete({
      where: { userId_photoId: { userId: user.id, photoId } },
    });
  } catch {
    // Already removed or doesn't exist
  }

  return NextResponse.json({ unclaimed: true });
}
