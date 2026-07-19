import { GoogleGenAI, Type } from "@google/genai";
import { FullWeatherData, DailyForecast, HourlyForecast, LocationData } from "../src/types.js";
import { searchLocations, getFullWeatherData } from "./weatherService.js";

export interface PlannerRequest {
  query?: string;
  activityType?: string;
  location?: string;
  destination?: string;
  dateRange?: string;
  preferredTime?: string;
  duration?: string;
  weatherData?: FullWeatherData;
}

export interface ActivityConfig {
  id: string;
  displayName: string;
  category: "TRAVEL" | "OUTDOOR" | "EVENTS" | "SPECIALIZED";
  scoringFactors: string[];
  riskFactors: string[];
}

export const QUICK_ACTIVITIES: ActivityConfig[] = [
  // TRAVEL
  { id: "road_trip", displayName: "Road Trip", category: "TRAVEL", scoringFactors: ["Visibility", "Rain disruption", "Wind", "Travel comfort"], riskFactors: ["Road visibility", "Aquaplaning risk", "Travel fatigue"] },
  { id: "weekend_trip", displayName: "Weekend Trip", category: "TRAVEL", scoringFactors: ["Rain disruption", "Temp comfort", "Destination stability"], riskFactors: ["Weather disruption", "Commute safety"] },
  { id: "camping", displayName: "Camping", category: "TRAVEL", scoringFactors: ["Rain disruption", "Night temperature", "Wind Speed"], riskFactors: ["Hypothermia/Heat comfort", "Flash floods", "Wind gust safety"] },
  { id: "hiking", displayName: "Hiking", category: "TRAVEL", scoringFactors: ["Precipitation", "Visibility", "Slippery conditions"], riskFactors: ["Trail mud index", "Mountain lightning", "Low visibility"] },
  { id: "beach_visit", displayName: "Beach Visit", category: "TRAVEL", scoringFactors: ["UVI", "Cloud cover", "Sea wind", "Warm temperatures"], riskFactors: ["Sunburn potential", "Rip current warning", "Sudden storm"] },
  
  // OUTDOOR
  { id: "picnic", displayName: "Picnic", category: "OUTDOOR", scoringFactors: ["Rain disruption", "Temp comfort", "Wind stability"], riskFactors: ["Ground dampness", "Food spoilage heat", "Sudden breeze"] },
  { id: "photography", displayName: "Photography", category: "OUTDOOR", scoringFactors: ["Visibility", "Golden hour clarity", "Cloud contour dynamics"], riskFactors: ["Lens moisture", "Lens glare", "Dull gray sky"] },
  { id: "running", displayName: "Running", category: "OUTDOOR", scoringFactors: ["Cool temperatures", "Low humidity", "Clean AQI"], riskFactors: ["Heat stroke comfort", "Lung congestion index", "Slippery pavement"] },
  { id: "cycling", displayName: "Cycling", category: "OUTDOOR", scoringFactors: ["Dry conditions", "Headwind intensity", "Visibility"], riskFactors: ["Crosswind hazard", "Wet road braking", "Overheating risk"] },
  { id: "walking", displayName: "Walking", category: "OUTDOOR", scoringFactors: ["General comfort", "Mild temperature", "AQI status"], riskFactors: ["Dehydration index", "Drizzle likelihood"] },
  { id: "outdoor_sports", displayName: "Outdoor Sports", category: "OUTDOOR", scoringFactors: ["Wind Speed", "Precipitation", "Comfort index"], riskFactors: ["Ball drift wind", "Traction slips", "Heat exhaustion"] },
  
  // EVENTS
  { id: "wedding", displayName: "Wedding", category: "EVENTS", scoringFactors: ["Rain likelihood", "Humidity levels", "Wind gust potential"], riskFactors: ["Decor disruption", "Guest comfort", "Extreme heat"] },
  { id: "birthday_party", displayName: "Outdoor Birthday", category: "EVENTS", scoringFactors: ["Dry conditions", "Temp comfort", "Afternoon shelter"], riskFactors: ["Wind gusts", "Rain disruption", "Sun discomfort"] },
  { id: "outdoor_event", displayName: "Outdoor Event", category: "EVENTS", scoringFactors: ["Precipitation risk", "Wind speed limit", "Ground conditions"], riskFactors: ["Equipment water safety", "Soil bogging", "Severe lightning"] },
  { id: "festival", displayName: "Festival", category: "EVENTS", scoringFactors: ["Rain disruption", "Temperature trends", "Mud safety"], riskFactors: ["Mud bogging", "Heat dehydration", "Crowd storm cover"] },
  { id: "gathering", displayName: "Gathering", category: "EVENTS", scoringFactors: ["Mild temperature", "Dry sky", "Clean air"], riskFactors: ["Sudden rain shower", "Late chill"] },

  // SPECIALIZED
  { id: "gardening", displayName: "Gardening", category: "SPECIALIZED", scoringFactors: ["Soil moisture", "Mild temperatures", "Moderate UV"], riskFactors: ["Heat stroke", "Pest dampness", "Overhydration"] },
  { id: "farming", displayName: "Farming Activity", category: "SPECIALIZED", scoringFactors: ["Harvest dry window", "Soil temperature", "Frost warning"], riskFactors: ["Crop flooding", "Heat stress", "Soil erosion"] },
  { id: "construction", displayName: "Construction Work", category: "SPECIALIZED", scoringFactors: ["Concrete cure window", "Wind crane safety", "Precipitation limit"], riskFactors: ["Wind scaffolding fall", "Metal slip risk", "Rain washouts"] },
  { id: "drone_flying", displayName: "Drone Flying", category: "SPECIALIZED", scoringFactors: ["Wind Speed", "Atmospheric visibility", "Cloud base height"], riskFactors: ["Signal loss rain", "Wind draft capture", "Birds & visibility"] },
  { id: "car_ride", displayName: "Scenic Car Ride", category: "SPECIALIZED", scoringFactors: ["Sights visibility", "Pleasant clouds", "Dry roads"], riskFactors: ["Mountain fog", "Hydroplaning", "Puddle splashes"] },
  { id: "bike_ride", displayName: "Scenic Bike Ride", category: "SPECIALIZED", scoringFactors: ["Calm breeze", "Warm sun", "No wet road spray"], riskFactors: ["Lean angle slip", "Crosswind buffeting", "Sudden downpour"] }
];

