/**
 * Session days for the /sessions date filter. Session.date is saved as `new Date("YYYY-MM-DD")`,
 * i.e. UTC midnight, so the UTC calendar day is the day the photographer picked.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" if `raw` is a real calendar day, else null (safe for untrusted ?date=). */
export function parseDay(raw: string | null | undefined): string | null {
  if (!raw || !DAY_RE.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw ? raw : null;
}

/** UTC calendar day of an ISO timestamp, or null if it can't be parsed. */
export function sessionDay(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function filterByDay<T extends { date: string }>(sessions: T[], day: string | null): T[] {
  if (!day) return sessions;
  return sessions.filter((s) => sessionDay(s.date) === day);
}

/** Query string with `date` set or removed, other params kept. Returns "" or "?a=b". */
export function withDateParam(search: string, day: string | null): string {
  const q = new URLSearchParams(search);
  if (day) q.set("date", day);
  else q.delete("date");
  const s = q.toString();
  return s ? `?${s}` : "";
}
