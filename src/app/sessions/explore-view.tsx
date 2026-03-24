"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { MapPin, Calendar, Camera, Waves, Wind, ImageIcon, X } from "lucide-react";
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

export default function ExploreView({ sessions, allSpots, initialLocation }: Props) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || "");
  const [searchInput, setSearchInput] = useState(initialLocation || "");
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // @ts-ignore — dynamic import for client-only map component
    import("./explore-map").then((mod: any) => setMapComponent(() => mod.default));
  }, []);

  // Filter sessions by selected location
  const filteredSessions = useMemo(() => {
    if (!selectedLocation) return [];
    const q = selectedLocation.toLowerCase();
    return sessions.filter((s) => s.location.toLowerCase().includes(q));
  }, [sessions, selectedLocation]);

  // Map markers — sessions with coordinates
  const markers = useMemo(() =>
    sessions
      .filter((s) => s.locationLat && s.locationLng)
      .map((s) => ({
        id: s.id,
        title: s.title,
        location: s.location,
        lat: s.locationLat!,
        lng: s.locationLng!,
        photoCount: s.photoCount,
        date: s.date,
      })),
    [sessions]
  );

  function handleSpotSelect(location: string) {
    setSelectedLocation(location);
    setSearchInput(location);
  }

  function clearSelection() {
    setSelectedLocation("");
    setSearchInput("");
  }

  return (
    <div className="-mx-4 -mt-6">
      {/* Map section */}
      <div className="relative">
        <div className="rounded-none overflow-hidden" style={{ height: "50vh", minHeight: 350 }}>
          {MapComponent ? (
            <MapComponent
              markers={markers}
              allSpots={allSpots}
              onSpotClick={handleSpotSelect}
              selectedLocation={selectedLocation}
            />
          ) : (
            <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
              <div className="text-ocean-400 animate-pulse">Loading map...</div>
            </div>
          )}
        </div>

        {/* Search overlay on map */}
        <div className="absolute top-4 left-4 right-4 z-[2] max-w-lg">
          <div className="bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 rounded-xl p-3 shadow-2xl">
            <SpotAutocomplete
              value={searchInput}
              onChange={(val) => {
                setSearchInput(val);
                setSelectedLocation(val);
              }}
              label=""
              placeholder="Search spot, region, or country..."
              required={false}
            />
          </div>
        </div>
      </div>

      {/* Sessions below map */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {selectedLocation ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Sessions in {selectedLocation}
                <span className="text-white/30 font-normal ml-2 text-sm">({filteredSessions.length})</span>
              </h2>
              <button onClick={clearSelection} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-2">No sessions found in {selectedLocation}</p>
                <p className="text-xs text-white/20">Be the first to upload photos from this spot</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((s) => (
                  <Link key={s.id} href={`/sessions/${s.id}`}
                    className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-ocean-500/30 transition-all">
                    <div className="aspect-[4/3] bg-white/5 overflow-hidden">
                      {s.coverUrl ? (
                        <img src={s.coverUrl} alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white">{s.title}</h3>
                      <p className="text-sm text-white/40">
                        <Calendar className="w-3.5 h-3.5 inline mr-0.5" /> {format(new Date(s.date), "MMM d, yyyy")} · {s.startTime}–{s.endTime}
                      </p>
                      <p className="text-sm text-white/40">
                        <Camera className="w-3.5 h-3.5 inline mr-0.5" /> {s.photoCount} photos · by {s.photographerName}
                      </p>
                      {(s.waveHeight || s.windSpeed) && (
                        <div className="flex gap-1.5 mt-1.5 text-[11px] text-white/30">
                          {s.waveHeight != null && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.04] rounded">
                              <Waves className="w-3 h-3 text-ocean-400/50" /> {s.waveHeight.toFixed(1)}m
                            </span>
                          )}
                          {s.windSpeed != null && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.04] rounded">
                              <Wind className="w-3 h-3 text-white/25" /> {(s.windSpeed / 3.6).toFixed(1)} m/s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 text-ocean-400/40 mx-auto mb-3" />
            <p className="text-white/50 mb-1">Select a spot on the map or search above</p>
            <p className="text-xs text-white/20">{sessions.length} sessions across {new Set(sessions.map(s => s.location)).size} locations</p>
          </div>
        )}
      </div>
    </div>
  );
}
