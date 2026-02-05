"use client"

/**
 * MAS Topology Fullscreen Page
 * Dedicated fullscreen view for 3D agent topology visualization
 * Updated: Feb 4, 2026 - PersonaPlex voice integration
 */

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft, Maximize2, Minimize2, Mic, MicOff } from "lucide-react"
import Link from "next/link"
import { VoiceSessionOverlay } from "@/components/mas/topology/voice-session-overlay"
import { MemoryMonitor } from "@/components/mas/topology/memory-monitor"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Dynamic import for 3D topology to avoid SSR issues
const AdvancedTopology3D = dynamic(
  () => import("@/components/mas/topology/advanced-topology-3d").then(mod => ({ default: mod.AdvancedTopology3D })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading 3D Topology...</p>
        </div>
      </div>
    )
  }
)

export default function TopologyFullscreenPage() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [voiceCommand, setVoiceCommand] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // PersonaPlex voice context for voice commands
  const personaplex = usePersonaPlexContext()
  const { isListening, lastTranscript, startListening, stopListening, isConnected, connectionState } = personaplex || {
    isListening: false,
    lastTranscript: "",
    startListening: () => {},
    stopListening: () => {},
    isConnected: false,
    connectionState: "disconnected",
  }
  
  // Handle voice commands for topology navigation
  useEffect(() => {
    if (!lastTranscript) return
    
    const command = lastTranscript.toLowerCase()
    setVoiceCommand(lastTranscript)
    
    // Clear command after showing
    const timeout = setTimeout(() => setVoiceCommand(null), 3000)
    
    // Parse voice commands
    if (command.includes("show agent") || command.includes("select agent") || command.includes("find agent")) {
      // Extract agent name from command
      const agentMatch = command.match(/(?:show|select|find)\s+(?:agent\s+)?(.+)/i)
      if (agentMatch) {
        const agentName = agentMatch[1].trim()
        setSelectedAgent(agentName)
      }
    } else if (command.includes("fullscreen") || command.includes("full screen")) {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen()
      }
    } else if (command.includes("exit fullscreen") || command.includes("minimize")) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
    } else if (command.includes("go back") || command.includes("back to natureos")) {
      window.location.href = "/natureos"
    }
    
    return () => clearTimeout(timeout)
  }, [lastTranscript])

  // Listen for fullscreen changes (including Escape key exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen on the container element
        if (containerRef.current) {
          await containerRef.current.requestFullscreen()
        }
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
          className="bg-black/50 hover:bg-black/70 border-white/10 text-white"
        >
          <Link href="/natureos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to NatureOS
          </Link>
        </Button>
      </div>

      {/* Fullscreen toggle and Voice Button */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Voice Command Button */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "bg-black/50 hover:bg-black/70 border-white/10 text-white",
            isListening && "bg-red-500/20 border-red-500/50"
          )}
          onClick={() => isListening ? stopListening() : startListening()}
          disabled={!isConnected && connectionState !== "connecting"}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4 mr-2 animate-pulse" />
              Stop Voice
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Voice Commands
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="bg-black/50 hover:bg-black/70 border-white/10 text-white"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 mr-2" />
              Enter Fullscreen
            </>
          )}
        </Button>
      </div>
      
      {/* Voice Command Display */}
      {voiceCommand && (
        <div className="absolute top-16 right-4 z-50">
          <Badge variant="secondary" className="bg-purple-500/20 text-white border-purple-500/50 px-3 py-1">
            <Mic className="h-3 w-3 mr-2" />
            {voiceCommand}
          </Badge>
        </div>
      )}
      
      {/* Voice Connection Status */}
      {!isConnected && (
        <div className="absolute top-16 right-4 z-50">
          <Badge variant="outline" className="bg-black/50 text-yellow-500 border-yellow-500/30">
            Voice: {connectionState === "connecting" ? "Connecting..." : "Offline"}
          </Badge>
        </div>
      )}

      {/* Voice Session Overlay */}
      <div className="absolute bottom-4 left-4 z-50 w-80">
        <VoiceSessionOverlay 
          className="bg-black/80 backdrop-blur-sm border-white/10 text-white"
        />
      </div>

      {/* Memory Monitor Widget */}
      <MemoryMonitor />

      {/* Topology Component */}
      <AdvancedTopology3D 
        className="w-full h-full"
        fullScreen={isFullscreen}
      />
    </div>
  )
}
