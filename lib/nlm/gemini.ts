"use server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function getMutationAdvice(modelConfig: any, metrics: any) {
  const prompt = `
    You are an AI research assistant for the Nature Learning Model (NLM).
    NLM is a grounded sensory world model that learns from physical reality (wavelengths, waveforms, voltages, etc.).

    Current Model Configuration:
    ${JSON.stringify(modelConfig, null, 2)}

    Current Training Metrics:
    ${JSON.stringify(metrics, null, 2)}

    Based on this, suggest 3 specific model mutations or recursive architecture adjustments to improve grounding and prediction accuracy.
    Format your response as a JSON array of objects with 'type', 'description', and 'expectedImpact'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}

export async function analyzeSensoryData(data: any) {
  const prompt = `
    Analyze the following sensory data stream from a Nature Learning Model:
    ${JSON.stringify(data, null, 2)}

    Identify patterns, anomalies, and suggest how the model should adjust its weights to better predict the next state of this physical reality.
    Provide a concise summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Analysis failed.";
  }
}

export async function analyzeAcousticPattern(acousticData: any) {
  const prompt = `
    You are an expert in Underwater Acoustic Intelligence (ACINT).
    Analyze the following acoustic frequency and amplitude data:
    ${JSON.stringify(acousticData, null, 2)}

    1. Identify potential sources (Biological, Mechanical, Seismic, or Unknown).
    2. Estimate confidence levels.
    3. Suggest specific NLM (Nature Learning Model) weight adjustments for better transient isolation.

    Format your response as a JSON object with 'classification', 'confidence', 'details', and 'adjustments'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Acoustic Analysis Error:", error);
    return null;
  }
}

export async function getModelAdvice(model: any, sensors: any[]) {
  const prompt = `
    You are an AI research assistant for the Nature Learning Model (NLM).
    NLM is a grounded sensory world model that learns from physical reality.

    Current Model:
    ${JSON.stringify(model, null, 2)}

    Current Sensor Configuration:
    ${JSON.stringify(sensors, null, 2)}

    Provide advice on:
    1. How to improve this specific model's architecture.
    2. Optimal configuration changes (learning rate, batch size, etc.).
    3. Adjustments to sensory thresholds (spectral, acoustic, bioelectric, chemical, thermal, mechanical) to better ground the model in physical reality.

    Format your response as a JSON object with 'architecture', 'configuration', and 'sensors' as keys, each containing a string of advice.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
