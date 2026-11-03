/**
 * Validate a post-login redirect target. Only same-site paths are allowed
 * ("/sessions/x?findme=1"), never absolute or protocol-relative URLs — prevents open redirects.
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

/** Build a /login link that returns to `path` after signing in. */
export function loginHref(path: string): string {
  return `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl(path))}`;
}
