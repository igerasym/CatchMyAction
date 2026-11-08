import { describe, expect, it } from "vitest";
import { fitView, WORLD_VIEW } from "@/lib/map-fit";

describe("fitView", () => {
  it("shows the world when there are no markers", () => {
    expect(fitView([])).toEqual(WORLD_VIEW);
  });

  it("centres on a single marker", () => {
    expect(fitView([[38.96, -9.42]])).toEqual({ kind: "point", center: [38.96, -9.42], zoom: 11 });
  });

  it("treats markers on the same spot as one", () => {
    const v = fitView([[38.96, -9.42], [38.9601, -9.4201]]);
    expect(v.kind).toBe("point");
  });

  it("fits bounds around several markers, capped at max zoom 12", () => {
    expect(fitView([[38.96, -9.42], [-8.8, 115.1], [21.66, -158.05]])).toEqual({
      kind: "bounds",
      bounds: [[-8.8, -158.05], [38.96, 115.1]],
      maxZoom: 12,
    });
  });

  it("drops invalid coordinates", () => {
    expect(fitView([[NaN, 0], [200, 10], [38.96, -9.42]])).toEqual({ kind: "point", center: [38.96, -9.42], zoom: 11 });
    expect(fitView([[NaN, NaN]])).toEqual(WORLD_VIEW);
  });

  it("never zooms a single spot past maxZoom", () => {
    expect(fitView([[1, 1]], { maxZoom: 8, singleZoom: 11 })).toMatchObject({ zoom: 8 });
  });
});
