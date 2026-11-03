"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DARK_TILE_URL, TILE_ATTRIBUTION } from "@/lib/map-tiles";
import { format } from "date-fns";
import { escapeHtml } from "@/lib/html";

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

// Viewfinder tokens (inline HTML for Leaflet divIcons / popups can't use Tailwind)
const INK = "#121315";
const LINE = "#383a40";
const BONE = "#f2ede4";
const MUTE = "#b3ada3";
const DIM = "#948f86";
const REC = "#ff4433";
const REC_INK = "#160806";
const MONO = "var(--font-mono),ui-monospace,monospace";
const SANS = "var(--font-archivo),system-ui,sans-serif";

/**
 * Scoped overrides for Leaflet chrome on the explore map. Higher specificity than the
 * legacy global `.leaflet-popup-*` rules in globals.css, so popups/controls render
 * ink/bone/mono with square corners and no blue.
 */
const MAP_CSS = `
.explore-map .leaflet-popup-content-wrapper{background:${INK}!important;color:${BONE}!important;border-radius:0!important;border:1px solid ${LINE};box-shadow:0 12px 32px rgba(0,0,0,.55)!important}
.explore-map .leaflet-popup-tip{background:${INK}!important;border:1px solid ${LINE};box-shadow:none!important}
.explore-map .leaflet-popup-content{margin:14px 16px}
.explore-map .leaflet-popup-content a{color:${BONE}!important}
.explore-map .leaflet-popup-content a:hover{color:${REC}!important}
.explore-map a.leaflet-popup-close-button{color:${DIM}!important}
.explore-map a.leaflet-popup-close-button:hover{color:${BONE}!important}
.explore-map .leaflet-bar{border:0!important;border-radius:0!important;box-shadow:none!important}
.explore-map .leaflet-bar a{background:${INK}!important;color:${BONE}!important;border:1px solid ${LINE}!important;border-radius:0!important;width:34px;height:34px;line-height:32px}
.explore-map .leaflet-bar a+a{border-top:0!important}
.explore-map .leaflet-bar a:hover{background:#222428!important}
`;

export default function ExploreMap({ markers, allSpots, onSpotClick, flyTo }: Props) {
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
      scrollWheelZoom: false, // don't trap page scroll; zoom via buttons / pinch
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer(DARK_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // Locate me button — same as the homepage map
    const LocateControl = L.Control.extend({
      options: { position: "topright" as L.ControlPosition },
      onAdd() {
        const btn = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        btn.innerHTML =
          '<a href="#" title="My location" role="button" aria-label="My location" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:' + INK + ';border:1px solid ' + LINE + ';cursor:pointer">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + BONE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></a>';
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
      L.circleMarker(e.latlng, { radius: 8, color: REC, fillColor: REC, fillOpacity: 0.4, weight: 2 })
        .addTo(map)
        .bindPopup('<span style="font:600 11px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:' + BONE + '">You are here</span>')
        .openPopup();
    });

    // Cluster group for active sessions — REC-red squares
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
        let px = 22;
        if (total > 20) px = 32;
        else if (total > 5) px = 27;
        return L.divIcon({
          html: '<div style="background:' + REC + ';color:' + REC_INK + ';display:flex;align-items:center;justify-content:center;font:700 11px ' + MONO + ';width:' + px + 'px;height:' + px + 'px">' + total + '</div>',
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

    // Background spots — tiny, faint bone dots (click selects the spot)
    const activeLocations = new Set(markers.map((m) => m.location.split(",")[0].trim().toLowerCase()));
    allSpots.forEach((s) => {
      if (activeLocations.has(s.name.toLowerCase())) return;
      L.circleMarker([s.lat, s.lng], { radius: 2, color: "transparent", fillColor: BONE, fillOpacity: 0.14, weight: 0 })
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

    const hudStyle = "font:500 10.5px " + MONO + ";letter-spacing:.12em;text-transform:uppercase;color:" + DIM;
    const linkStyle = "font:700 11px " + MONO + ";letter-spacing:.12em;text-transform:uppercase;text-decoration:none";

    spotGroups.forEach((sessions) => {
      const first = sessions[0];
      const totalPhotos = sessions.reduce((sum, s) => sum + s.photoCount, 0);

      let popup: string;
      if (sessions.length === 1) {
        popup =
          '<div style="font-family:' + SANS + ';min-width:190px">' +
          '<p style="' + hudStyle + ';margin:0 0 6px">' + escapeHtml(first.location) + '</p>' +
          '<h3 style="font-weight:800;font-size:15px;line-height:1.2;margin:0 0 6px;color:' + BONE + '">' + escapeHtml(first.title) + '</h3>' +
          '<p style="font:11px ' + MONO + ';color:' + MUTE + ';margin:0 0 10px">' + format(new Date(first.date), "d MMM yyyy").toUpperCase() + ' · ' + first.photoCount + ' FRAMES</p>' +
          '<a href="/sessions/' + first.id + '" style="' + linkStyle + '">View gallery →</a></div>';
      } else {
        const list = sessions.slice(0, 5).map((s) =>
          '<a href="/sessions/' + s.id + '" style="display:block;padding:7px 0;border-top:1px solid ' + LINE + ';text-decoration:none">' +
          '<span style="font-size:13px;font-weight:700">' + escapeHtml(s.title) + '</span>' +
          '<span style="font:10.5px ' + MONO + ';letter-spacing:.08em;color:' + DIM + ';display:block;margin-top:2px">' + format(new Date(s.date), "d MMM").toUpperCase() + ' · ' + s.photoCount + ' FRAMES</span></a>'
        ).join("");
        const more = sessions.length > 5
          ? '<p style="' + hudStyle + ';padding-top:6px;margin:0;border-top:1px solid ' + LINE + '">+' + (sessions.length - 5) + ' more</p>'
          : "";
        popup =
          '<div style="font-family:' + SANS + ';min-width:210px;max-height:280px;overflow-y:auto">' +
          '<h3 style="font-weight:800;font-size:15px;margin:0 0 4px;color:' + BONE + '">' + escapeHtml(first.location) + '</h3>' +
          '<p style="' + hudStyle + ';margin:0 0 8px">' + sessions.length + ' sessions · ' + totalPhotos + ' frames</p>' +
          list + more + '</div>';
      }

      // Focus-bracket marker: REC square with photo count + mono location chip (homepage style)
      const marker = L.marker([first.lat, first.lng], {
        title: first.location,
        icon: L.divIcon({
          html:
            '<div style="position:relative;display:flex;align-items:center;gap:6px;cursor:pointer;font-family:' + MONO + '">' +
            '<span style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:26px;background:' + REC + ';color:' + REC_INK + ';font-weight:700;font-size:12px">' +
            totalPhotos +
            '</span>' +
            '<span style="background:rgba(18,19,21,.85);color:' + BONE + ';font-size:10px;letter-spacing:.1em;padding:3px 6px;white-space:nowrap;text-transform:uppercase">' +
            escapeHtml(first.location) +
            '</span></div>',
          className: "",
          iconSize: L.point(34, 26),
          iconAnchor: L.point(17, 13),
        }),
        sessionCount: sessions.length,
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

  return (
    <>
      <style>{MAP_CSS}</style>
      <div ref={mapRef} className="explore-map w-full h-full" style={{ background: INK }} />
    </>
  );
}
