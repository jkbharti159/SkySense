import { GoogleGenAI, Type } from "@google/genai";
import { 
  CurrentWeather, 
  HourlyForecast, 
  DailyForecast, 
  AirQuality, 
  WeatherIntelligence, 
  WeatherScores, 
  DayPlan, 
  LocationData, 
  WeatherAlert 
} from "../src/types.js";

// WMO Weather Codes mapping to human-friendly text
export function getWeatherConditionByCode(code: number): string {
  const codes: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail"
  };
  return codes[code] || "Scattered Clouds";
}

// Helper to calculate golden and blue hours
function calculatePhotoHours(sunriseStr: string, sunsetStr: string) {
  try {
    const sunrise = new Date(sunriseStr);
    const sunset = new Date(sunsetStr);

    if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
      throw new Error("Invalid date");
    }

    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Golden hours
    const goldenMorningStart = new Date(sunrise.getTime() - 30 * 60 * 1000);
    const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
    const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);
    const goldenEveningEnd = new Date(sunset.getTime() + 30 * 60 * 1000);

    // Blue hours
    const blueMorningStart = new Date(sunrise.getTime() - 50 * 60 * 1000);
    const blueMorningEnd = new Date(sunrise.getTime() - 30 * 60 * 1000);
    const blueEveningStart = new Date(sunset.getTime() + 30 * 60 * 1000);
    const blueEveningEnd = new Date(sunset.getTime() + 50 * 60 * 1000);

    return {
      goldenHourMorning: `${formatTime(goldenMorningStart)} - ${formatTime(goldenMorningEnd)}`,
      goldenHourEvening: `${formatTime(goldenEveningStart)} - ${formatTime(goldenEveningEnd)}`,
      blueHourMorning: `${formatTime(blueMorningStart)} - ${formatTime(blueMorningEnd)}`,
      blueHourEvening: `${formatTime(blueEveningStart)} - ${formatTime(blueEveningEnd)}`
    };
  } catch (e) {
    return {
      goldenHourMorning: "06:00 AM - 07:30 AM",
      goldenHourEvening: "05:30 PM - 07:00 PM",
      blueHourMorning: "05:40 AM - 06:00 AM",
      blueHourEvening: "07:00 PM - 07:20 PM"
    };
  }
}

// Deterministic Scoring Engine
export function calculateScores(
  current: CurrentWeather,
  hourly: HourlyForecast[],
  aqi: number
): WeatherScores {
  // 1. OUTDOOR ACTIVITIES SCORE
  let outdoor = 100;
  // Temp penalty: perfect is 22C
  const tempDiff = Math.abs(current.temp - 22);
  outdoor -= Math.min(35, tempDiff * 2.5);
  // Rain penalty (look at highest rain prob in next 6 hours)
  const maxRainProb = Math.max(...hourly.slice(0, 6).map(h => h.rainProb), 0);
  outdoor -= maxRainProb * 0.6;
  // Wind penalty
  if (current.windSpeed > 15) {
    outdoor -= Math.min(25, (current.windSpeed - 15) * 1.5);
  }
  // AQI penalty
  if (aqi > 50) {
    outdoor -= Math.min(40, (aqi - 50) * 0.3);
  }
  // Clamp
  outdoor = Math.max(10, Math.min(100, Math.round(outdoor)));

  // 2. TRAVEL SCORE
  let travel = 100;
  // Vis penalty
  const visKm = current.visibility / 1000;
  if (visKm < 8) {
    travel -= Math.min(40, (8 - visKm) * 8);
  }
  // Rain prob
  travel -= maxRainProb * 0.4;
  // Wind Speed
  if (current.windSpeed > 25) {
    travel -= Math.min(30, (current.windSpeed - 25) * 2);
  }
  travel = Math.max(10, Math.min(100, Math.round(travel)));

  // 3. PHOTOGRAPHY SCORE
  let photo = 100;
  // Rain
  photo -= maxRainProb * 0.8;
  // Cloud cover: perfect is 30%-50% for dynamic skies. 0% is plain, 100% is gray/overcast.
  if (current.clouds < 20) {
    photo -= (20 - current.clouds) * 1; // minor penalty for clear skies
  } else if (current.clouds > 60) {
    photo -= (current.clouds - 60) * 0.8; // penalty for overcast skies
  }
  // Visibility
  if (visKm < 10) {
    photo -= Math.min(50, (10 - visKm) * 7);
  }
  photo = Math.max(10, Math.min(100, Math.round(photo)));

  // 4. EXERCISE SCORE (Ideal cool weather, good AQI)
  let exercise = 100;
  // Temp penalty: perfect is 16C for running
  const runTempDiff = Math.abs(current.temp - 16);
  exercise -= Math.min(40, runTempDiff * 2.2);
  // Humidity + Heat index penalty
  if (current.temp > 28 && current.humidity > 70) {
    exercise -= 25;
  }
  // Rain
  exercise -= maxRainProb * 0.7;
  // AQI penalty (very bad for lungs)
  if (aqi > 50) {
    exercise -= Math.min(50, (aqi - 50) * 0.5);
  }
  exercise = Math.max(10, Math.min(100, Math.round(exercise)));

  // 5. COMMUTE SCORE (Mainly impacted by heavy rain, fog, high wind, snowy conditions)
  let commute = 100;
  if (current.conditionCode >= 61 && current.conditionCode <= 65) {
    commute -= 30; // heavy rain
  } else if (current.conditionCode >= 71 && current.conditionCode <= 75) {
    commute -= 40; // snow
  } else if (current.conditionCode === 45 || current.conditionCode === 48) {
    commute -= 35; // fog
  }
  if (current.windSpeed > 30) {
    commute -= 25;
  }
  commute -= maxRainProb * 0.3;
  commute = Math.max(15, Math.min(100, Math.round(commute)));

  const getDesc = (score: number, activity: string) => {
    if (score >= 85) return `Excellent conditions for ${activity}. Ideal weather!`;
    if (score >= 70) return `Good conditions for ${activity}. Minor weather factors.`;
    if (score >= 50) return `Fair conditions for ${activity}. Plan carefully.`;
    return `Poor conditions for ${activity}. Adverse weather likely to impact plans.`;
  };

  return {
    outdoor,
    travel,
    photography: photo,
    exercise,
    commute,
    outdoorText: getDesc(outdoor, "outdoor activities"),
    travelText: getDesc(travel, "traveling and sightseeing"),
    photographyText: getDesc(photo, "photography"),
    exerciseText: getDesc(exercise, "outdoor exercise"),
    commuteText: getDesc(commute, "daily commuting")
  };
}

