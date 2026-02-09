"use client"

/**
 * useMapVoiceControl - Voice command processing for CREP map
 * Updated: February 6, 2026 - Added MAS backend support
 */

import { useCallback, useRef } from "react"
import { parseCommand, ParsedCommand } from "@/lib/voice/command-parser"

export interface MapVoiceControlOptions {
  // Map control callbacks
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void
  onZoom?: (direction: "in" | "out") => void
  onSetZoom?: (level: number) => void
  onPan?: (direction: "left" | "right" | "up" | "down") => void
  onRotate?: (direction: "left" | "right") => void
  onResetView?: () => void
  
  // Layer callbacks
  onShowLayer?: (layer: string) => void
  onHideLayer?: (layer: string) => void
  onToggleLayer?: (layer: string) => void
  onShowAllLayers?: () => void
  onHideAllLayers?: () => void
  
  // Filter callbacks
  onSetFilter?: (filter: string, value?: string) => void
  onClearFilters?: () => void
  
  // Device callbacks
  onLocateDevice?: (device: string) => void
  onSearchDevices?: (query: string) => void
  
  // Generic callbacks
  onCommand?: (command: ParsedCommand) => void
  onUnknownCommand?: (text: string) => void
  onSpeak?: (text: string) => void
  
  // MAS Backend options (new in Feb 6 update)
  useMASBackend?: boolean
  
  // Geocoding
  geocodeLocation?: (query: string) => Promise<{ lng: number; lat: number } | null>
}

export interface UseMapVoiceControlReturn {
  processVoiceCommand: (text: string) => Promise<void>
  isProcessing: boolean
}

