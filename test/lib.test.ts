import { describe, expect, it } from "vitest";
import { createResetToken, verifyResetToken } from "@/lib/reset-token";
import { loginHref, safeCallbackUrl } from "@/lib/redirect";
import { escapeHtml } from "@/lib/html";
import { parsePriceCents, sanitizeHttpUrl, validatePassword } from "@/lib/validation";
import { platformFee } from "@/lib/stripe";

describe("password reset tokens", () => {
  const now = 1_700_000_000_000;

  it("accepts a fresh token for the same password hash", () => {
    const t = createResetToken("user1", "hashA", now);
    expect(verifyResetToken(t, "hashA", now + 1000)).toBe(true);
  });

  it("expires after one hour", () => {
    const t = createResetToken("user1", "hashA", now);
    expect(verifyResetToken(t, "hashA", now + 61 * 60 * 1000)).toBe(false);
  });

  it("stops working once the password changed (single use)", () => {
    const t = createResetToken("user1", "hashA", now);
    expect(verifyResetToken(t, "hashB", now + 1000)).toBe(false);
  });

  it("rejects a token re-targeted at another user", () => {
    const [, exp, mac] = createResetToken("user1", "hashA", now).split(".");
    expect(verifyResetToken(`user2.${exp}.${mac}`, "hashA", now + 1000)).toBe(false);
  });

  it("rejects garbage", () => {
    expect(verifyResetToken("nope", "hashA", now)).toBe(false);
    expect(verifyResetToken("a.b.c", "hashA", now)).toBe(false);
  });
});

describe("safeCallbackUrl (open redirect guard)", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", ""])(
    "falls back for %s",
    (raw) => expect(safeCallbackUrl(raw)).toBe("/")
  );

  it("keeps same-site paths", () => {
    expect(safeCallbackUrl("/sessions/abc?findme=1")).toBe("/sessions/abc?findme=1");
    expect(loginHref("/sessions/abc")).toBe("/login?callbackUrl=%2Fsessions%2Fabc");
  });
});

describe("validation", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;"
    );
  });

  it("accepts only http(s) URLs", () => {
    expect(sanitizeHttpUrl("example.com")).toBe("https://example.com/");
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("data:text/html,x")).toBeNull();
  });

  it("validates prices in cents", () => {
    expect(parsePriceCents(0)).toBe(0);
    expect(parsePriceCents(999)).toBe(999);
    expect(parsePriceCents(-1)).toBeNull();
    expect(parsePriceCents(9.99)).toBeNull();
    expect(parsePriceCents("999")).toBeNull();
    expect(parsePriceCents(100_000)).toBeNull();
  });

  it("enforces password rules", () => {
    expect(validatePassword("Short1")).not.toBeNull();
    expect(validatePassword("alllowercase1")).not.toBeNull();
    expect(validatePassword("GoodPass1")).toBeNull();
  });

  it("platform fee is 18%", () => {
    expect(platformFee(1000)).toBe(180);
  });
});
