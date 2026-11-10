/** Every session pin shows the number of sessions; the name chip only appears when zoomed in. */
import { describe, expect, it } from "vitest";
import {
  bindLabelZoom,
  clusterSize,
  countSquareHtml,
  LABEL_MIN_ZOOM,
  LABELS_OFF_CLASS,
  labelsVisible,
  spotMarkerHtml,
  spotTitle,
} from "@/lib/map-markers";

describe("map markers", () => {
  it("a single-session spot shows 1, not its photo count", () => {
    const html = spotMarkerHtml("Cokes", 1, 31);
    expect(html).toContain(">1</span>");
    expect(html).not.toContain(">31</span>");
    expect(html).toContain("Cokes · 31 frames");
  });

  it("spot and cluster use the same square for the same session count", () => {
    expect(spotMarkerHtml("Cokes", 4, 120)).toContain(countSquareHtml(4));
    expect(clusterSize(1)).toBe(22);
    expect(clusterSize(6)).toBe(27);
    expect(clusterSize(21)).toBe(32);
  });

  it("puts the spot name in a chip that CSS can hide", () => {
    expect(spotMarkerHtml("Cokes", 1, 31)).toContain('class="cma-spot-label"');
  });

  it("escapes the location", () => {
    expect(spotMarkerHtml("<b>x</b>", 1, 1)).not.toContain("<b>x</b>");
  });

  it("titles are readable and pluralised", () => {
    expect(spotTitle("Cokes", 1, 1)).toBe("Cokes: 1 session, 1 photo");
    expect(spotTitle("Cokes", 2, 31)).toBe("Cokes: 2 sessions, 31 photos");
  });

  it("hides labels below the zoom threshold and follows zoom changes", () => {
    expect(labelsVisible(LABEL_MIN_ZOOM - 1)).toBe(false);
    expect(labelsVisible(LABEL_MIN_ZOOM)).toBe(true);

    const classes = new Set<string>();
    let zoom = 2;
    let onZoom = () => {};
    const map = {
      getZoom: () => zoom,
      getContainer: () => ({ classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } }) as unknown as HTMLElement,
      on: (_ev: string, fn: () => void) => { onZoom = fn; },
    };
    bindLabelZoom(map);
    expect(classes.has(LABELS_OFF_CLASS)).toBe(true);
    zoom = LABEL_MIN_ZOOM + 2;
    onZoom();
    expect(classes.has(LABELS_OFF_CLASS)).toBe(false);
  });
});
