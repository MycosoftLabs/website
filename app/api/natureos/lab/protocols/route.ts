/**
 * Lab Protocols API
 *
 * Proxies to NatureOS backend when available, otherwise returns empty.
 * NO MOCK DATA - all data from real backends.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

async function fetchProtocols() {
  if (!NATUREOS_URL) return []

  try {
    const res = await fetch(`${NATUREOS_URL}/api/LabTools/protocols`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.protocols ?? data.items ?? []
  } catch {
    return []
  }
}

export async function GET() {
  const protocols = await fetchProtocols()
  return NextResponse.json(protocols)
}
