"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const isHome = pathname === "/";

  return (
    <nav
      className={`sticky top-0 z-50 transition-colors ${
        isHome
          ? "bg-transparent absolute w-full"
          : "bg-[#111] border-b border-white/10"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          🏄 SurfShots
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/sessions"
            className="text-white/60 hover:text-white transition-colors"
          >
            Browse
          </Link>
          {status === "loading" ? null : session ? (
            <>
              {user?.role === "PHOTOGRAPHER" && (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/upload"
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    Upload
                  </Link>
                </>
              )}
              <span className="text-white/40">
                {user?.name}
                {user?.role === "PHOTOGRAPHER" && (
                  <span className="ml-1 text-xs bg-ocean-500/20 text-ocean-400 px-1.5 py-0.5 rounded">
                    📸
                  </span>
                )}
              </span>
              <button
                onClick={() => signOut()}
                className="text-white/40 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/60 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
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
