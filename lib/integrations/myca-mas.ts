/**
 * MYCA MAS Integration
 *
 * Functions for interacting with the MYCA Multi-Agent System
 * Server-side only - never expose API keys to client
 */

import { env } from "@/lib/env"
import { createHttpClient } from "./http"
import type { Agent, AgentRun, ServiceHealth, ApiResponse, PaginationParams } from "./types"

// Create MYCA MAS HTTP client
const mycaClient = createHttpClient({
  baseUrl: env.mycaMasApiBaseUrl,
  apiKey: env.mycaMasApiKey,
  timeout: 30000, // Longer timeout for agent operations
  retries: 1,
})

// ============================================
// Health Check
// ============================================

export async function getMasHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  try {
    await mycaClient.get("/health")
    return {
      service: "myca-mas",
      status: "healthy",
      latencyMs: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      service: "myca-mas",
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Unknown error",
      lastChecked: new Date().toISOString(),
    }
  }
}

// ============================================
// Agents
// ============================================

export async function listAgents(params?: PaginationParams): Promise<ApiResponse<Agent[]>> {
  const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    page_size: String(params?.pageSize || 20),
  })

  return mycaClient.get<ApiResponse<Agent[]>>(`/agents?${queryParams.toString()}`)
}

export async function getAgentById(id: string): Promise<Agent> {
  return mycaClient.get<Agent>(`/agents/${id}`)
}

// ============================================
// Agent Runs
// ============================================

export interface ListAgentRunsFilters {
  agentId?: string
  status?: AgentRun["status"]
  startedAfter?: string
  startedBefore?: string
}

export async function listAgentRuns(
  params?: PaginationParams,
  filters?: ListAgentRunsFilters,
): Promise<ApiResponse<AgentRun[]>> {
  const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    page_size: String(params?.pageSize || 20),
  })

  if (filters?.agentId) queryParams.set("agent_id", filters.agentId)
  if (filters?.status) queryParams.set("status", filters.status)
  if (filters?.startedAfter) queryParams.set("started_after", filters.startedAfter)
  if (filters?.startedBefore) queryParams.set("started_before", filters.startedBefore)

  return mycaClient.get<ApiResponse<AgentRun[]>>(`/runs?${queryParams.toString()}`)
}

export async function getAgentRun(runId: string): Promise<AgentRun> {
  return mycaClient.get<AgentRun>(`/runs/${runId}`)
}

export interface StartAgentRunPayload {
  agentId: string
  input?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function startAgentRun(payload: StartAgentRunPayload): Promise<AgentRun> {
  return mycaClient.post<AgentRun>("/runs", payload)
}

export async function cancelAgentRun(runId: string): Promise<AgentRun> {
  return mycaClient.post<AgentRun>(`/runs/${runId}/cancel`)
}

// ============================================
// Agent Logs
// ============================================

export async function getAgentRunLogs(runId: string): Promise<AgentRun["logs"]> {
  return mycaClient.get<AgentRun["logs"]>(`/runs/${runId}/logs`)
}
