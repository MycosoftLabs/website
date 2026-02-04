"use client"

/**
 * MAS Topology Fullscreen Page
 * Dedicated fullscreen view for 3D agent topology visualization
 */

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft, Maximize2, Minimize2 } from "lucide-react"
import Link from "next/link"
import { VoiceSessionOverlay } from "@/components/mas/topology/voice-session-overlay"
import { MemoryMonitor } from "@/components/mas/topology/memory-monitor"

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
  const containerRef = useRef<HTMLDivElement>(null)

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

      {/* Fullscreen toggle */}
      <div className="absolute top-4 right-4 z-50">
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
