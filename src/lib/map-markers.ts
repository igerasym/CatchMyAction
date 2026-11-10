import { escapeHtml } from "@/lib/html";

/**
 * One rule for every session pin on the maps (homepage and Explore):
 * the red square always shows the number of SESSIONS, for a single spot and for a cluster alike.
 * The spot name and photo count appear in a chip next to the square only from LABEL_MIN_ZOOM, so the world view
 * is not covered in labels and a lone spot looks the same as a cluster.
 */
export const LABEL_MIN_ZOOM = 6;

/** Class put on the map container below LABEL_MIN_ZOOM; CSS in globals.css hides `.cma-spot-label` under it. */
export const LABELS_OFF_CLASS = "cma-labels-off";

export function labelsVisible(zoom: number): boolean {
  return zoom >= LABEL_MIN_ZOOM;
}

/** Pixel size of a cluster square for a given number of sessions. */
export function clusterSize(sessions: number): number {
  if (sessions > 20) return 32;
  if (sessions > 5) return 27;
  return 22;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Tooltip / accessible name, e.g. "Cokes: 1 session, 31 photos". */
export function spotTitle(location: string, sessions: number, photos: number): string {
  return `${location}: ${pluralize(sessions, "session", "sessions")}, ${pluralize(photos, "photo", "photos")}`;
}

const MONO = "var(--font-mono),ui-monospace,monospace";
const REC = "#ff4433";
const REC_INK = "#160806";
const BONE = "#f2ede4";

/** Square with the session count. Same look for a spot and a cluster. */
export function countSquareHtml(sessions: number): string {
  const px = clusterSize(sessions);
  return (
    '<span style="display:flex;align-items:center;justify-content:center;width:' + px + "px;height:" + px +
    "px;background:" + REC + ";color:" + REC_INK + ";font:700 11px " + MONO + '">' + sessions + "</span>"
  );
}

/** A spot pin: the session-count square plus a chip "COKES · 31 FRAMES" (the chip hides when zoomed out). */
export function spotMarkerHtml(location: string, sessions: number, photos: number): string {
  return (
    '<div style="display:flex;align-items:center;gap:6px;cursor:pointer;font-family:' + MONO + '">' +
    countSquareHtml(sessions) +
    '<span class="cma-spot-label" style="background:rgba(18,19,21,.85);color:' + BONE +
    ';font-size:10px;letter-spacing:.1em;padding:3px 6px;white-space:nowrap;text-transform:uppercase">' +
    escapeHtml(location) + " · " + pluralize(photos, "frame", "frames") +
    "</span></div>"
  );
}

/** Keep the container class in step with the zoom level. Call once after creating the map. */
export function bindLabelZoom(map: { getZoom(): number; getContainer(): HTMLElement; on(ev: string, fn: () => void): unknown }) {
  const sync = () => map.getContainer().classList.toggle(LABELS_OFF_CLASS, !labelsVisible(map.getZoom()));
  map.on("zoomend", sync);
  sync();
}
