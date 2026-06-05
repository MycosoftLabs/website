import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { mindexUpstreamHeaders } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const mindexUrl = env.mindexApiBaseUrl.replace(/\/$/, "")
    const baseUrl = mindexUrl.endsWith("/api/mindex") ? mindexUrl : `${mindexUrl}/api/mindex`
    const url = `${baseUrl}/ledger`

    const response = await fetch(url, {
      headers: mindexUpstreamHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      return NextResponse.json({
        hypergraph: { connected: false, node_url: "", status: "offline" },
        solana: {
          connected: false,
          network: "mainnet-beta",
          rpc_url: null,
          slot: null,
          block_height: null,
          health: "upstream_error",
          estimated_fee_sol: null,
        },
        bitcoin: {
          connected: false,
          network: "mainnet",
          api_url: "https://mempool.space/api",
          block_height: 0,
          mempool_size: 0,
          fee_rates: { fastest: 0, half_hour: 0, hour: 0, economy: 0 },
        },
        upstream_status: response.status,
        detail: errBody.slice(0, 300),
        last_updated: new Date().toISOString(),
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX Ledger proxy error:", error)
    return NextResponse.json({
        hypergraph: { connected: false, node_url: "", status: "offline" },
        solana: { connected: false, network: "mainnet-beta", rpc_url: null, slot: null, block_height: null, health: "error", estimated_fee_sol: null },
        bitcoin: { connected: false, network: "mainnet", api_url: "https://mempool.space/api", block_height: 0, mempool_size: 0, fee_rates: { fastest: 0, half_hour: 0, hour: 0, economy: 0 } },
        last_updated: new Date().toISOString(),
    })
  }
}
