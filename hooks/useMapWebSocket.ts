"use client"

/**
 * useMapWebSocket - React hook for CREP voice commands
 * February 6, 2026
 * 
 * Connects to PersonaPlex Bridge WebSocket to receive voice commands
 * and execute them on the CREP map.
 */

import { useEffect, useCallback, useState, useRef } from "react"
import { 
  MapWebSocketClient, 
  FrontendCommand,
  getMapWebSocketClient,
  disconnectMapWebSocket 
} from "@/lib/voice/map-websocket-client"

export interface MapCommandHandlers {
  // Navigation
  onFlyTo?: (lng: number, lat: number, zoom?: number, duration?: number) => void
  onZoomBy?: (delta: number, duration?: number) => void
  onSetZoom?: (zoom: number, duration?: number) => void
  onPanBy?: (offset: [number, number], duration?: number) => void
  onResetView?: () => void
  
  // Layers
  onShowLayer?: (layer: string) => void
  onHideLayer?: (layer: string) => void
  onToggleLayer?: (layer: string) => void
  
  // Filters
  onApplyFilter?: (filterType: string, filterValue: string) => void
  onClearFilters?: () => void
  
  // Earth2
  onRunForecast?: (model: string, leadTime: number) => void
  onRunNowcast?: () => void
  onLoadModel?: (model: string) => void
  
  // Entities
  onGetEntityDetails?: (entity: string) => void
  onGetViewContext?: () => void
  onGeocodeAndFlyTo?: (query: string, zoom?: number) => void
  
  // System
  onGetSystemStatus?: () => void
  onSetMute?: (muted: boolean) => void
  
  // Generic
  onCommand?: (command: FrontendCommand, speak?: string) => void
  onSpeak?: (text: string) => void
}

export interface UseMapWebSocketOptions extends MapCommandHandlers {
  enabled?: boolean
  autoConnect?: boolean
  url?: string
}

export interface UseMapWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  lastCommand: FrontendCommand | null
  lastSpeak: string | null
  connect: () => void
  disconnect: () => void
  sendCommand: (text: string) => void
}

export function useMapWebSocket(options: UseMapWebSocketOptions = {}): UseMapWebSocketReturn {
  const {
    enabled = true,
    autoConnect = true,
    url,
    onFlyTo,
    onZoomBy,
    onSetZoom,
    onPanBy,
    onResetView,
    onShowLayer,
    onHideLayer,
    onToggleLayer,
    onApplyFilter,
    onClearFilters,
    onRunForecast,
    onRunNowcast,
    onLoadModel,
    onGetEntityDetails,
    onGetViewContext,
    onGeocodeAndFlyTo,
    onGetSystemStatus,
    onSetMute,
    onCommand,
    onSpeak,
  } = options
  
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastCommand, setLastCommand] = useState<FrontendCommand | null>(null)
  const [lastSpeak, setLastSpeak] = useState<string | null>(null)
  
  const clientRef = useRef<MapWebSocketClient | null>(null)
  
  // Execute a frontend command
  const executeCommand = useCallback((command: FrontendCommand, speak?: string) => {
    setLastCommand(command)
    if (speak) {
      setLastSpeak(speak)
      onSpeak?.(speak)
    }
    
    // Call generic handler
    onCommand?.(command, speak)
    
    // Route to specific handlers based on command type
    switch (command.type) {
      case "flyTo":
        if (command.center) {
          onFlyTo?.(command.center[0], command.center[1], command.zoom, command.duration)
        }
        break
      
      case "geocodeAndFlyTo":
        if (command.query) {
          onGeocodeAndFlyTo?.(command.query as string, command.zoom)
        }
        break
      
      case "zoomBy":
        if (command.delta !== undefined) {
          onZoomBy?.(command.delta, command.duration)
        }
        break
      
      case "setZoom":
        if (command.zoom !== undefined) {
          onSetZoom?.(command.zoom, command.duration)
        }
        break
      
      case "panBy":
        if (command.offset) {
          onPanBy?.(command.offset, command.duration)
        }
        break
      
      case "showLayer":
        if (command.layer) {
          onShowLayer?.(command.layer)
        }
        break
      
      case "hideLayer":
        if (command.layer) {
          onHideLayer?.(command.layer)
        }
        break
      
      case "toggleLayer":
        if (command.layer) {
          onToggleLayer?.(command.layer)
        }
        break
      
      case "applyFilter":
        if (command.filterType && command.filterValue) {
          onApplyFilter?.(command.filterType, command.filterValue)
        }
        break
      
      case "clearFilters":
        onClearFilters?.()
        break
      
      case "run_forecast":
        if (command.model && command.lead_time) {
          onRunForecast?.(command.model, command.lead_time)
        }
        break
      
      case "run_nowcast":
        onRunNowcast?.()
        break
      
      case "load_model":
        if (command.model) {
          onLoadModel?.(command.model)
        }
        break
      
      case "getEntityDetails":
        if (command.entity) {
          onGetEntityDetails?.(command.entity)
        }
        break
      
      case "getViewContext":
        onGetViewContext?.()
        break
      
      case "getSystemStatus":
        onGetSystemStatus?.()
        break
      
      case "setMute":
        onSetMute?.(command.muted as boolean)
        break
      
      default:
        // Reset view is a flyTo with specific params
        if (command.type === "flyTo" && command.center?.[0] === 0 && command.center?.[1] === 20 && command.zoom === 2) {
          onResetView?.()
        }
        break
    }
  }, [
    onCommand, onSpeak, onFlyTo, onGeocodeAndFlyTo, onZoomBy, onSetZoom, onPanBy,
    onShowLayer, onHideLayer, onToggleLayer, onApplyFilter, onClearFilters,
    onRunForecast, onRunNowcast, onLoadModel, onGetEntityDetails, onGetViewContext,
    onResetView, onGetSystemStatus, onSetMute
  ])
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || clientRef.current?.isConnected) return
    
    setIsConnecting(true)
    
    const client = getMapWebSocketClient({
      url,
      onConnect: () => {
        setIsConnected(true)
        setIsConnecting(false)
      },
      onDisconnect: () => {
        setIsConnected(false)
        setIsConnecting(false)
      },
      onCommand: executeCommand,
      onError: (error) => {
        console.error("[useMapWebSocket] Error:", error)
        setIsConnecting(false)
      },
    })
    
    clientRef.current = client
    client.connect()
  }, [enabled, url, executeCommand])
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    disconnectMapWebSocket()
    clientRef.current = null
    setIsConnected(false)
    setIsConnecting(false)
  }, [])
  
  // Send a text command
  const sendCommand = useCallback((text: string) => {
    clientRef.current?.sendCommand(text)
  }, [])
  
  // Auto-connect on mount
  useEffect(() => {
    if (enabled && autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [enabled, autoConnect, connect, disconnect])
  
  return {
    isConnected,
    isConnecting,
    lastCommand,
    lastSpeak,
    connect,
    disconnect,
    sendCommand,
  }
}