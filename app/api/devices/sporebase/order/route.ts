/**
 * SporeBase pre-order integration.
 * Proxies to MAS /api/sporebase/order when available.
 * Created: February 12, 2026
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

/**
 * POST /api/devices/sporebase/order
 * Body: tier (research | enterprise), contact email, org, notes, etc.
 */
export async function POST(request: NextRequest) {
  try {
    if (!MAS_API_URL) {
      return NextResponse.json(
        { error: "MAS_API_URL not configured" },
        { status: 503 }
      )
    }
    const body = await request.json()
    const response = await fetch(`${MAS_API_URL}/api/sporebase/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json(
          {
            error: "Pre-order service unavailable",
            note: "SporeBase order intake is temporarily unavailable. Contact sales@mycosoft.com.",
          },
          { status: 503 }
        )
      }
      const text = await response.text()
      return NextResponse.json(
        { error: `Order failed: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.warn("SporeBase order request failed:", error)
    return NextResponse.json(
      {
        error: "Pre-order service unavailable",
        note: "MAS unreachable or order endpoint not deployed. Contact sales@mycosoft.com.",
      },
      { status: 502 }
    )
  }
}
