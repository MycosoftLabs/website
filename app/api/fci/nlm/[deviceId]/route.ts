/**
 * FCI NLM Analysis API Route
 * 
 * GET /api/fci/nlm/[deviceId] - Get NLM analysis for a device
 * 
 * NO MOCK DATA - returns real NLM analysis or error if unavailable
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
      // Return proper error for 404 - NO MOCK DATA
      if (response.status === 404) {
        return NextResponse.json({
          error: "NLM analysis not available for this device",
          device_id: deviceId,
          message: "No NLM analysis data found. Ensure the device is connected and has sufficient signal data for analysis.",
          growth_phase: null,
          bioactivity_predictions: [],
          environmental_correlations: [],
          recommendations: [],
        }, { status: 404 })
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
    
    // Return error response - NO MOCK DATA
    return NextResponse.json({
      error: "Unable to fetch NLM analysis",
      device_id: deviceId,
      message: "Backend unavailable. Please check MAS connection.",
      growth_phase: null,
      bioactivity_predictions: [],
      environmental_correlations: [],
      recommendations: [],
    }, { status: 503 })
  }
}
