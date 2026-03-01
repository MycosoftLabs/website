/**
 * Admin API Key Audit Log
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MYCORRHIZAE_API_URL = env.mycorrhizaeApiUrl || "http://192.168.0.187:8002"
const ADMIN_KEY = env.mycorrhizaeAdminKey || ""

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const limit = searchParams.get("limit") || "100"

  const queryParams = new URLSearchParams()
  if (action) queryParams.set("action", action)
  queryParams.set("limit", limit)

  try {
    const response = await fetch(
      `${MYCORRHIZAE_API_URL}/api/keys/${id}/audit?${queryParams}`,
      {
        headers: {
          "X-API-Key": ADMIN_KEY,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({ logs: data })
  } catch (error) {
    console.error("Audit log error:", error)
    return NextResponse.json({ logs: [], error: "Failed to fetch audit log" }, { status: 500 })
  }
}
