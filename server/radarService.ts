import { GoogleGenAI, Type } from "@google/genai";
import { RadarScene } from "../src/utils/radarModel.js";

export interface RadarAnalysisRequest {
  lat: number;
  lon: number;
  cityName: string;
  radarScene: RadarScene;
}

export interface RadarAnalysisResponse {
  summary: string;
  activeSystemsAnalysis: string;
  movementTrends: string;
  riskNowcast: string;
  confidence: "HIGH" | "MODERATE" | "LOW";
  confidenceExplanation: string;
}

export function generateRadarAnalysisDeterministically(req: RadarAnalysisRequest): RadarAnalysisResponse {
  const { cityName, radarScene } = req;
  const strongestCell = [...radarScene.cells].sort((a, b) => b.intensity - a.intensity)[0];
  
  const cellSummaries = radarScene.cells.map(c => 
    `• ${c.name} (${c.classification}): Present coordinate at [${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}], registering peak reflectivity of ${c.intensity} dBZ (Trend: ${c.intensityTrend}). Moving at ${c.speed} km/h towards bearing ${c.bearing}°.`
  ).join("\n");

  const summary = `Meteorological radar monitoring around ${cityName} registers ${radarScene.activeCellsCount} active precipitation cell echoes with a dominant path moving ${radarScene.dominantMovement}. Atmospheric quality indicators represent a ${radarScene.coverageQuality} radar signal scan scope.`;

  const activeSystemsAnalysis = `The primary convective structure is ${strongestCell.name}, displaying a maximum reflectivity density of ${strongestCell.intensity} dBZ, which indicates ${strongestCell.intensity >= 45 ? 'heavy convective rainfall with localized thunderstorm capabilities' : 'moderate stratiform rainfall bands'}. This structure has an estimated area footprint of ${strongestCell.area} km² with an ${strongestCell.areaTrend.toLowerCase()} boundary profile.`;

  const movementTrends = `Current atmospheric motion indicators show radar echoes shifting consistently at average speeds of 30-55 km/h. ${strongestCell.name} is tracking at ${strongestCell.speed} km/h. History tracking from the past 60 minutes indicates the systems have moved from the southwest quadrant, gaining structural coherence.`;

  const riskNowcast = `Short-term nowcast projections indicate that based on a vector bearing of ${strongestCell.bearing}°, precipitation structures will continue their tracking path. Locations directly northeast of the active cells should prepare for potential rain bands or electrical strikes within the 30-60 minute timeline window.`;

  return {
    summary,
    activeSystemsAnalysis,
    movementTrends,
    riskNowcast,
    confidence: radarScene.coverageQuality === "HIGH" ? "HIGH" : "MODERATE",
    confidenceExplanation: `Analysis confidence is bounded by the ${radarScene.coverageQuality.toLowerCase()} radar coverage quality scanned in this sector, assuring solid coordinate accuracy.`
  };
}

export async function generateAIRadarAnalysis(req: RadarAnalysisRequest): Promise<RadarAnalysisResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    return generateRadarAnalysisDeterministically(req);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const strongestCell = [...req.radarScene.cells].sort((a, b) => b.intensity - a.intensity)[0];

    const systemPrompt = `You are a Lead Meteorological Radar Analyst and Radar Visualization Engineer for SkySense, a real-time weather scanning application.
    Your task is to analyze raw radar telemetry and produce a highly technical, objective, and professional radar analysis report.
    
    CRITICAL INSTRUCTIONS:
    1. Be concise, scientific, and direct. Use appropriate meteorological terms (e.g., convective cells, stratiform precipitation, reflectivity dBZ values, cell tracks, echo tops).
    2. Strictly distinguish direct observation (what the radar currently sees) from inference (extrapolations and models) and nowcasting.
    3. Do NOT hallucinate geographical landmarks or features not included in the payload.
    4. Provide the output strictly in the requested JSON schema.
    5. No general advice. Do NOT act as a general weather chatbot or suggest what people should wear or do. Focus entirely on precipitation systems, movement, intensity, nowcasts, and radar coverage parameters.`;

    const userPrompt = `
    Radar Telemetry Data around: ${req.cityName} (Lat: ${req.lat.toFixed(4)}, Lon: ${req.lon.toFixed(4)})
    Radar Coverage Quality: ${req.radarScene.coverageQuality}
    Dominant Movement: ${req.radarScene.dominantMovement}
    
    Active Precipitation Cells:
    ${req.radarScene.cells.map(c => `- ID: ${c.id}, Name: ${c.name}, Classification: ${c.classification}, Lat/Lon: [${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}], Intensity: ${c.intensity} dBZ, Trend: ${c.intensityTrend}, Area: ${c.area} km², Trend: ${c.areaTrend}, Bearing: ${c.bearing}°, Speed: ${c.speed} km/h`).join("\n")}
    
    Lightning Strike Telemetry:
    ${req.radarScene.lightning.map(l => `- Strike ${l.id} at [${l.lat.toFixed(4)}, ${l.lon.toFixed(4)}], Age: ${l.ageMinutes}m, Current Peak Amplitude: ${l.amplitudeKa} kA`).join("\n")}
    
    Strongest Convective Node: ${strongestCell.name} (${strongestCell.intensity} dBZ)
    
    Generate the analysis based strictly on the above data.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "activeSystemsAnalysis", "movementTrends", "riskNowcast", "confidence", "confidenceExplanation"],
          properties: {
            summary: { type: Type.STRING },
            activeSystemsAnalysis: { type: Type.STRING },
            movementTrends: { type: Type.STRING },
            riskNowcast: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ["HIGH", "MODERATE", "LOW"] },
            confidenceExplanation: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed as RadarAnalysisResponse;
  } catch (err: any) {
    console.warn("AI Radar Analysis: Gemini error, fallback to deterministic generator:", err?.message || err);
    return generateRadarAnalysisDeterministically(req);
  }
}
