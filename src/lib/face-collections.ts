/**
 * Which Rekognition collection holds a session's faces. Pure, so the rules are testable.
 *
 * Sessions at a catalogue spot share one collection ("spot-<spotId>"): one search covers the whole spot, no matter how
 * many sessions it has. Sessions without a spot keep their own ("session-<id>", also the original layout, which is
 * what a session that was never moved still uses). Rekognition allows [a-zA-Z0-9_.-] in a collection id.
 */

export const legacyCollection = (sessionId: string) => `session-${sessionId}`;

/** Where a session's faces SHOULD live (used when indexing or moving them). */
export function targetCollection(s: { id: string; spotId: string | null }): string {
  return s.spotId ? `spot-${s.spotId}` : legacyCollection(s.id);
}

/** Where a session's faces ARE right now: the recorded collection, or the legacy per-session one. */
export function currentCollection(s: { id: string; faceCollection: string | null }): string {
  return s.faceCollection ?? legacyCollection(s.id);
}

/** Distinct collections to search for a set of sessions (many sessions often share one), in first-seen order. */
export function collectionsToSearch(sessions: { id: string; faceCollection: string | null }[]): string[] {
  return Array.from(new Set(sessions.map(currentCollection)));
}

/** A collection shared by several sessions must never be deleted whole when one session goes away. */
export function isSharedCollection(collectionId: string): boolean {
  return collectionId.startsWith("spot-");
}
