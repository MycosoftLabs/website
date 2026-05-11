import { NextResponse } from "next/server"
import { resolveMasApiUrl } from "../_lib/mas-url"
import { normalizeError } from "../_lib/real-cache"

const MAS_API_URL = resolveMasApiUrl()

export async function GET() {
  try {
    const response = await fetch(`${MAS_API_URL}/api/earth2/status`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    })

    if (!response.ok) throw new Error(`MAS status ${response.status}`)

    const data = await response.json()
    return NextResponse.json({
      ok: true,
      available: true,
      status: data.status ?? "online",
      source: "mas",
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      available: false,
      status: "offline",
      source: "none",
      message: `MAS Earth-2 API not reachable: ${normalizeError(error)}`,
    })
  }
}
