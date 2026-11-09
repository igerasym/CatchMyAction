/**
 * Rules for "Sign in with Google", kept pure so they can be unit-tested.
 *
 * We keep our own User table (JWT sessions, no NextAuth adapter), so on a Google sign-in we either
 * create a user, or attach the Google identity to the existing account with the same email.
 */

export const SIGNUP_ROLE_COOKIE = "cma-signup-role";

export interface GoogleProfile {
  email?: string | null;
  email_verified?: boolean;
  name?: string | null;
  picture?: string | null;
}

export interface ExistingUser {
  id: string;
  emailVerified: boolean;
  passwordHash: string | null;
  avatarUrl: string | null;
}

export type GoogleDecision =
  | { action: "reject"; reason: "no-email" | "unverified-email" }
  | {
      action: "create";
      data: { email: string; name: string; role: "USER" | "PHOTOGRAPHER"; emailVerified: true; passwordHash: null; avatarUrl: string | null };
    }
  | { action: "link"; patch: { emailVerified?: true; passwordHash?: null; avatarUrl?: string } };

export function googleConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
}

/** Only an explicit photographer choice makes one; everything else (missing, tampered cookie) is an athlete. */
export function roleFromCookie(value: string | undefined | null): "USER" | "PHOTOGRAPHER" {
  return value === "PHOTOGRAPHER" ? "PHOTOGRAPHER" : "USER";
}

/** Only Google's own photo host is accepted as an avatar URL. */
export function safeGooglePicture(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)googleusercontent\.com$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function decideGoogleSignIn(
  profile: GoogleProfile,
  existing: ExistingUser | null,
  signupRole: "USER" | "PHOTOGRAPHER"
): GoogleDecision {
  const email = profile.email?.trim().toLowerCase();
  if (!email) return { action: "reject", reason: "no-email" };
  // Never trust an email Google hasn't verified: it would let someone claim another person's account.
  if (profile.email_verified !== true) return { action: "reject", reason: "unverified-email" };

  const picture = safeGooglePicture(profile.picture);

  if (!existing) {
    return {
      action: "create",
      data: {
        email,
        name: (profile.name?.trim() || email.split("@")[0]).slice(0, 80),
        role: signupRole,
        emailVerified: true,
        passwordHash: null,
        avatarUrl: picture,
      },
    };
  }

  const patch: { emailVerified?: true; passwordHash?: null; avatarUrl?: string } = {};
  if (!existing.emailVerified) {
    // The email was never confirmed by whoever registered it, so a password set back then may belong to
    // someone else (pre-registration takeover). Google proves the real owner: verify, and drop that password.
    patch.emailVerified = true;
    patch.passwordHash = null;
  }
  if (!existing.avatarUrl && picture) patch.avatarUrl = picture;
  return { action: "link", patch };
}
