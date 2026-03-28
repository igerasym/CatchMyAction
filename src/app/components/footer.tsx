import Link from "next/link";
import Logo from "./logo";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-bold text-white">CatchMyAction</span>
        </div>
        <div className="flex gap-6 text-sm text-white/40">
          <Link href="/sessions" className="hover:text-white transition-colors">
            Browse
          </Link>
          <a href="/terms" className="hover:text-white transition-colors">
            Terms
          </a>
          <a href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </a>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
        </div>
        <p className="text-xs text-white/20">© 2026 CatchMyAction</p>
      </div>
    </footer>
  );
}
