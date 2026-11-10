/**
 * Keeps the Rekognition face index in step with sessions and photos (server only).
 * Where faces live is decided in face-collections.ts: one collection per catalogue spot, else one per session.
 */
import { prisma } from "@/lib/db";
import { currentCollection, isSharedCollection, targetCollection } from "@/lib/face-collections";
import { mapPool } from "@/lib/global-find-me";
import { deleteFaceCollection, deleteFaces, deleteFacesForPhotoByScan, indexFacesInPhoto } from "@/lib/rekognition";

type SessionRef = { id: string; faceCollection: string | null };

/** Index a freshly uploaded photo into its session's collection and remember the FaceIds. Never throws. */
export async function indexPhotoFaces(photo: { id: string; originalKey: string }, session: SessionRef): Promise<void> {
  try {
    const ids = await indexFacesInPhoto(currentCollection(session), photo.id, photo.originalKey);
    if (ids.length > 0) await prisma.photo.update({ where: { id: photo.id }, data: { faceIds: ids } });
  } catch (err: any) {
    console.error(`Face indexing failed for photo ${photo.id}:`, err?.message);
  }
}

/** Remove one photo's faces from the index. Never throws. */
export async function removePhotoFaces(photo: { id: string; faceIds: string[] }, session: SessionRef): Promise<void> {
  try {
    const collection = currentCollection(session);
    if (photo.faceIds.length > 0) await deleteFaces(collection, photo.faceIds);
    else await deleteFacesForPhotoByScan(collection, photo.id); // legacy photo: its own small collection
  } catch (err: any) {
    console.error(`Removing faces of photo ${photo.id} failed:`, err?.message);
  }
}

/** Remove a whole session's faces: its own collection goes, a shared spot collection only loses these faces. */
export async function removeSessionFaces(session: SessionRef, photos: { faceIds: string[] }[]): Promise<void> {
  try {
    const collection = currentCollection(session);
    if (isSharedCollection(collection)) await deleteFaces(collection, photos.flatMap((p) => p.faceIds));
    else await deleteFaceCollection(collection);
  } catch (err: any) {
    console.error(`Removing faces of session ${session.id} failed:`, err?.message);
  }
}

/**
 * (Re)build a session's faces in the collection it belongs in: new faces first, then the old ones go, so the session
 * never disappears from search in between. Used when a session's spot changes and to move old sessions to spot
 * collections. Costs one IndexFaces call (about $0.001) per photo.
 */
export async function moveSessionFaces(sessionId: string): Promise<{ photos: number; indexed: number; collection: string }> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, spotId: true, faceCollection: true },
  });
  if (!session) return { photos: 0, indexed: 0, collection: "" };

  const from = currentCollection(session);
  const to = targetCollection(session);
  const photos = await prisma.photo.findMany({
    where: { sessionId },
    select: { id: true, originalKey: true, faceIds: true },
    orderBy: { createdAt: "asc" },
  });

  let indexed = 0;
  await mapPool(photos, 3, async (p) => {
    const ids = await indexFacesInPhoto(to, p.id, p.originalKey);
    await prisma.photo.update({ where: { id: p.id }, data: { faceIds: ids } });
    if (ids.length > 0) indexed++;
  });
  await prisma.session.update({ where: { id: sessionId }, data: { faceCollection: to } });

  // Old faces: the whole legacy collection, or only this session's faces out of a shared one
  if (from !== to) {
    if (isSharedCollection(from)) await deleteFaces(from, photos.flatMap((p) => p.faceIds));
    else await deleteFaceCollection(from);
  } else {
    await deleteFaces(to, photos.flatMap((p) => p.faceIds)); // forced rebuild in place: drop the previous copies
  }
  return { photos: photos.length, indexed, collection: to };
}
