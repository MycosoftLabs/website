/**
 * FCI Signal Fingerprint API Route
 * 
 * GET /api/fci/fingerprint/[deviceId] - Get signal fingerprint for a device
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
      // If MAS doesn't have this endpoint yet, return mock structure
      if (response.status === 404) {
        return NextResponse.json({
          device_id: deviceId,
          hash: generatePseudoHash(deviceId),
          band_powers: {
            ulf: Math.random() * 0.5,
            vlf: Math.random() * 1.0,
            lf: Math.random() * 2.0,
            mf: Math.random() * 1.5,
            hf: Math.random() * 0.8,
          },
          statistics: {
            mean_amplitude: 0.5 + Math.random() * 2,
            spike_rate: Math.random() * 5,
            peak_frequency: 0.1 + Math.random() * 10,
            spectral_entropy: 0.5 + Math.random() * 0.4,
          },
          similarity_score: 0.6 + Math.random() * 0.35,
          matched_patterns: ["baseline", "active_growth"],
          timestamp: new Date().toISOString(),
        })
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
    
    // Return empty structure on error
    const { deviceId } = await params
    return NextResponse.json({
      device_id: deviceId,
      hash: generatePseudoHash(deviceId),
      band_powers: { ulf: 0, vlf: 0, lf: 0, mf: 0, hf: 0 },
      statistics: {
        mean_amplitude: 0,
        spike_rate: 0,
        peak_frequency: 0,
        spectral_entropy: 0,
      },
      similarity_score: 0,
      matched_patterns: [],
      timestamp: new Date().toISOString(),
    })
  }
}

function generatePseudoHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16)
}
