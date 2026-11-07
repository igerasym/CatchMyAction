import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOpenMeteoUrls, openMeteoProvider, parseOpenMeteo } from "@/lib/conditions/open-meteo";
import { conditionsAttribution, fetchMarineConditions } from "@/lib/marine-conditions";

const hours = (f: (h: number) => number | null) => Array.from({ length: 24 }, (_, h) => f(h));

const marine = {
  hourly: {
    wave_height: hours((h) => 1 + h / 100),
    wave_period: hours(() => 12.5),
    wave_direction: hours(() => 212),
    sea_surface_temperature: hours(() => 29.8),
  },
};
const weather = {
  hourly: {
    wind_speed_10m: hours((h) => h),
    wind_direction_10m: hours(() => 210),
  },
};

describe("Open-Meteo conditions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("picks the session hour from both responses, including water temperature", () => {
    expect(parseOpenMeteo(marine, weather, 9)).toEqual({
      waveHeight: 1.09,
      wavePeriod: 12.5,
      waveDirection: 212,
      windSpeed: 9,
      windDirection: 210,
      waterTemp: 29.8,
    });
  });

  it("clamps the hour into 0-23", () => {
    expect(parseOpenMeteo(marine, weather, 30).windSpeed).toBe(23);
    expect(parseOpenMeteo(marine, weather, -2).windSpeed).toBe(0);
  });

  it("returns nulls for a failed source and for missing or non-numeric values", () => {
    const partial = { hourly: { wave_height: hours(() => null), wave_period: [Number.NaN] } };
    const c = parseOpenMeteo(partial, null, 0);
    expect(c).toEqual({
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
      windSpeed: null,
      windDirection: null,
      waterTemp: null,
    });
  });

  it("builds encoded URLs that request sea surface temperature", () => {
    const { marine: m, weather: w } = buildOpenMeteoUrls(-8.6533, 115.1267, "2026-11-07");
    const mu = new URL(m);
    expect(mu.host).toBe("marine-api.open-meteo.com");
    expect(mu.searchParams.get("latitude")).toBe("-8.6533");
    expect(mu.searchParams.get("start_date")).toBe("2026-11-07");
    expect(mu.searchParams.get("hourly")).toContain("sea_surface_temperature");
    expect(new URL(w).searchParams.get("hourly")).toBe("wind_speed_10m,wind_direction_10m");
  });

  it("never throws when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const c = await openMeteoProvider.fetch(39.34, -9.37, "2026-11-07", 8);
    expect(c.waveHeight).toBeNull();
    expect(c.windSpeed).toBeNull();
  });

  it("routes the facade through the active provider and exposes its credit line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => (url.includes("marine-api") ? marine : weather),
      }))
    );
    const c = await fetchMarineConditions(-8.65, 115.13, "2026-11-07", 9);
    expect(c.waterTemp).toBe(29.8);
    expect(conditionsAttribution().url).toBe("https://open-meteo.com/");
  });
});
