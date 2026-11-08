import { describe, expect, it } from "vitest";
import { canSearchSession, findMeRateRules } from "@/lib/find-me-limits";
import {
  clearPendingMatches,
  pendingMatchesKey,
  readPendingMatches,
  savePendingMatches,
} from "@/lib/find-me-pending";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("find-me rate rules", () => {
  it("signed-in users: 15/h per account plus 30/h per IP", () => {
    expect(findMeRateRules("u1", "1.2.3.4")).toEqual([
      { key: "findme:u:u1", max: 15 },
      { key: "findme:ip:1.2.3.4", max: 30 },
    ]);
  });

  it("anonymous visitors: stricter 8/h per IP plus the shared 30/h per IP", () => {
    expect(findMeRateRules(null, "1.2.3.4")).toEqual([
      { key: "findme:anon:ip:1.2.3.4", max: 8 },
      { key: "findme:ip:1.2.3.4", max: 30 },
    ]);
  });
});

describe("find-me session access", () => {
  const pub = { published: true, photographerId: "p1" };
  const draft = { published: false, photographerId: "p1" };

  it("anyone can search a published session", () => {
    expect(canSearchSession(pub, null)).toBe(true);
    expect(canSearchSession(pub, "u2")).toBe(true);
  });

  it("drafts stay owner-only", () => {
    expect(canSearchSession(draft, null)).toBe(false);
    expect(canSearchSession(draft, "u2")).toBe(false);
    expect(canSearchSession(draft, "p1")).toBe(true);
  });

  it("missing session is not searchable", () => {
    expect(canSearchSession(null, "p1")).toBe(false);
  });
});

describe("pending Find Me matches", () => {
  it("round-trips ids per session, deduped", () => {
    const s = memoryStorage();
    savePendingMatches(s, "s1", ["a", "b", "a"]);
    savePendingMatches(s, "s2", ["c"]);
    expect(readPendingMatches(s, "s1")).toEqual(["a", "b"]);
    expect(readPendingMatches(s, "s2")).toEqual(["c"]);
  });

  it("clears, and saving an empty list removes the key", () => {
    const s = memoryStorage();
    savePendingMatches(s, "s1", ["a"]);
    clearPendingMatches(s, "s1");
    expect(readPendingMatches(s, "s1")).toEqual([]);
    savePendingMatches(s, "s1", ["a"]);
    savePendingMatches(s, "s1", []);
    expect(s.raw.has(pendingMatchesKey("s1"))).toBe(false);
  });

  it("ignores corrupt or tampered values", () => {
    const s = memoryStorage();
    s.setItem(pendingMatchesKey("s1"), "not json");
    expect(readPendingMatches(s, "s1")).toEqual([]);
    s.setItem(pendingMatchesKey("s1"), JSON.stringify({ a: 1 }));
    expect(readPendingMatches(s, "s1")).toEqual([]);
    s.setItem(pendingMatchesKey("s1"), JSON.stringify(["ok", 3, null, "", "ok2"]));
    expect(readPendingMatches(s, "s1")).toEqual(["ok", "ok2"]);
  });

  it("is a no-op without storage (SSR / private mode)", () => {
    expect(readPendingMatches(null, "s1")).toEqual([]);
    expect(() => savePendingMatches(null, "s1", ["a"])).not.toThrow();
    expect(() => clearPendingMatches(undefined, "s1")).not.toThrow();
  });
});
