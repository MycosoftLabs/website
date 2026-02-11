/**
 * MYCA Consciousness Status API
 * Returns current consciousness state (awake, dormant, etc.)
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/myca/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          is_conscious: false,
          state: "unreachable",
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 } // Return 200 with error state for graceful degradation
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MYCA consciousness status error:", error)
    return NextResponse.json(
      { 
        is_conscious: false,
        state: "unreachable",
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 } // Return 200 with error state
    )
  }
}
