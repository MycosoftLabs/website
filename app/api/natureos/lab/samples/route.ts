/**
 * Lab Samples API
 *
 * Proxies to NatureOS backend when available, otherwise returns empty.
 * NO MOCK DATA - all data from real backends.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

async function fetchSamples(filter?: string, limit = 100) {
  if (!NATUREOS_URL) return []

  try {
    const url = new URL(`${NATUREOS_URL}/api/LabTools/samples`)
    url.searchParams.set("limit", String(limit))
    if (filter) url.searchParams.set("filter", filter)

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.samples ?? data.items ?? []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const filter = searchParams.get("filter") || undefined
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "100", 10),
    500
  )

  const samples = await fetchSamples(filter, limit)
  return NextResponse.json(samples)
}

export async function POST(request: NextRequest) {
  if (!NATUREOS_URL) {
    return NextResponse.json(
      { error: "NatureOS backend not configured" },
      { status: 503 }
    )
  }
  try {
    const body = await request.json()
    const res = await fetch(`${NATUREOS_URL}/api/LabTools/samples`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? data.detail ?? "Registration failed" },
        { status: res.status }
      )
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Lab sample POST error:", error)
    return NextResponse.json(
      { error: "NatureOS backend unavailable" },
      { status: 503 }
    )
  }
}
