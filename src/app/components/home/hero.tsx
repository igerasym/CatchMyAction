import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ScanFace, ArrowRight } from "lucide-react";

export interface HeroMeta {
  title: string;
  location: string;
  date: string; // ISO
  lat: number | null;
  lng: number | null;
}

function coord(v: number | null, pos: string, neg: string) {
  if (v === null) return null;
  return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
}

/** Full-bleed hero framed as a camera viewfinder. HUD shows the latest real session. */
export default function Hero({
  meta,
  sessionCount,
  spotCount,
}: {
  meta: HeroMeta | null;
  sessionCount: number;
  spotCount: number;
}) {
  const lat = meta ? coord(meta.lat, "N", "S") : null;
  const lng = meta ? coord(meta.lng, "E", "W") : null;

  return (
    <section className="bg-ink px-3 md:px-5 pb-3 md:pb-5 pt-[68px] md:pt-[76px]">
      <div className="relative overflow-hidden min-h-[calc(100svh-90px)] md:min-h-[min(820px,calc(100svh-96px))] flex flex-col">
        <Image
          src="/hero-bg.jpg"
          alt="Surfer dropping into a big wave"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />
        {/* legibility gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />

        {/* viewfinder frame */}
        <div className="brk brk-lg brk-soft m-4 md:m-6" aria-hidden="true" />

        {/* HUD top */}
        <div className="relative z-10 flex items-center justify-between px-8 md:px-12 pt-9 md:pt-11 font-mono text-[11px] tracking-[0.14em] text-bone/80" aria-hidden="true">
          <span className="flex items-center gap-2.5">
            <span className="rec-dot blink" /> <span className="text-bone font-bold">REC</span>
          </span>
          <span className="hidden md:flex gap-6 text-bone/60">
            <span>ISO 200</span><span>1/2000</span><span>ƒ/4.0</span><span className="text-bone/90">AF-C</span>
          </span>
        </div>

        {/* AF box over the wave (desktop) */}
        <div className="hidden lg:block absolute right-[22%] top-[30%] w-36 h-36 z-10" aria-hidden="true">
          <span className="tag-ghost absolute -top-7 left-0">AF · TRACKING</span>
          <div className="brk brk-sm" />
        </div>

        {/* headline */}
        <div className="relative z-10 mt-auto px-8 md:px-12 pb-10 md:pb-12 max-w-5xl">
          <p className="hud !text-bone/70 mb-5">Surf · Skate — photos from real sessions</p>
          <h1 className="disp text-[clamp(56px,10vw,148px)] text-bone">
            Find Yourself
            <br />
            in Action<span className="text-rec">.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-bone/80">
            Photographers shoot the session. You take one selfie. We pull every frame you&apos;re in — ready
            to buy in HD.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#find-me" className="btn-pri">
              <ScanFace className="w-5 h-5" aria-hidden="true" /> Find My Photos
            </Link>
            <Link href="#photographers" className="btn-sec">
              I&apos;m a Photographer <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* HUD bottom */}
        {meta && (
          <div className="relative z-10 hidden md:flex items-end justify-between px-12 pb-11 font-mono text-[11px] tracking-[0.12em] text-bone/70" aria-hidden="true">
            <span>
              {lat && lng ? `${lat}  ${lng}  ·  ` : ""}
              {meta.location.toUpperCase()}
            </span>
            <span className="text-right">
              {sessionCount} SESSIONS · {spotCount} SPOTS
              <br />
              <span className="text-bone/90">
                {meta.title.toUpperCase()} · {format(new Date(meta.date), "yyyy.MM.dd")}
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
