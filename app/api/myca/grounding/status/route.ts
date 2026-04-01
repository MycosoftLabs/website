/**
 * MYCA Grounding Status API – proxy to MAS grounding status.
 * Returns grounding gate status (enabled, thought_count, last_ep_id).
 * Created: February 17, 2026
 */

import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET() {
  try {
    const response = await fetch(`${MAS_API_URL}/api/myca/grounding/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { enabled: false, thought_count: 0, last_ep_id: null, error: `MAS returned ${response.status}` },
        { status: 200 }
      )
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { enabled: false, thought_count: 0, last_ep_id: null, error: "Unreachable" },
      { status: 200 }
    )
  }
}
