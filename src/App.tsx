import { useEffect, useState } from "react";
import { FullWeatherData, LocationData, UserPreferences, CentralLocationState } from "./types.js";
import Weather3DBackground from "./components/Weather3DBackground.tsx";
import WeatherMap from "./components/WeatherMap.tsx";
import WeatherTrendCharts from "./components/WeatherTrendCharts.tsx";
import AirQualityIndicator from "./components/AirQualityIndicator.tsx";
import AirQualityDashboard from "./components/AirQualityDashboard.tsx";
import WeatherComparison from "./components/WeatherComparison.tsx";

import WeatherParametersGrid from "./components/WeatherParametersGrid.tsx";
import ForecastCarousel from "./components/ForecastCarousel.tsx";
import MonthlyForecastView from "./components/MonthlyForecastView.tsx";
import LocationsConditionTable from "./components/LocationsConditionTable.tsx";
import ExtremeRankingsTable from "./components/ExtremeRankingsTable.tsx";
import WeatherFAQs from "./components/WeatherFAQs.tsx";
import BlogsAndStation from "./components/BlogsAndStation.tsx";
import ClimateTrendsView from "./components/ClimateTrendsView.tsx";
import AIWeatherPlanner from "./components/AIWeatherPlanner.tsx";
import MeteorologicalRadar from "./components/MeteorologicalRadar.tsx";

import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Search,
  Navigation,
  Heart,
  HeartOff,
  Settings,
  Sparkles,
  Info,
  Camera,
  Compass,
  Gauge,
  Clock,
  Calendar,
  ArrowUpRight,
  Activity,
  Car,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Droplets,
  Eye,
  Thermometer,
  Layers,
  ChevronRight,
  TrendingUp,
  MapPin,
  Maximize,
  Minimize,
  Linkedin
} from "lucide-react";

// Default location set to Kolkata, India to match the dashboard mockup instantly on load
const DEFAULT_LOCATION: LocationData = {
  name: "Kolkata",
  country: "India",
  admin1: "West Bengal",
  lat: 22.5726,
  lon: 88.3639
};

const WALLPAPERS = [
  {
    id: "dynamic",
    name: "Dynamic Atmosphere",
    desc: "Real-time 3D weather simulation based on real weather codes",
    url: "dynamic",
    thumbnail: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=120&auto=format&fit=crop&q=60"
  },
  {
    id: "cherry_blossom",
    name: "Cherry Blossom",
    desc: "Whimsical pink sakura canopy framing a scenic spring sky",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/Cherry%20Blossom%20Wallpaper.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/Cherry%20Blossom%20Wallpaper.jpeg"
  },
  {
    id: "romantic_dream",
    name: "Romantic Dream",
    desc: "A soft, pastel-hued dreamscape featuring an adorable couple",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/Romantic%20Couple%20Wallpaper%20Cute.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/Romantic%20Couple%20Wallpaper%20Cute.jpeg"
  },
  {
    id: "serene_meadow",
    name: "Serene Meadow",
    desc: "A sunlit path winding through a gorgeous floral paradise",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2826%29.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2826%29.jpeg"
  },
  {
    id: "sunset_shore",
    name: "Sunset Shore",
    desc: "A brilliant pastel oceanfront reflecting gorgeous golden-pink rays",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2827%29.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2827%29.jpeg"
  },
  {
    id: "twilight_castle",
    name: "Twilight Castle",
    desc: "A majestic fantasy palace nestled within deep starry skies",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2828%29.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2828%29.jpeg"
  },
  {
    id: "ethereal_heavens",
    name: "Ethereal Heavens",
    desc: "Dazzling cosmic arrays, shooting stars, and radiant pastel nebulae",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2829%29.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2829%29.jpeg"
  },
  {
    id: "cozy_cabin",
    name: "Cozy Study Cabin",
    desc: "A warm window view of a rainy evening inside a cozy study",
    url: "https://raw.githubusercontent.com/jkbharti159/Images/main/creator%20%40%20remziiiya.jpeg",
    thumbnail: "https://raw.githubusercontent.com/jkbharti159/Images/main/creator%20%40%20remziiiya.jpeg"
  }
];

