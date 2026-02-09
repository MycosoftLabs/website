"use client"

/**
 * Timeline Panel - February 6, 2026
 * 
 * Complete timeline control panel for CREP dashboard.
 * Integrates TimelineSlider with data loading and cache management.
 */

import React, { useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { Database, HardDrive, Zap, Clock } from "lucide-react"
import { TimelineSlider, TimelineEvent, TimelineScale } from "./timeline-slider"
import { useTimeline } from "@/hooks/useTimeline"
import { useTimelineCache } from "@/hooks/useTimelineCache"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EntityType } from "@/lib/timeline/indexeddb-cache"

export interface TimelinePanelProps {
  /** Entity types to load */
  entityTypes?: EntityType[]
  /** Events to display as markers */
  events?: TimelineEvent[]
  /** Callback when time changes */
  onTimeChange?: (timestamp: number) => void
  /** Callback when data is loaded */
  onDataLoaded?: (data: unknown[]) => void
  /** Position on screen */
  position?: "bottom" | "top"
  /** Collapsed state */
  defaultCollapsed?: boolean
  /** Class name */
  className?: string
}

export function TimelinePanel({
  entityTypes = ["aircraft", "vessel", "satellite", "earthquake"],
  events = [],
  onTimeChange,
  onDataLoaded,
  position = "bottom",
  defaultCollapsed = false,
  className,
}: TimelinePanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  
  // Timeline state management
  const timeline = useTimeline({
    entityTypes: entityTypes as EntityType[],
    autoLoad: true,
    enablePlayback: true,
    initialSpeed: 1,
  })
  
  // Cache management
  const cache = useTimelineCache({
    autoCleanup: true,
    liveUpdates: entityTypes as EntityType[],
  })
  
  // Handle time change
  const handleTimeChange = useCallback((timestamp: number) => {
    timeline.setTime(timestamp)
    onTimeChange?.(timestamp)
  }, [timeline, onTimeChange])
  
  // Handle play state change
  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    if (isPlaying) {
      timeline.play()
    } else {
      timeline.pause()
    }
  }, [timeline])
  
  // Handle speed change
  const handleSpeedChange = useCallback((speed: number) => {
    timeline.setSpeed(speed)
  }, [timeline])
  
  // Notify when data loads
  React.useEffect(() => {
    if (timeline.state.data.length > 0) {
      onDataLoaded?.(timeline.state.data)
    }
  }, [timeline.state.data, onDataLoaded])
  
  // Determine cache source for display
  const cacheSource = useMemo(() => {
    const state = timeline.state.loadingState
    if (state.loadingState === "loading") return undefined
    // This would come from the actual cache result in practice
    return cache.state.stats ? "memory" : "api"
  }, [timeline.state.loadingState, cache.state.stats])
  
  // Loading state
  const isLoading = timeline.state.loadingState.loadingState === "loading"
  
  return (
    <motion.div
      className={cn(
        "fixed left-0 right-0 z-50",
        position === "bottom" ? "bottom-0" : "top-0",
        className
      )}
      initial={false}
      animate={{
        height: isCollapsed ? 48 : "auto",
      }}
    >
      {/* Collapse handle */}
      <button
        className={cn(
          "absolute left-1/2 -translate-x-1/2 bg-slate-800 px-4 py-1 rounded-t-lg text-xs text-slate-400 hover:text-white transition-colors z-10",
          position === "bottom" ? "-top-6" : "-bottom-6 rotate-180"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? "Show Timeline" : "Hide Timeline"}
      </button>
      
      {/* Main panel */}
      <div className="bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 p-4">
        {/* Stats bar (always visible) */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {/* Current time */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="font-mono text-white">
                {new Date(timeline.state.currentTime).toLocaleString()}
              </span>
            </div>
            
            {/* Cache stats */}
            {cache.state.stats && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {cache.state.stats.memoryEntries} mem
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <HardDrive className="h-3 w-3" />
                  {cache.state.stats.indexedDBEntries} idb
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Database className="h-3 w-3" />
                  {Math.round(cache.state.stats.cacheHitRate * 100)}% hit
                </Badge>
              </div>
            )}
          </div>
          
          {/* Data count */}
          <div className="text-xs text-slate-400">
            {timeline.state.data.length} entities loaded
          </div>
        </div>
        
        {/* Timeline slider (hidden when collapsed) */}
        {!isCollapsed && (
          <TimelineSlider
            currentTime={timeline.state.currentTime}
            onTimeChange={handleTimeChange}
            onPlayStateChange={handlePlayStateChange}
            events={events}
            isLoading={isLoading}
            cacheSource={cacheSource}
            playbackSpeed={timeline.state.playbackSpeed}
            onSpeedChange={handleSpeedChange}
          />
        )}
      </div>
    </motion.div>
  )
}

export default TimelinePanel