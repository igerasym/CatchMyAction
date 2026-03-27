"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function HeroSection() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const showUpload = !user || user.role === "PHOTOGRAPHER";

  return (
    <section className="relative h-[85vh] min-h-[500px] sm:h-[90vh] sm:min-h-[600px] flex items-center justify-center overflow-hidden -mt-14">
      {/* Background image — optimized */}
      <Image
        src="/hero-bg.jpg"
        alt="Action sports photography"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        quality={75}
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />

      {/* Animated wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 overflow-hidden">
        <svg viewBox="0 0 1440 120" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,80 C240,40 480,100 720,60 C960,20 1200,80 1440,50 L1440,120 L0,120 Z"
            fill="#0a0a0a"
            opacity="0.6"
          />
          <path
            d="M0,90 C180,70 360,110 540,80 C720,50 900,100 1080,70 C1260,40 1380,90 1440,80 L1440,120 L0,120 Z"
            fill="#0a0a0a"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
          Find Your
          <br />
          <span className="text-ocean-400">Moment</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
          Shot on real sessions. Instantly find yourself and own the moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sessions"
            className="px-8 py-4 bg-ocean-500 text-white font-semibold rounded-xl hover:bg-ocean-400 transition-all shadow-lg shadow-ocean-500/25 hover:shadow-ocean-400/40 hover:-translate-y-0.5 text-lg"
          >
            Find My Photos
          </Link>
          {showUpload && (
            <Link
              href="/upload"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 text-lg"
            >
              Upload Photos
            </Link>
          )}
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-white/10 text-white/60 font-medium rounded-xl hover:bg-white/5 hover:text-white/80 transition-all text-lg"
          >
            How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
