import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

/**
 * Executes a generateContent call with automatic fallback models to gracefully handle
 * temporary "503 UNAVAILABLE" or other transient outages on the default model.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: GenerateContentParameters
): Promise<GenerateContentResponse> {
  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  // De-duplicate while preserving order
  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      console.log(`[Gemini Helper] Attempting generateContent with model: ${modelName}`);
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      console.log(`[Gemini Helper] Success with model: ${modelName}`);
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini Helper] Failed with model ${modelName}. Error: ${errMsg}`);
      
      // If we are out of quota or rate-limited, subsequent models using the same key will also fail.
      // Terminate early to prevent excessive logs, latency, and redundant API calls.
      if (
        errMsg.includes("429") || 
        errMsg.includes("quota") || 
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("limit") ||
        err?.status === "RESOURCE_EXHAUSTED" ||
        err?.code === 429
      ) {
        console.warn(`[Gemini Helper] Quota limits reached. Aborting consecutive fallback calls.`);
        break;
      }
    }
  }

  throw lastError;
}
