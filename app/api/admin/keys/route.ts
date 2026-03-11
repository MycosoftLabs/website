/**
 * Admin API Keys Management Route
 *
 * Proxies requests to the Mycorrhizae Protocol API for key management.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MYCORRHIZAE_API_URL = env.mycorrhizaeApiUrl || "http://192.168.0.187:8002"
const ADMIN_KEY = env.mycorrhizaeAdminKey || ""

async function proxyToMycorrhizae(path: string, options: RequestInit = {}) {
  const url = `${MYCORRHIZAE_API_URL}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ADMIN_KEY,
        ...options.headers,
      },
    })

    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    console.error("Mycorrhizae API error:", error)
    return { ok: false, status: 503, data: { error: "Mycorrhizae API unavailable" } }
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { searchParams } = new URL(request.url)
  const service = searchParams.get("service")
  const includeInactive = searchParams.get("include_inactive") === "true"

  const params = new URLSearchParams()
  if (service) params.set("service", service)
  if (includeInactive) params.set("include_inactive", "true")

  const result = await proxyToMycorrhizae(`/api/keys?${params}`)

  if (!result.ok) {
    // Return mock data if API is unavailable
    return NextResponse.json({
      keys: [],
      message: "Mycorrhizae API not available. Connect to enable key management.",
      api_url: MYCORRHIZAE_API_URL,
    })
  }

  return NextResponse.json({ keys: result.data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  try {
    const body = await request.json()

    const result = await proxyToMycorrhizae("/api/keys", {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Create key error:", error)
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 })
  }
}
