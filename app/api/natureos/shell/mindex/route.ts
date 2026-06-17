import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY

function ensureMindexApiKey(): string {
  if (!MINDEX_API_KEY) {
    throw new Error("MINDEX_API_KEY_MISSING")
  }
  return MINDEX_API_KEY
}

/**
 * MINDEX Shell Command API
 * 
 * Execute MINDEX commands from NatureOS Cloud Shell
 * 
 * Supported commands:
 * - stats: Get database statistics
 * - search <query>: Search taxa and observations
 * - taxa list: List all taxa
 * - taxa get <id>: Get specific taxon
 * - observations list: List recent observations
 * - etl status: Get ETL pipeline status
 * - etl run: Proxy POST to MINDEX /etl/run (registered job name required)
 */
export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json()

    if (!command || typeof command !== "string") {
      return NextResponse.json({
        error: "Invalid command",
        output: "Usage: mindex <command> [args]",
      }, { status: 400 })
    }

    const parts = command.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)

    let result: any

    switch (cmd) {
      case "stats":
        result = await executeStats()
        break
      
      case "search":
        if (args.length === 0) {
          result = { error: "Usage: mindex search <query>" }
        } else {
          result = await executeSearch(args.join(" "))
        }
        break
      
      case "taxa":
        result = await executeTaxa(args)
        break
      
      case "observations":
        result = await executeObservations(args)
        break
      
      case "etl": {
        const etlOutcome = await executeETL(args)
        if (etlOutcome instanceof NextResponse) {
          return etlOutcome
        }
        result = etlOutcome
        break
      }
      
      case "help":
        result = {
          commands: [
            "stats - Get database statistics",
            "search <query> - Search taxa and observations",
            "taxa list - List all taxa",
            "taxa get <id> - Get specific taxon",
            "observations list - List recent observations",
            "etl status - Get ETL pipeline status",
            "etl run - Not proxied (501 until upstream exposes a supported trigger)",
          ]
        }
        break
      
      default:
        result = {
          error: `Unknown command: ${cmd}`,
          help: "Run 'mindex help' for available commands"
        }
    }

    return NextResponse.json({
      command,
      output: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Shell command error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isMissingConfig = errorMessage.includes("MINDEX_API_KEY_MISSING")
    return NextResponse.json({
      error: "Command execution failed",
      details: isMissingConfig
        ? "MINDEX API key is not configured for live shell access."
        : errorMessage,
    }, { status: isMissingConfig ? 503 : 500 })
  }
}

async function executeStats() {
  const apiKey = ensureMindexApiKey()
  const response = await fetch(`${MINDEX_API_URL}/api/mindex/stats`, {
    headers: { "X-API-Key": apiKey },
  })
  return await response.json()
}

async function executeSearch(query: string) {
  const apiKey = ensureMindexApiKey()
  const [taxaRes, obsRes] = await Promise.all([
    fetch(`${MINDEX_API_URL}/api/mindex/taxa?search=${encodeURIComponent(query)}&limit=10`, {
      headers: { "X-API-Key": apiKey },
    }),
    fetch(`${MINDEX_API_URL}/api/mindex/observations?search=${encodeURIComponent(query)}&limit=10`, {
      headers: { "X-API-Key": apiKey },
    }),
  ])

  const taxa = taxaRes.ok ? (await taxaRes.json()).taxa : []
  const observations = obsRes.ok ? (await obsRes.json()).observations : []

  return {
    taxa: taxa.map((t: any) => `${t.canonical_name} (${t.rank})`),
    observations: observations.map((o: any) => `${o.taxon?.canonical_name || "Unknown"} at ${o.location?.coordinates || "Unknown location"}`),
    total: taxa.length + observations.length,
  }
}

async function executeTaxa(args: string[]) {
  const apiKey = ensureMindexApiKey()
  const subcommand = args[0]

  if (subcommand === "list") {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa?limit=50`, {
      headers: { "X-API-Key": apiKey },
    })
    const data = await response.json()
    return {
      taxa: data.taxa.map((t: any) => `[${t.id}] ${t.canonical_name} (${t.rank})`),
      count: data.taxa.length,
      total: data.total,
    }
  } else if (subcommand === "get" && args[1]) {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa/${args[1]}`, {
      headers: { "X-API-Key": apiKey },
    })
    return await response.json()
  } else {
    return { error: "Usage: taxa list | taxa get <id>" }
  }
}

async function executeObservations(args: string[]) {
  const apiKey = ensureMindexApiKey()
  const subcommand = args[0]

  if (subcommand === "list") {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/observations?limit=20`, {
      headers: { "X-API-Key": apiKey },
    })
    const data = await response.json()
    return {
      observations: data.observations.map((o: any) => 
        `[${o.id}] ${o.taxon?.canonical_name || "Unknown"} - ${new Date(o.observed_at).toLocaleDateString()}`
      ),
      count: data.observations.length,
    }
  } else {
    return { error: "Usage: observations list" }
  }
}

async function fetchUpstreamEtlStatus(): Promise<Response> {
  const apiKey = ensureMindexApiKey()
  const baseUrl = MINDEX_API_URL.endsWith("/api/mindex")
    ? MINDEX_API_URL
    : `${MINDEX_API_URL}/api/mindex`
  const primary = await fetch(`${baseUrl}/etl-status`, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (primary.ok) return primary
  return fetch(`${MINDEX_API_URL}/api/mindex/etl/status`, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  })
}

/**
 * ETL subcommands: real upstream status when MINDEX is reachable; no fabricated pipeline text.
 * `run` is not proxied — returns 501 until an upstream trigger contract exists.
 */
async function executeETL(args: string[]): Promise<unknown | NextResponse> {
  const subcommand = args[0]

  if (subcommand === "status") {
    const response = await fetchUpstreamEtlStatus()
    if (!response.ok) {
      const snippet = await response.text().catch(() => "")
      return NextResponse.json(
        {
          error: "MINDEX_ETL_STATUS_UNAVAILABLE",
          message:
            "Live ETL status requires a reachable MINDEX upstream and a valid MINDEX_API_KEY. Configure the deployment or query GET /api/natureos/mindex/etl-status once the upstream exposes etl-status.",
          upstream_status: response.status,
          upstream_body_preview: snippet.slice(0, 500),
        },
        { status: 503 }
      )
    }
    return await response.json()
  }

  if (subcommand === "run") {
    const job = args[1] || "inat_taxa"
    const apiKey = ensureMindexApiKey()
    const response = await fetch(`${MINDEX_API_URL}/etl/run`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job, full_sync: false }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      const snippet = await response.text().catch(() => "")
      return NextResponse.json(
        {
          error: "MINDEX_ETL_RUN_FAILED",
          message: "MINDEX ETL run request failed. Check MINDEX_API_KEY and upstream job registry.",
          upstream_status: response.status,
          upstream_body_preview: snippet.slice(0, 500),
        },
        { status: response.status >= 500 ? 503 : response.status }
      )
    }
    return await response.json()
  }

  return { error: "Usage: etl status | etl run" }
}






























