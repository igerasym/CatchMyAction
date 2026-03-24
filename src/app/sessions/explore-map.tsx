"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

if (typeof window !== "undefined") {
  (window as any).L = L;
}

interface Marker {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  photoCount: number;
  date: string;
}

interface Spot {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

interface Props {
  markers: Marker[];
  allSpots: Spot[];
  onSpotClick: (location: string) => void;
  selectedLocation: string;
  flyTo?: { lat: number; lng: number; zoom: number } | null;
}

export default function ExploreMap({ markers, allSpots, onSpotClick, selectedLocation, flyTo }: Props) {
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

    // Locate me button
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

    // Cluster group for active sessions
    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
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

    clusterGroup.on("clusterclick", (e: any) => {
      map.fitBounds(e.layer.getBounds(), { padding: [40, 40], maxZoom: 14 });
    });

    // Background spots — tiny dots
    const activeLocations = new Set(markers.map((m) => m.location.split(",")[0].trim().toLowerCase()));
    allSpots.forEach((s) => {
      if (activeLocations.has(s.name.toLowerCase())) return;
      L.circleMarker([s.lat, s.lng], { radius: 2, color: "transparent", fillColor: "#0ea5e9", fillOpacity: 0.12, weight: 0 })
        .addTo(map)
        .on("click", () => onSpotClick(s.name));
    });

    // Active session markers
    markers.forEach((m) => {
      const radius = Math.min(8 + m.photoCount / 10, 18);
      const marker = L.circleMarker([m.lat, m.lng], {
        radius, color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.6, weight: 2,
      });
      marker.bindPopup(
        '<div style="font-family:system-ui;min-width:180px">' +
        '<h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#f0f0f0">' + m.title + '</h3>' +
        '<p style="font-size:12px;color:#888;margin:0 0 6px">' + m.location + ' · ' + format(new Date(m.date), "MMM d") + '</p>' +
        '<p style="font-size:12px;color:#888;margin:0 0 8px">' + m.photoCount + ' photos</p>' +
        '<a href="/sessions/' + m.id + '" style="font-size:12px;color:#38bdf8;font-weight:500;text-decoration:none">View Gallery →</a>' +
        '</div>'
      );
      marker.on("click", () => onSpotClick(m.location));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [markers, allSpots, onSpotClick]);

  // Fly to location when triggered
  useEffect(() => {
    if (flyTo && mapInstance.current) {
      mapInstance.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 1.5 });
    }
  }, [flyTo]);

  return <div ref={mapRef} className="w-full h-full" style={{ background: "#0d1117" }} />;
}
