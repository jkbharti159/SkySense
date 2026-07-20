import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { searchLocations, getFullWeatherData, reverseGeocode } from "./server/weatherService.js";
import { LocationData, FullWeatherData } from "./src/types.js";
import { GoogleGenAI } from "@google/genai";
import { generateContentWithFallback } from "./server/geminiHelper.js";
import { serverCache } from "./server/cache.js";
import { generateAIPlan } from "./server/plannerService.js";
import { generateAIRadarAnalysis } from "./server/radarService.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Endpoints
// A. Geocoding autocomplete and search
app.get("/api/geocoding/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    return res.json([]);
  }
  try {
    const results = await searchLocations(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to search location" });
  }
});

// B. Reverse Geocoding (detect city from lat/lon)
app.get("/api/geocoding/reverse", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Invalid latitude or longitude" });
  }
  try {
    const result = await reverseGeocode(lat, lon);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to reverse geocode" });
  }
});

// B.2 Server-side IP Geolocation Detection (approximate and privacy-compliant)
app.get("/api/location/detect", async (req, res) => {
  let ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
  
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  const isPrivateIp = !ip || 
    ip === "127.0.0.1" || 
    ip === "::1" || 
    ip.startsWith("10.") || 
    ip.startsWith("192.168.") || 
    ip.startsWith("172.16.") || 
    ip.startsWith("172.17.") || 
    ip.startsWith("172.18.") || 
    ip.startsWith("172.19.") || 
    ip.startsWith("172.20.") || 
    ip.startsWith("172.21.") || 
    ip.startsWith("172.22.") || 
    ip.startsWith("172.23.") || 
    ip.startsWith("172.24.") || 
    ip.startsWith("172.25.") || 
    ip.startsWith("172.26.") || 
    ip.startsWith("172.27.") || 
    ip.startsWith("172.28.") || 
    ip.startsWith("172.29.") || 
    ip.startsWith("172.30.") || 
    ip.startsWith("172.31.");

  try {
    let url = "https://freeipapi.com/api/json";
    if (!isPrivateIp) {
      url = `https://freeipapi.com/api/json/${ip}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("FreeIPAPI geolocation failed");
    }
    const data = await response.json();
    
    const city = data.cityName || "Kolkata";
    const region = data.regionName || "West Bengal";
    const country = data.countryName || "India";
    const latitude = data.latitude || 22.5726;
    const longitude = data.longitude || 88.3639;
    const timezone = data.timeZone || "Asia/Kolkata";

    res.json({
      city,
      region,
      country,
      latitude,
      longitude,
      timezone,
      source: "ip",
      accuracy: "approximate"
    });
  } catch (err) {
    console.error("Secure IP Geolocation service error:", err);
    res.json({
      city: "Kolkata",
      region: "West Bengal",
      country: "India",
      latitude: 22.5726,
      longitude: 88.3639,
      timezone: "Asia/Kolkata",
      source: "fallback",
      accuracy: "approximate",
      error: true
    });
  }
});

// C. Consolidated Full Weather + Air Quality + Intelligence
app.get("/api/weather/full", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  const name = req.query.name as string;
  const country = req.query.country as string;
  const admin1 = req.query.admin1 as string;

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Latitude and longitude parameters are required" });
  }

  let customLocation: LocationData | undefined;
  if (name) {
    customLocation = { name, country: country || "", admin1: admin1 || "", lat, lon };
  }

  try {
    const data = await getFullWeatherData(lat, lon, customLocation);
    res.json(data);
  } catch (err) {
    console.error("Full weather endpoint error:", err);
    res.status(500).json({ error: "Failed to retrieve weather intelligence" });
  }
});

// D. Comparison Engine: Compare City A vs City B or Today vs Tomorrow
app.post("/api/intelligence/compare", async (req, res) => {
  const { cityA, cityB, cities, mode, dimension, purpose } = req.body as { 
    cityA?: FullWeatherData; 
    cityB?: FullWeatherData; 
    cities?: FullWeatherData[];
    mode: "today-tomorrow" | "cities" | "difference" | "similarity" | "variability" | "pattern" | "custom";
    dimension?: string;
    purpose?: string;
  };

  const activeCities = cities && cities.length > 0 ? cities : [cityA, ...(cityB ? [cityB] : [])].filter(Boolean) as FullWeatherData[];

  if (activeCities.length === 0) {
    return res.status(400).json({ error: "At least one city dataset is required for comparison" });
  }

  // Create cache key based on mode, dimension, and cities coordinates
  const coordsHash = activeCities.map(c => `${c.location.lat.toFixed(4)},${c.location.lon.toFixed(4)}`).join(";");
  const cacheKey = `compare_v2:${mode}:${dimension || "default"}:${coordsHash}`;
  const cachedComparison = serverCache.get<any>(cacheKey);
  if (cachedComparison) {
    return res.json(cachedComparison);
  }

  try {
    // Mathematical calculations for deterministic metadata
    const calculateMean = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
    const calculateStdDev = (vals: number[], mean: number) => {
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      return Math.sqrt(variance);
    };

    const cityAnalyses = activeCities.map(c => {
      const temps = c.daily.map(d => d.maxTemp);
      const rainProbs = c.daily.map(d => d.rainProb);
      const humidities = c.daily.map(d => d.humidity);

      const tempMean = calculateMean(temps);
      const tempStdDev = calculateStdDev(temps, tempMean);
      const rainMean = calculateMean(rainProbs);
      const rainStdDev = calculateStdDev(rainProbs, rainMean);
      const humidityMean = calculateMean(humidities);

      // Stability rating based on standard deviation of temp
      let stabilityRating: "High Stability" | "Moderate Stability" | "High Variability" = "Moderate Stability";
      if (tempStdDev < 1.8) {
        stabilityRating = "High Stability";
      } else if (tempStdDev > 3.5) {
        stabilityRating = "High Variability";
      }

      // Profile class
      let profileType = "Standard Inland";
      if (humidityMean > 75 && tempStdDev < 2.0) {
        profileType = "Maritime Humid Stable";
      } else if (humidityMean < 45 && tempStdDev > 4.0) {
        profileType = "Continental Arid Variable";
      } else if (humidityMean > 70) {
        profileType = "Humid Coastal";
      } else if (tempStdDev > 3.0) {
        profileType = "Extreme Thermal Variance";
      }

      return {
        name: c.location.name,
        tempMean,
        tempStdDev,
        rainMean,
        rainStdDev,
        humidityMean,
        stabilityRating,
        profileType,
        aqi: c.airQuality.aqi
      };
    });

    // Pairwise similarity calculations
    const similarityScores: Array<{ pair: string; score: number; explanation: string }> = [];
    if (activeCities.length > 1) {
      for (let i = 0; i < activeCities.length; i++) {
        for (let j = i + 1; j < activeCities.length; j++) {
          const c1 = cityAnalyses[i];
          const c2 = cityAnalyses[j];
          
          const tempDelta = Math.abs(c1.tempMean - c2.tempMean);
          const humidityDelta = Math.abs(c1.humidityMean - c2.humidityMean);
          const rainDelta = Math.abs(c1.rainMean - c2.rainMean);
          const aqiDelta = Math.abs(c1.aqi - c2.aqi);

          // Calculate a weighted similarity index
          const score = Math.max(20, Math.round(
            100 - (tempDelta * 4) - (humidityDelta * 0.4) - (rainDelta * 0.4) - (aqiDelta * 0.1)
          ));

          let explanation = `Showing matching traits with a minor temperature divergence of ${tempDelta.toFixed(1)}°C.`;
          if (score > 85) {
            explanation = "Excellent meteorological alignment. Almost identical daily temperature bands and atmospheric characteristics.";
          } else if (score < 55) {
            explanation = "Significant atmospheric divergence driven by contrasting climatic zones and micro-climates.";
          }

          similarityScores.push({
            pair: `${c1.name} ↔ ${c2.name}`,
            score,
            explanation
          });
        }
      }
    }

    // Top differences
    const topDifferences: string[] = [];
    if (activeCities.length > 1) {
      // Find largest difference in current temperature
      const tempSorted = [...activeCities].sort((a, b) => b.current.temp - a.current.temp);
      const maxTempDiff = tempSorted[0].current.temp - tempSorted[tempSorted.length - 1].current.temp;
      if (maxTempDiff > 2) {
        topDifferences.push(`${tempSorted[0].location.name} is significantly warmer than ${tempSorted[tempSorted.length - 1].location.name} by ${Math.round(maxTempDiff)}°C today.`);
      }

      // Find largest difference in air quality
      const aqiSorted = [...activeCities].sort((a, b) => b.airQuality.aqi - a.airQuality.aqi);
      const maxAqiDiff = aqiSorted[0].airQuality.aqi - aqiSorted[aqiSorted.length - 1].airQuality.aqi;
      if (maxAqiDiff > 20) {
        topDifferences.push(`${aqiSorted[aqiSorted.length - 1].location.name} enjoys much cleaner air compared to ${aqiSorted[0].location.name} (AQI Delta: ${Math.round(maxAqiDiff)} points).`);
      }

      // Find largest difference in humidity
      const humSorted = [...activeCities].sort((a, b) => b.current.humidity - a.current.humidity);
      const maxHumDiff = humSorted[0].current.humidity - humSorted[humSorted.length - 1].current.humidity;
      if (maxHumDiff > 15) {
        topDifferences.push(`${humSorted[0].location.name} displays far more atmospheric saturation, with a humidity level ${Math.round(maxHumDiff)}% higher than ${humSorted[humSorted.length - 1].location.name}.`);
      }
    }

    // Dynamic rankings
    const rankings = {
      stable: [...cityAnalyses].sort((a, b) => a.tempStdDev - b.tempStdDev).map(c => c.name),
      variable: [...cityAnalyses].sort((a, b) => b.tempStdDev - a.tempStdDev).map(c => c.name)
    };

    let comparisonText = "";
    
    // Legacy support or fallback
    if (mode === "today-tomorrow" && activeCities.length === 1) {
      const city = activeCities[0];
      const today = city.current;
      const tomorrow = city.daily[1];
      const tempDiff = tomorrow.maxTemp - city.daily[0].maxTemp;
      const rainMsg = tomorrow.rainProb > city.daily[0].rainProb 
        ? "with a higher chance of showers" 
        : "with drier skies";
      const tempMsg = Math.abs(tempDiff) < 1.5 
        ? "about the same temperature as today" 
        : tempDiff > 0 
          ? `warmer than today by ${Math.round(tempDiff)}°C` 
          : `cooler than today by ${Math.round(Math.abs(tempDiff))}°C`;

      comparisonText = `Tomorrow will be ${tempMsg}, peaking at ${Math.round(tomorrow.maxTemp)}°C, ${rainMsg} (rain probability at ${tomorrow.rainProb}%). `;
      if (tomorrow.rainProb > 50) {
        comparisonText += "Outdoor planning scores drop; outdoor workouts are highly recommended today instead.";
      } else {
        comparisonText += "Overall planning parameters remain optimal for travel, exercise, and leisure commutes.";
      }
    } else {
      // Multi-city comparison text fallback builder with highly-structured, professional Markdown!
      const names = activeCities.map(c => c.location.name).join(", ");
      
      const warmCity = [...activeCities].sort((a, b) => b.current.temp - a.current.temp)[0];
      const coolCity = [...activeCities].sort((a, b) => a.current.temp - b.current.temp)[0];
      const cleanAirCity = [...activeCities].sort((a, b) => a.airQuality.aqi - b.airQuality.aqi)[0];
      const highAqiCity = [...activeCities].sort((a, b) => b.airQuality.aqi - a.airQuality.aqi)[0];

      const findingsLine = `Comparative climatological inquiry for **${names}** conducted across the target dimension (**${dimension || "Atmospheric Stability"}**). ` +
        `The thermal readings indicate that **${warmCity.location.name}** is the warmest with an average temperature of **${Math.round(warmCity.current.temp)}°C**, ` +
        `while **${coolCity.location.name}** registers as the coolest at **${Math.round(coolCity.current.temp)}°C**. ` +
        (cleanAirCity.location.name !== highAqiCity.location.name 
          ? `Air quality metrics demonstrate that **${cleanAirCity.location.name}** has the cleanest atmosphere (AQI **${cleanAirCity.airQuality.aqi}** vs **${highAqiCity.airQuality.aqi}** in ${highAqiCity.location.name}).`
          : "");

      const profilesLine = cityAnalyses.map(c => {
        return `* **${c.name}**: Classified as **${c.profileType}** with **${c.stabilityRating}**. Features a 7-day thermal mean max of **${c.tempMean.toFixed(1)}°C** and an average moisture profile of **${Math.round(c.humidityMean)}%** relative humidity.`;
      }).join("\n");

      const differencesLine = topDifferences.length > 0
        ? topDifferences.map(diff => `* ${diff}`).join("\n")
        : "* No extreme structural atmospheric differences were observed among the selected target regions today.";

      comparisonText = `**1. KEY COMPARATIVE FINDINGS**\n\n${findingsLine}\n\n` +
        `**2. MICRO CLIMATIC PROFILES**\n\n${profilesLine}\n\n` +
        `**3. SIGNIFICANT DIVERGENCES**\n\n${differencesLine}`;
    }

    let isFallback = true;
    let fallbackReason = "no_api_key";

    // Call Gemini for premium insights if possible
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "") {
      try {
        isFallback = false;
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        let prompt = "";
        if (mode === "today-tomorrow" && activeCities.length === 1) {
          const cityA = activeCities[0];
          prompt = `Write a gorgeous, creative, single-paragraph comparison comparing today's weather with tomorrow's weather in ${cityA.location.name} based on this data:
          Today: Temp ${cityA.current.temp}°C, condition ${cityA.current.conditionText}, Rain Prob ${cityA.daily[0].rainProb}%, Outdoor Score ${cityA.intelligence.scores.outdoor}/100.
          Tomorrow: Max Temp ${cityA.daily[1].maxTemp}°C, Min Temp ${cityA.daily[1].minTemp}°C, condition ${cityA.daily[1].conditionText}, Rain Prob ${cityA.daily[1].rainProb}%, Moon phase illumination ${cityA.daily[1].moonIllumination}%.
          Keep it highly conversational, insightful, and tell a micro-story about how the user should adjust their plans. Limit to 3 elegant sentences.`;
        } else {
          const citiesContext = activeCities.map((c, i) => {
            const temps = c.daily.map(d => d.maxTemp);
            return `City [${i+1}]: ${c.location.name} (Coords: [${c.location.lat.toFixed(3)}, ${c.location.lon.toFixed(3)}])
            - Current: Temp ${c.current.temp}°C, feels like ${c.current.feelsLike}°C, humidity ${c.current.humidity}%, condition "${c.current.conditionText}", AQI ${c.airQuality.aqi} (${c.airQuality.label}).
            - 7-Day Range: Temps between ${Math.min(...temps)}°C and ${Math.max(...temps)}°C. Rain Prob up to ${Math.max(...c.daily.map(d => d.rainProb))}%.`;
          }).join("\n");

          prompt = `You are a Senior Meteorological Analyst and Comparative Climatology Expert.
          Analyze and contrast the atmospheric and meteorological profiles of the following cities based on this real-time forecast data:
          
          ${citiesContext}
          
          Selected Comparative Mode: ${mode}
          Selected Comparison Dimension: ${dimension || "Atmospheric Stability"}
          User's Customized Comparison Inquiry: ${purpose || "Analyze major atmospheric differences and similarities"}
          
          Generate a beautiful, professional, structured comparative report in MARKDOWN.
          Include:
          1. **KEY COMPARATIVE FINDINGS**: Write 2-3 highly analytical, scientific, yet readable sentences explaining the most prominent atmospheric variations, convergences, or anomalies between these cities.
          2. **MICRO CLIMATIC PROFILES**: Give an extremely sharp, 1-sentence atmospheric identity tag for each compared city.
          3. **SIGNIFICANT DIVERGENCES**: Detail exactly 3 specific, data-verified differences (such as thermal range gaps, moisture variances, or air quality divergence) between the locations.
          
          Keep the language strictly objective, professional, and elegant. Start directly with the markdown response. No introductory pleasantries. If mentioning correlations, be careful to use language such as 'is associated with', 'the data suggests', or 'the observed pattern indicates' instead of claiming definite causation.`;
        }

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: prompt
        });

        if (response.text) {
          comparisonText = response.text.trim();
        }
      } catch (e: any) {
        isFallback = true;
        const errMsg = e?.message || String(e);
        console.warn("Gemini API: Multi-city compare error, falling back to deterministic data. Details:", errMsg);
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          fallbackReason = "quota_exceeded";
        } else {
          fallbackReason = "offline";
        }
      }
    }

    const responseData = {
      comparison: comparisonText,
      cityAnalyses,
      similarityScores,
      topDifferences,
      rankings,
      isFallback,
      fallbackReason
    };

    serverCache.set(cacheKey, responseData, 900); // Cache for 15 mins
    res.json(responseData);
  } catch (err) {
    console.error("Comparison API error:", err);
    res.status(500).json({ error: "Failed to compare weather intelligence" });
  }
});

// E. Activity Planning and Intelligence system
app.post("/api/planner/plan", async (req, res) => {
  const { query, activityType, location, destination, dateRange, preferredTime, duration, weatherData } = req.body;
  if (!weatherData) {
    return res.status(400).json({ error: "Active weather data context is required for planning" });
  }
  try {
    const plan = await generateAIPlan({
      query,
      activityType,
      location,
      destination,
      dateRange,
      preferredTime,
      duration
    }, weatherData);
    res.json(plan);
  } catch (err) {
    console.error("Activity Planner API error:", err);
    res.status(500).json({ error: "Failed to generate AI weather plan" });
  }
});

// F. Meteorological Radar Analysis system
app.post("/api/radar/analyze", async (req, res) => {
  const { lat, lon, cityName, radarScene } = req.body;
  if (!radarScene) {
    return res.status(400).json({ error: "Active radar scene telemetry context is required" });
  }
  try {
    const analysis = await generateAIRadarAnalysis({
      lat: Number(lat),
      lon: Number(lon),
      cityName: cityName || "Selected Region",
      radarScene
    });
    res.json(analysis);
  } catch (err) {
    console.error("Radar Analyzer API error:", err);
    res.status(500).json({ error: "Failed to generate AI radar analysis" });
  }
});

// Configure Vite and static server asset pathways
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SkySense backend active on port ${PORT}`);
  });
}

startServer();
