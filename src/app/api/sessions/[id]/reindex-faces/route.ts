import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, verifySessionOwner } from "@/lib/auth-helpers";
import { deleteFaceCollection, indexFacesInPhoto } from "@/lib/rekognition";

/** POST /api/sessions/:id/reindex-faces — re-index all faces in a session */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  // Delete old collection and re-create
  await deleteFaceCollection(params.id);

  const photos = await prisma.photo.findMany({
    where: { sessionId: params.id },
    select: { id: true, originalKey: true },
  });

  let indexed = 0;
  for (const photo of photos) {
    const faces = await indexFacesInPhoto(params.id, photo.id, photo.originalKey);
    if (faces > 0) indexed++;
  }

  return NextResponse.json({ total: photos.length, indexed, message: `Indexed faces in ${indexed}/${photos.length} photos` });
}
