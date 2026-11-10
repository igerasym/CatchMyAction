"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "./components/logo";
import { LayoutDashboard, UserCircle, Images, Settings, LogOut, BookOpen, Smartphone, MessageSquare } from "lucide-react";
import { openFeedback } from "@/lib/feedback-types";
import { detectPlatform } from "@/lib/install-prompt";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  // "Add to home screen" only makes sense on a phone
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(detectPlatform(navigator.userAgent, navigator.maxTouchPoints) !== "other");
  }, []);

  // Home: transparent over the hero, solid once the page scrolls
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className={`top-0 z-50 w-full transition-colors duration-300 ${
        isHome
          ? `fixed ${scrolled ? "bg-ink/90 backdrop-blur border-b border-line" : "bg-transparent border-b border-transparent"}`
          : "sticky bg-ink border-b border-line"
      }`}
    >
      {/* On the home page the bar lines up with the viewfinder frame and the headline (44px phone / 72px desktop) */}
      <div className={`${isHome ? "px-[44px] md:px-[72px] py-3" : "max-w-7xl mx-auto px-5 md:px-8 py-4"} flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2.5 text-bone" aria-label="CatchMyAction home">
          <Logo size={24} />
          <span className="hidden sm:inline text-[15px] font-extrabold uppercase tracking-[0.02em]" style={{ fontStretch: "125%" }}>
            Catch<span className="text-rec">My</span>Action
          </span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            href="/sessions"
            className="text-bone/75 hover:text-bone transition-colors"
          >
            Explore sessions
          </Link>

          {status === "loading" ? (
            <div className="w-7 h-7 rounded-full bg-char-3 animate-pulse" />
          ) : session ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-bone/75 hover:text-bone transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-char-3 flex items-center justify-center text-xs font-bold text-bone border border-line overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <svg className={`w-3 h-3 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-char-2 border border-line shadow-2xl py-1 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-line">
                    <p className="text-sm font-semibold text-bone">{user?.name}</p>
                    <p className="text-xs text-dim truncate">{user?.email}</p>
                    {user?.role === "PHOTOGRAPHER" && (
                      <span className="inline-block mt-1.5 tag-ghost">
                        Photographer
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    {user?.role === "PHOTOGRAPHER" && (
                      <>
                        <MenuItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                        <MenuItem href={`/photographer/${user?.id}`} icon={<UserCircle className="w-4 h-4" />} label="Public Profile" onClick={() => setMenuOpen(false)} />
                        <MenuItem href="/guide" icon={<BookOpen className="w-4 h-4" />} label="Photographer Guide" onClick={() => setMenuOpen(false)} />
                        {isMobile && <MenuItem href="/install" icon={<Smartphone className="w-4 h-4" />} label="Add to home screen" onClick={() => setMenuOpen(false)} />}
                        <div className="border-t border-line my-1" />
                      </>
                    )}
                    <MenuItem href="/my-photos" icon={<Images className="w-4 h-4" />} label="My Actions" onClick={() => setMenuOpen(false)} />
                    <MenuItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => setMenuOpen(false)} />
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); openFeedback(); }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-mute hover:bg-char-3 hover:text-bone transition-colors"
                    >
                      <span className="w-5 flex justify-center text-dim"><MessageSquare className="w-4 h-4" /></span>
                      Send feedback
                    </button>
                    <div className="border-t border-line my-1" />
                    <button
                      onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="w-full text-left px-4 py-2 text-sm text-rec hover:bg-char-3 transition-colors flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/#photographers" className="hidden md:inline text-bone/75 hover:text-bone transition-colors">
                For photographers
              </Link>
              <Link href="/login" className="text-bone/75 hover:text-bone transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-bone text-ink font-bold hover:bg-white transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function MenuItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-mute hover:bg-char-3 hover:text-bone transition-colors"
    >
      <span className="w-5 flex justify-center text-dim">{icon}</span>
      {label}
    </Link>
  );
}
