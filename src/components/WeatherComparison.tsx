import React, { useState, useEffect } from "react";
import { FullWeatherData, LocationData } from "../types.js";
import { 
  Sparkles, 
  ArrowRightLeft, 
  Search, 
  Navigation, 
  X, 
  Thermometer, 
  Umbrella, 
  Wind, 
  Eye, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Share2, 
  Download, 
  Layers, 
  TrendingUp, 
  Percent, 
  Activity, 
  Compass, 
  Info,
  Sliders,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";
import ComparisonMap from "./ComparisonMap.js";

interface WeatherComparisonProps {
  currentWeatherData: FullWeatherData; // Baseline City A
  tempUnit: "C" | "F";
  windUnit: "kmh" | "mph";
}

interface SavedComparison {
  id: string;
  name: string;
  cities: Array<{ name: string; country: string; lat: number; lon: number }>;
  dimension: string;
  mode: string;
}

export default function WeatherComparison({
  currentWeatherData,
  tempUnit,
  windUnit
}: WeatherComparisonProps) {
  // Navigation & Workspace State
  const [comparedCities, setComparedCities] = useState<FullWeatherData[]>([currentWeatherData]);
  const [activeDimension, setActiveDimension] = useState<string>("stability");
  const [activeMode, setActiveMode] = useState<"difference" | "similarity" | "variability" | "pattern" | "custom">("difference");
  const [purposeText, setPurposeText] = useState("");
  
  // Search state for adding secondary cities
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [loadingNewCity, setLoadingNewCity] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Saved comparisons state
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareNotification, setShowShareNotification] = useState(false);

  // Analysis result from server API
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Recharts visual parameter
  const [chartMetric, setChartMetric] = useState<"temp" | "rain" | "humidity" | "wind">("temp");
  const [heatmapMetric, setHeatmapMetric] = useState<"temp" | "rain" | "humidity">("temp");

  // Load saved comparisons on mount & handle share links
  useEffect(() => {
    const saved = localStorage.getItem("skysense_saved_comparisons");
    if (saved) {
      try {
        setSavedComparisons(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved comparisons", e);
      }
    }

    // Read URL query param to restore shared comparison workspace
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared_compare");
    if (shared) {
      restoreSharedWorkspace(shared);
    }
  }, []);

  // Sync baseline City A if current location weather updates
  useEffect(() => {
    setComparedCities(prev => {
      if (prev.length === 0) return [currentWeatherData];
      const currentBaseline = prev[0];
      if (
        currentBaseline &&
        currentBaseline.location.name === currentWeatherData.location.name &&
        currentBaseline.current.temp === currentWeatherData.current.temp &&
        currentBaseline.current.humidity === currentWeatherData.current.humidity
      ) {
        return prev;
      }
      const updated = [...prev];
      updated[0] = currentWeatherData;
      return updated;
    });
  }, [currentWeatherData]);

  // Debounce purposeText to avoid spamming Gemini API requests on every single keystroke
  const [debouncedPurposeText, setDebouncedPurposeText] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPurposeText(purposeText);
    }, 1000); // 1.0 second debounce for user typing
    return () => {
      clearTimeout(handler);
    };
  }, [purposeText]);

  // Main Effect: trigger comparative calculation whenever cities, dimension, mode or custom purpose changes
  useEffect(() => {
    async function calculateComparativeMetrics() {
      if (comparedCities.length === 0) return;
      
      setLoadingAnalysis(true);
      setErrorMsg("");

      try {
        const payload = {
          cities: comparedCities,
          mode: activeMode,
          dimension: activeDimension,
          purpose: debouncedPurposeText
        };

        const res = await fetch("/api/intelligence/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const result = await res.json();
          setAnalysisResult(result);
        } else {
          setErrorMsg("Atmospheric engine failed to compute comparative matrix.");
        }
      } catch (e) {
        setErrorMsg("Communication latency detected on the climatological analysis node.");
      } finally {
        setLoadingAnalysis(false);
      }
    }

    calculateComparativeMetrics();
  }, [comparedCities, activeDimension, activeMode, debouncedPurposeText]);

  // Autocomplete search for secondary locations
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Suggestions fetch error", e);
    }
  };

  // Add selected searched location to compared list
  const handleAddCity = async (loc: LocationData) => {
    if (comparedCities.length >= 5) {
      setErrorMsg("Maximum comparative limit reached (5 cities maximum).");
      setSuggestions([]);
      setSearchQuery("");
      return;
    }

    // Avoid duplicate coordinates
    const exists = comparedCities.some(
      c => Math.abs(c.location.lat - loc.lat) < 0.01 && Math.abs(c.location.lon - loc.lon) < 0.01
    );
    if (exists) {
      setErrorMsg(`${loc.name} is already integrated in the current workspace.`);
      setSuggestions([]);
      setSearchQuery("");
      return;
    }

    setLoadingNewCity(true);
    setSuggestions([]);
    setSearchQuery("");
    setErrorMsg("");

    try {
      const res = await fetch(
        `/api/weather/full?lat=${loc.lat}&lon=${loc.lon}&name=${encodeURIComponent(
          loc.name
        )}&country=${encodeURIComponent(loc.country)}`
      );
      if (res.ok) {
        const data = await res.json();
        setComparedCities(prev => [...prev, data]);
      } else {
        setErrorMsg(`Failed to query weather grid for ${loc.name}.`);
      }
    } catch (e) {
      setErrorMsg("Network timed out while retrieving satellite atmospheric grid.");
    } finally {
      setLoadingNewCity(false);
    }
  };

  const handleRemoveCity = (indexToRemove: number) => {
    if (comparedCities.length <= 1) {
      setErrorMsg("A baseline city must remain in the comparative workspace.");
      return;
    }
    setComparedCities(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const moveCity = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= comparedCities.length) return;

    setComparedCities(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Saved workspaces persistence
  const saveWorkspace = () => {
    if (!newSaveName.trim()) return;

    const newSaved: SavedComparison = {
      id: Date.now().toString(),
      name: newSaveName,
      cities: comparedCities.map(c => ({
        name: c.location.name,
        country: c.location.country,
        lat: c.location.lat,
        lon: c.location.lon
      })),
      dimension: activeDimension,
      mode: activeMode
    };

    const updated = [...savedComparisons, newSaved];
    setSavedComparisons(updated);
    localStorage.setItem("skysense_saved_comparisons", JSON.stringify(updated));
    setNewSaveName("");
    setShowSaveModal(false);
  };

  const deleteSavedWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedComparisons.filter(s => s.id !== id);
    setSavedComparisons(updated);
    localStorage.setItem("skysense_saved_comparisons", JSON.stringify(updated));
  };

  const loadSavedWorkspace = async (saved: SavedComparison) => {
    setLoadingAnalysis(true);
    setErrorMsg("");
    try {
      const fetchedCities: FullWeatherData[] = [];
      for (const city of saved.cities) {
        const res = await fetch(
          `/api/weather/full?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(
            city.name
          )}&country=${encodeURIComponent(city.country)}`
        );
        if (res.ok) {
          const data = await res.json();
          fetchedCities.push(data);
        }
      }

      if (fetchedCities.length > 0) {
        setComparedCities(fetchedCities);
        setActiveDimension(saved.dimension);
        setActiveMode(saved.mode as any);
      } else {
        setErrorMsg("Failed to download historical grid data for the saved workspace.");
      }
    } catch (e) {
      setErrorMsg("Error loading complete saved weather profiles.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // URL Sharing capability
  const generateShareLink = () => {
    const encodedCities = comparedCities
      .map(c => `${encodeURIComponent(c.location.name)}:${c.location.lat.toFixed(4)}:${c.location.lon.toFixed(4)}`)
      .join(";");
    const shareQuery = `${encodedCities}|${activeDimension}|${activeMode}`;
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared_compare=${encodeURIComponent(shareQuery)}`;
    
    navigator.clipboard.writeText(shareUrl);
    setShowShareNotification(true);
    setTimeout(() => setShowShareNotification(false), 3000);
  };

  const restoreSharedWorkspace = async (sharedStr: string) => {
    try {
      const [citiesPart, dimensionPart, modePart] = decodeURIComponent(sharedStr).split("|");
      const cityPills = citiesPart.split(";");

      const loaded: FullWeatherData[] = [];
      for (const pill of cityPills) {
        const [name, latStr, lonStr] = pill.split(":");
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (!isNaN(lat) && !isNaN(lon)) {
          const res = await fetch(
            `/api/weather/full?lat=${lat}&lon=${lon}&name=${encodeURIComponent(
              name
            )}&country=`
          );
          if (res.ok) {
            const data = await res.json();
            loaded.push(data);
          }
        }
      }

      if (loaded.length > 0) {
        setComparedCities(loaded);
        if (dimensionPart) setActiveDimension(dimensionPart);
        if (modePart) setActiveMode(modePart as any);
      }
    } catch (e) {
      console.error("Failed to restore shared workspace", e);
    }
  };

  // Download simple JSON report of current workspace configuration
  const downloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: "SkySense Climatological Intelligence Report",
      dateGenerated: new Date().toISOString(),
      activeDimension,
      activeMode,
      comparedCities: comparedCities.map(c => ({
        name: c.location.name,
        lat: c.location.lat,
        lon: c.location.lon,
        currentTemp: c.current.temp,
        currentHumidity: c.current.humidity,
        currentAqi: c.airQuality.aqi
      })),
      analysisResult
    }, null, 2));

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SkySense_Comparative_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Convert Helpers
  const formatTemp = (c: number) => {
    const val = tempUnit === "F" ? (c * 9) / 5 + 32 : c;
    return `${Math.round(val)}°${tempUnit}`;
  };

  const formatWind = (k: number) => {
    const val = windUnit === "mph" ? k * 0.621371 : k;
    return `${Math.round(val)} ${windUnit === "kmh" ? "km/h" : "mph"}`;
  };

  // Recharts Data Mapping
  const getTimelineChartData = () => {
    if (comparedCities.length === 0) return [];
    
    // We synchronize by forecast day (7 days)
    const daysCount = Math.min(...comparedCities.map(c => c.daily.length));
    const chartData = [];

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      const dataPoint: any = {
        name: comparedCities[0].daily[dayIdx].dayName
      };

      comparedCities.forEach(city => {
        const forecast = city.daily[dayIdx];
        if (chartMetric === "temp") {
          const rawMax = forecast.maxTemp;
          const maxVal = tempUnit === "F" ? (rawMax * 9) / 5 + 32 : rawMax;
          dataPoint[city.location.name] = Math.round(maxVal);
        } else if (chartMetric === "rain") {
          dataPoint[city.location.name] = forecast.rainProb;
        } else if (chartMetric === "humidity") {
          dataPoint[city.location.name] = forecast.humidity;
        } else if (chartMetric === "wind") {
          const rawWind = forecast.windSpeed;
          const windVal = windUnit === "mph" ? rawWind * 0.621371 : rawWind;
          dataPoint[city.location.name] = Math.round(windVal);
        }
      });

      chartData.push(dataPoint);
    }
    return chartData;
  };

  // Identify periods of largest divergence and convergence for the chart
  const getDivergenceConvergenceStats = () => {
    const data = getTimelineChartData();
    if (data.length === 0 || comparedCities.length < 2) return null;

    let maxDiv = -1;
    let maxDivDay = "";
    let minDiv = 99999;
    let minDivDay = "";

    data.forEach(d => {
      const values = comparedCities.map(c => d[c.location.name]).filter(v => v !== undefined);
      if (values.length > 1) {
        const spread = Math.max(...values) - Math.min(...values);
        if (spread > maxDiv) {
          maxDiv = spread;
          maxDivDay = d.name;
        }
        if (spread < minDiv) {
          minDiv = spread;
          minDivDay = d.name;
        }
      }
    });

    return { maxDiv, maxDivDay, minDiv, minDivDay };
  };

  const chartStats = getDivergenceConvergenceStats();

  const getHeatmapColor = (val: number, min: number, max: number, type: "temp" | "rain" | "humidity") => {
    const range = max - min || 1;
    const pct = Math.min(1, Math.max(0, (val - min) / range));
    
    if (type === "temp") {
      // Warm Amber to deep volcanic red
      return `rgba(239, 68, 68, ${0.15 + pct * 0.75})`;
    } else if (type === "rain") {
      // Sleek storm blue
      return `rgba(59, 130, 246, ${0.15 + pct * 0.75})`;
    } else {
      // Indigo atmospheric saturation
      return `rgba(99, 102, 241, ${0.15 + pct * 0.75})`;
    }
  };

  // Dimension list
  const dimensions = [
    { id: "stability", label: "Atmospheric Stability", desc: "Thermal fluctuation and standard deviations" },
    { id: "temp_variability", label: "Temperature Variability", desc: "7-day extremes and range deltas" },
    { id: "precip_variability", label: "Precipitation Variability", desc: "Day-to-day rain and storm risk spreads" },
    { id: "seasonal", label: "Seasonal Variation", desc: "Microclimatic baseline and air humidity profiles" },
    { id: "similarity", label: "Weather Similarity Index", desc: "Multi-parameter climatic congruence score" },
    { id: "profile", label: "Regional Atmospheric Profile", desc: "Diurnal trends, air quality and coastal indices" },
    { id: "geographic", label: "Geographic Influence", desc: "Elevation, seawater buffers & continental grids" }
  ];

  return (
    <div id="compare-cities-workspace" className="space-y-6">
      
      {/* 1. COMPASS TOP BAR / HEADER */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ArrowRightLeft size={160} className="text-white" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest bg-indigo-500/20 text-indigo-400 uppercase border border-indigo-500/20">
                Workspace v2.1
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Real-Time Synchronized
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Comparative Climatological Workspace</h2>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Understand differences, spatial trends, stability ratings, and similarities between multiple selected global cities.
            </p>
          </div>

          {/* Report tools and Saved Workspaces Loader */}
          <div className="flex flex-wrap gap-2 items-center">
            <button 
              onClick={() => setShowSaveModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-850 hover:bg-slate-800 border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Save size={13} /> Save Workspace
            </button>
            <button 
              onClick={generateShareLink}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-850 hover:bg-slate-800 border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Share2 size={13} /> Share Link
            </button>
            <button 
              onClick={downloadReport}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Download size={13} /> Export Report
            </button>
          </div>
        </div>

        {/* Share notification toast */}
        {showShareNotification && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/90 text-white text-xs font-mono border border-indigo-400 flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={14} /> Shared comparison link copied to clipboard successfully!
          </div>
        )}

        {/* Saved workspace drawer inline */}
        {savedComparisons.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
              Saved Climatological Workspaces
            </div>
            <div className="flex flex-wrap gap-2">
              {savedComparisons.map((saved) => (
                <div 
                  key={saved.id}
                  onClick={() => loadSavedWorkspace(saved)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/60 border border-white/5 hover:border-pink-500/30 text-[11px] text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet size={11} className="text-pink-400" />
                  <span className="font-medium">{saved.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono">({saved.cities.length}c)</span>
                  <button 
                    onClick={(e) => deleteSavedWorkspace(saved.id, e)}
                    className="p-0.5 text-slate-500 hover:text-red-400 rounded ml-1 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. DYNAMIC SAVED WORKSPACE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowSaveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-white mb-2">Save Comparative Workspace</h3>
            <p className="text-xs text-slate-400 mb-4">
              Persist the active city listings, selected dimension parameters, and analytical metrics.
            </p>
            <input 
              type="text"
              value={newSaveName}
              onChange={(e) => setNewSaveName(e.target.value)}
              placeholder="e.g. Coastal vs Inland Seasonal Stability"
              className="w-full bg-slate-950 text-xs text-white border border-white/10 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={saveWorkspace}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-550 rounded-xl"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CORE CONFIGURATION INTERFACES (CITIES, DIMENSIONS, MODES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: City selectors (Multi-city workspace list) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/10 bg-slate-900/30 backdrop-blur-md flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Sliders size={12} className="text-pink-400" /> Active City Ledger
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950/60 text-slate-400 border border-white/5">
                  {comparedCities.length} / 5
                </span>
              </div>

              {/* Suggestions autocomplete input */}
              <div className="relative mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Integrate custom city to workspace..."
                    className="w-full bg-slate-950/50 text-xs text-white border border-white/10 rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-pink-500 transition-all placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSuggestions([]);
                      }}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Suggestions display popup */}
                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-200/5">
                    {suggestions.map((loc, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddCity(loc)}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex flex-col"
                      >
                        <span className="font-semibold">{loc.name}</span>
                        <span className="text-[10px] text-slate-500">{loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List of integrated cities */}
              <div className="space-y-2">
                {comparedCities.map((city, index) => {
                  const isBaseline = index === 0;
                  const charCode = isBaseline ? "A" : String.fromCharCode(65 + index);
                  return (
                    <div 
                      key={`${city.location.lat}-${city.location.lon}-${index}`}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isBaseline 
                          ? "bg-indigo-950/20 border-indigo-500/20" 
                          : "bg-slate-950/20 border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold border ${
                          isBaseline 
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                            : "bg-pink-500/10 border-pink-500/30 text-pink-400"
                        }`}>
                          {charCode}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            {city.location.name}
                            {isBaseline && (
                              <span className="text-[9px] px-1 bg-indigo-500/10 text-indigo-400 rounded-md uppercase font-bold tracking-wider">
                                Baseline
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {city.location.country} • {city.location.lat.toFixed(2)}°, {city.location.lon.toFixed(2)}°
                          </p>
                        </div>
                      </div>

                      {/* Controls: Reorder, Delete */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => moveCity(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button 
                          onClick={() => moveCity(index, "down")}
                          disabled={index === comparedCities.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button 
                          onClick={() => handleRemoveCity(index)}
                          disabled={isBaseline}
                          className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {loadingNewCity && (
                <div className="mt-4 text-[11px] font-mono text-pink-400 flex items-center gap-2 animate-pulse">
                  <Compass size={12} className="animate-spin" /> Fetching remote satellite weather grid...
                </div>
              )}
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="mt-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-mono flex items-start gap-2">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Dimension and mode selectors */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 bg-slate-900/30 backdrop-blur-md space-y-5">
            {/* Dimension Selection */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-mono font-bold mb-3">
                Investigative Comparison Dimension
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {dimensions.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={() => setActiveDimension(dim.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      activeDimension === dim.id
                        ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg"
                        : "bg-slate-950/20 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                    }`}
                  >
                    <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {dim.label}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {dim.desc}
                    </p>
                    {activeDimension === dim.id && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison Mode & Custom Inquiry */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-white/5">
              <div className="md:col-span-5">
                <div className="text-[10px] uppercase tracking-wider text-pink-400 font-mono font-bold mb-2">
                  Atmospheric Comparison Mode
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["difference", "similarity", "variability", "pattern", "custom"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMode(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                        activeMode === m
                          ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                          : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m === "difference" ? "Difference Engine" : `${m} Analysis`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom inquiry purpose input */}
              <div className="md:col-span-7 flex flex-col justify-end">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-2">
                  User-Defined Investigative Inquiry Purpose
                </div>
                <input 
                  type="text"
                  value={purposeText}
                  onChange={(e) => setPurposeText(e.target.value)}
                  placeholder="e.g. Determine which city offers the most stable air quality or dry heat..."
                  className="w-full bg-slate-950/50 text-xs text-white border border-white/10 rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DYNAMIC ANALYTICAL REPORT CARD (INSIGHTS AND CITY PROFILES) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Deep Climatological Insights & AI output (8 Columns) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/10 bg-slate-900/30 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-pink-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Atmospheric Intelligence Core Output
                </h3>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {loadingAnalysis ? "Recalculating climatological vectors..." : "Calculated"}
              </div>
            </div>

            {loadingAnalysis ? (
              <div className="h-44 flex flex-col items-center justify-center space-y-2">
                <Compass size={28} className="text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400 font-mono animate-pulse">Running narrative atmospheric simulation...</span>
              </div>
            ) : analysisResult ? (
              <div className="space-y-5">
                {analysisResult.isFallback && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-[11px] text-amber-300/90 leading-relaxed">
                    <Info size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5">
                        {analysisResult.fallbackReason === "quota_exceeded" 
                          ? "Deterministic Fallback Engine Active (Quota Exceeded)" 
                          : analysisResult.fallbackReason === "no_api_key" 
                            ? "Climatological Projection Active (No API Key)" 
                            : "Local Weather Modeling Active"}
                      </span>
                      {analysisResult.fallbackReason === "quota_exceeded" ? (
                        <span>
                          The standard Gemini API daily quota limit has been reached (429 Resource Exhausted). 
                          We have seamlessly activated our high-fidelity deterministic Climatological Model to compute real-time comparative metrics.
                        </span>
                      ) : analysisResult.fallbackReason === "no_api_key" ? (
                        <span>
                          Gemini API is not configured. Running our premium offline deterministic forecasting models to analyze and correlate micro-climatic vectors.
                        </span>
                      ) : (
                        <span>
                          The remote atmospheric intelligence node is currently offline. Utilizing real-time local-computational projections to output comparative findings.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Markdown text parsed nicely inside a container */}
                <div className="text-xs text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none space-y-3">
                  {analysisResult.comparison.split("\n\n").map((para: string, idx: number) => {
                    if (para.startsWith("**") || para.startsWith("#") || para.startsWith("1.")) {
                      return (
                        <div key={idx} className="bg-slate-950/30 border border-white/5 p-4 rounded-xl space-y-1">
                          <p className="font-mono text-[11px] text-pink-400 font-bold uppercase tracking-wider">
                            Section {idx + 1} • Advanced Telemetry Context
                          </p>
                          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                            {para.replace(/\*\*/g, "").trim()}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-slate-300 italic pl-3 border-l-2 border-indigo-500/30">
                        {para}
                      </p>
                    );
                  })}
                </div>

                {/* top differences ranked list if present */}
                {analysisResult.topDifferences && analysisResult.topDifferences.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold font-mono tracking-wider text-pink-400">
                      Significant Divergences Detected (Ranked)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysisResult.topDifferences.map((diff: string, index: number) => (
                        <div key={index} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-mono flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <span className="text-xs text-slate-300 leading-relaxed font-sans">{diff}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-slate-500 font-mono">
                No active comparison computed. Use active ledger above to configure.
              </div>
            )}
          </div>
        </div>

        {/* Compact City Identity Profiles (4 Columns) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 bg-slate-900/30 backdrop-blur-md flex flex-col justify-between h-full">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-300 font-mono font-bold mb-4 flex items-center gap-1.5">
                <Activity size={12} className="text-indigo-400 animate-spin-slow" /> Comparative Identity Profiles
              </div>

              {loadingAnalysis ? (
                <div className="space-y-3">
                  <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
                </div>
              ) : analysisResult?.cityAnalyses ? (
                <div className="space-y-3">
                  {analysisResult.cityAnalyses.map((item: any, i: number) => {
                    const matchedCity = comparedCities.find(c => c.location.name === item.name);
                    const isBaseline = i === 0;
                    return (
                      <div key={i} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl relative overflow-hidden">
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-mono">
                          {item.profileType}
                        </div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {item.name}
                          <span className={`text-[8px] px-1 rounded uppercase font-bold ${
                            item.stabilityRating === "High Stability" 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : item.stabilityRating === "High Variability"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {item.stabilityRating}
                          </span>
                        </h4>
                        
                        <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-white/5 text-[10px] font-mono text-slate-400">
                          <div>
                            <span className="text-slate-500 block">7D Mean Max</span>
                            <span className="text-slate-200 font-semibold">{formatTemp(item.tempMean)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Rain Prob Mean</span>
                            <span className="text-slate-200 font-semibold">{Math.round(item.rainMean)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Mean Humidity</span>
                            <span className="text-slate-200 font-semibold">{Math.round(item.humidityMean)}%</span>
                          </div>
                        </div>

                        {matchedCity && (
                          <div className="mt-2.5 text-[9px] text-slate-500 leading-relaxed font-sans bg-slate-900/50 p-2 rounded-lg border border-white/5">
                            <strong>Atmosphere:</strong> {matchedCity.current.conditionText}. Current AQI registers <span className={matchedCity.airQuality.aqi > 100 ? "text-amber-400" : "text-emerald-400"}>{matchedCity.airQuality.aqi} ({matchedCity.airQuality.label})</span>.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono py-8 text-center">
                  Cities profile lists will populate here once compared.
                </div>
              )}
            </div>

            {/* Matrix alignment percent if more than 1 city */}
            {analysisResult?.similarityScores && analysisResult.similarityScores.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <div className="text-[10px] uppercase font-bold font-mono tracking-wider text-pink-400 mb-2">
                  Pairwise Alignment Correlation
                </div>
                <div className="space-y-1.5">
                  {analysisResult.similarityScores.map((score: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold font-mono text-slate-300">{score.pair}</span>
                        <span className="font-bold text-pink-400 font-mono">{score.score}% Congruence</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">
                        {score.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. VISUALIZATIONS: COMPARATIVE TIME-SERIES TIMELINE CHART (RECHARTS) */}
      {comparedCities.length > 1 && (
        <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/10 bg-slate-900/30 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-1.5">
                <TrendingUp size={14} /> Synced Forecast Timeline Comparison
              </span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">Multi-City Overlaid Forecast Divergence</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Observe timeline fluctuations, highlight periods of maximum divergence & convergence.
              </p>
            </div>

            {/* Metric select */}
            <div className="flex p-0.5 bg-slate-950 rounded-lg border border-white/5">
              {(["temp", "rain", "humidity", "wind"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded capitalize transition-all ${
                    chartMetric === m ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "temp" ? "Thermal" : m === "rain" ? "Rain" : m === "humidity" ? "Moisture" : "Wind"}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTimelineChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.4)" 
                  fontSize={10} 
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.4)" 
                  fontSize={10} 
                  fontFamily="monospace" 
                  unit={chartMetric === "temp" ? `°${tempUnit}` : chartMetric === "rain" || chartMetric === "humidity" ? "%" : ""}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}
                  itemStyle={{ fontSize: "11px", color: "white" }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                />
                {comparedCities.map((city, idx) => (
                  <Line
                    key={city.location.name}
                    type="monotone"
                    dataKey={city.location.name}
                    stroke={idx === 0 ? "#6366f1" : idx === 1 ? "#ec4899" : idx === 2 ? "#10b981" : idx === 3 ? "#f59e0b" : "#8b5cf6"}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Divergence & Convergence Summary card */}
          {chartStats && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-white/5 text-[11px] font-mono">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Peak Thermal Divergence (Largest gap):</span>
                <span className="text-pink-400 font-bold">
                  {chartStats.maxDiv}{chartMetric === "temp" ? `°${tempUnit}` : "%"} spread ({chartStats.maxDivDay})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">Atmospheric Convergence (Closest day):</span>
                <span className="text-indigo-400 font-bold">
                  {chartStats.minDiv}{chartMetric === "temp" ? `°${tempUnit}` : "%"} spread ({chartStats.minDivDay})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. ADVANCED COMPARATIVE HEATMAP */}
      {comparedCities.length > 1 && (
        <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/10 bg-slate-900/30 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 font-mono flex items-center gap-1.5">
                <Layers size={14} /> Climatological Heatmap Matrix
              </span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">Multi-Temporal Spatial Intensity</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Compare relative delta metrics across all active cities in a structured matrix.
              </p>
            </div>

            {/* Heatmap metric select */}
            <div className="flex p-0.5 bg-slate-950 rounded-lg border border-white/5">
              {(["temp", "rain", "humidity"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setHeatmapMetric(m)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded capitalize transition-all ${
                    heatmapMetric === m ? "bg-pink-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "temp" ? "Thermal" : m === "rain" ? "Rain" : "Moisture"}
                </button>
              ))}
            </div>
          </div>

          {/* Render Heatmap */}
          <div className="overflow-x-auto pt-2">
            <div className="min-w-[600px] space-y-2">
              {/* Header: Days */}
              <div className="grid grid-cols-8 text-[10px] font-mono text-slate-500 pb-1.5 border-b border-white/5">
                <div className="col-span-1 text-left font-bold uppercase">City</div>
                {comparedCities[0].daily.map((d, i) => (
                  <div key={i} className="text-center font-bold">{d.dayName}</div>
                ))}
              </div>

              {/* Rows: Cities */}
              {comparedCities.map((city, cityIdx) => {
                // Find min/max in current category to calculate correct shade intensity
                const vals = city.daily.map(d => 
                  heatmapMetric === "temp" ? d.maxTemp : heatmapMetric === "rain" ? d.rainProb : d.humidity
                );
                const min = Math.min(...vals);
                const max = Math.max(...vals);

                return (
                  <div key={cityIdx} className="grid grid-cols-8 items-center py-1">
                    <div className="col-span-1 text-xs font-bold text-white truncate pr-2 flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-500 font-mono">[{cityIdx === 0 ? "A" : String.fromCharCode(65 + cityIdx)}]</span>
                      {city.location.name}
                    </div>
                    {city.daily.map((day, dayIdx) => {
                      const val = heatmapMetric === "temp" ? day.maxTemp : heatmapMetric === "rain" ? day.rainProb : day.humidity;
                      const displayVal = heatmapMetric === "temp" ? formatTemp(val) : `${Math.round(val)}%`;
                      return (
                        <div 
                          key={dayIdx} 
                          className="px-2 py-3 mx-1 text-center rounded-lg text-[10px] font-mono font-bold text-white shadow-inner transition-all hover:scale-105 cursor-help"
                          style={{ backgroundColor: getHeatmapColor(val, min, max, heatmapMetric) }}
                          title={`${city.location.name} (${day.dayName}): ${displayVal}`}
                        >
                          {displayVal}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. GEOGRAPHIC RELATIONSHIP MAP */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/10 bg-slate-900/30 backdrop-blur-md space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-1.5">
            <Compass size={14} className="animate-spin-slow" /> Geospatial Atmosphere Relationship Map
          </span>
          <h3 className="text-base font-bold text-white tracking-tight mt-1">Geographic Influence & Coordinate Baseline</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Visualize the geographic alignment and spatial separations between the compared points.
          </p>
        </div>

        <ComparisonMap cities={comparedCities} tempUnit={tempUnit} />
      </div>

    </div>
  );
}