export interface PlanningResponse {
  extractedParams: {
    activity: string;
    location: string;
    destination?: string;
    dateRange: string;
    preferredTime: string;
    duration: string;
    groupSize?: number;
    specialRequirements?: string;
    isRoadTrip: boolean;
  };
  recommendedDate: string;
  bestTimeWindow: string;
  suitabilityScore: number;
  confidenceLevel: "HIGH" | "MODERATE" | "LOW";
  riskAnalysis: {
    rainDisruption: "LOW" | "MEDIUM" | "HIGH";
    comfortRisk: "LOW" | "MEDIUM" | "HIGH";
    windDisruption: "LOW" | "MEDIUM" | "HIGH";
    weatherStability: "LOW" | "MEDIUM" | "HIGH";
  };
  recommendation: string;
  alternatives: string;
  timeline: { time: string; score: number; label: "POOR" | "MODERATE" | "GOOD" | "EXCELLENT" }[];
  dateComparison?: {
    date: string;
    score: number;
    status: "RECOMMENDED" | "ALTERNATIVE" | "AVOID";
    reason: string;
  }[];
  itinerary?: {
    day: string;
    score: number;
    status: "EXCELLENT" | "VERY GOOD" | "MODERATE" | "POOR";
    activity: string;
    desc: string;
  }[];
  optionComparison?: {
    optionA: { name: string; score: number; risk: string; desc: string };
    optionB: { name: string; score: number; risk: string; desc: string };
    aiRecommendation: string;
  };
  errorMessage?: string;
  isFallback?: boolean;
  fallbackReason?: 'no_api_key' | 'quota_exceeded' | 'offline';
}