// Generate Smart Alerts
export function generateAlerts(
  current: CurrentWeather,
  hourly: HourlyForecast[],
  aqi: AirQuality
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Heavy Rain Warning
  if (current.conditionCode === 65 || current.conditionCode === 82) {
    alerts.push({
      type: "danger",
      title: "Heavy Precipitation Warning",
      message: "Intense downpours observed. Localized ponding and reduced visibility expected."
    });
  }

  // Rain Approaching Alert disabled by user request

  // High Wind Alert
  if (current.windSpeed > 25) {
    alerts.push({
      type: "warning",
      title: "Strong Winds Active",
      message: `Wind speeds are currently ${Math.round(current.windSpeed)} km/h. Secure loose outdoor objects.`
    });
  }

  // High UV Alert
  if (current.uvi >= 8) {
    alerts.push({
      type: "warning",
      title: "Extreme UV Hazard",
      message: `UV Index is currently high (${current.uvi}). Outdoor skin exposure will burn quickly. Wear SPF 30+ sun protection.`
    });
  }

  // Air Quality Hazard
  if (aqi.aqi > 100) {
    alerts.push({
      type: "danger",
      title: "Poor Air Quality Alert",
      message: `Air Quality Index is ${aqi.aqi} (${aqi.label}). Sensitive groups should reduce prolonged outdoor exertion.`
    });
  }

  // Sudden Temp Change Alert
  const currentTemp = current.temp;
  const eveningTemp = hourly[6]?.temp; // roughly 6 hours later
  if (eveningTemp && Math.abs(currentTemp - eveningTemp) >= 8) {
    alerts.push({
      type: "info",
      title: "Significant Temperature Change",
      message: `Temperatures are expected to drop by ${Math.round(currentTemp - eveningTemp)}°C later today. Dress in layers.`
    });
  }

  return alerts;
}

