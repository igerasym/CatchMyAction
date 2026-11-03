import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless password-reset tokens: `<userId>.<expiresAtMs>.<hmac>`.
 * The HMAC covers the user's CURRENT password hash, so a token stops working the moment the
 * password changes (single use) and after `TTL_MS`. No DB column needed, and it no longer
 * overwrites the email-verification token (they used to share User.verifyToken).
 */
const TTL_MS = 60 * 60 * 1000; // 1 hour — matches the email copy

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function sign(userId: string, expires: number, passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`pwreset:${userId}:${expires}:${passwordHash}`)
    .digest("base64url");
}

export function createResetToken(userId: string, passwordHash: string, now = Date.now()): string {
  const expires = now + TTL_MS;
  return `${userId}.${expires}.${sign(userId, expires, passwordHash)}`;
}

/** Parse without verifying — gives the user id to look up. */
export function parseResetToken(token: string): { userId: string; expires: number; mac: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expires = Number(parts[1]);
  if (!parts[0] || !Number.isFinite(expires) || !parts[2]) return null;
  return { userId: parts[0], expires, mac: parts[2] };
}

export function verifyResetToken(token: string, passwordHash: string, now = Date.now()): boolean {
  const t = parseResetToken(token);
  if (!t || t.expires < now) return false;
  const expected = Buffer.from(sign(t.userId, t.expires, passwordHash));
  const given = Buffer.from(t.mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
