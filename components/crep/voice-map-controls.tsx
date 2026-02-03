"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, MapPin, Layers, Filter, Navigation, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoiceChat } from "@/hooks/useVoiceChat"
import { useMapVoiceControl } from "@/hooks/useMapVoiceControl"
import { parseCommand } from "@/lib/voice/command-parser"

interface VoiceMapControlsProps {
  // Map control callbacks
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void
  onZoom?: (direction: "in" | "out") => void
  onSetZoom?: (level: number) => void
  onPan?: (direction: "left" | "right" | "up" | "down") => void
  onResetView?: () => void
  
  // Layer callbacks
  onShowLayer?: (layer: string) => void
  onHideLayer?: (layer: string) => void
  onToggleLayer?: (layer: string) => void
  
  // Filter callbacks
  onSetFilter?: (filter: string, value?: string) => void
  onClearFilters?: () => void
  
  // Device callbacks
  onLocateDevice?: (device: string) => void
  onSearchDevices?: (query: string) => void
  
  className?: string
  collapsed?: boolean
}

interface CommandLog {
  text: string
  type: string
  action: string
  timestamp: Date
  success: boolean
}

export function VoiceMapControls({
  onFlyTo,
  onZoom,
  onSetZoom,
  onPan,
  onResetView,
  onShowLayer,
  onHideLayer,
  onToggleLayer,
  onSetFilter,
  onClearFilters,
  onLocateDevice,
  onSearchDevices,
  className,
  collapsed = false,
}: VoiceMapControlsProps) {
  const [commandLog, setCommandLog] = useState<CommandLog[]>([])
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  
  // Voice chat hook
  const voice = useVoiceChat({
    mode: "web-speech",
    handlers: {
      "reset view": () => onResetView?.(),
      "clear filters": () => onClearFilters?.(),
      "zoom in": () => onZoom?.("in"),
      "zoom out": () => onZoom?.("out"),
    },
  })
  
  // Map voice control hook
  const mapVoice = useMapVoiceControl({
    onFlyTo,
    onZoom,
    onSetZoom,
    onPan,
    onResetView,
    onShowLayer,
    onHideLayer,
    onToggleLayer,
    onSetFilter,
    onClearFilters,
    onLocateDevice,
    onSearchDevices,
    onCommand: (cmd) => {
      const log: CommandLog = {
        text: cmd.rawText,
        type: cmd.type,
        action: cmd.action,
        timestamp: new Date(),
        success: cmd.type !== "unknown",
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
      }, ...prev].slice(0, 10))
    },
  })
  
  // Process voice transcript
  useEffect(() => {
    if (voice.transcript) {
      mapVoice.processVoiceCommand(voice.transcript)
      voice.clearTranscript()
    }
  }, [voice.transcript])
  
  if (collapsed) {
    return (
      <div className={cn(
        "absolute top-4 right-4 z-10",
        className
      )}>
        <Button
          size="icon"
          variant={voice.isListening ? "destructive" : "secondary"}
          onClick={voice.toggleListening}
          className="h-10 w-10 rounded-full shadow-lg"
        >
          {voice.isListening ? (
            <Mic className="h-5 w-5 animate-pulse" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>
      </div>
    )
  }
  
  return (
    <Card className={cn("w-72", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Voice Map Control
          </CardTitle>
          <Badge variant={voice.isConnected ? "default" : "secondary"} className="text-xs">
            {voice.isListening ? "Listening" : "Ready"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Main control button */}
        <Button
          className="w-full gap-2"
          variant={voice.isListening ? "destructive" : "default"}
          onClick={voice.toggleListening}
        >
          {voice.isListening ? (
            <>
              <Mic className="h-4 w-4 animate-pulse" />
              Listening...
            </>
          ) : voice.isSpeaking ? (
            <>
              <Volume2 className="h-4 w-4 animate-pulse" />
              Speaking...
            </>
          ) : (
            <>
              <MicOff className="h-4 w-4" />
              Start Voice Control
            </>
          )}
        </Button>
        
        {/* Interim transcript */}
        {voice.interimTranscript && (
          <div className="p-2 bg-muted/50 rounded text-sm italic text-muted-foreground">
            {voice.interimTranscript}
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
            onClick={() => onZoom?.("in")}
          >
            <MapPin className="h-3 w-3" />
            Zoom In
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => onZoom?.("out")}
          >
            <MapPin className="h-3 w-3" />
            Zoom Out
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => onResetView?.()}
          >
            <Navigation className="h-3 w-3" />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => onClearFilters?.()}
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
                <span className="truncate">{log.text}</span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {log.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
        
        {/* Help text */}
        <div className="text-[10px] text-muted-foreground">
          Try: "Go to Tokyo" • "Show satellites" • "Zoom level 5"
        </div>
      </CardContent>
    </Card>
  )
}
