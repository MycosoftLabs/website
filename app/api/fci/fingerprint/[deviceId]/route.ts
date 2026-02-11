/**
 * FCI Signal Fingerprint API Route
 * 
 * GET /api/fci/fingerprint/[deviceId] - Get signal fingerprint for a device
 * 
 * NO MOCK DATA - returns real fingerprint data or error if unavailable
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
      `${MAS_API_URL}/api/fci/devices/${deviceId}/fingerprint`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 5 }, // Revalidate every 5 seconds
      }
    )
    
    if (!response.ok) {
      // Return proper error for 404 - NO MOCK DATA
      if (response.status === 404) {
        return NextResponse.json({
          error: "Device not found or no fingerprint data available",
          device_id: deviceId,
          message: "This device has no FCI fingerprint data. Ensure the device is connected and transmitting signals.",
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
    console.error("FCI fingerprint error:", error)
    const { deviceId } = await params
    
    // Return error response - NO MOCK DATA
    return NextResponse.json({
      error: "Unable to fetch fingerprint data",
      device_id: deviceId,
      message: "Backend unavailable. Please check MAS connection at " + MAS_API_URL,
    }, { status: 503 })
  }
}
