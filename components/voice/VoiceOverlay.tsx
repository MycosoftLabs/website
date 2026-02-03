"use client"

import { useEffect, useState } from "react"
import { X, Mic, Volume2, Brain, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useVoice } from "./UnifiedVoiceProvider"

interface VoiceOverlayProps {
  open: boolean
  onClose: () => void
  className?: string
}

export function VoiceOverlay({ open, onClose, className }: VoiceOverlayProps) {
  const voice = useVoice()
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  
  useEffect(() => {
    if (voice.transcript) {
      setRecentCommands(prev => [voice.transcript, ...prev].slice(0, 5))
    }
  }, [voice.transcript])
  
  if (!open) return null
  
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm",
      className
    )}>
      <div className="container mx-auto h-full flex flex-col items-center justify-center px-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        {/* Main voice indicator */}
        <div className="relative mb-8">
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
            voice.isListening
              ? "bg-red-500/20 border-4 border-red-500"
              : voice.isSpeaking
              ? "bg-blue-500/20 border-4 border-blue-500"
              : "bg-muted border-4 border-muted-foreground/20"
          )}>
            {voice.isSpeaking ? (
              <Volume2 className="h-16 w-16 text-blue-500 animate-pulse" />
            ) : (
              <Mic className={cn(
                "h-16 w-16 transition-colors",
                voice.isListening ? "text-red-500" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          {/* Pulse animation */}
          {voice.isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-10" />
            </>
          )}
        </div>
        
        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={voice.isConnected ? "default" : "secondary"}>
            {voice.isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant="outline">{voice.mode}</Badge>
        </div>
        
        {/* Transcript */}
        <div className="w-full max-w-2xl mb-8">
          {voice.interimTranscript && (
            <p className="text-2xl text-center text-muted-foreground italic animate-pulse">
              {voice.interimTranscript}
            </p>
          )}
          {voice.transcript && !voice.interimTranscript && (
            <p className="text-2xl text-center font-medium">
              "{voice.transcript}"
            </p>
          )}
          {!voice.transcript && !voice.interimTranscript && (
            <p className="text-xl text-center text-muted-foreground">
              {voice.isListening ? "Listening... Say something" : "Click the mic to start"}
            </p>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            size="lg"
            variant={voice.isListening ? "destructive" : "default"}
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            className="gap-2"
          >
            <Mic className="h-5 w-5" />
            {voice.isListening ? "Stop Listening" : "Start Listening"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={voice.clearTranscript}
          >
            Clear
          </Button>
        </div>
        
        {/* Recent commands */}
        {recentCommands.length > 0 && (
          <div className="w-full max-w-md">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Commands</h4>
            <div className="space-y-1">
              {recentCommands.map((cmd, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 bg-muted rounded text-sm truncate"
                >
                  {cmd}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Error */}
        {voice.error && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{voice.error}</p>
          </div>
        )}
        
        {/* Quick tips */}
        <div className="absolute bottom-4 text-center text-sm text-muted-foreground">
          <p>Try: "What's the system status?" • "List all agents" • "Show workflows"</p>
        </div>
      </div>
    </div>
  )
}
