"use client";

import { useMemo, useState } from "react";
import { Crosshair, MapPin, Search, X } from "lucide-react";
import {
  distanceLabel,
  haversineKm,
  searchSpots,
  sortByDistance,
  type SpotGroup,
  type SpotWithDistance,
} from "@/lib/find-me-spots";

const SHOWN = 5;
/** Beyond this the "nearest" spot is not really near: say so instead of implying it is */
const FAR_KM = 150;

/**
 * First step of "Find my photos": where were you? Searching only the sessions around that place keeps results
 * relevant (no Maldives photos for someone in Portugal) and each search cheap. "Near me" asks the browser once;
 * otherwise search by name.
 */
export default function PlacePicker({ groups, onPick }: { groups: SpotGroup[]; onPick: (g: SpotGroup) => void }) {
  const [query, setQuery] = useState("");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "asking" | "denied" | "unavailable">("idle");

  const ranked: SpotWithDistance[] = useMemo(() => {
    if (query.trim()) {
      return searchSpots(groups, query).map((g) => ({
        ...g,
        km: here && g.lat !== null && g.lng !== null ? haversineKm(here.lat, here.lng, g.lat, g.lng) : null,
      }));
    }
    return here ? sortByDistance(groups, here) : groups.map((g) => ({ ...g, km: null }));
  }, [groups, query, here]);

  function nearMe() {
    if (!navigator.geolocation) return setGeo("unavailable");
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setQuery("");
        setGeo("idle");
      },
      () => setGeo("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }

  const shown = query.trim() ? ranked.slice(0, 8) : ranked.slice(0, SHOWN);
  const nearest = here && !query.trim() ? ranked[0] : null;
  const farAway = nearest?.km != null && nearest.km > FAR_KM;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search for a spot</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a spot, e.g. Cloud 9"
            className="w-full bg-ink border border-line pl-9 pr-9 py-3 text-sm text-bone placeholder:text-dim focus:outline-none focus:border-bone"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center text-mute hover:text-bone">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <button type="button" onClick={nearMe} disabled={geo === "asking"} className="btn-sec !py-3 !px-4 !text-sm shrink-0 disabled:opacity-60">
          <Crosshair className="w-4 h-4" aria-hidden="true" /> {geo === "asking" ? "Locating…" : "Near me"}
        </button>
      </div>

      {geo === "denied" && <p className="text-[13px] text-mute">Location is off for this site. Search for your spot instead.</p>}
      {geo === "unavailable" && <p className="text-[13px] text-mute">This browser can&apos;t share a location. Search for your spot instead.</p>}
      {farAway && (
        <p className="text-[13px] text-mute">
          No sessions within {FAR_KM} km of you. These are the closest spots with photos:
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-mute py-4">
          No spot matches &ldquo;{query}&rdquo; yet. Try another name, or check back after photographers publish new sessions.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line" aria-label="Spots with photos">
          {shown.map((g) => (
            <li key={g.key}>
              <button type="button" onClick={() => onPick(g)}
                className="w-full flex items-center gap-3 py-3 text-left hover:bg-char-3 transition-colors px-1">
                <MapPin className="w-4 h-4 text-rec shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-bone truncate">{g.name}</span>
                  <span className="block font-mono text-[11px] tracking-[0.04em] text-dim truncate">
                    {g.place ? `${g.place} · ` : ""}{g.sessions.length} session{g.sessions.length === 1 ? "" : "s"}
                  </span>
                </span>
                {g.km !== null && <span className="font-mono text-[11px] text-mute shrink-0">{distanceLabel(g.km)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!query.trim() && ranked.length > SHOWN && (
        <p className="font-mono text-[11px] tracking-[0.04em] text-dim">Search to see {ranked.length - SHOWN} more spots.</p>
      )}
    </div>
  );
}
