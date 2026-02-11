/**
 * MYCA Consciousness Emotions API
 * Returns MYCA's current emotional state
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/myca/emotions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          emotions: {},
          valence: 0,
          available: false,
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 }
      )
    }
    
    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA emotions error:", error)
    return NextResponse.json(
      { 
        emotions: {},
        valence: 0,
        available: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 }
    )
  }
}
