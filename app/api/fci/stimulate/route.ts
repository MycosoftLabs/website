/**
 * FCI Stimulation API Route
 * 
 * POST /api/fci/stimulate - Send stimulation command to FCI device
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { device_id, waveform, frequency, amplitude, duration, channel } = body
    
    if (!device_id) {
      return NextResponse.json(
        { error: "device_id is required" },
        { status: 400 }
      )
    }
    
    // Safety limits
    const MAX_AMPLITUDE = 5.0 // mV
    const MAX_DURATION = 10.0 // seconds
    const MAX_FREQUENCY = 50 // Hz
    
    if (amplitude > MAX_AMPLITUDE) {
      return NextResponse.json(
        { error: `Amplitude exceeds safety limit of ${MAX_AMPLITUDE}mV` },
        { status: 400 }
      )
    }
    
    if (duration > MAX_DURATION) {
      return NextResponse.json(
        { error: `Duration exceeds safety limit of ${MAX_DURATION}s` },
        { status: 400 }
      )
    }
    
    if (frequency > MAX_FREQUENCY) {
      return NextResponse.json(
        { error: `Frequency exceeds safety limit of ${MAX_FREQUENCY}Hz` },
        { status: 400 }
      )
    }
    
    // Forward to MAS API
    const response = await fetch(`${MAS_API_URL}/api/fci/stimulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id,
        waveform: waveform || "sine",
        frequency_hz: frequency || 1.0,
        amplitude_mv: amplitude || 0.5,
        duration_ms: Math.round((duration || 1.0) * 1000),
        channel: channel || 0,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: 202 })
  } catch (error) {
    console.error("FCI stimulation error:", error)
    return NextResponse.json(
      { error: "Failed to send stimulation command" },
      { status: 500 }
    )
  }
}
