import Link from "next/link";
import Logo from "./logo";
import FeedbackTrigger from "./feedback-trigger";

export default function Footer() {
  return (
    <footer className="bg-char border-t border-line px-5 md:px-12 pt-14 pb-10">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <Link href="/" className="inline-flex items-center gap-2.5 text-bone" aria-label="CatchMyAction home">
              <Logo size={22} />
              <span className="text-[17px] font-extrabold tracking-tight" style={{ fontStretch: "112%" }}>
                CatchMyAction
              </span>
            </Link>
            <p className="disp mt-8 text-[clamp(28px,3.4vw,44px)] text-bone/35">Find Yourself in Action.</p>
          </div>
          <nav className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm" aria-label="Footer">
            <div>
              <p className="hud mb-4">Explore</p>
              <ul className="space-y-2.5 text-mute">
                <li><Link href="/sessions" className="hover:text-bone transition-colors">Sessions & map</Link></li>
                <li><Link href="/#find-me" className="hover:text-bone transition-colors">Find me</Link></li>
              </ul>
            </div>
            <div>
              <p className="hud mb-4">Photographers</p>
              <ul className="space-y-2.5 text-mute">
                <li><Link href="/register?role=photographer" className="hover:text-bone transition-colors">Start selling</Link></li>
                <li><Link href="/guide" className="hover:text-bone transition-colors">Guide</Link></li>
                <li><Link href="/install" className="hover:text-bone transition-colors">Install app</Link></li>
              </ul>
            </div>
            <div>
              <p className="hud mb-4">Company</p>
              <ul className="space-y-2.5 text-mute">
                <li><Link href="/contact" className="hover:text-bone transition-colors">Contact</Link></li>
                <li>
                  <FeedbackTrigger className="text-left hover:text-bone transition-colors">
                    Report a bug / suggest a feature
                  </FeedbackTrigger>
                </li>
                <li><Link href="/privacy" className="hover:text-bone transition-colors">Privacy & face data</Link></li>
                <li><Link href="/license" className="hover:text-bone transition-colors">Photo license</Link></li>
                <li><Link href="/terms" className="hover:text-bone transition-colors">Terms</Link></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-14 pt-6 border-t border-line flex flex-wrap justify-between gap-3 font-mono text-[11px] tracking-[0.1em] text-dim">
          <span>© {new Date().getFullYear()} CatchMyAction</span>
          <span>Payments by Stripe · Selfies are not stored</span>
        </div>
      </div>
    </footer>
  );
}
