"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { LocateFixed, X } from "lucide-react";
import SpotAutocomplete from "@/app/components/spot-autocomplete";

interface Session {
  id: string;
  title: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  date: string;
  startTime: string;
  endTime: string;
  photoCount: number;
  photographerName: string;
  coverUrl: string | null;
  sportType: string;
  waveHeight: number | null;
  wavePeriod?: number | null;
  windSpeed: number | null;
}

interface Spot {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

interface Props {
  sessions: Session[];
  allSpots: Spot[];
  initialLocation?: string;
}

/** How many sessions to show when no spot is selected. */
const RECENT_LIMIT = 12;

/**
 * Restyles SpotAutocomplete's internal input/dropdown to the Viewfinder input rules
 * without editing that shared component (descendant arbitrary variants win on specificity).
 */
const AUTOCOMPLETE_SKIN = [
  "[&_label]:hidden",
  "[&_input]:rounded-none [&_input]:bg-ink [&_input]:border-line [&_input]:text-bone [&_input]:px-3.5 [&_input]:py-3 [&_input]:text-[15px]",
  "[&_input::placeholder]:text-dim",
  "[&_input:focus]:border-bone [&_input:focus]:ring-0 [&_input:focus]:outline-none",
  "[&_ul]:rounded-none [&_ul]:bg-char-2 [&_ul]:border-line [&_ul]:mt-0",
  "[&_li_button]:py-2.5 [&_li_button:hover]:bg-char-3",
  // hide the emoji type icons rendered by the shared component
  "[&_li_button>span:first-child]:hidden",
  "[&_li_button>span:last-child>span:first-child]:text-bone",
  "[&_li_button>span:last-child>span:nth-child(2)]:text-dim",
].join(" ");

function chips(s: Session): string[] {
  const out: string[] = [];
  if (s.waveHeight != null) out.push(`H ${s.waveHeight.toFixed(1)}m`);
  if (s.wavePeriod != null) out.push(`T ${Math.round(s.wavePeriod)}s`);
  if (s.windSpeed != null) out.push(`${Math.round(s.windSpeed / 1.852)}kn`);
  return out;
}

/** One "session log" row — mirrors src/app/components/home/session-log.tsx */
function LogRow({ s, n }: { s: Session; n: number }) {
  return (
    <li className="border-b border-line">
      <Link
        href={`/sessions/${s.id}`}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[48px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_72px_132px] items-center gap-x-6 gap-y-2 py-5 hover:bg-char/60 transition-colors md:px-2"
      >
        <span className="hidden md:block font-mono text-xs text-dim">{String(n).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="block text-[19px] md:text-[22px] font-extrabold tracking-tight truncate group-hover:text-rec transition-colors" style={{ fontStretch: "110%" }}>
            {s.title}
          </span>
          <span className="md:hidden block text-sm text-mute mt-1">
            {s.location} · {formatDistanceToNowStrict(new Date(s.date))} ago
          </span>
          <span className="hidden md:block font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim mt-1 truncate">
            by {s.photographerName} · {s.startTime}–{s.endTime}
          </span>
        </span>
        <span className="hidden md:block text-sm text-bone/85 truncate">
          {s.location} <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim ml-1">{s.sportType}</span>
        </span>
        <span className="hidden md:flex flex-wrap gap-1.5">
          <span className="font-mono text-[11px] text-mute mr-1">{format(new Date(s.date), "d MMM yyyy")}</span>
          {chips(s).map((c) => (
            <span key={c} className="font-mono text-[10.5px] px-1.5 py-0.5 bg-char-2 text-bone/85">{c}</span>
          ))}
        </span>
        <span className="text-right md:text-left">
          <span className="disp text-2xl md:text-3xl">{String(s.photoCount).padStart(2, "0")}</span>
          <span className="block font-mono text-[10px] tracking-[0.12em] text-dim">FRAMES</span>
        </span>
        <span className="hidden md:block relative aspect-[3/2] bg-char-3 overflow-hidden">
          {s.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.coverUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          )}
          <span className="brk brk-sm brk-hover" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export default function ExploreView({ sessions, allSpots, initialLocation }: Props) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || "");
  const [searchInput, setSearchInput] = useState(initialLocation || "");
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Scroll to top on mount + fly to initial location
  useEffect(() => {
    window.scrollTo(0, 0);
    if (initialLocation) {
      // Find coordinates for the initial location
      const spot = allSpots.find((s) => s.name.toLowerCase() === initialLocation.toLowerCase());
      if (spot) {
        setFlyTo({ lat: spot.lat, lng: spot.lng, zoom: 10 });
      } else {
        // Try matching from sessions
        const session = sessions.find((s) => s.location.toLowerCase().includes(initialLocation.toLowerCase()));
        if (session?.locationLat && session?.locationLng) {
          setFlyTo({ lat: session.locationLat, lng: session.locationLng, zoom: 10 });
        }
      }
    }
  }, []);

  useEffect(() => {
    // @ts-ignore — dynamic import for client-only map component
    import("./explore-map").then((mod: any) => setMapComponent(() => mod.default));
  }, []);

  // Expand search query to match all spots in a region/country
  function expandQuery(query: string): string[] {
    const q = query.toLowerCase();
    const names = new Set<string>();
    names.add(query);
    allSpots.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)) {
        names.add(s.name.toLowerCase());
        names.add(s.region.toLowerCase());
      }
    });
    return [...names];
  }

  // Filter sessions by selected location, sorted by date (newest first)
  const filteredSessions = useMemo(() => {
    if (!selectedLocation) return [];
    const q = selectedLocation.toLowerCase();
    const expanded = expandQuery(selectedLocation);

    return sessions.filter((s) => {
      const loc = s.location.toLowerCase();
      // Match via expanded spots database
      if (expanded.some((term) => loc.includes(term))) return true;
      // Direct text match on session location (handles custom/user-typed locations)
      if (loc.includes(q)) return true;
      // Also check if session location contains any word from the query
      const words = q.split(/[\s,]+/).filter((w) => w.length > 2);
      if (words.some((w) => loc.includes(w))) return true;
      return false;
    });
  }, [sessions, selectedLocation, allSpots]);

  // Map markers — prefer the session's own coordinates, fall back to a spot-name lookup
  const markers = useMemo(() => {
    const spotByName = new Map(allSpots.map((s) => [s.name.toLowerCase(), s]));
    return sessions.flatMap((s) => {
      let lat = s.locationLat;
      let lng = s.locationLng;
      if (lat == null || lng == null) {
        const spot = spotByName.get(s.location.split(",")[0].trim().toLowerCase());
        if (!spot) return [];
        lat = spot.lat;
        lng = spot.lng;
      }
      return [{
        id: s.id,
        title: s.title,
        location: s.location,
        lat,
        lng,
        photoCount: s.photoCount,
        date: s.date,
      }];
    });
  }, [sessions, allSpots]);

  const locationCount = useMemo(() => new Set(sessions.map((s) => s.location)).size, [sessions]);
  const recentSessions = useMemo(() => sessions.slice(0, RECENT_LIMIT), [sessions]);

  const handleSpotSelect = useCallback((location: string) => {
    setSelectedLocation(location);
    setSearchInput(location);
  }, []);

  function clearSelection() {
    setSelectedLocation("");
    setSearchInput("");
  }

  const listed = selectedLocation ? filteredSessions : recentSessions;

  return (
    <div className="-mx-4 -mt-6">
      {/* Section intro + search */}
      <section className="px-4 pt-10 md:pt-14 pb-8">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <p className="hud mb-5">01 / Explore</p>
              <h1 className="disp text-[clamp(40px,6vw,88px)]">
                Find your session<span className="text-rec">.</span>
              </h1>
            </div>
            <p className="font-mono text-xs tracking-[0.12em] text-mute">
              {sessions.length} SESSIONS · {locationCount} LOCATIONS
            </p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setSelectedLocation(searchInput); }}
            className="max-w-3xl"
          >
            <label htmlFor="location" className="hud block mb-2">Spot, region or country</label>
            <div className="flex gap-2 items-stretch">
              <div className={`flex-1 ${AUTOCOMPLETE_SKIN}`}>
                <SpotAutocomplete
                  value={searchInput}
                  onChange={(val) => {
                    setSearchInput(val);
                    setSelectedLocation(val);
                  }}
                  label=""
                  placeholder="Pipeline, Ericeira, Bali…"
                  required={false}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    // Find nearest spot
                    let nearest = allSpots[0];
                    let minDist = Infinity;
                    allSpots.forEach((s) => {
                      const d = Math.pow(s.lat - latitude, 2) + Math.pow(s.lng - longitude, 2);
                      if (d < minDist) { minDist = d; nearest = s; }
                    });
                    if (nearest) handleSpotSelect(nearest.name);
                    setFlyTo({ lat: latitude, lng: longitude, zoom: 8 });
                  });
                }}
                className="inline-flex items-center gap-2 px-4 bg-ink border border-line text-bone font-mono text-[11px] font-bold tracking-[0.12em] uppercase whitespace-nowrap hover:border-bone hover:text-rec focus-visible:border-bone focus-visible:outline-none transition-colors"
                aria-label="Find sessions near me"
                title="Find sessions near me"
              >
                <LocateFixed className="w-4 h-4" aria-hidden="true" />
                Near me
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Map */}
      <div className="border-y border-line bg-ink" style={{ height: "45vh", minHeight: 320 }}>
        {MapComponent ? (
          <MapComponent
            markers={markers}
            allSpots={allSpots}
            onSpotClick={handleSpotSelect}
            selectedLocation={selectedLocation}
            flyTo={flyTo}
          />
        ) : (
          <div className="w-full h-full bg-ink flex items-center justify-center">
            <p className="hud animate-pulse">Loading map…</p>
          </div>
        )}
      </div>

      {/* Sessions below map */}
      <section className="px-4 py-14 md:py-20">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div className="min-w-0">
              <p className="hud mb-5">{selectedLocation ? "02 / Spot" : "02 / Latest"}</p>
              <h2 className="disp text-[clamp(30px,4.2vw,60px)] break-words">
                {selectedLocation ? selectedLocation : "Fresh off the card"}
                <span className="text-rec">.</span>
              </h2>
            </div>
            <div className="flex items-center gap-5">
              <p className="font-mono text-xs tracking-[0.12em] text-mute">
                {selectedLocation
                  ? `${filteredSessions.length} SESSION${filteredSessions.length === 1 ? "" : "S"}`
                  : `LATEST ${recentSessions.length} OF ${sessions.length}`}
              </p>
              {selectedLocation && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-mute hover:text-rec transition-colors"
                  aria-label="Clear selected spot"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                </button>
              )}
            </div>
          </div>

          {listed.length === 0 ? (
            <div className="relative border-t border-line py-16 md:py-20 px-2">
              <p className="hud mb-4">00 frames</p>
              <h3 className="disp text-[clamp(26px,3.2vw,44px)] mb-4">
                No photos here yet<span className="text-rec">.</span>
              </h3>
              <p className="text-mute max-w-xl mb-8">
                {selectedLocation
                  ? `Nobody has shot ${selectedLocation} yet. Try a nearby spot on the map, or check back after your next session.`
                  : "No sessions have been published yet. Check back after your next session."}
              </p>
              {selectedLocation && (
                <button type="button" onClick={clearSelection} className="btn-sec">
                  Show latest sessions
                </button>
              )}
            </div>
          ) : (
            <ul className="border-t border-line">
              {listed.map((s, i) => (
                <LogRow key={s.id} s={s} n={listed.length - i} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
