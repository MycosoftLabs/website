"use client"

/**
 * WebSocket Hook for Real-Time Topology Updates
 * Connects to MAS Dashboard API at 192.168.0.188:8001
 */

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  TopologyNode,
  TopologyConnection,
  TopologyIncident,
  TopologyWSMessage,
  TopologyWSMessageType,
  NodeStatus,
  DetectedGap,
  ExtendedTopologyData,
} from "./types"

// MAS Dashboard WebSocket URL
const WS_URL = process.env.NEXT_PUBLIC_MAS_WS_URL || "ws://192.168.0.188:8001/api/dashboard/ws"
const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 10
const HEARTBEAT_INTERVAL = 30000

export interface TopologyWebSocketState {
  connected: boolean
  connecting: boolean
  error: string | null
  lastUpdate: Date | null
  reconnectAttempts: number
}

export interface TopologyWebSocketHandlers {
  onAgentUpdate?: (agentId: string, status: NodeStatus, metrics?: TopologyNode["metrics"]) => void
  onAgentEvent?: (event: { agentId: string; eventType: string; data?: unknown }) => void
  onIncidentCreated?: (incident: TopologyIncident) => void
  onIncidentUpdated?: (incident: TopologyIncident) => void
  onIncidentResolved?: (incidentId: string) => void
  onConnectionUpdate?: (connectionId: string, traffic: TopologyConnection["traffic"], active: boolean) => void
  onMetricUpdate?: (agentId: string, metrics: TopologyNode["metrics"]) => void
  onTaskAssigned?: (agentId: string, taskId: string) => void
  onTaskCompleted?: (agentId: string, taskId: string, result?: unknown) => void
  onGapDetected?: (gap: DetectedGap) => void
}

export interface UseTopologyWebSocketResult {
  state: TopologyWebSocketState
  agents: Map<string, Partial<TopologyNode>>
  incidents: TopologyIncident[]
  gaps: DetectedGap[]
  connect: () => void
  disconnect: () => void
  sendMessage: (type: string, payload: unknown) => void
  subscribeToAgent: (agentId: string) => void
  unsubscribeFromAgent: (agentId: string) => void
}

export function useTopologyWebSocket(
  handlers: TopologyWebSocketHandlers = {}
): UseTopologyWebSocketResult {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<TopologyWebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: null,
    reconnectAttempts: 0,
  })

  const [agents, setAgents] = useState<Map<string, Partial<TopologyNode>>>(new Map())
  const [incidents, setIncidents] = useState<TopologyIncident[]>([])
  const [gaps, setGaps] = useState<DetectedGap[]>([])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: TopologyWSMessage = JSON.parse(event.data)
      const { type, payload } = message

      setState((prev) => ({ ...prev, lastUpdate: new Date() }))

      switch (type) {
        case "agent_update": {
          const { agentId, status, metrics } = payload as {
            agentId: string
            status: NodeStatus
            metrics?: TopologyNode["metrics"]
          }
          setAgents((prev) => {
            const updated = new Map(prev)
            const existing = updated.get(agentId) || {}
            updated.set(agentId, { ...existing, status, metrics: metrics || existing.metrics })
            return updated
          })
          handlers.onAgentUpdate?.(agentId, status, metrics)
          break
        }

        case "agent_event": {
          const eventData = payload as { agentId: string; eventType: string; data?: unknown }
          handlers.onAgentEvent?.(eventData)
          break
        }

        case "metric_update": {
          const { agentId, metrics } = payload as {
            agentId: string
            metrics: TopologyNode["metrics"]
          }
          setAgents((prev) => {
            const updated = new Map(prev)
            const existing = updated.get(agentId) || {}
            updated.set(agentId, { ...existing, metrics })
            return updated
          })
          handlers.onMetricUpdate?.(agentId, metrics)
          break
        }

        case "connection_update": {
          const { connectionId, traffic, active } = payload as {
            connectionId: string
            traffic: TopologyConnection["traffic"]
            active: boolean
          }
          handlers.onConnectionUpdate?.(connectionId, traffic, active)
          break
        }

        case "incident_created": {
          const incident = (payload as { incident: TopologyIncident }).incident
          setIncidents((prev) => [...prev, incident])
          handlers.onIncidentCreated?.(incident)
          break
        }

        case "incident_updated": {
          const incident = (payload as { incident: TopologyIncident }).incident
          setIncidents((prev) =>
            prev.map((i) => (i.id === incident.id ? incident : i))
          )
          handlers.onIncidentUpdated?.(incident)
          break
        }

        case "incident_resolved": {
          const { incidentId } = payload as { incidentId: string }
          setIncidents((prev) => prev.filter((i) => i.id !== incidentId))
          handlers.onIncidentResolved?.(incidentId)
          break
        }

        case "task_assigned": {
          const { agentId, taskId } = payload as { agentId: string; taskId: string }
          handlers.onTaskAssigned?.(agentId, taskId)
          break
        }

        case "task_completed": {
          const { agentId, taskId, result } = payload as {
            agentId: string
            taskId: string
            result?: unknown
          }
          handlers.onTaskCompleted?.(agentId, taskId, result)
          break
        }

        default:
          console.log(`[TopologyWS] Unknown message type: ${type}`)
      }
    } catch (err) {
      console.error("[TopologyWS] Failed to parse message:", err)
    }
  }, [handlers])

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping", timestamp: Date.now() }))
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }))

    try {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log("[TopologyWS] Connected to MAS Dashboard")
        setState((prev) => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
        }))
        startHeartbeat()

        // Subscribe to all updates
        ws.send(JSON.stringify({ type: "subscribe", topics: ["agents", "incidents", "connections"] }))
      }

      ws.onmessage = handleMessage

      ws.onerror = (error) => {
        console.error("[TopologyWS] WebSocket error:", error)
        setState((prev) => ({
          ...prev,
          error: "WebSocket connection error",
        }))
      }

      ws.onclose = (event) => {
        console.log("[TopologyWS] WebSocket closed:", event.code, event.reason)
        stopHeartbeat()
        setState((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
        }))

        // Auto-reconnect with exponential backoff
        if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts)
          console.log(`[TopologyWS] Reconnecting in ${delay}ms...`)
          reconnectRef.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }))
            connect()
          }, delay)
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error("[TopologyWS] Failed to connect:", err)
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }))
    }
  }, [handleMessage, startHeartbeat, stopHeartbeat, state.reconnectAttempts])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    stopHeartbeat()
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect")
      wsRef.current = null
    }
    setState({
      connected: false,
      connecting: false,
      error: null,
      lastUpdate: null,
      reconnectAttempts: 0,
    })
  }, [stopHeartbeat])

  // Send message
  const sendMessage = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    } else {
      console.warn("[TopologyWS] Cannot send message - not connected")
    }
  }, [])

  // Subscribe to specific agent updates
  const subscribeToAgent = useCallback((agentId: string) => {
    sendMessage("subscribe_agent", { agentId })
  }, [sendMessage])

  // Unsubscribe from agent updates
  const unsubscribeFromAgent = useCallback((agentId: string) => {
    sendMessage("unsubscribe_agent", { agentId })
  }, [sendMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    state,
    agents,
    incidents,
    gaps,
    connect,
    disconnect,
    sendMessage,
    subscribeToAgent,
    unsubscribeFromAgent,
  }
}

