import { describe, expect, it } from "vitest";
import { conditionChips } from "@/lib/condition-chips";

describe("conditionChips", () => {
  it("formats wave, period and wind (km/h converted to knots) with readable labels", () => {
    expect(conditionChips({ waveHeight: 1.04, wavePeriod: 6.4, windSpeed: 24 })).toEqual([
      { text: "H 1.0m", label: "Wave height 1.0 metres" },
      { text: "T 6s", label: "Wave period 6 seconds" },
      { text: "13kn", label: "Wind 13 knots" },
    ]);
  });

  it("skips missing values, including undefined", () => {
    expect(conditionChips({ waveHeight: null, wavePeriod: undefined, windSpeed: 18.52 })).toEqual([
      { text: "10kn", label: "Wind 10 knots" },
    ]);
  });

  it("keeps a calm 0 m reading instead of dropping it", () => {
    expect(conditionChips({ waveHeight: 0 })[0].text).toBe("H 0.0m");
  });

  it("returns nothing when there is no data", () => {
    expect(conditionChips({})).toEqual([]);
  });
});
