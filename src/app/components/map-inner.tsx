"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

if (typeof window !== "undefined") {
  (window as any).L = L;
}

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

const COLORS = { blue: "#38bdf8", green: "#4ade80", gray: "#6b7280" };

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

    require("leaflet.markercluster");
    require("leaflet.markercluster/dist/MarkerCluster.css");
    require("leaflet.markercluster/dist/MarkerCluster.Default.css");

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxBoundsViscosity: 1.0,
      maxBounds: [[-85, -180], [85, 180]],
      scrollWheelZoom: true,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    const LocateControl = L.Control.extend({
      options: { position: "topright" as L.ControlPosition },
      onAdd() {
        const btn = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        btn.innerHTML = '<a href="#" title="My location" role="button" aria-label="My location" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:4px;cursor:pointer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></a>';
        L.DomEvent.disableClickPropagation(btn);
        btn.querySelector("a")!.addEventListener("click", (e) => {
          e.preventDefault();
          map.locate({ setView: true, maxZoom: 10 });
        });
        return btn;
      },
    });
    new LocateControl().addTo(map);

    map.on("locationfound", (e: L.LocationEvent) => {
      L.circleMarker(e.latlng, { radius: 8, color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.4, weight: 2 })
        .addTo(map).bindPopup("You are here").openPopup();
    });

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction(cluster: any) {
        const count = cluster.getChildCount();
        let px = 36;
        if (count > 20) px = 48;
        else if (count > 5) px = 42;
        return L.divIcon({
          html: '<div style="background:rgba(14,165,233,0.7);color:#fff;border-radius:50%;width:' + px + 'px;height:' + px + 'px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid rgba(56,189,248,0.5);font-family:system-ui">' + count + '</div>',
          className: "",
          iconSize: L.point(px, px),
        });
      },
    });

    backgroundSpots.forEach((s) => {
      const m = L.circleMarker(s.coords, { radius: 4, color: "transparent", fillColor: "#0ea5e9", fillOpacity: 0.3, weight: 0 })
        .bindPopup('<div style="font-family:system-ui;min-width:150px"><h3 style="font-weight:600;font-size:13px;margin:0 0 2px;color:#f0f0f0">' + s.name + '</h3><p style="font-size:11px;color:#888;margin:0 0 6px">' + s.region + ', ' + s.country + '</p><p style="font-size:11px;color:#666;margin:0">No sessions yet</p></div>');
      clusterGroup.addLayer(m);
    });

    activeMarkers.forEach((m) => {
      const radius = Math.min(8 + m.photoCount / 10, 20);
      const thumbs = m.thumbnails.length > 0
        ? '<div style="display:flex;gap:4px;margin-bottom:8px">' + m.thumbnails.map((url) => '<img src="' + url + '" style="width:56px;height:40px;object-fit:cover;border-radius:4px" loading="lazy" />').join("") + '</div>'
        : "";
      const popup = '<div style="min-width:200px;font-family:system-ui"><h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#f0f0f0">' + m.title + '</h3><p style="font-size:12px;color:#888;margin:0 0 8px">' + m.location + ' · ' + format(new Date(m.date), "MMM d, yyyy") + '</p>' + thumbs + '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:#888">' + m.photoCount + ' photos</span><a href="/sessions/' + m.id + '" style="font-size:12px;color:#38bdf8;font-weight:500;text-decoration:none">View Gallery →</a></div></div>';
      const marker = L.circleMarker(m.coords, { radius, color: COLORS[m.color], fillColor: COLORS[m.color], fillOpacity: 0.6, weight: 2 }).bindPopup(popup);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [activeMarkers, backgroundSpots]);

  return <div ref={mapRef} className="w-full h-[400px] sm:h-[500px]" style={{ background: "#0d1117" }} />;
}
