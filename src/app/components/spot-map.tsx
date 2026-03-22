"use client";

import { useEffect, useState, useMemo } from "react";
import { getCoordsForLocation } from "@/lib/surf-spots";

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

function getMarkerColor(dateStr: string): "blue" | "green" | "gray" {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 1) return "blue";
  if (diff <= 7) return "green";
  return "gray";
}

export default function SpotMap({
  activeSessions,
  allSpots,
}: {
  activeSessions: ActiveSession[];
  allSpots: SpotInfo[];
}) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("./map-inner").then((mod) => setMapComponent(() => mod.default));
  }, []);

  const activeMarkers = useMemo(
    () =>
      activeSessions.map((s) => ({
        ...s,
        coords: getCoordsForLocation(s.location),
        color: getMarkerColor(s.date),
        type: "active" as const,
      })),
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
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          Action Spots Worldwide
        </h2>
        <p className="text-white/40 text-center mb-6 text-sm">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1" />
          Today
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 ml-3 mr-1" />
          This week
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500 ml-3 mr-1" />
          Older
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-ocean-500/40 ml-3 mr-1" />
          All spots
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