export default function App() {
  // 1. Core States
  const [currentLoc, setCurrentLoc] = useState<LocationData>(DEFAULT_LOCATION);
  const [weatherData, setWeatherData] = useState<FullWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Location Intelligence States
  const [centralLocation, setCentralLocation] = useState<CentralLocationState | null>(null);
  const [savedPreferredLocation, setSavedPreferredLocation] = useState<CentralLocationState | null>(() => {
    const saved = localStorage.getItem("skysense_saved_user_location");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [initStepText, setInitStepText] = useState<string>("");
  const [isInitializingLocation, setIsInitializingLocation] = useState<boolean>(true);

  // Search input and autocomplete suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);

  // Active navigation section page
  const [activeNav, setActiveNav] = useState<"weather" | "aqi" | "climate" | "planner" | "radar" | "compare">("weather");

  // Wide View Toggle State (saved in localStorage)
  const [isWideView, setIsWideView] = useState<boolean>(() => {
    return localStorage.getItem("skysense_wideview") === "true";
  });

  // Sync wideview preference
  useEffect(() => {
    localStorage.setItem("skysense_wideview", isWideView ? "true" : "false");
  }, [isWideView]);

  // Right column switcher tab (Hourly Forecast Timeline vs 10-Day Meteorological list)
  const [forecastTab, setForecastTab] = useState<"hourly" | "daily">("hourly");

  // Current ticking time
  const [currentTime, setCurrentTime] = useState(new Date());

  // User preferences (local storage sync)
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("skysense_prefs");
    const defaultBgImage = "https://raw.githubusercontent.com/jkbharti159/Images/main/_%20%287%29%20%2826%29.jpeg";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let bg = (parsed.bgImage === "dynamic" || !parsed.bgImage) ? defaultBgImage : parsed.bgImage;
        if (typeof bg === "string") {
          bg = bg.replace(/\(/g, "%28").replace(/\)/g, "%29");
        }
        return {
          tempUnit: "C",
          windUnit: "kmh",
          graphicsMode: "high",
          ...parsed,
          bgImage: bg,
          bgBlur: 0,
          bgDim: 0
        };
      } catch (e) {}
    }
    return {
      tempUnit: "C",
      windUnit: "kmh",
      graphicsMode: "high",
      bgImage: defaultBgImage,
      bgBlur: 0,
      bgDim: 0
    };
  });

  // Favorite locations list
  const [favorites, setFavorites] = useState<LocationData[]>(() => {
    const saved = localStorage.getItem("skysense_favorites");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      DEFAULT_LOCATION,
      { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
      { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
      { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 }
    ];
  });

  // UI toggles
  const [showSettings, setShowSettings] = useState(false);
  const [expandedDayIdx, setExpandedDayIdx] = useState<number | null>(null);
  const [geolocationLoading, setGeolocationLoading] = useState(false);
  const [forecastMode, setForecastMode] = useState<"dashboard" | "monthly">("dashboard");

  // Live ticking clock sync
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync preferences and favorites
  useEffect(() => {
    localStorage.setItem("skysense_prefs", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem("skysense_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Core weather retriever with optional central source state tracking
  const fetchWeather = async (loc: LocationData, sourceUpdate?: Partial<CentralLocationState>) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = `/api/weather/full?lat=${loc.lat}&lon=${loc.lon}&name=${encodeURIComponent(loc.name)}&country=${encodeURIComponent(loc.country)}${loc.admin1 ? `&admin1=${encodeURIComponent(loc.admin1)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Meteorological servers are currently unreachable.");
      const data = await res.json();
      setWeatherData(data);
      setCurrentLoc(loc);
      
      // Keep Central Location State synchronized
      setCentralLocation(prev => {
        const nextSource = sourceUpdate?.source || prev?.source || "search";
        const nextAccuracy = sourceUpdate?.accuracy || prev?.accuracy || "precise";
        const isUserSelected = nextSource !== "ip" && nextSource !== "fallback";
        return {
          city: loc.name,
          region: loc.admin1 || "",
          country: loc.country,
          latitude: loc.lat,
          longitude: loc.lon,
          timezone: data.location?.timezone || data.timezone || "UTC",
          source: nextSource,
          accuracy: nextAccuracy,
          isUserSelected
        };
      });
    } catch (e) {
      console.error("Failed to query meteorological service:", e);
      setErrorMsg("Atmosphere grid servers experienced a timeout. Displaying fallback cached data.");
    } finally {
      setLoading(false);
    }
  };

  // Personalized Greeting builder based on detected time-of-day
  const getPersonalizedWelcome = () => {
    let hour = new Date().getHours();
    
    if (weatherData && weatherData.current?.timestamp) {
      try {
        hour = new Date(weatherData.current.timestamp).getHours();
      } catch (e) {}
    }
    
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = "Good evening";
    } else if (hour >= 21 || hour < 4) {
      timeGreeting = "Good night";
    }
    
    const displayName = "Jitendra";
    return `${timeGreeting}, ${displayName}!`;
  };

  // Central Automatic Location Initialization Sequence
  useEffect(() => {
    async function initializeLocationSystem() {
      setIsInitializingLocation(true);
      
      // Step 1: Check user-selected saved location preference
      if (savedPreferredLocation) {
        setInitStepText("Loading saved location preference...");
        setCentralLocation(savedPreferredLocation);
        
        const loc: LocationData = {
          name: savedPreferredLocation.city,
          country: savedPreferredLocation.country,
          admin1: savedPreferredLocation.region,
          lat: savedPreferredLocation.latitude,
          lon: savedPreferredLocation.longitude
        };
        
        setInitStepText("Initializing local weather intelligence...");
        await fetchWeather(loc, { source: "saved", accuracy: "precise" });
        setIsInitializingLocation(false);
        return;
      }

      // Step 2: No saved location, query approximate IP-based geolocation
      setInitStepText("Detecting your approximate location...");

      try {
        const res = await fetch("/api/location/detect");
        if (!res.ok) throw new Error("Network detection failed");
        const detected = await res.json();
        
        setInitStepText("Initializing local weather intelligence...");
        setCentralLocation(detected);
        
        const loc: LocationData = {
          name: detected.city,
          country: detected.country,
          admin1: detected.region,
          lat: detected.latitude,
          lon: detected.longitude
        };
        
        await fetchWeather(loc, { source: "ip", accuracy: "approximate" });
      } catch (err) {
        console.error("IP Geolocation initialization failed:", err);
        
        setInitStepText("Unable to detect location automatically.");
        
        const fallback: CentralLocationState = {
          city: "Kolkata",
          region: "West Bengal",
          country: "India",
          latitude: 22.5726,
          longitude: 88.3639,
          timezone: "Asia/Kolkata",
          source: "fallback",
          accuracy: "approximate",
          isUserSelected: false
        };
        
        setCentralLocation(fallback);
        await fetchWeather(DEFAULT_LOCATION, { source: "fallback", accuracy: "approximate" });
      } finally {
        setIsInitializingLocation(false);
      }
    }

    initializeLocationSystem();
  }, []);

  // Search input geocoding handlers
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Autocomplete query failed:", e);
    } finally {
      setSearching(false);
    }
  };

  // GPS handler
  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("GPS positioning services are not supported by your browser.");
      return;
    }
    setGeolocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`/api/geocoding/reverse?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const loc: LocationData = await res.json();
            fetchWeather(loc, { source: "gps", accuracy: "precise" });
          } else {
            fetchWeather({ name: "GPS Coordinate", country: "Current Position", lat, lon }, { source: "gps", accuracy: "precise" });
          }
        } catch (err) {
          fetchWeather({ name: "GPS Coordinate", country: "Current Position", lat, lon }, { source: "gps", accuracy: "precise" });
        } finally {
          setGeolocationLoading(false);
        }
      },
      (err) => {
        setGeolocationLoading(false);
        setErrorMsg("GPS permission denied or timeout occurred. Displaying base coordinates.");
      },
      { timeout: 10000 }
    );
  };

  // Check and toggle favorite state
  const isFavorite = favorites.some(
    (f) => Math.abs(f.lat - currentLoc.lat) < 0.01 && Math.abs(f.lon - currentLoc.lon) < 0.01
  );

  const toggleFavorite = () => {
    if (isFavorite) {
      setFavorites(
        favorites.filter(
          (f) => !(Math.abs(f.lat - currentLoc.lat) < 0.01 && Math.abs(f.lon - currentLoc.lon) < 0.01)
        )
      );
    } else {
      setFavorites([...favorites, currentLoc]);
    }
  };

  // Set active page directly
  const scrollToSection = (sectionId: string, navName: "weather" | "aqi" | "climate" | "planner" | "radar" | "compare") => {
    setActiveNav(navName);
  };

  // Unit converters
  const convertTemp = (c: number) => {
    if (preferences.tempUnit === "F") {
      return Math.round((c * 9) / 5 + 32);
    }
    return Math.round(c);
  };

  const convertWind = (k: number) => {
    if (preferences.windUnit === "mph") {
      return Math.round(k * 0.621371);
    }
    return Math.round(k);
  };

  // Weather WMO icons selector
  const getWeatherIcon = (code: number, size = 20, className = "") => {
    if (code === 0) return <Sun size={size} className={`text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] ${className}`} />;
    if (code >= 1 && code <= 3) return <CloudSun size={size} className={`text-slate-200 ${className}`} />;
    if (code === 45 || code === 48) return <CloudFog size={size} className={`text-zinc-300 ${className}`} />;
    if (code >= 51 && code <= 57) return <Droplets size={size} className={`text-sky-300 ${className}`} />;
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} className={`text-sky-400 animate-pulse ${className}`} />;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow size={size} className={`text-white ${className}`} />;
    if (code >= 95) return <CloudLightning size={size} className={`text-indigo-400 animate-bounce ${className}`} />;
    return <Cloud size={size} className={`text-slate-300 ${className}`} />;
  };

  // AQI dynamic coloring
  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return { label: "Excellent", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (aqi <= 100) return { label: "Good", text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" };
    if (aqi <= 150) return { label: "Moderate", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    return { label: "Unhealthy", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  };

  const aqiStyle = weatherData ? getAqiColor(weatherData.airQuality.aqi) : { label: "Good", text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" };

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      {/* Custom Selected Wallpaper Background or Dynamic 3D Environment */}
      {activeNav === "aqi" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: `url("https://raw.githubusercontent.com/jkbharti159/Images/main/_%20(8)%20(1)%20(1)%20(1).jpeg")`,
          }}
        />
      ) : activeNav === "climate" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out opacity-100"
          style={{ 
            backgroundImage: `url("https://raw.githubusercontent.com/jkbharti159/Images/main/_%20Photo.jpeg")`,
          }}
        />
      ) : activeNav === "planner" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: `url("https://raw.githubusercontent.com/jkbharti159/Images/main/_%20(8)%20(2).jpeg")`,
          }}
        />
      ) : activeNav === "radar" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: `url("https://raw.githubusercontent.com/jkbharti159/Images/main/The%20Contemporary%20%E2%80%94%20Independent%20Journalism%20on%20Politics%2C%20Science%20%26%20Technology.jpeg")`,
          }}
        />
      ) : activeNav === "compare" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: `url("https://raw.githubusercontent.com/jkbharti159/Images/main/_%20(8)%20(3).jpeg")`,
          }}
        />
      ) : preferences.bgImage && preferences.bgImage !== "dynamic" && activeNav === "weather" ? (
        <div 
          className="fixed inset-0 w-full h-full -z-10 bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: `url("${preferences.bgImage}")`,
          }}
        >
          {/* Blur & Dim overlays */}
          <div 
            className="absolute inset-0 w-full h-full transition-all duration-500 ease-in-out"
            style={{
              backdropFilter: `blur(${preferences.bgBlur ?? 0}px)`,
              WebkitBackdropFilter: `blur(${preferences.bgBlur ?? 0}px)`,
              backgroundColor: `rgba(2, 6, 23, ${(preferences.bgDim ?? 0) / 100})`,
            }}
          />
        </div>
      ) : (
        <Weather3DBackground
          conditionCode={weatherData?.current.conditionCode || 0}
          isDay={weatherData ? (new Date(weatherData.current.timestamp).getHours() > 6 && new Date(weatherData.current.timestamp).getHours() < 19) : true}
          windSpeed={weatherData?.current.windSpeed || 10}
          clouds={weatherData?.current.clouds || 20}
          temp={weatherData?.current.temp || 20}
          graphicsMode={preferences.graphicsMode}
        />
      )}

      {/* TOP PREMIUM NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 backdrop-blur-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => fetchWeather(DEFAULT_LOCATION)}>
            <img 
              src="https://github.com/jkbharti159/Images/raw/main/ChatGPT%20Image%20Jul%2018%2C%202026%2C%2011_47_53%20PM.png" 
              alt="SkySense Logo" 
              className="w-10 h-10 object-contain rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-white/10 bg-slate-900/50"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-lg font-black tracking-tighter text-white bg-clip-text">SkySense</span>
            </div>
          </div>

          {/* Search, Unit Select, Settings controls */}
          <div className="flex items-center gap-2 flex-grow max-w-2xl justify-end">
            
            {/* Live Autocomplete Search Input */}
            <div className="relative w-full">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search city (e.g. Kolkata)..."
                  className="w-full bg-slate-950/70 text-xs text-white border border-white/15 rounded-xl pl-8.5 pr-8 py-2 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
                />
                <button
                  onClick={handleGPSLocation}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white p-1 rounded-md bg-slate-900 border border-white/5 hover:bg-slate-800 transition-all"
                  title="Detect GPS"
                >
                  <Navigation size={10} className={geolocationLoading ? "animate-pulse" : ""} />
                </button>
              </div>

              {/* Suggestions List Box */}
              {suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-950 border border-white/10 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/5 animate-fade-in">
                  {suggestions.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery("");
                        setSuggestions([]);
                        fetchWeather(loc, { source: "search", accuracy: "precise" });
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition-all flex flex-col"
                    >
                      <span className="font-semibold text-white">{loc.name}</span>
                      <span className="text-[10px] text-slate-400">{loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Favorite toggle */}
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                isFavorite 
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25" 
                  : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite ? <Heart size={14} fill="currentColor" /> : <HeartOff size={14} />}
            </button>

            {/* Wide Screen View layout toggle */}
            <button
              onClick={() => setIsWideView(!isWideView)}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                isWideView 
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                  : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white"
              }`}
              title={isWideView ? "Standard Layout" : "Wide Screen / Full Screen Layout"}
            >
              <Maximize size={14} />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-950/40 border border-white/10 text-slate-400 hover:text-white rounded-xl shrink-0 transition-all"
              title="Weather Settings"
            >
              <Settings size={14} className={showSettings ? "rotate-90 text-indigo-400" : ""} />
            </button>
          </div>
        </div>
      </header>



      {/* SETTINGS DRAWER OVERLAY */}
      {showSettings && (
        <div className={`mx-auto px-4 md:px-6 mt-4 transition-all duration-500 ease-in-out ${isWideView ? "max-w-full lg:px-10" : "max-w-7xl"}`}>
          <div className="p-5 bg-slate-900/90 border border-indigo-500/25 rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              <X size={14} />
            </button>
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 mb-2.5">Temperature Standard</h4>
              <div className="flex gap-2 p-1 bg-slate-950/60 rounded-lg border border-white/5">
                <button
                  onClick={() => setPreferences({ ...preferences, tempUnit: "C" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.tempUnit === "C" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Celsius (°C)
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, tempUnit: "F" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.tempUnit === "F" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 mb-2.5">Wind Velocity Scale</h4>
              <div className="flex gap-2 p-1 bg-slate-950/60 rounded-lg border border-white/5">
                <button
                  onClick={() => setPreferences({ ...preferences, windUnit: "kmh" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.windUnit === "kmh" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Metric (km/h)
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, windUnit: "mph" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.windUnit === "mph" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Imperial (mph)
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 mb-2.5">Atmospheric Rendering</h4>
              <div className="flex gap-2 p-1 bg-slate-950/60 rounded-lg border border-white/5 mb-4">
                <button
                  onClick={() => setPreferences({ ...preferences, graphicsMode: "high" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.graphicsMode === "high" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  3D WebGL (High)
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, graphicsMode: "perf" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    preferences.graphicsMode === "perf" ? "bg-indigo-600 text-white border border-white/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2D Overlay (Low)
                </button>
              </div>

              {/* Blur & Dim controls if a wallpaper is active */}
              {preferences.bgImage && preferences.bgImage !== "dynamic" && (
                <div className="space-y-3 p-3 bg-slate-950/40 rounded-xl border border-white/5 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-400">Background Blur</span>
                      <span className="text-indigo-300 font-bold">{preferences.bgBlur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="1"
                      value={preferences.bgBlur ?? 0}
                      onChange={(e) => setPreferences({ ...preferences, bgBlur: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-400">Background Dimming</span>
                      <span className="text-indigo-300 font-bold">{preferences.bgDim ?? 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={preferences.bgDim ?? 0}
                      onChange={(e) => setPreferences({ ...preferences, bgDim: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FULL WIDTH COLUMN SPAN 3 FOR WALLPAPERS */}
            <div className="md:col-span-3 border-t border-white/5 pt-4">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400 animate-pulse" /> Custom Background Wallpapers
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {WALLPAPERS.map((wall) => {
                  const isActive = preferences.bgImage === wall.url;
                  return (
                    <button
                      key={wall.id}
                      onClick={() => setPreferences({ ...preferences, bgImage: wall.url })}
                      className={`relative aspect-video lg:h-16 w-full rounded-xl overflow-hidden border transition-all duration-300 group ${
                        isActive
                          ? "border-indigo-500 ring-2 ring-indigo-500/40 scale-95 shadow-lg"
                          : "border-white/10 hover:border-white/30 hover:scale-[1.02] shadow-sm"
                      }`}
                      title={wall.desc}
                    >
                      {/* Thumbnail or abstract icon for dynamic */}
                      {wall.id === "dynamic" ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
                          <Compass size={14} className="text-indigo-400 animate-spin-slow mb-0.5" />
                          <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-tighter">Real-time</span>
                        </div>
                      ) : (
                        <img
                          src={wall.thumbnail}
                          alt={wall.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {/* Hover Overlay info */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                        <span className="text-[9px] font-black text-white leading-tight">{wall.name}</span>
                      </div>

                      {/* Active badge */}
                      {isActive && (
                        <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5 shadow">
                          <Check size={8} strokeWidth={4} />
                        </div>
                      )}

                      {/* Bottom Name Plate */}
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/60 backdrop-blur-xs py-0.5 px-1.5 text-left flex justify-between items-center">
                        <span className="text-[8px] font-bold text-slate-300 truncate max-w-[80%]">{wall.name}</span>
                        {isActive && <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER PLATFORM STAGE */}
      <div className={`flex-grow w-full mx-auto px-4 md:px-6 pt-6 z-10 relative transition-all duration-500 ease-in-out ${isWideView ? "max-w-full lg:px-10" : "max-w-7xl"}`}>
        
        {isInitializingLocation ? (
          <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-3xl border border-white/10 min-h-[500px] shadow-2xl relative overflow-hidden max-w-2xl mx-auto my-12 animate-fade-in text-center">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full filter blur-3xl -z-10" />
            
            <div className="relative mb-6 select-none">
              <img 
                src="https://raw.githubusercontent.com/jkbharti159/Images/main/ChatGPT%20Image%20Jul%2018%2C%202026%2C%2011_47_53%20PM.png" 
                alt="Location Intelligence Sync Logo" 
                className="h-28 w-28 object-contain mx-auto drop-shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Location Intelligence Sync</h2>
            <p className="text-sm font-semibold text-slate-400 font-mono mb-8 h-6 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              {initStepText}
            </p>
            
            <div className="w-48 bg-slate-950/60 rounded-full h-1 border border-white/5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-teal-400 h-1 rounded-full transition-all duration-500" 
                style={{ 
                  width: initStepText.includes("saved") ? "25%" : 
                         initStepText.includes("Detecting") ? "50%" : 
                         initStepText.includes("weather") ? "75%" : "100%" 
                }} 
              />
            </div>
          </div>
        ) : loading ? (
          /* Meteorological loading skeleton card */
          <div className="flex flex-col items-center justify-center py-32 glass-panel rounded-3xl border border-white/10 min-h-[450px] shadow-2xl animate-pulse">
            <Compass className="h-16 w-16 text-indigo-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Syncing SkySense Meteorological Grids...</h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider">Retrieving real-time wind indices and atmospheric calculations</p>
          </div>
        ) : errorMsg && !weatherData ? (
          /* Error feedback panel */
          <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-3xl border border-rose-500/20 text-center max-w-xl mx-auto shadow-2xl">
            <AlertTriangle className="h-12 w-12 text-rose-400 mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Atmospheric Link Failure</h2>
            <p className="text-xs text-slate-400 leading-relaxed px-6 mb-6">
              {errorMsg}
            </p>
            <button
              onClick={() => fetchWeather(currentLoc)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
            >
              <RotateCcw size={14} /> Retry Telemetry Handshake
            </button>
          </div>
        ) : weatherData ? (
          /* HIGH VALUE WEATHER INTELLIGENCE PORTAL */
          <main className="space-y-6">

            {/* Subtle Personalized Greeting Banner */}
            {weatherData && (
              <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl animate-fade-in text-xs font-mono text-slate-300 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-white tracking-wide">{getPersonalizedWelcome()}</span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Location source: <span className="text-indigo-300 font-extrabold uppercase">{centralLocation?.source === 'saved' ? "Saved Preference" : centralLocation?.source === 'gps' ? "Browser GPS" : centralLocation?.source === "ip" ? "Estimated IP Location" : "Fallback Coordinates"}</span>
                  </span>
                </div>
                {centralLocation && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    <span>Lat: <span className="text-slate-200 font-bold">{centralLocation.latitude.toFixed(3)}</span></span>
                    <span>Lon: <span className="text-slate-200 font-bold">{centralLocation.longitude.toFixed(3)}</span></span>
                    <span>TZ: <span className="text-slate-200 font-bold">{centralLocation.timezone}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* QUICK ALERTS CARDS BANNER */}
            {weatherData.intelligence.alerts.filter(alert => !alert.title.toLowerCase().includes("precipitation") && !alert.title.toLowerCase().includes("approaching")).length > 0 && (
              <div className="space-y-2 animate-bounce-short">
                {weatherData.intelligence.alerts
                  .filter(alert => !alert.title.toLowerCase().includes("precipitation") && !alert.title.toLowerCase().includes("approaching"))
                  .map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border flex gap-3 items-start ${
                      alert.type === "danger"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                        : alert.type === "warning"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-200"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide">{alert.title}</h4>
                      <p className="text-xs mt-1 text-slate-300 leading-relaxed font-medium">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}            {/* SUB-TAB PAGE SWITCHER FOR SEPARATE PAGES */}
            <div className="flex flex-wrap items-center justify-start gap-1.5 p-1 bg-slate-950/40 border border-white/5 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveNav("weather")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "weather"
                    ? "bg-indigo-600 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sun size={13} /> Live Weather
              </button>
              <button
                onClick={() => setActiveNav("aqi")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "aqi"
                    ? "bg-teal-600 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wind size={13} /> AQI
              </button>
              <button
                onClick={() => setActiveNav("climate")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "climate"
                    ? "bg-emerald-600 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Compass size={13} /> Climate Change
              </button>
              <div className="hidden sm:block h-6 w-[1px] bg-white/10 mx-1 shrink-0" />
              <button
                onClick={() => setActiveNav("planner")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "planner"
                    ? "bg-indigo-500/80 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles size={13} /> AI Weather Planner
              </button>
              <button
                onClick={() => setActiveNav("radar")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "radar"
                    ? "bg-indigo-500/80 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Compass size={13} /> Meteorological Radar
              </button>
              <button
                onClick={() => setActiveNav("compare")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeNav === "compare"
                    ? "bg-indigo-500/80 text-white shadow-lg border border-white/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers size={13} /> Compare Cities
              </button>
            </div>

            {/* DYNAMIC CONTENT STAGE BASED ON SUB-TAB */}
            {activeNav === "weather" && (
              <div id="weather-dashboard-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch scroll-mt-20">
                
                {/* LEFT COLUMN: CORE CURRENT CONDITIONS DETAILS (5 COLS) */}
                <section className="lg:col-span-5 flex flex-col justify-between gap-6">
                  
                  {/* Immersive Main Current Weather Display Card */}
                  <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden flex-1 min-h-[360px]">
                    
                    {/* Decorative glowing backdrops */}
                    <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full filter blur-3xl -z-10" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/5 rounded-full filter blur-2xl -z-10" />

                    {/* Header bar of card */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {centralLocation && (
                            <>
                              <span 
                                className={`text-[9px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wide border ${
                                  centralLocation.source === "saved"
                                    ? "bg-indigo-500/20 border-indigo-500/35 text-indigo-300"
                                    : centralLocation.source === "gps"
                                    ? "bg-teal-500/20 border-teal-500/35 text-teal-300"
                                    : centralLocation.source === "ip"
                                    ? "bg-sky-500/20 border-sky-500/35 text-sky-300"
                                    : centralLocation.source === "search"
                                    ? "bg-purple-500/20 border-purple-500/35 text-purple-300"
                                    : "bg-amber-500/20 border-amber-500/35 text-amber-300"
                                }`}
                                title={`Source: ${centralLocation.source}`}
                              >
                                {centralLocation.source === "saved" ? "Saved Preference" :
                                 centralLocation.source === "gps" ? "Browser GPS" :
                                 centralLocation.source === "ip" ? "Estimated IP Location" :
                                 centralLocation.source === "search" ? "Search Result" : "Fallback Coordinates"}
                              </span>
                              
                              <span 
                                className={`text-[9px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wide border ${
                                  centralLocation.accuracy === "precise"
                                    ? "bg-emerald-500/20 border-emerald-500/35 text-emerald-400"
                                    : "bg-amber-500/20 border-amber-500/35 text-amber-400"
                                }`}
                                title={`Accuracy: ${centralLocation.accuracy}`}
                              >
                                {centralLocation.accuracy === "precise" ? "Precise" : "Approximate"}
                              </span>
                            </>
                          )}
                          {isFavorite && (
                            <span className="text-[10px] px-2.5 py-1 bg-rose-500/20 border border-rose-500/25 rounded-md font-mono text-rose-400 font-bold uppercase">
                              FAVORITE
                            </span>
                          )}
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight mt-3 flex items-center gap-2">
                          {weatherData.location.name}
                        </h2>
                        <p className="text-xs text-slate-400 font-semibold tracking-wide mt-1">
                          {weatherData.location.admin1 ? `${weatherData.location.admin1}, ` : ""}{weatherData.location.country}
                        </p>

                        {/* Save Home Location preference */}
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              if (centralLocation) {
                                const isCurrentlySaved = savedPreferredLocation && savedPreferredLocation.city === centralLocation.city;
                                if (isCurrentlySaved) {
                                  localStorage.removeItem("skysense_saved_user_location");
                                  setSavedPreferredLocation(null);
                                } else {
                                  const savedState = { ...centralLocation, source: "saved" as const };
                                  localStorage.setItem("skysense_saved_user_location", JSON.stringify(savedState));
                                  setSavedPreferredLocation(savedState);
                                }
                              }
                            }}
                            className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold transition-all border ${
                              savedPreferredLocation && savedPreferredLocation.city === centralLocation?.city
                                ? "bg-amber-500/20 border-amber-500/35 text-amber-300 hover:bg-amber-500/30"
                                : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                            }`}
                          >
                            <MapPin size={10} />
                            {savedPreferredLocation && savedPreferredLocation.city === centralLocation?.city
                              ? "★ Default Home Location"
                              : "☆ Save as Default Home"}
                          </button>
                        </div>
                      </div>

                      {/* Meteorological WMO Status Badge */}
                      <div className="flex flex-col items-end">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner hover:scale-105 transition-all">
                          {getWeatherIcon(weatherData.current.conditionCode, 40)}
                        </div>
                        <span className="text-xs font-black text-indigo-300 mt-2 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                          {weatherData.current.conditionText}
                        </span>
                      </div>
                    </div>

                    {/* Gigantic visual temperature element */}
                    <div className="my-8 flex items-baseline gap-4">
                      <span className="text-7xl md:text-8xl font-black text-white tracking-tighter text-glow">
                        {convertTemp(weatherData.current.temp)}°
                      </span>
                      <div className="flex flex-col justify-end">
                        <span className="text-xs text-slate-400 font-medium">
                          Feels like <span className="font-extrabold text-white">{convertTemp(weatherData.current.feelsLike)}°</span>
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          High/Low <span className="font-extrabold text-white">{convertTemp(weatherData.daily[0].minTemp)}° – {convertTemp(weatherData.daily[0].maxTemp)}°</span>
                        </span>
                      </div>
                    </div>

                    {/* Integrated mini-alert or brief intelligence line */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-teal-500/10 border border-white/15">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold font-mono">
                          <Sparkles size={11} className="animate-pulse text-indigo-400" />
                          Atmospheric Vibe Check
                        </div>
                        {weatherData.intelligence.isFallback && (
                          <span 
                            className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-400 uppercase font-mono tracking-wider cursor-help"
                            title={
                              weatherData.intelligence.fallbackReason === "quota_exceeded"
                                ? "Gemini API Quota Exceeded (429). Displaying high-precision deterministic backup summary."
                                : "Gemini API is not configured. Displaying local offline summary."
                            }
                          >
                            Backup Model
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                        {weatherData.intelligence.generalSummary}
                      </p>
                    </div>
                  </div>

                  {/* Grid of 6 advanced meteorological sensor cards */}
                  <WeatherParametersGrid 
                    current={weatherData.current} 
                    locationName={weatherData.location.name} 
                    preferences={preferences} 
                  />

                </section>

                {/* RIGHT COLUMN: INTERACTIVE FORECAST CAROUSEL & MONTHLY VIEW (7 COLS) */}
                <section className="lg:col-span-7 flex flex-col gap-6 justify-between">
                  {forecastMode === "monthly" ? (
                    <MonthlyForecastView
                      locationName={weatherData.location.name}
                      preferences={preferences}
                      onClose={() => setForecastMode("dashboard")}
                    />
                  ) : (
                    <ForecastCarousel
                      daily={weatherData.daily}
                      hourly={weatherData.hourly}
                      locationName={weatherData.location.name}
                      preferences={preferences}
                      onSeeMonthlyClick={() => setForecastMode("monthly")}
                    />
                  )}
                </section>

              </div>
            )}

            {activeNav === "aqi" && (
              <div id="air-quality-dashboard-view" className="scroll-mt-20 animate-fade-in">
                <AirQualityDashboard
                  aqi={weatherData.airQuality}
                  location={currentLoc}
                  hourly={weatherData.hourly}
                  onSelectLocation={fetchWeather}
                />
              </div>
            )}

            {activeNav === "climate" && (
              <div id="weather-dashboard-view" className="scroll-mt-20 animate-fade-in">
                <ClimateTrendsView
                  lat={currentLoc.lat}
                  lon={currentLoc.lon}
                  locationName={currentLoc.name}
                  preferences={preferences}
                />
              </div>
            )}

            {/* FULL WIDTH: AI PLANNING RECOMMENDATIONS VIEW PORT */}
            {activeNav === "planner" && (
              <section id="ai-planning-view" className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6 scroll-mt-20 animate-fade-in">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-400 animate-pulse" />
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">AI Weather Intelligence & Daily Planner</h3>
                    <p className="text-xs text-slate-400">Gemini-model generated hourly recommendations & fitness indices</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold bg-indigo-500 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  POWERED BY GEMINI AI
                </span>
              </div>

              {/* Interactive Multi-Activity Planning System */}
              <AIWeatherPlanner weatherData={weatherData} />

              {/* Core Segment Recommendations Header */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300">Default Daily Segment Insights</h4>
              </div>

              {/* Day Segment Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(weatherData.intelligence.plan) as Array<keyof typeof weatherData.intelligence.plan>).map((period) => {
                  const details = weatherData.intelligence.plan[period];
                  const labelMap = { morning: "Morning Segment", afternoon: "Afternoon Segment", evening: "Evening Segment", night: "Night Segment" };
                  const timeLabelMap = { morning: "08:00 AM", afternoon: "02:00 PM", evening: "07:00 PM", night: "11:00 PM" };
                  
                  return (
                    <div key={period} className="bg-slate-950/25 border border-indigo-500/10 hover:border-indigo-500/20 rounded-2xl p-4 flex flex-col justify-between transition-all">
                      <div>
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                          <span className="text-xs font-black text-indigo-300 uppercase tracking-wider">{labelMap[period]}</span>
                          <span className="text-[9px] text-slate-500 font-mono font-bold">{timeLabelMap[period]}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          {getWeatherIcon(period === "morning" ? 1 : period === "afternoon" ? 2 : period === "evening" ? 80 : 0, 24)}
                          <span className="text-lg font-black text-white">{convertTemp(details.temp)}°</span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold ml-auto">Rain: {details.rainProb}%</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                          {details.recommendation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Five Day Score meters sub-grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-white/5">
                
                {/* Score bar meters */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-2">Atmospheric Activity Scores</h4>
                  
                  {/* Score meters list */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5"><Compass size={12} className="text-indigo-400" /> Outdoor activities</span>
                        <span className="font-mono font-bold text-indigo-400">{weatherData.intelligence.scores.outdoor}/100</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${weatherData.intelligence.scores.outdoor}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5"><Car size={12} className="text-teal-400" /> Commuting & Travel</span>
                        <span className="font-mono font-bold text-teal-400">{weatherData.intelligence.scores.travel}/100</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: `${weatherData.intelligence.scores.travel}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5"><Camera size={12} className="text-pink-400" /> Photography potential</span>
                        <span className="font-mono font-bold text-pink-400">{weatherData.intelligence.scores.photography}/100</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-pink-400 h-1.5 rounded-full" style={{ width: `${weatherData.intelligence.scores.photography}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Golden/Blue photo hours */}
                <div className="lg:col-span-7 bg-slate-950/25 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black font-mono uppercase tracking-wider text-pink-300 mb-3 flex items-center gap-1.5">
                      <Camera size={12} /> Photographer's Light Timing Guide
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-400">
                      <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block">GOLDEN AM</span>
                        <span className="text-slate-200 font-bold">{weatherData.intelligence.photographyDetails.goldenHourMorning}</span>
                      </div>
                      <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block">GOLDEN PM</span>
                        <span className="text-slate-200 font-bold">{weatherData.intelligence.photographyDetails.goldenHourEvening}</span>
                      </div>
                      <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block">BLUE AM</span>
                        <span className="text-slate-200 font-bold">{weatherData.intelligence.photographyDetails.blueHourMorning}</span>
                      </div>
                      <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 block">BLUE PM</span>
                        <span className="text-slate-200 font-bold">{weatherData.intelligence.photographyDetails.blueHourEvening}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed italic mt-3 border-t border-white/5 pt-3">
                    💡 <span className="font-semibold text-pink-300">Tips:</span> {weatherData.intelligence.photographyDetails.tips[0]}
                  </p>
                </div>

              </div>

              </section>
            )}

            {/* FULL WIDTH: INTERACTIVE MAP & CARTOGRAPHY RADAR VIEW PORT */}
            {activeNav === "radar" && (
              <section id="meteorological-radar-view" className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl scroll-mt-20 animate-fade-in space-y-4">
                <div className="flex justify-between items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Compass size={20} className="text-indigo-400 animate-spin-slow" />
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Doppler Meteorological Radar Monitoring</h3>
                      <p className="text-xs text-slate-400">Tactical reflectivity levels, convective cell track vectors, and real-time short-term nowcasting</p>
                    </div>
                  </div>
                </div>

                <MeteorologicalRadar weatherData={weatherData} />
              </section>
            )}

            {/* FULL WIDTH: WEATHER COMPARISON MATRIX SECTION */}
            {activeNav === "compare" && (
              <section id="comparative-matrix-view" className="scroll-mt-20 animate-fade-in">
                <WeatherComparison
                  currentWeatherData={weatherData}
                  tempUnit={preferences.tempUnit}
                  windUnit={preferences.windUnit}
                />
              </section>
            )}

            {/* ADDITIONAL WEATHER DETAILS FOR WEATHER PAGE */}
            {activeNav === "weather" && (
              <>
                {/* FULL WIDTH: LOCAL MICRO-CLIMATE LOCATIONS TABLE */}
                <section id="local-locations-view" className="scroll-mt-20">
                  <LocationsConditionTable
                    locationName={weatherData.location.name}
                    baseWeather={weatherData.current}
                    preferences={preferences}
                  />
                </section>

                {/* FULL WIDTH: METEOROLOGICAL EXTREME RANKINGS */}
                <section id="extreme-rankings-view" className="scroll-mt-20">
                  <ExtremeRankingsTable
                    locationName={weatherData.location.name}
                    preferences={preferences}
                  />
                </section>

                {/* FULL WIDTH: METEOROLOGICAL FAQ ACCORDION */}
                <section id="faqs-view" className="scroll-mt-20">
                  <WeatherFAQs />
                </section>

                {/* FULL WIDTH: RECENT METEOROLOGICAL BLOGS & STATION INTEGRATION */}
                <section id="blogs-station-view" className="scroll-mt-20">
                  <BlogsAndStation />
                </section>
              </>
            )}

          </main>
        ) : (
          /* Safeguard empty stage */
          <div className="flex flex-col items-center justify-center py-24 text-center text-slate-500 font-mono">
            No meteorological streams active. Use search above to select coordinates.
          </div>
        )}
      </div>

      {/* DEVELOPER CREDIT FOOTER ROW - Full-width layout edge-to-edge with centered contents */}
      <footer className="mt-16 relative z-10 w-full border-t border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col items-center justify-center gap-4 text-slate-400 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3 justify-center">
              <img 
                src="https://github.com/jkbharti159.png" 
                alt="Jitendra Bharti" 
                className="w-10 h-10 rounded-full border-2 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.4)] object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60";
                }}
              />
              <span className="text-xs font-medium text-slate-200">
                Created By <span className="text-white font-extrabold hover:text-indigo-300 transition-colors">Jitendra Bharti</span>
              </span>
            </div>

            <span className="hidden sm:inline-block w-px h-5 bg-white/15" />

            {/* LinkedIn Link */}
            <a 
              href="https://www.linkedin.com/in/jkbharti159/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-xs font-semibold text-indigo-200 hover:text-white border border-indigo-500/30 hover:border-indigo-500/50 transition-all shadow-lg group backdrop-blur-sm justify-center"
            >
              <Linkedin size={14} className="group-hover:scale-110 transition-transform text-indigo-300 group-hover:text-white" />
              <span>Connect on LinkedIn</span>
            </a>
          </div>

          <p className="text-[10px] font-mono tracking-wider text-slate-400/90 pt-1 w-full text-center">
            © {new Date().getFullYear()} SkySense • Real-Time Climatology
          </p>
        </div>
      </footer>
    </div>
  );
}
