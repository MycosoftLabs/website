/**
 * MINDEX Connector - Query PostgreSQL/MINDEX Database
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

const MINDEX_API_URL = process.env.NEXT_PUBLIC_MINDEX_API_URL || "http://192.168.0.188:8002"

export class MindexConnector implements BaseConnector {
  readonly name = "MINDEX Database"
  readonly sourceType = "mindex" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Build query from intent
      const queryText = this.buildQuery(intent, options)
      
      // Try MINDEX API
      try {
        const response = await fetch(`${MINDEX_API_URL}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: queryText,
            limit: options?.maxResults || 50,
          }),
          signal: AbortSignal.timeout(options?.timeout || 10000),
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            data: Array.isArray(data) ? data : data.results || data.rows || [],
            queryTime: Date.now() - startTime,
            source: this.sourceType,
          }
        }
      } catch {
        // Fall through to local API
      }
      
      // Fallback to local API route
      const localResponse = await fetch(`/api/mindex/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: queryText,
          intent: intent.type,
          entities: intent.entities,
          limit: options?.maxResults || 50,
        }),
        signal: AbortSignal.timeout(options?.timeout || 10000),
      })
      
      if (localResponse.ok) {
        const data = await localResponse.json()
        return {
          success: true,
          data: Array.isArray(data) ? data : data.results || data.rows || [],
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      return {
        success: false,
        data: [],
        error: "MINDEX query failed",
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
  
  private buildQuery(intent: Intent, options?: ConnectorOptions): string {
    // Natural language to SQL-like query conversion
    const entities = intent.entities
    const rawQuery = intent.rawQuery.toLowerCase()
    
    // Extract table hints from query
    const tableHints = this.extractTableHints(rawQuery)
    
    // Build semantic query
    let query = rawQuery
    
    if (tableHints.length > 0) {
      query = `FROM ${tableHints[0]}: ${rawQuery}`
    }
    
    // Add time range if specified
    if (entities.timeRange) {
      query += ` [time: ${entities.timeRange}]`
    }
    
    // Add limit
    if (options?.maxResults) {
      query += ` [limit: ${options.maxResults}]`
    }
    
    return query
  }
  
  private extractTableHints(query: string): string[] {
    const tablePatterns = [
      { pattern: /species|fungi|mushroom/i, table: "species" },
      { pattern: /compound|chemical/i, table: "compounds" },
      { pattern: /sample|specimen/i, table: "samples" },
      { pattern: /user|member/i, table: "users" },
      { pattern: /device|sensor/i, table: "devices" },
      { pattern: /log|event/i, table: "events" },
      { pattern: /transaction/i, table: "transactions" },
    ]
    
    const tables: string[] = []
    for (const { pattern, table } of tablePatterns) {
      if (pattern.test(query)) {
        tables.push(table)
      }
    }
    
    return tables
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${MINDEX_API_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
