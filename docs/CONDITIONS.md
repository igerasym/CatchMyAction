# Session conditions: data sources

How CatchMyAction gets the sea conditions shown on a session page, and the planned replacement for
when the product becomes commercial. Written for the next agent; facts below were checked on
2026-11-07 unless marked "not verified".

## How it works today

- Sessions store one hour of conditions in `Session` (`waveHeight` m, `wavePeriod` s,
  `waveDirection` deg, `windSpeed` km/h, `windDirection` deg, `waterTemp` °C).
- `POST /api/sessions` (`src/app/api/sessions/route.ts`) calls `fetchMarineConditions(lat, lng, date, hour)`
  from `src/lib/marine-conditions.ts` for water sports, using the session start hour.
- `PATCH /api/sessions/:id` recomputes them (rules in `src/lib/session-conditions.ts`) when the session ends up with
  a place and either nothing was ever stored, or the place, the day or the start hour changed. If the location is
  cleared or cannot be geocoded the stored values are cleared too, so they never describe another place.
- **Spot not in the catalogue.** Where the coordinates come from: a spot picked from the suggestions, else an exact
  catalogue name match, else Nominatim, else none. With none, `POST` creates the session without coordinates and
  answers `needsLocation`; the form shows the "Pin location on map" dialog and the pin goes through `PATCH`, which now
  computes the conditions (before, a pinned session never got any). `resolveSpotForCoords` then links the nearest
  catalogue spot (a spot named in the text within 30 km, else within 500 m) or creates a new `Spot` with
  `source: "session"`, `accuracy: "exact"`.
- **Publishing needs a place.** `PATCH ... {published: true}` on a draft without coordinates answers 400 with
  `needsLocation: true`; the dashboard and the upload page open the pin dialog instead of just showing an error.
  Sessions that are already live without coordinates are not affected.
- Known weak spot: Nominatim often lands on the town instead of the break. A pin is the reliable way, and the
  nearest sea cell of the weather model is used for whatever point we send.
- `fetchMarineConditions` delegates to `getConditionsProvider()` in `src/lib/conditions/index.ts`.
  That is the only place that picks the source. Providers implement `ConditionsProvider`
  (`src/lib/conditions/types.ts`) and must never throw.
- Lookups are by coordinates only. No data source knows spot names; the spot -> coordinates mapping is ours.
- The UI (`src/app/sessions/[id]/conditions.tsx`) shows the provider's `attribution` line under the grid.

## Current source: Open-Meteo (free API)

- Marine: `marine-api.open-meteo.com/v1/marine` -> `wave_height`, `wave_period`, `wave_direction`,
  `sea_surface_temperature`. Weather: `api.open-meteo.com/v1/forecast` -> `wind_speed_10m` (km/h),
  `wind_direction_10m`.
- Covers every spot we tried (Supertubos, Batu Bolong, Bali) and snaps to its own nearest sea cell.
- Also offers `sea_level_height_msl` (Batu Bolong 2026-11-07: -0.37 m to 1.4 m over the day). Candidate for
  a tide chart; whether it includes tides was not verified in their docs.
