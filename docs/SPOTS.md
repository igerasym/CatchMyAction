# Spot catalogue

Spots live in the `Spot` table (not in code). Sessions point to a spot via `Session.spotId`;
`Session.location / locationLat / locationLng` stay as the display copy.

## Sources (column `source`)
| source | what | dedup |
|---|---|---|
| `curated` | hand-verified files `prisma/spots/curated-*.json` (e.g. Maldives, 16 breaks) | by `sourceId` / same name only — neighbouring breaks on one island are kept |
| `manual` | the old hand-written list, `prisma/spots/legacy-manual.json` (317, approx coords) | 500 m or same name within 5 km |
| `session` | created from a photographer's session (pin / geocoded free text) | 500 m |
| `<any>` | external catalogue imported with `scripts/import-spots.ts --source <name>` (e.g. a BrizoCast export) | 500 m or same name within 5 km; re-import by `sourceId` is idempotent |

`accuracy`: `exact` (pin / known point) · `island` (island-level, break is on the nearby reef) · `approx`.

### Sport-aware dedup (since 2026-11-08)
The importer compares a new spot only with existing spots that share a sport with it (new rows default to `["surf"]`),
so a skate park on the same promenade does not block a surf break. If either side has no `sports` recorded they are
treated as overlapping. Rules: within 500 m, or the same normalised name within 5 km.

### Catalogue size and the maps
The catalogue holds thousands of spots, so nothing may load it whole into the browser.
- Home and `/sessions` get `mapSpots()` (`src/lib/spots.ts`): a bounded sample (`thinForMap`, `src/lib/map-spots.ts`, cap 600).
  Spots with a published session, and `curated` ones, are always included; the rest is one spot per grid cell.
- `GET /api/spots` returns that same sample. Use `/api/spots/autocomplete?q=&sport=` to search; it counts real
  matches per country/region and lists spots for the given sport first.

## Commands
Local (repo root): `npx tsx scripts/seed-spots.ts [--relink]` · `npx tsx scripts/import-spots.ts file.json --source NAME [--dry-run] [--update]`

Production (scripts are compiled into the image as `scripts/dist/*.js`):
```bash
# seed / relink sessions (idempotent)
docker exec app-app-1 node scripts/dist/seed-spots.js [--relink]

# import a catalogue file — ALWAYS --dry-run first
docker cp surf_spots.json app-app-1:/tmp/spots.json
docker exec app-app-1 node scripts/dist/import-spots.js /tmp/spots.json --source surfline --dry-run
docker exec app-app-1 node scripts/dist/import-spots.js /tmp/spots.json --source surfline
```

## Import file format
JSON array. Accepts BrizoCast's `data/surf_spots.json` (`SurfSpot`) as-is:
```json
[{ "spot_key": "surfline-cokes-abc123", "name": "Cokes", "lat": 4.3734, "lon": 73.6485,
   "country": "Maldives", "region": "North Malé Atoll" }]
```
Also accepted: `lng` instead of `lon`, `sourceId`/`id` instead of `spot_key`, optional `sports`, `accuracy`.

## Popular surf regions (centre lat, lon · radius km) — for building a catalogue file
| Region | lat | lon | km |
|---|---|---|---|
| Maldives — North & South Malé | 4.10 | 73.50 | 60 |
| Maldives — Central / Southern atolls | 1.50 | 73.30 | 150 |
| Philippines — Siargao | 9.85 | 126.10 | 40 |
| Philippines — La Union / Baler | 16.00 | 120.80 | 120 |
| Indonesia — Bali | -8.70 | 115.15 | 50 |
| Indonesia — Lombok / Sumbawa | -8.80 | 116.80 | 120 |
| Indonesia — Mentawai | -2.20 | 99.80 | 120 |
| Sri Lanka — South & East coast | 6.60 | 81.20 | 150 |
| Poland — Baltic (Hel / Chałupy / Gdańsk) | 54.60 | 18.60 | 60 |
| Portugal — Ericeira / Peniche / Nazaré | 39.20 | -9.30 | 80 |
| Portugal — Algarve | 37.05 | -8.80 | 60 |
| Spain — Basque Country / Cantabria | 43.40 | -3.00 | 120 |
| Spain — Canary Islands | 28.30 | -15.60 | 200 |
| France — Hossegor / Biarritz | 43.60 | -1.45 | 50 |
| Morocco — Taghazout / Imsouane | 30.60 | -9.70 | 80 |
| UK — Cornwall | 50.30 | -5.10 | 80 |
| Ireland — West coast | 53.50 | -9.70 | 150 |
| Costa Rica — Guanacaste / Nicoya | 9.90 | -85.60 | 120 |
| Mexico — Oaxaca / Puerto Escondido | 15.86 | -97.07 | 80 |
| USA — Hawaii (Oahu / Maui) | 21.20 | -157.50 | 150 |
| USA — California (SoCal) | 33.50 | -117.80 | 150 |
| Australia — Gold Coast / Byron | -28.30 | 153.50 | 80 |
| South Africa — Jeffreys Bay | -34.05 | 24.93 | 50 |

## Import log

### 2026-11-08 — BrizoCast surf catalogue (`source = brizocast`)
The site is surf-first for now. The old hand-written surf list was replaced by a fresh catalogue.
- **Before:** 327 spots. **Deleted:** the 87 `manual` spots whose only sport was `surf`. **Kept:** 16 `curated` Maldives breaks,
  2 `session` spots, 11 `manual` spots that mix surf with other sports (Cabarete, Lisbon, …) and all non-surf spots (kite, skate, ski, MTB, …).
- **Imported:** 8,481 new spots (9,105 in the file, 624 skipped as duplicates) → **8,721 spots**. All tagged `sports = ["surf"]`.
- **What was taken:** facts only — name, coordinates, country, region. Source-catalogue ids were replaced with our own (`bc-<name>-<hash>`).
- **Checked before import:** country against coordinates (7 border cases only), land/sea mask, exact duplicates, and a sample against Wikipedia.
  Held back as probably wrong coordinates: `Hiliduha` (placeholder 1.0/98.0), `Outer Waters`, `Kouminkan`, `La Caffrine`.
  Left out on purpose: `Colas` (same break as our curated `Cokes`).
- **Sessions:** the 4 `Cloud 9` sessions were re-attached to the new `Cloud 9` (Siargao); all 9 sessions have a spot.
- **Known soft spots:**
  - `region` is mostly the nearest town, not an area (40% of rows sit in a "region" of 1–2 spots), so region filters and
    "N spots" region suggestions are noisy. A real administrative area can be derived from the coordinates later.
  - The 500 m rule skipped ~540 spots inside the batch that may be genuinely separate neighbouring breaks (Japan, USA,
    Australia, Brazil mostly). Re-import with a smaller radius would add them; `sourceId` makes re-imports idempotent.
  - `Furana` sits 540 m from curated `Tombstones`; both were imported (possibly the same break).
- **Roll back the import:** `DELETE FROM "Spot" WHERE source = 'brizocast';` (sessions that pointed at them get `spotId = NULL`),
  then restore the 87 old spots from the pre-import dump `~/backups/catchmyaction-2026-11-08T092959Z.sql.gz` if needed.
