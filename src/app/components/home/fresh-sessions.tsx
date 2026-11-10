import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export interface FreshSession {
  id: string;
  title: string;
  location: string;
  date: string; // ISO
  photoCount: number;
  pricePerPhoto: number;
  coverUrl: string | null;
}

function price(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** The latest sessions as plain cards. Replaces the old Find Me / Session Log / Discover / map sections. */
export default function FreshSessions({ sessions }: { sessions: FreshSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <section aria-labelledby="fresh-title" className="bg-ink px-8 md:px-[72px] py-14 md:py-20">
      <div className="max-w-[1320px] mx-auto">
        <p className="hud mb-3">Latest sessions</p>
        <h2 id="fresh-title" className="disp text-[clamp(34px,4.6vw,60px)] mb-8 md:mb-10">
          Fresh from the water<span className="text-rec">.</span>
        </h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="group relative block bg-char-2 border border-line hover:border-bone transition-colors">
                <div className="relative aspect-[4/3] bg-char-3 overflow-hidden">
                  {s.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <span aria-hidden="true" className="brk brk-sm brk-hover" />
                  <span className="tag-ghost absolute top-3 left-3">{price(s.pricePerPhoto)}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-bone truncate">{s.title}</h3>
                  <p className="mt-1 text-sm text-mute truncate">
                    {s.location} · {format(new Date(s.date), "MMM d")} · {s.photoCount} photo{s.photoCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/sessions" className="btn-sec mt-8">
          All sessions &amp; map <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
