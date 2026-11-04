/**
 * Public renditions of a photo (watermarked preview, thumbnail, optional clean "featured" version).
 *
 * Rebuilt renditions are written under NEW keys (a version suffix) and the DB row is repointed, so
 * CloudFront/browser caches of the old URL can't keep serving the old image; the old objects are then
 * deleted.
 */
import { prisma } from "@/lib/db";
import { createFeatured, createPreview, createThumbnail } from "@/lib/image-processing";
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

/**
 * Re-render preview + thumbnail (+ featured, if set) for every photo in a session from the originals:
 * applies the current watermark, size and EXIF-rotation rules to photos uploaded before them.
 */
export async function rebuildSessionRenditions(sessionId: string): Promise<{ done: number; failed: number }> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { photographer: { select: { name: true } } },
  });
  const credit = session?.photographer.name ?? null;
  const photos = await prisma.photo.findMany({
    where: { sessionId },
    select: { id: true, originalKey: true, previewKey: true, thumbnailKey: true, featuredKey: true },
    orderBy: { createdAt: "asc" },
  });

  let done = 0;
  let failed = 0;
  for (const p of photos) {
    try {
      const original = await getObjectBuffer(BUCKET_ORIGINALS, p.originalKey);
      const v = version();
      const previewKey = `sessions/${sessionId}/previews/${p.id}-${v}.jpg`;
      const thumbnailKey = `sessions/${sessionId}/thumbnails/${p.id}-${v}.jpg`;
      const featuredKey = p.featuredKey ? `sessions/${sessionId}/featured/${p.id}-${v}.jpg` : null;

      const [preview, thumb, featured] = await Promise.all([
        createPreview(original, { credit }),
        createThumbnail(original),
        featuredKey ? createFeatured(original, { credit }) : Promise.resolve(null),
      ]);
      await Promise.all([
        putObject(BUCKET_PREVIEWS, previewKey, preview.buffer),
        putObject(BUCKET_PREVIEWS, thumbnailKey, thumb),
        featuredKey && featured ? putObject(BUCKET_PREVIEWS, featuredKey, featured) : Promise.resolve(),
      ]);
      await prisma.photo.update({ where: { id: p.id }, data: { previewKey, thumbnailKey, featuredKey } });
      await Promise.all([removeQuietly(p.previewKey), removeQuietly(p.thumbnailKey), removeQuietly(p.featuredKey)]);
      done++;
    } catch (e: any) {
      failed++;
      console.error(`rebuild renditions failed for photo ${p.id}:`, e?.message);
    }
  }
  console.log(`rebuild renditions ${sessionId}: ${done} ok, ${failed} failed`);
  return { done, failed };
}
