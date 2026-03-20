/**
 * Ground Station Waterfall/SDR API
 *
 * Waterfall state management. Since SDR hardware control requires
 * a physical device, this manages the state/configuration in memory.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// In-memory waterfall state (per-instance)
let waterfallState = {
  running: false,
  sdr_id: null as string | null,
  center_frequency: 145800000,
  sample_rate: 2400000,
  gain: 40,
  fft_size: 2048,
  averaging: 4,
}

export async function GET() {
  return NextResponse.json(waterfallState)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === "stop") {
      waterfallState = { ...waterfallState, running: false }
      return NextResponse.json(waterfallState)
    }

    waterfallState = {
      running: true,
      sdr_id: body.sdr_id || waterfallState.sdr_id,
      center_frequency: body.center_frequency || waterfallState.center_frequency,
      sample_rate: body.sample_rate || waterfallState.sample_rate,
      gain: body.gain ?? waterfallState.gain,
      fft_size: body.fft_size || waterfallState.fft_size,
      averaging: body.averaging ?? waterfallState.averaging,
    }

    return NextResponse.json(waterfallState)
  } catch (error) {
    console.error("Ground Station waterfall control error:", error)
    return NextResponse.json(
      { error: "Ground Station waterfall control failed", details: String(error) },
      { status: 500 }
    )
  }
}
