/**
 * Basemap tiles (CARTO dark). Since 2026-09 CARTO requires an API key on every tile URL,
 * otherwise tiles render an "API KEY REQUIRED" watermark. Free for commercial use up to 1M requests/month.
 * Key: https://carto.com/basemaps/apikey — restrict it to catchmyactions.com in the CARTO dashboard.
 *
 * NEXT_PUBLIC_* is inlined at build time, so the key must be present during `next build`
 * (Docker build arg NEXT_PUBLIC_CARTO_KEY).
 */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

export const DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" +
  (CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : "");

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
