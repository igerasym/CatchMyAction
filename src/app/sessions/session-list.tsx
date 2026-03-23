"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { MapPin, Calendar, Camera, Waves, Wind, ImageIcon } from "lucide-react";

interface SessionItem {
  id: string;
  title: string;
  location: string;
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

interface Props {
  initialSessions: SessionItem[];
  initialCursor: string | null;
  location?: string;
  date?: string;
}

export default function SessionList({
  initialSessions,
  initialCursor,
  location,
  date,
}: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor, limit: "12" });
      if (location) params.set("location", location);
      if (date) params.set("date", date);
      const res = await fetch(`/api/sessions?${params}`);
      const data = await res.json();
      setSessions((prev) => [...prev, ...data.sessions.map((s: any) => ({
        id: s.id,
        title: s.title,
        location: s.location,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        photoCount: s.photoCount,
        photographerName: s.photographer.name,
        coverUrl: s.photos?.[0]?.previewKey
          ? `/api/uploads/previews/${s.photos[0].previewKey}`
          : null,
      }))]);
      setCursor(data.pagination.page * data.pagination.limit < data.pagination.total
        ? data.sessions[data.sessions.length - 1]?.id
        : null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, location, date]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !loading) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading, loadMore]);

  if (sessions.length === 0) {
    return (
      <p className="text-center text-white/40 py-12">
        No sessions found. Try a different search.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-ocean-500/30 transition-all"
          >
            <div className="aspect-[4/3] bg-white/5 overflow-hidden">
              {s.coverUrl ? (
                <img
                  src={s.coverUrl}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <ImageIcon className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h2 className="font-semibold text-lg text-white">{s.title}</h2>
              <p className="text-sm text-white/40"><MapPin className="w-3.5 h-3.5 inline mr-0.5" /> {s.location}</p>
              <p className="text-sm text-white/40">
                <Calendar className="w-3.5 h-3.5 inline mr-0.5" /> {format(new Date(s.date), "MMM d, yyyy")} · {s.startTime}–{s.endTime}
              </p>
              <p className="text-sm text-white/40">
                <Camera className="w-3.5 h-3.5 inline mr-0.5" /> {s.photoCount} photos · by {s.photographerName}
              </p>
              {(s.waveHeight || s.windSpeed) && (
                <div className="flex gap-2 mt-1.5">
                  {s.waveHeight != null && (
                    <span className="text-xs px-2 py-0.5 bg-ocean-500/10 text-ocean-300 rounded">
                      <Waves className="w-3 h-3 inline mr-0.5" /> {(s.waveHeight * 3.281).toFixed(1)}ft
                    </span>
                  )}
                  {s.windSpeed != null && (
                    <span className="text-xs px-2 py-0.5 bg-white/5 text-white/50 rounded">
                      <Wind className="w-3 h-3 inline mr-0.5" /> {s.windSpeed.toFixed(0)}km/h
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="py-8 text-center">
        {loading && (
          <div className="inline-flex items-center gap-2 text-white/30 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading more sessions...
          </div>
        )}
      </div>
    </>
  );
}
