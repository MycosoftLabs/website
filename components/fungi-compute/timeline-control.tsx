/**
 * Timeline Control Panel - Bottom Popup
 */

"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronUp,
  ChevronDown,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Camera,
  Download,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TimelineControlProps {
  patterns?: any[]
  onSeek?: (timestamp: number) => void
  onSnapshot?: () => void
}

export function TimelineControl({ patterns = [], onSeek, onSnapshot }: TimelineControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [zoom, setZoom] = useState(60) // minutes visible
  const [position, setPosition] = useState(0) // 0 = now, negative = past
  
  const visiblePatterns = useMemo(() => {
    const now = Date.now()
    const windowStart = now + position * 60000 - zoom * 60000
    const windowEnd = now + position * 60000
    
    return (patterns || []).filter((p: any) => {
      const t = new Date(p.timestamp).getTime()
      return t >= windowStart && t <= windowEnd
    })
  }, [patterns, position, zoom])
  
  const patternsByType = useMemo(() => {
    const counts: Record<string, number> = {}
    visiblePatterns.forEach((p: any) => {
      counts[p.type] = (counts[p.type] || 0) + 1
    })
    return counts
  }, [visiblePatterns])
  
  if (!isOpen) {
    return (
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="px-6 py-2 rounded-xl backdrop-blur-2xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_8px_32px_0_rgba(6,182,212,0.2)] transition-all duration-300"
        >
          <Clock className="h-4 w-4 mr-2 text-cyan-400" />
          <span className="text-xs text-cyan-400 font-semibold">Timeline</span>
          <ChevronUp className="h-4 w-4 ml-2 text-cyan-400" />
        </Button>
      </div>
    )
  }
  
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-6xl z-40 animate-in slide-in-from-bottom duration-300">
      <div className="backdrop-blur-2xl bg-gradient-to-br from-black/80 via-black/70 to-black/80 rounded-2xl border border-cyan-500/30 shadow-[0_8px_48px_0_rgba(6,182,212,0.25),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">Timeline Control</span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-emerald-500/30 text-emerald-400">
              {visiblePatterns.length} patterns
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Transport Controls */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10">
                    <SkipBack className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  Jump Back 1min
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  {isPlaying ? "Pause" : "Play"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10">
                    <SkipForward className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  Jump Forward 1min
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-px h-4 bg-cyan-500/20 mx-1" />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSnapshot}
                    className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  Snapshot
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10">
                    <Download className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  Export Data
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10">
                    <Search className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-cyan-500/30 text-cyan-400 text-xs">
                  Search Patterns
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 text-cyan-400 hover:bg-cyan-500/10"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Timeline Visualization */}
        <div className="p-3 space-y-2">
          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-cyan-400/50 w-12">Zoom</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.min(zoom * 2, 1440))}
              className="h-6 w-6 text-cyan-400"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[Math.log2(zoom)]}
                onValueChange={([v]) => setZoom(Math.pow(2, v))}
                min={1}
                max={10}
                step={0.1}
                className="h-1"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.max(zoom / 2, 1))}
              className="h-6 w-6 text-cyan-400"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-cyan-400 font-mono w-16 text-right">{zoom < 60 ? `${zoom}m` : `${(zoom / 60).toFixed(1)}h`}</span>
          </div>
          
          {/* Pattern Timeline */}
          <div className="h-16 relative rounded-lg bg-black/40 border border-cyan-500/20 overflow-hidden">
            {/* Grid */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex-1 border-r border-cyan-500/5 last:border-r-0" />
              ))}
            </div>
            
            {/* Patterns */}
            <div className="absolute inset-0 flex items-center px-2">
              {visiblePatterns.map((p: any, i: number) => {
                const t = new Date(p.timestamp).getTime()
                const now = Date.now()
                const relativeTime = t - (now + position * 60000)
                const x = 50 + (relativeTime / (zoom * 60000)) * 100
                
                if (x < 0 || x > 100) return null
                
                const colors: Record<string, string> = {
                  growth: "#10b981",
                  stress: "#f97316",
                  spike: "#ec4899",
                  communication: "#06b6d4",
                  baseline: "#6b7280",
                }
                
                return (
                  <div
                    key={p.id || i}
                    className="absolute w-1 h-10 rounded-full hover:h-12 transition-all cursor-pointer"
                    style={{
                      left: `${x}%`,
                      backgroundColor: colors[p.type] || colors.baseline,
                      boxShadow: `0 0 8px ${colors[p.type] || colors.baseline}`,
                    }}
                    title={`${p.type} - ${(p.confidence * 100).toFixed(0)}%`}
                  />
                )
              })}
              
              {/* Now marker */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              </div>
            </div>
          </div>
          
          {/* Pattern Summary */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(patternsByType).map(([type, count]) => (
              <Badge
                key={type}
                variant="outline"
                className="text-[9px] px-2 py-0.5 h-5 border-cyan-500/20 text-cyan-400"
              >
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
