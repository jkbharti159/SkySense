import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  Compass, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Activity, 
  Layers, 
  ShieldAlert, 
  Eye, 
  AlertTriangle, 
  Zap, 
  Sparkles, 
  Info, 
  MapPin, 
  TrendingUp, 
  Navigation, 
  Maximize, 
  Ruler, 
  HelpCircle, 
  RefreshCw,
  Sliders,
  ChevronDown,
  Gauge
} from "lucide-react";
import { FullWeatherData } from "../types.js";
import { 
  generateRadarScene, 
  bearingToVector, 
  haversineDistance, 
  dbzToCategory, 
  RadarScene, 
  RadarCell 
} from "../utils/radarModel.ts";

interface MeteorologicalRadarProps {
  weatherData: FullWeatherData;
}

export default function MeteorologicalRadar({ weatherData }: MeteorologicalRadarProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Core telemetry state
  const [radarScene, setRadarScene] = useState<RadarScene | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  const [interrogatedLoc, setInterrogatedLoc] = useState<{ lat: number; lon: number; name: string } | null>(null);

  // Animation timeline state
  // Indices: 0 (-60m), 1 (-45m), 2 (-30m), 3 (-15m), 4 (0m / NOW), 5 (+15m), 6 (+30m), 7 (+45m), 8 (+60m)
  const [frameIdx, setFrameIdx] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Layer control system
  const [layers, setLayers] = useState({
    precipitation: true,
    reflectivity: true,
    lightning: true,
    cellBoundaries: true,
    movementTracks: true,
    nowcastProjection: true,
    coverageArea: false,
    sweepBeam: true
  });

  // Tools state
  const [rulerMode, setRulerMode] = useState<boolean>(false);
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [rulerDistance, setRulerDistance] = useState<number | null>(null);

  // AI Interpretation state
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "cells" | "nowcast">("analysis");

  // Dynamic Leaflet map overlays storage
  const leafletOverlaysRef = useRef<L.Layer[]>([]);
  const sweepAngleRef = useRef<number>(0);
  const sweepIntervalRef = useRef<number | null>(null);

  const TIMELINE_LABELS = [
    { label: "-60m", isProj: false },
    { label: "-45m", isProj: false },
    { label: "-30m", isProj: false },
    { label: "-15m", isProj: false },
    { label: "NOW", isProj: false },
    { label: "+15m", isProj: true },
    { label: "+30m", isProj: true },
    { label: "+45m", isProj: true },
    { label: "+60m", isProj: true }
  ];

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

  // Generate radar scene when city or location coordinates change
  useEffect(() => {
    const scene = generateRadarScene(weatherData.location.lat, weatherData.location.lon);
    setRadarScene(scene);
    if (scene.cells.length > 0) {
      setSelectedCellId(scene.cells[0].id);
    }
    // Set interrogator coordinates to the active city
    setInterrogatedLoc({
      lat: weatherData.location.lat,
      lon: weatherData.location.lon,
      name: weatherData.location.name
    });
    setAiAnalysis(null); // Reset AI on location switch
  }, [weatherData.location.lat, weatherData.location.lon]);

  // Leaflet map initialization
  useEffect(() => {
    if (!cssLoaded || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [weatherData.location.lat, weatherData.location.lon],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    mapRef.current = map;

    // Add Dark themed Map tiles for a high-contrast professional styling
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18
    }).addTo(map);

    // Map Click Interrogation or Ruler handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat;
      const clickedLon = e.latlng.lng;

      if (rulerMode) {
        setRulerPoints(prev => {
          if (prev.length >= 2) {
            return [[clickedLat, clickedLon]];
          } else {
            const next = [...prev, [clickedLat, clickedLon]] as [number, number][];
            if (next.length === 2) {
              const dist = haversineDistance(next[0][0], next[0][1], next[1][0], next[1][1]);
              setRulerDistance(dist);
            }
            return next;
          }
        });
      } else {
        // Normal Interrogation mode
        setInterrogatedLoc({
          lat: clickedLat,
          lon: clickedLon,
          name: `Interrogated Coords: [${clickedLat.toFixed(3)}, ${clickedLon.toFixed(3)}]`
        });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [cssLoaded, weatherData.location.lat, weatherData.location.lon, rulerMode]);

  // Handle Playback Interval
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 1200 / playbackSpeed;
    const interval = setInterval(() => {
      setFrameIdx(prev => {
        if (prev >= TIMELINE_LABELS.length - 1) {
          return 0; // loop back to past -60
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Interpolate / extrapolate coordinate of cell for timeline animation frames
  const getCellCoordinateAtFrame = (cell: RadarCell, idx: number): { lat: number; lon: number; dbz: number } => {
    if (idx === 4) {
      return { lat: cell.lat, lon: cell.lon, dbz: cell.intensity };
    }
    if (idx < 4) {
      // Past offsets
      const histItem = cell.history[idx];
      return { lat: histItem.lat, lon: histItem.lon, dbz: histItem.dbz };
    } else {
      // Future projection offsets
      const projItem = cell.projected[idx - 5];
      // Decay slightly in intensity as projection moves forward
      const decay = (idx - 4) * 1.5;
      const projDbz = Math.max(15, cell.intensity + (cell.intensityTrend === "STRENGTHENING" ? decay : -decay * 1.8));
      return { lat: projItem.lat, lon: projItem.lon, dbz: projDbz };
    }
  };

  // Redraw custom radar overlays, vectors, strikes, nowcast sweeps, ruler measurements
  useEffect(() => {
    if (!mapRef.current || !radarScene) return;

    const map = mapRef.current;

    // Clear previous overlays
    leafletOverlaysRef.current.forEach(layer => map.removeLayer(layer));
    leafletOverlaysRef.current = [];

    const newOverlays: L.Layer[] = [];

    // 1. Draw radar coverage scan boundary (optional)
    if (layers.coverageArea) {
      const boundaryCircle = L.circle([weatherData.location.lat, weatherData.location.lon], {
        radius: 45000, // 45km scan radius
        color: "rgba(99, 102, 241, 0.2)",
        fillColor: "rgba(99, 102, 241, 0.02)",
        dashArray: "4, 6",
        weight: 1.5,
        interactive: false
      }).addTo(map);
      newOverlays.push(boundaryCircle);
    }

    // 2. Draw rotating radar Sweep Beam (simulating Doppler scan)
    if (layers.sweepBeam) {
      // We draw a semi-transparent sweeping sector
      const startAngle = sweepAngleRef.current;
      const endAngle = (sweepAngleRef.current + 35) % 360;
      
      // Calculate arc boundary coordinates
      const stationLat = weatherData.location.lat;
      const stationLon = weatherData.location.lon;
      const radiusDeg = 0.45; // ~45km in degrees roughly

      const getCoord = (angleDeg: number) => {
        const rad = (angleDeg * Math.PI) / 180;
        return [stationLat + Math.cos(rad) * radiusDeg, stationLon + Math.sin(rad) * radiusDeg] as [number, number];
      };

      const p1 = getCoord(startAngle);
      const p2 = getCoord((startAngle + 17) % 360);
      const p3 = getCoord(endAngle);

      const sweepPolygon = L.polygon([[stationLat, stationLon], p1, p2, p3], {
        color: "transparent",
        fillColor: "rgba(16, 185, 129, 0.08)",
        fillOpacity: 0.15,
        interactive: false
      }).addTo(map);
      newOverlays.push(sweepPolygon);
    }

    // 3. Draw active radar precipitation cells (radar echoes)
    if (layers.precipitation) {
      radarScene.cells.forEach(cell => {
        const isSelected = cell.id === selectedCellId;
        const frameData = getCellCoordinateAtFrame(cell, frameIdx);

        // Generate irregular polygon contour coordinates to simulate realistic radar echo blobs
        const polygonPoints: [number, number][] = [];
        const numVertices = 10;
        const baseRadius = 0.012 + (cell.area / 120) * 0.025; // scaling area to degree size

        for (let v = 0; v < numVertices; v++) {
          const angle = (v * 360) / numVertices;
          const rad = (angle * Math.PI) / 180;
          // Add deterministic irregularities using cell ID & vertex index
          const vertexSeed = Math.sin(v * 45 + parseInt(cell.id.replace(/\D/g, "") || "1"));
          const actualRadius = baseRadius * (0.75 + vertexSeed * 0.22);
          
          polygonPoints.push([
            frameData.lat + Math.cos(rad) * actualRadius,
            frameData.lon + Math.sin(rad) * actualRadius
          ]);
        }

        // Color coding matching dBZ values
        let fillColor = "rgba(16, 185, 129, 0.4)"; // Light rain green
        let strokeColor = "rgba(16, 185, 129, 0.75)";
        
        if (frameData.dbz >= 55) {
          fillColor = "rgba(217, 70, 239, 0.55)"; // Heavy severe purple/magenta
          strokeColor = "rgba(217, 70, 239, 0.9)";
        } else if (frameData.dbz >= 45) {
          fillColor = "rgba(239, 68, 68, 0.5)"; // Heavy storm red
          strokeColor = "rgba(239, 68, 68, 0.85)";
        } else if (frameData.dbz >= 35) {
          fillColor = "rgba(245, 158, 11, 0.45)"; // Moderate orange
          strokeColor = "rgba(245, 158, 11, 0.8)";
        }

        // Draw outer polygon representing precipitation area
        const cellPolygon = L.polygon(polygonPoints, {
          color: isSelected ? "#ffffff" : strokeColor,
          weight: isSelected ? 2 : 1,
          fillColor: fillColor,
          fillOpacity: 0.4,
          dashArray: isSelected ? "3, 2" : undefined
        }).addTo(map);

        // Interactive polygon select
        cellPolygon.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedCellId(cell.id);
        });

        newOverlays.push(cellPolygon);

        // Draw cell Core representing high reflectivity peak node (if reflectivity layer enabled)
        if (layers.reflectivity && frameData.dbz >= 35) {
          const corePoints: [number, number][] = polygonPoints.map(([ptLat, ptLon]) => [
            frameData.lat + (ptLat - frameData.lat) * 0.45,
            frameData.lon + (ptLon - frameData.lon) * 0.45
          ]);

          const coreColor = frameData.dbz >= 55 ? "rgba(255, 255, 255, 0.8)" : 
                            frameData.dbz >= 45 ? "rgba(217, 70, 239, 0.8)" : "rgba(239, 68, 68, 0.75)";

          const cellCorePolygon = L.polygon(corePoints, {
            color: coreColor,
            weight: 0.5,
            fillColor: coreColor,
            fillOpacity: 0.7,
            interactive: false
          }).addTo(map);

          newOverlays.push(cellCorePolygon);
        }

        // 4. Draw Cell Boundary ID label (if enabled)
        if (layers.cellBoundaries) {
          const labelIcon = L.divIcon({
            html: `<div class="px-1.5 py-0.5 bg-slate-900/90 text-[9px] font-bold font-mono text-slate-200 border border-slate-500/20 rounded shadow whitespace-nowrap leading-none">${cell.id}</div>`,
            className: "cell-label-marker",
            iconSize: [40, 15],
            iconAnchor: [20, -10]
          });
          const labelMarker = L.marker([frameData.lat, frameData.lon], { icon: labelIcon, interactive: false }).addTo(map);
          newOverlays.push(labelMarker);
        }

        // 5. Draw Cell Track Vector Line - History (grey dotted)
        if (layers.movementTracks) {
          const historyCoords: [number, number][] = cell.history.map(h => [h.lat, h.lon]);
          // Include current cell coordinate
          historyCoords.push([cell.lat, cell.lon]);

          const historyPolyline = L.polyline(historyCoords, {
            color: "rgba(148, 163, 184, 0.45)",
            weight: 1.5,
            dashArray: "3, 4"
          }).addTo(map);
          newOverlays.push(historyPolyline);

          // Dot indicators for past frames
          cell.history.forEach((histPoint, hIdx) => {
            const histDot = L.circleMarker([histPoint.lat, histPoint.lon], {
              radius: 2.5,
              color: "rgba(148, 163, 184, 0.6)",
              fillColor: "rgba(148, 163, 184, 0.3)",
              fillOpacity: 1,
              interactive: false
            }).addTo(map);
            newOverlays.push(histDot);
          });
        }

        // 6. Draw Cell Track Vector Line - Nowcast Projections (cyan/dotted)
        if (layers.nowcastProjection) {
          const projectedCoords: [number, number][] = [[cell.lat, cell.lon]];
          cell.projected.forEach(p => projectedCoords.push([p.lat, p.lon]));

          const projectedPolyline = L.polyline(projectedCoords, {
            color: "rgba(6, 182, 212, 0.55)",
            weight: 1.5,
            dashArray: "1, 3"
          }).addTo(map);
          newOverlays.push(projectedPolyline);

          // Dot indicators for projected frames
          cell.projected.forEach((projPoint, pIdx) => {
            const projDot = L.circleMarker([projPoint.lat, projPoint.lon], {
              radius: 2.5,
              color: "rgba(6, 182, 212, 0.8)",
              fillColor: "rgba(6, 182, 212, 0.4)",
              fillOpacity: 1,
              interactive: false
            }).addTo(map);
            newOverlays.push(projDot);
          });
        }
      });
    }

    // 7. Draw Lightning Strikes Overlay
    if (layers.lightning) {
      radarScene.lightning.forEach(strike => {
        // Strike pulse glow
        const strikeCircle = L.circle([strike.lat, strike.lon], {
          radius: 1200,
          color: "rgba(234, 179, 8, 0.15)",
          fillColor: "rgba(234, 179, 8, 0.05)",
          fillOpacity: 0.3,
          interactive: false
        }).addTo(map);
        newOverlays.push(strikeCircle);

        // Flash marker bolt icon
        const boltIcon = L.divIcon({
          html: `
            <div class="flex items-center justify-center animate-pulse">
              <span class="text-amber-400 drop-shadow-[0_2px_4px_rgba(234,179,8,0.7)] text-[14px]">⚡</span>
            </div>
          `,
          className: "leaflet-strike-bolt",
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const boltMarker = L.marker([strike.lat, strike.lon], { icon: boltIcon, interactive: false }).addTo(map);
        newOverlays.push(boltMarker);
      });
    }

    // 8. Draw Active Interrogator Location marker
    if (interrogatedLoc) {
      const pinIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="px-1.5 py-0.5 bg-slate-900 border border-cyan-400 text-[9px] font-mono font-semibold rounded text-white shadow-lg whitespace-nowrap leading-none uppercase tracking-wide">
              Interrogation Point
            </div>
            <div class="w-2.5 h-2.5 bg-cyan-400 border-2 border-slate-950 rounded-full shadow mt-0.5"></div>
          </div>
        `,
        className: "interrogator-pin",
        iconSize: [100, 20],
        iconAnchor: [50, 20]
      });
      const pinMarker = L.marker([interrogatedLoc.lat, interrogatedLoc.lon], { icon: pinIcon }).addTo(map);
      newOverlays.push(pinMarker);
    }

    // 9. Draw Ruler / Distance Measurement path
    if (rulerMode && rulerPoints.length > 0) {
      // Draw first point dot
      const pt1Marker = L.circleMarker(rulerPoints[0], {
        radius: 4,
        color: "#ef4444",
        fillColor: "#ffffff",
        fillOpacity: 1
      }).addTo(map);
      newOverlays.push(pt1Marker);

      if (rulerPoints.length === 2) {
        // Draw second point dot
        const pt2Marker = L.circleMarker(rulerPoints[1], {
          radius: 4,
          color: "#ef4444",
          fillColor: "#ffffff",
          fillOpacity: 1
        }).addTo(map);
        newOverlays.push(pt2Marker);

        // Draw connector polyline
        const connector = L.polyline(rulerPoints, {
          color: "#ef4444",
          weight: 2,
          dashArray: "4, 4"
        }).addTo(map);
        newOverlays.push(connector);

        // Add middle distance tooltip
        const midLat = (rulerPoints[0][0] + rulerPoints[1][0]) / 2;
        const midLon = (rulerPoints[0][1] + rulerPoints[1][1]) / 2;
        const distTooltip = L.divIcon({
          html: `<div class="px-2 py-1 bg-red-900 text-red-100 text-[10px] font-mono font-bold rounded-md border border-red-500 shadow-xl whitespace-nowrap leading-none">${rulerDistance} km</div>`,
          className: "ruler-tooltip",
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });
        const tooltipMarker = L.marker([midLat, midLon], { icon: distTooltip }).addTo(map);
        newOverlays.push(tooltipMarker);
      }
    }

    leafletOverlaysRef.current = newOverlays;

  }, [radarScene, selectedCellId, interrogatedLoc, frameIdx, layers, rulerPoints, rulerDistance, rulerMode]);

  // Handle continuous rotation scan effect
  useEffect(() => {
    if (!layers.sweepBeam) {
      if (sweepIntervalRef.current) {
        clearInterval(sweepIntervalRef.current);
        sweepIntervalRef.current = null;
      }
      return;
    }

    sweepIntervalRef.current = window.setInterval(() => {
      sweepAngleRef.current = (sweepAngleRef.current + 3) % 360;
      // Force trigger map overlay update
      setLayers(prev => ({ ...prev }));
    }, 60);

    return () => {
      if (sweepIntervalRef.current) {
        clearInterval(sweepIntervalRef.current);
        sweepIntervalRef.current = null;
      }
    };
  }, [layers.sweepBeam]);

  const handleAISceneAnalysis = async () => {
    if (!radarScene) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const response = await fetch("/api/radar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: weatherData.location.lat,
          lon: weatherData.location.lon,
          cityName: weatherData.location.name,
          radarScene
        })
      });

      if (!response.ok) {
        throw new Error("API failed");
      }

      const result = await response.json();
      setAiAnalysis(result);
    } catch (e) {
      console.error("AI Radar interpreter error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDbzValueAtFrame = (cell: RadarCell): number => {
    return getCellCoordinateAtFrame(cell, frameIdx).dbz;
  };

  const toggleLayer = (layerName: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const getActiveCellDetails = (): RadarCell | undefined => {
    return radarScene?.cells.find(c => c.id === selectedCellId);
  };

  const activeCell = getActiveCellDetails();

  // Nowcast Interrogation Calculations relative to nearest active cell
  const getNearestCellCalculations = () => {
    if (!radarScene || !interrogatedLoc) return null;

    let nearestCell: RadarCell | null = null;
    let minDistance = Infinity;

    radarScene.cells.forEach(cell => {
      const dist = haversineDistance(interrogatedLoc.lat, interrogatedLoc.lon, cell.lat, cell.lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestCell = cell;
      }
    });

    if (!nearestCell) return null;

    const cellObj = nearestCell as RadarCell;
    const { dLat, dLon } = bearingToVector(cellObj.bearing);

    // Nowcast arrival math: Calculate if cell is heading towards interrogated point
    // Scalar projection of vector (cell -> point) onto cell's velocity vector
    const cellToPtLat = interrogatedLoc.lat - cellObj.lat;
    const cellToPtLon = interrogatedLoc.lon - cellObj.lon;
    
    // Normalize velocity vector
    const magVel = Math.sqrt(dLat * dLat + dLon * dLon);
    const uLat = dLat / magVel;
    const uLon = dLon / magVel;

    // Dot product represents distance along velocity path
    const projDistDeg = cellToPtLat * uLat + cellToPtLon * uLon;
    const isHeadingToward = projDistDeg > 0;

    let arrivalMinutes: number | null = null;
    if (isHeadingToward && cellObj.speed > 0) {
      // rough translation of degree projection to km
      const projDistKm = projDistDeg * 111.3; // 1 degree lat is ~111.3km
      arrivalMinutes = Math.round((projDistKm / cellObj.speed) * 60);
    }

    return {
      cell: cellObj,
      distance: minDistance,
      isHeadingToward,
      arrivalMinutes: arrivalMinutes && arrivalMinutes < 120 ? arrivalMinutes : null
    };
  };

  const nowcastInfo = getNearestCellCalculations();

  // 3D Canvas Ref and draw loop
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas3DRef.current || !activeCell) return;
    const canvas = canvas3DRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render an isometric 3D slice model of storm cell reflectivity vertical profile
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Background grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
    }
    for (let y = 20; y < h - 20; y += 25) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    // Heights Label vertical line
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.fillText("50 kft", 25, 22);
    ctx.fillText("30 kft", 25, 60);
    ctx.fillText("15 kft", 25, 100);
    ctx.fillText("Sfc", 25, 138);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(28, 10);
    ctx.lineTo(28, 142);
    ctx.stroke();

    // Zero-deg Freezing level horizontal line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)"; // sky blue
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(28, 85);
    ctx.lineTo(w - 20, 85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
    ctx.fillText("0°C line (Freezing)", w - 25, 80);

    // Draw vertical storm cell core representation (3D stack)
    const centerX = w / 2 + 10;
    const baseWidth = 50 + (activeCell.area / 150) * 40;
    const stormHeight = 30 + (activeCell.intensity / 65) * 80; // dBZ maps to storm top height

    // Draw multiple atmospheric layers of storm dome
    const layersCount = 5;
    for (let l = 0; l < layersCount; l++) {
      const scale = 1 - l * 0.18;
      const heightOffset = l * (stormHeight / layersCount);
      const layerY = 140 - heightOffset;
      const layerW = baseWidth * scale;

      // Color maps to dBZ at that layer height (higher layer = colder/lower dbz unless severe convective core)
      const layerDbz = Math.max(10, activeCell.intensity - l * 6);
      let layerColor = "rgba(16, 185, 129, 0.18)"; // Green
      if (layerDbz >= 52) layerColor = "rgba(217, 70, 239, 0.4)"; // Severe Magenta
      else if (layerDbz >= 42) layerColor = "rgba(239, 68, 68, 0.35)"; // Red
      else if (layerDbz >= 32) layerColor = "rgba(245, 158, 11, 0.28)"; // Orange

      // Draw horizontal concentric 3D ellipse slice
      ctx.fillStyle = layerColor;
      ctx.beginPath();
      ctx.ellipse(centerX, layerY, layerW, layerW * 0.22, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Outer stroke
      ctx.strokeStyle = layerDbz >= 42 ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.08)";
      ctx.stroke();
    }

    // Draw radar station sweep signal beam entering the cell
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)"; // Cyan sweep laser
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 140); // origin
    ctx.lineTo(centerX - 15, 140 - stormHeight / 3);
    ctx.stroke();

    // Pulse dot at scanning core
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(centerX - 15, 140 - stormHeight / 3, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Label cell height
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Echo top: ~${Math.round(stormHeight * 360)} ft`, centerX, 140 - stormHeight - 5);

  }, [activeCell]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs text-slate-300">
      
      {/* LEFT SIDE COLUMN: 5 Columns (Controls, Layers, Analytics, Nowcasting) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Playback & Timeline controller panel */}
        <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity size={14} className="text-indigo-400" />
            Time-Series Radar Playback
          </h4>

          {/* Current frame indicator */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase">ACTIVE FRAME OFFSET</span>
            <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-950/60 border border-white/5 text-[10px]">
              {TIMELINE_LABELS[frameIdx].label} 
              <span className={`ml-1 px-1 rounded text-[8px] ${TIMELINE_LABELS[frameIdx].isProj ? "bg-cyan-500/10 text-cyan-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                {TIMELINE_LABELS[frameIdx].isProj ? "PROJECTION" : "OBSERVED"}
              </span>
            </span>
          </div>

          {/* Scrub timeline slide range */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase leading-none">-60m</span>
            <input
              type="range"
              min="0"
              max="8"
              value={frameIdx}
              onChange={(e) => {
                setFrameIdx(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[10px] text-cyan-400 font-bold leading-none uppercase">+60m</span>
          </div>

          {/* Media Player styled Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFrameIdx(0)}
                className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                title="Rewind to start (-60m)"
              >
                <SkipBack size={14} />
              </button>
              
              <button
                onClick={() => setFrameIdx(prev => Math.max(0, prev - 1))}
                className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                title="Previous frame (-15m)"
              >
                <SkipForward size={14} className="rotate-180" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/25 rounded-xl transition-all font-bold"
                title={isPlaying ? "Pause animation" : "Play loop"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <button
                onClick={() => setFrameIdx(prev => Math.min(8, prev + 1))}
                className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                title="Next frame (+15m)"
              >
                <SkipForward size={14} />
              </button>
            </div>

            {/* Playback Speeds */}
            <div className="flex gap-1">
              {[1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                    playbackSpeed === speed
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tactical Layers control panel */}
        <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers size={14} className="text-indigo-400" />
            Tactical Radar Layers
          </h4>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => toggleLayer("precipitation")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.precipitation 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Echo Reflectivity</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.precipitation ? "bg-emerald-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">OBSERVED</span>
            </button>

            <button
              onClick={() => toggleLayer("reflectivity")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.reflectivity 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Severe Storm Cores</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.reflectivity ? "bg-fuchsia-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">OBSERVED</span>
            </button>

            <button
              onClick={() => toggleLayer("lightning")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.lightning 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Lightning Strikes</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.lightning ? "bg-yellow-400 text-xs animate-ping" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">OBSERVED</span>
            </button>

            <button
              onClick={() => toggleLayer("cellBoundaries")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.cellBoundaries 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Cell Boundaries</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.cellBoundaries ? "bg-indigo-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">DERIVED</span>
            </button>

            <button
              onClick={() => toggleLayer("movementTracks")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.movementTracks 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Cell History tracks</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.movementTracks ? "bg-slate-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">DERIVED</span>
            </button>

            <button
              onClick={() => toggleLayer("nowcastProjection")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.nowcastProjection 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Nowcast Projections</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.nowcastProjection ? "bg-cyan-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">PROJECTED</span>
            </button>

            <button
              onClick={() => toggleLayer("coverageArea")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.coverageArea 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Coverage range (45km)</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.coverageArea ? "bg-indigo-500" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">SYSTEM</span>
            </button>

            <button
              onClick={() => toggleLayer("sweepBeam")}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                layers.sweepBeam 
                  ? "bg-slate-900/60 border-indigo-500/30 text-slate-200" 
                  : "bg-slate-950/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span>Station Sweep Signal</span>
                <span className={`w-1.5 h-1.5 rounded-full ${layers.sweepBeam ? "bg-emerald-400" : "bg-slate-700"}`} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 uppercase">SYSTEM</span>
            </button>
          </div>
        </div>

        {/* Dynamic Legend details */}
        <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4">
          <span className="text-[10px] text-slate-500 font-bold block uppercase mb-2">Precipitation Reflectivity Legend</span>
          <div className="flex items-center gap-1.5 font-bold font-mono text-[10px]">
            <div className="flex-1 h-3 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 flex items-center justify-between px-1.5 text-slate-950 text-[8px]">
              <span>15 dBZ (Light)</span>
              <span>35 dBZ</span>
              <span>&gt;55 dBZ (Extr Storm/Hail)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-mono leading-relaxed">
            Units: dBZ (Decibels of Reflectivity). Elevated indices specify denser storm clouds, torrential rain boundaries, or severe updrafts with hail structures.
          </p>
        </div>

      </div>

      {/* RIGHT COLUMN VIEWPORT: 7 Columns (Map View, Ruler tools, Sidebar tabs, Cell inspections) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        
        {/* MAP AND TOOLBAR PANEL */}
        <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-4 flex flex-col gap-3 relative">
          
          {/* Sub-toolbar Controls */}
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-400 text-[10px] font-bold border border-white/5 uppercase">
                ACTIVE MONITOR
              </span>
              <span className="text-[11px] text-slate-400">
                Scanning coordinates near <span className="text-slate-200 font-bold">{weatherData.location.name}</span>
              </span>
            </div>

            {/* Custom Interactive Map utilities */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setRulerMode(!rulerMode);
                  setRulerPoints([]);
                  setRulerDistance(null);
                }}
                className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold uppercase ${
                  rulerMode 
                    ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" 
                    : "bg-slate-950/60 border-white/5 text-slate-400 hover:text-white"
                }`}
                title="Measure distance between coordinate points"
              >
                <Ruler size={13} /> 
                {rulerMode ? "Ruler: ON" : "Measure Distance"}
              </button>

              <button
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.setView([weatherData.location.lat, weatherData.location.lon], 11);
                  }
                }}
                className="p-2 bg-slate-950/60 border border-white/5 rounded-lg text-slate-400 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"
                title="Recenter Map Viewport"
              >
                <Maximize size={13} /> Recenter
              </button>
            </div>
          </div>

          {/* Core Interactive Leaflet Map Div */}
          <div className="w-full h-[360px] rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl">
            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "360px" }} />
            
            {/* Dynamic visual compass sweep effect animation overlay */}
            <div className="absolute top-3 right-3 z-[1000] p-2 bg-slate-900/90 text-[10px] text-slate-300 font-mono rounded-lg border border-white/10 pointer-events-none flex items-center gap-1.5">
              <RefreshCw size={11} className="text-emerald-400 animate-spin" />
              <span>RADAR SCAN ACTIVE</span>
            </div>

            {/* Coverage safety warning indicator */}
            {radarScene?.coverageQuality === "DEGRADED" && (
              <div className="absolute top-3 left-3 z-[1000] p-2 bg-rose-950/95 border border-rose-500/25 text-rose-300 text-[10px] rounded-lg max-w-[200px] leading-relaxed">
                ⚠️ Scanners report degraded coverage. Cell tracking bounds might face localized confidence decreases.
              </div>
            )}
          </div>

          {/* Interactive footer summary stats row */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-xl border border-white/5 font-mono text-[10px]">
            <div>
              <span className="text-slate-500 block uppercase font-bold">RADAR TELEMETRY AGE</span>
              <span className="text-slate-200 mt-0.5 block font-bold">1.4 minutes (Real-time)</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold">COVERAGE QUALITY</span>
              <span className={`mt-0.5 block font-bold ${radarScene?.coverageQuality === "HIGH" ? "text-emerald-400" : radarScene?.coverageQuality === "GOOD" ? "text-cyan-400" : "text-rose-400"}`}>
                {radarScene?.coverageQuality} SCAN SCOPE
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold">CONVECTIVE CELLS</span>
              <span className="text-slate-200 mt-0.5 block font-bold">{radarScene?.activeCellsCount} Systems Tracked</span>
            </div>
          </div>
        </div>

        {/* ANALYTICAL DETAIL CARDS TAB SWITCHER */}
        <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-5 md:p-6 flex flex-col gap-4">
          
          <div className="flex border-b border-white/5 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab("analysis")}
              className={`pb-2.5 px-4 transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "analysis" ? "border-indigo-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkles size={13} /> AI Radar Interpretation
            </button>
            <button
              onClick={() => setActiveTab("cells")}
              className={`pb-2.5 px-4 transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "cells" ? "border-indigo-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Activity size={13} /> Cell Echo Inspection ({activeCell?.id})
            </button>
            <button
              onClick={() => setActiveTab("nowcast")}
              className={`pb-2.5 px-4 transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "nowcast" ? "border-indigo-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Gauge size={13} /> Nowcast Interrogator
            </button>
          </div>

          {/* ---- SUB TAB 1: AI RADAR INTERPRETATION ---- */}
          {activeTab === "analysis" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-300">Intelligent Atmospheric Radar Interpreter</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono leading-relaxed">
                    Query the server-side meteorology pipeline to extract scientifically-grounded system analysis.
                  </p>
                </div>
                <button
                  onClick={handleAISceneAnalysis}
                  disabled={isAnalyzing}
                  className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 disabled:opacity-50 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase"
                >
                  <Sparkles size={12} className={isAnalyzing ? "animate-spin" : ""} />
                  {isAnalyzing ? "Analyzing Scene..." : "Interpret Scene"}
                </button>
              </div>

              {isAnalyzing && (
                <div className="p-8 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                  <RefreshCw size={24} className="text-indigo-400 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-300 leading-none">Interpreting active radar telemetry stream...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Reflecting cell vectors, peak dBZ intensities, and electrical lightning offsets.</p>
                </div>
              )}

              {aiAnalysis ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-[11px] leading-relaxed text-slate-300">
                    <p className="font-bold text-white mb-1">Radar Scene Overview:</p>
                    {aiAnalysis.summary}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                    <div className="p-3.5 bg-slate-950/30 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[9px] text-indigo-300 font-bold block uppercase">Convective Cell Structures</span>
                      <p className="text-slate-300 leading-normal">{aiAnalysis.activeSystemsAnalysis}</p>
                    </div>
                    <div className="p-3.5 bg-slate-950/30 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[9px] text-indigo-300 font-bold block uppercase">Movement & Path Vector Analysis</span>
                      <p className="text-slate-300 leading-normal">{aiAnalysis.movementTrends}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-cyan-500/15 text-[11px] leading-relaxed text-slate-300">
                    <p className="font-bold text-cyan-400 mb-1">Short-term Arrival Nowcast:</p>
                    {aiAnalysis.riskNowcast}
                  </div>

                  <div className="flex gap-2 items-center text-[10px] bg-slate-950/20 p-2.5 rounded-lg border border-white/5 text-slate-400">
                    <Info size={12} className="text-indigo-400 shrink-0" />
                    <span>
                      Confidence: <span className="text-emerald-400 font-bold">{aiAnalysis.confidence}</span> • {aiAnalysis.confidenceExplanation}
                    </span>
                  </div>
                </div>
              ) : !isAnalyzing && (
                <div className="p-6 bg-slate-950/20 border border-white/5 rounded-2xl text-center text-slate-500">
                  <Compass size={24} className="mx-auto text-slate-600 mb-2 animate-spin-slow" />
                  <p className="text-xs">Interpreter standing by.</p>
                  <p className="text-[10px] mt-1">Click "Interpret Scene" to invoke intelligent analysis of active radar echoes and lightning vectors.</p>
                </div>
              )}
            </div>
          )}

          {/* ---- SUB TAB 2: ACTIVE CELL ECHO INSPECTION ---- */}
          {activeTab === "cells" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in">
              {activeCell ? (
                <>
                  {/* Stats columns */}
                  <div className="md:col-span-6 space-y-4">
                    <div className="flex justify-between items-center bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-indigo-300 font-bold block uppercase">{activeCell.name}</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">{activeCell.classification}</span>
                      </div>
                      <div className={`px-2 py-1 rounded font-bold text-center border bg-slate-950 text-xs ${dbzToCategory(getDbzValueAtFrame(activeCell)).color}`}>
                        {getDbzValueAtFrame(activeCell)} dBZ
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-xl space-y-3 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Echo Intensity Trend:</span>
                        <span className="text-slate-200 font-bold">{activeCell.intensityTrend}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Surface Area Footprint:</span>
                        <span className="text-slate-200 font-bold">{activeCell.area} km² ({activeCell.areaTrend})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Observed Movement:</span>
                        <span className="text-slate-200 font-bold">Bearing {activeCell.bearing}° (Speed {activeCell.speed} km/h)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tracking duration:</span>
                        <span className="text-slate-200 font-bold">Observed since {activeCell.observedSince}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-[10px] text-slate-400 leading-relaxed flex gap-2">
                      <Sliders size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        **History analysis**: Real-time Doppler scan indicates the convective node remains stable with a consistent heading. Select alternative cells by tapping them directly on the map.
                      </span>
                    </div>
                  </div>

                  {/* 3D vertical radar profile canvas */}
                  <div className="md:col-span-6 flex flex-col items-center bg-slate-950/40 border border-white/5 rounded-xl p-3">
                    <span className="text-[10px] text-indigo-300 font-bold block uppercase self-start mb-2">3D Reflectivity Sweep Slice</span>
                    <canvas 
                      ref={canvas3DRef} 
                      width="260" 
                      height="150" 
                      className="w-full bg-slate-950/80 rounded-lg border border-white/5" 
                    />
                    <span className="text-[9px] text-slate-500 font-mono mt-1.5 block text-center leading-normal">
                      Convective vertical updraft model. Doppler radar sweep laser scans core structures up to storm cell ceiling heights.
                    </span>
                  </div>
                </>
              ) : (
                <div className="col-span-12 py-8 text-center text-slate-500">
                  Select a precipitation cell on the map to inspect its core telemetry parameters.
                </div>
              )}
            </div>
          )}

          {/* ---- SUB TAB 3: LOCATION INTERROGATOR ---- */}
          {activeTab === "nowcast" && (
            <div className="space-y-4 animate-fade-in text-[11px]">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-cyan-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase">SELECTED INTERROGATION REFERENCE</span>
                    <span className="text-slate-200 font-bold block">{interrogatedLoc?.name}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Click anywhere on the map to switch reference coordinates</span>
              </div>

              {nowcastInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 text-center flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase">Nearest Convective Cell</span>
                    <span className="text-sm font-black text-indigo-400 mt-2 block">{nowcastInfo.cell.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Category: {nowcastInfo.cell.classification}</span>
                  </div>

                  <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 text-center flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase">Calculated Range / Heading</span>
                    <span className="text-sm font-black text-white mt-2 block">{nowcastInfo.distance} km Away</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Bearing: {nowcastInfo.cell.bearing}° ({nowcastInfo.cell.speed} km/h)</span>
                  </div>

                  <div className="p-4 bg-slate-950/40 rounded-xl border border-cyan-500/10 text-center flex flex-col justify-between">
                    <span className="text-[9px] text-cyan-400 block font-bold uppercase">Estimated Nowcast Impact</span>
                    
                    {nowcastInfo.isHeadingToward && nowcastInfo.arrivalMinutes ? (
                      <>
                        <span className="text-lg font-black text-amber-400 mt-2 block">~{nowcastInfo.arrivalMinutes} Minutes</span>
                        <span className="text-[9px] text-amber-300 font-bold uppercase mt-1 leading-none">Potential cell approach</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-emerald-400 mt-4 block">No Immediate Impact</span>
                        <span className="text-[9px] text-slate-500 mt-1 leading-normal">Echo heading away from point</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-950/20 rounded-2xl">
                  Insufficient active cell telemetry within scanned range parameters.
                </div>
              )}

              <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-[10px] text-slate-400 leading-normal flex gap-1.5 items-start">
                <ShieldAlert size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-300">How Nowcast Interrogation works:</span>
                  <p className="mt-0.5">
                    Click any point on the radar screen. The interrogation engine measures absolute distances, captures heading bearings from active Doppler vectors, and mathematically projects minutes to cell arrival.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
