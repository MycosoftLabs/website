/**
 * FCI Event Correlations API Route
 * 
 * GET /api/fci/correlations/[deviceId] - Get event correlations for a device
 * 
 * Correlations link FCI signals with environmental events (Earth2, CREP, etc.)
 * 
 * NO MOCK DATA - returns real correlation data or error if unavailable
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
      `${MAS_API_URL}/api/fci/devices/${deviceId}/correlations`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 30 }, // Revalidate every 30 seconds for correlations
      }
    )
    
    if (!response.ok) {
      // Return proper error for 404 - NO MOCK DATA
      if (response.status === 404) {
        return NextResponse.json({
          correlations: [],
          device_id: deviceId,
          message: "No correlation data available for this device",
        }, { status: 200 }) // Return empty array, not 404, since correlations are optional
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
    console.error("FCI correlations error:", error)
    const { deviceId } = await params
    
    // Return empty correlations on error - correlations are non-critical
    return NextResponse.json({
      correlations: [],
      device_id: deviceId,
      message: "Backend unavailable - no correlation data",
    }, { status: 200 })
  }
}
