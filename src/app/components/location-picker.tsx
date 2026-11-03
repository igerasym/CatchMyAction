"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DARK_TILE_URL, TILE_ATTRIBUTION } from "@/lib/map-tiles";

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

    // REC-red square pin (matches the explore-map markers) — no external marker images
    const pinIcon = L.divIcon({
      html: '<div style="width:18px;height:18px;background:#ff4433;box-shadow:0 0 0 4px rgba(255,68,51,.25),0 0 0 1px #121315"></div>',
      className: "",
      iconSize: L.point(18, 18),
      iconAnchor: L.point(9, 9),
    });

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });

    L.tileLayer(DARK_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelected({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      }
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return (
    <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="location-picker-title"
        className="relative bg-char-2 border border-line w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-line">
          <p className="hud mb-2">Location / Pin</p>
          <h2 id="location-picker-title" className="disp text-2xl text-bone">Pin location on map<span className="text-rec">.</span></h2>
          <p className="text-sm text-mute mt-2">
            We couldn&apos;t find &ldquo;{locationName}&rdquo; automatically. Click the map to set the location.
          </p>
        </div>
        <div ref={mapRef} style={{ height: 350, background: "#121315" }} />
        <div className="p-4 border-t border-line flex flex-wrap gap-3 justify-between items-center">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim" aria-live="polite">
            {selected ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}` : "Click the map to place a pin"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-sec py-2.5 px-4 text-sm">
              Skip
            </button>
            <button onClick={() => selected && onSelect(selected.lat, selected.lng)}
              disabled={!selected}
              className="btn-pri py-2.5 px-4 text-sm disabled:opacity-40 disabled:pointer-events-none">
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
