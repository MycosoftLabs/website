/**
 * Ledger Status API Route
 * 
 * Returns status of all configured ledger integrations:
 * - Hypergraph DAG (local)
 * - Solana (QuickNode RPC)
 * - Bitcoin (Infura/mempool.space)
 * 
 * GET: Returns status of all ledger connections
 */

import { NextRequest, NextResponse } from "next/server"
import { getSolanaStatus, estimateAnchorFee } from "@/lib/mindex/ledger/solana-client"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

interface LedgerStatus {
  hypergraph: {
    connected: boolean
    node_url: string
    status: string
    last_snapshot?: string
    dag_height?: number
  }
  solana: {
    connected: boolean
    network: string
    rpc_url: string
    slot: number
    block_height: number
    health: string
    estimated_fee_sol: number
  }
  bitcoin: {
    connected: boolean
    network: string
    api_url: string
    block_height: number
    mempool_size: number
    fee_rates: {
      fastest: number
      half_hour: number
      hour: number
      economy: number
    }
  }
  last_updated: string
}

export async function GET(request: NextRequest) {
  const ledgerStatus: LedgerStatus = {
    hypergraph: {
      connected: false,
      node_url: env.hypergraphNodeUrl || "http://localhost:9000",
      status: "offline",
    },
    solana: {
      connected: false,
      network: "mainnet-beta",
      rpc_url: "Not configured",
      slot: 0,
      block_height: 0,
      health: "unknown",
      estimated_fee_sol: 0,
    },
    bitcoin: {
      connected: false,
      network: "mainnet",
      api_url: env.mempoolApiUrl || "https://mempool.space/api",
      block_height: 0,
      mempool_size: 0,
      fee_rates: {
        fastest: 0,
        half_hour: 0,
        hour: 0,
        economy: 0,
      },
    },
    last_updated: new Date().toISOString(),
  }

  // Check all ledgers in parallel
  const [solanaResult, bitcoinResult, hypergraphResult] = await Promise.allSettled([
    // Solana via QuickNode
    (async () => {
      const status = await getSolanaStatus()
      const fees = await estimateAnchorFee()
      return { status, fees }
    })(),
    
    // Bitcoin via mempool.space API
    (async () => {
      const mempoolUrl = env.mempoolApiUrl || "https://mempool.space/api"
      
      const [blockResponse, feesResponse, mempoolResponse] = await Promise.allSettled([
        fetch(`${mempoolUrl}/blocks/tip/height`, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        }),
        fetch(`${mempoolUrl}/v1/fees/recommended`, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        }),
        fetch(`${mempoolUrl}/mempool`, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        }),
      ])
      
      let blockHeight = 0
      let feeRates = { fastestFee: 0, halfHourFee: 0, hourFee: 0, economyFee: 0 }
      let mempoolSize = 0
      
      if (blockResponse.status === "fulfilled" && blockResponse.value.ok) {
        blockHeight = parseInt(await blockResponse.value.text())
      }
      
      if (feesResponse.status === "fulfilled" && feesResponse.value.ok) {
        feeRates = await feesResponse.value.json()
      }
      
      if (mempoolResponse.status === "fulfilled" && mempoolResponse.value.ok) {
        const mempoolData = await mempoolResponse.value.json()
        mempoolSize = mempoolData.count || mempoolData.vsize || 0
      }
      
      return { blockHeight, feeRates, mempoolSize }
    })(),
    
    // Hypergraph local node
    (async () => {
      const nodeUrl = env.hypergraphNodeUrl || "http://localhost:9000"
      
      try {
        const response = await fetch(`${nodeUrl}/health`, {
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            connected: true,
            status: data.status || "healthy",
            dag_height: data.dag_height || data.height,
            last_snapshot: data.last_snapshot,
          }
        }
        return { connected: false, status: "offline" }
      } catch {
        return { connected: false, status: "offline" }
      }
    })(),
  ])

  // Process Solana result
  if (solanaResult.status === "fulfilled") {
    const { status, fees } = solanaResult.value
    ledgerStatus.solana = {
      connected: status.connected,
      network: status.network,
      rpc_url: status.rpc_url,
      slot: status.slot,
      block_height: status.block_height,
      health: status.health,
      estimated_fee_sol: fees.estimated_fee_sol,
    }
  }

  // Process Bitcoin result
  if (bitcoinResult.status === "fulfilled") {
    const { blockHeight, feeRates, mempoolSize } = bitcoinResult.value
    ledgerStatus.bitcoin = {
      connected: blockHeight > 0,
      network: "mainnet",
      api_url: env.mempoolApiUrl || "https://mempool.space/api",
      block_height: blockHeight,
      mempool_size: mempoolSize,
      fee_rates: {
        fastest: feeRates.fastestFee || 0,
        half_hour: feeRates.halfHourFee || 0,
        hour: feeRates.hourFee || 0,
        economy: feeRates.economyFee || 0,
      },
    }
  }

  // Process Hypergraph result
  if (hypergraphResult.status === "fulfilled") {
    ledgerStatus.hypergraph = {
      ...ledgerStatus.hypergraph,
      ...hypergraphResult.value,
    }
  }

  return NextResponse.json(ledgerStatus)
}
