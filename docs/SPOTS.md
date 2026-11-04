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
