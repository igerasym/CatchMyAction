"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DARK_TILE_URL, TILE_ATTRIBUTION } from "@/lib/map-tiles";
import { escapeHtml } from "@/lib/html";
import { fitView, WORLD_VIEW } from "@/lib/map-fit";
import { bindLabelZoom, clusterSize, countSquareHtml, spotMarkerHtml, spotTitle } from "@/lib/map-markers";

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
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      minZoom: 1, // lets far-apart spots fit on a 375px phone
      maxBoundsViscosity: 1.0,
      maxBounds: [[-85, -180], [85, 180]],
      scrollWheelZoom: false, // don't trap page scroll; zoom via buttons / pinch
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer(DARK_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const LocateControl = L.Control.extend({
      options: { position: "topright" as L.ControlPosition },
      onAdd() {
        const btn = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        btn.innerHTML = '<a href="#" title="My location" role="button" aria-label="My location" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#121315;border:1px solid #383a40;cursor:pointer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f2ede4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></a>';
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
      L.circleMarker(e.latlng, { radius: 8, color: "#ff4433", fillColor: "#ff4433", fillOpacity: 0.4, weight: 2 })
        .addTo(map).bindPopup("You are here").openPopup();
    });

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction(cluster: any) {
        // Count sessions, not pins: one pin can hold several sessions at the same spot
        let total = 0;
        cluster.getAllChildMarkers().forEach((m: any) => { total += m.options.sessionCount || 1; });
        const px = clusterSize(total);
        return L.divIcon({ html: countSquareHtml(total), className: "", iconSize: L.point(px, px) });
      },
    });

    // Click cluster → zoom in fast (jump +3 levels or to bounds)
    clusterGroup.on("clusterclick", (e: any) => {
      const bounds = e.layer.getBounds();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    });

    // Background spots — tiny, very faint, NOT clustered
    backgroundSpots.forEach((s) => {
      L.circleMarker(s.coords, { radius: 2, color: "transparent", fillColor: "#f2ede4", fillOpacity: 0.14, weight: 0 })
        .addTo(map)
        .bindPopup('<div style="font-family:system-ui;min-width:150px"><h3 style="font-weight:600;font-size:13px;margin:0 0 2px;color:#f0f0f0">' + escapeHtml(s.name) + '</h3><p style="font-size:11px;color:#888;margin:0 0 6px">' + escapeHtml(s.region) + ', ' + escapeHtml(s.country) + '</p><p style="font-size:11px;color:#666;margin:0">No sessions yet</p></div>');
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

      let popup: string;
      const exploreUrl = '/sessions?location=' + encodeURIComponent(first.location);

      const photos = sessions.reduce((n, x) => n + (x.photoCount || 0), 0);
      // Same pin as a cluster: session count in the square; name + photos in a chip when zoomed in
      const px = clusterSize(sessions.length);
      const marker = L.marker(first.coords, {
        title: spotTitle(first.location, sessions.length, photos),
        icon: L.divIcon({
          html: spotMarkerHtml(first.location, sessions.length, photos),
          className: "",
          iconSize: L.point(px, px),
          iconAnchor: L.point(px / 2, px / 2),
        }),
        sessionCount: sessions.length,
      } as any);
      marker.on("click", () => { window.location.href = exploreUrl; });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    // Frame the spots that actually have sessions (extra right padding for the location chip)
    const view = fitView(activeMarkers.map((m) => m.coords));
    if (view.kind === "bounds") {
      map.fitBounds(view.bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [130, 40], maxZoom: view.maxZoom });
    } else {
      map.setView(view.center, view.zoom);
    }
    bindLabelZoom(map);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [activeMarkers, backgroundSpots]);

  return <div ref={mapRef} className="w-full h-full min-h-[420px] sm:min-h-[560px]" style={{ background: "#121315" }} />;
}