// ============================================
// SSE Stream Hook for Logs
// ============================================

export interface LogEntry {
  timestamp: string
  level: "debug" | "info" | "warn" | "error"
  agentId: string
  message: string
  data?: unknown
}

export function useTopologyLogStream(enabled: boolean = false) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const SSE_URL = process.env.NEXT_PUBLIC_MAS_SSE_URL || "http://192.168.0.188:8001/api/dashboard/stream"

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setConnected(false)
      }
      return
    }

    const eventSource = new EventSource(SSE_URL)

    eventSource.onopen = () => {
      console.log("[TopologySSE] Connected to log stream")
      setConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const log: LogEntry = JSON.parse(event.data)
        setLogs((prev) => {
          const newLogs = [...prev, log]
          // Keep only last 1000 logs
          if (newLogs.length > 1000) {
            return newLogs.slice(-1000)
          }
          return newLogs
        })
      } catch (err) {
        console.error("[TopologySSE] Failed to parse log:", err)
      }
    }

    eventSource.onerror = (error) => {
      console.error("[TopologySSE] Stream error:", error)
      setConnected(false)
    }

    eventSourceRef.current = eventSource

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [enabled, SSE_URL])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return { logs, connected, clearLogs }
}

// ============================================
// REST API Hooks
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

export async function fetchTopologyData(): Promise<ExtendedTopologyData | null> {
  try {
    const [agentsRes, topologyRes, statsRes, incidentsRes, gapsRes] = await Promise.all([
      fetch(`${API_BASE}/api/dashboard/agents`),
      fetch(`${API_BASE}/api/dashboard/topology`),
      fetch(`${API_BASE}/api/dashboard/stats`),
      fetch(`${API_BASE}/api/security/incidents?status=active`).catch(() => null),
      fetch(`${API_BASE}/gaps`).catch(() => null),
    ])

    if (!agentsRes.ok || !topologyRes.ok) {
      throw new Error("Failed to fetch topology data")
    }

    const agents = await agentsRes.json()
    const topology = await topologyRes.json()
    const stats = await statsRes.json()
    const incidents = incidentsRes?.ok ? await incidentsRes.json() : []
    const gaps = gapsRes?.ok ? await gapsRes.json() : []

    return {
      nodes: agents.agents || [],
      connections: topology.edges || [],
      packets: [],
      stats: {
        totalNodes: agents.total || 0,
        activeNodes: agents.active || 0,
        totalConnections: topology.edges?.length || 0,
        activeConnections: topology.edges?.filter((e: { active: boolean }) => e.active).length || 0,
        messagesPerSecond: stats.messagesPerSecond || 0,
        avgLatencyMs: stats.avgLatencyMs || 0,
        systemLoad: stats.systemLoad || 0,
        uptimeSeconds: stats.uptimeSeconds || 0,
      },
      lastUpdated: new Date().toISOString(),
      incidents: incidents.incidents || [],
      gaps: gaps.gaps || [],
      predictions: [],
    }
  } catch (error) {
    console.error("[Topology API] Failed to fetch data:", error)
    return null
  }
}

export async function executeAgentAction(
  agentId: string,
  action: "spawn" | "stop" | "restart" | "configure",
  params?: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    const endpoint = action === "spawn" 
      ? `${API_BASE}/agents/spawn`
      : `${API_BASE}/agents/${agentId}/${action}`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, message: data.error || "Action failed" }
    }

    return { success: true, message: data.message || "Action completed", data }
  } catch (error) {
    console.error(`[Topology API] Failed to execute ${action}:`, error)
    return { success: false, message: error instanceof Error ? error.message : "Network error" }
  }
}

export async function submitTask(
  agentId: string,
  task: string,
  payload?: Record<string, unknown>
): Promise<{ success: boolean; taskId?: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, task, payload }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, message: data.error || "Task submission failed" }
    }

    return { success: true, taskId: data.taskId, message: "Task submitted" }
  } catch (error) {
    console.error("[Topology API] Failed to submit task:", error)
    return { success: false, message: error instanceof Error ? error.message : "Network error" }
  }
}
