import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { FullWeatherData } from "../types.js";

interface ComparisonMapProps {
  cities: FullWeatherData[];
  tempUnit: "C" | "F";
}

// Haversine formula to compute distance in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function ComparisonMap({ cities, tempUnit }: ComparisonMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Inject Leaflet CSS once
  useEffect(() => {
    const linkId = "leaflet-stylesheet";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.onload = () => setCssLoaded(true);
      document.head.appendChild(link);
    } else {
      setCssLoaded(true);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!cssLoaded || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default center around average of cities, or a default coordinate
    const centerLat = cities.length > 0 ? cities.reduce((acc, c) => acc + c.location.lat, 0) / cities.length : 20.5937;
    const centerLon = cities.length > 0 ? cities.reduce((acc, c) => acc + c.location.lon, 0) / cities.length : 78.9629;
    const defaultZoom = cities.length > 1 ? 4 : 6;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [cssLoaded]);

  // Update Markers and Lines when cities change
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current || cities.length === 0) return;

    const layersGroup = layersGroupRef.current;
    layersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Add Markers
    cities.forEach((city, index) => {
      const latlng = L.latLng(city.location.lat, city.location.lon);
      bounds.extend(latlng);

      const colorClass = index === 0 ? "border-indigo-400" : "border-pink-400";
      const badgeText = index === 0 ? "A" : String.fromCharCode(65 + index);

      const markerIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="px-2 py-1 bg-slate-950/90 text-white border ${colorClass} rounded-md text-[10px] font-mono shadow-xl whitespace-nowrap">
              <span class="font-bold text-indigo-300">[${badgeText}]</span> ${city.location.name}: ${Math.round(
          tempUnit === "F" ? (city.current.temp * 9) / 5 + 32 : city.current.temp
        )}°${tempUnit}
            </div>
            <div class="w-3.5 h-3.5 bg-slate-900 border-2 ${
              index === 0 ? "border-indigo-400" : "border-pink-400"
            } rounded-full shadow-lg flex items-center justify-center text-[8px] text-white font-bold mt-0.5">${badgeText}</div>
          </div>
        `,
        className: "custom-leaflet-marker",
        iconSize: [110, 45],
        iconAnchor: [55, 45],
      });

      L.marker(latlng, { icon: markerIcon }).addTo(layersGroup);
    });

    // Draw lines between cities and calculate distances
    if (cities.length > 1) {
      // Connect first city to all subsequent cities to avoid clutter, or draw a loop/tree
      const baseCity = cities[0];
      for (let i = 1; i < cities.length; i++) {
        const targetCity = cities[i];
        const dist = calculateDistance(
          baseCity.location.lat,
          baseCity.location.lon,
          targetCity.location.lat,
          targetCity.location.lon
        );

        const latlngs = [
          [baseCity.location.lat, baseCity.location.lon] as [number, number],
          [targetCity.location.lat, targetCity.location.lon] as [number, number],
        ];

        // Animated geodesic line using SVG styling (dashed pulsing line)
        const polyline = L.polyline(latlngs, {
          color: "#ec4899",
          weight: 1.5,
          opacity: 0.6,
          dashArray: "6, 6",
        }).addTo(layersGroup);

        // Bind tooltip with distance
        polyline.bindTooltip(
          `<div class="bg-slate-950 text-white border border-pink-500/30 px-2 py-1 rounded text-[10px] font-mono shadow-lg">
            Distance: <strong>${dist} km</strong>
          </div>`,
          { permanent: true, direction: "center", className: "distance-tooltip-bg" }
        );
      }
    }

    // Auto fit bounds with some padding
    if (cities.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapRef.current.setView([cities[0].location.lat, cities[0].location.lon], 6);
    }
  }, [cities, tempUnit]);

  return (
    <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950/60 shadow-inner">
      {!cssLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono">
          Booting Climatological Relationship Cartography...
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[1000] px-2 py-1 bg-slate-950/80 text-[9px] text-slate-400 font-mono rounded-md border border-white/5 pointer-events-none">
        Dynamic Geospatial Baseline • Geodesic Connections Measured
      </div>
    </div>
  );
}