// Generate deterministic Plan fallback
export function getDeterministicPlan(current: CurrentWeather, hourly: HourlyForecast[]): DayPlan {
  const getRecommendation = (temp: number, rainProb: number, isNight = false) => {
    if (rainProb >= 60) return "Carry an umbrella. High risk of rain, outdoor plans should move inside.";
    if (temp > 32) return "Hot conditions. Stay hydrated and limit peak sun exposure.";
    if (temp < 10) return "Chilly weather. Bundle up, ideal for cozy indoor outings.";
    if (isNight) return "Cool, crisp atmosphere. Perfect for a quiet night in.";
    return "Beautiful and pleasant. Excellent window for park visits, walking, or running!";
  };

  // Divide 24h into segments
  const morningWeather = hourly[8] || hourly[0]; // ~8 AM
  const afternoonWeather = hourly[14] || hourly[0]; // ~2 PM
  const eveningWeather = hourly[19] || hourly[0]; // ~7 PM
  const nightWeather = hourly[23] || hourly[0]; // ~11 PM

  return {
    morning: {
      temp: Math.round(morningWeather.temp),
      condition: morningWeather.conditionText,
      rainProb: morningWeather.rainProb,
      wind: Math.round(morningWeather.windSpeed),
      recommendation: getRecommendation(morningWeather.temp, morningWeather.rainProb)
    },
    afternoon: {
      temp: Math.round(afternoonWeather.temp),
      condition: afternoonWeather.conditionText,
      rainProb: afternoonWeather.rainProb,
      wind: Math.round(afternoonWeather.windSpeed),
      recommendation: getRecommendation(afternoonWeather.temp, afternoonWeather.rainProb)
    },
    evening: {
      temp: Math.round(eveningWeather.temp),
      condition: eveningWeather.conditionText,
      rainProb: eveningWeather.rainProb,
      wind: Math.round(eveningWeather.windSpeed),
      recommendation: getRecommendation(eveningWeather.temp, eveningWeather.rainProb)
    },
    night: {
      temp: Math.round(nightWeather.temp),
      condition: nightWeather.conditionText,
      rainProb: nightWeather.rainProb,
      wind: Math.round(nightWeather.windSpeed),
      recommendation: getRecommendation(nightWeather.temp, nightWeather.rainProb, true)
    }
  };
}

