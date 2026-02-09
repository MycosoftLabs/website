"use client"

/**
 * Voice Map Controls for CREP
 * Updated: Feb 6, 2026 - WebSocket integration for real-time voice commands
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, MapPin, Layers, Filter, Navigation, Volume2, Wifi, WifiOff, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import { useMapVoiceControl } from "@/hooks/useMapVoiceControl"
import { useMapWebSocket, MapCommandHandlers } from "@/hooks/useMapWebSocket"

interface VoiceMapControlsProps extends MapCommandHandlers {
  className?: string
  collapsed?: boolean
  enableWebSocket?: boolean
  useMASBackend?: boolean
}

interface CommandLog {
  text: string
  type: string
  action: string
  timestamp: Date
  success: boolean
  source: "voice" | "websocket" | "typed"
}

export function VoiceMapControls({
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
  className,
  collapsed = false,
  enableWebSocket = true,
  useMASBackend = true,
}: VoiceMapControlsProps) {
  const [commandLog, setCommandLog] = useState<CommandLog[]>([])
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  const [typedCommand, setTypedCommand] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  
  // PersonaPlex context (from app-level provider)
  const personaplex = usePersonaPlexContext()
  const { 
    isListening, 
    lastTranscript, 
    startListening, 
    stopListening, 
    isConnected: voiceConnected, 
    connectionState, 
    isSpeaking 
  } = personaplex || {
    isListening: false,
    lastTranscript: "",
    startListening: () => {},
    stopListening: () => {},
    isConnected: false,
    connectionState: "disconnected",
    isSpeaking: false,
  }
  
  // Adapter functions to convert old API to new MapCommandHandlers format
  const handleZoom = useCallback((direction: "in" | "out") => {
    const delta = direction === "in" ? 2 : -2
    onZoomBy?.(delta, 500)
  }, [onZoomBy])
  
  const handlePan = useCallback((direction: "left" | "right" | "up" | "down") => {
    const offsets: Record<string, [number, number]> = {
      left: [-200, 0],
      right: [200, 0],
      up: [0, -200],
      down: [0, 200],
    }
    onPanBy?.(offsets[direction] || [0, 0], 300)
  }, [onPanBy])
  
  // Handle spoken text from MYCA
  const handleSpeak = useCallback((text: string) => {
    onSpeak?.(text)
  }, [onSpeak])
  
  // WebSocket for receiving voice commands from PersonaPlex Bridge
  const { 
    isConnected: wsConnected, 
    isConnecting: wsConnecting,
    lastCommand: wsLastCommand,
    lastSpeak,
    sendCommand: wsSendCommand,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useMapWebSocket({
    enabled: enableWebSocket,
    autoConnect: enableWebSocket,
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
    onCommand: (command, speak) => {
      // Log WebSocket commands
      const log: CommandLog = {
        text: command.type,
        type: command.type,
        action: command.type,
        timestamp: new Date(),
        success: true,
        source: "websocket",
      }
      setCommandLog(prev => [log, ...prev].slice(0, 10))
      setLastCommand(`WS: ${command.type}`)
      onCommand?.(command, speak)
    },
    onSpeak: handleSpeak,
  })
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])
  
  // Map voice control hook (for local/MAS command processing)
  const mapVoice = useMapVoiceControl({
    useMASBackend,
    onFlyTo: (lng, lat, zoom) => onFlyTo?.(lng, lat, zoom),
    onZoom: handleZoom,
    onSetZoom: (level) => onSetZoom?.(level),
    onPan: handlePan,
    onResetView,
    onShowLayer,
    onHideLayer,
    onToggleLayer,
    onSetFilter: (filter, value) => onApplyFilter?.(filter, value || ""),
    onClearFilters,
    onSpeak: handleSpeak,
    onCommand: (cmd) => {
      const log: CommandLog = {
        text: cmd.rawText,
        type: cmd.type,
        action: cmd.action,
        timestamp: new Date(),
        success: cmd.type !== "unknown",
        source: "voice",
      }
      setCommandLog(prev => [log, ...prev].slice(0, 10))
      setLastCommand(cmd.rawText)
    },
    onUnknownCommand: (text) => {
      setCommandLog(prev => [{
        text,
        type: "unknown",
        action: "unknown",
        timestamp: new Date(),
        success: false,
        source: "voice",
      }, ...prev].slice(0, 10))
    },
    geocodeLocation: onGeocodeAndFlyTo ? async (query) => {
      // Trigger geocode - the actual result will come through WebSocket
      onGeocodeAndFlyTo(query)
      return null
    } : undefined,
  })
  
  // Process PersonaPlex voice transcript
  useEffect(() => {
    if (lastTranscript) {
      mapVoice.processVoiceCommand(lastTranscript)
      setLastCommand(lastTranscript)
    }
  }, [lastTranscript, mapVoice])
  
  // Handle typed command submission
  const handleTypedSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!typedCommand.trim()) return
    
    // If WebSocket is connected, send through it
    if (wsConnected) {
      wsSendCommand(typedCommand)
    }
    
    // Also process locally
    mapVoice.processVoiceCommand(typedCommand)
    
    setCommandLog(prev => [{
      text: typedCommand,
      type: "typed",
      action: "typed",
      timestamp: new Date(),
      success: true,
      source: "typed",
    }, ...prev].slice(0, 10))
    
    setTypedCommand("")
  }, [typedCommand, wsConnected, wsSendCommand, mapVoice])
  
  // Log WebSocket command when received
  useEffect(() => {
    if (wsLastCommand) {
      console.log("[VoiceMapControls] WebSocket command:", wsLastCommand.type)
    }
  }, [wsLastCommand])
  
  if (collapsed) {
    return (
      <div className={cn(
        "absolute top-4 right-4 z-10 flex items-center gap-2",
        className
      )}>
        {enableWebSocket && (
          <Badge variant={wsConnected ? "default" : "secondary"} className="h-6">
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          </Badge>
        )}
        <Button
          size="icon"
          variant={isListening ? "destructive" : "secondary"}
          onClick={toggleListening}
          disabled={!voiceConnected && connectionState !== "connecting"}
          className="h-10 w-10 rounded-full shadow-lg"
        >
          {isListening ? (
            <Mic className="h-5 w-5 animate-pulse" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>
      </div>
    )
  }
  
  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Voice Map Control
          </CardTitle>
          <div className="flex items-center gap-1">
            {enableWebSocket && (
              <Badge 
                variant={wsConnected ? "default" : "secondary"} 
                className="text-xs cursor-pointer"
                onClick={() => wsConnected ? wsDisconnect() : wsConnect()}
              >
                {wsConnecting ? "..." : wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              </Badge>
            )}
            <Badge variant={voiceConnected ? "default" : "secondary"} className="text-xs">
              {isListening ? "Listening" : voiceConnected ? "Ready" : "Offline"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Main control button */}
        <Button
          className="w-full gap-2"
          variant={isListening ? "destructive" : "default"}
          onClick={toggleListening}
          disabled={!voiceConnected && connectionState !== "connecting"}
        >
          {isListening ? (
            <>
              <Mic className="h-4 w-4 animate-pulse" />
              Listening (PersonaPlex)
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="h-4 w-4 animate-pulse" />
              Speaking...
            </>
          ) : connectionState === "connecting" ? (
            <>
              <Mic className="h-4 w-4 animate-pulse" />
              Connecting...
            </>
          ) : !voiceConnected ? (
            <>
              <MicOff className="h-4 w-4" />
              Voice Offline
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Voice Control
            </>
          )}
        </Button>
        
        {/* Typed command input */}
        <form onSubmit={handleTypedSubmit} className="flex gap-1">
          <Input
            ref={inputRef}
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="Type a command..."
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" variant="outline" className="h-8 w-8">
            <Send className="h-3 w-3" />
          </Button>
        </form>
        
        {/* Connection status */}
        {!voiceConnected && connectionState !== "connecting" && (
          <div className="p-2 bg-yellow-500/10 rounded text-xs text-yellow-500">
            PersonaPlex not connected. Voice requires PersonaPlex Bridge (8999).
          </div>
        )}
        
        {enableWebSocket && wsConnected && (
          <div className="p-2 bg-green-500/10 rounded text-xs text-green-500">
            WebSocket connected - receiving voice commands
          </div>
        )}
        
        {/* Last spoken response */}
        {lastSpeak && (
          <div className="p-2 bg-blue-500/10 rounded text-sm">
            <span className="font-medium text-blue-500">MYCA: </span>
            {lastSpeak}
          </div>
        )}
        
        {/* Last command */}
        {lastCommand && (
          <div className="p-2 bg-primary/10 rounded text-sm">
            <span className="font-medium">Last: </span>
            {lastCommand}
          </div>
        )}
        
        {/* Quick command buttons */}
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => handleZoom("in")}
          >
            <MapPin className="h-3 w-3" />
            Zoom In
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => handleZoom("out")}
          >
            <MapPin className="h-3 w-3" />
            Zoom Out
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={onResetView}
          >
            <Navigation className="h-3 w-3" />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={onClearFilters}
          >
            <Filter className="h-3 w-3" />
            Clear
          </Button>
        </div>
        
        {/* Command log */}
        {commandLog.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground">Recent Commands</div>
            {commandLog.slice(0, 5).map((log, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs px-2 py-1 rounded flex items-center justify-between",
                  log.success ? "bg-green-500/10" : "bg-red-500/10"
                )}
              >
                <span className="truncate flex items-center gap-1">
                  {log.source === "websocket" && <Wifi className="h-2 w-2" />}
                  {log.source === "voice" && <Mic className="h-2 w-2" />}
                  {log.text}
                </span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {log.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        {/* Help text */}
        <div className="text-[10px] text-muted-foreground">
          Try: "Go to Tokyo" | "Show satellites" | "Zoom level 5"
        </div>
      </CardContent>
    </Card>
  )
}