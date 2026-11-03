"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { getCoordsForSpot } from "@/lib/spots-database";

interface ActiveSession {
  id: string;
  title: string;
  location: string;
  date: string;
  photoCount: number;
  thumbnails: string[];
}

interface SpotInfo {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

function getMarkerColor(_dateStr: string): "blue" {
  return "blue";
}

function isRecent(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  return diffDays <= 7;
}

export default function SpotMap({
  activeSessions,
  allSpots,
}: {
  activeSessions: ActiveSession[];
  allSpots: SpotInfo[];
}) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // Only load map when section scrolls into view
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible) import("./map-inner").then((mod) => setMapComponent(() => mod.default));
  }, [visible]);

  const activeMarkers = useMemo(
    () =>
      activeSessions
        .map((s) => ({
          ...s,
          coords: getCoordsForSpot(s.location),
          color: getMarkerColor(s.date),
          recent: true,
          type: "active" as const,
        }))
        .filter((s) => s.coords !== null),
    [activeSessions]
  );

  // All spots as background dots (exclude ones that already have active sessions)
  const activeNames = new Set(
    activeSessions.map((s) => s.location.split(",")[0].trim().toLowerCase())
  );
  const backgroundSpots = useMemo(
    () =>
      allSpots
        .filter((s) => !activeNames.has(s.name.toLowerCase()))
        .map((s) => ({
          name: s.name,
          region: s.region,
          country: s.country,
          coords: [s.lat, s.lng] as [number, number],
          type: "background" as const,
        })),
    [allSpots, activeNames]
  );

  // Spot index: one row per location, newest upload first
  const spotIndex = useMemo(() => {
    const m = new Map<string, { location: string; photos: number; sessions: number; last: string }>();
    for (const s of activeSessions) {
      const cur = m.get(s.location) ?? { location: s.location, photos: 0, sessions: 0, last: s.date };
      cur.photos += s.photoCount;
      cur.sessions += 1;
      if (s.date > cur.last) cur.last = s.date;
      m.set(s.location, cur);
    }
    return Array.from(m.values()).sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [activeSessions]);

  return (
    <section ref={sectionRef} className="grid lg:grid-cols-12 bg-char">
      <div className="lg:col-span-4 px-5 md:px-12 py-16 lg:py-20">
        <p className="hud mb-5">Spots</p>
        <h2 className="disp text-[clamp(34px,4vw,56px)]">
          {spotIndex.length} {spotIndex.length === 1 ? "spot" : "spots"}.
          <br />
          One map<span className="text-rec">.</span>
        </h2>
        <ul className="mt-10 border-t border-line">
          {spotIndex.map((s) => (
            <li key={s.location} className="border-b border-line">
              <a
                href={`/sessions?location=${encodeURIComponent(s.location)}`}
                className="flex items-center justify-between gap-4 py-4 hover:text-rec transition-colors"
              >
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{s.location}</span>
                  <span className="block font-mono text-[10.5px] tracking-[0.12em] text-dim mt-1">
                    LAST UPLOAD · {new Date(s.last).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="disp text-3xl">{s.photos}</span>
                  <span className="block font-mono text-[10px] tracking-[0.12em] text-dim">PHOTOS</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-8 relative min-h-[420px]">
        {MapComponent ? (
          <MapComponent activeMarkers={activeMarkers} backgroundSpots={backgroundSpots} />
        ) : (
          <div className="w-full h-[400px] sm:h-[560px] bg-ink flex items-center justify-center">
            <span className="hud">Loading map…</span>
          </div>
        )}
      </div>
    </section>
  );
}
