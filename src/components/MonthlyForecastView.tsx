import { useState, useRef, useEffect } from "react";
import { Calendar, Sun, Cloud, CloudRain, CloudSnow, HelpCircle } from "lucide-react";
import { Chart as ChartJS, registerables } from "chart.js";
import { UserPreferences } from "../types.js";

ChartJS.register(...registerables);

interface MonthlyForecastViewProps {
  locationName: string;
  preferences: UserPreferences;
  onClose: () => void;
}

export default function MonthlyForecastView({
  locationName,
  preferences,
  onClose
}: MonthlyForecastViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  // Let's use July 2026 as the standard month matching the screenshot
  const year = 2026;
  const monthName = "July";
  
  // July starts on a Wednesday (3) in 2026
  const startDayOffset = 3;
  const totalDays = 31;

  // Generate deterministic weather conditions for each of the 31 days based on locationName
  // We want to make it look highly realistic (e.g. Kolkata has a lot of rain in July monsoon, New York might be sunny, etc.)
  const generateMonthlyData = () => {
    const data = [];
    const lowerName = locationName.toLowerCase();
    
    // Determine climate profile
    let rainProbThreshold = 0.5; // default moderate rain
    if (lowerName.includes("kolkata") || lowerName.includes("india") || lowerName.includes("mumbai")) {
      rainProbThreshold = 0.75; // Heavy monsoon monsoon
    } else if (lowerName.includes("york") || lowerName.includes("paris")) {
      rainProbThreshold = 0.25; // Summer showers
    } else if (lowerName.includes("tokyo")) {
      rainProbThreshold = 0.4;
    }

    for (let day = 1; day <= totalDays; day++) {
      // Deterministic pseudo-randomness based on day and city name hash
      const hash = Math.sin(day + locationName.length) * 10000;
      const rand = hash - Math.floor(hash);

      let condition: "sunny" | "cloudy" | "rainy" | "snowy" = "sunny";
      let condCode = 0;
      let maxTemp = 28;
      let minTemp = 20;

      if (lowerName.includes("kolkata")) {
        maxTemp = 30 + Math.sin(day / 3) * 2;
        minTemp = 25 + Math.cos(day / 4) * 1;
      } else {
        maxTemp = 25 + Math.sin(day / 4) * 5;
        minTemp = 16 + Math.cos(day / 5) * 3;
      }

      if (rand < rainProbThreshold) {
        condition = "rainy";
        condCode = 61; // Slight rain
      } else if (rand < rainProbThreshold + 0.25) {
        condition = "cloudy";
        condCode = 3; // Overcast
      } else {
        condition = "sunny";
        condCode = 0; // Clear
      }

      // Safeguard snowy
      if (lowerName.includes("antarctica") || maxTemp < 5) {
        condition = "snowy";
        condCode = 71;
      }

      data.push({
        day,
        condition,
        condCode,
        maxTemp: Math.round(maxTemp),
        minTemp: Math.round(minTemp)
      });
    }
    return data;
  };

  const daysData = generateMonthlyData();

  // Aggregate category counts for the chart
  const counts = daysData.reduce(
    (acc, cur) => {
      acc[cur.condition]++;
      return acc;
    },
    { sunny: 0, cloudy: 0, rainy: 0, snowy: 0 }
  );

  const pieData = [
    { name: "Sunny Days", value: counts.sunny, color: "#f59e0b" },
    { name: "Cloudy Days", value: counts.cloudy, color: "#64748b" },
    { name: "Rainy Days", value: counts.rainy, color: "#38bdf8" },
    { name: "Snowy Days", value: counts.snowy, color: "#e2e8f0" }
  ].filter(d => d.value > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new ChartJS(canvas, {
      type: "doughnut",
      data: {
        labels: pieData.map((d) => d.name),
        datasets: [
          {
            data: pieData.map((d) => d.value),
            backgroundColor: pieData.map((d) => d.color),
            borderColor: "rgba(15,23,42,0.6)",
            borderWidth: 1,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: "easeOutCirc"
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            titleFont: {
              family: "JetBrains Mono, monospace",
              size: 11,
              weight: "bold",
            },
            bodyFont: {
              family: "Inter, sans-serif",
              size: 12,
            },
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const val = context.parsed;
                const percentage = Math.round((val / total) * 100);
                return ` ${context.label}: ${val} days (${percentage}%)`;
              }
            }
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [pieData]);

  // Unit conversions
  const convertTempVal = (c: number) => {
    if (preferences.tempUnit === "F") {
      return Math.round((c * 9) / 5 + 32);
    }
    return c;
  };

  // Weather icon renderer
  const getWeatherIcon = (condition: string, size = 16) => {
    if (condition === "sunny") return <Sun size={size} className="text-amber-400" />;
    if (condition === "cloudy") return <Cloud size={size} className="text-slate-300" />;
    if (condition === "rainy") return <CloudRain size={size} className="text-sky-400" />;
    return <CloudSnow size={size} className="text-white" />;
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-indigo-400" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">30-Days Forecast - {monthName} {year}</h3>
            <p className="text-xs text-slate-400">Macro-climate calendar patterns for {locationName}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          id="close-monthly-btn"
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/5 transition-all"
        >
          Return to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Grid (8 Columns on desktop) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Days of week columns */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40 py-2 rounded-xl border border-white/5">
            <div>Sun.</div>
            <div>Mon.</div>
            <div>Tue.</div>
            <div>Wed.</div>
            <div>Thu.</div>
            <div>Fri.</div>
            <div>Sat.</div>
          </div>

          {/* Calendar blocks */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset tiles */}
            {Array.from({ length: startDayOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="bg-transparent border border-transparent min-h-[76px]" />
            ))}

            {/* Populate Month Days */}
            {daysData.map((d) => {
              const isToday = d.day === 18; // Mock Today's date to match screenshots
              return (
                <div
                  key={d.day}
                  className={`min-h-[76px] rounded-xl p-2 flex flex-col justify-between border transition-all ${
                    isToday
                      ? "bg-indigo-600/35 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white scale-[1.01]"
                      : "bg-slate-950/25 border-white/5 hover:border-slate-800 hover:bg-slate-950/40 text-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-black ${isToday ? "text-indigo-300 underline font-mono" : "text-slate-400"}`}>
                      {d.day} {isToday && "Today"}
                    </span>
                    <span className="opacity-90">{getWeatherIcon(d.condition, 14)}</span>
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-right">
                    <span className="font-extrabold text-slate-200 block">{convertTempVal(d.maxTemp)}°</span>
                    <span className="text-slate-500 block">{convertTempVal(d.minTemp)}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar overview with Pie Chart (4 Columns) */}
        <div className="lg:col-span-4 bg-slate-950/40 rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-2">
              {monthName} Weather Overview
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              The monthly weather averages in {locationName} consist of <span className="font-bold text-amber-400">{counts.sunny} sunny</span> days, <span className="font-bold text-slate-300">{counts.cloudy} cloudy</span> days, <span className="font-bold text-sky-400">{counts.rainy} rainy</span> days, and <span className="font-bold text-indigo-300">{counts.snowy} snowy</span> days.
            </p>

            {/* Pie Chart */}
            <div className="w-full h-44 flex items-center justify-center relative">
              <div className="w-full h-full max-h-[170px] relative">
                <canvas ref={canvasRef} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-slate-200">{totalDays}</span>
                <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase">Days</span>
              </div>
            </div>
          </div>

          {/* Counts metrics table list */}
          <div className="space-y-2 text-[10px] font-mono border-t border-white/5 pt-3">
            {pieData.map((d, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="text-slate-200 font-bold">{d.value} days ({Math.round((d.value/totalDays)*100)}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
