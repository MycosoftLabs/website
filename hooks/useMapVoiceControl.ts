"use client"

import { useCallback, useEffect, useRef } from "react"
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
  
  // Geocoding
  geocodeLocation?: (query: string) => Promise<{ lng: number; lat: number } | null>
}

export interface UseMapVoiceControlReturn {
  processVoiceCommand: (text: string) => Promise<void>
  isProcessing: boolean
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
    geocodeLocation,
  } = options
  
  const isProcessingRef = useRef(false)
  
  const processVoiceCommand = useCallback(async (text: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    
    try {
      const command = parseCommand(text)
      
      // Notify about the parsed command
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
  }, [onCommand, onUnknownCommand])
  
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
