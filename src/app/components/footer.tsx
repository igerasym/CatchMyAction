import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏄</span>
          <span className="font-bold text-white">SurfShots</span>
        </div>
        <div className="flex gap-6 text-sm text-white/40">
          <Link href="/sessions" className="hover:text-white transition-colors">
            Browse
          </Link>
          <Link href="/register" className="hover:text-white transition-colors">
            Sign Up
          </Link>
          <a href="#" className="hover:text-white transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>
        <p className="text-xs text-white/20">© 2026 SurfShots</p>
      </div>
    </footer>
  );
}
