import { describe, expect, it } from "vitest";
import { findDuplicate, sharesSport, type ExistingSpot } from "../scripts/spot-import-lib";
import { MAP_SPOT_CAP, thinForMap, type MapSpotInput } from "@/lib/map-spots";
import { spotRank } from "@/lib/spot-rank";

const spot = (over: Partial<ExistingSpot> & { name: string; lat: number; lng: number }): ExistingSpot => ({
  id: over.name,
  source: "manual",
  sourceId: null,
  sports: ["surf"],
  ...over,
});

describe("sharesSport", () => {
  it("overlaps when any sport is common", () => {
    expect(sharesSport(["kite", "surf"], ["surf"])).toBe(true);
    expect(sharesSport(["skate"], ["surf"])).toBe(false);
  });

  it("treats missing sport information as overlapping, the safe default", () => {
    expect(sharesSport(undefined, ["surf"])).toBe(true);
    expect(sharesSport([], ["surf"])).toBe(true);
    expect(sharesSport(["surf"], undefined)).toBe(true);
  });
});

describe("findDuplicate (import dedup)", () => {
  const surfBreak = spot({ name: "Cokes", lat: 4.176, lng: 73.517 });

  it("skips a surf spot within 500 m of an existing surf spot", () => {
    expect(findDuplicate([surfBreak], { name: "Cokes Left", lat: 4.178, lng: 73.518, sports: ["surf"] })).toBe(surfBreak);
  });

  it("does NOT treat a skate park on the same promenade as a duplicate of a surf break", () => {
    const skatePark = spot({ name: "Beach Skatepark", lat: 4.176, lng: 73.517, sports: ["skate"] });
    expect(findDuplicate([skatePark], { name: "Cokes", lat: 4.1762, lng: 73.5171, sports: ["surf"] })).toBeUndefined();
  });

  it("defaults the incoming sport to surf, like the importer does when creating the row", () => {
    const skatePark = spot({ name: "Pier Park", lat: 10, lng: 10, sports: ["skate"] });
    expect(findDuplicate([skatePark], { name: "Pier", lat: 10.001, lng: 10 })).toBeUndefined();
    expect(findDuplicate([surfBreak], { name: "Cokes Right", lat: 4.1761, lng: 73.5171 })).toBe(surfBreak);
  });

  it("still skips the same name within 5 km for the same sport", () => {
    const far = { name: "Cokes", lat: 4.2, lng: 73.54, sports: ["surf"] }; // ~3.6 km away
    expect(findDuplicate([surfBreak], far)).toBe(surfBreak);
  });

  it("keeps neighbouring breaks when distance dedup is off (hand-verified files)", () => {
    const next = { name: "Chickens", lat: 4.1765, lng: 73.5175, sports: ["surf"] };
    expect(findDuplicate([surfBreak], next, false)).toBeUndefined();
    expect(findDuplicate([surfBreak], next, true)).toBe(surfBreak);
  });

  it("unknown sports on an existing row still block, as before", () => {
    const unknown = spot({ name: "Old entry", lat: 1, lng: 1, sports: [] });
    expect(findDuplicate([unknown], { name: "New", lat: 1.001, lng: 1, sports: ["surf"] })).toBe(unknown);
  });
});

describe("thinForMap", () => {
  const grid = (n: number): MapSpotInput[] =>
    Array.from({ length: n }, (_, i) => ({
      name: `Spot ${String(i).padStart(5, "0")}`,
      region: "",
      country: "",
      lat: -80 + (i % 160) * 1.0 + (i % 7) * 0.01,
      lng: -170 + Math.floor(i / 160) * 1.0,
    }));

  it("returns everything when the catalogue is small", () => {
    const small = grid(40);
    expect(thinForMap(small)).toHaveLength(40);
  });

  it("keeps the result within the cap for a large catalogue", () => {
    const big = grid(9000);
    const out = thinForMap(big);
    expect(out.length).toBeLessThanOrEqual(MAP_SPOT_CAP);
    expect(out.length).toBeGreaterThan(50);
  });

  it("never drops a pinned spot (a spot with a session, or a curated one)", () => {
    const big = grid(9000);
    big[4321].pinned = true;
    big[8000].pinned = true;
    const names = thinForMap(big).map((s) => s.name);
    expect(names).toContain(big[4321].name);
    expect(names).toContain(big[8000].name);
  });

  it("keeps a pinned spot even if it shares a cell with another spot", () => {
    const pair: MapSpotInput[] = [
      { name: "AAA other", region: "", country: "", lat: 4.17, lng: 73.51 },
      { name: "ZZZ pinned", region: "", country: "", lat: 4.18, lng: 73.52, pinned: true },
    ];
    const out = thinForMap(pair).map((s) => s.name);
    expect(out).toContain("ZZZ pinned");
    expect(out).not.toContain("AAA other"); // same 0.5° cell as the pinned one
  });

  it("is deterministic regardless of input order", () => {
    const big = grid(3000);
    const a = thinForMap(big).map((s) => s.name);
    const b = thinForMap([...big].reverse()).map((s) => s.name);
    expect(b).toEqual(a);
  });

  it("strips internal fields from the payload", () => {
    const out = thinForMap([{ name: "X", region: "r", country: "c", lat: 1, lng: 2, pinned: true }]);
    expect(out[0]).toEqual({ name: "X", region: "r", country: "c", lat: 1, lng: 2 });
  });
});

describe("spotRank (autocomplete order)", () => {
  it("puts spots for the sport being entered ahead of other sports", () => {
    const surf = spotRank("Lisboa Reef", "lis", ["surf"], "surf");
    const skate = spotRank("Lisboa Skatepark", "lis", ["skate"], "surf");
    expect(surf).toBeLessThan(skate);
  });

  it("within the same sport, prefix matches beat substring matches", () => {
    expect(spotRank("Praia Grande", "pra", ["surf"], "surf")).toBeLessThan(spotRank("Sa Praia", "pra", ["surf"], "surf"));
  });

  it("does not penalise spots that have no sport on record", () => {
    expect(spotRank("Cokes", "cok", [], "surf")).toBe(spotRank("Cokes", "cok", ["surf"], "surf"));
  });

  it("ignores the sport when none is given", () => {
    expect(spotRank("Cokes", "cok", ["skate"], undefined)).toBe(0);
  });
});
