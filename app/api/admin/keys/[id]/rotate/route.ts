/**
 * Admin API Key Rotation
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MYCORRHIZAE_API_URL = env.mycorrhizaeApiUrl || "http://192.168.0.187:8002"
const ADMIN_KEY = env.mycorrhizaeAdminKey || ""

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const response = await fetch(`${MYCORRHIZAE_API_URL}/api/keys/${id}/rotate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ADMIN_KEY,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Rotate key error:", error)
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 })
  }
}
