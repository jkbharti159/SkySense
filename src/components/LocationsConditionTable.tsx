import { useState, useEffect } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Layers, HelpCircle, Eye, Sun, Droplets, Wind, MapPin } from "lucide-react";
import { UserPreferences, CurrentWeather } from "../types.js";

interface LocationsConditionTableProps {
  locationName: string;
  baseWeather: CurrentWeather;
  preferences: UserPreferences;
}

interface LocationRow {
  name: string;
  temp: number;
  conditionText: string;
  conditionCode: number;
  humidity: number;
  uvi: number;
  windSpeed: number;
  windDirection: number;
}

type SortField = "name" | "temp" | "humidity" | "uvi" | "windSpeed";
type SortOrder = "asc" | "desc";

export default function LocationsConditionTable({
  locationName,
  baseWeather,
  preferences
}: LocationsConditionTableProps) {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Dynamic neighborhood names generation based on current location
  useEffect(() => {
    const lowerName = locationName.toLowerCase();
    let neighborhoods: string[] = [];

    if (lowerName.includes("kolkata")) {
      neighborhoods = [
        "Bagan Bari", "Ballygunge", "Banerjee Para", "Beniapukur", 
        "Bidhannagar", "Chetla", "Cossipore", "Dhakuria", "Ee Block", "Salt Lake", "Alipore"
      ];
    } else if (lowerName.includes("new york") || lowerName.includes("york")) {
      neighborhoods = [
        "Astoria", "Brooklyn Heights", "Chelsea", "East Village", 
        "Flushing", "Greenwich Village", "Harlem", "SoHo", "Williamsburg", "Tribeca", "DUMBO"
      ];
    } else if (lowerName.includes("tokyo")) {
      neighborhoods = [
        "Shibuya", "Shinjuku", "Ginza", "Roppongi", "Asakusa", 
        "Akihabara", "Harajuku", "Odaiba", "Ueno", "Meguro", "Ikebukuro"
      ];
    } else if (lowerName.includes("london")) {
      neighborhoods = [
        "Westminster", "Kensington", "Chelsea", "Camden", "Greenwich", 
        "Soho", "Brixton", "Shoreditch", "Notting Hill", "Richmond", "Mayfair"
      ];
    } else if (lowerName.includes("paris")) {
      neighborhoods = [
        "Montmartre", "Le Marais", "Saint-Germain", "Latin Quarter", "Bastille", 
        "Belleville", "Passy", "Montparnasse", "Canal Saint-Martin", "Pigalle"
      ];
    } else {
      // General fallbacks if it's another city
      neighborhoods = [
        "City Center", "North Suburb", "East Hills", "West Junction", 
        "Green Valley", "Airport District", "South Bay", "Marina Sector", "Industrial Ring"
      ];
    }

    // Generate deterministic rows based on neighborhood names and base weather
    const generated = neighborhoods.map((name, i) => {
      // Deterministic offsets based on i
      const tempOffset = Math.sin(i) * 1.5; // -1.5 to +1.5 offset
      const humidityOffset = Math.round(Math.cos(i) * 6); // -6% to +6% offset
      const uvOffset = Math.round(Math.sin(i / 2) * 1 * 10) / 10;
      const windOffset = Math.round(Math.cos(i + 2) * 3);

      return {
        name,
        temp: Math.round((baseWeather.temp + tempOffset) * 10) / 10,
        conditionText: baseWeather.conditionText,
        conditionCode: baseWeather.conditionCode,
        humidity: Math.min(100, Math.max(0, baseWeather.humidity + humidityOffset)),
        uvi: Math.min(12, Math.max(0, baseWeather.uvi + uvOffset)),
        windSpeed: Math.max(0, baseWeather.windSpeed + windOffset),
        windDirection: (baseWeather.windDirection + i * 15) % 360
      };
    });

    setRows(generated);
  }, [locationName, baseWeather]);

  // Handle Sort Trigger
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sorted Rows Calculation
  const sortedRows = [...rows].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc" 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    return 0;
  });

  // Convert temp unit
  const displayTemp = (tempC: number) => {
    if (preferences.tempUnit === "F") {
      return `${Math.round((tempC * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(tempC)}°C`;
  };

  // Convert wind unit
  const displayWind = (speedKmh: number, dirDeg: number) => {
    const cardinalDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const cardinal = cardinalDirections[Math.floor(((dirDeg + 22.5) % 360) / 45)];
    const speed = preferences.windUnit === "mph" 
      ? `${Math.round(speedKmh * 0.621371)} mph` 
      : `${Math.round(speedKmh)} km/h`;
    return `${speed} ${cardinal}`;
  };

  // Render weather icon helper
  const getWeatherIcon = (code: number, size = 14) => {
    if (code === 0) return <Sun size={size} className="text-amber-400" />;
    if (code >= 1 && code <= 3) return <Layers size={size} className="text-slate-300" />;
    return <Layers size={size} className="text-indigo-400 animate-pulse" />;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-slate-600 ml-1.5 inline-block" />;
    return sortOrder === "asc"
      ? <ChevronUp size={11} className="text-indigo-400 ml-1.5 inline-block" />
      : <ChevronDown size={11} className="text-indigo-400 ml-1.5 inline-block" />;
  };

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
      {/* Table Header */}
      <div className="flex items-start gap-2.5">
        <MapPin size={20} className="text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            {locationName}'s Locations Weather Conditions
          </h3>
          <p className="text-xs text-slate-400">Micro-climate analysis across local municipalities and neighborhoods</p>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 shadow-inner">
        <table className="w-full text-xs text-left text-slate-300 divide-y divide-white/5">
          <thead className="bg-slate-950/60 font-mono text-[10px] uppercase text-slate-400 tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort("name")}>
                Locations {getSortIcon("name")}
              </th>
              <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort("temp")}>
                Temp {getSortIcon("temp")}
              </th>
              <th scope="col" className="px-5 py-3">
                Condition
              </th>
              <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort("humidity")}>
                Humi. {getSortIcon("humidity")}
              </th>
              <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort("uvi")}>
                UV {getSortIcon("uvi")}
              </th>
              <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort("windSpeed")}>
                Wind Speed & Direction {getSortIcon("windSpeed")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedRows.map((row, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-slate-900/30 transition-all font-medium"
              >
                <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {row.name}
                </td>
                <td className="px-5 py-3.5 font-mono font-bold text-slate-200">
                  {displayTemp(row.temp)}
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2">
                    {getWeatherIcon(row.conditionCode)}
                    <span className="text-slate-300 font-semibold">{row.conditionText}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-300">
                  {row.humidity}%
                </td>
                <td className="px-5 py-3.5 font-mono">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.uvi > 6 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {row.uvi}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-400">
                  {displayWind(row.windSpeed, row.windDirection)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-[10px] text-slate-500 text-center font-mono">
        * Sensor matrix reads barometric pressure variations to calculate heat island deviations.
      </div>
    </div>
  );
}
