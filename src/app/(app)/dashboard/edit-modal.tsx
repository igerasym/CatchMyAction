"use client";

import { useState, useRef, useEffect } from "react";
import { SURF_SPOTS, getSpotLabel } from "@/lib/surf-spots";

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
  const [price, setPrice] = useState(((session as any).pricePerPhoto || 999) / 100 + "");
  const [saving, setSaving] = useState(false);
  const [showSpots, setShowSpots] = useState(false);
  const spotRef = useRef<HTMLDivElement>(null);

  const spotMatches = location.length > 0
    ? SURF_SPOTS.filter((s) => getSpotLabel(s).toLowerCase().includes(location.toLowerCase())).slice(0, 6)
    : [];

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
    await onSave({ title, location, date, startTime, endTime, description, pricePerPhoto: Math.round(parseFloat(price) * 100) });
    setSaving(false);
  }

  const inputClass =
    "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent";

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-4">Edit Session</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div className="relative" ref={spotRef}>
            <label className="block text-xs text-white/40 mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => { setLocation(e.target.value); setShowSpots(true); }}
              onFocus={() => location.length > 0 && setShowSpots(true)}
              required
              autoComplete="off"
              className={inputClass}
            />
            {showSpots && spotMatches.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50">
                {spotMatches.map((s) => (
                  <li key={getSpotLabel(s)}>
                    <button
                      type="button"
                      onClick={() => { setLocation(`${s.name}, ${s.region}`); setShowSpots(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
                    >
                      <span className="text-ocean-400 mr-1">📍</span>
                      <span className="text-white">{s.name}</span>
                      <span className="text-white/30 ml-1 text-xs">{s.region}, {s.country}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-white/40 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                min={`${new Date().getFullYear() - 1}-01-01`} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Start</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">End</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Price per Photo ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
              min="0.50" max="999" step="0.01" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
