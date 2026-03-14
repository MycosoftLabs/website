/**
 * Agent Registry Supabase Cache Layer
 *
 * Provides low-latency access to agent registry data by caching
 * aggregated results in Supabase. The Mindex ETL pipeline writes
 * to these tables; the frontend reads from them via this module.
 *
 * Tables (created via migration):
 * - agent_registry_stats: aggregated population counters
 * - agent_registry_entries: individual agent/bot/model entries
 * - environmental_quality_cache: latest environmental readings
 */

import { createClient } from "@/lib/supabase/server"

export interface AgentRegistryStats {
  id: string
  total_digital_beings: number
  total_agents: number
  total_bots: number
  total_models: number
  total_mcp_servers: number
  creations_today: number
  archivals_today: number
  deletions_today: number
  agent_traffic_percent: number
  updated_at: string
}

export interface AgentRegistryEntry {
  id: string
  name: string
  category: "agent" | "bot" | "model" | "mcp_server"
  platform: string
  builder: string
  description: string | null
  capabilities: string[]
  status: "active" | "archived" | "deprecated"
  url: string | null
  created_at: string
  updated_at: string
}

export interface EnvironmentalQualityCache {
  id: string
  source: string
  metric_type: "air" | "water" | "ground"
  data: Record<string, unknown>
  fetched_at: string
}

/**
 * Get cached agent registry stats (low-latency read from Supabase)
 * Falls back to null if table doesn't exist yet.
 */
export async function getCachedAgentStats(): Promise<AgentRegistryStats | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("agent_registry_stats")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data as AgentRegistryStats
  } catch {
    return null
  }
}

/**
 * Get cached agent registry entries with filtering
 */
export async function getCachedAgentEntries(options?: {
  category?: "agent" | "bot" | "model" | "mcp_server"
  platform?: string
  status?: "active" | "archived" | "deprecated"
  limit?: number
  offset?: number
}): Promise<AgentRegistryEntry[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from("agent_registry_entries")
      .select("*")
      .order("updated_at", { ascending: false })

    if (options?.category) query = query.eq("category", options.category)
    if (options?.platform) query = query.eq("platform", options.platform)
    if (options?.status) query = query.eq("status", options.status)
    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error } = await query
    if (error || !data) return []
    return data as AgentRegistryEntry[]
  } catch {
    return []
  }
}

/**
 * Get cached environmental quality data
 */
export async function getCachedEnvironmentalQuality(
  metricType?: "air" | "water" | "ground",
): Promise<EnvironmentalQualityCache[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from("environmental_quality_cache")
      .select("*")
      .order("fetched_at", { ascending: false })

    if (metricType) query = query.eq("metric_type", metricType)
    query = query.limit(10)

    const { data, error } = await query
    if (error || !data) return []
    return data as EnvironmentalQualityCache[]
  } catch {
    return []
  }
}

/**
 * Upsert agent registry stats (called by Mindex ETL)
 */
export async function upsertAgentStats(stats: Omit<AgentRegistryStats, "id" | "updated_at">): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("agent_registry_stats")
      .upsert(
        {
          id: "global-latest",
          ...stats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )

    return !error
  } catch {
    return false
  }
}

/**
 * Upsert environmental quality cache (called by ETL)
 */
export async function upsertEnvironmentalCache(
  metricType: "air" | "water" | "ground",
  source: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("environmental_quality_cache")
      .upsert(
        {
          id: `${metricType}-${source}`,
          metric_type: metricType,
          source,
          data,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )

    return !error
  } catch {
    return false
  }
}
