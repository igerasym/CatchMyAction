/**
 * Find Me matches picked by a visitor who is not signed in yet. Kept per session in
 * sessionStorage (this tab only) so the highlights survive the login round trip, then
 * claimed once the visitor is signed in.
 */

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const MAX_IDS = 500;

export function pendingMatchesKey(sessionId: string): string {
  return `cma-findme-${sessionId}`;
}

export function readPendingMatches(storage: KV | null | undefined, sessionId: string): string[] {
  if (!storage) return [];
  try {
    const raw = JSON.parse(storage.getItem(pendingMatchesKey(sessionId)) || "[]");
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0))).slice(0, MAX_IDS);
  } catch {
    return [];
  }
}

export function savePendingMatches(storage: KV | null | undefined, sessionId: string, ids: string[]): void {
  if (!storage) return;
  try {
    const clean = Array.from(new Set(ids.filter((x) => typeof x === "string" && x.length > 0))).slice(0, MAX_IDS);
    if (clean.length) storage.setItem(pendingMatchesKey(sessionId), JSON.stringify(clean));
    else storage.removeItem(pendingMatchesKey(sessionId));
  } catch {}
}

export function clearPendingMatches(storage: KV | null | undefined, sessionId: string): void {
  if (!storage) return;
  try {
    storage.removeItem(pendingMatchesKey(sessionId));
  } catch {}
}

/** sessionStorage when available (private mode / SSR safe). */
export function browserSessionStorage(): KV | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}
