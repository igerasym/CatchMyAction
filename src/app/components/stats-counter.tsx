"use client";

import { useEffect, useRef, useState } from "react";

interface StatItem {
  value: number;
  label: string;
  icon: string;
  suffix?: string;
}

/** Split number into individual digit cells, flip-clock style */
function DigitDisplay({ value, suffix = "" }: { value: number; suffix?: string }) {
  const digits = value.toString().split("");

  return (
    <div className="flex items-center justify-center gap-[3px]">
      {digits.map((d, i) => (
        <div
          key={i}
          className="w-8 h-11 sm:w-10 sm:h-13 bg-white/[0.08] border border-white/10 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-mono font-bold text-white relative overflow-hidden"
        >
          <span className="relative z-10">{d}</span>
          {/* Flip-clock divider line */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
        </div>
      ))}
      {suffix && (
        <span className="text-xl sm:text-2xl font-bold text-ocean-400 ml-0.5">
          {suffix}
        </span>
      )}
    </div>
  );
}

function AnimatedStat({ stat }: { stat: StatItem }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2200;
          const steps = 80;
          const increment = stat.value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= stat.value) {
              setCount(stat.value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stat.value]);

  return (
    <div
      ref={ref}
      className="text-center p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-ocean-500/20 transition-all group"
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
        {stat.icon}
      </div>
      <DigitDisplay value={count} suffix={stat.suffix} />
      <div className="text-xs sm:text-sm text-white/40 mt-3">{stat.label}</div>
    </div>
  );
}

export default function StatsCounter({ stats }: { stats: StatItem[] }) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <AnimatedStat key={i} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
