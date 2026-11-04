import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, verifySessionOwner } from "@/lib/auth-helpers";
import { rebuildSessionRenditions } from "@/lib/renditions";

// One rebuild per session at a time (per server process)
const running = new Set<string>();

/**
 * POST /api/sessions/:id/rebuild-previews — owner only. Re-renders previews/thumbnails from the
 * originals with the current watermark + EXIF rotation. Runs in the background (a 200-photo session
 * takes minutes); the response returns immediately.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;
  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }
  if (running.has(params.id)) {
    return NextResponse.json({ error: "Previews for this session are already being rebuilt" }, { status: 409 });
  }

  const total = await prisma.photo.count({ where: { sessionId: params.id } });
  running.add(params.id);
  rebuildSessionRenditions(params.id)
    .catch((e) => console.error("rebuild previews failed:", e?.message))
    .finally(() => running.delete(params.id));

  return NextResponse.json({ started: true, total }, { status: 202 });
}
