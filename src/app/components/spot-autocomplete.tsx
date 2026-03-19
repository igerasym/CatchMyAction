"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { SURF_SPOTS } from "@/lib/surf-spots";

interface Suggestion {
  type: "country" | "region" | "spot";
  label: string;
  sub: string;
  value: string;
  count?: number;
}

function search(q: string): Suggestion[] {
  if (!q) return [];
  const lower = q.toLowerCase();
  const results: Suggestion[] = [];
  const seen = new Set<string>();

  // Countries
  const countries = new Map<string, number>();
  SURF_SPOTS.forEach((s) => {
    if (s.country.toLowerCase().includes(lower))
      countries.set(s.country, (countries.get(s.country) || 0) + 1);
  });
  countries.forEach((count, country) => {
    if (!seen.has(`c:${country}`)) {
      seen.add(`c:${country}`);
      results.push({ type: "country", label: country, sub: `${count} spots`, value: country, count });
    }
  });

  // Regions
  const regions = new Map<string, { country: string; count: number }>();
  SURF_SPOTS.forEach((s) => {
    if (s.region.toLowerCase().includes(lower)) {
      const k = `${s.region}|${s.country}`;
      if (!regions.has(k)) regions.set(k, { country: s.country, count: 0 });
      regions.get(k)!.count++;
    }
  });
  regions.forEach(({ country, count }, key) => {
    const region = key.split("|")[0];
    if (!seen.has(`r:${key}`)) {
      seen.add(`r:${key}`);
      results.push({ type: "region", label: region, sub: `${count} spots · ${country}`, value: region, count });
    }
  });

  // Spots
  SURF_SPOTS.forEach((s) => {
    const full = `${s.name} ${s.region} ${s.country}`.toLowerCase();
    if (full.includes(lower)) {
      const k = `s:${s.name}:${s.region}`;
      if (!seen.has(k)) {
        seen.add(k);
        results.push({ type: "spot", label: s.name, sub: `${s.region}, ${s.country}`, value: `${s.name}, ${s.region}` });
      }
    }
  });

  return results.slice(0, 8);
}

const ICONS = { country: "🌍", region: "🗺️", spot: "📍" };

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export default function SpotAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Pipeline, Bali, Portugal...",
  name = "location",
  required = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => search(value), [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label htmlFor={name} className="block text-xs font-medium text-white/40 mb-1">{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => value.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/25"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50">
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.label}-${i}`}>
              <button
                type="button"
                onClick={() => { onChange(s.value); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span className="flex-shrink-0">{ICONS[s.type]}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-white">{s.label}</span>
                  <span className="text-white/30 ml-1 text-xs">{s.sub}</span>
                </span>
                {s.count && (
                  <span className="text-xs bg-ocean-500/20 text-ocean-400 px-1.5 py-0.5 rounded-full">{s.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
