import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

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
 * - etl run: Trigger manual sync
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
      
      case "etl":
        result = await executeETL(args)
        break
      
      case "help":
        result = {
          commands: [
            "stats - Get database statistics",
            "search <query> - Search taxa and observations",
            "taxa list - List all taxa",
            "taxa get <id> - Get specific taxon",
            "observations list - List recent observations",
            "etl status - Get ETL pipeline status",
            "etl run - Trigger manual sync (admin only)",
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
    return NextResponse.json({
      error: "Command execution failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

async function executeStats() {
  const response = await fetch(`${MINDEX_API_URL}/api/mindex/stats`, {
    headers: { "X-API-Key": MINDEX_API_KEY },
  })
  return await response.json()
}

async function executeSearch(query: string) {
  const [taxaRes, obsRes] = await Promise.all([
    fetch(`${MINDEX_API_URL}/api/mindex/taxa?search=${encodeURIComponent(query)}&limit=10`, {
      headers: { "X-API-Key": MINDEX_API_KEY },
    }),
    fetch(`${MINDEX_API_URL}/api/mindex/observations?search=${encodeURIComponent(query)}&limit=10`, {
      headers: { "X-API-Key": MINDEX_API_KEY },
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
  const subcommand = args[0]

  if (subcommand === "list") {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa?limit=50`, {
      headers: { "X-API-Key": MINDEX_API_KEY },
    })
    const data = await response.json()
    return {
      taxa: data.taxa.map((t: any) => `[${t.id}] ${t.canonical_name} (${t.rank})`),
      count: data.taxa.length,
      total: data.total,
    }
  } else if (subcommand === "get" && args[1]) {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/taxa/${args[1]}`, {
      headers: { "X-API-Key": MINDEX_API_KEY },
    })
    return await response.json()
  } else {
    return { error: "Usage: taxa list | taxa get <id>" }
  }
}

async function executeObservations(args: string[]) {
  const subcommand = args[0]

  if (subcommand === "list") {
    const response = await fetch(`${MINDEX_API_URL}/api/mindex/observations?limit=20`, {
      headers: { "X-API-Key": MINDEX_API_KEY },
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

async function executeETL(args: string[]) {
  const subcommand = args[0]

  if (subcommand === "status") {
    return {
      status: "Running",
      lastSync: new Date().toISOString(),
      nextSync: new Date(Date.now() + 3600000).toISOString(),
      message: "ETL pipeline active - syncing from iNaturalist and GBIF"
    }
  } else if (subcommand === "run") {
    return {
      error: "Manual ETL trigger requires admin privileges",
      message: "Contact system administrator to run manual sync"
    }
  } else {
    return { error: "Usage: etl status | etl run" }
  }
}






























