import { 
  LocationData, 
  CurrentWeather, 
  HourlyForecast, 
  DailyForecast, 
  AirQuality, 
  FullWeatherData, 
  WeatherIntelligence 
} from "../src/types.js";
import { getWeatherConditionByCode, compileWeatherIntelligence } from "./intelligence.js";
import { serverCache } from "./cache.js";

// Normalize Open-Meteo WMO weather codes to beautiful descriptive strings
function getConditionText(code: number): string {
  return getWeatherConditionByCode(code);
}

// Helper to search Indian PIN code post offices using government postal pincode API
async function getPostOfficesForIndiaPincode(pincode: string): Promise<LocationData[]> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || !data[0] || data[0].Status !== "Success" || !Array.isArray(data[0].PostOffice)) {
      return [];
    }

    const poList = data[0].PostOffice;
    if (poList.length === 0) return [];

    // Get general pincode coordinates via Nominatim as reference
    let fallbackLat = 22.5726;
    let fallbackLon = 88.3639;
    try {
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`;
      const fallbackRes = await fetch(url, {
        headers: {
          "User-Agent": "SkySenseWeatherIntelligence/1.0 (jkbharti159@gmail.com)"
        }
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          fallbackLat = parseFloat(fallbackData[0].lat);
          fallbackLon = parseFloat(fallbackData[0].lon);
        }
      }
    } catch (e) {
      console.error("Failed to get fallback coordinates for India PIN code:", e);
    }

    return poList.map((po: any) => {
      const cleanPoName = po.Name.replace(/post\s*office/gi, "").replace(/\s+/g, " ").trim();
      return {
        name: cleanPoName,
        country: "India",
        admin1: po.State || po.Circle || "",
        lat: fallbackLat,
        lon: fallbackLon
      };
    });
  } catch (err) {
    console.error("India pincode search failed:", err);
    return [];
  }
}

// Helper to find nearby post offices in a bounding box around a postal code (for worldwide ZIP codes)
async function findPostOfficesNear(lat: number, lon: number, postcode: string, country: string, state: string): Promise<LocationData[]> {
  try {
    const viewbox = `${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}`;
    const url = `https://nominatim.openstreetmap.org/search?q=post+office&format=json&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SkySenseWeatherIntelligence/1.0 (jkbharti159@gmail.com)"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const mainName = item.name || addr.suburb || addr.neighbourhood || item.display_name.split(",")[0] || "Postal Area";
      const cleanMainName = mainName.replace(/post\s*office/gi, "").replace(/\s+/g, " ").trim() || "Postal Area";
      return {
        name: cleanMainName,
        country: addr.country || country,
        admin1: addr.state || addr.region || state,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      };
    });
  } catch (err) {
    console.error("Failed to find nearby post offices:", err);
    return [];
  }
}

// Helper to format LocationData from OSM Nominatim result
function formatLocationFromNominatim(item: any): LocationData {
  const addr = item.address || {};
  const postcode = addr.postcode || "";
  
  const country = addr.country || "";
  const admin1 = addr.state || addr.region || "";
  const county = addr.county || "";
  
  // 1. Identify specific local area within the city or town
  const localKeys = ["neighbourhood", "suburb", "quarter", "hamlet", "village", "city_district", "subdistrict", "borough", "road"];
  let localName = "";
  for (const key of localKeys) {
    if (addr[key]) {
      localName = addr[key];
      break;
    }
  }
  
  // 2. Identify broader city/town/municipality
  const cityKeys = ["town", "city", "municipality"];
  let cityName = "";
  for (const key of cityKeys) {
    if (addr[key]) {
      cityName = addr[key];
      break;
    }
  }
  
  let mainName = "";
  if (localName && cityName && localName.toLowerCase() !== cityName.toLowerCase()) {
    mainName = `${localName}, ${cityName}`;
  } else if (localName) {
    mainName = localName;
  } else if (cityName) {
    mainName = cityName;
  } else if (county) {
    mainName = county;
  } else {
    // Fallback to parsed display name parts
    const parts = (item.display_name || "").split(",").map((p: string) => p.trim()).filter(Boolean);
    const undesirable = new Set([
      country.toLowerCase(),
      admin1.toLowerCase(),
      county.toLowerCase(),
      postcode.toLowerCase(),
      "england", "scotland", "wales", "northern ireland"
    ]);
    const candidateParts = parts.filter((part: string) => {
      const lower = part.toLowerCase();
      if (undesirable.has(lower)) return false;
      if (/^\d+$/.test(part)) return false;
      return true;
    });
    mainName = candidateParts[0] || parts[0] || "Selected Location";
  }
  
  return {
    name: mainName,
    country,
    admin1,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon)
  };
}

