/**
 * Sea conditions and publishing for sessions whose spot is not in the catalogue.
 * Before: conditions were computed only when a session was created WITH coordinates, so a spot pinned on the
 * map afterwards (geocoder found nothing) never got any, and a session could be published with no place at all.
 * Prisma, auth and the weather source are mocked; these pin the rules, not the database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const auth = vi.hoisted(() => ({ user: { id: "photog" } as null | { id: string } }));
const db = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), update: vi.fn() },
  photo: { findFirst: vi.fn(), updateMany: vi.fn() },
  spot: { findUnique: vi.fn() },
}));
const weather = vi.hoisted(() => ({ fetch: vi.fn() }));
const geo = vi.hoisted(() => ({ geocode: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: async () => auth.user ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  getViewerId: async () => auth.user?.id ?? null,
  verifySessionOwner: async () => true,
}));
vi.mock("@/lib/rekognition", () => ({ deleteFaceCollection: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifySubscribers: vi.fn(async () => 0) }));
vi.mock("@/lib/s3", () => ({ deleteObject: vi.fn(), BUCKET_ORIGINALS: "o", BUCKET_PREVIEWS: "p" }));
vi.mock("@/lib/geocode", () => ({ geocodeLocation: geo.geocode }));
vi.mock("@/lib/spots", () => ({ resolveSpotForCoords: vi.fn(async () => "spot-new") }));
vi.mock("@/lib/marine-conditions", () => ({
  isWaterSport: (s: string) => ["surf", "kite"].includes(s),
  fetchMarineConditions: weather.fetch,
}));

import { PATCH } from "@/app/api/sessions/[id]/route";
import { dayString, finalCoords, needsConditionsRefresh, startHour } from "@/lib/session-conditions";

const SEA = { waveHeight: 1.3, wavePeriod: 12, waveDirection: 211, windSpeed: 9, windDirection: 270, waterTemp: 29 };

/** A draft that was created when the geocoder found nothing: no coordinates, no conditions. */
const draftNoPlace = {
  published: false,
  pricePerPhoto: 999,
  photoCount: 12,
  location: "Secret reef, Nowhere",
  sportType: "surf",
  locationLat: null,
  locationLng: null,
  date: new Date("2026-11-07"),
  startTime: "08:30",
  waveHeight: null,
  windSpeed: null,
};
const withPlace = { ...draftNoPlace, locationLat: -8.65, locationLng: 115.12, waveHeight: 1.1, windSpeed: 8 };

const patch = (body: object) =>
  PATCH(new NextRequest("http://localhost/api/sessions/s1", { method: "PATCH", body: JSON.stringify(body) }), {
    params: { id: "s1" },
  });
const updateData = () => db.session.update.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "photog" };
  db.session.findUnique.mockResolvedValue(draftNoPlace);
  db.session.update.mockImplementation(async ({ data }: any) => ({ id: "s1", ...data }));
  weather.fetch.mockResolvedValue(SEA);
  geo.geocode.mockResolvedValue(null);
});

describe("pinning a spot that is not in the catalogue", () => {
  it("fetches the conditions for the pinned point, the session day and its start hour", async () => {
    const res = await patch({ locationLat: -8.6533, locationLng: 115.1267 });
    expect(res.status).toBe(200);
    expect(weather.fetch).toHaveBeenCalledWith(-8.6533, 115.1267, "2026-11-07", 8);
    expect(updateData()).toMatchObject({ locationLat: -8.6533, locationLng: 115.1267, ...SEA, spotId: "spot-new" });
  });

  it("does not fetch for a sport that has no sea conditions", async () => {
    db.session.findUnique.mockResolvedValue({ ...draftNoPlace, sportType: "skate" });
    await patch({ locationLat: 1, locationLng: 2 });
    expect(weather.fetch).not.toHaveBeenCalled();
    expect(updateData()).not.toHaveProperty("waveHeight");
  });
});

describe("publishing", () => {
  it("is refused without coordinates and tells the client to ask for a pin", async () => {
    const res = await patch({ published: true });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.needsLocation).toBe(true);
    expect(body.error).toMatch(/map/i);
    expect(db.session.update).not.toHaveBeenCalled();
  });

  it("goes through once the session has a place, without refetching existing conditions", async () => {
    db.session.findUnique.mockResolvedValue(withPlace);
    const res = await patch({ published: true });
    expect(res.status).toBe(200);
    expect(weather.fetch).not.toHaveBeenCalled();
    expect(updateData()).toMatchObject({ published: true });
  });

  it("accepts a pin sent in the same request", async () => {
    const res = await patch({ published: true, locationLat: 4.4, locationLng: 73.7 });
    expect(res.status).toBe(200);
    expect(weather.fetch).toHaveBeenCalledWith(4.4, 73.7, "2026-11-07", 8);
  });

  it("fills in conditions that were never stored (a session saved before this fix)", async () => {
    db.session.findUnique.mockResolvedValue({ ...withPlace, waveHeight: null, windSpeed: null });
    await patch({ published: true });
    expect(weather.fetch).toHaveBeenCalledTimes(1);
    expect(updateData()).toMatchObject(SEA);
  });

  it("does not block a session that is already live and has no coordinates", async () => {
    db.session.findUnique.mockResolvedValue({ ...draftNoPlace, published: true });
    const res = await patch({ title: "New title", published: true });
    expect(res.status).toBe(200);
  });
});