async function callMASVoiceCommand(text: string): Promise<{
  success: boolean
  domain: string
  action?: string
  speak?: string
  frontend_command?: Record<string, unknown>
  needs_llm_response?: boolean
} | null> {
  try {
    const response = await fetch("/api/voice/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("[MapVoiceControl] MAS backend error:", error)
    return null
  }
}

export function useMapVoiceControl(options: MapVoiceControlOptions = {}): UseMapVoiceControlReturn {
  const {
    onFlyTo,
    onZoom,
    onSetZoom,
    onPan,
    onRotate,
    onResetView,
    onShowLayer,
    onHideLayer,
    onToggleLayer,
    onShowAllLayers,
    onHideAllLayers,
    onSetFilter,
    onClearFilters,
    onLocateDevice,
    onSearchDevices,
    onCommand,
    onUnknownCommand,
    onSpeak,
    useMASBackend = false,
    geocodeLocation,
  } = options
  
  const isProcessingRef = useRef(false)
  
  const processVoiceCommand = useCallback(async (text: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    
    try {
      // Try MAS backend first if enabled
      if (useMASBackend) {
        const masResult = await callMASVoiceCommand(text)
        
        if (masResult?.success && masResult.frontend_command) {
          // Handle MAS response
          if (masResult.speak) {
            onSpeak?.(masResult.speak)
          }
          
          const cmd = masResult.frontend_command
          
          // Execute frontend command
          switch (cmd.type) {
            case "flyTo":
              if (cmd.center && Array.isArray(cmd.center)) {
                onFlyTo?.(cmd.center[0] as number, cmd.center[1] as number, cmd.zoom as number)
              }
              break
            case "geocodeAndFlyTo":
              if (cmd.query && geocodeLocation) {
                const coords = await geocodeLocation(cmd.query as string)
                if (coords) onFlyTo?.(coords.lng, coords.lat, cmd.zoom as number)
              }
              break
            case "zoomBy":
              onZoom?.(cmd.delta && (cmd.delta as number) > 0 ? "in" : "out")
              break
            case "setZoom":
              onSetZoom?.(cmd.zoom as number)
              break
            case "panBy":
              // Map offset to direction
              if (cmd.offset && Array.isArray(cmd.offset)) {
                const [x, y] = cmd.offset as number[]
                if (x < 0) onPan?.("left")
                else if (x > 0) onPan?.("right")
                else if (y < 0) onPan?.("up")
                else if (y > 0) onPan?.("down")
              }
              break
            case "showLayer":
              onShowLayer?.(cmd.layer as string)
              break
            case "hideLayer":
              onHideLayer?.(cmd.layer as string)
              break
            case "toggleLayer":
              onToggleLayer?.(cmd.layer as string)
              break
            case "clearFilters":
              onClearFilters?.()
              break
            case "applyFilter":
              onSetFilter?.(cmd.filterType as string, cmd.filterValue as string)
              break
            default:
              // Check for reset view pattern
              if (cmd.type === "flyTo" && cmd.center?.[0] === 0 && cmd.center?.[1] === 20) {
                onResetView?.()
              }
          }
          
          return
        }
        
        // If MAS didn't handle it, fall through to local parsing
        if (masResult?.needs_llm_response) {
          console.log("[MapVoiceControl] Command needs LLM response:", text)
        }
      }
      
      // Fall back to local command parsing
      const command = parseCommand(text)
      
      onCommand?.(command)
      
      switch (command.type) {
        case "navigation":
          await handleNavigationCommand(command)
          break
        case "layer":
          handleLayerCommand(command)
          break
        case "filter":
          handleFilterCommand(command)
          break
        case "device":
          await handleDeviceCommand(command)
          break
        default:
          onUnknownCommand?.(text)
      }
    } finally {
      isProcessingRef.current = false
    }
  }, [
    useMASBackend, onCommand, onUnknownCommand, onSpeak, onFlyTo, onZoom, onSetZoom, 
    onPan, onShowLayer, onHideLayer, onToggleLayer, onClearFilters, onSetFilter,
    onResetView, geocodeLocation
  ])
  
  const handleNavigationCommand = async (command: ParsedCommand) => {
    const { action, params } = command
    
    switch (action) {
      case "flyTo":
      case "centerOn":
        if (params.lng && params.lat) {
          onFlyTo?.(params.lng as number, params.lat as number)
        } else if (params.locationQuery && geocodeLocation) {
          const coords = await geocodeLocation(params.locationQuery as string)
          if (coords) {
            onFlyTo?.(coords.lng, coords.lat)
          }
        }
        break
      case "zoom":
        onZoom?.(params.direction as "in" | "out")
        break
      case "setZoom":
        onSetZoom?.(params.level as number)
        break
      case "pan":
        onPan?.(params.direction as "left" | "right" | "up" | "down")
        break
      case "rotate":
        onRotate?.(params.direction as "left" | "right")
        break
      case "resetView":
        onResetView?.()
        break
    }
  }
  
  const handleLayerCommand = (command: ParsedCommand) => {
    const { action, params } = command
    const layer = params.layer as string
    
    switch (action) {
      case "showLayer":
        onShowLayer?.(layer)
        break
      case "hideLayer":
        onHideLayer?.(layer)
        break
      case "toggleLayer":
        onToggleLayer?.(layer)
        break
      case "showAllLayers":
        onShowAllLayers?.()
        break
      case "hideAllLayers":
        onHideAllLayers?.()
        break
    }
  }
  
  const handleFilterCommand = (command: ParsedCommand) => {
    const { action, params } = command
    
    switch (action) {
      case "setFilter":
      case "filterOnly":
      case "filterAltitude":
      case "filterSpeed":
        onSetFilter?.(params.filter as string, params.value as string)
        break
      case "clearFilters":
        onClearFilters?.()
        break
    }
  }
  
  const handleDeviceCommand = async (command: ParsedCommand) => {
    const { action, params } = command
    
    switch (action) {
      case "locateDevice":
      case "showDevice":
      case "deviceStatus":
      case "checkDeviceOnline":
      case "pingDevice":
        onLocateDevice?.(params.device as string)
        break
      case "searchDevices":
        onSearchDevices?.(params.query as string)
        break
    }
  }
  
  return {
    processVoiceCommand,
    isProcessing: isProcessingRef.current,
  }
}