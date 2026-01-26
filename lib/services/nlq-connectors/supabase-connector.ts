/**
 * Supabase Connector - Query Supabase Database
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export class SupabaseConnector implements BaseConnector {
  readonly name = "Supabase"
  readonly sourceType = "supabase" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        success: false,
        data: [],
        error: "Supabase not configured",
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    }
    
    try {
      // Determine table and query from intent
      const { table, filters } = this.buildSupabaseQuery(intent, options)
      
      if (!table) {
        return {
          success: false,
          data: [],
          error: "Could not determine target table",
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      // Build query string
      let queryUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*`
      
      // Add filters
      for (const [key, value] of Object.entries(filters)) {
        queryUrl += `&${key}=eq.${value}`
      }
      
      // Add limit
      const limit = options?.maxResults || 50
      queryUrl += `&limit=${limit}`
      
      // Add ordering (newest first by default)
      queryUrl += `&order=created_at.desc`
      
      const response = await fetch(queryUrl, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(options?.timeout || 10000),
      })
      
      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: Array.isArray(data) ? data : [],
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      return {
        success: false,
        data: [],
        error: `Supabase query failed: ${response.status}`,
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Unknown error",
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    }
  }
  
  private buildSupabaseQuery(
    intent: Intent, 
    options?: ConnectorOptions
  ): { table: string | null; filters: Record<string, string> } {
    const rawQuery = intent.rawQuery.toLowerCase()
    const filters: Record<string, string> = {}
    
    // Table detection patterns
    const tablePatterns: Array<{ pattern: RegExp; table: string }> = [
      { pattern: /user|profile|account/i, table: "profiles" },
      { pattern: /species|fungi|mushroom/i, table: "species" },
      { pattern: /sample|specimen/i, table: "samples" },
      { pattern: /conversation|chat|message/i, table: "myca_conversations" },
      { pattern: /device|sensor/i, table: "devices" },
      { pattern: /document|file/i, table: "documents" },
      { pattern: /feedback/i, table: "feedback" },
      { pattern: /log|event/i, table: "event_logs" },
    ]
    
    let table: string | null = null
    
    for (const { pattern, table: tableName } of tablePatterns) {
      if (pattern.test(rawQuery)) {
        table = tableName
        break
      }
    }
    
    // Add entity-based filters
    if (intent.entities.status) {
      filters.status = String(intent.entities.status)
    }
    if (intent.entities.category) {
      filters.category = String(intent.entities.category)
    }
    
    // Add custom filters from options
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "string" || typeof value === "number") {
          filters[key] = String(value)
        }
      }
    }
    
    return { table, filters }
  }
  
  async isAvailable(): Promise<boolean> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return false
    }
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
        },
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