- Licence ([terms](https://open-meteo.com/en/terms)): data is CC BY 4.0 (credit line required). The free API
  is non-commercial only. Their examples of commercial use: sites or apps with subscriptions or ads,
  commercial products. Limits: 10,000 calls/day, 5,000/hour, 600/minute.

**Switch trigger:** before CatchMyAction takes payments or shows ads, either move to the plan below or buy an
Open-Meteo commercial plan. Do not ship payments on the free tier.

## Plan B: Copernicus Marine + NOAA GFS (free, commercial use)

Not implemented in the app. Prototypes were run outside the repo on 2026-11-07.

| Value | Source | Dataset | Grid | Latency | Coverage |
|---|---|---|---|---|---|
| Waves Hs / Tp / dir | Copernicus Marine | `cmems_mod_glo_wav_anfc_0.083deg_PT3H-i` (GLOBAL_ANALYSISFORECAST_WAV_001_027), vars `VHM0`, `VTPK`, `VMDR` | ~9 km, 3-hourly | same day | global |
| Water temp, Atlantic/Iberia | Copernicus Marine | `cmems_mod_ibi_phy_anfc_0.027deg-2D_PT1H-m` (IBI), var `thetao` (surface) | ~3 km, hourly | same day | IBI box only, not Bali |
| Water temp, elsewhere | Copernicus Marine | `cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i` (GLOBAL_ANALYSISFORECAST_PHY_001_024), `thetao` at 0.49 m | ~9 km, 6-hourly | same day | global |
| Wind 10 m, air temp 2 m | NOAA GFS 0.25° | public bucket `noaa-gfs-bdp-pds` on AWS (`gfs.YYYYMMDD/HH/atmos/gfs.tHHz.pgrb2.0p25.fFFF`) | ~25 km, cycles 00/06/12/18z | a few hours | global |

### Licences

- NOAA/NWS: public domain, "may be used without charge for any lawful purpose" if you don't claim it as yours,
  imply NOAA endorsement, or present modified data as official ([NWS disclaimer](https://www.weather.gov/disclaimer)).
- Copernicus Marine: "free, full and open" with attribution. Credit for a derived product:
  "Generated using E.U. Copernicus Marine Service Information" + product DOI
  ([citation guide](https://help.marine.copernicus.eu/en/articles/4444611-how-to-cite-copernicus-marine-products-and-services)).
  **The full Copernicus Marine Licence Agreement has not been read yet. Read it before launch.**
  DOIs: waves reanalysis WAVERYS = 10.48670/moi-00022. Other DOIs: take them from each product page (the API didn't return them).

### Validation done (2026-11-07)

Supertubos (39.3433, -9.3711), 09:00 UTC: Copernicus NRT 0.82 m / 11.0 s / 263°, water 16.4 °C (IBI).
User-supplied Surf-Forecast for the same day: 0.8 m, SW->SSW, water 16.7 °C. Heights and water agree.
Copernicus period rose to 11-14 s during the day while Surf-Forecast said 6 s, so period is the least
certain value.

Batu Bolong (-8.6533, 115.1267), 09:00 UTC: Copernicus 1.32 m / 15.5 s / 212°, water ~29.8 °C (global);
Open-Meteo 1.32 m / 12.8 s / 212°, water 29.8 °C; GFS wind 7.2 kt from 184°, Open-Meteo 5.8 kt from 210°.
Copernicus and Open-Meteo wave heights and directions match. Periods differ, probably a different
period definition (not verified).

### Gotchas found

- **Nearest grid node is often on land** for coastal and island spots (Batu Bolong, Supertubos IBI). Pick the
  nearest cell that has data at any time step, search ~±0.3° for waves and ±0.1° for IBI, and store the
  distance in km so the UI can say "estimate for the area".
- `GLOBAL_MULTIYEAR_WAV_001_032` (WAVERYS reanalysis, from 1980) **ends 2026-08-31**. Use the `anfc` (NRT)
  dataset for recent sessions.
- ERA5 (CDS) was rejected: about 5 days of latency (on 2026-11-07 the latest data was 2026-11-02 17:00),
  and a session published a day later would have no wind.
- Copernicus Marine has no wind forecast product.
- GFS: fetch the `.idx` file, then HTTP Range-request only the `UGRD`/`VGRD` "10 m above ground" and
  `TMP` "2 m above ground" messages (a few KB instead of ~500 MB). Read with `cfgrib` + `eccodes`.
  Longitudes are 0-360. The latest cycle may not be published yet; fall back to the previous one.
  Wind direction-from = `(atan2(-u, -v) in degrees + 360) % 360`. Speed kt = `hypot(u, v) * 1.944`.
- GFS bucket history: `.../gfs.20230101/00/atmos/...` exists; `gfs.20210301` returned 404 on that path
  (older layout probably differs, not verified).
- Copernicus access: free account, `copernicusmarine login` (credentials in `~/.copernicusmarine`),
  Python package `copernicusmarine`. On the server, keep credentials in env/secret storage, not in the repo.
- Tide: no free global archival tide source with commercial use confirmed yet (FES2022/TPXO licence terms
  not checked). Out of MVP.

### Implementation sketch for when we switch

The app is Next.js/TypeScript; Copernicus data is NetCDF and GFS is GRIB2, so do it as a small Python job,
not in the API route:

1. On session publish, enqueue `(sessionId, lat, lng, date, startHour, endHour)`.
2. A Python worker pulls Copernicus waves (+ IBI or global water) and GFS wind/air for the whole day,
   picks the nearest valid sea cell, and writes hourly rows plus `distance_km` and source ids.
3. Add a `ConditionsProvider` that reads those stored rows, return it from `getConditionsProvider()`, and
   change the attribution line to Copernicus Marine + NOAA.
4. Hourly rows for the whole day also enable the planned tide/day chart with the session window highlighted.
