import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export interface FeaturedSession {
  id: string;
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  photoCount: number;
  description: string | null;
  previews: string[]; // up to 5
}

/** Editorial spread of one real session: big title, asymmetric mixed-proportion grid. */
export default function Featured({ session }: { session: FeaturedSession | null }) {
  if (!session || session.previews.length < 3) return null;
  const [a, b, c, d, e] = session.previews;
  const fig = (n: number, src: string | undefined, cls: string, caption?: string) =>
    src ? (
      <figure className={`group relative overflow-hidden bg-char-3 ${cls}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${session.title} — frame ${n}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="brk brk-sm brk-hover" aria-hidden="true" />
        {caption && <figcaption className="tag-ghost absolute bottom-3 left-3">{caption}</figcaption>}
      </figure>
    ) : null;

  return (
    <section className="bg-bone text-ink px-5 md:px-12 py-20 md:py-28">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid md:grid-cols-12 gap-8 items-end mb-10 md:mb-12">
          <div className="md:col-span-8">
            <p className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-[#5c5850] mb-5">
              03 / The feature — {session.location}
            </p>
            <h2 className="disp text-[clamp(44px,8vw,120px)]" style={{ fontStretch: "92%" }}>
              {session.title}
            </h2>
          </div>
          <div className="md:col-span-4">
            {session.description && <p className="text-[17px] leading-relaxed text-[#2b2d32] mb-4">{session.description}</p>}
            <p className="font-mono text-[11px] tracking-[0.12em] text-[#5c5850]">
              {format(new Date(session.date), "d MMM yyyy").toUpperCase()} · {session.startTime}–{session.endTime} ·{" "}
              {session.photoCount} FRAMES
            </p>
          </div>
        </div>

        <div className="grid grid-cols-6 md:grid-cols-12 gap-2 md:gap-3">
          {fig(1, a, "col-span-6 md:col-span-8 md:row-span-2 aspect-[3/2] md:aspect-auto", "FIG. 01")}
          {fig(2, b, "col-span-3 md:col-span-4 aspect-[3/2]")}
          {fig(3, c, "col-span-3 md:col-span-4 aspect-[3/2]", "FIG. 03")}
          {fig(4, d, "col-span-3 md:col-span-5 aspect-[3/2] md:aspect-auto md:h-[340px]")}
          {fig(5, e, "col-span-3 md:col-span-7 aspect-[3/2] md:aspect-auto md:h-[340px]")}
        </div>

        <div className="mt-8 pt-6 border-t border-ink/15 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[11px] tracking-[0.12em] text-[#5c5850]">
            PREVIEWS ARE WATERMARKED · HD WITHOUT WATERMARK AFTER PURCHASE
          </p>
          <Link href={`/sessions/${session.id}`} className="inline-flex items-center gap-3 bg-ink text-bone px-5 py-3.5 text-sm font-bold hover:bg-char transition-colors">
            Open session — {session.photoCount} photos <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
