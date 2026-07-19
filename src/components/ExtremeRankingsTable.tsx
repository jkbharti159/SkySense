import { useState } from "react";
import { HelpCircle, Sun, Wind, Droplets, Thermometer, Flame, Snowflake, Heart, AlertTriangle } from "lucide-react";
import { UserPreferences } from "../types.js";

interface ExtremeRankingsTableProps {
  locationName: string;
  preferences: UserPreferences;
}

interface RankedCity {
  rank: number;
  city: string;
  country: string;
  flag: string;
  tempC: number;
  conditionText: string;
  conditionCode: number;
  humidity: number;
  uvi: number;
  windSpeed: number;
  windDirection: number;
}

export default function ExtremeRankingsTable({
  locationName,
  preferences
}: ExtremeRankingsTableProps) {
  const [activeMode, setActiveMode] = useState<"hottest" | "coldest">("hottest");
  const [followedCities, setFollowedCities] = useState<string[]>([]);

  // Toggle favorite city follow state
  const toggleFollow = (cityName: string) => {
    if (followedCities.includes(cityName)) {
      setFollowedCities(followedCities.filter(c => c !== cityName));
    } else {
      setFollowedCities([...followedCities, cityName]);
    }
  };

  // Generate realistic cities depending on active mode and current region
  const getRankedCities = (): RankedCity[] => {
    const isIndia = locationName.toLowerCase().includes("kolkata") || locationName.toLowerCase().includes("india") || locationName.toLowerCase().includes("delhi");
    
    if (activeMode === "hottest") {
      if (isIndia) {
        return [
          { rank: 1, city: "Churu", country: "India", flag: "🇮🇳", tempC: 44.2, conditionText: "Scorching Sun", conditionCode: 0, humidity: 24, uvi: 11, windSpeed: 24, windDirection: 270 },
          { rank: 2, city: "Sri Ganganagar", country: "India", flag: "🇮🇳", tempC: 43.8, conditionText: "Extreme Heat", conditionCode: 0, humidity: 26, uvi: 11, windSpeed: 22, windDirection: 260 },
          { rank: 3, city: "Jaisalmer", country: "India", flag: "🇮🇳", tempC: 43.1, conditionText: "Scorching Sun", conditionCode: 0, humidity: 20, uvi: 11, windSpeed: 30, windDirection: 240 },
          { rank: 4, city: "Prayagraj", country: "India", flag: "🇮🇳", tempC: 42.5, conditionText: "Clear Sky", conditionCode: 0, humidity: 30, uvi: 10, windSpeed: 14, windDirection: 290 },
          { rank: 5, city: "Jhansi", country: "India", flag: "🇮🇳", tempC: 42.1, conditionText: "Clear Sky", conditionCode: 0, humidity: 32, uvi: 10, windSpeed: 16, windDirection: 280 },
          { rank: 6, city: "New Delhi", country: "India", flag: "🇮🇳", tempC: 41.7, conditionText: "Smoky Haze", conditionCode: 45, humidity: 35, uvi: 10, windSpeed: 12, windDirection: 110 },
          { rank: 7, city: "Kolkata", country: "India", flag: "🇮🇳", tempC: 38.4, conditionText: "Extreme Humidity", conditionCode: 2, humidity: 78, uvi: 10, windSpeed: 23, windDirection: 189 },
          { rank: 8, city: "Ahmedabad", country: "India", flag: "🇮🇳", tempC: 37.9, conditionText: "Mainly Clear", conditionCode: 1, humidity: 52, uvi: 9, windSpeed: 18, windDirection: 210 }
        ];
      } else {
        // Global Hottest
        return [
          { rank: 1, city: "Death Valley", country: "United States", flag: "🇺🇸", tempC: 49.5, conditionText: "Scorching Sun", conditionCode: 0, humidity: 8, uvi: 12, windSpeed: 18, windDirection: 220 },
          { rank: 2, city: "Kuwait City", country: "Kuwait", flag: "🇰🇼", tempC: 48.1, conditionText: "Extreme Heat", conditionCode: 0, humidity: 12, uvi: 11, windSpeed: 28, windDirection: 310 },
          { rank: 3, city: "Riyadh", country: "Saudi Arabia", flag: "🇸🇦", tempC: 46.8, conditionText: "Dust Storm", conditionCode: 45, humidity: 10, uvi: 11, windSpeed: 32, windDirection: 330 },
          { rank: 4, city: "Timbuktu", country: "Mali", flag: "🇲🇱", tempC: 45.4, conditionText: "Scorching Sun", conditionCode: 0, humidity: 15, uvi: 11, windSpeed: 14, windDirection: 90 },
          { rank: 5, city: "Cairo", country: "Egypt", flag: "🇪🇬", tempC: 41.2, conditionText: "Clear Sky", conditionCode: 0, humidity: 28, uvi: 10, windSpeed: 15, windDirection: 350 },
          { rank: 6, city: "Phoenix", country: "United States", flag: "🇺🇸", tempC: 40.5, conditionText: "Mainly Clear", conditionCode: 1, humidity: 18, uvi: 10, windSpeed: 11, windDirection: 240 },
          { rank: 7, city: "Athens", country: "Greece", flag: "🇬🇷", tempC: 37.2, conditionText: "Sunny", conditionCode: 0, humidity: 34, uvi: 9, windSpeed: 20, windDirection: 360 },
          { rank: 8, city: "Sydney", country: "Australia", flag: "🇦🇺", tempC: 36.5, conditionText: "Sunny", conditionCode: 0, humidity: 41, uvi: 8, windSpeed: 22, windDirection: 180 }
        ];
      }
    } else {
      // Coldest list
      if (isIndia) {
        return [
          { rank: 1, city: "Leh", country: "India", flag: "🇮🇳", tempC: -4.5, conditionText: "Freezing Cold", conditionCode: 71, humidity: 55, uvi: 2, windSpeed: 14, windDirection: 340 },
          { rank: 2, city: "Dras", country: "India", flag: "🇮🇳", tempC: -8.2, conditionText: "Extreme Frost", conditionCode: 75, humidity: 62, uvi: 1, windSpeed: 16, windDirection: 10 },
          { rank: 3, city: "Gulmarg", country: "India", flag: "🇮🇳", tempC: -1.8, conditionText: "Heavy Snow", conditionCode: 85, humidity: 82, uvi: 2, windSpeed: 18, windDirection: 320 },
          { rank: 4, city: "Keylong", country: "India", flag: "🇮🇳", tempC: -0.5, conditionText: "Light Snow", conditionCode: 71, humidity: 70, uvi: 2, windSpeed: 10, windDirection: 40 },
          { rank: 5, city: "Shimla", country: "India", flag: "🇮🇳", tempC: 6.2, conditionText: "Chilly Overcast", conditionCode: 3, humidity: 65, uvi: 3, windSpeed: 11, windDirection: 300 },
          { rank: 6, city: "Srinagar", country: "India", flag: "🇮🇳", tempC: 8.4, conditionText: "Drizzly Fog", conditionCode: 45, humidity: 88, uvi: 3, windSpeed: 8, windDirection: 210 },
          { rank: 7, city: "Mussoorie", country: "India", flag: "🇮🇳", tempC: 9.1, conditionText: "Overcast Clouds", conditionCode: 3, humidity: 74, uvi: 3, windSpeed: 12, windDirection: 180 },
          { rank: 8, city: "Manali", country: "India", flag: "🇮🇳", tempC: 10.3, conditionText: "Partly Cloudy", conditionCode: 2, humidity: 68, uvi: 4, windSpeed: 9, windDirection: 250 }
        ];
      } else {
        // Global Coldest
        return [
          { rank: 1, city: "Oymyakon", country: "Russia", flag: "🇷🇺", tempC: -38.4, conditionText: "Extreme Frost", conditionCode: 75, humidity: 45, uvi: 0, windSpeed: 8, windDirection: 20 },
          { rank: 2, city: "Yakutsk", country: "Russia", flag: "🇷🇺", tempC: -32.1, conditionText: "Heavy Snowfall", conditionCode: 85, humidity: 55, uvi: 0, windSpeed: 12, windDirection: 40 },
          { rank: 3, city: "Harbin", country: "China", flag: "🇨🇳", tempC: -14.5, conditionText: "Freezing Air", conditionCode: 71, humidity: 60, uvi: 1, windSpeed: 15, windDirection: 350 },
          { rank: 4, city: "Winnipeg", country: "Canada", flag: "🇨🇦", tempC: -8.2, conditionText: "Ice Storm", conditionCode: 75, humidity: 78, uvi: 1, windSpeed: 25, windDirection: 330 },
          { rank: 5, city: "Anchorage", country: "United States", flag: "🇺🇸", tempC: -4.1, conditionText: "Light Snow", conditionCode: 71, humidity: 82, uvi: 2, windSpeed: 14, windDirection: 180 },
          { rank: 6, city: "Reykjavik", country: "Iceland", flag: "🇮🇸", tempC: -1.2, conditionText: "Chilly Overcast", conditionCode: 3, humidity: 85, uvi: 1, windSpeed: 34, windDirection: 90 },
          { rank: 7, city: "Helsinki", country: "Finland", flag: "🇫🇮", tempC: 2.1, conditionText: "Chilly Wind", conditionCode: 2, humidity: 72, uvi: 2, windSpeed: 21, windDirection: 110 },
          { rank: 8, city: "Oslo", country: "Norway", flag: "🇳🇴", tempC: 3.5, conditionText: "Overcast", conditionCode: 3, humidity: 70, uvi: 2, windSpeed: 12, windDirection: 240 }
        ];
      }
    }
  };

  const rankedCities = getRankedCities();

  // Unit conversions
  const displayTemp = (tempC: number) => {
    if (preferences.tempUnit === "F") {
      return `${Math.round((tempC * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(tempC)}°C`;
  };

  const displayWind = (speedKmh: number, dirDeg: number) => {
    const speed = preferences.windUnit === "mph" 
      ? `${Math.round(speedKmh * 0.621371)} mph` 
      : `${Math.round(speedKmh)} km/h`;
    return speed;
  };

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
      {/* Table Header with Toggle Switch */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Flame size={18} className="text-orange-500 animate-pulse" />
            {locationName.toLowerCase().includes("kolkata") || locationName.toLowerCase().includes("india") || locationName.toLowerCase().includes("delhi") 
              ? "India's Temperature Extremes"
              : "Global Temperature Extremes"
            }
          </h3>
          <p className="text-xs text-slate-400">National and global meteorological heat/frost radar rankings</p>
        </div>

        {/* Hottest vs Coldest sliding selector */}
        <div className="flex p-0.5 bg-slate-950 rounded-xl border border-white/5 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveMode("hottest")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "hottest" 
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Flame size={12} />
            Hottest
          </button>
          <button
            onClick={() => setActiveMode("coldest")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "coldest" 
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Snowflake size={12} />
            Coldest
          </button>
        </div>
      </div>

      {/* Ranked List Grid */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 shadow-inner">
        <table className="w-full text-xs text-left text-slate-300 divide-y divide-white/5">
          <thead className="bg-slate-950/60 font-mono text-[10px] uppercase text-slate-400 tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3 w-16 text-center">Rank</th>
              <th scope="col" className="px-5 py-3">City & Country</th>
              <th scope="col" className="px-5 py-3 text-center">Temp</th>
              <th scope="col" className="px-5 py-3">Atmosphere</th>
              <th scope="col" className="px-5 py-3">Humi.</th>
              <th scope="col" className="px-5 py-3">UV</th>
              <th scope="col" className="px-5 py-3">Wind</th>
              <th scope="col" className="px-5 py-3 text-center">Follow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rankedCities.map((c) => {
              const rankClass = c.rank === 1 
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" 
                : c.rank === 2 
                  ? "bg-slate-200/10 text-slate-300 border border-slate-200/15" 
                  : c.rank === 3 
                    ? "bg-amber-700/15 text-amber-600 border border-amber-700/25" 
                    : "bg-slate-950 text-slate-500 border border-white/5";
              const isFollowed = followedCities.includes(c.city);

              return (
                <tr key={c.rank} className="hover:bg-slate-900/30 transition-all font-medium">
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black border font-mono ${rankClass}`}>
                      {c.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none select-none">{c.flag}</span>
                      <div>
                        <span className="font-bold text-white block">{c.city}</span>
                        <span className="text-[10px] text-slate-400">{c.country}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-bold">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${activeMode === "hottest" ? "bg-red-500/10 text-rose-400 border border-red-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"} border`}>
                      {displayTemp(c.tempC)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-300">
                    <span className="flex items-center gap-2">
                      {activeMode === "hottest" ? <Sun size={12} className="text-amber-400" /> : <Snowflake size={12} className="text-sky-300" />}
                      {c.conditionText}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-400">{c.humidity}%</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{c.uvi}</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{displayWind(c.windSpeed, c.windDirection)}</td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggleFollow(c.city)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isFollowed 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" 
                          : "bg-slate-950/40 border-white/5 text-slate-500 hover:text-white"
                      }`}
                      title={isFollowed ? `Unfollow ${c.city}` : `Follow ${c.city}`}
                    >
                      <Heart size={12} fill={isFollowed ? "currentColor" : "none"} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex gap-3 items-start text-[10px] text-slate-400 leading-relaxed font-semibold">
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0 animate-pulse" />
        <div>
          <span className="text-slate-200 block font-bold mb-0.5">Atmospheric Alert: Heat Dome and Frost Vectors</span>
          {activeMode === "hottest"
            ? "Regional high pressure cells are capturing extreme thermal heat domes. Active outdoor sports are highly restricted between 11:00 AM and 04:00 PM in flagged cities."
            : "Siberian jet streams and arctic fronts are triggering localized icing events. Ensure plumbing insulation is active."}
        </div>
      </div>
    </div>
  );
}
