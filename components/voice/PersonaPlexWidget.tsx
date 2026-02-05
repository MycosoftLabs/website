"use client"

import { FC, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, X, Maximize2, Minimize2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePersonaPlex } from "@/hooks/usePersonaPlex"
import { VoiceMonitorDashboard } from "./VoiceMonitorDashboard"
import { MYCA_PERSONAPLEX_PROMPT } from "@/lib/voice/personaplex-client"

interface PersonaPlexWidgetProps {
  className?: string
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  defaultExpanded?: boolean
  showMonitor?: boolean
  
  // Customization
  voicePrompt?: string
  textPrompt?: string
  serverUrl?: string
  
  // Callbacks
  onTranscript?: (text: string) => void
  onResponse?: (response: string) => void
}

const positionClasses = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
}

export const PersonaPlexWidget: FC<PersonaPlexWidgetProps> = ({
  className,
  position = "bottom-right",
  defaultExpanded = false,
  showMonitor = true,
  voicePrompt = "NATURAL_F2.pt",
  textPrompt = MYCA_PERSONAPLEX_PROMPT,
  // Default to PersonaPlex Bridge (8999) for MAS Event Engine integration
  serverUrl = "ws://localhost:8999/api/chat",
  onTranscript,
  onResponse,
  onCommand,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showSettings, setShowSettings] = useState(false)
  
  const personaplex = usePersonaPlex({
    serverUrl,
    voicePrompt,
    textPrompt,
    // All business logic now handled by orchestrator (single brain principle)
    orchestratorUrl: "/api/mas/voice/orchestrator",
    onTranscript,
    onResponse: (response) => {
      // Extract text from structured response for backwards compatibility
      onResponse?.(response.response_text || "")
    },
    onError: (error) => console.error("[PersonaPlexWidget] Error:", error),
  })
  
  const handleToggleConnection = async () => {
    if (personaplex.isConnected) {
      personaplex.disconnect()
    } else {
      await personaplex.connect()
    }
  }
  
  const getStatusColor = () => {
    switch (personaplex.status) {
      case "connected": return "bg-green-500"
      case "connecting": return "bg-yellow-500 animate-pulse"
      case "error": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }
  
  // Collapsed view - just a floating button
  if (!isExpanded) {
    return (
      <div className={cn("fixed z-50", positionClasses[position], className)}>
        <Button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
            personaplex.isConnected
              ? "bg-green-600 hover:bg-green-700"
              : "bg-zinc-800 hover:bg-zinc-700"
          )}
          size="icon"
        >
          <div className="relative">
            {personaplex.isConnected ? (
              <Mic className="h-6 w-6 text-white" />
            ) : (
              <MicOff className="h-6 w-6 text-zinc-400" />
            )}
            <span className={cn(
              "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-zinc-800",
              getStatusColor()
            )} />
          </div>
        </Button>
        
        {/* Mic level indicator when connected */}
        {personaplex.isConnected && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="w-full bg-green-500 transition-all duration-75"
              style={{ 
                height: `${personaplex.micLevel * 100}%`,
                marginTop: `${(1 - personaplex.micLevel) * 100}%`
              }}
            />
          </div>
        )}
      </div>
    )
  }
  
  // Expanded view
  return (
    <div className={cn(
      "fixed z-50 w-96 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden",
      positionClasses[position],
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", getStatusColor())} />
          <span className="font-medium text-white">MYCA Voice</span>
          <span className="text-xs text-zinc-400">
            {personaplex.status === "connected" ? "Full Duplex" : personaplex.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setIsExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-zinc-700 bg-zinc-800/50">
          <div className="grid gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Server</span>
              <span className="font-mono text-zinc-300 truncate max-w-48">{serverUrl}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Voice</span>
              <span className="font-mono text-zinc-300">{voicePrompt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">MAS Routing</span>
              <span className="text-green-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Memory</span>
              <span className="text-green-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">n8n Workflows</span>
              <span className="text-green-400">Enabled</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Control */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            onClick={handleToggleConnection}
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-200",
              personaplex.isConnected
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            )}
            size="icon"
          >
            {personaplex.status === "connecting" ? (
              <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : personaplex.isConnected ? (
              <MicOff className="h-7 w-7 text-white" />
            ) : (
              <Mic className="h-7 w-7 text-white" />
            )}
          </Button>
        </div>
        
        <div className="text-center mb-4">
          <span className="text-sm text-zinc-400">
            {personaplex.isConnected
              ? "Listening... Speak to MYCA"
              : "Click to connect to MYCA"}
          </span>
        </div>
        
        {/* Transcript Display */}
        {personaplex.transcript && (
          <div className="bg-zinc-800 rounded-lg p-3 mb-3 max-h-24 overflow-y-auto">
            <div className="text-xs text-zinc-400 mb-1">Transcript</div>
            <div className="text-sm text-white">{personaplex.transcript.slice(-200)}</div>
          </div>
        )}
        
        {/* Last Response */}
        {personaplex.lastResponse?.response_text && (
          <div className="bg-green-900/30 rounded-lg p-3 mb-3 max-h-24 overflow-y-auto border border-green-800/50">
            <div className="text-xs text-green-400 mb-1">MYCA Response</div>
            <div className="text-sm text-green-100">{personaplex.lastResponse.response_text.slice(-200)}</div>
            {personaplex.lastResponse.actions?.memory_saved && (
              <div className="text-[10px] text-green-600 mt-1">✓ Memory saved</div>
            )}
          </div>
        )}
      </div>
      
      {/* Monitor Dashboard */}
      {showMonitor && personaplex.isConnected && (
        <div className="border-t border-zinc-700">
          <VoiceMonitorDashboard
            status={personaplex.status}
            stats={personaplex.stats}
            micLevel={personaplex.micLevel}
            agentLevel={personaplex.agentLevel}
            consoleMessages={personaplex.consoleMessages}
            websocketUrl={serverUrl}
            compact={true}
            className="rounded-none border-0"
          />
        </div>
      )}
    </div>
  )
}

// Floating widget for global use
export function FloatingPersonaPlexWidget(props: Omit<PersonaPlexWidgetProps, "position">) {
  return <PersonaPlexWidget {...props} position="bottom-right" />
}

export default PersonaPlexWidget
