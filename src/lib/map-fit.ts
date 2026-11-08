/** Initial map framing for a set of session markers (pure, Leaflet-free). */

export type LatLng = [number, number];

export type MapView =
  | { kind: "world"; center: LatLng; zoom: number }
  | { kind: "point"; center: LatLng; zoom: number }
  | { kind: "bounds"; bounds: [LatLng, LatLng]; maxZoom: number };

export const WORLD_VIEW = { kind: "world", center: [20, 0], zoom: 2 } as const satisfies MapView;

function valid([lat, lng]: LatLng): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * - no markers: whole world
 * - one spot (or all markers on the same coords): centre on it at `singleZoom`
 * - otherwise: bounds of all markers (south-west, north-east), capped at `maxZoom`
 */
export function fitView(points: LatLng[], opts: { maxZoom?: number; singleZoom?: number } = {}): MapView {
  const maxZoom = opts.maxZoom ?? 12;
  const singleZoom = Math.min(opts.singleZoom ?? 11, maxZoom);
  const pts = points.filter(valid);
  if (pts.length === 0) return WORLD_VIEW;

  let s = pts[0][0], n = pts[0][0], w = pts[0][1], e = pts[0][1];
  for (const [lat, lng] of pts) {
    if (lat < s) s = lat;
    if (lat > n) n = lat;
    if (lng < w) w = lng;
    if (lng > e) e = lng;
  }
  // ~100 m: treat as one spot
  if (n - s < 0.001 && e - w < 0.001) return { kind: "point", center: [(s + n) / 2, (w + e) / 2], zoom: singleZoom };
  return { kind: "bounds", bounds: [[s, w], [n, e]], maxZoom };
}
