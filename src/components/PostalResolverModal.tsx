import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Check, AlertTriangle, Search, MapPin, Loader2, Compass, ArrowRight, HelpCircle 
} from "lucide-react";
import { LocationData, CentralLocationState } from "../types.js";
import { detectPostalFormat, getCandidateCountries } from "../utils/postalHelper.js";

interface PostalResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (loc: LocationData, resolvedDetails: Partial<CentralLocationState>) => void;
}

export default function PostalResolverModal({ isOpen, onClose, onConfirm }: PostalResolverModalProps) {
  const [rawInput, setRawInput] = useState("");
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [possibleCountries, setPossibleCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'ambiguous' | 'loading' | 'confirming' | 'multiple_results' | 'error'>('idle');
  const [loadingText, setLoadingText] = useState("");
  const [resolvedLocations, setResolvedLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear state when opened
  useEffect(() => {
    if (isOpen) {
      setRawInput("");
      setDetectedFormat(null);
      setPossibleCountries([]);
      setSelectedCountry(null);
      setStatus('idle');
      setLoadingText("");
      setResolvedLocations([]);
      setSelectedLocation(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const validateAndDetect = () => {
    setErrorMsg(null);
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMsg("Please enter a valid postal code.");
      return;
    }

    const formatDetails = detectPostalFormat(trimmed);
    if (!formatDetails.isValid) {
      setStatus('error');
      setErrorMsg(formatDetails.error || "Postal code format not recognized.");
      return;
    }

    setDetectedFormat(formatDetails.label);

    if (formatDetails.hasAmbiguity) {
      // Offers countries for ambiguity resolution
      const countries = getCandidateCountries(formatDetails.formatType);
      setPossibleCountries(countries);
      setSelectedCountry(formatDetails.likelyCountry);
      setStatus('ambiguous');
    } else {
      // Direct resolution
      triggerResolution(trimmed, formatDetails.likelyCountry);
    }
  };

  const triggerResolution = async (code: string, country: string | null) => {
    setStatus('loading');
    setLoadingText("Validating postal code...");

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      await delay(600);
      setLoadingText("Finding postal area...");
      
      const searchQueryString = country && country !== "Other" 
        ? `${code}, ${country}` 
        : code;
      
      await delay(600);
      setLoadingText("Resolving geographic coordinates...");
      
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(searchQueryString)}`);
      if (!res.ok) throw new Error("Weather geocoding service returned an error status.");
      
      const results: LocationData[] = await res.json();
      
      await delay(600);
      setLoadingText("Preparing location intelligence...");
      await delay(500);

      if (!results || results.length === 0) {
        setStatus('error');
        setErrorMsg(`Unable to find the postal code "${code}"${country ? ` in ${country}` : ""}.`);
        return;
      }

      // Filter to keep only those that contain a postcode matching the query or close area (Indian APIs are exact already)
      const matches = results;

      if (matches.length > 1) {
        setStatus('multiple_results');
        setResolvedLocations(matches);
        setSelectedLocation(matches[0]);
      } else {
        setStatus('confirming');
        setResolvedLocations(matches);
        setSelectedLocation(matches[0]);
      }
    } catch (err: any) {
      console.error("Postal code search failed:", err);
      setStatus('error');
      setErrorMsg(err.message || "Atmosphere grid servers experienced a timeout. Please try again.");
    }
  };

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    triggerResolution(rawInput.trim(), country);
  };

  const handleUseLocation = () => {
    if (!selectedLocation) return;
    
    // Parse postal code from rawInput or selected location name
    const cleanCode = rawInput.trim().toUpperCase();
    
    onConfirm(selectedLocation, {
      city: selectedLocation.name,
      region: selectedLocation.admin1 || "",
      country: selectedLocation.country,
      postalCode: cleanCode,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lon,
      source: 'postal_code',
      accuracy: 'postal_area',
      isUserSelected: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        {/* Modal Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden glass-panel border border-white/10 rounded-3xl shadow-2xl bg-slate-900/95 text-slate-100 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400 animate-spin-slow" />
              <h3 className="text-sm font-black tracking-tight text-white uppercase font-mono">
                Universal Postal Resolution
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6">
            
            {/* 1. IDLE / INPUT STATE */}
            {status === 'idle' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider mb-2">
                    Enter Postal Identifier
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Enter any Indian PIN Code, US ZIP, UK Postcode, Canadian/Australian postal code, or other international codes to resolve its coordinates.
                  </p>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && validateAndDetect()}
                      placeholder="e.g. 700001, 90210, SW1A 1AA, 2000"
                      className="w-full bg-slate-950/80 text-sm text-white border border-white/10 rounded-2xl pl-9.5 pr-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500 uppercase"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-950/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={validateAndDetect}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Resolve Location <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. AMBIGUITY STATE */}
            {status === 'ambiguous' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-200">
                  <HelpCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-xs font-mono font-bold block">FORMAT DETECTED</span>
                    <span className="text-xs text-indigo-300 font-semibold">{detectedFormat}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">
                    Which country is this postal code from?
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Multiple countries use the same postal code pattern. Select the correct country to ensure meteorology grid alignment.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {possibleCountries.map((country) => (
                      <button
                        key={country}
                        onClick={() => handleSelectCountry(country)}
                        className="p-3 text-left bg-slate-950/60 hover:bg-indigo-950/40 border border-white/10 hover:border-indigo-500/40 rounded-xl text-xs font-semibold hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span>{country}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => handleSelectCountry("Other")}
                    className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    Try Worldwide General
                  </button>
                </div>
              </div>
            )}

            {/* 3. LOADING STATE */}
            {status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-semibold text-white">Postal-Area Resolution</h4>
                  <p className="text-xs text-slate-400 font-mono tracking-wide animate-pulse">
                    {loadingText}
                  </p>
                </div>
              </div>
            )}

            {/* 4. ERROR STATE */}
            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                  <AlertTriangle className="w-10 h-10 text-rose-400 mb-2 animate-bounce-short" />
                  <h4 className="text-sm font-bold text-white mb-1">Postal Resolution Failed</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {errorMsg || "Unable to find this postal code."}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Search City Instead
                  </button>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* 5. MULTIPLE RESULTS SELECTION LIST */}
            {status === 'multiple_results' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider mb-2">
                    Multiple Locations Found
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    We found multiple postal offices or administrative areas matching "{rawInput.toUpperCase()}". Select the correct location:
                  </p>

                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-2xl divide-y divide-white/5 bg-slate-950/50 scrollbar-none">
                    {resolvedLocations.map((loc, idx) => {
                      const isSel = selectedLocation === loc;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedLocation(loc)}
                          className={`w-full text-left p-3 text-xs transition-all flex items-start gap-3 cursor-pointer ${
                            isSel 
                              ? "bg-indigo-600/20 text-white" 
                              : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSel ? "text-indigo-400" : "text-slate-500"}`} />
                          <div>
                            <span className="font-bold block text-white">{loc.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Search Again
                  </button>
                  <button
                    onClick={() => setStatus('confirming')}
                    disabled={!selectedLocation}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* 6. CONFIRMATION PANEL */}
            {status === 'confirming' && selectedLocation && (
              <div className="space-y-4">
                <div className="text-center p-5 bg-gradient-to-b from-indigo-950/50 to-slate-950/80 border border-indigo-500/25 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-1 right-1 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider">
                    LOCATION FOUND
                  </div>
                  
                  <MapPin className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-bounce-short" />
                  
                  <h4 className="text-lg font-black text-white leading-tight">
                    {selectedLocation.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    {selectedLocation.admin1 ? `${selectedLocation.admin1}, ` : ""}{selectedLocation.country}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/5 text-left text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[9px]">Postal Code</span>
                      <span className="text-indigo-300 font-bold">{rawInput.trim().toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[9px]">Location Accuracy</span>
                      <span className="text-emerald-400 font-bold">Postal Area Centroid</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[9px]">Coordinates</span>
                      <span className="text-slate-300 font-semibold">
                        {selectedLocation.lat.toFixed(3)}°N, {selectedLocation.lon.toFixed(3)}°E
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[9px]">Status</span>
                      <span className="text-slate-300 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Active Grid
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-[10px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-300">Accuracy Notice:</span> Weather data is based on the approximate geographic center of this postal area. It represents the postal-area centroid and does not claim to track your exact device GPS location.
                </div>

                <div className="flex justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Search Again
                  </button>
                  <button
                    onClick={handleUseLocation}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/35 transition-all cursor-pointer"
                  >
                    Use This Location
                  </button>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
