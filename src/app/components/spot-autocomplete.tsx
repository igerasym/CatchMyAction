"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Map as MapIcon, MapPin, Camera, type LucideIcon } from "lucide-react";

interface Suggestion {
  label: string;
  type: string;
  sub?: string;
  spot?: { id: string; lat: number; lng: number };
}

const ICONS: Record<string, LucideIcon> = { country: Globe, region: MapIcon, spot: MapPin, session: Camera };

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Called with the catalogue spot when a spot suggestion is picked, and with null when the user types. */
  onSelectSpot?: (spot: { id: string; name: string; lat: number; lng: number } | null) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export default function SpotAutocomplete({
  value,
  onChange,
  onSelectSpot,
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
    onSelectSpot?.(null);
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
      <label htmlFor={name} className="hud block mb-2">{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${name}-suggestions`}
        aria-autocomplete="list"
        className="w-full px-3.5 py-3 bg-ink border border-line text-bone text-sm placeholder:text-dim focus:border-bone focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul id={`${name}-suggestions`} role="listbox" className="absolute top-full left-0 right-0 mt-px bg-ink border border-line shadow-xl max-h-56 overflow-y-auto z-50">
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.label}-${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.label);
                  onSelectSpot?.(s.spot ? { id: s.spot.id, name: s.label, lat: s.spot.lat, lng: s.spot.lng } : null);
                  setOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 text-sm border-b border-line last:border-b-0 hover:bg-char-2 focus:bg-char-2 focus:outline-none transition-colors flex items-center gap-2.5"
              >
                {(() => { const Icon = ICONS[s.type] || MapPin; return <Icon className="w-3.5 h-3.5 flex-shrink-0 text-dim" aria-hidden="true" />; })()}
                <span className="flex-1 min-w-0">
                  <span className="text-bone">{s.label}</span>
                  {s.sub && <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-dim ml-2">{s.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
