"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { SURF_SPOTS, SurfSpot } from "@/lib/surf-spots";

type SuggestionType = "spot" | "region" | "country";

interface Suggestion {
  type: SuggestionType;
  label: string;
  sub: string;
  searchValue: string;
  count?: number;
}

function buildSuggestions(query: string): Suggestion[] {
  if (query.length === 0) return [];
  const q = query.toLowerCase();
  const results: Suggestion[] = [];
  const seen = new Set<string>();

  // 1. Country matches (e.g. "portugal" → all spots in Portugal)
  const countryMatches = new Map<string, SurfSpot[]>();
  SURF_SPOTS.forEach((s) => {
    if (s.country.toLowerCase().includes(q)) {
      if (!countryMatches.has(s.country)) countryMatches.set(s.country, []);
      countryMatches.get(s.country)!.push(s);
    }
  });
  countryMatches.forEach((spots, country) => {
    const key = `country:${country}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        type: "country",
        label: country,
        sub: `${spots.length} surf spots`,
        searchValue: country,
        count: spots.length,
      });
    }
  });

  // 2. Region matches (e.g. "north shore" → all spots in North Shore)
  const regionMatches = new Map<string, SurfSpot[]>();
  SURF_SPOTS.forEach((s) => {
    if (s.region.toLowerCase().includes(q)) {
      const key = `${s.region}|${s.country}`;
      if (!regionMatches.has(key)) regionMatches.set(key, []);
      regionMatches.get(key)!.push(s);
    }
  });
  regionMatches.forEach((spots, key) => {
    const [region, country] = key.split("|");
    const seenKey = `region:${key}`;
    if (!seen.has(seenKey)) {
      seen.add(seenKey);
      results.push({
        type: "region",
        label: region,
        sub: `${spots.length} spots · ${country}`,
        searchValue: region,
        count: spots.length,
      });
    }
  });

  // 3. Individual spot matches
  SURF_SPOTS.forEach((s) => {
    if (
      s.name.toLowerCase().includes(q) ||
      `${s.name} ${s.region} ${s.country}`.toLowerCase().includes(q)
    ) {
      const key = `spot:${s.name}:${s.region}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: "spot",
          label: s.name,
          sub: `${s.region}, ${s.country}`,
          searchValue: s.name,
        });
      }
    }
  });

  return results.slice(0, 10);
}

const ICONS: Record<SuggestionType, string> = {
  country: "🌍",
  region: "🗺️",
  spot: "📍",
};

export default function SearchBar({ locations }: { locations: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => buildSuggestions(query), [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("location", query);
    if (date) params.set("date", date);
    router.push(`/sessions?${params.toString()}`);
  }

  function selectSuggestion(s: Suggestion) {
    setQuery(s.searchValue);
    setShowSuggestions(false);
  }

  return (
    <section className="-mt-8 relative z-30 px-4">
      <form
        onSubmit={handleSearch}
        className="max-w-3xl mx-auto bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1 relative" ref={wrapperRef}>
          <label htmlFor="spot" className="block text-xs font-medium text-white/40 mb-1">
            Surf Spot, Region, or Country
          </label>
          <input
            id="spot"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => query.length > 0 && setShowSuggestions(true)}
            placeholder="Pipeline, Bali, Portugal, North Shore..."
            autoComplete="off"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/25"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl max-h-72 overflow-y-auto z-50">
              {suggestions.map((s, i) => (
                <li key={`${s.type}-${s.label}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center gap-2.5"
                  >
                    <span className="text-lg flex-shrink-0">{ICONS[s.type]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-white">{s.label}</span>
                      <span className="text-white/30 ml-1.5 text-xs">{s.sub}</span>
                    </span>
                    {s.count && (
                      <span className="text-xs bg-ocean-500/20 text-ocean-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        {s.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sm:w-44">
          <label htmlFor="date" className="block text-xs font-medium text-white/40 mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
          />
        </div>
        <div className="sm:self-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-ocean-500 text-white font-medium rounded-lg hover:bg-ocean-400 transition-colors"
          >
            Show Sessions
          </button>
        </div>
      </form>
    </section>
  );
}
