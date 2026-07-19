import { AirQuality } from "../types.js";
import { AlertCircle, ShieldAlert, Wind, HelpCircle, ShieldCheck } from "lucide-react";

interface AirQualityIndicatorProps {
  aqi: AirQuality;
}

export default function AirQualityIndicator({ aqi }: AirQualityIndicatorProps) {
  // Compute safe threshold ratings based on EPA / WHO standards
  const getSubstanceStatus = (val: number, standard: number) => {
    return val <= standard 
      ? { label: "Excellent", color: "text-emerald-400 bg-emerald-500/10" } 
      : { label: "Elevated", color: "text-amber-400 bg-amber-500/10" };
  };

  const pm25State = getSubstanceStatus(aqi.pm2_5, 12.0); // 12 mcg/m3 annual EPA standard
  const pm10State = getSubstanceStatus(aqi.pm10, 54.0); // 54 mcg/m3 24h standard
  const ozoneState = getSubstanceStatus(aqi.o3, 100.0); // 100 mcg/m3 standard
  const no2State = getSubstanceStatus(aqi.no2, 100.0); // 100 mcg/m3 standard
  const coState = getSubstanceStatus(aqi.co, 1000.0); // 1000 mcg/m3 standard
  const so2State = getSubstanceStatus(aqi.so2, 20.0); // 20 mcg/m3 standard

  return (
    <div id="air-quality-intelligence" className="bg-slate-900/40 backdrop-blur-md border border-slate-200/10 rounded-2xl p-4 md:p-6 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Wind size={18} className="text-teal-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">Air Quality Index</h3>
          </div>
          <span 
            className="text-[10px] px-2 py-1 rounded-full font-semibold border"
            style={{ 
              color: aqi.color, 
              borderColor: `${aqi.color}30`,
              backgroundColor: `${aqi.color}10` 
            }}
          >
            {aqi.label}
          </span>
        </div>

        {/* Circular gauge or bar visual */}
        <div className="flex flex-col items-center py-4 relative">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Simple SVG Track Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke={aqi.color}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${Math.PI * 2 * 48}`}
                strokeDashoffset={`${Math.PI * 2 * 48 * (1 - Math.min(100, (aqi.aqi / 300)))}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white tracking-tight">{Math.round(aqi.aqi)}</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">US AQI</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-300 mt-4 leading-relaxed max-w-sm">
            {aqi.description}
          </p>
        </div>
      </div>

      {/* Breakdown metrics */}
      <div className="mt-4 pt-4 border-t border-slate-200/5 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">Detailed Atmospheric Pollutants</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">PM2.5</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{aqi.pm2_5} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${pm25State.color}`}>
              {pm25State.label}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">PM10</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{aqi.pm10} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${pm10State.color}`}>
              {pm10State.label}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">CO</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{Math.round(aqi.co)} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${coState.color}`}>
              {coState.label}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">SO₂</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{Math.round(aqi.so2)} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${so2State.color}`}>
              {so2State.label}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">NO₂</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{Math.round(aqi.no2)} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${no2State.color}`}>
              {no2State.label}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/20 border border-slate-200/5 text-center">
            <span className="text-[10px] text-slate-400 block font-mono font-medium">O₃ (Ozone)</span>
            <span className="text-xs font-bold text-slate-200 block mt-0.5">{Math.round(aqi.o3)} <span className="text-[8px] text-slate-500 font-normal">µg/m³</span></span>
            <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 ${ozoneState.color}`}>
              {ozoneState.label}
            </span>
          </div>
        </div>

        {/* Health Advisory Guidelines */}
        <div className="p-3 bg-slate-950/35 border border-slate-200/5 rounded-xl flex gap-3 items-start">
          {aqi.aqi > 100 ? (
            <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          )}
          <div className="text-[10px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200 block mb-0.5">Atmosphere Advisory</span>
            {aqi.aqi > 100 
              ? "Sensitive respiratory systems should restrict heavy cardio. Keep windows sealed to filter external air."
              : "Excellent day to ventilate residences! Outdoor activities and aerobic workouts are completely clear."}
          </div>
        </div>
      </div>
    </div>
  );
}
