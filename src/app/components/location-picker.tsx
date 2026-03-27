"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  locationName: string;
}

export default function LocationPicker({ onSelect, onClose, locationName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Fix Leaflet default marker icon path issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OSM &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelected({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-base font-bold text-white">Pin location on map</h2>
          <p className="text-xs text-white/40 mt-0.5">
            We couldn't find "{locationName}" automatically. Click the map to set the location.
          </p>
        </div>
        <div ref={mapRef} style={{ height: 350 }} />
        <div className="p-4 flex justify-between items-center">
          <p className="text-xs text-white/30">
            {selected ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}` : "Click the map to place a pin"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors">
              Skip
            </button>
            <button onClick={() => selected && onSelect(selected.lat, selected.lng)}
              disabled={!selected}
              className="px-4 py-2 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-400 disabled:opacity-30 transition-colors">
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
