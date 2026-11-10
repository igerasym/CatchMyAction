/**
 * Selfie search across every published session (homepage "Find my photos").
 * Pure rules, kept apart from Rekognition and Prisma so they can be unit-tested.
 */

/** Each searched session is one paid Rekognition call, so the number searched per request is capped (newest first). */
export const MAX_SESSIONS_SEARCHED = 40;
/** Same bar as the per-session search. */
export const MATCH_THRESHOLD = 80;
/** From this similarity a match is pre-ticked as "this is me" (the person confirms the rest). */
export const STRONG_MATCH = 90;
export const GLOBAL_FIND_ME_WINDOW_MS = 60 * 60 * 1000;

/**
 * Session ids the visitor chose to search (the sessions around the place they picked), as a comma separated list.
 * Cleaned and capped: the server still only searches published sessions, so this never widens access, only cost.
 */
export function parseSessionIds(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{8,40}$/.test(s));
  return Array.from(new Set(ids)).slice(0, MAX_SESSIONS_SEARCHED);
}

export interface RateRule {
  key: string;
  max: number;
}

/**
 * One global search costs up to MAX_SESSIONS_SEARCHED Rekognition calls, so it gets its own, tighter buckets than
 * the per-session search: 6/h per account, 3/h per IP when anonymous, 10/h per IP for everyone.
 */
export function globalFindMeRateRules(userId: string | null, ip: string): RateRule[] {
  const first: RateRule = userId
    ? { key: `findme-all:u:${userId}`, max: 6 }
    : { key: `findme-all:anon:ip:${ip}`, max: 3 };
  return [first, { key: `findme-all:ip:${ip}`, max: 10 }];
}

export interface SessionSearch {
  sessionId: string;
  matches: { photoId: string; similarity: number }[];
}

export interface PhotoInfo {
  sessionId: string;
  thumbnailUrl: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  location: string;
  date: string; // ISO
}

export interface GlobalMatchSession extends SessionInfo {
  matches: { photoId: string; similarity: number; thumbnailUrl: string }[];
  best: number;
}

/**
 * Turn per-session Rekognition results into the list the page shows: only photos that still exist and belong to
 * the session they were found in (a stale face for a deleted photo is dropped), sessions with the strongest match
 * first, the most recent first among equals.
 */
export function buildGlobalResults(
  searches: SessionSearch[],
  sessions: Map<string, SessionInfo>,
  photos: Map<string, PhotoInfo>
): GlobalMatchSession[] {
  const out: GlobalMatchSession[] = [];
  for (const s of searches) {
    const info = sessions.get(s.sessionId);
    if (!info) continue;
    const matches = s.matches
      .map((m) => {
        const p = photos.get(m.photoId);
        return p && p.sessionId === s.sessionId ? { ...m, thumbnailUrl: p.thumbnailUrl } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.similarity - a.similarity);
    if (matches.length === 0) continue;
    out.push({ ...info, matches, best: matches[0].similarity });
  }
  return out.sort((a, b) => b.best - a.best || b.date.localeCompare(a.date));
}

/**
 * A shared spot collection returns matches from every session at the spot, tagged only with the photo id. Sort them
 * into per-session searches, keeping the best similarity per photo, and keep only the sessions that were asked for.
 */
export function groupMatchesBySession(
  matches: { photoId: string; similarity: number }[],
  photoSession: Map<string, string>,
  wanted: Set<string>
): SessionSearch[] {
  const best = new Map<string, { photoId: string; similarity: number }>();
  for (const m of matches) {
    const sid = photoSession.get(m.photoId);
    if (!sid || !wanted.has(sid)) continue;
    const prev = best.get(m.photoId);
    if (!prev || m.similarity > prev.similarity) best.set(m.photoId, m);
  }
  const bySession = new Map<string, SessionSearch>();
  for (const m of Array.from(best.values())) {
    const sid = photoSession.get(m.photoId)!;
    const entry = bySession.get(sid) ?? { sessionId: sid, matches: [] };
    entry.matches.push(m);
    bySession.set(sid, entry);
  }
  return Array.from(bySession.values());
}

/** Run `fn` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
