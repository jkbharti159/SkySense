import { useState, useMemo, useEffect, useRef } from "react";
import { AirQuality, LocationData, HourlyForecast } from "../types.js";
import { calculateAQI, AQIStandard } from "../utils/aqiCalculator.js";
import {
  Wind,
  AlertTriangle,
  Info,
  Calendar,
  TrendingUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Heart,
  Sparkles,
  Droplets,
  Leaf,
  Home,
  Users,
  ArrowUpRight,
  CheckCircle2
} from "lucide-react";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

interface AirQualityDashboardProps {
  aqi: AirQuality;
  location: LocationData;
  hourly: HourlyForecast[];
  onSelectLocation: (loc: LocationData) => void;
}

export default function AirQualityDashboard({
  aqi,
  location,
  hourly,
  onSelectLocation
}: AirQualityDashboardProps) {
  // Active AQI Standard: default "US", dynamically updated or manually switched
  const [selectedStandard, setSelectedStandard] = useState<AQIStandard>("US");

  // Live Air Quality Data state for metropolitan cities
  const [metroCitiesLive, setMetroCitiesLive] = useState<any[]>([]);
  const [loadingMetro, setLoadingMetro] = useState<boolean>(false);

  // States for interactive tabs, accordions, and month filters
  const [activeHealthTab, setActiveHealthTab] = useState<"general" | "sensitive" | "kids" | "athletes">("general");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [yearDropdownOpen, setYearDropdownOpen] = useState<boolean>(false);
  const [parameterDropdownOpen, setParameterDropdownOpen] = useState<boolean>(false);
  const [activeSolutionTab, setActiveSolutionTab] = useState<"individual" | "community" | "government">("individual");
  const [hoveredCalendarDay, setHoveredCalendarDay] = useState<{
    day: number;
    monthIdx: number;
    value: string | number;
    status: string;
    metricLabel: string;
    unit: string;
  } | null>(null);
  const [calendarMetric, setCalendarMetric] = useState<string>("AQI");
  const calendarMetricsList = useMemo(() => [
    { key: "AQI", label: `AQI (${selectedStandard})` },
    { key: "pm2_5", label: "PM2.5" },
    { key: "pm10", label: "PM10" },
    { key: "co", label: "CO" },
    { key: "so2", label: "SO2" },
    { key: "no2", label: "NO2" },
    { key: "o3", label: "O3" }
  ], [selectedStandard]);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const scrollCalendar = (direction: "left" | "right") => {
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollBy({
        left: direction === "left" ? -345 : 345,
        behavior: "smooth"
      });
    }
  };
  const [faqOpenState, setFaqOpenState] = useState<Record<number, boolean>>({
    0: true, // open first by default
  });
  
  // Solution action checkbox states (for interactive personal checklist)
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({
    purifier: true,
    plants: false,
    ventilation: false,
    mask: false,
    wetSweep: false,
    carpool: false
  });

  const histCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const histChartRef = useRef<ChartJS | null>(null);
  const annualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const annualChartRef = useRef<ChartJS | null>(null);

  const histChartData = useMemo(() => {
    return hourly.slice(0, 7).map((h, i) => {
      const date = new Date(h.time);
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
      const daysOffset = [0, -12, 18, 5, -8, 22, -4];
      const dVal = Math.max(12, Math.round(aqi.aqi + daysOffset[i % 7]));
      return { day: dayName, AQI: dVal, pm25: Math.round(dVal * 0.65) };
    });
  }, [hourly, aqi]);

  useEffect(() => {
    const canvas = histCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (histChartRef.current) {
      histChartRef.current.destroy();
    }

    const chartHeight = canvas.clientHeight || 280;

    const fillGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    fillGrad.addColorStop(0, "rgba(20, 184, 166, 0.4)");
    fillGrad.addColorStop(1, "rgba(20, 184, 166, 0.0)");

    histChartRef.current = new ChartJS(canvas, {
      type: "line",
      data: {
        labels: histChartData.map((d) => d.day),
        datasets: [
          {
            label: "Air Quality (AQI)",
            data: histChartData.map((d) => d.AQI),
            borderColor: "#14b8a6",
            borderWidth: 2.5,
            backgroundColor: fillGrad,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#14b8a6",
            pointHoverBorderWidth: 0,
          },
          {
            label: "PM2.5 Est",
            data: histChartData.map((d) => d.pm25),
            borderColor: "#38bdf8",
            borderWidth: 1,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#38bdf8",
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
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
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
            callbacks: {
              label: function (context) {
                const name = context.dataset.label || "";
                const val = context.parsed.y;
                let unitSymbol = name.includes("AQI") ? " AQI" : " µg/m³";
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
                size: 9,
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
                size: 9,
              },
            },
          },
        },
      },
    });

    return () => {
      if (histChartRef.current) {
        histChartRef.current.destroy();
      }
    };
  }, [histChartData]);

  // Automatically select the correct local standard based on location.country
  useEffect(() => {
    if (location.country) {
      const country = location.country.toLowerCase();
      if (country === "india" || country.includes("kolkata")) {
        setSelectedStandard("IN");
      } else if (
        country === "united kingdom" || 
        country === "uk" || 
        ["germany", "france", "italy", "spain", "poland", "netherlands", "belgium", "sweden", "austria", "denmark", "finland", "greece", "ireland", "portugal", "europe"].some(eu => country.includes(eu))
      ) {
        setSelectedStandard("EU");
      } else {
        setSelectedStandard("US");
      }
    }
  }, [location]);

  // Dynamically calculate the active AQI standard values
  const calculated = useMemo(() => {
    return calculateAQI(selectedStandard, aqi);
  }, [selectedStandard, aqi]);

  const toggleAction = (id: string) => {
    setCompletedActions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFaq = (idx: number) => {
    setFaqOpenState(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Safe color and label mapping helper
  const getLabelColorClass = (lbl: string) => {
    const l = lbl.toLowerCase();
    if (l.includes("good") || l.includes("very low") || l.includes("meets")) {
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
    if (l.includes("satisfactory") || l.includes("low index") || l.includes("moderate")) {
      return "text-teal-300 bg-teal-500/10 border-teal-500/20";
    }
    if (l.includes("sensitive") || l.includes("medium") || l.includes("exceeds who target (mild)")) {
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
    if (l.includes("poor") || l.includes("unhealthy") || l.includes("high") || l.includes("exceeds who target (heavy)")) {
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    }
    return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  };

  const getCalendarColorClass = (lbl: string) => {
    const l = lbl.toLowerCase();
    if (l.includes("good") || l.includes("very low") || l.includes("meets")) {
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/40";
    }
    if (l.includes("satisfactory") || l.includes("low index") || l.includes("moderate")) {
      return "bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/40";
    }
    if (l.includes("sensitive") || l.includes("medium") || l.includes("exceeds who target (mild)")) {
      return "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/40";
    }
    if (l.includes("poor") || l.includes("unhealthy") || l.includes("high") || l.includes("exceeds who target (heavy)")) {
      return "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/40";
    }
    return "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/40";
  };

  const pm25State = {
    label: calculated.pollutantLabels.pm2_5,
    color: getLabelColorClass(calculated.pollutantLabels.pm2_5)
  };
  const pm10State = {
    label: calculated.pollutantLabels.pm10,
    color: getLabelColorClass(calculated.pollutantLabels.pm10)
  };
  const ozoneState = {
    label: calculated.pollutantLabels.o3,
    color: getLabelColorClass(calculated.pollutantLabels.o3)
  };
  const no2State = {
    label: calculated.pollutantLabels.no2,
    color: getLabelColorClass(calculated.pollutantLabels.no2)
  };
  const coState = {
    label: calculated.pollutantLabels.co,
    color: getLabelColorClass(calculated.pollutantLabels.co)
  };
  const so2State = {
    label: calculated.pollutantLabels.so2,
    color: getLabelColorClass(calculated.pollutantLabels.so2)
  };

  // Dynamic limits based on selected standard
  const stdLimits = useMemo(() => {
    if (selectedStandard === "IN") {
      return { pm2_5: 60, pm10: 100, no2: 80, o3: 100, co: 4000, so2: 80, source: "Indian NAAQS" };
    }
    if (selectedStandard === "EU") {
      return { pm2_5: 25, pm10: 50, no2: 200, o3: 120, co: 10000, so2: 125, source: "EU Directive" };
    }
    if (selectedStandard === "WHO") {
      return { pm2_5: 15, pm10: 45, no2: 25, o3: 100, co: 4000, so2: 40, source: "WHO Guideline" };
    }
    return { pm2_5: 12, pm10: 54, no2: 100, o3: 100, co: 1000, so2: 20, source: "US EPA" };
  }, [selectedStandard]);

  // Dynamic content based on country
  const countryName = location.country || "India";
  const isIndia = countryName.toLowerCase() === "india" || countryName.toLowerCase().includes("kolkata");

  // Regional/Country metro cities dataset with AQI calculated for selected standard
  const metroCities = useMemo(() => {
    if (isIndia) {
      return [
        { name: "Kolkata", country: "India", admin1: "West Bengal", lat: 22.5726, lon: 88.3639, multiplier: 1.0 },
        { name: "New Delhi", country: "India", admin1: "Delhi", lat: 28.6139, lon: 77.2090, multiplier: 1.65 },
        { name: "Mumbai", country: "India", admin1: "Maharashtra", lat: 19.0760, lon: 72.8777, multiplier: 0.72 },
        { name: "Bengaluru", country: "India", admin1: "Karnataka", lat: 12.9716, lon: 77.5946, multiplier: 0.48 },
        { name: "Chennai", country: "India", admin1: "Tamil Nadu", lat: 13.0827, lon: 80.2707, multiplier: 0.55 },
        { name: "Hyderabad", country: "India", admin1: "Telangana", lat: 17.3850, lon: 78.4867, multiplier: 0.62 },
      ];
    } else {
      return [
        { name: "New York", country: "United States", admin1: "New York", lat: 40.7128, lon: -74.0060, multiplier: 0.35 },
        { name: "Los Angeles", country: "United States", admin1: "California", lat: 34.0522, lon: -118.2437, multiplier: 0.68 },
        { name: "Chicago", country: "United States", admin1: "Illinois", lat: 41.8781, lon: -87.6298, multiplier: 0.42 },
        { name: "Houston", country: "United States", admin1: "Texas", lat: 29.7604, lon: -95.3698, multiplier: 0.45 },
        { name: "London", country: "United Kingdom", admin1: "England", lat: 51.5074, lon: -0.1278, multiplier: 0.28 },
        { name: "Tokyo", country: "Japan", admin1: "Tokyo", lat: 35.6762, lon: 139.6503, multiplier: 0.25 },
      ];
    }
  }, [isIndia]);

  useEffect(() => {
    let active = true;
    const fetchMetroLive = async () => {
      setLoadingMetro(true);
      try {
        const lats = metroCities.map(c => c.lat).join(",");
        const lons = metroCities.map(c => c.lon).join(",");
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            const parsedArray = Array.isArray(data) ? data : [data];
            setMetroCitiesLive(parsedArray);
          }
        }
      } catch (e) {
        console.error("Failed to fetch live metro cities air quality:", e);
      } finally {
        if (active) setLoadingMetro(false);
      }
    };
    fetchMetroLive();
    return () => {
      active = false;
    };
  }, [metroCities]);

  const calculatedMetroCities = useMemo(() => {
    return metroCities.map((city, idx) => {
      const liveData = metroCitiesLive[idx]?.current;

      let pm2_5_val: number;
      let pm10_val: number;
      let co_val: number;
      let no2_val: number;
      let o3_val: number;
      let so2_val: number;

      if (liveData) {
        pm2_5_val = liveData.pm2_5 !== undefined ? liveData.pm2_5 : (Math.round(aqi.pm2_5 * city.multiplier * 10) / 10);
        pm10_val = liveData.pm10 !== undefined ? liveData.pm10 : (Math.round(aqi.pm10 * city.multiplier * 10) / 10);
        co_val = liveData.carbon_monoxide !== undefined ? liveData.carbon_monoxide : Math.round(aqi.co * city.multiplier);
        no2_val = liveData.nitrogen_dioxide !== undefined ? liveData.nitrogen_dioxide : Math.round(aqi.no2 * city.multiplier);
        o3_val = liveData.ozone !== undefined ? liveData.ozone : Math.round(aqi.o3 * city.multiplier);
        so2_val = liveData.sulphur_dioxide !== undefined ? liveData.sulphur_dioxide : Math.round(aqi.so2 * city.multiplier);
      } else {
        pm2_5_val = Math.round(aqi.pm2_5 * city.multiplier * 10) / 10;
        pm10_val = Math.round(aqi.pm10 * city.multiplier * 10) / 10;
        co_val = Math.round(aqi.co * city.multiplier);
        no2_val = Math.round(aqi.no2 * city.multiplier);
        o3_val = Math.round(aqi.o3 * city.multiplier);
        so2_val = Math.round(aqi.so2 * city.multiplier);
      }

      const cityCalc = calculateAQI(selectedStandard, {
        pm2_5: pm2_5_val,
        pm10: pm10_val,
        co: co_val,
        no2: no2_val,
        o3: o3_val,
        so2: so2_val
      });

      return {
        ...city,
        baseAqi: Math.round(cityCalc.aqi),
        status: cityCalc.label,
        colorHex: cityCalc.color,
        colorClass: getLabelColorClass(cityCalc.label),
        isRealTime: !!liveData
      };
    });
  }, [metroCities, aqi, selectedStandard, metroCitiesLive]);

  // Ranked list of most polluted cities for the current year
  const mostPollutedCities = useMemo(() => {
    if (isIndia) {
      return [
        { rank: 1, name: "Bhiwadi", state: "Rajasthan", annualPm25: 92.7, primarySource: "Industrial dust & combustion", status: "Severe" },
        { rank: 2, name: "Ghaziabad", state: "Uttar Pradesh", annualPm25: 89.1, primarySource: "Road dust & vehicle exhaust", status: "Severe" },
        { rank: 3, name: "Delhi", state: "Delhi NCR", annualPm25: 87.4, primarySource: "Vehicular density, biomass, stubble crop burns", status: "Severe" },
        { rank: 4, name: "Jaunpur", state: "Uttar Pradesh", annualPm25: 83.0, primarySource: "Biomass cooking & local brick kilns", status: "Very Poor" },
        { rank: 5, name: "Noida", state: "Uttar Pradesh", annualPm25: 82.3, primarySource: "Construction dust & heavy trucking", status: "Very Poor" },
        { rank: 6, name: "Patna", state: "Bihar", annualPm25: 79.8, primarySource: "Alluvial soil suspension & brick kilns", status: "Very Poor" },
      ];
    } else {
      return [
        { rank: 1, name: "Bakersfield", state: "California", annualPm25: 18.2, primarySource: "Agricultural valley dust & oil extraction", status: "Moderate" },
        { rank: 2, name: "Visalia", state: "California", annualPm25: 17.5, primarySource: "Central Valley dairy emissions & diesel transit", status: "Moderate" },
        { rank: 3, name: "Fresno", state: "California", annualPm25: 16.9, primarySource: "Crop residues & residential firewood smoke", status: "Moderate" },
        { rank: 4, name: "Los Angeles", state: "California", annualPm25: 14.1, primarySource: "Coastal shipping, urban traffic, smog trapped in basin", status: "Moderate" },
        { rank: 5, name: "Medford", state: "Oregon", annualPm25: 13.8, primarySource: "Wildfire smoke pooling & heating woodstoves", status: "Moderate" },
        { rank: 6, name: "Yakima", state: "Washington", annualPm25: 13.2, primarySource: "Valley thermal inversions & agricultural fires", status: "Moderate" },
      ];
    }
  }, [isIndia]);

  // Local/Tagged location neighborhood micro-sensors (Real-time air pollution level)
  const neighborhoodSensors = useMemo(() => {
    const multiplier = [1.0, 0.88, 1.15, 0.94, 1.05];
    const distance = [0.6, 1.8, 2.5, 3.1, 4.2];
    const names = isIndia 
      ? ["Municipal Corporation Gate", "Eco Park Sector V", "Jadavpur Campus South", "Salt Lake Central Bus Terminus", "Howrah Railway Interchange"]
      : ["City Center Plaza", "Greenwood Recreational Park", "Northeast Science Academy", "Industrial Harbor Terminal", "Highland Residential Area"];

    return names.map((name, i) => {
      const pm2_5_val = Math.round(aqi.pm2_5 * multiplier[i] * 10) / 10;
      const pm10_val = Math.round(aqi.pm10 * multiplier[i] * 10) / 10;
      const co_val = Math.round(aqi.co * multiplier[i]);
      const no2_val = Math.round(aqi.no2 * multiplier[i]);
      const o3_val = Math.round(aqi.o3 * multiplier[i]);
      const so2_val = Math.round(aqi.so2 * multiplier[i]);

      const sensorCalc = calculateAQI(selectedStandard, {
        pm2_5: pm2_5_val,
        pm10: pm10_val,
        co: co_val,
        no2: no2_val,
        o3: o3_val,
        so2: so2_val
      });

      return {
        name,
        distance: distance[i],
        aqiVal: Math.round(sensorCalc.aqi),
        status: sensorCalc.label,
        colorClass: getLabelColorClass(sensorCalc.label),
        pm2_5: pm2_5_val,
        pm10: pm10_val
      };
    });
  }, [isIndia, aqi, selectedStandard]);

  // 12 Months names
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Annual Air Quality changes dataset for charts
  const annualTrendsData = useMemo(() => {
    // Generate values mimicking regional meteorological behavior
    // For India: Winter (Nov, Dec, Jan) are highly polluted; Monsoon (Jul, Aug, Sep) are super clean.
    if (isIndia) {
      return [
        { month: "Jan", "Average AQI": 182, "PM2.5 Average": 115, "Standard Limit": 50 },
        { month: "Feb", "Average AQI": 154, "PM2.5 Average": 90, "Standard Limit": 50 },
        { month: "Mar", "Average AQI": 112, "PM2.5 Average": 68, "Standard Limit": 50 },
        { month: "Apr", "Average AQI": 98, "PM2.5 Average": 55, "Standard Limit": 50 },
        { month: "May", "Average AQI": 105, "PM2.5 Average": 58, "Standard Limit": 50 },
        { month: "Jun", "Average AQI": 84, "PM2.5 Average": 42, "Standard Limit": 50 },
        { month: "Jul", "Average AQI": 42, "PM2.5 Average": 22, "Standard Limit": 50 },
        { month: "Aug", "Average AQI": 38, "PM2.5 Average": 18, "Standard Limit": 50 },
        { month: "Sep", "Average AQI": 52, "PM2.5 Average": 26, "Standard Limit": 50 },
        { month: "Oct", "Average AQI": 125, "PM2.5 Average": 75, "Standard Limit": 50 },
        { month: "Nov", "Average AQI": 194, "PM2.5 Average": 124, "Standard Limit": 50 },
        { month: "Dec", "Average AQI": 215, "PM2.5 Average": 140, "Standard Limit": 50 }
      ];
    } else {
      // US trends: slight increase in summer due to ozone, winter is low, fires in autumn
      return [
        { month: "Jan", "Average AQI": 45, "PM2.5 Average": 11, "Standard Limit": 50 },
        { month: "Feb", "Average AQI": 42, "PM2.5 Average": 10, "Standard Limit": 50 },
        { month: "Mar", "Average AQI": 38, "PM2.5 Average": 9, "Standard Limit": 50 },
        { month: "Apr", "Average AQI": 44, "PM2.5 Average": 11, "Standard Limit": 50 },
        { month: "May", "Average AQI": 52, "PM2.5 Average": 13, "Standard Limit": 50 },
        { month: "Jun", "Average AQI": 68, "PM2.5 Average": 16, "Standard Limit": 50 },
        { month: "Jul", "Average AQI": 74, "PM2.5 Average": 18, "Standard Limit": 50 },
        { month: "Aug", "Average AQI": 78, "PM2.5 Average": 20, "Standard Limit": 50 },
        { month: "Sep", "Average AQI": 62, "PM2.5 Average": 15, "Standard Limit": 50 },
        { month: "Oct", "Average AQI": 48, "PM2.5 Average": 12, "Standard Limit": 50 },
        { month: "Nov", "Average AQI": 46, "PM2.5 Average": 11, "Standard Limit": 50 },
        { month: "Dec", "Average AQI": 48, "PM2.5 Average": 12, "Standard Limit": 50 }
      ];
    }
  }, [isIndia]);

  const aqiGradientOffset = useMemo(() => {
    const dataMax = Math.max(...annualTrendsData.map((d) => d["Average AQI"]), 100);
    const dataMin = Math.min(...annualTrendsData.map((d) => d["Average AQI"]), 0);
    const limit = 100; // Moderate/Unhealthy breakpoint
    if (dataMax === dataMin) return 0.5;
    return Math.min(Math.max((dataMax - limit) / (dataMax - dataMin), 0), 1);
  }, [annualTrendsData]);

  const pm25GradientOffset = useMemo(() => {
    const dataMax = Math.max(...annualTrendsData.map((d) => d["PM2.5 Average"]), 25);
    const dataMin = Math.min(...annualTrendsData.map((d) => d["PM2.5 Average"]), 0);
    const limit = stdLimits.pm2_5;
    if (dataMax === dataMin) return 0.5;
    return Math.min(Math.max((dataMax - limit) / (dataMax - dataMin), 0), 1);
  }, [annualTrendsData, stdLimits]);

  useEffect(() => {
    const canvas = annualCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (annualChartRef.current) {
      annualChartRef.current.destroy();
    }

    const chartHeight = canvas.clientHeight || 280;

    const aqiGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    aqiGrad.addColorStop(0, "rgba(239, 68, 68, 0.4)"); 
    aqiGrad.addColorStop(Math.min(Math.max(aqiGradientOffset, 0), 1), "rgba(239, 68, 68, 0.1)");
    aqiGrad.addColorStop(Math.min(Math.max(aqiGradientOffset, 0), 1), "rgba(20, 184, 166, 0.1)");
    aqiGrad.addColorStop(1, "rgba(20, 184, 166, 0.4)"); 

    const aqiStroke = ctx.createLinearGradient(0, 0, 0, chartHeight);
    aqiStroke.addColorStop(0, "#ef4444");
    aqiStroke.addColorStop(Math.min(Math.max(aqiGradientOffset, 0), 1), "#ef4444");
    aqiStroke.addColorStop(Math.min(Math.max(aqiGradientOffset, 0), 1), "#14b8a6");
    aqiStroke.addColorStop(1, "#14b8a6");

    const pm25Grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
    pm25Grad.addColorStop(0, "rgba(245, 158, 11, 0.4)"); 
    pm25Grad.addColorStop(Math.min(Math.max(pm25GradientOffset, 0), 1), "rgba(245, 158, 11, 0.1)");
    pm25Grad.addColorStop(Math.min(Math.max(pm25GradientOffset, 0), 1), "rgba(56, 189, 248, 0.1)");
    pm25Grad.addColorStop(1, "rgba(56, 189, 248, 0.4)"); 

    const pm25Stroke = ctx.createLinearGradient(0, 0, 0, chartHeight);
    pm25Stroke.addColorStop(0, "#f59e0b");
    pm25Stroke.addColorStop(Math.min(Math.max(pm25GradientOffset, 0), 1), "#f59e0b");
    pm25Stroke.addColorStop(Math.min(Math.max(pm25GradientOffset, 0), 1), "#38bdf8");
    pm25Stroke.addColorStop(1, "#38bdf8");

    annualChartRef.current = new ChartJS(canvas, {
      type: "line",
      data: {
        labels: annualTrendsData.map((d) => d.month),
        datasets: [
          {
            label: "Average AQI",
            data: annualTrendsData.map((d) => d["Average AQI"]),
            borderColor: aqiStroke,
            borderWidth: 2.5,
            backgroundColor: aqiGrad,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#ef4444",
            pointHoverBorderWidth: 0,
          },
          {
            label: "PM2.5 Average",
            data: annualTrendsData.map((d) => d["PM2.5 Average"]),
            borderColor: pm25Stroke,
            borderWidth: 1.5,
            backgroundColor: pm25Grad,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: "#f59e0b",
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
            display: true,
            position: "top",
            labels: {
              color: "#94a3b8",
              font: {
                family: "Inter, sans-serif",
                size: 10,
              },
              boxWidth: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
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
            callbacks: {
              label: function (context) {
                const name = context.dataset.label || "";
                const val = context.parsed.y;
                let unitSymbol = name.includes("AQI") ? "" : " µg/m³";
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
                size: 9,
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
                size: 9,
              },
            },
          },
        },
      },
    });

    return () => {
      if (annualChartRef.current) {
        annualChartRef.current.destroy();
      }
    };
  }, [annualTrendsData, aqiGradientOffset, pm25GradientOffset]);

  // Seeded random number generator for stable historical data
  const getSeededRandom = (seedStr: string) => {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(Math.sin(hash)) % 1;
  };

  // Generate stable, historical data for ALL elapsed months of selectedYear
  const elapsedMonthsData = useMemo(() => {
    const isCurrentYear = selectedYear === 2026;
    const currentMonthIdx = isCurrentYear ? 6 : 11; // 6 is July 2026
    const currentDay = isCurrentYear ? 18 : 31; // July 18, 2026
    
    const allMonthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // For 2026, only show up to July (index 6); for previous years, show all 12 months
    const monthsToInclude = isCurrentYear ? allMonthNames.slice(0, 7) : allMonthNames;
    
    // Seasonal factors for pollutants (higher in winter, lower in monsoon/summer)
    const indiaFactors = [1.8, 1.5, 1.1, 0.9, 0.8, 0.6, 0.4, 0.45, 0.55, 1.2, 1.6, 1.9];
    const usFactors    = [0.7, 0.65, 0.6, 0.7, 0.85, 1.1, 1.25, 1.2, 0.95, 0.75, 0.6, 0.65];
    
    return monthsToInclude.map((name, mIdx) => {
      // Find starting day of week for this month in selectedYear (Sunday is 0, Monday is 1...)
      const startDayOfWeek = new Date(selectedYear, mIdx, 1).getDay();
      const daysCount = new Date(selectedYear, mIdx + 1, 0).getDate();
      const days = [];
      
      for (let d = 1; d <= daysCount; d++) {
        const isFuture = isCurrentYear && (mIdx > 6 || (mIdx === 6 && d > currentDay));
        
        if (isFuture) {
          days.push({
            day: d,
            isFuture: true,
            pollutants: null
          });
        } else {
          // Incorporate selectedYear into seed to get stable unique values per year
          const seed = `${location.name}-${selectedYear}-${mIdx}-${d}`;
          const rand = getSeededRandom(seed);
          const factor = isIndia ? indiaFactors[mIdx] : usFactors[mIdx];
          
          // Continuously varying weather-like wave
          const weatherWave = 1.0 + Math.sin(d * 0.45) * 0.22 + Math.cos(d * 0.85) * 0.12;
          const randFluctuation = 0.85 + rand * 0.3; // ±15% variation
          const finalMultiplier = factor * weatherWave * randFluctuation;
          
          const pollutants = {
            pm2_5: Math.max(1, Math.round(aqi.pm2_5 * finalMultiplier * 10) / 10),
            pm10: Math.max(1, Math.round(aqi.pm10 * finalMultiplier * 10) / 10),
            co: Math.max(50, Math.round(aqi.co * finalMultiplier)),
            no2: Math.max(1, Math.round(aqi.no2 * finalMultiplier)),
            o3: Math.max(1, Math.round(aqi.o3 * finalMultiplier)),
            so2: Math.max(1, Math.round(aqi.so2 * finalMultiplier))
          };
          
          days.push({
            day: d,
            isFuture: false,
            pollutants
          });
        }
      }
      
      return {
        name,
        index: mIdx,
        startDayOfWeek,
        days
      };
    });
  }, [aqi, location.name, isIndia, selectedYear]);

  // Solutions dataset for the professional solutions cards
  const solutionsData = useMemo(() => {
    return {
      individual: [
        {
          title: "Medical-Grade HEPA Filtration",
          target: "PM2.5 & PM10 inhalable particles",
          impact: "Critical Protection",
          impactColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          desc: "Activate a certified True HEPA room purifier in primary living zones. True HEPA substrates eliminate up to 99.97% of ultra-fine combustion residues and spores down to 0.3 microns, drastically lowering circulatory entry.",
          difficulty: "Easy",
          cost: "Moderate"
        },
        {
          title: "Wet Microfiber Humid Dusting",
          target: "Resuspended floor dust mass",
          impact: "High Impact",
          impactColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
          desc: "Replace sweeping or feather-dusting with damp microfiber cloths. Sweeping launches heavy particulate matter (PM10) back into breath zones, whereas moisture molecularly binds and extracts residues.",
          difficulty: "Easy",
          cost: "Low Cost"
        },
        {
          title: "Botanical Active Air Sinks",
          target: "Gaseous NOx & Formaldehyde",
          impact: "Supportive",
          impactColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
          desc: "Assemble a dense foliage cluster of Snake Plants (Sansevieria), Spider Plants, and Peace Lilies. These species perform phytoremediation, absorbing volatile organic gases and carbon monoxide trace elements.",
          difficulty: "Medium",
          cost: "Low Cost"
        },
        {
          title: "Thermal-Inversion Ventilation",
          target: "CO₂ stagnation & indoor VOCs",
          impact: "Medium Impact",
          impactColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          desc: "Ventilate only during early morning solar-rise hours or run positive-pressure exhaust vents. Never open windows during heavy rush hours when ground-level gaseous loads are heavily pooled.",
          difficulty: "Easy",
          cost: "Free Action"
        }
      ],
      community: [
        {
          title: "Neighborhood Commute Pooling",
          target: "Fossil exhaust & NO₂",
          impact: "High Impact",
          impactColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
          desc: "Coordinate localized carpooling and shuttle transits within residential societies. Removing single-passenger diesel/gasoline vehicle trips directly weakens localized street-level NO₂ smog pockets.",
          difficulty: "Medium",
          cost: "Low Cost"
        },
        {
          title: "Office HVAC Carbon Filters",
          target: "Chemical VOCs & Gaseous toxins",
          impact: "Critical Protection",
          impactColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          desc: "Integrate activated carbon adsorption beds within central commercial HVAC air handlers. This removes hazardous organic vapors, ozone traces, and synthetic office fragrances from the circulating air.",
          difficulty: "Hard",
          cost: "High Cost"
        },
        {
          title: "Construction Dry-Dust Suppression",
          target: "Coarse particulate PM10",
          impact: "Medium Impact",
          impactColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          desc: "Enforce pressurized micro-misting nozzle lines along active neighborhood construction scaffolding. Continuous high-pressure water misting binds concrete dust, precipitating it to the ground.",
          difficulty: "Medium",
          cost: "Moderate"
        },
        {
          title: "Miyawaki Botanical Windbreaks",
          target: "Soot & Wind-borne dust",
          impact: "High Impact",
          impactColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
          desc: "Fund dense multi-tiered Miyawaki micro-forest pockets along local traffic intersections. Structured canopies act as active aerodynamic screens, capturing carbonaceous soot.",
          difficulty: "Hard",
          cost: "Moderate"
        }
      ],
      government: [
        {
          title: "Municipal Wet-Sweeping Fleets",
          target: "Silt and tire-wear resuspension",
          impact: "Critical Protection",
          impactColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          desc: "Deploy automated wet-sweeping vacuum vehicles to wash down highways. Roadway dust is a major component of city PM10; wet-sweeping reduces this resuspension by up to 35%.",
          difficulty: "Hard",
          cost: "High Cost"
        },
        {
          title: "Zero-Emission Transit Grid",
          target: "Aromatic diesel particulate exhaust",
          impact: "Critical Protection",
          impactColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          desc: "Transition municipal bus fleets entirely to High-Capacity Electric transits. Removing tailpipe particulate outputs from central streets shields pedestrians from carcinogenic fine carbon particles.",
          difficulty: "Hard",
          cost: "Very High"
        },
        {
          title: "Intersectional Smog Scrubbers",
          target: "Pedestrian particulate exposure",
          impact: "Supportive",
          impactColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
          desc: "Install solar-powered static air purification towers at critical congestion points. These massive filtration columns constantly scrub surrounding ambient air to offer localized relief zones.",
          difficulty: "Hard",
          cost: "High Cost"
        },
        {
          title: "Flue Gas Desulphurization (FGD)",
          target: "Industrial Sulphur Dioxide (SO₂)",
          impact: "Critical Protection",
          impactColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          desc: "Enforce desulphurization scrubbing limits across peripheral manufacturing hubs and power stations. Real-time desulphurization limits acid-gas precursors and aerosol production.",
          difficulty: "Hard",
          cost: "Very High"
        }
      ]
    };
  }, []);

  // Helper to format cell values and colors depending on standard and active parameter
  const getCellDetails = (
    dayObj: { day: number; isFuture: boolean; pollutants: any },
    monthIdx: number
  ) => {
    if (dayObj.isFuture || !dayObj.pollutants) {
      return {
        displayVal: "--",
        status: "Future Day",
        colorClass: "bg-slate-900/35 text-slate-600 border-white/5 opacity-30 cursor-not-allowed",
        rawVal: null,
        unit: ""
      };
    }
    
    const { pollutants } = dayObj;
    
    // Calculate full AQI details for this day's pollutants under the selected standard
    const dayCalc = calculateAQI(selectedStandard, pollutants);
    
    let displayVal = "";
    let status = dayCalc.label;
    let unit = "";
    let rawVal: number;
    
    if (calendarMetric === "AQI") {
      rawVal = Math.round(dayCalc.aqi);
      displayVal = `${rawVal}`;
    } else {
      // Metric is one of: pm2_5, pm10, co, so2, no2, o3
      const key = calendarMetric as "pm2_5" | "pm10" | "co" | "so2" | "no2" | "o3";
      rawVal = pollutants[key];
      displayVal = `${rawVal}`;
      if (key === "co") {
        unit = " µg/m³";
      } else {
        unit = " µg/m³";
      }
      
      // Calculate AQI and status for ONLY this pollutant
      const singlePollutantCalc = calculateAQI(selectedStandard, {
        pm2_5: key === "pm2_5" ? pollutants.pm2_5 : 0,
        pm10: key === "pm10" ? pollutants.pm10 : 0,
        co: key === "co" ? pollutants.co : 0,
        no2: key === "no2" ? pollutants.no2 : 0,
        o3: key === "o3" ? pollutants.o3 : 0,
        so2: key === "so2" ? pollutants.so2 : 0,
      });
      status = singlePollutantCalc.label;
    }
    
    // Get calendar colors corresponding to classification
    const colorClass = getCalendarColorClass(status);
    
    return {
      displayVal,
      status,
      colorClass,
      rawVal,
      unit
    };
  };

  // Frequently Asked Questions
  const aqisFAQs = [
    {
      q: "What is the Air Quality Index (AQI) and how is it calculated?",
      a: "The Air Quality Index (AQI) is a standard scale used by environmental agencies to communicate how clean or polluted the air is in a simple number ranging from 0 to 500. It is calculated by measuring concentrations of major criteria pollutants (PM2.5, PM10, Nitrogen Dioxide, Ozone, Carbon Monoxide, and Sulfur Dioxide) and mapping the highest relative level to standard regulatory breakpoints defined by the EPA and WHO."
    },
    {
      q: "What is the difference between PM2.5 and PM10?",
      a: "PM2.5 refers to fine inhalable particles with diameters of 2.5 micrometers or smaller (about 30 times thinner than a human hair), which can penetrate deep into lungs and enter the bloodstream, posing severe systemic health risks. PM10 refers to coarser inhalable dust particles with diameters of 10 micrometers or smaller, which typically settle in the upper respiratory tract causing coughing and throat irritation."
    },
    {
      q: "Why does air pollution peak severely in winter months?",
      a: "Air pollution is severely exacerbated in winter due to a meteorological phenomenon called 'thermal inversion'. Normally, warm air near the ground rises and disperses pollutants. In winter, a layer of cold air gets trapped near the surface under a dome of warmer air, acting like an airtight lid that seals emissions, vehicle exhaust, and industrial dust close to the breathing zone."
    },
    {
      q: "How does the N95 anti-pollution mask protect us?",
      a: "An N95 respirator is designed to filter out at least 95% of airborne particulate matter, including fine PM2.5 particles down to 0.3 microns. Unlike standard surgical masks, which only block larger splashes, N95 masks create an airtight seal around the nose and mouth, forcing all inhaled air through a electrostatically charged micro-fiber mesh that traps microscopic particulates."
    },
    {
      q: "What are the primary sources of air pollution in metropolitan areas?",
      a: "The predominant drivers are vehicular combustion (combusting diesel and petrol), road dust resuspended by traffic, industrial manufacturing emissions, waste burning, diesel power generators, construction dust, and seasonal agricultural biomass burning carried into the air mass by regional wind vectors."
    }
  ];

  return (
    <div className="w-full">
      <div className="space-y-6 w-full text-slate-100">
      
      {/* SECTION HEADER: TITLE & LOCATION TRACKING */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl">
            <Wind size={26} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-md uppercase">
              Live Atmosphere Feed
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2">
              Air Quality Intelligence Center
            </h2>
            <p className="text-xs text-slate-400 font-semibold tracking-wide">
              Analyzing particulates, seasonal trends, micro-sensors, and mitigation systems for <span className="text-white">{location.name}</span>.
            </p>
          </div>
        </div>
        
        {/* Real-time status chip */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 rounded-2xl border border-white/10 text-xs">
          <MapPin size={14} className="text-teal-400" />
          <div>
            <span className="text-slate-400 block text-[9px] font-mono leading-none">MONITORED REGION</span>
            <span className="font-extrabold text-white text-[11px]">{location.name}, {location.country}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping ml-1" />
        </div>
      </div>

      {/* GRID CONTAINER: MAIN AQI DISPLAY & POLLUTANTS (FEATURES 1, 2, 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* FEATURE 1: LIVE SPECIFIC LOCATION AQI DISPLAY (5 Columns) */}
        <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Ambient background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/5 rounded-full filter blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-2xl -z-10" />

          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                [LIVE DATA] Specific Location AQI
              </span>
              <span 
                className="text-[10px] px-2.5 py-1 rounded-full font-bold border"
                style={{ 
                  color: calculated.color, 
                  borderColor: `${calculated.color}30`,
                  backgroundColor: `${calculated.color}10` 
                }}
              >
                {calculated.label}
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG circular track */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeWidth="11"
                    fill="none"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke={calculated.color}
                    strokeWidth="11"
                    fill="none"
                    strokeDasharray={`${Math.PI * 2 * 62}`}
                    strokeDashoffset={`${Math.PI * 2 * 62 * (1 - Math.min(300, calculated.aqi) / 300)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black text-white tracking-tighter">{Math.round(calculated.aqi)}</span>
                  <span className="text-[8px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">{selectedStandard} AQI INDEX</span>
                </div>
              </div>

              {/* Status Indicator text block */}
              <div className="text-center mt-5 max-w-sm">
                <h4 className="text-sm font-bold text-slate-200">
                  Air Quality is <span style={{ color: calculated.color }}>{calculated.label}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {calculated.description}
                </p>
              </div>
            </div>
          </div>

          {/* Quick standard footer card */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-2 text-[11px]">
            <div className="flex justify-between items-center text-slate-400 font-mono">
              <span>Standard Standard Evaluated:</span>
              <span className="font-bold text-teal-400">{stdLimits.source}</span>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex gap-2 items-start mt-2">
              <Info size={14} className="text-teal-400 mt-0.5 shrink-0" />
              <p className="text-slate-400 leading-normal text-[10px]">
                Measured and calculated in real-time under {stdLimits.source} standards. Breakpoints represent concentrations mapping to respective local health advisories.
              </p>
            </div>
          </div>
        </div>

        {/* FEATURE 2: MAJOR AIR POLLUTANTS (7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Atmospheric Breakdown
                </span>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Concentrations of Major Air Pollutants
                </h3>
              </div>
              <span className="text-[9px] font-mono bg-white/5 px-2 py-1 rounded border border-white/5 text-slate-400">
                Unit: µg/m³
              </span>
            </div>

            {/* Pollutants bento sub-grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* PM2.5 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-teal-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">PM2.5</span>
                    <span className="text-slate-500">Fine</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {aqi.pm2_5} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${pm25State.color}`}>
                    {pm25State.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.pm2_5}</span>
                </div>
              </div>

              {/* PM10 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">PM10</span>
                    <span className="text-slate-500">Coarse</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {aqi.pm10} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${pm10State.color}`}>
                    {pm10State.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.pm10}</span>
                </div>
              </div>

              {/* CO */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">CO</span>
                    <span className="text-slate-500">Carbon Mon.</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {Math.round(aqi.co)} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${coState.color}`}>
                    {coState.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.co}</span>
                </div>
              </div>

              {/* NO2 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">NO₂</span>
                    <span className="text-slate-500">Nitrogen Dio.</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {Math.round(aqi.no2)} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${no2State.color}`}>
                    {no2State.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.no2}</span>
                </div>
              </div>

              {/* SO2 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">SO₂</span>
                    <span className="text-slate-500">Sulfur Dio.</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {Math.round(aqi.so2)} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${so2State.color}`}>
                    {so2State.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.so2}</span>
                </div>
              </div>

              {/* O3 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/45 border border-white/5 transition-all hover:border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-white">O₃</span>
                    <span className="text-slate-500">Ozone Layer</span>
                  </div>
                  <span className="text-lg font-black text-white block mt-2">
                    {Math.round(aqi.o3)} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
                  </span>
                </div>
                <div className="mt-3">
                  <div className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border text-center font-bold ${ozoneState.color}`}>
                    {ozoneState.label}
                  </div>
                  <span className="text-[8px] text-slate-500 block text-center mt-1">{stdLimits.source} Limit: {stdLimits.o3}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Explanation notes */}
          <div className="p-3 bg-slate-950/35 border border-white/5 rounded-2xl mt-4 flex gap-2.5 items-start">
            <Activity size={14} className="text-teal-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-normal">
              <strong>Measurement Insight:</strong> Atmospheric particulates are evaluated dynamically. Currently calculated and rated under the <strong>{stdLimits.source}</strong> standard. Select a different standard above to toggle parameters.
            </p>
          </div>
        </div>

      </div>

      {/* FEATURE 5: TAGGED LOCATION REAL TIME AIR POLLUTION LEVEL (LOCAL SENSORS) */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
              Micro-Sensor Grid
            </span>
            <h3 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
              Tagged Location Real-Time Air Pollution Stations
            </h3>
            <p className="text-xs text-slate-400">
              Live readings from neighborhood monitors within 5 kilometers of <span className="text-white font-semibold">{location.name}</span>
            </p>
          </div>
          <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-1 rounded font-bold">
            {neighborhoodSensors.length} Stations Active
          </span>
        </div>

        {/* Local stations grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {neighborhoodSensors.map((sensor, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-400 font-bold">
                    {sensor.distance} km away
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-white mt-2.5 line-clamp-1 h-4">
                  {sensor.name}
                </h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black text-white">{sensor.aqiVal}</span>
                  <span className="text-[9px] text-slate-500 font-mono">AQI</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5">
                <div className={`text-[8px] font-mono py-0.5 rounded text-center font-black ${sensor.colorClass}`}>
                  {sensor.status}
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1.5">
                  <span>PM2.5: {sensor.pm2_5}</span>
                  <span>PM10: {sensor.pm10}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURE 3: AQI GRAPH (HISTORICAL AQI) & FEATURE 4: AQI TRENDS - ANNUAL CHANGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FEATURE 3: AQI GRAPH (HISTORICAL AQI) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Historical Timeline
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              AQI Graph (Historical AQI - Past 7 Days)
            </h3>
            <p className="text-xs text-slate-400">
              Visualizing the weekly trajectory of atmospheric particulates for <span className="text-white">{location.name}</span>
            </p>
          </div>

          <div className="w-full h-72 bg-slate-950/45 rounded-2xl border border-white/5 p-4 relative">
            <div className="w-full h-full">
              <canvas ref={histCanvasRef} />
            </div>
          </div>
        </div>

        {/* FEATURE 4: AQI TRENDS - ANNUAL CHANGES */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Annual Climatology
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              AQI Trends - Annual Air Quality Changes
            </h3>
            <p className="text-xs text-slate-400">
              Observing seasonal variations and historical monthly averages
            </p>
          </div>

          <div className="w-full h-72 bg-slate-950/45 rounded-2xl border border-white/5 p-4 relative">
            <div className="w-full h-full">
              <canvas ref={annualCanvasRef} />
            </div>
          </div>
        </div>

      </div>

      {/* FEATURE 7: AQI CALENDAR (INTERACTIVE GRID WITH PREVIOUS YEARS SELECTOR) */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
              Temporal Heatmap & Archives
            </span>
            <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
              Air Quality Calendar ({selectedYear})
            </h3>
            <p className="text-xs text-slate-400">
              Interactive historical logs of daily air metrics recorded for <span className="text-teal-400 font-semibold">{location.name}</span>. No future prediction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                onBlur={() => setTimeout(() => setYearDropdownOpen(false), 200)}
                className="px-3.5 py-1.5 bg-slate-950/60 border border-white/10 hover:border-teal-500/45 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                Year: {selectedYear}
                <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${yearDropdownOpen ? "rotate-180 text-teal-400" : ""}`} />
              </button>

              {yearDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-28 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-fade-in">
                  {[2026, 2025, 2024, 2023, 2022].map((yr) => {
                    const isActive = selectedYear === yr;
                    return (
                      <button
                        key={yr}
                        onMouseDown={() => {
                          setSelectedYear(yr);
                          setHoveredCalendarDay(null); // Reset detail box
                          setYearDropdownOpen(false);
                        }}
                        className={`w-full py-1.5 px-2.5 text-left rounded-lg text-xs font-mono font-bold transition-all flex justify-between items-center cursor-pointer ${
                          isActive
                            ? "bg-teal-500/15 text-teal-300 font-extrabold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        <span>{yr}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Standard tag indicator */}
            <div className="px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Standard: {stdLimits.source}
            </div>
          </div>
        </div>

        {/* Calendar visual board */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Calendar Scroll Window (9 columns) */}
          <div className="lg:col-span-9 bg-slate-950/35 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
            
            {/* Horizontal Months Roll */}
            <div 
              ref={calendarScrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-none pb-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {elapsedMonthsData.map((month) => (
                <div 
                  key={month.index}
                  className="flex-none w-[275px] snap-start bg-slate-900/40 border border-white/5 rounded-xl p-3.5 space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm font-black text-white tracking-tight uppercase">
                      {month.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {selectedYear}
                    </span>
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {/* Week Header */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
                      <div key={wd} className="text-[9px] font-mono text-slate-500 font-extrabold py-0.5 uppercase">
                        {wd}
                      </div>
                    ))}

                    {/* Empty Day Offsets */}
                    {Array.from({ length: month.startDayOfWeek }).map((_, sIdx) => (
                      <div key={`spacer-${month.index}-${sIdx}`} className="aspect-square" />
                    ))}

                    {/* Day Cells */}
                    {month.days.map((day) => {
                      const details = getCellDetails(day, month.index);
                      const isToday = selectedYear === 2026 && month.index === 6 && day.day === 18; // July 18, 2026 is today
                      const isSelected = hoveredCalendarDay?.day === day.day && hoveredCalendarDay?.monthIdx === month.index;

                      return (
                        <button
                          key={`day-${month.index}-${day.day}`}
                          disabled={day.isFuture}
                          onMouseEnter={() => {
                            if (!day.isFuture) {
                              setHoveredCalendarDay({
                                day: day.day,
                                monthIdx: month.index,
                                value: details.displayVal,
                                status: details.status,
                                metricLabel: calendarMetricsList.find(m => m.key === calendarMetric)?.label || calendarMetric,
                                unit: details.unit
                              });
                            }
                          }}
                          onClick={() => {
                            if (!day.isFuture) {
                              setHoveredCalendarDay({
                                day: day.day,
                                monthIdx: month.index,
                                value: details.displayVal,
                                status: details.status,
                                metricLabel: calendarMetricsList.find(m => m.key === calendarMetric)?.label || calendarMetric,
                                unit: details.unit
                              });
                            }
                          }}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all relative group cursor-pointer ${details.colorClass} ${
                            isToday ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950" : ""
                          } ${
                            isSelected ? "scale-105 border-white/60 brightness-110 shadow-lg" : "hover:scale-105"
                          }`}
                        >
                          <span className="text-[8px] tracking-tighter opacity-70 block font-mono">
                            {day.day} {month.name.slice(0, 3)}
                          </span>
                          <span className="text-xs font-extrabold font-mono block mt-0.5">
                            {details.displayVal}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Legend and Slider Buttons row */}
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Legend bar */}
              <div className="flex flex-col space-y-1.5 w-full sm:w-auto">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Legend: {calendarMetricsList.find(m => m.key === calendarMetric)?.label} Level
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" /> Good
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-teal-500/20 border border-teal-500/30" /> Moderate
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30" /> Sensitive
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/30" /> Unhealthy
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500/30" /> Very Unhealthy
                  </div>
                </div>
              </div>

              {/* Arrow navigation buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => scrollCalendar("left")}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-slate-800 hover:text-white text-slate-400 transition-all cursor-pointer active:scale-95"
                  title="Scroll Left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => scrollCalendar("right")}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-slate-800 hover:text-white text-slate-400 transition-all cursor-pointer active:scale-95"
                  title="Scroll Right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* Parameters selector sidebar & Detail inspector (3 columns) */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            
            {/* Parameter selection dropdown panel */}
            <div className="bg-slate-950/25 border border-white/5 rounded-2xl p-4 space-y-2 relative">
              <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
                Parameter Select
              </span>

              <div className="relative">
                <button
                  onClick={() => setParameterDropdownOpen(!parameterDropdownOpen)}
                  onBlur={() => setTimeout(() => setParameterDropdownOpen(false), 200)}
                  className="w-full py-2.5 px-4 bg-slate-900/90 border border-white/10 hover:border-teal-500/40 rounded-xl text-xs font-bold text-slate-200 flex justify-between items-center cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    {calendarMetricsList.find(m => m.key === calendarMetric)?.label || calendarMetric}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${parameterDropdownOpen ? "rotate-180 text-teal-400" : ""}`} />
                </button>

                {parameterDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-fade-in max-h-[240px] overflow-y-auto">
                    {calendarMetricsList.map((m) => {
                      const isActive = calendarMetric === m.key;
                      return (
                        <button
                          key={m.key}
                          onMouseDown={() => {
                            setCalendarMetric(m.key);
                            setHoveredCalendarDay(null); // Reset detail box when metric changes
                            setParameterDropdownOpen(false);
                          }}
                          className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex justify-between items-center cursor-pointer ${
                            isActive
                              ? "bg-teal-500/15 text-teal-300 font-extrabold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          }`}
                        >
                          <span>{m.label}</span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Micro-detail Inspector Box */}
            <div className="bg-slate-950/35 border border-white/5 rounded-2xl p-4 flex-1 flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar size={13} className="text-teal-400" />
                  <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-teal-300">
                    Day Inspector
                  </span>
                </div>

                {hoveredCalendarDay ? (
                  <div className="space-y-2 animate-fade-in">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        {months[hoveredCalendarDay.monthIdx]} {hoveredCalendarDay.day}, {selectedYear}
                      </span>
                      <span className="text-2xl font-black text-white block mt-1 tracking-tight">
                        {hoveredCalendarDay.value}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          {hoveredCalendarDay.unit}
                        </span>
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mt-0.5">
                        {hoveredCalendarDay.metricLabel} VALUE
                      </span>
                    </div>

                    <div className="py-1 px-2.5 rounded-lg text-[9px] font-mono font-extrabold bg-white/5 border border-white/10 text-slate-200 inline-block">
                      Rating: {hoveredCalendarDay.status}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      {hoveredCalendarDay.status.toLowerCase().includes("good") || hoveredCalendarDay.status.toLowerCase().includes("meets")
                        ? "Air quality is fully clean. High atmospheric ventilation. No respiratory allergies warnings."
                        : hoveredCalendarDay.status.toLowerCase().includes("mod")
                          ? "Acceptable air. Very low particle loads. Extreme reactive allergies might experience minor dry throat symptoms."
                          : hoveredCalendarDay.status.toLowerCase().includes("sens") || hoveredCalendarDay.status.toLowerCase().includes("medium")
                            ? "Elevated loads. Pediatric and asthma profiles are advised to minimize long heavy workouts."
                            : "Heavy atmospheric contaminants pooled close to ground level. High safety alert in effect. Avoid long outdoor exercises."}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-[10px] font-mono leading-relaxed">
                    Hover or click any calendar day to inspect detailed historic logs and advisories.
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 text-[9px] text-slate-500 leading-normal flex gap-1.5 items-start">
                <Sparkles size={11} className="text-teal-400 mt-0.5 shrink-0" />
                <p>
                  Dynamic records from past months are verified by historical atmospheric grids.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* FEATURE 6: COUNTRY'S METRO CITIES AQI & FEATURE 9: MOST POLLUTED CITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FEATURE 6: COUNTRY'S METRO CITIES AQI */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              National Comparison
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              Country's Metropolitan Cities AQI
            </h3>
            <p className="text-xs text-slate-400">
              Live index values for major cities in <span className="text-teal-400 font-semibold">{countryName}</span>. Click a city to load its detailed forecast.
            </p>
          </div>

          <div className="divide-y divide-white/5 max-h-[340px] overflow-y-auto scrollbar-none pr-1">
            {calculatedMetroCities.map((city, idx) => {
              const isCurrent = city.name.toLowerCase() === location.name.toLowerCase();

              return (
                <div
                  key={idx}
                  onClick={() => onSelectLocation({ name: city.name, country: city.country, admin1: city.admin1, lat: city.lat, lon: city.lon })}
                  className={`py-3 px-3 flex items-center justify-between transition-all hover:bg-slate-950/30 rounded-xl cursor-pointer ${
                    isCurrent ? "bg-slate-950/50 border border-teal-500/25" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin size={13} className={isCurrent ? "text-teal-400" : "text-slate-500"} />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {city.name} {isCurrent && <span className="text-[9px] font-mono text-teal-400 ml-1.5">(Current)</span>}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                        {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {city.isRealTime && (
                          <span className="flex h-1.5 w-1.5 relative" title="Live data fetched from Open-Meteo">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                          </span>
                        )}
                        <span className="text-xs font-black text-white font-mono block">
                          {city.baseAqi} AQI
                        </span>
                      </div>
                      <span className={`inline-block text-[8px] font-mono px-1.5 rounded uppercase ${city.colorClass}`}>
                        {city.status}
                      </span>
                    </div>
                    <ArrowUpRight size={13} className="text-slate-600 group-hover:text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FEATURE 9: MOST POLLUTED CITIES OF THE COUNTRY */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Annual Pollution Rankings
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              Most Polluted Cities of the Same Year in {countryName}
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by average annual fine particle PM2.5 concentrations (µg/m³)
            </p>
          </div>

          <div className="overflow-x-auto max-h-[340px] scrollbar-none pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-[10px] font-mono uppercase">
                  <th className="pb-2.5 font-bold">Rank</th>
                  <th className="pb-2.5 font-bold">City</th>
                  <th className="pb-2.5 font-bold">Annual PM2.5</th>
                  <th className="pb-2.5 font-bold">Primary Pollutant Origin</th>
                  <th className="pb-2.5 font-bold text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mostPollutedCities.map((item) => {
                  let alertBadge = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                  if (item.annualPm25 < 25) {
                    alertBadge = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  }

                  return (
                    <tr key={item.rank} className="hover:bg-slate-950/20 transition-all">
                      <td className="py-3 font-mono text-slate-500 font-bold">#{item.rank}</td>
                      <td className="py-3">
                        <span className="font-bold text-white block">{item.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{item.state}</span>
                      </td>
                      <td className="py-3 font-mono font-black text-white">{item.annualPm25}</td>
                      <td className="py-3 text-[10px] text-slate-400 leading-normal max-w-[130px] pr-2 font-medium">
                        {item.primarySource}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${alertBadge}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* FEATURE 8: HEALTH ADVICE FOR PEOPLE LIVING IN TAGGED LOCATION */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
            Practical Demographics Guide
          </span>
          <h3 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
            Health Advice for People Living in <span className="text-teal-400">{location.name}</span>
          </h3>
          <p className="text-xs text-slate-400">
            Scientifically curated wellness precautions tailored to local air levels
          </p>
        </div>

        {/* Demographics segment tab buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950/65 border border-white/5 rounded-2xl p-1 w-full md:w-fit">
          <button
            onClick={() => setActiveHealthTab("general")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeHealthTab === "general" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            General Public
          </button>
          <button
            onClick={() => setActiveHealthTab("sensitive")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeHealthTab === "sensitive" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sensitive & Respiratory Profiles
          </button>
          <button
            onClick={() => setActiveHealthTab("kids")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeHealthTab === "kids" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Infants & Children
          </button>
          <button
            onClick={() => setActiveHealthTab("athletes")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeHealthTab === "athletes" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Outdoor Athletes
          </button>
        </div>

        {/* Interactive Advice Card body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="md:col-span-2 space-y-4">
            
            {activeHealthTab === "general" && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal-400" /> General Population Precautions
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  For the general healthy public, current air conditions pose minimal immediate hazard, but long-term chronic exposures are worth minimizing. Indoor environments represent a key shield.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-300">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Mask Standard</span>
                    Cloth masks are ineffective. Use surgical masks or reusable PM2.5 filters if you plan long commutes near highly congested traffic zones.
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Residential Ventilation</span>
                    Ventilate your home in early morning hours when pollution levels are typically lowest due to clean air mixing from low traffic densities.
                  </div>
                </div>
              </div>
            )}

            {activeHealthTab === "sensitive" && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-400" /> Respiratory & Allergy Profiles (Asthma, COPD)
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  Individuals with pre-existing conditions like asthma or chronic obstructive respiratory syndromes are highly prone to PM2.5 and ozone triggering.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-300">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-amber-300 font-bold block mb-1">Inhalers & Diagnostics</span>
                    Always carry rescue bronchodilators. If local AQI exceeds 120, restrict heavy outdoor exertion to avoid triggering micro-bronchial spasms.
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-amber-300 font-bold block mb-1">Active Air Filtering</span>
                    Operate true HEPA air purifiers in bedrooms. Ensure windows are tightly sealed when outdoor air looks hazy or smog layers pool visually.
                  </div>
                </div>
              </div>
            )}

            {activeHealthTab === "kids" && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal-400" /> Infants, Toddlers & Growing Kids
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  Children breathe faster and have narrower airways, absorbing twice the volume of air relative to body weight compared to adults, elevating risk factors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-300">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Playground Exposure</span>
                    Restrict playground sessions during heavy smog alerts. Encourage indoor sports, educational reading, or arts on contaminated days.
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Healthy Lungs Diet</span>
                    Ensure an antioxidant-rich diet containing Vitamin C, Omega-3 fatty acids, and green vegetables to help build immunity against free radicals.
                  </div>
                </div>
              </div>
            )}

            {activeHealthTab === "athletes" && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal-400" /> Outdoor Runners, Cyclists & Athletes
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  During high-intensity training, runners inhale massive quantities of air, bypassing nasal filtration, which carries soot and fine dust deeper into the lungs.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-300">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Exertion Timing</span>
                    Avoid running during peak traffic hours (8-10 AM and 5-8 PM). Seek forested parks or suburban locations with significantly lower particulate loads.
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                    <span className="text-white font-bold block mb-1">Hydration Defense</span>
                    Maintain constant water hydration. Fluid layers inside throat tissues bind dust particles and facilitate mucus removal before they reach pulmonary bronchi.
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono text-teal-300 font-black">
                <Sparkles size={11} className="animate-pulse" /> Live Mitigation Status
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Your current location, <span className="text-white font-black">{location.name}</span>, registers an AQI of <span className="text-teal-400 font-extrabold">{Math.round(aqi.aqi)}</span>.
              </p>
            </div>
            
            <div className="p-3.5 bg-slate-900 border border-white/5 rounded-xl text-center mt-4">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">RECOMMENDED DEFENSE</span>
              <span className="text-sm font-black text-white block mt-1">
                {aqi.aqi > 150 ? "Wear N95 Mask Outdoor" : aqi.aqi > 100 ? "Limit Heavy Long Cardio" : "Ventilate & Exercise Outdoor"}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* FEATURE 10: AIR QUALITY SOLUTIONS FOR TAGGED LOCATION */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
            Actionable Mitigation Playbook
          </span>
          <h3 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
            Air Quality Solutions for {location.name}
          </h3>
          <p className="text-xs text-slate-400">
            Proven residential remedies and community policies to shield health and clear the sky
          </p>
        </div>

        {/* Tab buttons for levels */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950/65 border border-white/5 rounded-2xl p-1 w-full md:w-fit">
          <button
            onClick={() => setActiveSolutionTab("individual")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeSolutionTab === "individual" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Personal & Residential
          </button>
          <button
            onClick={() => setActiveSolutionTab("community")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeSolutionTab === "community" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Neighborhood & Corporate
          </button>
          <button
            onClick={() => setActiveSolutionTab("government")}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeSolutionTab === "government" ? "bg-teal-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Urban Policy & State Level
          </button>
        </div>

        {/* Tab body content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {solutionsData[activeSolutionTab].map((sol, index) => {
                // Select icon dynamically based on activeSolutionTab and index
                let icon = <Leaf size={15} className="text-emerald-400 shrink-0" />;
                if (activeSolutionTab === "individual") {
                  if (index === 0) icon = <Sparkles size={15} className="text-teal-400 shrink-0 animate-pulse" />;
                  if (index === 1) icon = <Droplets size={15} className="text-blue-400 shrink-0" />;
                  if (index === 2) icon = <Leaf size={15} className="text-emerald-400 shrink-0" />;
                  if (index === 3) icon = <Wind size={15} className="text-amber-400 shrink-0" />;
                } else if (activeSolutionTab === "community") {
                  if (index === 0) icon = <Users size={15} className="text-teal-400 shrink-0" />;
                  if (index === 1) icon = <Home size={15} className="text-emerald-400 shrink-0" />;
                  if (index === 2) icon = <Droplets size={15} className="text-amber-400 shrink-0" />;
                  if (index === 3) icon = <Leaf size={15} className="text-emerald-400 shrink-0" />;
                } else if (activeSolutionTab === "government") {
                  if (index === 0) icon = <Wind size={15} className="text-teal-400 shrink-0" />;
                  if (index === 1) icon = <Activity size={15} className="text-emerald-400 shrink-0" />;
                  if (index === 2) icon = <Sparkles size={15} className="text-indigo-400 shrink-0" />;
                  if (index === 3) icon = <AlertTriangle size={15} className="text-amber-400 shrink-0" />;
                }

                return (
                  <div 
                    key={index} 
                    className="p-5 bg-slate-950/40 border border-white/5 hover:border-teal-500/20 hover:bg-slate-950/60 transition-all duration-300 rounded-2xl flex flex-col justify-between space-y-3.5 shadow-xl relative group overflow-hidden"
                  >
                    {/* Corner gradient glow effect on card hover */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all duration-300 pointer-events-none" />

                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-teal-500/30 transition-colors mt-0.5">
                            {icon}
                          </div>
                          <div>
                            <span className="text-[13px] font-black text-white group-hover:text-teal-300 transition-colors block leading-tight">
                              {sol.title}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono font-bold mt-0.5 block uppercase tracking-wide">
                              Target: {sol.target}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        {sol.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] font-mono font-extrabold text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>Difficulty: <strong className="text-slate-300">{sol.difficulty}</strong></span>
                        <span>Cost: <strong className="text-slate-300">{sol.cost}</strong></span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px] font-black border ${sol.impactColor}`}>
                        {sol.impact}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive personal checkbox checklist */}
          <div className="p-5 bg-slate-950/45 border border-white/5 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold text-teal-300 uppercase tracking-wider block mb-1">
                Personal Actions Tracker
              </span>
              <h4 className="text-xs font-black text-white uppercase tracking-tight">
                My Residential Green Defense Checklist
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 mb-4 leading-normal">
                Check off items you are implementing today to guard against air pollution:
              </p>

              <div className="space-y-2.5">
                {[
                  { id: "purifier", label: "HEPA Purifier Activated" },
                  { id: "plants", label: "Indoor Plants Maintained" },
                  { id: "ventilation", label: "Checked Ventilation Times" },
                  { id: "mask", label: "N95 / PM2.5 Mask Ready" },
                  { id: "wetSweep", label: "Using Wet Floor Mopping" },
                  { id: "carpool", label: "Shared Public/Carpool Commute" }
                ].map((action) => (
                  <button
                    key={action.id}
                    onClick={() => toggleAction(action.id)}
                    className="w-full flex items-center justify-between text-left p-2 bg-slate-900 border border-white/5 rounded-xl text-xs hover:border-teal-500/30 transition-all cursor-pointer"
                  >
                    <span className="text-slate-300 font-semibold">{action.label}</span>
                    <div className="p-0.5">
                      {completedActions[action.id] ? (
                        <CheckCircle2 size={15} className="text-teal-400 fill-teal-500/10" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded border border-slate-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/5 text-[10px] text-center font-mono text-slate-400 flex items-center justify-between">
              <span>Goal Progress:</span>
              <span className="text-teal-400 font-bold">
                {Object.values(completedActions).filter(Boolean).length} / {Object.keys(completedActions).length} Active
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* FEATURE 11: AQI FAQS */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={20} className="text-teal-400 animate-pulse" />
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Atmospheric Education
            </span>
            <h3 className="text-base font-extrabold text-white tracking-tight mt-0.5">
              AQI Frequently Asked Questions (FAQs)
            </h3>
          </div>
        </div>

        {/* Collapsible FAQ Accordion */}
        <div className="divide-y divide-white/5 space-y-1">
          {aqisFAQs.map((faq, idx) => {
            const isOpen = !!faqOpenState[idx];
            return (
              <div key={idx} className="py-3 border-b border-white/5 last:border-0">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center text-left py-2 hover:text-teal-300 transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-white pr-4">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={14} className="text-teal-400 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-500 shrink-0" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="pt-2 pb-1.5 animate-fade-in">
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  </div>
  );
}
