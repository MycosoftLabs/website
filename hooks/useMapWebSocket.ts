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
  
  // Timeline
  onSetTimeCursor?: (time: string) => void
  onTimelineSearch?: (query: string) => void
  
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
    onSetTimeCursor,
    onTimelineSearch,
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
  const voiceBridgeErrorLoggedRef = useRef(false)
  
  // Build handlers object for executeCrepCommand
  const handlers: MapCommandHandlers = {
    onCommand, onSpeak, onFlyTo, onGeocodeAndFlyTo, onZoomBy, onSetZoom, onPanBy,
    onShowLayer, onHideLayer, onToggleLayer, onApplyFilter, onClearFilters,
    onRunForecast, onRunNowcast, onLoadModel, onGetEntityDetails, onGetViewContext,
    onSetTimeCursor, onTimelineSearch, onResetView, onGetSystemStatus, onSetMute,
  }

  // Execute a frontend command (delegates to shared executeCrepCommand)
  const executeCommand = useCallback((command: FrontendCommand, speak?: string) => {
    setLastCommand(command)
    if (speak) {
      setLastSpeak(speak)
      onSpeak?.(speak)
    }
    const cmdWithSpeak = { ...command, speak } as FrontendCommand & { speak?: string }
    executeCrepCommand(cmdWithSpeak, handlers, { onSpeak })
  }, [
    onCommand, onSpeak, onFlyTo, onGeocodeAndFlyTo, onZoomBy, onSetZoom, onPanBy,
    onShowLayer, onHideLayer, onToggleLayer, onApplyFilter, onClearFilters,
    onRunForecast, onRunNowcast, onLoadModel, onGetEntityDetails, onGetViewContext,
    onSetTimeCursor, onTimelineSearch, onResetView, onGetSystemStatus, onSetMute
  ])
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || clientRef.current?.isConnected) return
    
    setIsConnecting(true)
    
    const client = getMapWebSocketClient({
      url,
      onConnect: () => {
        voiceBridgeErrorLoggedRef.current = false
        setIsConnected(true)
        setIsConnecting(false)
      },
      onDisconnect: () => {
        setIsConnected(false)
        setIsConnecting(false)
      },
      onCommand: executeCommand,
      onError: (error) => {
        if (!voiceBridgeErrorLoggedRef.current) {
          voiceBridgeErrorLoggedRef.current = true
          console.warn(
            "[useMapWebSocket] Voice bridge unavailable (map works without voice):",
            error.message
          )
        }
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

/**
 * Execute a CREP frontend command using provided handlers.
 * Used by both useMapWebSocket and myca-crep-action event listener.
 * Mar 13, 2026 - CREP + MYCA Autonomy Plan
 */
export function executeCrepCommand(
  command: FrontendCommand,
  handlers: MapCommandHandlers,
  options?: { onSpeak?: (text: string) => void }
): void {
  const speak = (options?.onSpeak as ((t: string) => void) | undefined);
  if ((command as { speak?: string }).speak && speak) {
    speak((command as { speak: string }).speak);
  }
  handlers.onCommand?.(command, (command as { speak?: string }).speak);
  switch (command.type) {
    case "flyTo":
      if (command.center) {
        handlers.onFlyTo?.(command.center[0], command.center[1], command.zoom, command.duration);
      }
      break;
    case "geocodeAndFlyTo":
      if (command.query) {
        handlers.onGeocodeAndFlyTo?.(command.query as string, command.zoom);
      }
      break;
    case "zoomBy":
      if (command.delta !== undefined) {
        handlers.onZoomBy?.(command.delta, command.duration);
      }
      break;
    case "setZoom":
      if (command.zoom !== undefined) {
        handlers.onSetZoom?.(command.zoom, command.duration);
      }
      break;
    case "panBy":
      if (command.offset) {
        handlers.onPanBy?.(command.offset, command.duration);
      }
      break;
    case "showLayer":
      if (command.layer) handlers.onShowLayer?.(command.layer);
      break;
    case "hideLayer":
      if (command.layer) handlers.onHideLayer?.(command.layer);
      break;
    case "toggleLayer":
      if (command.layer) handlers.onToggleLayer?.(command.layer);
      break;
    case "applyFilter":
      if (command.filterType && command.filterValue !== undefined) {
        handlers.onApplyFilter?.(command.filterType, String(command.filterValue));
      }
      break;
    case "clearFilters":
      handlers.onClearFilters?.();
      break;
    case "run_forecast":
      if (command.model && command.lead_time) {
        handlers.onRunForecast?.(command.model, command.lead_time);
      }
      break;
    case "run_nowcast":
      handlers.onRunNowcast?.();
      break;
    case "load_model":
      if (command.model) handlers.onLoadModel?.(command.model);
      break;
    case "getEntityDetails":
      if (command.entity) handlers.onGetEntityDetails?.(command.entity);
      break;
    case "getViewContext":
      handlers.onGetViewContext?.();
      break;
    case "setTimeCursor":
      if (command.time) handlers.onSetTimeCursor?.(command.time as string);
      break;
    case "timelineSearch":
      if (command.query) handlers.onTimelineSearch?.(command.query as string);
      break;
    case "getSystemStatus":
      handlers.onGetSystemStatus?.();
      break;
    case "setMute":
      handlers.onSetMute?.(command.muted as boolean);
      break;
    case "resetView":
      handlers.onResetView?.();
      break;
    default:
      break;
  }
}