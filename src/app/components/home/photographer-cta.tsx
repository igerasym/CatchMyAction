import Link from "next/link";
import { ArrowRight } from "lucide-react";

const POINTS = [
  { k: "Reach", t: "Customers who were in your frame.", d: "QR codes at the spot, session pages and selfie search bring them to you." },
  { k: "Monetize", t: "Old sessions keep selling.", d: "Upload an archive once — every session stays searchable." },
  { k: "Automate", t: "Discovery runs itself.", d: "Spot, time and face indexing happen on upload." },
  { k: "Control", t: "Your price, your sessions.", d: "Set the price per photo, publish or unpublish any time. Payouts via Stripe." },
];

/** Split section: action photo on one side, the photographer pitch on the other. */
export default function PhotographerCta({ image }: { image: string | null }) {
  return (
    <section id="photographers" className="grid lg:grid-cols-12 min-h-[640px] scroll-mt-16">
      <div className="lg:col-span-6 relative min-h-[360px] bg-char-3 overflow-hidden">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Action photo from a published session" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <div className="brk brk-soft m-6" aria-hidden="true" />
        <p className="absolute bottom-10 left-10 font-mono text-[11px] tracking-[0.12em] text-bone/85">
          UPLOAD ▸ <span className="text-rec">PUBLISHED</span>
        </p>
      </div>
      <div className="lg:col-span-6 bg-char px-6 md:px-14 py-16 md:py-20 flex flex-col justify-center">
        <p className="hud mb-5">05 / For photographers</p>
        <h2 className="disp text-[clamp(36px,4.6vw,64px)]">
          Your archive
          <br />
          is inventory<span className="text-rec">.</span>
        </h2>
        <dl className="mt-10 border-t border-line">
          {POINTS.map((p) => (
            <div key={p.k} className="grid grid-cols-[110px_1fr] gap-4 py-4 border-b border-line">
              <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-rec pt-0.5">{p.k}</dt>
              <dd className="text-[15px] text-mute">
                <span className="font-bold text-bone">{p.t}</span> {p.d}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/register?role=photographer" className="btn-pri">
            Start selling <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link href="/guide" className="btn-sec">
            Photographer guide
          </Link>
        </div>
      </div>
    </section>
  );
}
