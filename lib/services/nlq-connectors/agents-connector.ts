/**
 * Agents Connector - Query MAS Agent Registry
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

const MAS_API_URL = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

export class AgentsConnector implements BaseConnector {
  readonly name = "MAS Agents"
  readonly sourceType = "agents" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Build query parameters from intent
      const params = new URLSearchParams()
      
      if (intent.entities.category) {
        params.set("category", String(intent.entities.category))
      }
      if (intent.entities.status) {
        params.set("status", String(intent.entities.status))
      }
      if (options?.maxResults) {
        params.set("limit", String(options.maxResults))
      }
      
      // Try MAS API first
      try {
        const response = await fetch(`${MAS_API_URL}/api/agents?${params}`, {
          signal: AbortSignal.timeout(options?.timeout || 5000),
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            data: Array.isArray(data) ? data : data.agents || [],
            queryTime: Date.now() - startTime,
            source: this.sourceType,
          }
        }
      } catch {
        // Fall through to local API
      }
      
      // Fallback to local topology API
      const localResponse = await fetch(`/api/mas/topology`, {
        signal: AbortSignal.timeout(options?.timeout || 5000),
      })
      
      if (localResponse.ok) {
        const data = await localResponse.json()
        let agents = data.nodes || []
        
        // Apply filters
        if (intent.entities.category) {
          agents = agents.filter((a: Record<string, unknown>) => 
            a.category === intent.entities.category
          )
        }
        if (intent.entities.status) {
          agents = agents.filter((a: Record<string, unknown>) => 
            a.status === intent.entities.status
          )
        }
        
        // Apply metric filters
        if (intent.entities.metric) {
          const metric = String(intent.entities.metric).toLowerCase()
          const comparison = String(intent.entities.comparison || "high").toLowerCase()
          
          agents = agents.filter((a: Record<string, unknown>) => {
            const metrics = a.metrics as Record<string, number> | undefined
            if (!metrics) return false
            
            if (metric === "cpu" || metric === "memory" || metric === "ram") {
              const value = metric === "cpu" ? metrics.cpuPercent : metrics.memoryMb
              return comparison.includes("high") ? value > 50 : value < 50
            }
            if (metric === "error") {
              return comparison.includes("high") ? metrics.errorRate > 0.01 : metrics.errorRate < 0.01
            }
            return true
          })
        }
        
        // Sort by relevance
        if (intent.entities.metric) {
          const metric = String(intent.entities.metric).toLowerCase()
          agents.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aMetrics = a.metrics as Record<string, number>
            const bMetrics = b.metrics as Record<string, number>
            if (metric === "cpu") return (bMetrics?.cpuPercent || 0) - (aMetrics?.cpuPercent || 0)
            if (metric === "memory" || metric === "ram") return (bMetrics?.memoryMb || 0) - (aMetrics?.memoryMb || 0)
            return 0
          })
        }
        
        // Limit results
        if (options?.maxResults) {
          agents = agents.slice(0, options.maxResults)
        }
        
        return {
          success: true,
          data: agents,
          queryTime: Date.now() - startTime,
          source: this.sourceType,
        }
      }
      
      return {
        success: false,
        data: [],
        error: "Failed to fetch agents",
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
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`/api/mas/health`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Execute agent action
   */
  async executeAction(
    agentId: string, 
    action: "start" | "stop" | "restart" | "configure",
    params?: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`/api/mas/agents/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, action, ...params }),
      })
      
      const data = await response.json()
      return {
        success: response.ok,
        message: data.message || (response.ok ? "Action completed" : "Action failed"),
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Action failed",
      }
    }
  }
}
