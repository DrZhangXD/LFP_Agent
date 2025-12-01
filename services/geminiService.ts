import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    const apiKey = process.env.API_KEY || ''; // Injected by environment
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const sendMessageToGemini = async (
  message: string, 
  contextData?: string
): Promise<string> => {
  try {
    const ai = getClient();
    const modelId = "gemini-2.5-flash"; // Good balance for text analysis
    
    let fullPrompt = message;
    
    if (contextData) {
      fullPrompt = `
      [CONTEXT DATA]
      ${contextData}
      [END CONTEXT]

      User Query: ${message}
      `;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I processed the data but could not generate a textual response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to connect to the LFP Analyst Agent. Please check your API key or connection.";
  }
};
