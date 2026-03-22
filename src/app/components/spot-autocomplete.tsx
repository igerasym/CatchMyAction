"use client";

import { useState, useRef, useEffect } from "react";

interface Suggestion {
  label: string;
  type: string;
  sub?: string;
}

const ICONS: Record<string, string> = { country: "🌍", region: "🗺️", spot: "📍", session: "📸" };

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
  placeholder = "Pipeline, Bali, or any location...",
  name = "location",
  required = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(q: string) {
    onChange(q);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spots/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true);
      } catch { setSuggestions([]); }
    }, 200);
  }

  return (
    <div className="relative" ref={ref}>
      <label htmlFor={name} className="block text-xs font-medium text-white/40 mb-1">{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
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
                onClick={() => { onChange(s.label); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span className="flex-shrink-0">{ICONS[s.type] || "📍"}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-white">{s.label}</span>
                  {s.sub && <span className="text-white/30 ml-1 text-xs">{s.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
