"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  recent?: boolean;
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
      zoomToBoundsOnClick: false,
      iconCreateFunction(cluster: any) {
        const count = cluster.getChildCount();
        let px = 20;
        if (count > 20) px = 30;
        else if (count > 5) px = 25;
        return L.divIcon({
          html: '<div style="background:rgba(14,165,233,0.6);border-radius:50%;width:' + px + 'px;height:' + px + 'px;border:2px solid rgba(56,189,248,0.4)"></div>',
          className: "",
          iconSize: L.point(px, px),
        });
      },
    });

    // Click cluster → zoom in fast (jump +3 levels or to bounds)
    clusterGroup.on("clusterclick", (e: any) => {
      const bounds = e.layer.getBounds();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    });

    // Background spots — tiny, very faint, NOT clustered
    backgroundSpots.forEach((s) => {
      L.circleMarker(s.coords, { radius: 2, color: "transparent", fillColor: "#0ea5e9", fillOpacity: 0.12, weight: 0 })
        .addTo(map)
        .bindPopup('<div style="font-family:system-ui;min-width:150px"><h3 style="font-weight:600;font-size:13px;margin:0 0 2px;color:#f0f0f0">' + s.name + '</h3><p style="font-size:11px;color:#888;margin:0 0 6px">' + s.region + ', ' + s.country + '</p><p style="font-size:11px;color:#666;margin:0">No sessions yet</p></div>');
    });

    // Group active markers by location (same coords = same spot)
    const spotGroups = new Map<string, typeof activeMarkers>();
    activeMarkers.forEach((m) => {
      const key = `${m.coords[0].toFixed(3)},${m.coords[1].toFixed(3)}`;
      if (!spotGroups.has(key)) spotGroups.set(key, []);
      spotGroups.get(key)!.push(m);
    });

    spotGroups.forEach((sessions, _key) => {
      const first = sessions[0];
      const radius = Math.min(6 + sessions.length * 2, 14);

      let popup: string;
      const exploreUrl = '/sessions?location=' + encodeURIComponent(first.location);

      const hasRecent = sessions.some((s) => s.recent);
      let marker;
      if (hasRecent) {
        marker = L.marker(first.coords, {
          icon: L.divIcon({
            html: '<div style="background:#22c55e;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;position:relative;cursor:pointer">NEW<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid #22c55e"></div></div>',
            className: "",
            iconSize: L.point(32, 20),
            iconAnchor: L.point(16, 20),
          }),
        });
      } else {
        marker = L.circleMarker(first.coords, {
          radius, color: COLORS[first.color], fillColor: COLORS[first.color], fillOpacity: 0.6, weight: 2,
        });
      }
      marker.on("click", () => { window.location.href = exploreUrl; });
      (marker.options as any).sessionCount = sessions.length;
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [activeMarkers, backgroundSpots]);

  return <div ref={mapRef} className="w-full h-[400px] sm:h-[500px]" style={{ background: "#0d1117" }} />;
}
