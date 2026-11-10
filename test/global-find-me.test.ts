import { describe, expect, it } from "vitest";
import { buildGlobalResults, globalFindMeRateRules, groupMatchesBySession, mapPool, parseSessionIds } from "@/lib/global-find-me";

const sessions = new Map([
  ["s1", { id: "s1", title: "WSL", location: "Cloud 9", date: "2026-10-31T00:00:00.000Z" }],
  ["s2", { id: "s2", title: "Evening", location: "Cokes", date: "2026-10-26T00:00:00.000Z" }],
  ["s3", { id: "s3", title: "Skate", location: "100cznia", date: "2026-07-04T00:00:00.000Z" }],
]);
const photos = new Map([
  ["p1", { sessionId: "s1", thumbnailUrl: "t1" }],
  ["p2", { sessionId: "s1", thumbnailUrl: "t2" }],
  ["p3", { sessionId: "s2", thumbnailUrl: "t3" }],
  ["p4", { sessionId: "s3", thumbnailUrl: "t4" }],
  ["pX", { sessionId: "s3", thumbnailUrl: "tx" }], // belongs to s3, never to s2
]);

describe("buildGlobalResults", () => {
  it("ranks sessions by their best match and sorts photos inside", () => {
    const r = buildGlobalResults(
      [
        { sessionId: "s2", matches: [{ photoId: "p3", similarity: 95 }] },
        { sessionId: "s1", matches: [{ photoId: "p1", similarity: 82 }, { photoId: "p2", similarity: 99 }] },
      ],
      sessions,
      photos
    );
    expect(r.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(r[0].matches.map((m) => m.photoId)).toEqual(["p2", "p1"]);
    expect(r[0].matches[0].thumbnailUrl).toBe("t2");
    expect(r[0].best).toBe(99);
  });

  it("breaks ties with the more recent session", () => {
    const r = buildGlobalResults(
      [
        { sessionId: "s3", matches: [{ photoId: "p4", similarity: 90 }] },
        { sessionId: "s2", matches: [{ photoId: "p3", similarity: 90 }] },
      ],
      sessions,
      photos
    );
    expect(r.map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  it("drops photos that no longer exist or sit in another session than the match", () => {
    const r = buildGlobalResults(
      [{ sessionId: "s2", matches: [{ photoId: "gone", similarity: 99 }, { photoId: "pX", similarity: 98 }, { photoId: "p3", similarity: 85 }] }],
      sessions,
      photos
    );
    expect(r).toHaveLength(1);
    expect(r[0].matches.map((m) => m.photoId)).toEqual(["p3"]);
  });

  it("omits sessions with nothing left and unknown sessions", () => {
    expect(
      buildGlobalResults(
        [{ sessionId: "s1", matches: [{ photoId: "gone", similarity: 99 }] }, { sessionId: "nope", matches: [{ photoId: "p1", similarity: 99 }] }],
        sessions,
        photos
      )
    ).toEqual([]);
  });
});

describe("globalFindMeRateRules", () => {
  it("is tighter for anonymous visitors", () => {
    const anon = globalFindMeRateRules(null, "1.2.3.4");
    const user = globalFindMeRateRules("u1", "1.2.3.4");
    expect(anon[0]).toEqual({ key: "findme-all:anon:ip:1.2.3.4", max: 3 });
    expect(user[0]).toEqual({ key: "findme-all:u:u1", max: 6 });
    expect(anon[1]).toEqual(user[1]);
  });
});

describe("mapPool", () => {
  it("keeps order and never exceeds the concurrency limit", async () => {
    let live = 0;
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      live--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });
  it("handles an empty list", async () => {
    expect(await mapPool([], 3, async () => 1)).toEqual([]);
  });
});

describe("parseSessionIds", () => {
  it("splits, trims, dedupes and drops anything that is not an id", () => {
    expect(parseSessionIds(" cmw8kqhr80001pk8s26g8qxdb ,cmw8kqhr80001pk8s26g8qxdb,abc,../etc/passwd, cmx9aaaa0001pk8s26g8qxdc")).toEqual([
      "cmw8kqhr80001pk8s26g8qxdb",
      "cmx9aaaa0001pk8s26g8qxdc",
    ]);
  });
  it("is empty for missing or non-text input", () => {
    expect(parseSessionIds(null)).toEqual([]);
    expect(parseSessionIds(undefined)).toEqual([]);
    expect(parseSessionIds("")).toEqual([]);
  });
  it("caps how many sessions one search can cover", () => {
    const many = Array.from({ length: 100 }, (_, i) => `session-id-${String(i).padStart(4, "0")}`).join(",");
    expect(parseSessionIds(many)).toHaveLength(40);
  });
});

describe("groupMatchesBySession", () => {
  const photoSession = new Map([["p1", "s1"], ["p2", "s1"], ["p3", "s2"], ["p4", "other"]]);
  it("sorts matches from a shared collection into the sessions that were asked for", () => {
    const r = groupMatchesBySession(
      [{ photoId: "p1", similarity: 91 }, { photoId: "p3", similarity: 85 }, { photoId: "p2", similarity: 99 }, { photoId: "p4", similarity: 99 }],
      photoSession,
      new Set(["s1", "s2"])
    );
    expect(r.find((s) => s.sessionId === "s1")!.matches.map((m) => m.photoId).sort()).toEqual(["p1", "p2"]);
    expect(r.find((s) => s.sessionId === "s2")!.matches).toHaveLength(1);
    expect(r.find((s) => s.sessionId === "other")).toBeUndefined(); // another session at the same spot, not asked for
  });
  it("keeps the best similarity when a photo is matched twice and ignores unknown photos", () => {
    const r = groupMatchesBySession(
      [{ photoId: "p1", similarity: 80 }, { photoId: "p1", similarity: 95 }, { photoId: "ghost", similarity: 99 }],
      photoSession,
      new Set(["s1"])
    );
    expect(r).toEqual([{ sessionId: "s1", matches: [{ photoId: "p1", similarity: 95 }] }]);
  });
});
