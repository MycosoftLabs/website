"use client"

/**
 * Simple Topology WebSocket hook for MYCA Live Activity Panel
 * Connects to MAS ws/topology endpoint, returns agent status map
 * Lightweight alternative to full useTopologyWebSocket
 */

import { useState, useEffect, useCallback, useRef } from "react"

const MAS_API_URL = process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

function getWsUrl(): string {
  const base = MAS_API_URL.replace(/^http/, "ws")
  return `${base}/ws/topology`
}

export type AgentStatus = "active" | "busy" | "idle" | "healthy" | "degraded" | "error" | "offline"

export interface UseTopologyWebSocketSimpleResult {
  connected: boolean
  connecting: boolean
  error: string | null
  agentStatus: Record<string, AgentStatus>
  connect: () => void
  disconnect: () => void
}

const RECONNECT_DELAY = 5000
const HEARTBEAT_INTERVAL = 25000

export function useTopologyWebSocketSimple(): UseTopologyWebSocketSimpleResult {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalCloseRef = useRef(false)

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    intentionalCloseRef.current = false
    setConnecting(true)
    setError(null)

    try {
      const ws = new WebSocket(getWsUrl())

      ws.onopen = () => {
        setConnected(true)
        setConnecting(false)
        setError(null)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }))
          }
        }, HEARTBEAT_INTERVAL)
        ws.send(JSON.stringify({ type: "request_snapshot" }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "agent_status" && msg.data) {
            const data = msg.data as { agent_id?: string; agentId?: string; status?: string }
            const id = data.agent_id || data.agentId || msg.source
            const status = (data.status || "idle") as AgentStatus
            if (id) {
              setAgentStatus((prev) => ({ ...prev, [id]: status }))
            }
          }
          if (msg.type === "snapshot" && msg.nodes) {
            const next: Record<string, AgentStatus> = {}
            for (const node of msg.nodes as Array<{ id: string; label?: string; status?: string }>) {
              const id = node.id || node.label
              if (id) next[id] = (node.status || "idle") as AgentStatus
            }
            setAgentStatus(next)
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onerror = () => {
        setError("Connection failed")
      }

      ws.onclose = () => {
        stopHeartbeat()
        setConnected(false)
        setConnecting(false)
        wsRef.current = null
        if (!intentionalCloseRef.current) {
          reconnectRef.current = setTimeout(() => connect(), RECONNECT_DELAY)
        }
      }

      wsRef.current = ws
    } catch {
      setConnecting(false)
      setError("WebSocket unavailable")
    }
  }, [stopHeartbeat])

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    stopHeartbeat()
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect")
      wsRef.current = null
    }
    setConnected(false)
    setConnecting(false)
    setError(null)
  }, [stopHeartbeat])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    connected,
    connecting,
    error,
    agentStatus,
    connect,
    disconnect,
  }
}