describe("editing a session that already has conditions", () => {
  beforeEach(() => db.session.findUnique.mockResolvedValue(withPlace));

  it("keeps them when nothing that affects them changes", async () => {
    await patch({ title: "Better title", description: "x" });
    expect(weather.fetch).not.toHaveBeenCalled();
    expect(updateData()).not.toHaveProperty("waveHeight");
  });

  it("recomputes when the day changes", async () => {
    await patch({ date: "2026-11-08" });
    expect(weather.fetch).toHaveBeenCalledWith(-8.65, 115.12, "2026-11-08", 8);
  });

  it("recomputes when the start hour changes, but not when only the minutes do", async () => {
    await patch({ startTime: "08:45" });
    expect(weather.fetch).not.toHaveBeenCalled();
    await patch({ startTime: "17:00" });
    expect(weather.fetch).toHaveBeenCalledWith(-8.65, 115.12, "2026-11-07", 17);
  });

  it("recomputes when the pin moves", async () => {
    await patch({ locationLat: -8.7, locationLng: 115.2 });
    expect(weather.fetch).toHaveBeenCalledWith(-8.7, 115.2, "2026-11-07", 8);
  });

  it("clears them when the new location cannot be found, so they do not describe the old place", async () => {
    geo.geocode.mockResolvedValue(null);
    const res = await patch({ location: "Somewhere the geocoder does not know" });
    expect((await res.json()).needsLocation).toBe(true);
    expect(updateData()).toMatchObject({
      locationLat: null,
      locationLng: null,
      waveHeight: null,
      windSpeed: null,
      waterTemp: null,
    });
    expect(weather.fetch).not.toHaveBeenCalled();
  });

  it("stores empty values (and retries on the next save) when the weather source is down", async () => {
    weather.fetch.mockResolvedValue({ waveHeight: null, wavePeriod: null, waveDirection: null, windSpeed: null, windDirection: null, waterTemp: null });
    await patch({ date: "2026-11-09" });
    expect(updateData()).toMatchObject({ waveHeight: null, windSpeed: null });
  });
});

describe("helpers", () => {
  it("dayString reads dates and ISO strings, and rejects the rest", () => {
    expect(dayString(new Date("2026-11-07T00:00:00Z"))).toBe("2026-11-07");
    expect(dayString("2026-11-08T10:00:00.000Z")).toBe("2026-11-08");
    expect(dayString("08/11/2026")).toBeNull();
    expect(dayString(undefined)).toBeNull();
    expect(dayString(new Date("nope"))).toBeNull();
  });

  it("startHour reads the hour and falls back to 8 only when unreadable (midnight is 0)", () => {
    expect(startHour("17:30")).toBe(17);
    expect(startHour("00:15")).toBe(0);
    expect(startHour("")).toBe(8);
    expect(startHour("abc")).toBe(8);
    expect(startHour("27:00")).toBe(23);
  });

  it("finalCoords: spot/geocode result wins, then the body, then what the session had", () => {
    const cur = { locationLat: 1, locationLng: 2 };
    expect(finalCoords(cur, {}, {})).toEqual({ lat: 1, lng: 2 });
    expect(finalCoords(cur, { locationLat: 5, locationLng: 6 }, {})).toEqual({ lat: 5, lng: 6 });
    expect(finalCoords(cur, { locationLat: 5, locationLng: 6 }, { locationLat: 9, locationLng: 10 })).toEqual({ lat: 9, lng: 10 });
    expect(finalCoords(cur, {}, { locationLat: null, locationLng: null })).toEqual({ lat: null, lng: null });
    expect(finalCoords(cur, { locationLat: null, locationLng: null }, {})).toEqual({ lat: null, lng: null });
    expect(finalCoords(cur, { locationLat: "5" as unknown as number }, {}).lat).toBeNull();
  });

  it("needsConditionsRefresh needs a place and a day, then a change or nothing stored", () => {
    const k = { lat: 1, lng: 2, date: "2026-11-07", hour: 8 };
    expect(needsConditionsRefresh(k, k, true)).toBe(false);
    expect(needsConditionsRefresh(k, k, false)).toBe(true);
    expect(needsConditionsRefresh(k, { ...k, lat: null }, false)).toBe(false);
    expect(needsConditionsRefresh(k, { ...k, date: null }, false)).toBe(false);
    expect(needsConditionsRefresh(k, { ...k, lat: 1.0000001 }, true)).toBe(false); // float noise
    expect(needsConditionsRefresh(k, { ...k, lng: 2.01 }, true)).toBe(true);
    expect(needsConditionsRefresh(k, { ...k, hour: 9 }, true)).toBe(true);
  });
});
