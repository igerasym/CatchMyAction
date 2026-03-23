"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Globe, Map, MapPin, Camera } from "lucide-react";
import DateTimeInput from "@/app/components/date-time-input";

interface Suggestion {
  label: string;
  type: string;
  sub?: string;
}

const ICONS: Record<string, React.ElementType> = {
  country: Globe,
  region: Map,
  spot: MapPin,
  session: Camera,
};

export default function SearchBar({ locations }: { locations: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function fetchSuggestions(q: string) {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spots/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 200);
  }

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

  return (
    <section className="-mt-8 relative z-30 px-4">
      <form
        onSubmit={handleSearch}
        className="max-w-3xl mx-auto bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1 relative" ref={wrapperRef}>
          <label htmlFor="spot" className="block text-xs font-medium text-white/40 mb-1">
            Spot, Region, or Country
          </label>
          <input
            id="spot"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
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
                    onClick={() => { setQuery(s.label); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center gap-2.5"
                  >
                    {(() => { const Icon = ICONS[s.type] || MapPin; return <Icon className="w-4 h-4 text-ocean-400 flex-shrink-0" />; })()}
                    <span className="flex-1 min-w-0">
                      <span className="text-white">{s.label}</span>
                      {s.sub && <span className="text-white/30 ml-1.5 text-xs">{s.sub}</span>}
                    </span>
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
          <DateTimeInput
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
