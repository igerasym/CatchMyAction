/** Each upload gets its own key; CloudFront ignores query strings, so reusing one key serves stale avatars. */
export function avatarKey(userId: string, now: number = Date.now()): string {
  return `avatars/${userId}-${now}.jpg`;
}

/**
 * The S3 key behind a stored avatar URL, or null when it isn't one of this user's own avatar files
 * (external URL, someone else's file, no avatar). Guards deletion against arbitrary keys.
 */
export function avatarKeyFromUrl(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  let path: string;
  try {
    path = new URL(url, "http://placeholder.invalid").pathname;
  } catch {
    return null;
  }
  const idx = path.indexOf("avatars/");
  if (idx === -1) return null;
  const key = path.slice(idx);
  const name = key.slice("avatars/".length);
  const own = name === `${userId}.jpg` || (name.startsWith(`${userId}-`) && name.endsWith(".jpg") && !name.includes("/"));
  return own ? key : null;
}
