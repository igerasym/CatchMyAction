/**
 * Thinning of the spot catalogue for map background dots.
 *
 * The catalogue has thousands of spots. The home page and /sessions used to pass the whole list to the
 * browser (props in the HTML, then one Leaflet marker per spot). That was fine at a few hundred rows and
 * is not at ~9,000. The background dots are decoration, so we send a bounded, even sample instead:
 * every "pinned" spot (it has a session, or it is hand-curated) plus one spot per grid cell, with cells
 * growing until the total fits.
 */

export interface MapSpot {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

export interface MapSpotInput extends MapSpot {
  /** Always kept: has a published session, or is a hand-curated break. */
  pinned?: boolean;
}

export const MAP_SPOT_CAP = 600;
const START_CELL_DEG = 0.5;
const MAX_CELL_DEG = 16;

function thinOnce(spots: MapSpotInput[], cell: number): MapSpotInput[] {
  const kept: MapSpotInput[] = [];
  const taken = new Set<string>();
  // Stable order: pinned first, then by name, so the same input always gives the same output.
  const ordered = [...spots].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name));
  for (const s of ordered) {
    if (s.pinned) {
      kept.push(s);
      taken.add(`${Math.floor(s.lat / cell)}:${Math.floor(s.lng / cell)}`);
      continue;
    }
    const key = `${Math.floor(s.lat / cell)}:${Math.floor(s.lng / cell)}`;
    if (taken.has(key)) continue; // a pinned spot or an earlier spot already marks this cell
    taken.add(key);
    kept.push(s);
  }
  return kept;
}

/** At most `cap` spots (pinned spots are never dropped, so the result can exceed `cap` only by their number). */
export function thinForMap(spots: MapSpotInput[], cap = MAP_SPOT_CAP): MapSpot[] {
  let cell = START_CELL_DEG;
  let out = thinOnce(spots, cell);
  while (out.length > cap && cell < MAX_CELL_DEG) {
    cell *= 2;
    out = thinOnce(spots, cell);
  }
  return out.map(({ name, region, country, lat, lng }) => ({ name, region, country, lat, lng }));
}
