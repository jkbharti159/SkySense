import { useState, useEffect } from "react";
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  Clock, 
  Compass, 
  TrendingUp, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronRight, 
  Info, 
  Bookmark, 
  Share2, 
  Navigation, 
  Eye, 
  Sliders, 
  Layers, 
  Car, 
  Smile, 
  Activity, 
  CloudRain, 
  ShieldAlert, 
  ArrowLeftRight, 
  Copy, 
  Save,
  RotateCcw
} from "lucide-react";
import { FullWeatherData } from "../types.js";
import { QUICK_ACTIVITIES, PlanningResponse, ActivityConfig } from "../../server/plannerService.ts";

interface AIWeatherPlannerProps {
  weatherData: FullWeatherData;
}

export default function AIWeatherPlanner({ weatherData }: AIWeatherPlannerProps) {
  // Input form state
  const [query, setQuery] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string>("picnic");
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState("This Weekend");
  const [preferredTime, setPreferredTime] = useState("Flexible");
  const [duration, setDuration] = useState("4 Hours");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // App UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [planResult, setPlanResult] = useState<PlanningResponse | null>(null);
  
  // Saved plans state
  const [savedPlans, setSavedPlans] = useState<PlanningResponse[]>([]);
  const [monitoredPlans, setMonitoredPlans] = useState<Record<string, { active: boolean; alert?: string }>>({});
  
  // Comparison state
  const [comparisonSlotA, setComparisonSlotA] = useState<string>("");
  const [comparisonSlotB, setComparisonSlotB] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<"planner" | "saved" | "compare">("planner");
  
  // Notification / share toasts
  const [toastMessage, setToastMessage] = useState("");

  const steps = [
    "Fusing local meteorological parameters...",
    "Running activity suitability index models...",
    "Evaluating risk boundaries and micro-disruptions...",
    "Compiling personalized recommendations..."
  ];

  // Load saved plans on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("skysense_saved_plans");
      if (stored) {
        setSavedPlans(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read saved plans:", e);
    }
  }, []);

  // Save to localstorage helper
  const saveToStorage = (updated: PlanningResponse[]) => {
    try {
      localStorage.setItem("skysense_saved_plans", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save plans:", e);
    }
  };

  // Trigger analysis loader sequence
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Step cycling animation
    const interval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 900);

    try {
      // POST to our server API endpoint
      const response = await fetch("/api/planner/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          activityType: selectedActivity,
          location: weatherData.location.name,
          destination: destination || undefined,
          dateRange,
          preferredTime,
          duration,
          weatherData
        })
      });

      if (!response.ok) {
        throw new Error("Planning API failed");
      }

      const result: PlanningResponse = await response.json();
      
      // Delay slightly so user experiences the premium transition
      setTimeout(() => {
        setPlanResult(result);
        setIsAnalyzing(false);
        clearInterval(interval);
      }, 3600);

    } catch (err) {
      console.error("Failed to fetch plan:", err);
      // Fallback deterministically on error
      setTimeout(() => {
        setIsAnalyzing(false);
        clearInterval(interval);
      }, 3600);
    }
  };

  const handleQuickActivity = (act: ActivityConfig) => {
    setSelectedActivity(act.id);
    setQuery(`I want to plan a ${act.displayName.toLowerCase()} in ${weatherData.location.name}.`);
    if (act.id === "road_trip" || act.id === "weekend_trip") {
      setDestination("Digha");
      setShowAdvanced(true);
    } else {
      setDestination("");
    }
  };

  const handleSavePlan = () => {
    if (!planResult) return;
    
    // Check duplication
    const key = `${planResult.extractedParams.activity}-${planResult.recommendedDate}-${planResult.extractedParams.location}`;
    const exists = savedPlans.some(p => `${p.extractedParams.activity}-${p.recommendedDate}-${p.extractedParams.location}` === key);
    
    if (exists) {
      showToast("Plan is already saved!");
      return;
    }

    const updated = [planResult, ...savedPlans];
    setSavedPlans(updated);
    saveToStorage(updated);
    showToast("✓ Plan saved successfully!");
  };

  const handleDeletePlan = (index: number) => {
    const updated = savedPlans.filter((_, i) => i !== index);
    setSavedPlans(updated);
    saveToStorage(updated);
    showToast("Plan removed.");
  };

  const handleSharePlan = () => {
    if (!planResult) return;
    const text = `🌤️ SkySense Weather Intelligence Plan:
Activity: ${planResult.extractedParams.activity} in ${planResult.extractedParams.location}
Recommended Date: ${planResult.recommendedDate}
Best Window: ${planResult.bestTimeWindow}
Suitability Score: ${planResult.suitabilityScore}/100
Confidence: ${planResult.confidenceLevel}
Recommendation: ${planResult.recommendation}`;
    
    navigator.clipboard.writeText(text);
    showToast("✓ Link and plan details copied to clipboard!");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const toggleMonitoring = (planKey: string) => {
    setMonitoredPlans(prev => {
      const current = prev[planKey];
      if (current?.active) {
        // Disable
        return {
          ...prev,
          [planKey]: { active: false }
        };
      } else {
        // Enable with initial state
        return {
          ...prev,
          [planKey]: { active: true }
        };
      }
    });
    showToast("Plan monitoring toggled.");
  };

  // Simulate a real-time weather disruption change
  const simulateWeatherAlert = (planKey: string, index: number) => {
    const plan = savedPlans[index];
    setMonitoredPlans(prev => ({
      ...prev,
      [planKey]: {
        active: true,
        alert: `🚨 Weather shift detected: High precipitation probability (85%) moving into ${plan.recommendedDate} ${plan.bestTimeWindow}. Disruption risk increased to HIGH. Recommended fallback: Shift to alternative dates.`
      }
    }));
    showToast("⚡ Weather alert shift simulated!");
  };

  // Helper to color code scores
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    if (score >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-cyan-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getRiskColor = (level: "LOW" | "MEDIUM" | "HIGH") => {
    if (level === "LOW") return "text-emerald-400";
    if (level === "MEDIUM") return "text-amber-400";
    return "text-rose-400";
  };

  const getRiskWidth = (level: "LOW" | "MEDIUM" | "HIGH") => {
    if (level === "LOW") return "w-1/4";
    if (level === "MEDIUM") return "w-2/3";
    return "w-full";
  };

  // Find plan details for comparison
  const planAObj = savedPlans.find(p => `${p.extractedParams.activity}-${p.recommendedDate}-${p.extractedParams.location}` === comparisonSlotA);
  const planBObj = savedPlans.find(p => `${p.extractedParams.activity}-${p.recommendedDate}-${p.extractedParams.location}` === comparisonSlotB);

  return (
    <div className="w-full relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-white/10 text-white px-4 py-3 rounded-xl shadow-2xl font-mono text-xs animate-fade-in flex items-center gap-2">
          <Info size={14} className="text-indigo-400" />
          {toastMessage}
        </div>
      )}

      {/* Internal Navigation Sub-tabs */}
      <div className="flex border-b border-white/10 mb-6 font-mono text-xs">
        <button
          onClick={() => setActiveSubTab("planner")}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeSubTab === "planner" ? "border-indigo-400 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles size={13} /> Evaluation Engine
        </button>
        <button
          onClick={() => setActiveSubTab("saved")}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeSubTab === "saved" ? "border-indigo-400 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bookmark size={13} /> Monitored Plans ({savedPlans.length})
        </button>
        <button
          onClick={() => setActiveSubTab("compare")}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeSubTab === "compare" ? "border-indigo-400 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight size={13} /> Plan Comparison
        </button>
      </div>

      {/* ----------------- SUB-TAB A: PLANNING MAIN ENGINE ----------------- */}
      {activeSubTab === "planner" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* LEFT SIDE: Inputs */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Main prompt input card */}
            <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-400" />
                Describe your activity plan
              </h3>
              
              <div className="relative mb-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., I want to plan an outdoor picnic this weekend afternoon with family..."
                  className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none font-mono"
                />
              </div>

              {/* Quick Config Row */}
              <div className="flex justify-between items-center mb-3 text-xs">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                >
                  <Sliders size={12} /> {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
                </button>
              </div>

              {/* Collapsible Advanced Parameters */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-950/40 rounded-xl border border-white/5 animate-fade-in text-[11px] font-mono">
                  <div>
                    <label className="text-slate-500 block mb-1">LOCATION</label>
                    <div className="flex items-center gap-1 bg-slate-950/50 p-2 rounded-lg border border-white/5 text-slate-300">
                      <MapPin size={11} className="text-slate-400" />
                      <span className="truncate">{weatherData.location.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">DESTINATION</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Digha (Optional)"
                      className="w-full bg-slate-950/50 p-2 rounded-lg border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">TIME WINDOW</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full bg-slate-950/50 p-2 rounded-lg border border-white/10 text-slate-300 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="This Weekend">This Weekend</option>
                      <option value="Tomorrow">Tomorrow</option>
                      <option value="Next 3 Days">Next 3 Days</option>
                      <option value="Next 7 Days">Next 7 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">PREFERRED HOUR</label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full bg-slate-950/50 p-2 rounded-lg border border-white/10 text-slate-300 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="Flexible">Flexible</option>
                      <option value="Morning">Morning (6 AM - 11 AM)</option>
                      <option value="Afternoon">Afternoon (11 AM - 4 PM)</option>
                      <option value="Evening">Evening (4 PM - 8 PM)</option>
                      <option value="Night">Night (8 PM - 12 AM)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !query.trim()}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed font-bold text-white text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
              >
                <Sparkles size={13} className={isAnalyzing ? "animate-spin" : ""} />
                {isAnalyzing ? "Generating AI Plan..." : "Analyze & Optimize Plan"}
              </button>
            </div>

            {/* Quick Activity Selection Group */}
            <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4">
              <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                <Compass size={12} /> Predefined Activity Modes
              </h4>
              <p className="text-[11px] text-slate-400 mb-3 font-mono leading-relaxed">
                Click a preset mode to automatically populate the natural language query model.
              </p>

              <div className="space-y-3.5">
                <div>
                  <span className="text-[9px] font-black font-mono text-slate-500 block mb-1.5 uppercase">TRAVEL & SIGHTSEEING</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIVITIES.filter(a => a.category === "TRAVEL").map(act => (
                      <button
                        key={act.id}
                        onClick={() => handleQuickActivity(act)}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedActivity === act.id
                            ? "bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-950/70"
                        }`}
                      >
                        {act.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black font-mono text-slate-500 block mb-1.5 uppercase">OUTDOOR SPORTS & RECREATION</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIVITIES.filter(a => a.category === "OUTDOOR").map(act => (
                      <button
                        key={act.id}
                        onClick={() => handleQuickActivity(act)}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedActivity === act.id
                            ? "bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-950/70"
                        }`}
                      >
                        {act.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black font-mono text-slate-500 block mb-1.5 uppercase">CELEBRATIONS & EVENTS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIVITIES.filter(a => a.category === "EVENTS").map(act => (
                      <button
                        key={act.id}
                        onClick={() => handleQuickActivity(act)}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedActivity === act.id
                            ? "bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-950/70"
                        }`}
                      >
                        {act.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black font-mono text-slate-500 block mb-1.5 uppercase">SPECIALIZED LOGISTICS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIVITIES.filter(a => a.category === "SPECIALIZED").map(act => (
                      <button
                        key={act.id}
                        onClick={() => handleQuickActivity(act)}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedActivity === act.id
                            ? "bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-950/70"
                        }`}
                      >
                        {act.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Analysis loaders and evaluation output */}
          <div className="lg:col-span-7">
            {/* Loader transition screen */}
            {isAnalyzing ? (
              <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[460px] text-center">
                <div className="relative w-16 h-16 mb-6">
                  {/* Outer spinning dash ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  {/* Inner pulsing spark */}
                  <div className="absolute inset-2 bg-indigo-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles size={18} className="text-indigo-400" />
                  </div>
                </div>

                <div className="h-6 overflow-hidden max-w-sm mb-4">
                  <span className="block text-sm text-slate-200 font-mono font-bold animate-pulse">
                    {steps[analysisStep]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-48 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${((analysisStep + 1) / steps.length) * 100}%` }} 
                  />
                </div>
                
                <p className="text-[10px] font-mono text-slate-500 mt-6 tracking-widest uppercase">
                  SkySense AI Planner Engine v2.4
                </p>
              </div>
            ) : planResult ? (
              /* ACTIVE EVALUATION OUTPUT */
              <div className="space-y-5 animate-fade-in">
                {planResult.isFallback && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-[11px] text-amber-300/90 leading-relaxed">
                    <Info size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5">
                        {planResult.fallbackReason === "quota_exceeded" 
                          ? "Deterministic Fallback Planner Active (Quota Exceeded)" 
                          : planResult.fallbackReason === "no_api_key" 
                            ? "Offline Local Planner Active (No API Key)" 
                            : "Local Weather Planner Active"}
                      </span>
                      {planResult.fallbackReason === "quota_exceeded" ? (
                        <span>
                          The daily Gemini API quota limit has been reached (429 Rate Limit). 
                          We have safely activated our local deterministic weather engine to structure and score your activity itinerary.
                        </span>
                      ) : planResult.fallbackReason === "no_api_key" ? (
                        <span>
                          Gemini API is not configured. Utilizing our local high-precision deterministic meteorological engine to score this activity.
                        </span>
                      ) : (
                        <span>
                          The remote atmospheric intelligence engine is currently offline. Utilizing local-computational planners to formulate your itinerary.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Visual scorecard top row */}
                <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-5 md:p-6 grid grid-cols-1 sm:grid-cols-12 gap-5 relative overflow-hidden">
                  {/* Interactive header button block */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <button
                      onClick={handleSavePlan}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
                      title="Save Plan"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={handleSharePlan}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
                      title="Share Plan"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  {/* Circle Score dial */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-white/5 pb-4 sm:pb-0 sm:pr-4">
                    <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          stroke={planResult.suitabilityScore >= 85 ? "#10B981" : planResult.suitabilityScore >= 70 ? "#06B6D4" : planResult.suitabilityScore >= 50 ? "#F59E0B" : "#EF4444"} 
                          strokeWidth="6" 
                          fill="none" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * planResult.suitabilityScore) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold font-mono text-white leading-none">{planResult.suitabilityScore}</span>
                        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">SCORE</span>
                      </div>
                    </div>
                    
                    <span className="text-[11px] font-mono text-slate-400 font-semibold text-center mt-1">
                      {planResult.extractedParams.activity} Suitability
                    </span>
                  </div>

                  {/* Key metadata fields */}
                  <div className="sm:col-span-8 flex flex-col justify-center space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">RECOMMENDED TARGET WINDOW</span>
                      <div className="flex items-center gap-1.5 text-slate-200 mt-0.5">
                        <Calendar size={13} className="text-indigo-400" />
                        <span className="font-bold">{planResult.recommendedDate}</span>
                        <span className="text-slate-500">|</span>
                        <Clock size={13} className="text-indigo-400" />
                        <span className="font-bold">{planResult.bestTimeWindow}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">LOCATION</span>
                        <span className="text-slate-300 font-bold flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-slate-500" />
                          {planResult.extractedParams.location}
                        </span>
                      </div>
                      {planResult.extractedParams.destination && (
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">DESTINATION</span>
                          <span className="text-indigo-400 font-bold flex items-center gap-1 mt-0.5">
                            <Navigation size={11} />
                            {planResult.extractedParams.destination}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">CONFIDENCE LEVEL</span>
                        <span className="text-slate-300 font-bold flex items-center gap-1 mt-0.5">
                          <Smile size={11} className="text-emerald-400" />
                          {planResult.confidenceLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">EST. DURATION</span>
                        <span className="text-slate-300 font-bold mt-0.5 block">{planResult.extractedParams.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations paragraph */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} /> Personalized Advice & Strategy
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {planResult.recommendation}
                  </p>
                </div>

                {/* Specific Risk Analyses bar meters */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                    <ShieldAlert size={12} /> Disruption & Risk Matrix
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Rain/Soggy Disruption</span>
                        <span className={`font-bold ${getRiskColor(planResult.riskAnalysis.rainDisruption)}`}>
                          {planResult.riskAnalysis.rainDisruption}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getRiskWidth(planResult.riskAnalysis.rainDisruption)} ${planResult.riskAnalysis.rainDisruption === "HIGH" ? "bg-rose-500" : planResult.riskAnalysis.rainDisruption === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Comfort Risk (Heat/Cold)</span>
                        <span className={`font-bold ${getRiskColor(planResult.riskAnalysis.comfortRisk)}`}>
                          {planResult.riskAnalysis.comfortRisk}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getRiskWidth(planResult.riskAnalysis.comfortRisk)} ${planResult.riskAnalysis.comfortRisk === "HIGH" ? "bg-rose-500" : planResult.riskAnalysis.comfortRisk === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Wind buffeting / Drag</span>
                        <span className={`font-bold ${getRiskColor(planResult.riskAnalysis.windDisruption)}`}>
                          {planResult.riskAnalysis.windDisruption}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getRiskWidth(planResult.riskAnalysis.windDisruption)} ${planResult.riskAnalysis.windDisruption === "HIGH" ? "bg-rose-500" : planResult.riskAnalysis.windDisruption === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-slate-400">Atmospheric Stability</span>
                        <span className={`font-bold ${planResult.riskAnalysis.weatherStability === "HIGH" ? "text-emerald-400" : planResult.riskAnalysis.weatherStability === "MEDIUM" ? "text-amber-400" : "text-rose-400"}`}>
                          {planResult.riskAnalysis.weatherStability}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getRiskWidth(planResult.riskAnalysis.weatherStability)} ${planResult.riskAnalysis.weatherStability === "LOW" ? "bg-rose-500" : planResult.riskAnalysis.weatherStability === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hourly timeline indices */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                    <Activity size={12} /> Suitable Hours Timeline
                  </h4>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
                    {planResult.timeline.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-500 block mb-1">{item.time}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${getScoreColor(item.score)}`}>
                          {item.label}
                        </span>
                        <span className="text-slate-300 text-[11px] font-bold mt-1">{item.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multiday Travel Itinerary - Conditional if road trip */}
                {planResult.extractedParams.isRoadTrip && planResult.itinerary && (
                  <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5 animate-fade-in">
                    <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                      <Car size={13} /> Weather-Aware Road Itinerary
                    </h4>
                    
                    <div className="space-y-2 text-xs font-mono">
                      {planResult.itinerary.map((it, idx) => (
                        <div key={idx} className="flex gap-3 bg-slate-950/40 border border-white/5 rounded-xl p-3 items-center">
                          <div className="text-center bg-slate-950/60 p-2 rounded-lg min-w-[70px] border border-white/5">
                            <span className="text-[10px] text-slate-500 block leading-none mb-1">SCORE</span>
                            <span className="text-sm font-bold text-indigo-400">{it.score}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white text-[11px]">{it.day}</span>
                              <span className="text-[10px] text-emerald-400 font-bold uppercase">{it.status}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mb-1">Target: {it.activity}</span>
                            <p className="text-[11px] text-slate-300 leading-normal">{it.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative and Avoid plan section */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-amber-300 font-bold block uppercase">ALTERNATIVE PLAN STRATEGY</span>
                      <p className="text-slate-300 leading-relaxed mt-0.5">{planResult.alternatives}</p>
                    </div>
                  </div>
                </div>

                {/* 7-Day Dates Suitability Comparison */}
                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 md:p-5">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-1.5">
                    <Calendar size={12} /> 7-Day Date Evaluation Breakdown
                  </h4>
                  
                  <div className="space-y-2 text-xs font-mono">
                    {planResult.dateComparison?.map((day, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-xl hover:bg-slate-950/60 transition-all gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-300 min-w-[80px]">{day.date}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border uppercase ${
                            day.status === "RECOMMENDED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : day.status === "ALTERNATIVE" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                          }`}>
                            {day.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 sm:justify-end">
                          <p className="text-[11px] text-slate-400 leading-tight text-left sm:text-right max-w-sm">
                            {day.reason}
                          </p>
                          <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded border border-white/5">
                            <span className="text-[10px] font-bold text-slate-200">{day.score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* DEFAULT INSTRUCTIONS LANDING */
              <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-center items-center text-center min-h-[460px] relative overflow-hidden font-mono">
                {/* Visual compass accent */}
                <Compass size={40} className="text-indigo-500/20 mb-4 animate-spin-slow" />
                <h3 className="text-sm font-bold text-white mb-2">Weather Intelligence Planner</h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                  Input a custom outdoor plan description above or select one of our predefined activity modes to run suitability scoring, date comparisons, and micro-disruptions checks automatically.
                </p>

                {/* Info block */}
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-left max-w-md text-[11px] space-y-2 text-slate-400">
                  <p className="flex gap-1.5">
                    <span className="text-indigo-400">✓</span> 
                    <span>**Activity Scoring**: Calculations custom-tailored to requirements (e.g. photography cloud density, wedding moisture thresholds).</span>
                  </p>
                  <p className="flex gap-1.5">
                    <span className="text-indigo-400">✓</span>
                    <span>**Road Trips & Transit**: Maps weather across destination routes automatically.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB B: MONITORED PLANS ----------------- */}
      {activeSubTab === "saved" && (
        <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-5 md:p-6 animate-fade-in font-mono text-xs min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Monitored Plans Inventory</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Track forecast stability on saved itineraries and simulate disruption notifications.</p>
            </div>
            <button
              onClick={() => {
                setSavedPlans([]);
                saveToStorage([]);
                showToast("All plans cleared.");
              }}
              disabled={savedPlans.length === 0}
              className="text-[11px] text-slate-500 hover:text-rose-400 disabled:opacity-50 transition-all font-semibold uppercase flex items-center gap-1"
            >
              <RotateCcw size={12} /> Clear all
            </button>
          </div>

          {savedPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-white/5">
              <Bookmark size={30} className="opacity-15 mb-2" />
              <p className="text-xs">No active weather-monitored plans saved.</p>
              <p className="text-[10px] text-slate-600 mt-1">Design a plan in the Evaluation tab and click "Save" to populate this dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlans.map((plan, idx) => {
                const planKey = `${plan.extractedParams.activity}-${plan.recommendedDate}-${plan.extractedParams.location}`;
                const isMonitored = monitoredPlans[planKey]?.active ?? false;
                const activeAlert = monitoredPlans[planKey]?.alert;

                return (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
                    <div>
                      {/* Title block */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1">
                            <Activity size={13} className="text-indigo-400 animate-pulse" />
                            {plan.extractedParams.activity}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <MapPin size={10} />
                            {plan.extractedParams.location}
                            {plan.extractedParams.destination && ` ➔ ${plan.extractedParams.destination}`}
                          </span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${getScoreColor(plan.suitabilityScore)}`}>
                          {plan.suitabilityScore}/100
                        </div>
                      </div>

                      {/* Date details */}
                      <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                        📅 **Target Window**: {plan.recommendedDate} ({plan.bestTimeWindow})
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => toggleMonitoring(planKey)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            isMonitored 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                              : "bg-slate-950/60 border-white/5 text-slate-400"
                          }`}
                        >
                          {isMonitored ? "● Monitoring Weather Active" : "○ Start Monitoring"}
                        </button>
                        
                        {isMonitored && (
                          <button
                            onClick={() => simulateWeatherAlert(planKey, idx)}
                            className="text-[10px] text-rose-400 font-bold border border-rose-500/15 bg-rose-500/5 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all"
                          >
                            Simulate Weather Alert
                          </button>
                        )}
                      </div>

                      {/* Dynamic simulation alert box */}
                      {activeAlert && (
                        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-[10px] leading-relaxed animate-fade-in">
                          {activeAlert}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px]">
                      <button
                        onClick={() => {
                          setPlanResult(plan);
                          setActiveSubTab("planner");
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold uppercase"
                      >
                        Load Plan Result
                      </button>
                      <button
                        onClick={() => handleDeletePlan(idx)}
                        className="text-slate-500 hover:text-rose-400 transition-all uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- SUB-TAB C: SIDE-BY-SIDE COMPARISON ----------------- */}
      {activeSubTab === "compare" && (
        <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-5 md:p-6 animate-fade-in font-mono text-xs min-h-[400px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Compare Weather-Aware Plans</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Select two saved monitored plans to compare metrics and risks side-by-side.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-slate-500 block mb-1">PLAN OPTION A</label>
              <select
                value={comparisonSlotA}
                onChange={(e) => setComparisonSlotA(e.target.value)}
                className="w-full bg-slate-950/50 p-2.5 rounded-xl border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">-- Choose Plan A --</option>
                {savedPlans.map((p, idx) => {
                  const key = `${p.extractedParams.activity}-${p.recommendedDate}-${p.extractedParams.location}`;
                  return (
                    <option key={idx} value={key}>
                      {p.extractedParams.activity} in {p.extractedParams.location} ({p.recommendedDate})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">PLAN OPTION B</label>
              <select
                value={comparisonSlotB}
                onChange={(e) => setComparisonSlotB(e.target.value)}
                className="w-full bg-slate-950/50 p-2.5 rounded-xl border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">-- Choose Plan B --</option>
                {savedPlans.map((p, idx) => {
                  const key = `${p.extractedParams.activity}-${p.recommendedDate}-${p.extractedParams.location}`;
                  return (
                    <option key={idx} value={key}>
                      {p.extractedParams.activity} in {p.extractedParams.location} ({p.recommendedDate})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {planAObj && planBObj ? (
            /* SIDE-BY-SIDE COMPARE MATRIX */
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-12 gap-3 bg-slate-950/30 rounded-2xl border border-white/5 p-4 items-center">
                <div className="col-span-4 text-slate-400 font-bold text-[11px]">METRIC COMPARISON</div>
                <div className="col-span-4 text-center font-black text-indigo-400 text-xs truncate">
                  {planAObj.extractedParams.activity}
                </div>
                <div className="col-span-4 text-center font-black text-emerald-400 text-xs truncate">
                  {planBObj.extractedParams.activity}
                </div>
              </div>

              {/* Rows */}
              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Location</div>
                <div className="col-span-4 text-center text-white">{planAObj.extractedParams.location}</div>
                <div className="col-span-4 text-center text-white">{planBObj.extractedParams.location}</div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Target Date</div>
                <div className="col-span-4 text-center text-white font-bold">{planAObj.recommendedDate}</div>
                <div className="col-span-4 text-center text-white font-bold">{planBObj.recommendedDate}</div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Suitability Score</div>
                <div className="col-span-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getScoreColor(planAObj.suitabilityScore)}`}>
                    {planAObj.suitabilityScore}/100
                  </span>
                </div>
                <div className="col-span-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getScoreColor(planBObj.suitabilityScore)}`}>
                    {planBObj.suitabilityScore}/100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Confidence</div>
                <div className="col-span-4 text-center text-slate-300">{planAObj.confidenceLevel}</div>
                <div className="col-span-4 text-center text-slate-300">{planBObj.confidenceLevel}</div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Rain Risk</div>
                <div className="col-span-4 text-center font-bold" style={{ color: getRiskColor(planAObj.riskAnalysis.rainDisruption) }}>
                  {planAObj.riskAnalysis.rainDisruption}
                </div>
                <div className="col-span-4 text-center font-bold" style={{ color: getRiskColor(planBObj.riskAnalysis.rainDisruption) }}>
                  {planBObj.riskAnalysis.rainDisruption}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Comfort Risk</div>
                <div className="col-span-4 text-center font-bold" style={{ color: getRiskColor(planAObj.riskAnalysis.comfortRisk) }}>
                  {planAObj.riskAnalysis.comfortRisk}
                </div>
                <div className="col-span-4 text-center font-bold" style={{ color: getRiskColor(planBObj.riskAnalysis.comfortRisk) }}>
                  {planBObj.riskAnalysis.comfortRisk}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 border-b border-white/5 pb-2.5 px-4 items-center">
                <div className="col-span-4 text-slate-500">Best Hour</div>
                <div className="col-span-4 text-center text-slate-300">{planAObj.bestTimeWindow}</div>
                <div className="col-span-4 text-center text-slate-300">{planBObj.bestTimeWindow}</div>
              </div>

              {/* Synthesized AI recommendations box */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl mt-4">
                <h4 className="text-[11px] font-black tracking-wider uppercase text-indigo-300 mb-1 flex items-center gap-1.5">
                  <Sparkles size={12} /> AI Choice recommendation
                </h4>
                <p className="text-slate-200 leading-relaxed leading-normal text-[11px]">
                  Comparing both profiles, Option {planAObj.suitabilityScore >= planBObj.suitabilityScore ? "A" : "B"} presents a superior meteorological safety bound and general comfort level.
                  {planAObj.suitabilityScore >= planBObj.suitabilityScore ? ` ${planAObj.recommendation}` : ` ${planBObj.recommendation}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-white/5">
              <ArrowLeftRight size={30} className="opacity-15 mb-2" />
              <p className="text-xs">Select two saved plans above to compare.</p>
              <p className="text-[10px] text-slate-600 mt-1">Both fields must be fully populated with different active saved itineraries.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
