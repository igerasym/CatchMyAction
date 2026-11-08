/** Rate limits for the selfie search. Every search is a paid Rekognition call. */

export const FIND_ME_WINDOW_MS = 60 * 60 * 1000;

export interface RateRule {
  key: string;
  max: number;
}

/**
 * Buckets a find-me request must pass, most specific first.
 * - signed in: 15/h per account
 * - anonymous: 8/h per IP (stricter, no account to throttle)
 * - everyone: 30/h per IP (shared by all visitors on that IP)
 */
export function findMeRateRules(userId: string | null, ip: string): RateRule[] {
  const first: RateRule = userId
    ? { key: `findme:u:${userId}`, max: 15 }
    : { key: `findme:anon:ip:${ip}`, max: 8 };
  return [first, { key: `findme:ip:${ip}`, max: 30 }];
}

/** Published sessions are searchable by anyone; drafts only by their photographer. */
export function canSearchSession(
  session: { published: boolean; photographerId: string } | null,
  viewerId: string | null
): boolean {
  if (!session) return false;
  return session.published || (viewerId !== null && session.photographerId === viewerId);
}
