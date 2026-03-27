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
        .filter((s) => {
          // Only show sessions from last 7 days on homepage map
          const d = new Date(s.date);
          const now = new Date();
          return (now.getTime() - d.getTime()) < 7 * 86400000;
        })
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

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          Action Spots Worldwide
        </h2>
        <p className="text-white/40 text-center mb-6 text-sm">
          Click a spot to explore sessions
        </p>
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {MapComponent ? (
            <MapComponent
              activeMarkers={activeMarkers}
              backgroundSpots={backgroundSpots}
            />
          ) : (
            <div className="w-full h-[400px] sm:h-[500px] bg-[#1a1a2e] flex items-center justify-center">
              <div className="text-ocean-400 animate-pulse">Loading map...</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
