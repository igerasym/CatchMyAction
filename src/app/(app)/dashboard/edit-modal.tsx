"use client";

import { useState, useRef, useEffect } from "react";
import DateTimeInput from "@/app/components/date-time-input";
import { MapPin } from "lucide-react";
import { DEFAULT_PRICE_CENTS } from "@/lib/pricing";
import { INPUT, LABEL } from "../ui";

interface SpotSuggestion {
  label: string;
  type: string;
  sub?: string;
}

interface Props {
  session: {
    id: string;
    title: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string | null;
  };
  onSave: (data: Record<string, any>) => void;
  onClose: () => void;
}

export default function EditSessionModal({ session, onSave, onClose }: Props) {
  const [title, setTitle] = useState(session.title);
  const [location, setLocation] = useState(session.location);
  const [date, setDate] = useState(session.date.split("T")[0]);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [description, setDescription] = useState(session.description || "");
  const initialPriceCents: number = (session as any).pricePerPhoto ?? DEFAULT_PRICE_CENTS;
  const [price, setPrice] = useState(initialPriceCents / 100 + "");
  const [saving, setSaving] = useState(false);
  const [showSpots, setShowSpots] = useState(false);
  const [spotMatches, setSpotMatches] = useState<SpotSuggestion[]>([]);
  const spotRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function fetchSpots(q: string) {
    if (q.length < 2) { setSpotMatches([]); setShowSpots(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spots/autocomplete?q=${encodeURIComponent(q)}${(session as any).sportType ? `&sport=${encodeURIComponent((session as any).sportType)}` : ""}`);
        const data = await res.json();
        setSpotMatches(data.suggestions || []);
        setShowSpots(true);
      } catch { setSpotMatches([]); }
    }, 200);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (spotRef.current && !spotRef.current.contains(e.target as Node)) setShowSpots(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const priceCents = Math.round(parseFloat(price) * 100);
    const priceUpdate =
      Number.isFinite(priceCents) && priceCents !== initialPriceCents ? { pricePerPhoto: priceCents } : {};
    await onSave({ title, location, date, startTime, endTime, description, ...priceUpdate });
    setSaving(false);
  }

  const inputClass = INPUT;

  return (
    <div
      className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        className="bg-char-2 border border-line w-full max-w-md p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="hud mb-3">Session / Edit</p>
        <h2 id="edit-session-title" className="disp text-2xl text-bone mb-6">Edit session<span className="text-rec">.</span></h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className={LABEL}>Title</label>
            <input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div className="relative" ref={spotRef}>
            <label htmlFor="edit-location" className={LABEL}>Location</label>
            <input
              id="edit-location"
              value={location}
              onChange={(e) => { setLocation(e.target.value); fetchSpots(e.target.value); }}
              onFocus={() => location.length >= 2 && spotMatches.length > 0 && setShowSpots(true)}
              required
              autoComplete="off"
              className={inputClass}
            />
            {showSpots && spotMatches.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-px bg-ink border border-line shadow-xl max-h-40 overflow-y-auto z-50">
                {spotMatches.map((s, i) => (
                  <li key={`${s.type}-${s.label}-${i}`}>
                    <button
                      type="button"
                      onClick={() => { setLocation(s.label); setShowSpots(false); }}
                      className="w-full text-left px-3.5 py-2 text-sm border-b border-line last:border-b-0 hover:bg-char-2 focus:bg-char-2 focus:outline-none transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-dim flex-shrink-0" aria-hidden="true" />
                      <span className="text-bone">{s.label}</span>
                      {s.sub && <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-dim">{s.sub}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="edit-date" className={LABEL}>Date</label>
              <DateTimeInput id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                min={`${new Date().getFullYear() - 1}-01-01`} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-start" className={LABEL}>Start</label>
              <DateTimeInput id="edit-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-end" className={LABEL}>End</label>
              <DateTimeInput id="edit-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="edit-price" className={LABEL}>Price per Photo ($)</label>
            <input id="edit-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
              min="0" max="999" step="0.01" className={inputClass} />
          </div>
          <div>
            <label htmlFor="edit-description" className={LABEL}>Description</label>
            <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-4 border-t border-line">
            <button
              type="submit"
              disabled={saving}
              className="btn-pri flex-1 justify-center py-3 text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-sec py-3 px-5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
