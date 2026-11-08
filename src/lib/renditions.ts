/**
 * Public renditions of a photo (watermarked preview, thumbnail, optional clean "featured" version).
 *
 * Renditions are written under NEW keys (a version suffix) and the DB row is repointed, so
 * CloudFront/browser caches of the old URL can't keep serving the old image; the old objects are then
 * deleted. (A bulk "rebuild all previews" existed until 2026-11-08 and was removed: new uploads already get the
 * current watermark and EXIF rotation. To re-render a session later, loop over its photos with createPreview /
 * createThumbnail from image-processing.ts, write each under a new key as setFeatured does, then repoint the row.)
 */
import { prisma } from "@/lib/db";
import { createFeatured } from "@/lib/image-processing";
import { BUCKET_ORIGINALS, BUCKET_PREVIEWS, deleteObject, getObjectBuffer, putObject } from "@/lib/s3";

const version = () => Date.now().toString(36);

export function featuredKeyFor(sessionId: string, photoId: string): string {
  return `sessions/${sessionId}/featured/${photoId}-${version()}.jpg`;
}

async function removeQuietly(key: string | null | undefined) {
  if (!key) return;
  await deleteObject(BUCKET_PREVIEWS, key).catch((e) => console.error("rendition delete failed:", key, e?.message));
}

/** Turn the clean showcase rendition on/off for one photo. */
export async function setFeatured(
  photo: { id: string; sessionId: string; originalKey: string; featuredKey: string | null },
  on: boolean,
  credit: string | null
): Promise<string | null> {
  if (!on) {
    await prisma.photo.update({ where: { id: photo.id }, data: { featuredKey: null } });
    await removeQuietly(photo.featuredKey);
    return null;
  }
  if (photo.featuredKey) return photo.featuredKey;
  const original = await getObjectBuffer(BUCKET_ORIGINALS, photo.originalKey);
  const key = featuredKeyFor(photo.sessionId, photo.id);
  await putObject(BUCKET_PREVIEWS, key, await createFeatured(original, { credit }));
  await prisma.photo.update({ where: { id: photo.id }, data: { featuredKey: key } });
  return key;
}