// Helper to search via OpenStreetMap Nominatim API, which is extremely accurate for postal/zip/PIN codes
async function searchNominatim(query: string): Promise<LocationData[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SkySenseWeatherIntelligence/1.0 (jkbharti159@gmail.com)"
      }
    });
    if (!res.ok) throw new Error("Nominatim search request failed");
    let data = await res.json();
    
    // If standard search on postal/ZIP code yielded nothing, try explicit postalcode lookup
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[Geocoding] Standard Nominatim search returned 0 results. Trying postalcode-specific search for "${query}".`);
      const urlPostal = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1&accept-language=en`;
      const resPostal = await fetch(urlPostal, {
        headers: {
          "User-Agent": "SkySenseWeatherIntelligence/1.0 (jkbharti159@gmail.com)"
        }
      });
      if (resPostal.ok) {
        const dataPostal = await resPostal.json();
        if (Array.isArray(dataPostal)) {
          data = dataPostal;
        }
      }
    }

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => formatLocationFromNominatim(item));
  } catch (err) {
    console.error("Nominatim search failed:", err);
    return [];
  }
}

// 1. Fetch Geocoding suggestions from Open-Meteo or Nominatim
export async function searchLocations(query: string): Promise<LocationData[]> {
  const cacheKey = `geo:${query.toLowerCase().trim()}`;
  const cached = serverCache.get<LocationData[]>(cacheKey);
  if (cached) return cached;

  const trimmedQuery = query.trim();
  const hasDigits = /\d/.test(trimmedQuery);
  
  // Check if query contains a word that looks like a zip/pin/postal code (3-10 characters containing letters and numbers or just numbers)
  const words = trimmedQuery.split(/\s+/);
  const containsPostalCode = words.some(w => {
    if (/^\d{3,8}$/.test(w)) return true;
    if (/^[A-Z0-9]{3,8}$/i.test(w) && /\d/.test(w) && /[A-Z]/i.test(w)) return true;
    return false;
  });

  const isPostalQuery = containsPostalCode || (hasDigits && trimmedQuery.length >= 3 && trimmedQuery.length <= 12);

  if (isPostalQuery) {
    console.log(`[Geocoding] Postal query detected: "${trimmedQuery}". Querying Nominatim first.`);
    
    // Check if there is an Indian PIN code (6 digits) in the query
    const indiaPinMatch = trimmedQuery.match(/\b\d{6}\b/);
    if (indiaPinMatch) {
      const pincode = indiaPinMatch[0];
      console.log(`[Geocoding] Indian PIN code detected: "${pincode}". Fetching from Indian Post Office API.`);
      const poResults = await getPostOfficesForIndiaPincode(pincode);
      if (poResults.length > 0) {
        serverCache.set(cacheKey, poResults, 3600); // cache for 1 hour
        return poResults;
      }
    }

    const nominatimResults = await searchNominatim(trimmedQuery);
    if (nominatimResults.length > 0) {
      // For any non-Indian postal query, let's also enrich it by finding the actual post office inside that zip/postal area
      const primaryResult = nominatimResults[0];
      const postcodeMatch = trimmedQuery.match(/\b[A-Z0-9-]{3,10}\b/i);
      const postcode = postcodeMatch ? postcodeMatch[0] : (primaryResult.name.match(/\(([^)]+)\)/)?.[1] || trimmedQuery);
      
      console.log(`[Geocoding] Enrichment: Searching for post offices near "${primaryResult.name}" coords (${primaryResult.lat}, ${primaryResult.lon})`);
      const nearbyPOs = await findPostOfficesNear(
        primaryResult.lat,
        primaryResult.lon,
        postcode,
        primaryResult.country,
        primaryResult.admin1
      );
      
      const combinedResults = [...nearbyPOs, ...nominatimResults];
      serverCache.set(cacheKey, combinedResults, 3600); // cache for 1 hour
      return combinedResults;
    }
    console.log(`[Geocoding] Nominatim returned 0 results. Falling back to standard Open-Meteo for "${trimmedQuery}".`);
  }

  // Fallback / Standard city search via Open-Meteo Geocoding API
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=10&language=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding API request failed");
    
    const data = await res.json();
    if (data.results && Array.isArray(data.results)) {
      const locations: LocationData[] = data.results.map((item: any) => ({
        name: item.name,
        country: item.country || "",
        admin1: item.admin1 || "",
        lat: item.latitude,
        lon: item.longitude
      }));

      if (locations.length > 0) {
        serverCache.set(cacheKey, locations, 3600); // cache for 1 hour
        return locations;
      }
    }
  } catch (err) {
    console.error("Open-Meteo geocoding failed:", err);
  }

  // If Open-Meteo failed or returned 0 results, and we didn't search Nominatim yet, try Nominatim as a fallback
  if (!isPostalQuery) {
    console.log(`[Geocoding] Standard search returned 0 results. Trying Nominatim fallback for "${trimmedQuery}".`);
    const nominatimResults = await searchNominatim(trimmedQuery);
    if (nominatimResults.length > 0) {
      serverCache.set(cacheKey, nominatimResults, 3600); // cache for 1 hour
      return nominatimResults;
    }
  }

  return [];
}