// Deterministic Planning Engine when Gemini is offline or not configured
export function evaluatePlannerDeterministically(
  req: PlannerRequest,
  activeWeatherData: FullWeatherData,
  fallbackReason: 'no_api_key' | 'quota_exceeded' | 'offline' = 'offline'
): PlanningResponse {
  const query = req.query || "";
  const activityStr = req.activityType || parseActivityType(query) || "picnic";
  const matchedAct = QUICK_ACTIVITIES.find(a => a.id === activityStr || a.displayName.toLowerCase() === activityStr.toLowerCase()) || QUICK_ACTIVITIES[5]; // default Picnic
  
  const isRoadTrip = matchedAct.id === "road_trip" || query.toLowerCase().includes("road trip") || query.toLowerCase().includes("travel to") || !!req.destination;
  const destName = req.destination || (isRoadTrip ? "Digha" : undefined);
  
  const extractedParams = {
    activity: matchedAct.displayName,
    location: req.location || activeWeatherData.location.name,
    destination: destName,
    dateRange: req.dateRange || "Next few days",
    preferredTime: req.preferredTime || "Flexible",
    duration: req.duration || "4 hours",
    groupSize: query.match(/(\d+)\s*(people|friends|guests)/i)?.[1] ? parseInt(query.match(/(\d+)\s*(people|friends|guests)/i)![1]) : undefined,
    specialRequirements: undefined,
    isRoadTrip
  };

  const dailyForecasts = activeWeatherData.daily;
  const hourlyForecasts = activeWeatherData.hourly;

  // 1. Find Best Date
  const dateComparison: PlanningResponse["dateComparison"] = dailyForecasts.map((day, idx) => {
    let score = 90;
    
    // Activity-based score penalty rules
    if (day.rainProb > 40) {
      score -= day.rainProb * 0.7;
    }
    // Temp comfort: Picnic/Event perfect is 21-26C
    const tempComfortDiff = Math.abs((day.maxTemp + day.minTemp) / 2 - 23);
    score -= Math.min(25, tempComfortDiff * 2);
    
    // Wind Speed penalty
    if (day.windSpeed > 18) {
      score -= (day.windSpeed - 18) * 1.5;
    }
    
    score = Math.max(15, Math.min(100, Math.round(score)));

    let status: "RECOMMENDED" | "ALTERNATIVE" | "AVOID" = "ALTERNATIVE";
    let reason = "Moderate temperatures with stable atmospheric indicators.";
    
    if (day.rainProb > 60) {
      status = "AVOID";
      reason = "Elevated risk of rain disruption and dense cloud layers.";
    } else if (score > 80 && idx < 3) {
      status = "RECOMMENDED";
      reason = "Optimally warm, sunny weather with clear horizons and calm wind indices.";
    }

    return {
      date: day.date,
      score,
      status,
      reason
    };
  });

  // Sort and assign RECOMMENDED, ALTERNATIVE, AVOID properly
  const sortedDates = [...dateComparison].sort((a, b) => b.score - a.score);
  dateComparison.forEach(d => {
    if (d.date === sortedDates[0].date) {
      d.status = "RECOMMENDED";
      d.reason = `Top conditions for ${matchedAct.displayName}. Calm, dry, and highly pleasant.`;
    } else if (d.score < 50) {
      d.status = "AVOID";
      d.reason = `Risk of precipitation (${activeWeatherData.daily.find(f => f.date === d.date)?.rainProb || 0}%) or cold temperatures.`;
    } else {
      d.status = "ALTERNATIVE";
      d.reason = "Good secondary option with minor clouds but suitable atmospheric support.";
    }
  });

  const bestDateObj = sortedDates[0];
  const recommendedDate = bestDateObj.date;
  const suitabilityScore = bestDateObj.score;

  // 2. Compute timeline (Best Time Finder)
  const timeline: PlanningResponse["timeline"] = [
    { time: "6:00 AM", score: Math.round(suitabilityScore * 0.9), label: "GOOD" },
    { time: "9:00 AM", score: Math.round(suitabilityScore * 1.0), label: "EXCELLENT" },
    { time: "12:00 PM", score: Math.round(suitabilityScore * 0.75), label: "MODERATE" },
    { time: "3:00 PM", score: Math.round(suitabilityScore * 0.7), label: "MODERATE" },
    { time: "6:00 PM", score: Math.round(suitabilityScore * 0.95), label: "EXCELLENT" },
    { time: "9:00 PM", score: Math.round(suitabilityScore * 0.8), label: "GOOD" },
  ];

  timeline.forEach(t => {
    // Modify based on rain probabilities and midday sun
    if (t.time === "12:00 PM" || t.time === "3:00 PM") {
      const isHot = activeWeatherData.current.temp > 30;
      if (isHot) {
        t.score = Math.max(10, t.score - 20);
      }
    }
    // Determine label
    if (t.score >= 85) t.label = "EXCELLENT";
    else if (t.score >= 70) t.label = "GOOD";
    else if (t.score >= 50) t.label = "MODERATE";
    else t.label = "POOR";
  });

  const sortedTime = [...timeline].sort((a, b) => b.score - a.score);
  const bestTimeWindow = sortedTime[0].time === "9:00 AM" ? "8:00 AM - 11:00 AM" : sortedTime[0].time === "6:00 PM" ? "5:00 PM - 7:30 PM" : "09:00 AM - 01:00 PM";

  // 3. Risk Analysis
  const currentRain = activeWeatherData.current.precipitation || 0;
  const rainDisruption: "LOW" | "MEDIUM" | "HIGH" = bestDateObj.score < 50 ? "HIGH" : bestDateObj.score < 75 ? "MEDIUM" : "LOW";
  const comfortRisk: "LOW" | "MEDIUM" | "HIGH" = activeWeatherData.current.temp > 32 || activeWeatherData.current.temp < 12 ? "HIGH" : activeWeatherData.current.temp > 28 ? "MEDIUM" : "LOW";
  const windDisruption: "LOW" | "MEDIUM" | "HIGH" = activeWeatherData.current.windSpeed > 25 ? "HIGH" : activeWeatherData.current.windSpeed > 15 ? "MEDIUM" : "LOW";
  const weatherStability: "LOW" | "MEDIUM" | "HIGH" = rainDisruption === "HIGH" || windDisruption === "HIGH" ? "LOW" : rainDisruption === "MEDIUM" ? "MEDIUM" : "HIGH";

  const riskAnalysis = { rainDisruption, comfortRisk, windDisruption, weatherStability };

  // Confidence Level
  const confidenceLevel = suitabilityScore > 80 ? "HIGH" : suitabilityScore > 55 ? "MODERATE" : "LOW";

  // Recommendations and Alternatives
  let recommendation = `The optimal date is ${recommendedDate} during ${bestTimeWindow}. Weather parameters show strong atmospheric support, moderate comfort bounds, and minimal rainfall risks.`;
  let alternatives = `Should weather indices shift, consider scheduling for the alternative window of ${dateComparison.find(d => d.status === "ALTERNATIVE")?.date || "next Monday"} or arrange for indoor sheltering.`;

  if (matchedAct.id === "photography") {
    recommendation = `The photo suitability indices maximize on ${recommendedDate} around ${bestTimeWindow}. Take advantage of clean atmospheric sightlines (visibility at ${activeWeatherData.current.visibility / 1000}km) and beautiful sky coverage.`;
  } else if (matchedAct.id === "running" || matchedAct.id === "cycling") {
    recommendation = `Optimal workout indexes on ${recommendedDate} between ${bestTimeWindow}. Cool temperatures (~${activeWeatherData.current.temp - 2}°C) and low wind shear facilitate perfect fitness metrics.`;
  }

  // 4. Travel and Road Trip Routing Itinerary
  let itinerary: PlanningResponse["itinerary"] | undefined;
  if (isRoadTrip) {
    itinerary = [
      { day: "Day 1 (Travel)", score: Math.round(suitabilityScore * 0.95), status: "EXCELLENT", activity: "Driving & Check-In", desc: `Calm road visibilities of 10km, wind currents favorable for highway cruising.` },
      { day: "Day 2 (Outdoor)", score: Math.round(suitabilityScore * 1.0), status: "EXCELLENT", activity: "Explore destination", desc: `Pristine beach/scenic activities window with very comfortable breeze.` },
      { day: "Day 3 (Return)", score: Math.round(suitabilityScore * 0.85), status: "VERY GOOD", activity: "Drive home", desc: `Slight clouds moving in, but roads remain dry with stable parameters.` }
    ];
  }

  // 5. Option Comparison
  const optionComparison = {
    optionA: { name: `Option A: ${recommendedDate} Morning`, score: suitabilityScore, risk: rainDisruption === "LOW" ? "Low Risk" : "Moderate Risk", desc: `Best dry and wind-free planning profile with ${suitabilityScore}/100.` },
    optionB: { name: `Option B: ${dateComparison.find(d => d.status === "ALTERNATIVE")?.date || "Saturday"} Afternoon`, score: Math.max(40, suitabilityScore - 12), risk: "Moderate Risk", desc: "Temperatures may peak higher, causing slight humidity dampening." },
    aiRecommendation: `Option A on ${recommendedDate} offers superior comfort scores and guarantees a disruption-free experience.`
  };

  return {
    isFallback: true,
    fallbackReason,
    extractedParams,
    recommendedDate,
    bestTimeWindow,
    suitabilityScore,
    confidenceLevel,
    riskAnalysis,
    recommendation,
    alternatives,
    timeline,
    dateComparison,
    itinerary,
    optionComparison
  };
}

