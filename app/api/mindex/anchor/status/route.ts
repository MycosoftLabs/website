import { NextResponse } from "next/server"

import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    integrationsEnabled: env.integrationsEnabled,
    ledgers: {
      hypergraph: {
        configured: Boolean(process.env.HYPERGRAPH_ANCHOR_URL),
      },
      solana: {
        configured: Boolean(process.env.SOLANA_ANCHOR_URL),
      },
      bitcoin: {
        configured: Boolean(process.env.BITCOIN_ORDINALS_ANCHOR_URL),
      },
    },
  })
}

