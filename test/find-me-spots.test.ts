import { describe, expect, it } from "vitest";
import {
  areaSessions,
  distanceLabel,
  groupSpots,
  haversineKm,
  localDay,
  norm,
  searchSpots,
  sessionChipLabel,
  sortByDistance,
  type FindMeSession,
} from "@/lib/find-me-spots";

let n = 0;
const session = (over: Partial<FindMeSession>): FindMeSession => ({
  id: `s${++n}`,
  title: "Session",
  location: "Somewhere",
  spotId: null,
  spotName: null,
  spotPlace: null,
  lat: null,
  lng: null,
  date: "2026-11-01T00:00:00.000Z",
  startTime: "08:00",
  endTime: "10:00",
  photoCount: 10,
  ...over,
});

const cokes = { spotId: "sp-cokes", spotName: "Cokes", spotPlace: "North Malé Atoll, Maldives", lat: 4.37, lng: 73.66 };
const sessions = [
  session({ id: "a", location: "Maldives Cokes", ...cokes, date: "2026-10-23T00:00:00.000Z" }),
  session({ id: "b", location: "Cokes, Maldives", ...cokes, date: "2026-10-26T00:00:00.000Z", startTime: "17:00", endTime: "18:00" }),
  session({ id: "c", location: "Chałupy Surf", date: "2026-07-27T00:00:00.000Z", lat: 54.77, lng: 18.4 }),
  session({ id: "d", location: "Siargao, Philippines", spotId: "sp-sg", spotName: "Cloud 9", spotPlace: "Siargao, Philippines", lat: 9.81, lng: 126.16, date: "2025-11-19T00:00:00.000Z" }),
];

describe("norm", () => {
  it("drops accents, case and punctuation", () => {
    expect(norm("  Chałupy  Surf! ")).toBe("chalupy surf");
    expect(norm("Malé")).toBe("male");
    expect(norm("")).toBe("");
  });
});

