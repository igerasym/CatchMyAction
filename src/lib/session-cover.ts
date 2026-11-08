/** Which photo represents a session in lists: the photographer's cover, else the first photo. */

export interface CoverPhoto {
  id: string;
  sessionId: string;
  thumbnailKey: string;
  previewKey?: string | null;
}

/**
 * Storage key of the session's list thumbnail.
 * `covers` holds the photos referenced by coverPhotoId; a cover is only used when it really
 * belongs to this session (coverPhotoId is a plain string column, not a relation).
 */
export function sessionThumbKey(
  session: { id: string; coverPhotoId: string | null },
  covers: Map<string, CoverPhoto>,
  firstPhoto: { thumbnailKey: string; previewKey?: string | null } | undefined
): string | null {
  const cover = session.coverPhotoId ? covers.get(session.coverPhotoId) : undefined;
  if (cover && cover.sessionId === session.id) return cover.thumbnailKey || cover.previewKey || null;
  if (firstPhoto) return firstPhoto.thumbnailKey || firstPhoto.previewKey || null;
  return null;
}
