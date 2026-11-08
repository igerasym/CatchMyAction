import { describe, expect, it } from "vitest";
import { filterByDay, parseDay, sessionDay, withDateParam } from "@/lib/session-date";

describe("parseDay", () => {
  it("accepts real YYYY-MM-DD days", () => {
    expect(parseDay("2026-11-08")).toBe("2026-11-08");
    expect(parseDay("2024-02-29")).toBe("2024-02-29");
  });

  it("rejects junk, impossible days and other formats", () => {
    for (const bad of [undefined, null, "", "2026-13-01", "2026-02-30", "2025-02-29", "08/11/2026", "2026-11-8", "2026-11-08T00:00:00Z", "<script>"]) {
      expect(parseDay(bad as any)).toBeNull();
    }
  });
});

describe("sessionDay / filterByDay", () => {
  const sessions = [
    { id: "a", date: new Date("2026-11-08").toISOString() }, // how the API stores a picked day
    { id: "b", date: "2026-11-07T00:00:00.000Z" },
    { id: "c", date: "2026-11-08T00:00:00.000Z" },
  ];

  it("uses the UTC calendar day the session was saved with", () => {
    expect(sessionDay(sessions[0].date)).toBe("2026-11-08");
    expect(sessionDay("nope")).toBeNull();
  });

  it("keeps only sessions on that day; no day = all", () => {
    expect(filterByDay(sessions, "2026-11-08").map((s) => s.id)).toEqual(["a", "c"]);
    expect(filterByDay(sessions, "2026-01-01")).toEqual([]);
    expect(filterByDay(sessions, null)).toBe(sessions);
  });
});

describe("withDateParam", () => {
  it("sets, replaces and removes date while keeping other params", () => {
    expect(withDateParam("", "2026-11-08")).toBe("?date=2026-11-08");
    expect(withDateParam("?location=Ericeira&date=2026-01-01", "2026-11-08")).toBe("?location=Ericeira&date=2026-11-08");
    expect(withDateParam("?location=Ericeira&date=2026-01-01", null)).toBe("?location=Ericeira");
    expect(withDateParam("?date=2026-01-01", null)).toBe("");
  });
});