describe("groupSpots", () => {
  it("merges differently typed locations of one catalogue spot and puts the newest first", () => {
    const g = groupSpots(sessions);
    const c = g.find((x) => x.key === "spot:sp-cokes")!;
    expect(c.name).toBe("Cokes");
    expect(c.place).toBe("North Malé Atoll, Maldives");
    expect(c.sessions.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("orders spots by their newest session and falls back to the typed location", () => {
    const g = groupSpots(sessions);
    expect(g.map((x) => x.name)).toEqual(["Cokes", "Chałupy Surf", "Cloud 9"]);
    expect(g[1].place).toBeNull();
  });

  it("groups sessions without a catalogue spot by their normalised text", () => {
    const g = groupSpots([session({ id: "x", location: "Baleal" }), session({ id: "y", location: " baleal " })]);
    expect(g).toHaveLength(1);
    expect(g[0].sessions).toHaveLength(2);
  });

  it("takes coordinates from the first session that has them", () => {
    const g = groupSpots([
      session({ id: "x", location: "Baleal", date: "2026-11-02T00:00:00.000Z" }),
      session({ id: "y", location: "Baleal", date: "2026-11-01T00:00:00.000Z", lat: 39.37, lng: -9.34 }),
    ]);
    expect(g[0].lat).toBe(39.37);
  });
});

describe("searchSpots", () => {
  const groups = groupSpots(sessions);

  it("returns everything for an empty query", () => {
    expect(searchSpots(groups, "  ")).toHaveLength(3);
  });

  it("finds by name, ignoring accents and case", () => {
    expect(searchSpots(groups, "CHALUPY").map((g) => g.name)).toEqual(["Chałupy Surf"]);
    expect(searchSpots(groups, "cok").map((g) => g.name)).toEqual(["Cokes"]);
  });

  it("finds by what the photographer typed, and by place", () => {
    expect(searchSpots(groups, "maldives").map((g) => g.name)).toEqual(["Cokes"]);
    expect(searchSpots(groups, "philippines").map((g) => g.name)).toEqual(["Cloud 9"]);
  });

  it("matches a word inside the name and ranks name hits above text hits", () => {
    const g = groupSpots([
      session({ id: "p", location: "Surf camp near Peniche", spotId: "1", spotName: "Baleal" }),
      session({ id: "q", location: "Peniche", spotId: "2", spotName: "Peniche Harbour" }),
    ]);
    expect(searchSpots(g, "peniche").map((x) => x.name)).toEqual(["Peniche Harbour", "Baleal"]);
  });

  it("returns nothing for an unknown spot", () => {
    expect(searchSpots(groups, "pipeline")).toEqual([]);
  });
});

describe("distance", () => {
  it("haversine: Supertubos to Baleal is a few km, Lisbon to Malé is thousands", () => {
    const d = haversineKm(39.3433, -9.3711, 39.3745, -9.3417);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(6);
    expect(haversineKm(38.72, -9.14, 4.17, 73.51)).toBeGreaterThan(8000);
    expect(haversineKm(1, 2, 1, 2)).toBe(0);
  });

  it("sorts nearest first and puts spots without coordinates last", () => {
    const g = groupSpots([
      ...sessions,
      session({ id: "z", location: "No coordinates" }),
    ]);
    const sorted = sortByDistance(g, { lat: 54.8, lng: 18.3 }); // near Hel
    expect(sorted[0].name).toBe("Chałupy Surf");
    expect(sorted[sorted.length - 1].name).toBe("No coordinates");
    expect(sorted[sorted.length - 1].km).toBeNull();
  });

  it("labels distances", () => {
    expect(distanceLabel(0.4)).toBe("< 1 km");
    expect(distanceLabel(12.6)).toBe("13 km");
    expect(distanceLabel(1234)).toBe("1230 km");
  });
});

describe("sessionChipLabel", () => {
  const s = { date: "2026-11-08T00:00:00.000Z", startTime: "08:00", endTime: "10:00" };

  it("uses an absolute label until the browser clock is known", () => {
    expect(sessionChipLabel(s, null)).toBe("Sun 8 Nov 08\u201310");
  });

  it("says Today and Yesterday relative to the viewer's day", () => {
    expect(sessionChipLabel(s, new Date(2026, 10, 8, 15, 0))).toBe("Today 08\u201310");
    expect(sessionChipLabel(s, new Date(2026, 10, 9, 0, 5))).toBe("Yesterday 08\u201310");
    expect(sessionChipLabel(s, new Date(2026, 10, 10, 12, 0))).toBe("Sun 8 Nov 08\u201310");
  });

  it("localDay pads month and day", () => {
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("areaSessions", () => {
  const area = [
    session({ id: "c9", location: "Cloud 9", spotId: "cloud9", spotName: "Cloud 9", lat: 9.8, lng: 126.16, date: "2026-10-31T00:00:00.000Z" }),
    session({ id: "tanbo", location: "Tanbo", spotId: "tanbo", spotName: "Tanbo", lat: 9.75, lng: 126.12, date: "2026-01-10T00:00:00.000Z" }), // ~7 km away
    session({ id: "cokes", location: "Cokes", spotId: "cokes", spotName: "Cokes", lat: 4.3, lng: 73.5, date: "2026-10-26T00:00:00.000Z" }), // other side of the planet
    session({ id: "nowhere", location: "Nowhere", date: "2026-09-01T00:00:00.000Z" }),
  ];
  const groups = groupSpots(area);
  const pick = (key: string) => groups.find((g) => g.key === key)!;

  it("includes neighbouring spots and leaves faraway ones out", () => {
    expect(areaSessions(groups, pick("spot:cloud9")).map((s) => s.id)).toEqual(["c9", "tanbo"]);
    expect(areaSessions(groups, pick("spot:cokes")).map((s) => s.id)).toEqual(["cokes"]);
  });

  it("searches only its own sessions when the spot has no coordinates", () => {
    expect(areaSessions(groups, pick("loc:nowhere")).map((s) => s.id)).toEqual(["nowhere"]);
  });

  it("honours the radius", () => {
    expect(areaSessions(groups, pick("spot:cloud9"), 1).map((s) => s.id)).toEqual(["c9"]);
  });
});
