"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MapPin, CalendarDays, ScanFace, Lock, ArrowRight } from "lucide-react";

export interface FindMeSession {
  id: string;
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  photoCount: number;
  thumbs: string[];
}

/**
 * Homepage Find Me: pick WHERE + WHEN from real published sessions, then jump to that
 * session with the selfie dialog open (?findme=1). The right side previews that session's
 * frames as a contact sheet, framed the way matches are shown.
 */
export default function FindMeSection({ sessions }: { sessions: FindMeSession[] }) {
  const spots = useMemo(() => Array.from(new Set(sessions.map((s) => s.location))), [sessions]);
  const [spot, setSpot] = useState(spots[0] ?? "");
  const atSpot = useMemo(() => sessions.filter((s) => s.location === spot), [sessions, spot]);
  const [sessionId, setSessionId] = useState(atSpot[0]?.id ?? "");
  const selected = atSpot.find((s) => s.id === sessionId) ?? atSpot[0];

  function changeSpot(next: string) {
    setSpot(next);
    const first = sessions.find((s) => s.location === next);
    setSessionId(first?.id ?? "");
  }

  if (!selected) return null;
  const shown = selected.thumbs.slice(0, 5);
  const more = Math.max(0, selected.photoCount - shown.length);

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
              <span>2 steps</span>
            </div>

            <label className="block border-t border-line pt-5">
              <span className="hud block mb-2">01 · Where</span>
              <span className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-mute shrink-0" aria-hidden="true" />
                <select
                  value={spot}
                  onChange={(e) => changeSpot(e.target.value)}
                  className="w-full bg-transparent text-[17px] font-semibold text-bone focus:outline-none cursor-pointer"
                >
                  {spots.map((s) => (
                    <option key={s} value={s} className="bg-char text-bone">
                      {s}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="block border-t border-line pt-5 mt-5">
              <span className="hud block mb-2">02 · When</span>
              <span className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-mute shrink-0" aria-hidden="true" />
                <select
                  value={selected.id}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full bg-transparent text-[17px] font-semibold text-bone focus:outline-none cursor-pointer"
                >
                  {atSpot.map((s) => (
                    <option key={s.id} value={s.id} className="bg-char text-bone">
                      {format(new Date(s.date), "EEE d MMM yyyy")} · {s.startTime}–{s.endTime}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <div className="border-t border-line pt-5 mt-5">
              <span className="hud block mb-3">03 · Selfie</span>
              <p className="text-sm text-mute leading-relaxed">
                Front camera or upload. Good light, no sunglasses.
              </p>
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-dim">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" /> NOT STORED
              </p>
            </div>

            <Link
              href={`/sessions/${selected.id}?findme=1`}
              className="btn-rec w-full justify-center mt-7"
            >
              <ScanFace className="w-5 h-5" aria-hidden="true" />
              Scan {selected.photoCount} frames
            </Link>
          </div>

          {/* contact sheet */}
          <div className="lg:col-span-8 bg-ink p-5 md:p-6">
            <div className="flex flex-wrap justify-between gap-2 mb-4 font-mono text-[11px] tracking-[0.12em] text-mute">
              <span>
                SCAN ▸ <span className="text-bone">{selected.title.toUpperCase()}</span> · {selected.photoCount} FRAMES
              </span>
              <span className="text-dim">PREVIEW</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {shown.map((src, i) => (
                <div key={src} className="relative aspect-[3/2] bg-char-3 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Frame ${i + 1} from ${selected.title}`} loading="lazy" className="w-full h-full object-cover" />
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
                  href={`/sessions/${selected.id}`}
                  className="group relative aspect-[3/2] bg-char-2 flex flex-col items-center justify-center hover:bg-char-3 transition-colors"
                >
                  <div className="brk brk-sm brk-hover" aria-hidden="true" />
                  <span className="disp text-4xl md:text-5xl">+{more}</span>
                  <span className="mt-2 font-mono text-[11px] tracking-[0.12em] text-mute">FRAMES</span>
                </Link>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-mute max-w-md">
                Matches get framed like this.
              </p>
              <Link href={`/sessions/${selected.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-bone hover:text-rec transition-colors">
                Browse the session <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
