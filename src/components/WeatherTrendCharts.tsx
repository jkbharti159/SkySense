import { useState, useMemo, useRef, useEffect } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { HourlyForecast } from "../types.js";
import { Flame, Snowflake, Umbrella, Wind, Sparkles } from "lucide-react";

ChartJS.register(...registerables);

interface WeatherTrendChartsProps {
  hourly: HourlyForecast[];
  tempUnit: "C" | "F";
  windUnit: "kmh" | "mph";
}

type MetricType = "temp" | "feelsLike" | "rainProb" | "windSpeed";

export default function WeatherTrendCharts({
  hourly,
  tempUnit,
  windUnit
}: WeatherTrendChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("temp");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  // Format the time strings for the X-Axis
  const chartData = useMemo(() => {
    return hourly.map((h) => {
      const date = new Date(h.time);
      const hourStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      
      // Calculate unit conversions
      const convertedTemp = tempUnit === "F" ? (h.temp * 9) / 5 + 32 : h.temp;
      const convertedFeels = tempUnit === "F" ? (h.feelsLike * 9) / 5 + 32 : h.feelsLike;
      const convertedWind = windUnit === "mph" ? h.windSpeed * 0.621371 : h.windSpeed;

      return {
        ...h,
        formattedTime: hourStr,
        temp: Math.round(convertedTemp * 10) / 10,
        feelsLike: Math.round(convertedFeels * 10) / 10,
        windSpeed: Math.round(convertedWind * 10) / 10,
        rainProb: h.rainProb
      };
    });
  }, [hourly, tempUnit, windUnit]);

  // Compute Peak highlights
  const peaks = useMemo(() => {
    if (chartData.length === 0) return null;

    let hottest = chartData[0];
    let coldest = chartData[0];
    let highestRain = chartData[0];
    let strongestWind = chartData[0];

    chartData.forEach((h) => {
      if (h.temp > hottest.temp) hottest = h;
      if (h.temp < coldest.temp) coldest = h;
      if (h.rainProb > highestRain.rainProb) highestRain = h;
      if (h.windSpeed > strongestWind.windSpeed) strongestWind = h;
    });

    return { hottest, coldest, highestRain, strongestWind };
  }, [chartData]);

  const metricConfig = {
    temp: {
      label: `Temperature (°${tempUnit})`,
      color: "#f59e0b", // Amber
      gradientFrom: "rgba(245, 158, 11, 0.35)",
      gradientTo: "rgba(245, 158, 11, 0.0)"
    },
    feelsLike: {
      label: `Feels Like (°${tempUnit})`,
      color: "#ec4899", // Pink
      gradientFrom: "rgba(236, 72, 153, 0.3)",
      gradientTo: "rgba(236, 72, 153, 0.0)"
    },
    rainProb: {
      label: "Rain Probability (%)",
      color: "#0ea5e9", // Sky Blue
      gradientFrom: "rgba(14, 165, 233, 0.35)",
      gradientTo: "rgba(14, 165, 233, 0.0)"
    },
    windSpeed: {
      label: `Wind Speed (${windUnit === "kmh" ? "km/h" : "mph"})`,
      color: "#10b981", // Emerald
      gradientFrom: "rgba(16, 185, 129, 0.3)",
      gradientTo: "rgba(16, 185, 129, 0.0)"
    }
  };

  const activeConfig = metricConfig[selectedMetric];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const chartHeight = canvas.clientHeight || 240;

    const primaryGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    primaryGrad.addColorStop(0, activeConfig.gradientFrom);
    primaryGrad.addColorStop(1, activeConfig.gradientTo);

    const feelsGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    feelsGrad.addColorStop(0, "rgba(236, 72, 153, 0.25)");
    feelsGrad.addColorStop(1, "rgba(236, 72, 153, 0.0)");

    const datasets: any[] = [];
    if (selectedMetric === "temp") {
      datasets.push(
        {
          label: "Temperature",
          data: chartData.map((d) => d.temp),
          borderColor: "#f59e0b",
          borderWidth: 2.5,
          backgroundColor: primaryGrad,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#f59e0b",
          pointHoverBorderWidth: 0,
        },
        {
          label: "Feels Like",
          data: chartData.map((d) => d.feelsLike),
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderDash: [4, 4],
          backgroundColor: feelsGrad,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: "#ec4899",
          pointHoverBorderWidth: 0,
        }
      );
    } else if (selectedMetric === "feelsLike") {
      datasets.push(
        {
          label: "Feels Like",
          data: chartData.map((d) => d.feelsLike),
          borderColor: "#ec4899",
          borderWidth: 2.5,
          backgroundColor: primaryGrad,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#ec4899",
          pointHoverBorderWidth: 0,
        },
        {
          label: "Temperature",
          data: chartData.map((d) => d.temp),
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          borderDash: [4, 4],
          backgroundColor: feelsGrad,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: "#f59e0b",
          pointHoverBorderWidth: 0,
        }
      );
    } else if (selectedMetric === "rainProb") {
      datasets.push({
        label: "Rain Probability",
        data: chartData.map((d) => d.rainProb),
        borderColor: "#0ea5e9",
        borderWidth: 2.5,
        backgroundColor: primaryGrad,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#0ea5e9",
        pointHoverBorderWidth: 0,
      });
    } else {
      datasets.push({
        label: "Wind Speed",
        data: chartData.map((d) => d.windSpeed),
        borderColor: "#10b981",
        borderWidth: 2.5,
        backgroundColor: primaryGrad,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#10b981",
        pointHoverBorderWidth: 0,
      });
    }

    chartRef.current = new ChartJS(canvas, {
      type: "line",
      data: {
        labels: chartData.map((d) => d.formattedTime),
        datasets: datasets,
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
              size: 11,
              weight: "bold",
            },
            bodyFont: {
              family: "Inter, sans-serif",
              size: 12,
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
                const name = context.dataset.label || "";
                const val = context.parsed.y;
                let unitSymbol = "";
                if (name.includes("Temp") || name.includes("Feels")) unitSymbol = `°${tempUnit}`;
                else if (name.includes("Rain")) unitSymbol = "%";
                else if (name.includes("Wind")) unitSymbol = windUnit === "kmh" ? " km/h" : " mph";
                return ` ${name}: ${val}${unitSymbol}`;
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
              color: "#94a3b8",
              font: {
                family: "Inter, sans-serif",
                size: 10,
                weight: "normal",
              },
            },
          },
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.03)",
            },
            border: {
              display: false,
            },
            ticks: {
              color: "#94a3b8",
              font: {
                family: "Inter, sans-serif",
                size: 10,
                weight: "normal",
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
  }, [chartData, selectedMetric, activeConfig, tempUnit, windUnit]);

  return (
    <div id="hourly-forecast-trends" className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border border-slate-200/10 rounded-3xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-amber-400" size={18} />
            Hourly Outlook Trends
          </h3>
          <p className="text-xs text-slate-400">Granular atmospheric projections for the next 24 hours</p>
        </div>

        {/* Switcher Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-200/5 w-full sm:w-auto">
          {(["temp", "feelsLike", "rainProb", "windSpeed"] as MetricType[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedMetric === metric
                  ? "bg-slate-800 text-white shadow-md border border-white/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {metric === "temp" && "Temp"}
              {metric === "feelsLike" && "Feels Like"}
              {metric === "rainProb" && "Rain %"}
              {metric === "windSpeed" && "Wind"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Stage */}
      <div className="flex-1 w-full min-h-[220px] md:min-h-[260px] relative">
        <div className="w-full h-full min-h-[220px] md:min-h-[260px]">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Extreme Stats Peak Banners */}
      {peaks && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-200/5">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/20 border border-slate-200/5">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Flame size={15} className="animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold font-mono">Hottest Hour</div>
              <div className="text-xs font-extrabold text-slate-200 mt-0.5">
                {peaks.hottest.temp}°{tempUnit} <span className="text-[10px] text-slate-400 font-normal block sm:inline">({peaks.hottest.formattedTime})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/20 border border-slate-200/5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Snowflake size={15} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold font-mono">Coldest Hour</div>
              <div className="text-xs font-extrabold text-slate-200 mt-0.5">
                {peaks.coldest.temp}°{tempUnit} <span className="text-[10px] text-slate-400 font-normal block sm:inline">({peaks.coldest.formattedTime})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/20 border border-slate-200/5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Umbrella size={15} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold font-mono">Peak Rain</div>
              <div className="text-xs font-extrabold text-slate-200 mt-0.5">
                {peaks.highestRain.rainProb}% <span className="text-[10px] text-slate-400 font-normal block sm:inline">({peaks.highestRain.formattedTime})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/20 border border-slate-200/5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Wind size={15} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold font-mono">Peak Wind</div>
              <div className="text-xs font-extrabold text-slate-200 mt-0.5">
                {peaks.strongestWind.windSpeed} {windUnit === "kmh" ? "km/h" : "mph"} <span className="text-[10px] text-slate-400 font-normal block sm:inline">({peaks.strongestWind.formattedTime})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