// 2. Perform Reverse Geocoding via Nominatim
export async function reverseGeocode(lat: number, lon: number): Promise<LocationData> {
  const cacheKey = `reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = serverCache.get<LocationData>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SkySenseWeatherIntelligence/1.0 (jkbharti159@gmail.com)"
      }
    });
    
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data = await res.json();
    const location = formatLocationFromNominatim(data);
    
    serverCache.set(cacheKey, location, 86400); // Cache for 24 hours
    return location;
  } catch (err) {
    console.error("Reverse geocoding failed, returning fallback:", err);
    return {
      name: "Your Location",
      country: "Detected via GPS",
      lat,
      lon
    };
  }
}

// 3. Fetch Full Weather Data
export async function getFullWeatherData(lat: number, lon: number, customLocation?: LocationData): Promise<FullWeatherData> {
  const cacheKey = `weather:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = serverCache.get<FullWeatherData>(cacheKey);
  if (cached) return cached;

  const locationPromise = customLocation ? Promise.resolve(customLocation) : reverseGeocode(lat, lon);
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide`;

  let location: LocationData;
  let forecastData: any;
  let aqData: any = null;

  try {
    const [locResult, forecastRes, aqRes] = await Promise.all([
      locationPromise,
      fetch(forecastUrl),
      fetch(aqUrl).catch(e => {
        console.error("AQI fetch failed:", e);
        return null;
      })
    ]);

    location = locResult;

    if (!forecastRes.ok) throw new Error(`Open-Meteo Forecast failed: ${forecastRes.statusText}`);
    forecastData = await forecastRes.json();

    if (aqRes && aqRes.ok) {
      aqData = await aqRes.json();
    }
  } catch (err) {
    console.error("Parallel fetch failed, using fallback:", err);
    const fallbackLoc = customLocation || await locationPromise.catch(() => ({ name: "Your Location", country: "Detected via GPS", lat, lon }));
    return getFallbackWeatherData(fallbackLoc);
  }

  try {
    // C. Map Current Weather
    const c = forecastData.current;
    const currentSunrise = forecastData.daily?.sunrise?.[0] || "";
    const currentSunset = forecastData.daily?.sunset?.[0] || "";
    
    // We can extract current UV index from the hourly dataset closest to now
    const currentHourIdx = new Date().getHours();
    const currentUvi = forecastData.hourly?.uv_index?.[currentHourIdx] || 2;
    const currentVis = forecastData.hourly?.visibility?.[currentHourIdx] || 10000;

    const current: CurrentWeather = {
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      uvi: currentUvi,
      visibility: currentVis,
      clouds: c.cloud_cover,
      pressure: c.pressure_msl,
      conditionCode: c.weather_code,
      conditionText: getConditionText(c.weather_code),
      aqi: aqData?.current?.us_aqi || aqData?.current?.european_aqi || 42,
      sunrise: currentSunrise,
      sunset: currentSunset,
      timestamp: c.time,
      precipitation: typeof c.precipitation === "number" ? c.precipitation : 0
    };

    // D. Map Hourly Forecast (Limit to 24 hours)
    const hourly: HourlyForecast[] = [];
    const hourlyData = forecastData.hourly || {};
    const limit = Math.min(24, hourlyData.time?.length || 0);
    
    for (let i = 0; i < limit; i++) {
      hourly.push({
        time: hourlyData.time[i],
        temp: hourlyData.temperature_2m[i],
        feelsLike: hourlyData.apparent_temperature[i],
        rainProb: hourlyData.precipitation_probability[i] || 0,
        windSpeed: hourlyData.wind_speed_10m[i],
        conditionCode: hourlyData.weather_code[i],
        conditionText: getConditionText(hourlyData.weather_code[i]),
        uvi: hourlyData.uv_index[i] || 0,
        humidity: hourlyData.relative_humidity_2m[i] || 50
      });
    }

    // E. Map Daily Forecast (Limit to 10 days, Open-Meteo returns up to 7, let's map what we have)
    const daily: DailyForecast[] = [];
    const dailyData = forecastData.daily || {};
    const daysLimit = dailyData.time?.length || 0;

    for (let i = 0; i < daysLimit; i++) {
      const dateStr = dailyData.time[i];
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      // Estimate simple moon phase based on days since standard new moon
      // Simple synodic month calculation for visual effect:
      const msNewMoon = 1704949200000; // Jan 11, 2024 New Moon
      const age = (dateObj.getTime() - msNewMoon) / (29.530588853 * 24 * 60 * 60 * 1000);
      const moonPhase = age - Math.floor(age); // 0 (new) to 1 (new)
      const moonIllumination = Math.round(100 * (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2);

      const maxTemp = dailyData.temperature_2m_max[i];
      const minTemp = dailyData.temperature_2m_min[i];
      const rainProb = dailyData.precipitation_probability_max[i] || 0;
      const condCode = dailyData.weather_code[i];
      const condText = getConditionText(condCode);

      // Generate a tiny beautiful deterministic card summary
      let summary = `${condText}. High of ${Math.round(maxTemp)}°C. `;
      if (rainProb >= 50) summary += `Rain expected (${rainProb}%).`;
      else if (maxTemp > 28) summary += "Hot afternoon forecast.";
      else if (minTemp < 10) summary += "Chilly morning temperatures.";
      else summary += "Calm atmospheric conditions.";

      daily.push({
        date: dateLabel,
        dayName,
        maxTemp,
        minTemp,
        rainProb,
        conditionCode: condCode,
        conditionText: condText,
        humidity: 60, // estimate average
        windSpeed: dailyData.wind_speed_10m_max[i],
        uvi: dailyData.uv_index_max[i] || 2,
        sunrise: dailyData.sunrise[i],
        sunset: dailyData.sunset[i],
        moonPhase,
        moonIllumination,
        summary
      });
    }

    // F. Map Air Quality
    const aqc = aqData?.current || {};
    const aqiVal = aqc.us_aqi || aqc.european_aqi || 42;
    
    let label: AirQuality["label"] = "Good";
    let color = "#10B981"; // green
    let description = "Air quality is considered satisfactory, and air pollution poses little or no risk.";

    if (aqiVal > 150) {
      label = "Very Poor";
      color = "#EF4444"; // red
      description = "Health alert: everyone may experience more serious health effects.";
    } else if (aqiVal > 100) {
      label = "Poor";
      color = "#F59E0B"; // orange
      description = "Members of sensitive groups may experience health effects. General public not likely affected.";
    } else if (aqiVal > 50) {
      label = "Moderate";
      color = "#FBBF24"; // yellow-green
      description = "Air quality is acceptable; however, there may be moderate health concern for sensitive individuals.";
    }

    const airQuality: AirQuality = {
      aqi: aqiVal,
      pm2_5: aqc.pm2_5 || 8.5,
      pm10: aqc.pm10 || 15.0,
      no2: aqc.nitrogen_dioxide || 10.1,
      o3: aqc.ozone || 34.2,
      co: aqc.carbon_monoxide || 250.0,
      so2: aqc.sulphur_dioxide || 1.2,
      label,
      color,
      description
    };

    // G. Generate Weather Intelligence
    const intelligence = await compileWeatherIntelligence(location, current, hourly, airQuality);

    const fullWeatherData: FullWeatherData = {
      location,
      current,
      hourly,
      daily,
      airQuality,
      intelligence,
      cachedAt: new Date().toISOString()
    };

    // Cache the full data for 15 minutes (900 seconds)
    serverCache.set(cacheKey, fullWeatherData, 900);
    return fullWeatherData;
  } catch (err) {
    console.error("Failed to build full weather object, generating fallback mock:", err);
    // Return a solid mock object so the app never throws raw unhandled crashes
    const defaultLoc = location || { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 };
    return getFallbackWeatherData(defaultLoc);
  }
}

// Generate an ultra-premium mock fallback if API fails
function getFallbackWeatherData(location: LocationData): FullWeatherData {
  const current: CurrentWeather = {
    temp: 24.5,
    feelsLike: 25.2,
    humidity: 62,
    windSpeed: 12.5,
    windDirection: 180,
    uvi: 5,
    visibility: 10000,
    clouds: 20,
    pressure: 1013,
    conditionCode: 1,
    conditionText: "Mainly Clear",
    aqi: 38,
    sunrise: new Date().toISOString(),
    sunset: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    precipitation: 0.0
  };

  const hourly: HourlyForecast[] = Array.from({ length: 24 }).map((_, i) => ({
    time: new Date(Date.now() + i * 3600000).toISOString(),
    temp: 20 + Math.sin(i / 3) * 5,
    feelsLike: 21 + Math.sin(i / 3) * 5,
    rainProb: i === 15 || i === 16 ? 60 : 10,
    windSpeed: 10 + i * 0.2,
    conditionCode: i === 15 || i === 16 ? 61 : 1,
    conditionText: i === 15 || i === 16 ? "Slight Rain" : "Mainly Clear",
    uvi: Math.max(0, Math.sin(i / 4) * 8),
    humidity: 60 + Math.sin(i / 5) * 10
  }));

  const daily: DailyForecast[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      maxTemp: 26 + Math.sin(i) * 2,
      minTemp: 18 + Math.sin(i) * 2,
      rainProb: i % 3 === 0 ? 55 : 10,
      conditionCode: i % 3 === 0 ? 61 : 1,
      conditionText: i % 3 === 0 ? "Slight Rain" : "Mainly Clear",
      humidity: 60,
      windSpeed: 11.2,
      uvi: 5,
      sunrise: new Date().toISOString(),
      sunset: new Date().toISOString(),
      moonPhase: 0.5,
      moonIllumination: 50,
      summary: "Calm conditions, perfect for outside leisure."
    };
  });

  const airQuality: AirQuality = {
    aqi: 38,
    pm2_5: 6.2,
    pm10: 12.1,
    no2: 8.5,
    o3: 31.0,
    co: 210.0,
    so2: 1.5,
    label: "Good",
    color: "#10B981",
    description: "Satisfactory air conditions, little or no health risk."
  };

  const intelligence: WeatherIntelligence = {
    generalSummary: "The day starts out beautifully clear with a high of 26°C. Rain chances increase to 60% in the mid-afternoon.",
    story: {
      morning: "Pleasant sunrise with crisp, cool temperatures ideal for a morning walk.",
      afternoon: "Temperatures peak around 26°C with partial clouds. Rain chances scale up around 3 PM.",
      evening: "Light showers are expected, helping to cool the city and clear the air.",
      night: "Settling into clear sky and light winds, temperature dipping to 18°C."
    },
    scores: {
      outdoor: 80,
      travel: 85,
      photography: 75,
      exercise: 82,
      commute: 90,
      outdoorText: "Perfect window for park visits in the morning.",
      travelText: "Sightseeing is clear, but carry light rain gear just in case.",
      photographyText: "Dramatic clouds expected late afternoon; excellent sunset potential.",
      exerciseText: "Fabulous conditions for running before the heat of midday.",
      commuteText: "Smooth travel parameters with clear sightlines."
    },
    plan: {
      morning: { temp: 19, condition: "Clear Sky", rainProb: 10, wind: 8, recommendation: "Perfect window for high-exertion workouts outside." },
      afternoon: { temp: 26, condition: "Partly Cloudy", rainProb: 15, wind: 12, recommendation: "Pleasant. Sky features high light clouds." },
      evening: { temp: 21, condition: "Slight Rain", rainProb: 60, wind: 14, recommendation: "Keep an umbrella handy if returning from work." },
      night: { temp: 18, condition: "Clear Sky", rainProb: 5, wind: 6, recommendation: "Calm and crisp, ideal night for resting." }
    },
    alerts: [],
    photographyDetails: {
      goldenHourMorning: "05:30 AM - 07:00 AM",
      goldenHourEvening: "06:15 PM - 07:45 PM",
      blueHourMorning: "05:00 AM - 05:30 AM",
      blueHourEvening: "07:45 PM - 08:15 PM",
      rating: "Good",
      tips: ["Focus on morning golden hour for crisp lighting.", "High dynamic range is recommended to capture active sky contours."]
    }
  };

  return {
    location,
    current,
    hourly,
    daily,
    airQuality,
    intelligence,
    cachedAt: new Date().toISOString()
  };
}
