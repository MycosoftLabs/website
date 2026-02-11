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
      // Mobile: full screen, Desktop: same
      "md:backdrop-blur-md",
      className
    )}>
      <div className="container mx-auto h-full flex flex-col items-center justify-center px-4 py-safe">
        {/* Close button - larger on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-12 w-12 md:h-10 md:w-10 touch-manipulation"
          onClick={onClose}
          aria-label="Close voice assistant"
        >
          <X className="h-6 w-6" />
        </Button>
        
        {/* Main voice indicator - larger on mobile */}
        <div className="relative mb-8 md:mb-8">
          <div className={cn(
            "rounded-full flex items-center justify-center transition-all duration-300",
            // Mobile: larger, Desktop: normal
            "w-40 h-40 md:w-32 md:h-32",
            voice.isListening
              ? "bg-red-500/20 border-4 md:border-4 border-red-500"
              : voice.isSpeaking
              ? "bg-blue-500/20 border-4 md:border-4 border-blue-500"
              : "bg-muted border-4 md:border-4 border-muted-foreground/20"
          )}>
            {voice.isSpeaking ? (
              <Volume2 className="h-20 w-20 md:h-16 md:w-16 text-blue-500 animate-pulse" />
            ) : (
              <Mic className={cn(
                "h-20 w-20 md:h-16 md:w-16 transition-colors",
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
        
        {/* Transcript - larger text on mobile */}
        <div className="w-full max-w-2xl mb-8 px-4">
          {voice.interimTranscript && (
            <p className="text-xl md:text-2xl text-center text-muted-foreground italic animate-pulse">
              {voice.interimTranscript}
            </p>
          )}
          {voice.transcript && !voice.interimTranscript && (
            <p className="text-xl md:text-2xl text-center font-medium break-words">
              &ldquo;{voice.transcript}&rdquo;
            </p>
          )}
          {!voice.transcript && !voice.interimTranscript && (
            <p className="text-lg md:text-xl text-center text-muted-foreground">
              {voice.isListening ? "Listening... Say something" : "Tap the mic to start"}
            </p>
          )}
        </div>
        
        {/* Controls - touch-friendly on mobile */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-8 w-full max-w-md px-4">
          <Button
            size="lg"
            variant={voice.isListening ? "destructive" : "default"}
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            className="gap-2 w-full sm:w-auto h-14 sm:h-12 text-base touch-manipulation"
          >
            <Mic className="h-5 w-5" />
            {voice.isListening ? "Stop Listening" : "Start Listening"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={voice.clearTranscript}
            className="w-full sm:w-auto h-14 sm:h-12 touch-manipulation"
          >
            Clear
          </Button>
        </div>
        
        {/* Recent commands */}
        {recentCommands.length > 0 && (
          <div className="w-full max-w-md px-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Commands</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentCommands.map((cmd, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-muted rounded text-sm break-words"
                >
                  {cmd}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Error */}
        {voice.error && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-destructive/10 border border-destructive rounded-lg mx-4">
            <p className="text-sm text-destructive break-words">{voice.error}</p>
          </div>
        )}
        
        {/* Quick tips - hide on small mobile screens */}
        <div className="absolute bottom-4 text-center text-xs md:text-sm text-muted-foreground px-4 hidden sm:block">
          <p>Try: &ldquo;Search for mushrooms&rdquo; &bull; &ldquo;What is MYCA?&rdquo; &bull; &ldquo;Go to devices&rdquo;</p>
        </div>
      </div>
    </div>
  )
}
