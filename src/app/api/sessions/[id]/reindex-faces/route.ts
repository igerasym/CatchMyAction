import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, verifySessionOwner } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { moveSessionFaces } from "@/lib/face-index";

/**
 * POST /api/sessions/:id/reindex-faces — rebuild a session's faces in the collection it belongs to (its spot's).
 * Costs one Rekognition IndexFaces call per photo, so it is limited per session.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }
  if (!rateLimit(`reindex:${params.id}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Re-indexing this session too often. Try again in a while." }, { status: 429 });
  }

  const { photos, indexed } = await moveSessionFaces(params.id);
  return NextResponse.json({ total: photos, indexed, message: `Indexed faces in ${indexed}/${photos} photos` });
}
