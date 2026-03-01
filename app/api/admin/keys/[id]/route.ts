/**
 * Admin API Key Management - Individual Key Operations
 */

import { NextRequest, NextResponse } from "next/server"
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await proxyToMycorrhizae(`/api/keys/${id}`)

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status })
  }

  return NextResponse.json(result.data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await proxyToMycorrhizae(`/api/keys/${id}`, {
    method: "DELETE",
  })

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status })
  }

  return NextResponse.json(result.data)
}
