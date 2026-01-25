/**
 * React Hooks for Mycorrhizae Protocol
 *
 * Provides React hooks for channel subscriptions, live data, and API key management.
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  getMycorrhizaeClient,
  MycorrhizaeClient,
  MycorrhizaeMessage,
  ChannelInfo,
  APIKeyInfo,
  ValidateKeyResponse,
} from "./client"

// ==================== useChannel Hook ====================

export interface UseChannelOptions {
  autoConnect?: boolean
  maxMessages?: number
}

export interface UseChannelResult {
  messages: MycorrhizaeMessage[]
  connected: boolean
  error?: Error
  subscribe: () => void
  unsubscribe: () => void
  clear: () => void
}

/**
 * Hook to subscribe to a Mycorrhizae channel.
 */
export function useChannel(
  channelPattern: string,
  options: UseChannelOptions = {}
): UseChannelResult {
  const { autoConnect = true, maxMessages = 100 } = options
  
  const [messages, setMessages] = useState<MycorrhizaeMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | undefined>()
  
  const clientRef = useRef<MycorrhizaeClient | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  
  const subscribe = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = getMycorrhizaeClient()
    }
    
    const client = clientRef.current
    
    // Subscribe to connection changes
    const unsub1 = client.onConnection((isConnected) => {
      setConnected(isConnected)
    })
    
    // Subscribe to errors
    const unsub2 = client.onError((err) => {
      setError(err)
    })
    
    // Subscribe to messages
    const unsub3 = client.subscribe(channelPattern, (message) => {
      setMessages((prev) => {
        const updated = [message, ...prev]
        return updated.slice(0, maxMessages)
      })
    })
    
    // Connect if not already
    if (!client.isConnected()) {
      client.connect(channelPattern).catch(setError)
    }
    
    unsubscribeRef.current = () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [channelPattern, maxMessages])
  
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])
  
  const clear = useCallback(() => {
    setMessages([])
  }, [])
  
  useEffect(() => {
    if (autoConnect) {
      subscribe()
    }
    
    return () => {
      unsubscribe()
    }
  }, [autoConnect, subscribe, unsubscribe])
  
  return {
    messages,
    connected,
    error,
    subscribe,
    unsubscribe,
    clear,
  }
}

// ==================== useLiveData Hook ====================

export interface UseLiveDataOptions {
  channelPattern: string
  transformData?: (message: MycorrhizaeMessage) => unknown
}

export interface UseLiveDataResult<T> {
  data: T | null
  history: T[]
  connected: boolean
  loading: boolean
  error?: Error
}

/**
 * Hook for consuming live data from a channel with transformation.
 */
export function useLiveData<T = unknown>(
  options: UseLiveDataOptions
): UseLiveDataResult<T> {
  const { channelPattern, transformData = (m) => m.payload as unknown as T } = options
  
  const [data, setData] = useState<T | null>(null)
  const [history, setHistory] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  
  const { messages, connected, error } = useChannel(channelPattern, {
    autoConnect: true,
    maxMessages: 50,
  })
  
  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[0]
      const transformed = transformData(latest) as T
      setData(transformed)
      setHistory((prev) => [transformed, ...prev].slice(0, 50))
      setLoading(false)
    }
  }, [messages, transformData])
  
  return {
    data,
    history,
    connected,
    loading,
    error,
  }
}

// ==================== useApiKey Hook ====================

export interface UseApiKeyResult {
  keyInfo: APIKeyInfo | null
  validation: ValidateKeyResponse | null
  loading: boolean
  error?: Error
  validate: (key: string, scopes?: string[]) => Promise<ValidateKeyResponse>
  refresh: () => Promise<void>
}

/**
 * Hook for API key validation and management.
 */
export function useApiKey(keyId?: string): UseApiKeyResult {
  const [keyInfo, setKeyInfo] = useState<APIKeyInfo | null>(null)
  const [validation, setValidation] = useState<ValidateKeyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>()
  
  const clientRef = useRef<MycorrhizaeClient | null>(null)
  
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = getMycorrhizaeClient()
    }
    return clientRef.current
  }, [])
  
  const validate = useCallback(
    async (key: string, scopes?: string[]): Promise<ValidateKeyResponse> => {
      setLoading(true)
      setError(undefined)
      
      try {
        const client = getClient()
        const result = await client.validateKey(key, scopes)
        setValidation(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Validation failed")
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [getClient]
  )
  
  const refresh = useCallback(async () => {
    if (!keyId) return
    
    setLoading(true)
    setError(undefined)
    
    try {
      // This would require admin key to fetch key details
      // For now, just clear state
      setKeyInfo(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Refresh failed")
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [keyId])
  
  return {
    keyInfo,
    validation,
    loading,
    error,
    validate,
    refresh,
  }
}

// ==================== useChannels Hook ====================

export interface UseChannelsResult {
  channels: ChannelInfo[]
  loading: boolean
  error?: Error
  refresh: () => Promise<void>
}

/**
 * Hook to list and manage channels.
 */
export function useChannels(type?: string, prefix?: string): UseChannelsResult {
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>()
  
  const clientRef = useRef<MycorrhizaeClient | null>(null)
  
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = getMycorrhizaeClient()
    }
    return clientRef.current
  }, [])
  
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    
    try {
      const client = getClient()
      const result = await client.listChannels(type, prefix)
      setChannels(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch channels")
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [getClient, type, prefix])
  
  useEffect(() => {
    refresh()
  }, [refresh])
  
  return {
    channels,
    loading,
    error,
    refresh,
  }
}

// ==================== useProtocolStats Hook ====================

export interface ProtocolStats {
  version: string
  started: boolean
  channel_count: number
  subscriber_count: number
  total_messages: number
}

export interface UseProtocolStatsResult {
  stats: ProtocolStats | null
  loading: boolean
  error?: Error
  refresh: () => Promise<void>
}

/**
 * Hook to get Mycorrhizae Protocol statistics.
 */
export function useProtocolStats(): UseProtocolStatsResult {
  const [stats, setStats] = useState<ProtocolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>()
  
  const clientRef = useRef<MycorrhizaeClient | null>(null)
  
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = getMycorrhizaeClient()
    }
    return clientRef.current
  }, [])
  
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    
    try {
      const client = getClient()
      const result = await client.getStats()
      setStats(result as ProtocolStats)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch stats")
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [getClient])
  
  useEffect(() => {
    refresh()
    
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])
  
  return {
    stats,
    loading,
    error,
    refresh,
  }
}
