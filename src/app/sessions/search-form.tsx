"use client";

import { useState } from "react";
import SpotAutocomplete from "@/app/components/spot-autocomplete";

export default function SearchForm({
  initialLocation,
  initialDate,
}: {
  initialLocation?: string;
  initialDate?: string;
}) {
  const [location, setLocation] = useState(initialLocation || "");
  const [date, setDate] = useState(initialDate || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (date) params.set("date", date);
    window.location.href = `/sessions?${params.toString()}`;
  }

  return (
    <form onSubmit={handleSearch} className="mb-8 flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <SpotAutocomplete
          value={location}
          onChange={setLocation}
          label="Surf Spot, Region, or Country"
          placeholder="Pipeline, Bali, Portugal..."
          required={false}
        />
      </div>
      <div className="sm:w-44">
        <label htmlFor="date" className="block text-xs font-medium text-white/40 mb-1">Date</label>
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
          Search
        </button>
      </div>
    </form>
  );
}
