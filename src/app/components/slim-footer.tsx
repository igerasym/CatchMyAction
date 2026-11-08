"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FeedbackTrigger from "./feedback-trigger";

/** One-line footer for every page except the homepage, which has the full one. Keeps Feedback reachable for visitors. */
export default function SlimFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="border-t border-line px-5 md:px-12 py-6 mt-12">
      <div className="max-w-[1320px] mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.1em] text-dim">
        <span>&copy; {new Date().getFullYear()} CatchMyAction</span>
        <FeedbackTrigger className="py-1 hover:text-bone transition-colors">Report a bug / suggest a feature</FeedbackTrigger>
        <Link href="/contact" className="py-1 hover:text-bone transition-colors">Contact</Link>
        <Link href="/privacy" className="py-1 hover:text-bone transition-colors">Privacy</Link>
        <Link href="/terms" className="py-1 hover:text-bone transition-colors">Terms</Link>
      </div>
    </footer>
  );
}