// Main processing function that fuses Deterministic Analytics + Gemini AI Insights
export async function compileWeatherIntelligence(
  location: LocationData,
  current: CurrentWeather,
  hourly: HourlyForecast[],
  aqi: AirQuality
): Promise<WeatherIntelligence> {
  // 1. Calculate deterministic scores
  const scores = calculateScores(current, hourly, aqi.aqi);

  // 2. Compute solar/photo conditions
  const photoHours = calculatePhotoHours(current.sunrise, current.sunset);
  
  // Rating determination
  let photoRating: 'Excellent' | 'Good' | 'Average' | 'Poor' = 'Good';
  if (scores.photography >= 85) photoRating = 'Excellent';
  else if (scores.photography >= 65) photoRating = 'Good';
  else if (scores.photography >= 45) photoRating = 'Average';
  else photoRating = 'Poor';

  const photoTips = [
    `Golden hour ranges: ${photoHours.goldenHourMorning} and ${photoHours.goldenHourEvening}.`,
    current.clouds > 30 && current.clouds < 60 
      ? "Dramatic cloud formations active. Perfect for dynamic landscape compositions."
      : "Skies are fairly flat. Focus on portrait work, textures, or detailed macro shots.",
    current.visibility > 10000 
      ? "Excellent atmospheric clarity. Perfect for long-distance, mountain, or skyline photography."
      : "Hazy or low-visibility air detected. Utilize shorter focal lengths and close-up compositions."
  ];

  // 3. Generate alerts
  const alerts = generateAlerts(current, hourly, aqi);

  // 4. Prepare plan fallback
  const plan = getDeterministicPlan(current, hourly);

  // Default deterministic text summary
  let generalSummary = `Currently ${current.temp}°C and ${current.conditionText.toLowerCase()}. Wind is traveling at ${Math.round(current.windSpeed)} km/h. `;
  if (scores.outdoor >= 75) {
    generalSummary += "Ideal day for outside ventures. Atmospheric conditions are calm and accommodating.";
  } else if (alerts.length > 0) {
    generalSummary += `Notice: ${alerts[0].message}`;
  } else {
    generalSummary += "Expect typical seasonal trends. Bring standard gear and check conditions periodically.";
  }

  const deterministicStory = {
    morning: `A temperature of ${plan.morning.temp}°C with ${plan.morning.condition.toLowerCase()}. Rain risk is minimal at ${plan.morning.rainProb}%.`,
    afternoon: `Expect high heat of ${plan.afternoon.temp}°C. Sky matches ${plan.afternoon.condition.toLowerCase()}. Outdoor comfort scales to ${scores.outdoor}/100.`,
    evening: `Cooler evening conditions around ${plan.evening.temp}°C. Weather settling into ${plan.evening.condition.toLowerCase()}.`,
    night: `Winding down at ${plan.night.temp}°C. Peaceful and mostly ${plan.night.condition.toLowerCase()}.`
  };

  // Check if Gemini API Key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    // Return high-quality deterministic model if no AI key configured
    return {
      isFallback: true,
      fallbackReason: "no_api_key",
      generalSummary,
      story: deterministicStory,
      scores,
      plan,
      alerts,
      photographyDetails: {
        ...photoHours,
        rating: photoRating,
        tips: photoTips
      }
    };
  }

  // Call Gemini for premium narrative modeling
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // We pass weather data to Gemini in a structured format and prompt it to generate creative, natural-sounding summaries.
    const prompt = `Analyze today's weather for ${location.name}, ${location.country}.
Current Weather:
- Temperature: ${current.temp}°C
- Feels Like: ${current.feelsLike}°C
- Humidity: ${current.humidity}%
- Wind: ${current.windSpeed} km/h
- Sky: ${current.conditionText}
- Cloud cover: ${current.clouds}%
- AQI: ${aqi.aqi} (${aqi.label})

Deterministic Metrics Computed:
- Outdoor Comfort Rating: ${scores.outdoor}/100 (${scores.outdoorText})
- Travel Rating: ${scores.travel}/100
- Photography Rating: ${scores.photography}/100
- Exercise Rating: ${scores.exercise}/100
- Commute Rating: ${scores.commute}/100

Plan segments computed:
- Morning: ${plan.morning.temp}°C, ${plan.morning.condition}, Rain Prob ${plan.morning.rainProb}%
- Afternoon: ${plan.afternoon.temp}°C, ${plan.afternoon.condition}, Rain Prob ${plan.afternoon.rainProb}%
- Evening: ${plan.evening.temp}°C, ${plan.evening.condition}, Rain Prob ${plan.evening.rainProb}%
- Night: ${plan.night.temp}°C, ${plan.night.condition}, Rain Prob ${plan.night.rainProb}%

Write:
1. "generalSummary": A stunning, conversational, 2-sentence summary summarizing the physical weather, humidity/wind impacts, and overall day vibe.
2. "story": Narrative descriptions (1-2 sentences each) for morning, afternoon, evening, and night. Make it sound rich, poetic, and highly descriptive.
3. "planRecommendations": Beautiful, highly specific, localized daily planning tips for each of the 4 periods (morning, afternoon, evening, night). Write 1 elegant action-oriented sentence for each.
4. "photoTips": 2 highly creative photography tips specific to today's cloud cover and lighting.

All factual data (temperatures, weather conditions, rain percentage, scores) MUST match the verified inputs exactly. Never invent fake values!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["generalSummary", "story", "planRecommendations", "photoTips"],
          properties: {
            generalSummary: { type: Type.STRING },
            story: {
              type: Type.OBJECT,
              required: ["morning", "afternoon", "evening", "night"],
              properties: {
                morning: { type: Type.STRING },
                afternoon: { type: Type.STRING },
                evening: { type: Type.STRING },
                night: { type: Type.STRING }
              }
            },
            planRecommendations: {
              type: Type.OBJECT,
              required: ["morning", "afternoon", "evening", "night"],
              properties: {
                morning: { type: Type.STRING },
                afternoon: { type: Type.STRING },
                evening: { type: Type.STRING },
                night: { type: Type.STRING }
              }
            },
            photoTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");

    return {
      isFallback: false,
      generalSummary: parsed.generalSummary || generalSummary,
      story: {
        morning: parsed.story?.morning || deterministicStory.morning,
        afternoon: parsed.story?.afternoon || deterministicStory.afternoon,
        evening: parsed.story?.evening || deterministicStory.evening,
        night: parsed.story?.night || deterministicStory.night
      },
      scores,
      plan: {
        morning: {
          ...plan.morning,
          recommendation: parsed.planRecommendations?.morning || plan.morning.recommendation
        },
        afternoon: {
          ...plan.afternoon,
          recommendation: parsed.planRecommendations?.afternoon || plan.afternoon.recommendation
        },
        evening: {
          ...plan.evening,
          recommendation: parsed.planRecommendations?.evening || plan.evening.recommendation
        },
        night: {
          ...plan.night,
          recommendation: parsed.planRecommendations?.night || plan.night.recommendation
        }
      },
      alerts,
      photographyDetails: {
        ...photoHours,
        rating: photoRating,
        tips: parsed.photoTips || photoTips
      }
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    let reason: 'quota_exceeded' | 'offline' = 'offline';
    if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Gemini API: Rate limit or quota exceeded (429). Using robust real-time deterministic weather modeling fallback.");
      reason = 'quota_exceeded';
    } else {
      console.warn("Gemini API: Model offline or connection issue. Fallback activated. Details:", errMsg);
    }
    return {
      isFallback: true,
      fallbackReason: reason,
      generalSummary,
      story: deterministicStory,
      scores,
      plan,
      alerts,
      photographyDetails: {
        ...photoHours,
        rating: photoRating,
        tips: photoTips
      }
    };
  }
}
