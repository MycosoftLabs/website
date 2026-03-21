import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = MINDEX_API_URL.endsWith('/api/mindex') ? MINDEX_API_URL : `${MINDEX_API_URL}/api/mindex`
    const url = `${baseUrl}/ledger`

    const response = await fetch(url, {
      headers: {
        "X-API-Key": MINDEX_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ledger status, status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX Ledger proxy error:", error)
    return NextResponse.json({
        hypergraph: { connected: false, node_url: "", status: "offline" },
        solana: { connected: false, network: "mainnet-beta", rpc_url: "Not configured", slot: 0, block_height: 0, health: "unknown", estimated_fee_sol: 0 },
        bitcoin: { connected: false, network: "mainnet", api_url: "", block_height: 0, mempool_size: 0, fee_rates: { fastest: 0, half_hour: 0, hour: 0, economy: 0 } },
        last_updated: new Date().toISOString(),
    }, { status: 503 })
  }
}
