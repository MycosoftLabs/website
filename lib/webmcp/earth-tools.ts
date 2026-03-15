/**
 * Earth Intelligence MCP Tools — Mar 15, 2026
 *
 * Registers earth intelligence tools with navigator.modelContext (WebMCP).
 * Enables AI agents to query all Earth Intelligence domains:
 *   - Spatial queries (bbox)
 *   - Entity search across all domains
 *   - CREP map control
 *   - Domain listing and stats
 *
 * For use by Claude, ChatGPT, browser AI extensions, and any MCP-compatible agent.
 */

import type { ToolRegistration, WebMCPToolResult } from "./provider"
import { isWebMCPAvailable } from "./provider"

export interface EarthToolCallbacks {
  onEarthSearch?: (query: string, domains?: string[]) => Promise<Record<string, unknown[]>>
  onEarthBbox?: (bbox: { north: number; south: number; east: number; west: number }, layers?: string[]) => Promise<Record<string, unknown[]>>
  onEarthStats?: () => Promise<Record<string, number>>
  onMapCommand?: (command: string, params: Record<string, unknown>) => void
}

export const EARTH_TOOL_SCHEMAS = [
  {
    name: "mycosoft_earth_search",
    description:
      "Search all Earth Intelligence domains: aircraft, vessels, satellites, events (earthquakes, volcanoes, storms), weather, emissions, infrastructure, devices, species, space weather. Returns structured results by domain.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query (e.g. 'planes over LA', 'earthquakes today', 'ships in port')" },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "Optional: limit to specific domains (aircraft, vessels, satellites, events, weather, emissions, infrastructure, devices, species, space_weather)",
        },
        limit: { type: "number", description: "Max results per domain (default 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "mycosoft_earth_bbox",
    description:
      "Query all Earth Intelligence data within a geographic bounding box. Returns entities visible in that area across all domains.",
    inputSchema: {
      type: "object",
      properties: {
        north: { type: "number", description: "North latitude boundary" },
        south: { type: "number", description: "South latitude boundary" },
        east: { type: "number", description: "East longitude boundary" },
        west: { type: "number", description: "West longitude boundary" },
        layers: {
          type: "array",
          items: { type: "string" },
          description: "Optional: specific layers to query",
        },
      },
      required: ["north", "south", "east", "west"],
    },
  },
  {
    name: "mycosoft_earth_stats",
    description: "Get current Earth Intelligence statistics: counts of tracked entities across all domains.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mycosoft_map_command",
    description:
      "Control the CREP map: fly to location, zoom, toggle layers, select entities, reset view.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          enum: ["fly_to", "zoom", "show_layer", "hide_layer", "reset_view", "select_entity", "search_entities"],
          description: "Map command type",
        },
        params: {
          type: "object",
          description: "Command parameters (e.g. {query: 'San Diego'} for fly_to, {layer: 'aircraft'} for show_layer)",
        },
      },
      required: ["command"],
    },
  },
] as const

function noopReg(): ToolRegistration {
  return { unregister: () => {} }
}

export function registerEarthMCPTools(callbacks: EarthToolCallbacks): ToolRegistration[] {
  if (!isWebMCPAvailable()) return [noopReg()]

  const registrations: ToolRegistration[] = []
  const mc = navigator.modelContext!

  if (callbacks.onEarthSearch) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_earth_search",
        description: EARTH_TOOL_SCHEMAS[0].description,
        inputSchema: EARTH_TOOL_SCHEMAS[0].inputSchema as Record<string, unknown>,
        async execute(args): Promise<WebMCPToolResult> {
          const results = await callbacks.onEarthSearch!(
            String(args.query ?? ""),
            args.domains as string[] | undefined
          )
          const counts = Object.fromEntries(
            Object.entries(results).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
          )
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ counts, results }, null, 2),
            }],
          }
        },
      })
    )
  }

  if (callbacks.onEarthBbox) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_earth_bbox",
        description: EARTH_TOOL_SCHEMAS[1].description,
        inputSchema: EARTH_TOOL_SCHEMAS[1].inputSchema as Record<string, unknown>,
        async execute(args): Promise<WebMCPToolResult> {
          const results = await callbacks.onEarthBbox!(
            {
              north: Number(args.north),
              south: Number(args.south),
              east: Number(args.east),
              west: Number(args.west),
            },
            args.layers as string[] | undefined
          )
          const counts = Object.fromEntries(
            Object.entries(results).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
          )
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ counts, results }, null, 2),
            }],
          }
        },
      })
    )
  }

  if (callbacks.onEarthStats) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_earth_stats",
        description: EARTH_TOOL_SCHEMAS[2].description,
        inputSchema: EARTH_TOOL_SCHEMAS[2].inputSchema as Record<string, unknown>,
        async execute(): Promise<WebMCPToolResult> {
          const stats = await callbacks.onEarthStats!()
          return {
            content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          }
        },
      })
    )
  }

  if (callbacks.onMapCommand) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_map_command",
        description: EARTH_TOOL_SCHEMAS[3].description,
        inputSchema: EARTH_TOOL_SCHEMAS[3].inputSchema as Record<string, unknown>,
        async execute(args): Promise<WebMCPToolResult> {
          const cmd = String(args.command ?? "")
          const params = (args.params as Record<string, unknown>) || {}
          callbacks.onMapCommand!(cmd, params)
          return {
            content: [{ type: "text", text: `Map command executed: ${cmd}` }],
          }
        },
      })
    )
  }

  return registrations.length > 0 ? registrations : [noopReg()]
}
