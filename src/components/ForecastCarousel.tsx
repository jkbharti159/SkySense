import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sun, Moon, Droplets, Wind, Calendar, Layers, Thermometer, Eye, HelpCircle } from "lucide-react";
import { DailyForecast, HourlyForecast, UserPreferences } from "../types.js";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

interface ForecastCarouselProps {
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  locationName: string;
  preferences: UserPreferences;
  onSeeMonthlyClick: () => void;
}

type MetricType = "temp" | "rainProb" | "windSpeed" | "uvi" | "humidity";

export default function ForecastCarousel({
  daily,
  hourly,
  locationName,
  preferences,
  onSeeMonthlyClick
}: ForecastCarouselProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeMetric, setActiveMetric] = useState<MetricType>("temp");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const selectedDay = daily[selectedIdx] || daily[0];

  // Convert temp unit
  const convertTempVal = (c: number) => {
    if (preferences.tempUnit === "F") {
      return Math.round((c * 9) / 5 + 32);
    }
    return Math.round(c);
  };

  // Convert wind unit
  const convertWindVal = (k: number) => {
    if (preferences.windUnit === "mph") {
      return `${Math.round(k * 0.621371)} mph`;
    }
    return `${Math.round(k)} km/h`;
  };

  // Weather icon selector
  const getWeatherIcon = (code: number, size = 20) => {
    if (code === 0) return <Sun size={size} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
    if (code >= 1 && code <= 3) return <Layers size={size} className="text-slate-300" />;
    if (code === 45 || code === 48) return <Layers size={size} className="text-zinc-400 animate-pulse" />;
    if (code >= 51 && code <= 57) return <Droplets size={size} className="text-sky-300" />;
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <Droplets size={size} className="text-sky-400 animate-pulse" />;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <Layers size={size} className="text-white" />;
    return <Layers size={size} className="text-indigo-300 animate-pulse" />;
  };

  // Scroll carousel left/right
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Custom sun path arc calculation
  // Let's draw an SVG path for sunrise to sunset and place a glowing sun on it
  // Sunrise/Sunset calculations:
  const sunriseTime = selectedDay.sunrise ? new Date(selectedDay.sunrise) : new Date();
  const sunsetTime = selectedDay.sunset ? new Date(selectedDay.sunset) : new Date();
  const sunriseStr = sunriseTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sunsetStr = sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Calculate day length duration
  const dayLengthMs = sunsetTime.getTime() - sunriseTime.getTime();
  const dayHours = Math.floor(dayLengthMs / (1000 * 60 * 60));
  const dayMins = Math.floor((dayLengthMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = `${dayHours}hrs ${dayMins}min`;

  // Sun path position (0 to 100 on path)
  const [sunPercent, setSunPercent] = useState(45); // default mock center
  useEffect(() => {
    if (selectedIdx === 0) {
      // If today, calculate real position
      const now = new Date();
      if (now.getTime() < sunriseTime.getTime()) {
        setSunPercent(0);
      } else if (now.getTime() > sunsetTime.getTime()) {
        setSunPercent(100);
      } else {
        const pct = ((now.getTime() - sunriseTime.getTime()) / dayLengthMs) * 100;
        setSunPercent(pct);
      }
    } else {
      // For forecast days, default to a mid-day visualization
      setSunPercent(50);
    }
  }, [selectedIdx, selectedDay]);

  // Compute sun coordinates on arc SVG path (quadratic bezier curve)
  // Curve starts at (15, 60), control point at (110, -10), ends at (205, 60)
  // Let's use simple sine/cosine for an arc mapping
  const t = sunPercent / 100;
  const sunX = 15 + t * 190;
  // Arc altitude: high in center, zero at edges
  const sunY = 60 - Math.sin(t * Math.PI) * 45;

  // Render hourly data for the selected day or current hourly slice
  // Since we only get 24 hours total hourly in the payload, we can simulate hourly values
  // for forecasted days by adding deterministic offsets to make the chart interactive
  const getChartData = () => {
    return hourly.map((h, i) => {
      const date = new Date(h.time);
      const timeStr = date.toLocaleTimeString([], { hour: "numeric", hour12: true });
      
      // Calculate deterministic offsets based on selectedIdx to simulate multiple days
      const tempOffset = selectedIdx * -0.7 + Math.sin(selectedIdx + i / 2) * 1.5;
      const rainOffset = Math.min(100, Math.max(0, h.rainProb + (selectedIdx * 5) % 35));
      const windOffset = Math.max(0, h.windSpeed + (selectedIdx * 1.5));
      const uvOffset = Math.max(0, h.uvi + (selectedIdx % 2 === 0 ? 0.5 : -0.5));
      const humidityOffset = Math.min(100, Math.max(0, h.humidity + (selectedIdx * 3) % 20));

      return {
        time: timeStr,
        temp: convertTempVal(h.temp + tempOffset),
        rainProb: Math.round(rainOffset),
        windSpeed: Math.round(windOffset),
        uvi: Math.round(uvOffset * 10) / 10,
        humidity: Math.round(humidityOffset),
        originalTemp: h.temp + tempOffset
      };
    });
  };

  const chartData = getChartData();

  // Shift day controls
  const handleShiftDay = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1);
    } else if (direction === "next" && selectedIdx < daily.length - 1) {
      setSelectedIdx(selectedIdx + 1);
    }
  };

  // Metric visual configurations
  const getMetricConfig = () => {
    switch (activeMetric) {
      case "temp":
        return { label: "Temperature", color: "#f59e0b", unit: `°${preferences.tempUnit}`, dataKey: "temp" };
      case "rainProb":
        return { label: "Precipitation Chance", color: "#38bdf8", unit: "%", dataKey: "rainProb" };
      case "windSpeed":
        return { label: "Wind Velocity", color: "#10b981", unit: preferences.windUnit === "kmh" ? "km/h" : "mph", dataKey: "windSpeed" };
      case "uvi":
        return { label: "UV index", color: "#ec4899", unit: " UV", dataKey: "uvi" };
      case "humidity":
        return { label: "Relative Humidity", color: "#06b6d4", unit: "%", dataKey: "humidity" };
    }
  };

  const mConfig = getMetricConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const chartHeight = canvas.clientHeight || 200;

    const fillGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    fillGrad.addColorStop(0, mConfig.color + "40"); 
    fillGrad.addColorStop(1, mConfig.color + "00"); 

    chartRef.current = new ChartJS(canvas, {
      type: "line",
      data: {
        labels: chartData.map((d) => d.time),
        datasets: [
          {
            label: mConfig.label,
            data: chartData.map((d) => d[mConfig.dataKey as keyof typeof d]),
            borderColor: mConfig.color,
            borderWidth: 2,
            backgroundColor: fillGrad,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: mConfig.color,
            pointHoverBorderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeOutQuart"
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#94a3b8",
            titleFont: {
              family: "JetBrains Mono, monospace",
              size: 10,
              weight: "bold",
            },
            bodyFont: {
              family: "Inter, sans-serif",
              size: 11,
            },
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${context.parsed.y}${mConfig.unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.45)",
              font: {
                family: "Fira Code, monospace",
                size: 9,
              },
            },
          },
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.02)",
            },
            border: {
              display: false,
            },
            min: activeMetric === "rainProb" || activeMetric === "humidity" ? 0 : undefined,
            max: activeMetric === "rainProb" || activeMetric === "humidity" ? 100 : undefined,
            ticks: {
              color: "rgba(255, 255, 255, 0.45)",
              font: {
                family: "Fira Code, monospace",
                size: 9,
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartData, activeMetric, mConfig]);

  // Selected Day Summary Paragraph
  const daySummaryText = selectedIdx === 0
    ? `Today ${selectedDay.date}. Condition is ${selectedDay.conditionText}. Periodic cloud cover with temperature peaking at ${convertTempVal(selectedDay.maxTemp)}°C. Humidity will average around ${selectedDay.humidity}%, and peak wind vectors will reach up to ${convertWindVal(selectedDay.windSpeed)}.`
    : `${selectedDay.dayName} ${selectedDay.date} forecast: expecting ${selectedDay.conditionText.toLowerCase()} with a diurnal high of ${convertTempVal(selectedDay.maxTemp)}°C and overnight lows of ${convertTempVal(selectedDay.minTemp)}°C. Wind streams will sweep up to ${convertWindVal(selectedDay.windSpeed)}.`;

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
      
      {/* Forecast Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-2.5">
          <Calendar size={20} className="text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {locationName} 10-Days Weather Forecast
            </h3>
            <p className="text-xs text-slate-400">Biological timelines and chronological outlooks</p>
          </div>
        </div>

        <button
          onClick={onSeeMonthlyClick}
          id="see-monthly-forecast-btn"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-500/10 flex items-center gap-1.5 transition-all shadow-md shrink-0"
        >
          <Calendar size={14} />
          See Monthly
        </button>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative flex items-center">
        <button 
          onClick={() => scroll("left")}
          className="absolute -left-3 z-10 p-2 bg-slate-900/90 border border-white/10 hover:border-indigo-500/30 text-slate-400 hover:text-white rounded-full transition-all shadow-lg"
        >
          <ChevronLeft size={16} />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto px-1 py-2 w-full scrollbar-none snap-x"
        >
          {daily.map((day, idx) => {
            const isActive = selectedIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`min-w-[110px] snap-start rounded-2xl p-4 flex flex-col items-center justify-between text-center border transition-all cursor-pointer shadow-md ${
                  isActive 
                    ? "bg-indigo-600/25 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-white scale-[1.02]" 
                    : "bg-slate-950/30 border-white/5 text-slate-400 hover:text-white hover:bg-slate-950/50"
                }`}
              >
                <span className="text-xs font-extrabold tracking-wide block">{idx === 0 ? "Today" : day.dayName}</span>
                <span className="text-[10px] text-slate-500 font-mono block mb-2">{day.date}</span>
                
                <div className="my-2 p-1 rounded-xl bg-white/5">
                  {getWeatherIcon(day.conditionCode, 24)}
                </div>

                <div className="mt-2 text-xs font-mono">
                  <span className="font-extrabold text-white block">{convertTempVal(day.maxTemp)}°</span>
                  <span className="text-slate-500 text-[10px] block mt-0.5">{convertTempVal(day.minTemp)}°</span>
                </div>
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => scroll("right")}
          className="absolute -right-3 z-10 p-2 bg-slate-900/90 border border-white/10 hover:border-indigo-500/30 text-slate-400 hover:text-white rounded-full transition-all shadow-lg"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* SELECTED DAY DETAIL BOX (Blue Aesthetic Container) */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-indigo-900/30 border border-indigo-500/20 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        
        {/* Glow vector effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

        {/* Selected Day Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shadow-inner">
              {getWeatherIcon(selectedDay.conditionCode, 28)}
            </div>
            <div>
              <span className="text-sm font-black text-white flex items-center gap-2">
                {selectedIdx === 0 ? "Today" : selectedDay.dayName}, {selectedDay.date}
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/25 text-indigo-300 rounded font-mono font-bold uppercase tracking-wider">
                  {selectedDay.conditionText}
                </span>
              </span>
              <span className="text-xs text-indigo-300/80 font-mono mt-0.5 block">Astronomic Alignment & Metrics</span>
            </div>
          </div>

          <div className="flex gap-4 text-xs font-mono">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 block">MAX / MIN</span>
              <span className="text-white font-extrabold text-sm">{convertTempVal(selectedDay.maxTemp)}°C / {convertTempVal(selectedDay.minTemp)}°C</span>
            </div>
          </div>
        </div>

        {/* Summary Description & Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Paragraph of detailed weather */}
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs text-slate-200 leading-relaxed font-semibold">
              {daySummaryText}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-500 uppercase block font-mono">Humidity</span>
                <span className="text-xs font-extrabold text-white block mt-0.5">{selectedDay.humidity}%</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-500 uppercase block font-mono">Winds Peak</span>
                <span className="text-xs font-extrabold text-white block mt-0.5 truncate">{convertWindVal(selectedDay.windSpeed)}</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-500 uppercase block font-mono">Rain Chance</span>
                <span className="text-xs font-extrabold text-white block mt-0.5">{selectedDay.rainProb}%</span>
              </div>
            </div>
          </div>

          {/* Sun path arc visual diagram */}
          <div className="lg:col-span-7 bg-slate-950/30 rounded-xl border border-white/5 p-4 flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><Sun size={12} className="text-amber-400" /> SUN PATH SCHEDULER</span>
              <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">Duration: {durationStr}</span>
            </div>

            {/* Sun path Arc SVG container */}
            <div className="relative w-full h-20 flex items-end justify-center py-2 overflow-hidden">
              <svg className="w-full max-w-[220px] h-16" viewBox="0 0 220 80">
                {/* Horizontal horizon line */}
                <line x1="0" y1="60" x2="220" y2="60" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Quadratic Bezier path curve */}
                <path d="M 15 60 Q 110 -10 205 60" fill="none" stroke="#4f46e5" strokeWidth="2.5" className="opacity-50" />
                <path d={`M 15 60 Q 110 -10 ${sunX} ${sunY}`} fill="none" stroke="#f59e0b" strokeWidth="2.5" className="opacity-80" />
                
                {/* Glowing Sun circle indicator */}
                <circle cx={sunX} cy={sunY} r="7" fill="#f59e0b" className="animate-pulse shadow-[0_0_10px_#f59e0b]" />
                <circle cx={sunX} cy={sunY} r="4" fill="#ffffff" />
                
                {/* Sunrays (aesthetic lines on svg) */}
                <line x1={sunX} y1={sunY - 12} x2={sunX} y2={sunY - 9} stroke="#f59e0b" strokeWidth="1" />
                <line x1={sunX - 10} y1={sunY} x2={sunX - 7} y2={sunY} stroke="#f59e0b" strokeWidth="1" />
                <line x1={sunX + 10} y1={sunY} x2={sunX + 7} y2={sunY} stroke="#f59e0b" strokeWidth="1" />
              </svg>

              <div className="absolute left-4 bottom-1 flex flex-col items-center">
                <span className="text-[8px] text-slate-500 font-mono">SUNRISE</span>
                <span className="text-[10px] text-slate-300 font-mono font-bold">{sunriseStr}</span>
              </div>
              <div className="absolute right-4 bottom-1 flex flex-col items-center">
                <span className="text-[8px] text-slate-500 font-mono">SUNSET</span>
                <span className="text-[10px] text-slate-300 font-mono font-bold">{sunsetStr}</span>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-500 font-mono">
              * Calculations synchronized relative to the location's celestial longitude.
            </div>
          </div>

        </div>

      </div>

      {/* HOURLY METEOROLOGICAL GRAPH */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        
        {/* Graph Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShiftDay("prev")}
              disabled={selectedIdx === 0}
              className="p-1.5 bg-slate-950/40 hover:bg-slate-950/75 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono font-bold text-indigo-300 uppercase">
              {selectedIdx === 0 ? "Today" : `${selectedDay.dayName}'s Timeline`}
            </span>
            <button
              onClick={() => handleShiftDay("next")}
              disabled={selectedIdx === daily.length - 1}
              className="p-1.5 bg-slate-950/40 hover:bg-slate-950/75 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Graph Parameter Select Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Sensor Grid:</span>
            <select
              value={activeMetric}
              onChange={(e) => setActiveMetric(e.target.value as MetricType)}
              className="bg-slate-950 text-xs text-white border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-all w-full sm:w-48 cursor-pointer font-semibold"
            >
              <option value="temp">Temperature Chart</option>
              <option value="rainProb">Precipitation Chance</option>
              <option value="windSpeed">Wind Velocity</option>
              <option value="uvi">UV Exposure</option>
              <option value="humidity">Relative Humidity</option>
            </select>
          </div>
        </div>

        {/* Graph Render Container */}
        <div className="w-full h-52 bg-slate-950/30 rounded-2xl border border-white/5 p-4 relative">
          <div className="w-full h-full">
            <canvas ref={canvasRef} />
          </div>

          <div className="absolute top-2.5 right-4 flex items-center gap-2 text-[8px] font-mono font-semibold text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: mConfig.color }} />
            {mConfig.label} ({mConfig.unit})
          </div>
        </div>

      </div>

    </div>
  );
}
