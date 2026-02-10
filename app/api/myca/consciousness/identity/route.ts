/**
 * MYCA Consciousness Identity API
 * Returns MYCA's identity (name, creator, purpose, beliefs)
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8000"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/myca/identity`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          name: "MYCA",
          error: `MAS API returned ${response.status}`,
          available: false,
        },
        { status: 200 }
      )
    }
    
    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA identity error:", error)
    return NextResponse.json(
      { 
        name: "MYCA",
        error: error instanceof Error ? error.message : "Failed to connect",
        available: false,
      },
      { status: 200 }
    )
  }
}
