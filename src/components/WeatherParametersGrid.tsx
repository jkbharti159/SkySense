import { Compass, Wind, Eye, Cloud, Droplets, Gauge, Sun } from "lucide-react";
import { CurrentWeather, UserPreferences } from "../types.js";

interface WeatherParametersGridProps {
  current: CurrentWeather;
  locationName: string;
  preferences: UserPreferences;
}

export default function WeatherParametersGrid({ current, locationName, preferences }: WeatherParametersGridProps) {

  // Helper unit conversions
  const displayWind = (speedKmh: number) => {
    if (preferences.windUnit === "mph") {
      return `${Math.round(speedKmh * 0.621371)} mph`;
    }
    return `${Math.round(speedKmh)} km/h`;
  };

  // Convert wind degrees to cardinal direction name
  const getWindCardinal = (deg: number) => {
    const directions = [
      "North", 
      "North-Northeast", 
      "Northeast", 
      "East-Northeast", 
      "East", 
      "East-Southeast", 
      "Southeast", 
      "South-Southeast", 
      "South", 
      "South-Southwest", 
      "Southwest", 
      "West-Southwest", 
      "West", 
      "West-Northwest", 
      "Northwest", 
      "North-Northwest"
    ];
    const val = Math.floor((deg / 22.5) + 0.5);
    return directions[val % 16];
  };

  const cardinal = getWindCardinal(current.windDirection);

  // Estimate gust speed as wind speed * 1.35
  const estimatedGustMs = Math.round((current.windSpeed / 3.6) * 1.35 * 10) / 10;

  // Live precipitation directly from Open-Meteo
  const displayPrecipitation = typeof current.precipitation === "number"
    ? `${current.precipitation.toFixed(2)} mm`
    : "0.00 mm";

  // UV index rating descriptions
  const getUvText = (uv: number) => {
    if (uv <= 2) return { text: "Low Exposure Risk", color: "text-emerald-400" };
    if (uv <= 5) return { text: "Moderate Exposure Risk", color: "text-yellow-400" };
    if (uv <= 7) return { text: "High Exposure Risk", color: "text-amber-500" };
    if (uv <= 10) return { text: "Very High Exposure Risk", color: "text-rose-500" };
    return { text: "Extreme Exposure Risk", color: "text-purple-500" };
  };

  const uvRating = getUvText(current.uvi);

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-2xl relative">
      {/* Parameters Grid Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 text-left w-full">
        <div className="flex items-start gap-2.5 text-left">
          <Gauge size={20} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <h3 className="text-lg font-bold text-white tracking-tight text-left">
              {locationName} Weather Parameters
            </h3>
            <p className="text-xs text-slate-400 text-left">Atmospheric status metrics and micro-measurements</p>
          </div>
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* Card 1: Wind Direction with rotating compass */}
        <div id="param-wind-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Compass size={14} className="text-indigo-400 shrink-0" />
              <span className="font-bold text-slate-300">Wind Direction</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold inline-block">
                Compass Heading
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            {/* Compass Visualizer */}
            <div className="relative w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-slate-600 pb-8">N</div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-slate-600 pt-8">S</div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-slate-600 pl-8">W</div>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-slate-600 pr-8">E</div>
              <svg 
                className="w-6 h-6 transition-transform duration-1000 ease-out" 
                style={{ transform: `rotate(${current.windDirection}deg)` }}
                viewBox="0 0 24 24"
              >
                <polygon points="12,2 16,10 12,8 8,10" fill="#6366f1" />
                <polygon points="12,22 16,14 12,16 8,14" fill="#475569" />
              </svg>
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                {current.windDirection}° {cardinal}
              </span>
              <span className="text-xs text-slate-400">
                Wind Velocity: <span className="font-bold text-slate-200">{displayWind(current.windSpeed)}</span>
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-left">
            Currently blowing from the {cardinal} direction.
          </div>
        </div>

        {/* Card 2: Wind Gust Speed */}
        <div id="param-gust-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-teal-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Wind size={14} className="text-teal-400 shrink-0" />
              <span className="font-bold text-slate-300">Wind Gust Speed</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded font-bold inline-block">
                Peak Velocity
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            {/* Blowing Tree / Waves Visual */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0 text-teal-400 bg-teal-500/5 border border-teal-500/10 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                <span className="text-2xl animate-pulse">〰️</span>
              </div>
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                {estimatedGustMs} m/s
              </span>
              <span className="text-xs text-slate-400">
                Estimated Peak Velocity: <span className="font-bold text-slate-200">{displayWind(current.windSpeed * 1.35)}</span>
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-left">
            Sudden bursts of wind might occur. Plan accordingly.
          </div>
        </div>

        {/* Card 3: Cloud Cover & Horizontal Visibility */}
        <div id="param-cloud-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-sky-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Cloud size={14} className="text-sky-400 shrink-0" />
              <span className="font-bold text-slate-300">Cloud Cover & Horizontal Visibility</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-bold inline-block">
                Atmospheric Density
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            {/* Atmospheric Cloud Visual */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0 text-sky-400 bg-sky-500/5 border border-sky-500/15 rounded-xl">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                {current.clouds}% Cloud Cover
              </span>
              <span className="text-xs text-slate-400">
                Horizontal Visibility: <span className="font-bold text-slate-200">{Math.round(current.visibility / 1000)} km</span>
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-left">
            Clear horizon sight line of {Math.round(current.visibility / 1000)} km.
          </div>
        </div>

        {/* Card 4: Precipitation & Relative Humidity */}
        <div id="param-precip-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Droplets size={14} className="text-blue-400 shrink-0" />
              <span className="font-bold text-slate-300">Precipitation & Relative Humidity</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold inline-block">
                Atmospheric Moisture
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            <div className="w-12 h-12 flex items-center justify-center shrink-0 text-blue-400 bg-blue-500/5 border border-blue-500/15 rounded-xl">
              <Droplets className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                {displayPrecipitation}
              </span>
              <span className="text-xs text-slate-400">
                Relative Humidity: <span className="font-bold text-slate-200">{current.humidity}%</span>
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-left">
            Current precipitation is {displayPrecipitation}.
          </div>
        </div>

        {/* Card 5: Atmospheric Pressure */}
        <div id="param-pressure-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Gauge size={14} className="text-amber-400 shrink-0" />
              <span className="font-bold text-slate-300">Atmospheric Pressure</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold inline-block">
                Barometric Pressure
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            <div className="w-12 h-12 flex items-center justify-center shrink-0 text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <Gauge className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                {Math.round(current.pressure)} hPa
              </span>
              <span className="text-xs text-slate-400">
                Barometric Status: <span className="font-bold text-slate-200">{current.pressure > 1013 ? "High Pressure" : "Low Pressure"}</span>
              </span>
            </div>
          </div>

          <div className="mb-2">
            {/* Horizontal Dial Gauge representation */}
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(0, Math.min(100, ((current.pressure - 970) / (1040 - 970)) * 100))}%` }}
              />
              {/* Center point marker */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white opacity-40" title="Standard Sea Level Pressure: 1013.25 hPa" />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex justify-between text-left">
            <span>Low (970 hPa)</span>
            <span>Average (1013 hPa)</span>
            <span>High (1040 hPa)</span>
          </div>
        </div>

        {/* Card 6: Ultraviolet Index */}
        <div id="param-uv-card" className="bg-slate-950/70 hover:bg-slate-950/85 border border-white/10 hover:border-pink-500/30 rounded-2xl p-5 flex flex-col justify-between min-h-[195px] transition-all group shadow-md text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Sun size={14} className="text-pink-400 shrink-0" />
              <span className="font-bold text-slate-300">Ultraviolet Index</span>
            </div>
            <div>
              <span className={`text-[10px] font-bold ${uvRating.color} bg-pink-500/10 px-1.5 py-0.5 rounded font-mono inline-block`}>
                {uvRating.text}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 my-3">
            <div className="w-12 h-12 flex items-center justify-center shrink-0 text-pink-400 bg-pink-500/5 border border-pink-500/15 rounded-xl">
              <Sun className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-lg font-black text-white tracking-tight block">
                Index {current.uvi} of 12
              </span>
              <span className="text-xs text-slate-400">
                Radiation Risk: <span className={`font-bold ${uvRating.color}`}>{uvRating.text}</span>
              </span>
            </div>
          </div>

          <div className="mb-2">
            {/* Red to Purple Gradient slider bar */}
            <div className="relative w-full h-1.5 bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 via-red-500 to-purple-600 rounded-full border border-white/5">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-950 rounded-full shadow-lg transition-all duration-1000"
                style={{ left: `calc(${Math.min(100, (current.uvi / 12) * 100)}% - 6px)` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-left">
            {current.uvi > 5 
              ? "Sunscreen and hats are heavily recommended." 
              : "Safe for most skin types; standard exposure."}
          </div>
        </div>

      </div>
    </div>
  );
}
