/**
 * VoiceCommandPanel - Feb 2026
 * 
 * Voice command helper panel showing:
 * - Available commands
 * - Current listening state
 * - Recent transcript
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Mic, 
  MicOff, 
  Volume2,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useVoiceSearch, type UseVoiceSearchOptions } from "@/hooks/use-voice-search"
import { useState } from "react"

interface VoiceCommandPanelProps extends UseVoiceSearchOptions {
  className?: string
  showHints?: boolean
}

export function VoiceCommandPanel({
  className,
  showHints = true,
  ...voiceOptions
}: VoiceCommandPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    isListening,
    isConnected,
    lastTranscript,
    startListening,
    stopListening,
    availableCommands,
  } = useVoiceSearch(voiceOptions)

  return (
    <div className={cn("relative", className)}>
      {/* Main voice button */}
      <div className="flex items-center gap-2">
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="lg"
          className={cn(
            "rounded-full h-14 w-14 p-0",
            isListening && "animate-pulse"
          )}
          onClick={isListening ? stopListening : startListening}
          disabled={!isConnected}
          title={isListening ? "Stop listening" : "Start voice search"}
        >
          {isListening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* Status badge */}
        {isConnected ? (
          <Badge 
            variant={isListening ? "default" : "secondary"}
            className="text-xs"
          >
            {isListening ? (
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3 animate-pulse" />
                Listening...
              </span>
            ) : (
              "Voice Ready"
            )}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Voice Offline
          </Badge>
        )}

        {/* Help toggle */}
        {showHints && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Transcript display */}
      <AnimatePresence>
        {isListening && lastTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 p-3 bg-card border rounded-lg shadow-lg z-50"
          >
            <p className="text-sm font-medium">Heard:</p>
            <p className="text-sm text-muted-foreground italic">
              "{lastTranscript}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commands help panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full mt-2 left-0 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Voice Commands</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableCommands.map((cmd, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{cmd.trigger}</p>
                    <p className="text-xs text-muted-foreground">
                      {cmd.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Tip: Start speaking naturally. Commands don't need exact phrasing.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Compact voice indicator for integration into search input
 */
export function VoiceIndicator({
  className,
  ...voiceOptions
}: VoiceCommandPanelProps) {
  const {
    isListening,
    isConnected,
    lastTranscript,
    startListening,
    stopListening,
  } = useVoiceSearch(voiceOptions)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full",
          isListening && "bg-red-500/10 text-red-500"
        )}
        onClick={isListening ? stopListening : startListening}
        disabled={!isConnected}
      >
        {isListening ? (
          <MicOff className="h-4 w-4 animate-pulse" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {isListening && lastTranscript && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          className="text-xs text-muted-foreground truncate max-w-32"
        >
          {lastTranscript}
        </motion.span>
      )}
    </div>
  )
}

export default VoiceCommandPanel