function parseActivityType(query: string): string | null {
  const lowercase = query.toLowerCase();
  if (lowercase.includes("road trip") || lowercase.includes("drive to")) return "road_trip";
  if (lowercase.includes("camp")) return "camping";
  if (lowercase.includes("hike") || lowercase.includes("trek")) return "hiking";
  if (lowercase.includes("beach")) return "beach_visit";
  if (lowercase.includes("picnic")) return "picnic";
  if (lowercase.includes("photo") || lowercase.includes("shoot") || lowercase.includes("cam")) return "photography";
  if (lowercase.includes("run") || lowercase.includes("jog")) return "running";
  if (lowercase.includes("cycl") || lowercase.includes("bike")) return "cycling";
  if (lowercase.includes("walk")) return "walking";
  if (lowercase.includes("sport") || lowercase.includes("football") || lowercase.includes("cricket")) return "outdoor_sports";
  if (lowercase.includes("wedding") || lowercase.includes("marriage")) return "wedding";
  if (lowercase.includes("party") || lowercase.includes("birthday")) return "birthday_party";
  if (lowercase.includes("garden")) return "gardening";
  if (lowercase.includes("farm")) return "farming";
  if (lowercase.includes("construction")) return "construction";
  if (lowercase.includes("drone")) return "drone_flying";
  return null;
}

