'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export type WSEventType = 
  | 'simulation.progress'
  | 'experiment.step'
  | 'fci.signal'
  | 'device.status'
  | 'telemetry.update'
  | 'mycelium.state'
  | 'safety.alert'
  | 'hypothesis.update'
  | 'mycobrain.result'

export interface WSEvent<T = unknown> {
  type: WSEventType
  payload: T
  timestamp: number
  sessionId?: string
}

export interface WSOptions {
  url?: string
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnects?: number
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export function useWebSocket(options: WSOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://192.168.0.188:8001/ws',
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnects = 10,
    onOpen,
    onClose,
    onError,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const listenersRef = useRef<Map<WSEventType, Set<(data: unknown) => void>>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSEvent | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectCountRef.current = 0
        onOpen?.()
      }

      ws.onclose = () => {
        setIsConnected(false)
        onClose?.()
        
        if (reconnect && reconnectCountRef.current < maxReconnects) {
          reconnectCountRef.current++
          setTimeout(connect, reconnectInterval)
        }
      }

      ws.onerror = (error) => {
        onError?.(error)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent
          setLastMessage(data)
          
          const listeners = listenersRef.current.get(data.type)
          if (listeners) {
            listeners.forEach(listener => listener(data.payload))
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }
    } catch (e) {
      console.error('Failed to connect WebSocket:', e)
    }
  }, [url, reconnect, reconnectInterval, maxReconnects, onOpen, onClose, onError])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const send = useCallback((type: WSEventType, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    }
  }, [])

  const subscribe = useCallback(<T>(type: WSEventType, callback: (data: T) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(callback as (data: unknown) => void)
    
    // Send subscription message to server
    send('subscribe' as WSEventType, { eventType: type })

    return () => {
      listenersRef.current.get(type)?.delete(callback as (data: unknown) => void)
    }
  }, [send])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    connect,
    disconnect,
  }
}
