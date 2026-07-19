import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface WeatherMapProps {
  lat: number;
  lon: number;
  cityName: string;
  temp: number;
  tempUnit: "C" | "F";
  onCoordinateSelect: (lat: number, lon: number) => void;
}

export default function WeatherMap({
  lat,
  lon,
  cityName,
  temp,
  tempUnit,
  onCoordinateSelect
}: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Dynamic CSS Link Injection to prevent broken Leaflet styles inside the iframe
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

  // Map Initialization
  useEffect(() => {
    if (!cssLoaded || !mapContainerRef.current) return;

    // Destroy existing map if it exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create the Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 10,
      zoomControl: true,
      attributionControl: false
    });

    mapRef.current = map;

    // Add Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18
    }).addTo(map);

    // Custom Interactive Click Marker Handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      onCoordinateSelect(e.latlng.lat, e.latlng.lng);
    });

    // Handle initial marker
    const markerIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center">
          <div class="px-2 py-1 bg-slate-900/90 text-white border border-indigo-400 rounded-md text-xs font-bold shadow-lg whitespace-nowrap animate-bounce">
            ${cityName}: ${Math.round(temp)}°${tempUnit}
          </div>
          <div class="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-md mt-0.5"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [80, 40],
      iconAnchor: [40, 40]
    });

    const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(map);
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [cssLoaded, lat, lon]);

  // Handle subtle coordinate updates (pan smoothly without re-initializing tile layers)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 10, { animate: true });
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
        
        const markerIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center">
              <div class="px-2 py-1 bg-slate-900/90 text-white border border-indigo-400 rounded-md text-xs font-bold shadow-lg whitespace-nowrap animate-bounce">
                ${cityName}: ${Math.round(temp)}°${tempUnit}
              </div>
              <div class="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-md mt-0.5"></div>
            </div>
          `,
          className: "custom-leaflet-marker",
          iconSize: [80, 40],
          iconAnchor: [40, 40]
        });
        markerRef.current.setIcon(markerIcon);
      }
    }
  }, [lat, lon, cityName, temp, tempUnit]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200/20 bg-slate-900/50 backdrop-blur-md">
      {!cssLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono">
          Loading Atmosphere Cartography...
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "260px" }} />
      <div className="absolute bottom-2 left-2 z-[1000] px-2 py-1 bg-slate-900/85 text-[10px] text-slate-400 font-mono rounded-md pointer-events-none">
        OpenStreetMap • Click map to analyze any global region
      </div>
    </div>
  );
}
