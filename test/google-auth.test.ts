import { describe, expect, it } from "vitest";
import { decideGoogleSignIn, googleConfigured, roleFromCookie, safeGooglePicture } from "@/lib/google-auth";

const profile = { email: "Anna@Example.com", email_verified: true, name: "Anna", picture: "https://lh3.googleusercontent.com/a/x" };
const verifiedUser = { id: "u1", emailVerified: true, passwordHash: "hash", avatarUrl: null };

describe("decideGoogleSignIn", () => {
  it("refuses an email Google has not verified", () => {
    expect(decideGoogleSignIn({ ...profile, email_verified: false }, null, "USER")).toEqual({ action: "reject", reason: "unverified-email" });
    expect(decideGoogleSignIn({ ...profile, email_verified: undefined }, verifiedUser, "USER").action).toBe("reject");
  });
  it("refuses a profile with no email", () => {
    expect(decideGoogleSignIn({ ...profile, email: "" }, null, "USER")).toEqual({ action: "reject", reason: "no-email" });
  });
  it("creates a verified, passwordless account with a lowercased email", () => {
    const d = decideGoogleSignIn(profile, null, "PHOTOGRAPHER");
    expect(d).toEqual({
      action: "create",
      data: { email: "anna@example.com", name: "Anna", role: "PHOTOGRAPHER", emailVerified: true, passwordHash: null, avatarUrl: "https://lh3.googleusercontent.com/a/x" },
    });
  });
  it("falls back to the email name when Google gives none", () => {
    const d = decideGoogleSignIn({ ...profile, name: "" }, null, "USER");
    expect(d.action === "create" && d.data.name).toBe("anna");
  });
  it("links to an existing verified account without touching its password", () => {
    expect(decideGoogleSignIn(profile, verifiedUser, "PHOTOGRAPHER")).toEqual({
      action: "link",
      patch: { avatarUrl: "https://lh3.googleusercontent.com/a/x" },
    });
  });
  it("never changes the role of an existing account", () => {
    const d = decideGoogleSignIn(profile, verifiedUser, "PHOTOGRAPHER");
    expect(JSON.stringify(d)).not.toContain("role");
  });
  it("drops the password of an account whose email was never verified (pre-registration takeover)", () => {
    const d = decideGoogleSignIn(profile, { ...verifiedUser, emailVerified: false, avatarUrl: "x" }, "USER");
    expect(d).toEqual({ action: "link", patch: { emailVerified: true, passwordHash: null } });
  });
  it("keeps an existing avatar", () => {
    const d = decideGoogleSignIn(profile, { ...verifiedUser, avatarUrl: "https://cdn/avatars/u1-1.jpg" }, "USER");
    expect(d).toEqual({ action: "link", patch: {} });
  });
});

describe("helpers", () => {
  it("accepts only a photographer cookie as photographer", () => {
    expect(roleFromCookie("PHOTOGRAPHER")).toBe("PHOTOGRAPHER");
    expect(roleFromCookie("ADMIN")).toBe("USER");
    expect(roleFromCookie(undefined)).toBe("USER");
  });
  it("accepts only Google-hosted pictures", () => {
    expect(safeGooglePicture("https://lh3.googleusercontent.com/a/x")).not.toBeNull();
    expect(safeGooglePicture("http://lh3.googleusercontent.com/a/x")).toBeNull();
    expect(safeGooglePicture("https://evil.com/googleusercontent.com")).toBeNull();
    expect(safeGooglePicture("https://notgoogleusercontent.com/x")).toBeNull();
    expect(safeGooglePicture(null)).toBeNull();
  });
  it("needs both id and secret", () => {
    expect(googleConfigured({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toBe(true);
    expect(googleConfigured({ GOOGLE_CLIENT_ID: "a" })).toBe(false);
    expect(googleConfigured({})).toBe(false);
  });
});
