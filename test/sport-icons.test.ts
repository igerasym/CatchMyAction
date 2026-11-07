import { describe, expect, it } from "vitest";
import { sportIconPath } from "@/lib/sport-icons";

// Every sport offered in the session form must either have a pictogram or be deliberately blank.
const FORM_SPORTS = [
  "surf", "kite", "windsurf", "wakeboard", "skate", "mtb", "moto", "ski", "snowboard", "marathon",
  "triathlon", "cycling", "climbing", "crossfit", "parkour", "kayak", "diving",
];

describe("sportIconPath", () => {
  it("has a pictogram for every sport in the session form", () => {
    for (const sport of FORM_SPORTS) expect(sportIconPath(sport), sport).toMatch(/^[Mm]/); // a relative "m" start is valid SVG
  });

  it("ignores case", () => {
    expect(sportIconPath("SURF")).toBe(sportIconPath("surf"));
  });

  it("returns null for 'other' and unknown sports, so the UI falls back to text only", () => {
    expect(sportIconPath("other")).toBeNull();
    expect(sportIconPath("curling")).toBeNull();
  });
});
