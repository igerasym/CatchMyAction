import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowRight } from "lucide-react";
import { conditionChips, CHIP_LEGEND } from "@/lib/condition-chips";
import { SportBadge } from "@/app/components/sport-icon";

export interface LogSession {
  id: string;
  title: string;
  location: string;
  sportType: string;
  date: string;
  startTime: string;
  photoCount: number;
  pricePerPhoto: number;
  thumb: string | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null; // km/h
}

/** "Film log" of real published sessions — one dense row per session, newest first. */
export default function SessionLog({ sessions, sports }: { sessions: LogSession[]; sports: string[] }) {
  if (sessions.length === 0) return null;
  return (
    <section className="bg-ink px-5 md:px-12 py-20 md:py-24">
      <div className="max-w-[1320px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <p className="hud mb-5">02 / Discover</p>
            <h2 className="disp text-[clamp(36px,5vw,72px)]">The session log.</h2>
          </div>
          <p className="font-mono text-xs tracking-[0.12em] text-mute">
            {sessions.length} SESSIONS · {sports.join(" / ").toUpperCase()}
            <span className="hidden md:block mt-1.5 text-dim normal-case tracking-normal text-[11px]">{CHIP_LEGEND}</span>
          </p>
        </div>

        <ul className="border-t border-line">
          {sessions.map((s, i) => (
            <li key={s.id} className="border-b border-line">
              <Link
                href={`/sessions/${s.id}`}
                className="group grid grid-cols-[1fr_auto] md:grid-cols-[48px_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_72px_132px] items-center gap-x-6 gap-y-2 py-5 hover:bg-char/60 transition-colors md:px-2"
              >
                <span className="hidden md:block font-mono text-xs text-dim">
                  {String(sessions.length - i).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[19px] md:text-[22px] font-extrabold tracking-tight truncate" style={{ fontStretch: "110%" }}>
                    {s.title}
                  </span>
                  <span className="md:hidden block text-sm text-mute mt-1">
                    {s.location} · {formatDistanceToNowStrict(new Date(s.date))} ago
                  </span>
                </span>
                <span className="hidden md:block text-sm text-bone/85 truncate">
                  <span className="inline-flex items-center gap-2.5">
            <SportBadge sport={s.sportType} size="w-7 h-7" />
            <span className="truncate">{s.location}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">{s.sportType}</span>
          </span>
                </span>
                <span className="hidden md:flex flex-wrap gap-1.5">
                  <span className="font-mono text-[11px] text-mute mr-1">{format(new Date(s.date), "d MMM yyyy")}</span>
                  {conditionChips(s).map((c) => (
                    <span key={c.text} title={c.label} aria-label={c.label} className="font-mono text-[10.5px] px-1.5 py-0.5 bg-char-2 text-bone/85">{c.text}</span>
                  ))}
                </span>
                <span className="text-right md:text-left">
                  <span className="disp text-2xl md:text-3xl">{String(s.photoCount).padStart(2, "0")}</span>
                  <span className="block font-mono text-[10px] tracking-[0.12em] text-dim">FRAMES</span>
                </span>
                <span className="hidden md:block relative aspect-[3/2] bg-char-3 overflow-hidden">
                  {s.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumb} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  )}
                  <span className="brk brk-sm brk-hover" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-end">
          <Link href="/sessions" className="inline-flex items-center gap-2 text-sm font-bold hover:text-rec transition-colors">
            Explore all sessions on the map <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
