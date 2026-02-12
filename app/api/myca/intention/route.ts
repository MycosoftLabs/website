/**
 * MYCA Intention API - Proxies to MAS intention tracker
 * Created: Feb 12, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${MAS_API_URL}/api/myca/intention`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `MAS intention error: ${text}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    // Intention tracking is non-critical - silent fail
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Tracking failed",
      },
      { status: 500 }
    )
  }
}
