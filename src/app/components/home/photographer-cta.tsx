import Link from "next/link";
import { ArrowRight } from "lucide-react";

const POINTS = [
  { k: "Reach", t: "Customers who were in your frame." },
  { k: "Earn", t: "Old sessions keep selling." },
  { k: "Control", t: "Your price, payouts via Stripe." },
];

/** One compact band for photographers: the pitch in a line, three proof points, one action. */
export default function PhotographerCta() {
  return (
    <section id="photographers" aria-labelledby="photog-title" className="bg-char border-y border-line scroll-mt-16">
      <div className="max-w-[1320px] mx-auto px-8 md:px-[72px] py-14 md:py-16 grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6">
          <p className="hud mb-3">For photographers</p>
          <h2 id="photog-title" className="disp text-[clamp(32px,4vw,52px)]">
            Upload once.
            <br />
            Every session keeps selling<span className="text-rec">.</span>
          </h2>
          <dl className="mt-6 space-y-2">
            {POINTS.map((p) => (
              <div key={p.k} className="flex gap-4 text-[15px]">
                <dt className="w-16 shrink-0 font-mono text-[11px] tracking-[0.14em] uppercase text-rec pt-1">{p.k}</dt>
                <dd className="text-mute">{p.t}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-6 lg:justify-self-end">
          <div className="flex flex-wrap gap-3">
            <Link href="/register?role=photographer" className="btn-pri">
              Start selling <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link href="/guide" className="btn-sec">
              Photographer guide
            </Link>
          </div>
          <p className="mt-5 text-sm text-mute">
            Uploading from your phone?{" "}
            <Link href="/install" className="text-bone underline underline-offset-4 decoration-line hover:text-rec hover:decoration-rec transition-colors">
              Add CatchMyAction to your home screen
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
