"use client";

import { Upload, Search, Download } from "lucide-react";

const steps = [
  {
    Icon: Upload,
    title: "Photographer Uploads",
    desc: "Action photographers upload sessions tagged by spot, date, and time. Photos are auto-watermarked.",
  },
  {
    Icon: Search,
    title: "Find Your Photos",
    desc: "Browse by location and date. You know when and where you were — find your session in seconds.",
  },
  {
    Icon: Download,
    title: "Buy HD Download",
    desc: "Found yourself? Purchase the high-resolution original. Instant download, no watermark.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-[#111]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          How It Works
        </h2>
        <p className="text-white/40 text-center mb-12">
          From action to album in 3 steps
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-ocean-500/30 transition-colors group"
            >
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <step.Icon className="w-7 h-7 text-ocean-400" strokeWidth={1.5} />
                </div>
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ocean-500/20 text-ocean-400 font-bold text-sm mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white">
                {step.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
