/**
 * Earth Intelligence Tools API — /api/earth/tools
 *
 * Agent/CLI/MCP-compatible endpoint exposing all Earth Intelligence tools.
 *
 * GET  /api/earth/tools          — List available tool definitions (MCP schema)
 * POST /api/earth/tools          — Execute a tool by name with arguments
 *
 * Compatible with:
 *   - MCP (Model Context Protocol) tool calling
 *   - Claude Code / Claude Desktop
 *   - CLI scripts (curl/httpie)
 *   - n8n workflow automation
 *   - Any agent that speaks JSON tool-call format
 */

import { NextRequest, NextResponse } from "next/server"
import { searchEarthIntelligence } from "@/lib/search/earth-search-connectors"
import { getEarthDataByBbox, getEarthStats } from "@/lib/crep/crep-data-service"
import { EARTH_TOOL_SCHEMAS } from "@/lib/webmcp/earth-tools"

export const dynamic = "force-dynamic"

// Tool definitions in MCP-compatible format
const TOOL_DEFINITIONS = EARTH_TOOL_SCHEMAS.map((s) => ({
  name: s.name,
  description: s.description,
  inputSchema: s.inputSchema,
}))

/**
 * GET — Return tool definitions for agent discovery.
 */
export async function GET() {
  return NextResponse.json({
    tools: TOOL_DEFINITIONS,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
}

/**
 * POST — Execute a tool call.
 * Body: { tool: "mycosoft_earth_search", arguments: { query: "planes over LA" } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tool, arguments: args } = body

    if (!tool) {
      return NextResponse.json(
        { error: "Missing 'tool' field" },
        { status: 400 }
      )
    }

    let result: unknown

    switch (tool) {
      case "mycosoft_earth_search": {
        const query = String(args?.query ?? "")
        if (!query) {
          return NextResponse.json({ error: "Missing query argument" }, { status: 400 })
        }
        const limit = Number(args?.limit ?? 20)
        const results = await searchEarthIntelligence(query, "", limit)
        const counts = Object.fromEntries(
          Object.entries(results).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        )
        result = { counts, results }
        break
      }

      case "mycosoft_earth_bbox": {
        const { north, south, east, west, layers } = args || {}
        if ([north, south, east, west].some((v) => v === undefined || isNaN(Number(v)))) {
          return NextResponse.json(
            { error: "Missing or invalid bbox coordinates (north, south, east, west)" },
            { status: 400 }
          )
        }
        const data = await getEarthDataByBbox({
          north: Number(north),
          south: Number(south),
          east: Number(east),
          west: Number(west),
          layers: layers as string[] | undefined,
        })
        const counts = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        )
        result = { counts, data }
        break
      }

      case "mycosoft_earth_stats": {
        result = await getEarthStats()
        break
      }

      case "mycosoft_map_command": {
        // Map commands are frontend-only — return the command for the agent to dispatch
        result = {
          command: args?.command,
          params: args?.params || {},
          message: "Map command prepared. Dispatch via frontend WebSocket or CREP context.",
        }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}`, available: TOOL_DEFINITIONS.map((t) => t.name) },
          { status: 400 }
        )
    }

    return NextResponse.json({
      tool,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 }
    )
  }
}
