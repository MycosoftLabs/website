"use client"

/**
 * MAS Topology Fullscreen Page
 * Dedicated fullscreen view for 3D agent topology visualization
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft, Minimize2 } from "lucide-react"
import Link from "next/link"

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

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
          className="bg-black/50 hover:bg-black/70 border-white/10 text-white"
        >
          <Link href="/natureos/mas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to MAS
          </Link>
        </Button>
      </div>

      {/* Fullscreen toggle */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-black/50 hover:bg-black/70 border-white/10 text-white"
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen()
              setIsFullscreen(true)
            } else {
              document.exitFullscreen()
              setIsFullscreen(false)
            }
          }}
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </Button>
      </div>

      {/* Topology Component */}
      <AdvancedTopology3D 
        className="w-full h-full"
        fullScreen={false}
      />
    </div>
  )
}
