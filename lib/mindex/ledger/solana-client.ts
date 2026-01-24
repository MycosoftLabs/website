/**
 * Solana Ledger Client for MINDEX
 * 
 * Connects to Solana via QuickNode RPC for:
 * - Anchoring MINDEX hash proofs on-chain
 * - Querying existing anchors
 * - Estimating transaction costs
 * 
 * Uses memo program for data anchoring
 */

import { env } from "@/lib/env"

export interface SolanaStatus {
  connected: boolean
  network: "mainnet-beta" | "devnet" | "testnet" | "localnet"
  rpc_url: string
  slot: number
  block_height: number
  health: "ok" | "behind" | "unknown"
  epoch: number
  epoch_slot: number
  transaction_count: number
  lamports_per_sol: number
}

export interface SolanaAnchor {
  signature: string
  slot: number
  block_time: number
  memo: string
  fee_lamports: number
  explorer_url: string
}

export interface SolanaFeeEstimate {
  estimated_fee_lamports: number
  estimated_fee_sol: number
  priority_fee_lamports: number
  recent_blockhash: string
}

/**
 * Get Solana network status via RPC
 */
export async function getSolanaStatus(): Promise<SolanaStatus> {
  const rpcUrl = env.solanaRpcUrl
  
  if (!rpcUrl) {
    return {
      connected: false,
      network: "mainnet-beta",
      rpc_url: "Not configured",
      slot: 0,
      block_height: 0,
      health: "unknown",
      epoch: 0,
      epoch_slot: 0,
      transaction_count: 0,
      lamports_per_sol: 1_000_000_000,
    }
  }

  try {
    // Make RPC calls to get status
    const [slotResponse, blockHeightResponse, epochInfoResponse] = await Promise.all([
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSlot",
        }),
        signal: AbortSignal.timeout(5000),
      }),
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getBlockHeight",
        }),
        signal: AbortSignal.timeout(5000),
      }),
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "getEpochInfo",
        }),
        signal: AbortSignal.timeout(5000),
      }),
    ])

    const slotData = await slotResponse.json()
    const blockHeightData = await blockHeightResponse.json()
    const epochInfoData = await epochInfoResponse.json()

    // Determine network from RPC URL
    let network: SolanaStatus["network"] = "mainnet-beta"
    if (rpcUrl.includes("devnet")) network = "devnet"
    else if (rpcUrl.includes("testnet")) network = "testnet"
    else if (rpcUrl.includes("localhost")) network = "localnet"

    return {
      connected: true,
      network,
      rpc_url: rpcUrl.replace(/\/\/.+@/, "//***@"), // Hide auth
      slot: slotData.result || 0,
      block_height: blockHeightData.result || 0,
      health: "ok",
      epoch: epochInfoData.result?.epoch || 0,
      epoch_slot: epochInfoData.result?.slotIndex || 0,
      transaction_count: epochInfoData.result?.transactionCount || 0,
      lamports_per_sol: 1_000_000_000,
    }
  } catch (error) {
    console.error("Solana RPC error:", error)
    return {
      connected: false,
      network: "mainnet-beta",
      rpc_url: rpcUrl.replace(/\/\/.+@/, "//***@"),
      slot: 0,
      block_height: 0,
      health: "unknown",
      epoch: 0,
      epoch_slot: 0,
      transaction_count: 0,
      lamports_per_sol: 1_000_000_000,
    }
  }
}

/**
 * Estimate fee for anchoring a hash on Solana
 */
export async function estimateAnchorFee(memoSize: number = 64): Promise<SolanaFeeEstimate> {
  const rpcUrl = env.solanaRpcUrl

  if (!rpcUrl) {
    return {
      estimated_fee_lamports: 5000, // Default fee
      estimated_fee_sol: 0.000005,
      priority_fee_lamports: 0,
      recent_blockhash: "unavailable",
    }
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentBlockhash",
        params: [{ commitment: "finalized" }],
      }),
      signal: AbortSignal.timeout(5000),
    })

    const data = await response.json()
    const feeCalculator = data.result?.value?.feeCalculator
    const blockhash = data.result?.value?.blockhash || "unavailable"

    // Base fee + memo instruction
    const baseFee = feeCalculator?.lamportsPerSignature || 5000
    const priorityFee = 0 // Could implement priority fee estimation

    return {
      estimated_fee_lamports: baseFee + priorityFee,
      estimated_fee_sol: (baseFee + priorityFee) / 1_000_000_000,
      priority_fee_lamports: priorityFee,
      recent_blockhash: blockhash,
    }
  } catch (error) {
    console.error("Fee estimation error:", error)
    return {
      estimated_fee_lamports: 5000,
      estimated_fee_sol: 0.000005,
      priority_fee_lamports: 0,
      recent_blockhash: "unavailable",
    }
  }
}

/**
 * Create anchor payload for a MINDEX hash
 * Returns the memo string to be included in a Solana transaction
 */
export function createAnchorPayload(
  hashChainHead: string,
  merkleRoot: string,
  recordCount: number,
  timestamp: string
): string {
  const payload = {
    protocol: "MINDEX-v2",
    type: "anchor",
    hash_chain_head: hashChainHead.slice(0, 16),
    merkle_root: merkleRoot.slice(0, 16),
    record_count: recordCount,
    timestamp,
  }
  
  return JSON.stringify(payload)
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(signature: string, network: SolanaStatus["network"] = "mainnet-beta"): string {
  const baseUrl = "https://explorer.solana.com/tx"
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`
  return `${baseUrl}/${signature}${cluster}`
}
