"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

interface ActiveMarker {
  id: string;
  title: string;
  location: string;
  date: string;
  photoCount: number;
  thumbnails: string[];
  coords: [number, number];
  color: "blue" | "green" | "gray";
  type: "active";
}

interface BackgroundSpot {
  name: string;
  region: string;
  country: string;
  coords: [number, number];
  type: "background";
}

const COLORS = {
  blue: "#38bdf8",
  green: "#4ade80",
  gray: "#6b7280",
};

export default function MapInner({
  activeMarkers,
  backgroundSpots,
}: {
  activeMarkers: ActiveMarker[];
  backgroundSpots: BackgroundSpot[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxBoundsViscosity: 1.0,
      maxBounds: [[-85, -180], [85, 180]],
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    // 1. Background spots — small subtle dots
    backgroundSpots.forEach((s) => {
      L.circleMarker(s.coords, {
        radius: 4,
        color: "transparent",
        fillColor: "#0ea5e9",
        fillOpacity: 0.25,
        weight: 0,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:150px">
            <h3 style="font-weight:600;font-size:13px;margin:0 0 2px;color:#f0f0f0">${s.name}</h3>
            <p style="font-size:11px;color:#888;margin:0 0 6px">${s.region}, ${s.country}</p>
            <p style="font-size:11px;color:#666;margin:0">No sessions yet</p>
          </div>`
        );
    });

    // 2. Active session markers — larger, colored
    activeMarkers.forEach((m) => {
      const radius = Math.min(8 + m.photoCount / 10, 20);

      const thumbsHtml =
        m.thumbnails.length > 0
          ? `<div style="display:flex;gap:4px;margin-bottom:8px">${m.thumbnails
              .map(
                (url) =>
                  `<img src="${url}" style="width:56px;height:40px;object-fit:cover;border-radius:4px" loading="lazy" />`
              )
              .join("")}</div>`
          : "";

      const popupHtml = `
        <div style="min-width:200px;font-family:system-ui">
          <h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#f0f0f0">${m.title}</h3>
          <p style="font-size:12px;color:#888;margin:0 0 8px">
            📍 ${m.location} · 📅 ${format(new Date(m.date), "MMM d, yyyy")}
          </p>
          ${thumbsHtml}
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#888">📸 ${m.photoCount} photos</span>
            <a href="/sessions/${m.id}" style="font-size:12px;color:#38bdf8;font-weight:500;text-decoration:none">View Gallery →</a>
          </div>
        </div>
      `;

      L.circleMarker(m.coords, {
        radius,
        color: COLORS[m.color],
        fillColor: COLORS[m.color],
        fillOpacity: 0.6,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(popupHtml);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [activeMarkers, backgroundSpots]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] sm:h-[500px]"
      style={{ background: "#0d1117" }}
    />
  );
}
