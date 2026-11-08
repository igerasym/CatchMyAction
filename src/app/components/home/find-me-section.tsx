"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, ScanFace, Lock, ArrowRight, Search, Crosshair, X } from "lucide-react";
import {
  distanceLabel,
  groupSpots,
  haversineKm,
  searchSpots,
  sessionChipLabel,
  sortByDistance,
  type FindMeSession,
  type SpotGroup,
  type SpotWithDistance,
} from "@/lib/find-me-spots";

export type { FindMeSession } from "@/lib/find-me-spots";

const SHOWN_SPOTS = 5;
const SHOWN_DAYS = 8;
/** Beyond this the "nearest" spot is not really near: say so instead of implying it is */
const FAR_KM = 150;

/**
 * Homepage Find Me, spot first. Nothing is preselected: the visitor searches a spot (or taps Near me), picks a day,
 * then jumps to that session with the selfie dialog open (?findme=1). Only spots that have published sessions are
 * offered. The right side previews the chosen session's frames, framed the way matches are shown.
 */
export default function FindMeSection({ sessions }: { sessions: FindMeSession[] }) {
  const groups = useMemo(() => groupSpots(sessions), [sessions]);
  const [query, setQuery] = useState("");
  const [spotKey, setSpotKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "asking" | "denied" | "unavailable">("idle");
  // Browser clock for "Today" / "Yesterday"; null on the server so the first render matches
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const spot = groups.find((g) => g.key === spotKey) ?? null;
  const session = spot?.sessions.find((s) => s.id === sessionId) ?? spot?.sessions[0] ?? null;

  const ranked: SpotWithDistance[] = useMemo(() => {
    if (query.trim()) {
      return searchSpots(groups, query).map((g) => ({
        ...g,
        km: here && g.lat !== null && g.lng !== null ? haversineKm(here.lat, here.lng, g.lat, g.lng) : null,
      }));
    }
    return here ? sortByDistance(groups, here) : groups.map((g) => ({ ...g, km: null }));
  }, [groups, query, here]);

  function pickSpot(g: SpotGroup) {
    setSpotKey(g.key);
    setSessionId(g.sessions[0].id);
  }
  function clearSpot() {
    setSpotKey(null);
    setSessionId(null);
  }
  function nearMe() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo("unavailable");
      return;
    }
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lng: p.coords.longitude });
        setQuery("");
        setGeo("idle");
      },
      () => setGeo("denied"),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }

  const nearest = here && !query.trim() ? ranked[0] : null;
  const nearestFar = nearest?.km != null && nearest.km > FAR_KM;
  const shown = session ? session.thumbs.slice(0, 5) : [];
  const more = session ? Math.max(0, session.photoCount - shown.length) : 0;

  return (
    <section id="find-me" className="px-5 md:px-12 py-20 md:py-28 scroll-mt-16">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid md:grid-cols-12 gap-8 items-end mb-12 md:mb-14">
          <div className="md:col-span-8">
            <p className="hud mb-5 flex items-center gap-2.5">
              <span className="rec-dot" /> 01 / Find me
            </p>
            <h2 className="disp text-[clamp(40px,6vw,84px)]">
              Point us at the session.
              <br />
              <span className="text-mute">We&apos;ll find you in it.</span>
            </h2>
          </div>
          <p className="md:col-span-4 text-mute leading-relaxed">
            Your selfie is only used for the search and isn&apos;t kept.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* control panel */}
          <div className="lg:col-span-4 relative bg-char-2 p-6 md:p-7">
            <div className="brk brk-sm brk-soft" aria-hidden="true" />
            <div className="flex justify-between hud mb-6">
              <span>Scan setup</span>
              <span>3 steps</span>
            </div>

            {/* 01 · Where */}
            <div className="border-t border-line pt-5">
              <span className="hud block mb-3">01 · Where</span>

              {spot ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-rec shrink-0 mt-1" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-bone leading-snug">{spot.name}</p>
                    {spot.place && <p className="text-xs text-mute mt-0.5">{spot.place}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={clearSpot}
                    className="shrink-0 inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.1em] text-mute hover:text-bone min-h-[36px] px-1"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" /> CHANGE
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <label className="relative flex-1 min-w-0">
                      <span className="sr-only">Search a spot</span>
                      <Search className="w-4 h-4 text-dim absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                      <input
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search a spot…"
                        autoComplete="off"
                        className="w-full bg-ink border border-line pl-9 pr-3 py-3 text-[15px] text-bone placeholder:text-dim focus:outline-none focus:border-bone"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={nearMe}
                      disabled={geo === "asking"}
                      className="shrink-0 inline-flex items-center gap-2 px-3 border border-line text-sm font-semibold text-bone hover:border-mute disabled:opacity-60"
                    >
                      <Crosshair className="w-4 h-4" aria-hidden="true" />
                      {geo === "asking" ? "Locating…" : "Near me"}
                    </button>
                  </div>

                  {geo === "denied" && (
                    <p role="status" className="text-xs text-mute mt-2">
                      Location is blocked in this browser. Search by spot name instead.
                    </p>
                  )}
                  {geo === "unavailable" && (
                    <p role="status" className="text-xs text-mute mt-2">
                      This device can&apos;t share its location. Search by spot name instead.
                    </p>
                  )}
                  {nearestFar && (
                    <p role="status" className="text-xs text-mute mt-2">
                      No sessions near you yet. The closest spot is {distanceLabel(nearest!.km!)} away.
                    </p>
                  )}

                  <ul className="mt-3 space-y-1" aria-label={query.trim() ? "Matching spots" : here ? "Spots near you" : "Latest spots"}>
                    {ranked.slice(0, SHOWN_SPOTS).map((g) => (
                      <li key={g.key}>
                        <button
                          type="button"
                          onClick={() => pickSpot(g)}
                          className="w-full text-left flex items-center gap-3 px-3 py-2.5 bg-ink hover:bg-char-3 transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-mute shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-bone truncate">{g.name}</span>
                            <span className="block text-xs text-mute truncate">
                              {g.place ? `${g.place} · ` : ""}
                              {g.sessions.length} {g.sessions.length === 1 ? "session" : "sessions"}
                            </span>
                          </span>
                          {g.km != null && (
                            <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-dim">{distanceLabel(g.km)}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {ranked.length === 0 && (
                    <p role="status" className="text-sm text-mute mt-3">
                      No sessions at &ldquo;{query.trim()}&rdquo; yet.{" "}
                      <Link href="/sessions" className="text-bone underline underline-offset-2">
                        Browse all sessions
                      </Link>
                    </p>
                  )}
                  {ranked.length > SHOWN_SPOTS && (
                    <p className="text-xs text-dim mt-2">
                      +{ranked.length - SHOWN_SPOTS} more. Type a name to narrow it down.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 02 · When */}
            <div className="border-t border-line pt-5 mt-5">
              <span className="hud block mb-3">02 · When</span>
              {spot ? (
                <>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Sessions at ${spot.name}`}>
                    {spot.sessions.slice(0, SHOWN_DAYS).map((s) => {
                      const on = s.id === session?.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSessionId(s.id)}
                          className={`px-3 py-2 font-mono text-[12px] tracking-[0.04em] border transition-colors ${
                            on ? "bg-rec text-rec-ink border-rec font-bold" : "border-line text-bone hover:border-mute"
                          }`}
                        >
                          {sessionChipLabel(s, now)}
                        </button>
                      );
                    })}
                  </div>
                  {spot.sessions.length > SHOWN_DAYS && (
                    <p className="text-xs text-mute mt-3">
                      {spot.sessions.length - SHOWN_DAYS} earlier sessions at this spot.{" "}
                      <Link href={`/sessions?location=${encodeURIComponent(spot.name)}`} className="text-bone underline underline-offset-2">
                        See all
                      </Link>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-dim">Pick a spot first.</p>
              )}
            </div>

            {/* 03 · Selfie */}
            <div className="border-t border-line pt-5 mt-5">
              <span className="hud block mb-3">03 · Selfie</span>
              <p className="text-sm text-mute leading-relaxed">
                Front camera or upload. Good light, no sunglasses.
              </p>
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-dim">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" /> NOT STORED
              </p>
            </div>

            {session ? (
              <Link href={`/sessions/${session.id}?findme=1`} className="btn-rec w-full justify-center mt-7">
                <ScanFace className="w-5 h-5" aria-hidden="true" />
                Scan {session.photoCount} frames
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="btn-rec w-full justify-center mt-7 opacity-40 cursor-not-allowed"
              >
                <ScanFace className="w-5 h-5" aria-hidden="true" />
                {spot ? "Pick a day" : "Pick a spot to start"}
              </button>
            )}
          </div>

          {/* contact sheet / teaser */}
          <div className="lg:col-span-8 bg-ink p-5 md:p-6">
            {session ? (
              <>
                <div className="flex flex-wrap justify-between gap-2 mb-4 font-mono text-[11px] tracking-[0.12em] text-mute">
                  <span>
                    SCAN ▸ <span className="text-bone">{session.title.toUpperCase()}</span> · {session.photoCount} FRAMES
                  </span>
                  <span className="text-dim">PREVIEW</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shown.map((src, i) => (
                    <div key={src} className="relative aspect-[3/2] bg-char-3 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Frame ${i + 1} from ${session.title}`} loading="lazy" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <>
                          <div className="brk brk-rec brk-sm" aria-hidden="true" />
                          <span className="tag-rec absolute top-2 left-2">IT&apos;S YOU</span>
                        </>
                      )}
                      <span className="tag-ghost absolute bottom-2 right-2">FR {String(i + 1).padStart(2, "0")}</span>
                    </div>
                  ))}
                  {more > 0 && (
                    <Link
                      href={`/sessions/${session.id}`}
                      className="group relative aspect-[3/2] bg-char-2 flex flex-col items-center justify-center hover:bg-char-3 transition-colors"
                    >
                      <div className="brk brk-sm brk-hover" aria-hidden="true" />
                      <span className="disp text-4xl md:text-5xl">+{more}</span>
                      <span className="mt-2 font-mono text-[11px] tracking-[0.12em] text-mute">FRAMES</span>
                    </Link>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-mute max-w-md">Matches get framed like this.</p>
                  <Link href={`/sessions/${session.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-bone hover:text-rec transition-colors">
                    Browse the session <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap justify-between gap-2 mb-4 font-mono text-[11px] tracking-[0.12em] text-mute">
                  <span>
                    LATEST FRAMES ▸ <span className="text-bone">PICK A SPOT TO SCAN</span>
                  </span>
                  <span className="text-dim">
                    {sessions.length} {sessions.length === 1 ? "SESSION" : "SESSIONS"} · {groups.length}{" "}
                    {groups.length === 1 ? "SPOT" : "SPOTS"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {groups
                    .filter((g) => g.sessions[0].thumbs[0])
                    .slice(0, 6)
                    .map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => pickSpot(g)}
                        aria-label={`Scan ${g.name}`}
                        className="group relative aspect-[3/2] bg-char-3 overflow-hidden text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.sessions[0].thumbs[0]} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="brk brk-sm brk-hover" aria-hidden="true" />
                        <span className="tag-ghost absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate">{g.name}</span>
                      </button>
                    ))}
                </div>
                <p className="mt-5 text-sm text-mute max-w-md">
                  Search your spot, pick the day, take a selfie. We show only the photos you&apos;re in.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
