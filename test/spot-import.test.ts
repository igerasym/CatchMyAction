import { describe, expect, it } from "vitest";
import { haversineKm, normName, parseSpotRecords } from "../scripts/spot-import-lib";

describe("spot import helpers", () => {
  it("haversine: Cokes ↔ Chickens is ~1.6 km", () => {
    const d = haversineKm(4.3734, 73.6485, 4.3775, 73.6626);
    expect(d).toBeGreaterThan(1.4);
    expect(d).toBeLessThan(1.8);
  });

  it("normalises names for duplicate detection", () => {
    expect(normName("Honky's")).toBe(normName("honkys"));
  });

  it("parses BrizoCast-style records and drops invalid ones", () => {
    const spots = parseSpotRecords([
      { spot_key: "a", name: "Cokes", lat: 4.3734, lon: 73.6485, country: "Maldives" },
      { name: "No coords" },
      { name: "Bad lat", lat: 123, lon: 0 },
    ]);
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({ name: "Cokes" });
  });
});
