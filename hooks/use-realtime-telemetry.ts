/**
 * React Hook for Real-time MycoBrain Telemetry
 * 
 * Subscribes to Supabase Realtime for telemetry updates
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface TelemetryData {
  id: string
  device_id: string
  timestamp: string
  temperature?: number
  humidity?: number
  pressure?: number
  gas_resistance?: number
  air_quality?: number
  metadata?: Record<string, any>
}

export function useRealtimeTelemetry(deviceId?: string) {
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setError(new Error('Supabase client not available'))
      return
    }

    // Subscribe to telemetry table changes
    const channel: RealtimeChannel = supabase
      .channel('telemetry-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'telemetry',
          filter: deviceId ? `device_id=eq.${deviceId}` : undefined,
        },
        (payload) => {
          console.log('Telemetry update:', payload)
          
          if (payload.eventType === 'INSERT') {
            setTelemetry((prev) => [payload.new as TelemetryData, ...prev].slice(0, 100)) // Keep last 100
          } else if (payload.eventType === 'UPDATE') {
            setTelemetry((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as TelemetryData) : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTelemetry((prev) => prev.filter((item) => item.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to subscribe to telemetry channel'))
        }
      })

    // Load initial data
    const loadInitialData = async () => {
      try {
        const query = supabase
          .from('telemetry')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100)
        
        if (deviceId) {
          query.eq('device_id', deviceId)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        if (data) setTelemetry(data as TelemetryData[])
      } catch (err) {
        setError(err as Error)
      }
    }

    loadInitialData()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [deviceId])

  return { telemetry, isConnected, error }
}

/**
 * Hook for device presence tracking
 */
export function useDevicePresence(deviceId: string) {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase.channel(`device-presence-${deviceId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const deviceState = state[deviceId]
        if (deviceState && deviceState.length > 0) {
          setIsOnline(true)
          setLastSeen(new Date())
        } else {
          setIsOnline(false)
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === deviceId) {
          setIsOnline(true)
          setLastSeen(new Date())
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key === deviceId) {
          setIsOnline(false)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            device_id: deviceId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [deviceId])

  return { isOnline, lastSeen }
}
