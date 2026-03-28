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
        // Sum session counts from all child markers
        let total = 0;
        cluster.getAllChildMarkers().forEach((m: any) => {
          total += m.options.sessionCount || 1;
        });
        let px = 36;
        if (total > 20) px = 48;
        else if (total > 5) px = 42;
        return L.divIcon({
          html: '<div style="background:rgba(14,165,233,0.7);color:#fff;border-radius:50%;width:' + px + 'px;height:' + px + 'px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid rgba(56,189,248,0.5);font-family:system-ui">' + total + '</div>',
          className: "",
          iconSize: L.point(px, px),
        });
      },
    });

    clusterGroup.on("clusterclick", (e: any) => {
      const currentZoom = map.getZoom();
      const bounds = e.layer.getBounds();
      const targetZoom = map.getBoundsZoom(bounds, false, L.point(40, 40));
      // Only zoom in, never out
      if (targetZoom > currentZoom) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else {
        e.layer.spiderfy();
      }
    });

    // Background spots — tiny dots
    const activeLocations = new Set(markers.map((m) => m.location.split(",")[0].trim().toLowerCase()));
    allSpots.forEach((s) => {
      if (activeLocations.has(s.name.toLowerCase())) return;
      L.circleMarker([s.lat, s.lng], { radius: 2, color: "transparent", fillColor: "#0ea5e9", fillOpacity: 0.12, weight: 0 })
        .addTo(map)
        .on("click", () => onSpotClick(s.name));
    });

    // Group markers by location (same coords = same spot)
    const spotGroups = new Map<string, typeof markers>();
    markers.forEach((m) => {
      const key = `${m.lat.toFixed(3)},${m.lng.toFixed(3)}`;
      if (!spotGroups.has(key)) spotGroups.set(key, []);
      spotGroups.get(key)!.push(m);
    });

    spotGroups.forEach((sessions) => {
      const first = sessions[0];
      const totalPhotos = sessions.reduce((sum, s) => sum + s.photoCount, 0);
      const radius = Math.min(8 + totalPhotos / 10, 18);

      let popup: string;
      if (sessions.length === 1) {
        popup = '<div style="font-family:system-ui;min-width:180px">' +
          '<h3 style="font-weight:600;font-size:14px;margin:0 0 4px;color:#f0f0f0">' + first.title + '</h3>' +
          '<p style="font-size:12px;color:#888;margin:0 0 6px">' + first.location + ' · ' + format(new Date(first.date), "MMM d") + '</p>' +
          '<p style="font-size:12px;color:#888;margin:0 0 8px">' + first.photoCount + ' photos</p>' +
          '<a href="/sessions/' + first.id + '" style="font-size:12px;color:#38bdf8;font-weight:500;text-decoration:none">View Gallery →</a></div>';
      } else {
        const list = sessions.slice(0, 5).map((s) =>
          '<a href="/sessions/' + s.id + '" style="display:block;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-decoration:none">' +
          '<span style="font-size:13px;color:#f0f0f0">' + s.title + '</span>' +
          '<span style="font-size:11px;color:#888;display:block">' + format(new Date(s.date), "MMM d") + ' · ' + s.photoCount + ' photos</span></a>'
        ).join("");
        const more = sessions.length > 5 ? '<p style="font-size:11px;color:#666;padding-top:4px">+' + (sessions.length - 5) + ' more</p>' : "";
        popup = '<div style="font-family:system-ui;min-width:200px;max-height:280px;overflow-y:auto">' +
          '<h3 style="font-weight:600;font-size:14px;margin:0 0 2px;color:#f0f0f0">' + first.location + '</h3>' +
          '<p style="font-size:12px;color:#888;margin:0 0 8px">' + sessions.length + ' sessions · ' + totalPhotos + ' photos</p>' +
          list + more + '</div>';
      }

      const marker = sessions.length > 1
        ? L.marker([first.lat, first.lng], {
            icon: L.divIcon({
              html: '<div style="background:rgba(14,165,233,0.8);color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid rgba(56,189,248,0.5);font-family:system-ui">' + sessions.length + '</div>',
              className: "",
              iconSize: L.point(28, 28),
              iconAnchor: L.point(14, 14),
            }),
            sessionCount: sessions.length,
          } as any).bindPopup(popup)
        : L.circleMarker([first.lat, first.lng], {
            radius, color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.6, weight: 2,
            sessionCount: 1,
          } as any).bindPopup(popup);
      marker.on("click", () => {
        marker.openPopup();
        onSpotClick(first.location);
      });
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