// Full Gemini Powered Planning Analysis
export async function generateAIPlan(
  req: PlannerRequest,
  activeWeatherData: FullWeatherData
): Promise<PlanningResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    return evaluatePlannerDeterministically(req, activeWeatherData, "no_api_key");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const isRoadTripReq = req.activityType === "road_trip" || req.destination || (req.query && /road\s*trip|drive\s*to/i.test(req.query));
    let destinationWeatherContext = "";
    
    // If it's a road trip or destination is explicitly mentioned, fetch destination weather!
    if (isRoadTripReq && req.destination) {
      try {
        const destGeo = await searchLocations(req.destination);
        if (destGeo && destGeo.length > 0) {
          const destWeather = await getFullWeatherData(destGeo[0].lat, destGeo[0].lon, destGeo[0]);
          destinationWeatherContext = `
          DESTINATION: ${destGeo[0].name}, ${destGeo[0].country} (Lat: ${destGeo[0].lat}, Lon: ${destGeo[0].lon})
          Destination Current: Temp ${destWeather.current.temp}°C, ${destWeather.current.conditionText}, Rain ${destWeather.current.precipitation}mm
          Destination 7-Day Forecast:
          ${destWeather.daily.map(d => `- ${d.date} (${d.dayName}): Max ${d.maxTemp}°C, Min ${d.minTemp}°C, Rain ${d.rainProb}%, Sky: ${d.conditionText}`).join("\n")}
          `;
        }
      } catch (e) {
        console.warn("Failed to fetch destination weather for AI Planner routing fallback.", e);
      }
    }

    const forecastDates = activeWeatherData.daily.map(d => `${d.date} (${d.dayName})`).join(", ");

    const systemPrompt = `You are the lead intelligence agent for a production weather planning system called SkySense.
    Your task is to analyze weather data and provide activity-specific planning insights.
    
    Factual inputs available:
    CURRENT LOCATION: ${activeWeatherData.location.name}, ${activeWeatherData.location.country}
    Current conditions: Temp ${activeWeatherData.current.temp}°C, Sky ${activeWeatherData.current.conditionText}, Humidity ${activeWeatherData.current.humidity}%, Wind ${activeWeatherData.current.windSpeed} km/h, AQI ${activeWeatherData.airQuality.aqi}
    
    7-Day Forecast for ${activeWeatherData.location.name}:
    ${activeWeatherData.daily.map(d => `- ${d.date} (${d.dayName}): Max ${d.maxTemp}°C, Min ${d.minTemp}°C, Rain Prob ${d.rainProb}%, Sky: ${d.conditionText}, Summary: ${d.summary}`).join("\n")}
    
    Hourly indices today:
    ${activeWeatherData.hourly.slice(0, 12).map(h => `- ${new Date(h.time).toLocaleTimeString([], { hour: '2-digit' })}: Temp ${h.temp}°C, Rain Prob ${h.rainProb}%`).join("\n")}
    
    ${destinationWeatherContext}
    
    Generate a JSON response that matches the responseSchema exactly.
    Be extremely direct, conversational, and specific. Never use generic warnings. Calculate all planning recommendations according to the specific activity requested.
    If travel is involved, provide travel departure timelines and weather-aware itinerary days.
    
    Ensure ALL returned dates match the exact spelling and text as listed in the available daily forecast dates: ${forecastDates}.`;

    const userPrompt = `
    User query: "${req.query || 'I want to plan a ' + (req.activityType || 'picnic')}"
    Predefined Activity Selection: "${req.activityType || ''}"
    Destination if any: "${req.destination || ''}"
    Preferred Time: "${req.preferredTime || ''}"
    Date Range Constraints: "${req.dateRange || ''}"
    
    Extract variables, compare dates, identify best/alternative/avoid profiles, compute hourly comfort scores, and map risks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["extractedParams", "recommendedDate", "bestTimeWindow", "suitabilityScore", "confidenceLevel", "riskAnalysis", "recommendation", "alternatives", "timeline", "dateComparison"],
          properties: {
            extractedParams: {
              type: Type.OBJECT,
              required: ["activity", "location", "dateRange", "preferredTime", "duration", "isRoadTrip"],
              properties: {
                activity: { type: Type.STRING },
                location: { type: Type.STRING },
                destination: { type: Type.STRING },
                dateRange: { type: Type.STRING },
                preferredTime: { type: Type.STRING },
                duration: { type: Type.STRING },
                groupSize: { type: Type.INTEGER },
                specialRequirements: { type: Type.STRING },
                isRoadTrip: { type: Type.BOOLEAN }
              }
            },
            recommendedDate: { type: Type.STRING },
            bestTimeWindow: { type: Type.STRING },
            suitabilityScore: { type: Type.INTEGER },
            confidenceLevel: { type: Type.STRING, enum: ["HIGH", "MODERATE", "LOW"] },
            riskAnalysis: {
              type: Type.OBJECT,
              required: ["rainDisruption", "comfortRisk", "windDisruption", "weatherStability"],
              properties: {
                rainDisruption: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                comfortRisk: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                windDisruption: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                weatherStability: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] }
              }
            },
            recommendation: { type: Type.STRING },
            alternatives: { type: Type.STRING },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["time", "score", "label"],
                properties: {
                  time: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  label: { type: Type.STRING, enum: ["POOR", "MODERATE", "GOOD", "EXCELLENT"] }
                }
              }
            },
            dateComparison: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["date", "score", "status", "reason"],
                properties: {
                  date: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  status: { type: Type.STRING, enum: ["RECOMMENDED", "ALTERNATIVE", "AVOID"] },
                  reason: { type: Type.STRING }
                }
              }
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["day", "score", "status", "activity", "desc"],
                properties: {
                  day: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  status: { type: Type.STRING, enum: ["EXCELLENT", "VERY GOOD", "MODERATE", "POOR"] },
                  activity: { type: Type.STRING },
                  desc: { type: Type.STRING }
                }
              }
            },
            optionComparison: {
              type: Type.OBJECT,
              required: ["optionA", "optionB", "aiRecommendation"],
              properties: {
                optionA: {
                  type: Type.OBJECT,
                  required: ["name", "score", "risk", "desc"],
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    risk: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  }
                },
                optionB: {
                  type: Type.OBJECT,
                  required: ["name", "score", "risk", "desc"],
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    risk: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  }
                },
                aiRecommendation: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      ...parsed,
      isFallback: false
    } as PlanningResponse;
  } catch (err: any) {
    console.warn("AI Weather Planner: Gemini API error, falling back deterministically:", err?.message || err);
    const errMsg = err?.message || String(err);
    const reason = (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) ? "quota_exceeded" : "offline";
    return evaluatePlannerDeterministically(req, activeWeatherData, reason);
  }
}
