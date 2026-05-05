"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { MeshtasticStreamPacket } from "@/lib/meshtastic/types"

export interface UseMeshtasticStreamOptions {
  /** When false, disconnects and clears last packet. */
  enabled?: boolean
  /** Same-origin SSE URL (default `/api/meshtastic/stream`). */
  url?: string
  onPacket?: (packet: MeshtasticStreamPacket) => void
  /** When > 0, keeps a rolling window of recent packets (newest last) for live UI / perf counts. */
  ringBufferSize?: number
}

export function useMeshtasticStream(options: UseMeshtasticStreamOptions = {}) {
  const { enabled = true, url = "/api/meshtastic/stream", onPacket, ringBufferSize = 0 } = options
  const [connected, setConnected] = useState(false)
  const [lastPacket, setLastPacket] = useState<MeshtasticStreamPacket | null>(null)
  const [recentPackets, setRecentPackets] = useState<MeshtasticStreamPacket[]>([])
  const [error, setError] = useState<string | null>(null)
  const onPacketRef = useRef(onPacket)
  onPacketRef.current = onPacket
  const ringSize = Math.max(0, Math.min(500, ringBufferSize))

  const disconnect = useCallback(() => {
    setConnected(false)
  }, [])

  const clearRecentPackets = useCallback(() => {
    setRecentPackets([])
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setConnected(false)
      if (ringSize > 0) setRecentPackets([])
      return
    }
    setError(null)
    if (ringSize > 0) setRecentPackets([])
    const es = new EventSource(url)
    const onPacketEv = (ev: MessageEvent) => {
      try {
        const raw = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data
        const pkt = raw as MeshtasticStreamPacket
        setLastPacket(pkt)
        if (ringSize > 0) {
          setRecentPackets((prev) => {
            const next = [...prev, pkt]
            return next.length > ringSize ? next.slice(-ringSize) : next
          })
        }
        onPacketRef.current?.(pkt)
      } catch {
        setError("parse_error")
      }
    }
    es.onopen = () => setConnected(true)
    es.onerror = () => {
      setConnected(false)
      setError("event_source_error")
    }
    es.addEventListener("packet", onPacketEv as EventListener)
    return () => {
      es.onopen = null
      es.onerror = null
      es.removeEventListener("packet", onPacketEv as EventListener)
      es.close()
      setConnected(false)
    }
  }, [enabled, url, ringSize])

  return { connected, lastPacket, recentPackets, error, disconnect, clearRecentPackets }
}
