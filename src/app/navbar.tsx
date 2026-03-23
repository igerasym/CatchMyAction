"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "./components/logo";
import { LayoutDashboard, UserCircle, Search, Images, Settings, LogOut } from "lucide-react";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-colors ${
        isHome ? "bg-transparent absolute w-full" : "bg-[#111] border-b border-white/10"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Logo size={28} />
          <span className="hidden sm:inline">CatchMyAction</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/sessions"
            className="text-white/60 hover:text-white transition-colors"
          >
            Explore
          </Link>

          {status === "loading" ? (
            <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
          ) : session ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-ocean-500/30 flex items-center justify-center text-xs font-bold text-ocean-400 border border-ocean-500/20 overflow-hidden">
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
                <div className="absolute right-0 mt-2 w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-white/40 truncate">{user?.email}</p>
                    {user?.role === "PHOTOGRAPHER" && (
                      <span className="inline-block mt-1 text-[10px] bg-ocean-500/20 text-ocean-400 px-1.5 py-0.5 rounded">
                        Photographer
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    {user?.role === "PHOTOGRAPHER" && (
                      <>
                        <MenuItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                        <MenuItem href={`/photographer/${user?.id}`} icon={<UserCircle className="w-4 h-4" />} label="Public Profile" onClick={() => setMenuOpen(false)} />
                        <div className="border-t border-white/5 my-1" />
                      </>
                    )}
                    <MenuItem href="/sessions" icon={<Search className="w-4 h-4" />} label="Find Photos" onClick={() => setMenuOpen(false)} />
                    <MenuItem href="/my-photos" icon={<Images className="w-4 h-4" />} label="My Actions" onClick={() => setMenuOpen(false)} />
                    <MenuItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => setMenuOpen(false)} />
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2.5"
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
              <Link href="/login" className="text-white/60 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors"
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
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
    >
      <span className="w-5 flex justify-center text-white/50">{icon}</span>
      {label}
    </Link>
  );
}
