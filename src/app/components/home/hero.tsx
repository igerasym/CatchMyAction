import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import FindPhotosButton from "./find-photos";
import FocusBox from "./focus-box";
import type { FindMeSession } from "@/lib/find-me-spots";

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

/**
 * Full-bleed hero framed as a camera viewfinder. One job: get the visitor to "Find my photos".
 * The photo fills the whole frame on desktop (zoomed so the surfer clears the headline) and the top part of it on
 * phones, with the headline below. The focus box sits on the surfer. HUD shows the latest real session.
 */
export default function Hero({
  meta,
  sessionCount,
  spotCount,
  findMeSessions,
}: {
  meta: HeroMeta | null;
  sessionCount: number;
  spotCount: number;
  findMeSessions: FindMeSession[];
}) {
  const lat = meta ? coord(meta.lat, "N", "S") : null;
  const lng = meta ? coord(meta.lng, "E", "W") : null;

  return (
    <section className="bg-ink px-3 md:px-5 pb-3 md:pb-5 pt-3 md:pt-5">
      <div className="relative overflow-hidden min-h-[calc(100svh-24px)] md:min-h-[min(860px,calc(100svh-40px))] flex flex-col">
        {/* photo: top ~56% on phones (so the surfer is not under the text), whole frame from md up */}
        <div className="hero-photo absolute inset-x-0 top-0 h-[56%] md:h-full overflow-hidden">
          <Image
            src="/hero-bg.jpg"
            alt="Surfer dropping into a big wave"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center md:object-[70%_center] md:scale-[1.4] md:origin-left"
          />
          <FocusBox />
        </div>
        {/* legibility gradients */}
        <div className="absolute inset-x-0 top-0 h-[56%] md:h-full bg-gradient-to-b from-ink/60 via-transparent to-ink md:bg-gradient-to-r md:from-ink/85 md:via-ink/35 md:to-transparent" />
        <div className="hidden md:block absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
        {/* keeps the nav links readable over bright foam */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" aria-hidden="true" />

        {/* viewfinder frame */}
        <div className="brk brk-lg brk-soft m-4 md:m-6" aria-hidden="true" />

        {/* headline: below the photo on phones, over it on desktop */}
        <div className="relative z-20 mt-auto px-8 md:px-12 pb-10 md:pb-14">
          <h1 className="disp text-[clamp(52px,10vw,148px)] text-bone md:whitespace-nowrap">
            Find Yourself
            <br />
            in Action<span className="text-rec">.</span>
          </h1>
          <p className="mt-5 md:mt-6 max-w-md text-[17px] md:text-xl leading-snug text-bone/85">
            You ride. Photographers shoot. Find every frame you&apos;re in.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <FindPhotosButton sessions={findMeSessions} className="btn-pri !py-5 !px-8 !text-[17px]" />
            <Link href="/sessions" className="btn-sec !py-5 !px-7 !text-[17px]">
              Browse sessions
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11px] tracking-[0.08em] uppercase text-bone/60">
            Pick your spot · One selfie · Not saved
          </p>
        </div>

        {/* HUD bottom */}
        {meta && (
          <div className="absolute z-10 right-12 bottom-14 hidden lg:block text-right font-mono text-[11px] tracking-[0.12em] text-bone/70" aria-hidden="true">
            <div>{lat && lng ? `${lat}  ${lng}  ·  ` : ""}{meta.location.toUpperCase()}</div>
            <div>{sessionCount} SESSIONS · {spotCount} SPOTS</div>
            <div className="text-bone/90">{meta.title.toUpperCase()} · {format(new Date(meta.date), "yyyy.MM.dd")}</div>
          </div>
        )}
      </div>
    </section>
  );
}
