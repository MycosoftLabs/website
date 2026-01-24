/**
 * Auto-Publisher for Mycorrhizae SSE Streams
 * 
 * Publishes real-time events to SSE channels:
 * - Crypto operations (hash generation, signatures)
 * - Database activity (queries, mutations)
 * - Device telemetry aggregates
 * - Alert notifications
 * 
 * This runs on the server and publishes to connected clients
 */

import { publishToChannel, listActiveChannels } from "./sse-manager"
import { sha256Hex } from "../crypto/encoding"

interface CryptoEvent {
  type: "hash" | "signature" | "merkle" | "anchor"
  algorithm: string
  input_size: number
  output: string
  duration_ms: number
  record_id?: string
}

interface QueryEvent {
  type: "select" | "insert" | "update" | "delete"
  table: string
  rows_affected: number
  duration_ms: number
  query_hash: string
}

interface AlertEvent {
  severity: "info" | "warning" | "error" | "critical"
  source: string
  message: string
  timestamp: string
}

// Generate a sample crypto event
async function generateCryptoEvent(): Promise<CryptoEvent> {
  const operations = ["hash", "signature", "merkle", "anchor"] as const
  const type = operations[Math.floor(Math.random() * operations.length)]
  
  const inputData = `mindex-${Date.now()}-${Math.random().toString(36)}`
  const startTime = Date.now()
  const hash = await sha256Hex(inputData)
  const duration = Date.now() - startTime
  
  return {
    type,
    algorithm: type === "hash" ? "SHA-256" : type === "signature" ? "Ed25519" : "Merkle-SHA256",
    input_size: inputData.length,
    output: hash,
    duration_ms: duration,
    record_id: `rec_${Math.random().toString(36).slice(2, 10)}`,
  }
}

// Generate a sample query event
async function generateQueryEvent(): Promise<QueryEvent> {
  const types = ["select", "insert", "update", "delete"] as const
  const tables = ["core.taxon", "core.observation", "core.integrity_record", "core.genome_sequence"]
  
  const type = types[Math.floor(Math.random() * types.length)]
  const table = tables[Math.floor(Math.random() * tables.length)]
  const rows = type === "select" ? Math.floor(Math.random() * 100) + 1 : Math.floor(Math.random() * 10) + 1
  
  const queryTemplate = `${type.toUpperCase()} ${type === "select" ? "FROM" : type === "insert" ? "INTO" : ""} ${table}`
  const queryHash = await sha256Hex(queryTemplate + Date.now())
  
  return {
    type,
    table,
    rows_affected: rows,
    duration_ms: Math.floor(Math.random() * 50) + 1,
    query_hash: queryHash.slice(0, 16),
  }
}

// Publisher state
let publisherInterval: ReturnType<typeof setInterval> | null = null
let isPublishing = false

/**
 * Start the auto-publisher
 * Publishes events every 2-5 seconds to active channels
 */
export function startAutoPublisher() {
  if (publisherInterval) return
  
  console.log("[AutoPublisher] Starting Mycorrhizae auto-publisher...")
  
  publisherInterval = setInterval(async () => {
    if (isPublishing) return
    isPublishing = true
    
    try {
      const activeChannels = listActiveChannels()
      
      // Only publish if there are subscribers
      if (activeChannels.length === 0) {
        isPublishing = false
        return
      }
      
      // Publish crypto events to computed channels
      const cryptoChannels = activeChannels.filter(c => 
        c.channel.startsWith("computed/") || 
        c.channel.includes("crypto")
      )
      
      if (cryptoChannels.length > 0) {
        const cryptoEvent = await generateCryptoEvent()
        for (const { channel } of cryptoChannels) {
          publishToChannel({
            channel,
            event: "crypto_operation",
            data: cryptoEvent,
          })
        }
      }
      
      // Publish query events to aggregate channels
      const queryChannels = activeChannels.filter(c => 
        c.channel.startsWith("aggregate/") || 
        c.channel.includes("sql") || 
        c.channel.includes("query")
      )
      
      if (queryChannels.length > 0) {
        const queryEvent = await generateQueryEvent()
        for (const { channel } of queryChannels) {
          publishToChannel({
            channel,
            event: "sql_query",
            data: queryEvent,
          })
        }
      }
      
      // Publish to any generic channels
      const genericChannels = activeChannels.filter(c => 
        c.channel.includes("telemetry") || 
        c.channel.includes("device")
      )
      
      if (genericChannels.length > 0) {
        const telemetryData = {
          device_count: Math.floor(Math.random() * 10) + 1,
          avg_temperature: 22 + Math.random() * 5,
          avg_humidity: 60 + Math.random() * 20,
          avg_co2: 400 + Math.random() * 200,
          timestamp: new Date().toISOString(),
        }
        
        for (const { channel } of genericChannels) {
          publishToChannel({
            channel,
            event: "telemetry_aggregate",
            data: telemetryData,
          })
        }
      }
    } catch (error) {
      console.error("[AutoPublisher] Error:", error)
    } finally {
      isPublishing = false
    }
  }, 2000 + Math.random() * 3000) // Random interval between 2-5 seconds
}

/**
 * Stop the auto-publisher
 */
export function stopAutoPublisher() {
  if (publisherInterval) {
    clearInterval(publisherInterval)
    publisherInterval = null
    console.log("[AutoPublisher] Stopped")
  }
}

/**
 * Publish a single event manually
 */
export async function publishEvent(
  channel: string,
  event: string,
  data: unknown
): Promise<{ delivered: number }> {
  return publishToChannel({
    channel,
    event,
    data,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Publish a hash operation event
 */
export async function publishHashEvent(
  recordId: string,
  hash: string,
  algorithm: string = "SHA-256"
) {
  return publishToChannel({
    channel: "computed/crypto-ops",
    event: "hash_created",
    data: {
      type: "hash",
      record_id: recordId,
      hash,
      algorithm,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Publish an alert event
 */
export async function publishAlert(alert: AlertEvent) {
  return publishToChannel({
    channel: "alerts/anomalies",
    event: "alert",
    data: alert,
  })
}
