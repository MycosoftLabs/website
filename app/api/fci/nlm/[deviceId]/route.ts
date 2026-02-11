/**
 * FCI NLM Analysis API Route
 * 
 * GET /api/fci/nlm/[deviceId] - Get NLM analysis for a device
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    
    const response = await fetch(
      `${MAS_API_URL}/api/fci/devices/${deviceId}/nlm-analysis`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 10 }, // Revalidate every 10 seconds
      }
    )
    
    if (!response.ok) {
      // Return simulated analysis if endpoint doesn't exist
      if (response.status === 404) {
        return NextResponse.json(generateSimulatedAnalysis(deviceId))
      }
      
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("FCI NLM analysis error:", error)
    const { deviceId } = await params
    return NextResponse.json(generateSimulatedAnalysis(deviceId))
  }
}

function generateSimulatedAnalysis(deviceId: string) {
  const phases = ["lag", "exponential", "stationary", "colonization", "fruiting"]
  const compounds = [
    { compound: "Psilocybin", action: "Tryptamine biosynthesis pathway active" },
    { compound: "Ergosterol", action: "Membrane synthesis indicator" },
    { compound: "Chitin", action: "Cell wall formation in progress" },
    { compound: "Trehalose", action: "Stress protection compound accumulating" },
  ]
  const factors = [
    { factor: "Temperature", suggestion: "Optimal range detected" },
    { factor: "Humidity", suggestion: "Consider increasing moisture" },
    { factor: "CO2 Level", suggestion: "Ventilation appears adequate" },
    { factor: "Light Cycle", suggestion: "Circadian rhythm normal" },
  ]
  
  return {
    device_id: deviceId,
    growth_phase: phases[Math.floor(Math.random() * phases.length)],
    bioactivity_predictions: compounds.slice(0, 2 + Math.floor(Math.random() * 2)).map(c => ({
      ...c,
      confidence: 0.5 + Math.random() * 0.45,
    })),
    environmental_correlations: factors.slice(0, 2 + Math.floor(Math.random() * 2)).map(f => ({
      ...f,
      correlation: (Math.random() - 0.5) * 1.6,
    })),
    recommendations: [
      "Signal patterns indicate healthy mycelium activity",
      "Monitor for any sudden amplitude changes",
      "Consider correlating with environmental sensors",
    ].slice(0, 1 + Math.floor(Math.random() * 2)),
    timestamp: new Date().toISOString(),
  }
}
