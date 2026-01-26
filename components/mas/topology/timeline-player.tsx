"use client"

/**
 * Timeline Player Component
 * Historical playback with snapshot storage and timeline scrubbing
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Clock,
  Calendar,
  Download,
  Upload,
  History,
  X,
  ChevronDown,
} from "lucide-react"
import type { TopologySnapshot, TopologyData, PlaybackState } from "./types"

interface TimelinePlayerProps {
  currentData: TopologyData | null
  onSnapshotLoad: (snapshot: TopologySnapshot) => void
  onLiveMode: () => void
  isLive: boolean
  className?: string
}

// Time range options
const TIME_RANGES = [
  { label: "Last Hour", hours: 1 },
  { label: "Last 6 Hours", hours: 6 },
  { label: "Last 24 Hours", hours: 24 },
  { label: "Last 7 Days", hours: 168 },
]

// Playback speeds
const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8]

export function TimelinePlayer({
  currentData,
  onSnapshotLoad,
  onLiveMode,
  isLive,
  className = "",
}: TimelinePlayerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Use null dates initially to avoid hydration mismatch - set real dates after mount
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: null as unknown as Date, // Will be set client-side
    startTime: null as unknown as Date,
    endTime: null as unknown as Date,
    speed: 1,
    snapshots: [],
    currentSnapshotIndex: -1,
  })
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0])
  const [showRangeDropdown, setShowRangeDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const playbackInterval = useRef<NodeJS.Timeout | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Initialize dates client-side to avoid hydration mismatch
  useEffect(() => {
    const now = new Date()
    setPlaybackState(prev => ({
      ...prev,
      currentTime: now,
      startTime: new Date(now.getTime() - 3600000), // 1 hour ago
      endTime: now,
    }))
    setMounted(true)
  }, [])

  // Generate simulated snapshots for demo (replace with real API call)
  const loadSnapshots = useCallback(async (hours: number) => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const now = new Date()
    const startTime = new Date(now.getTime() - hours * 3600000)
    const snapshots: TopologySnapshot[] = []
    
    // Generate snapshot every 5 minutes for the selected range
    const intervalMs = 5 * 60 * 1000 // 5 minutes
    const totalSnapshots = Math.floor((hours * 3600000) / intervalMs)
    
    for (let i = 0; i < totalSnapshots; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs)
      
      // Create simulated snapshot with varying data
      snapshots.push({
        id: `snapshot-${i}`,
        timestamp: timestamp.toISOString(),
        nodes: [], // Would be populated from real data
        connections: [],
        stats: {
          totalNodes: 223,
          activeNodes: Math.floor(180 + Math.random() * 40),
          totalConnections: 150 + Math.floor(Math.random() * 50),
          activeConnections: 100 + Math.floor(Math.random() * 80),
          messagesPerSecond: 500 + Math.random() * 1000,
          avgLatencyMs: 10 + Math.random() * 30,
          systemLoad: 0.3 + Math.random() * 0.4,
          uptimeSeconds: 86400 * 3 + Math.floor(Math.random() * 86400),
        },
        incidents: [],
      })
    }
    
    setPlaybackState((prev) => ({
      ...prev,
      snapshots,
      startTime,
      endTime: now,
      currentTime: startTime,
      currentSnapshotIndex: 0,
    }))
    
    setIsLoading(false)
  }, [])

  // Handle range selection
  const handleRangeSelect = useCallback(
    (range: typeof TIME_RANGES[0]) => {
      setSelectedRange(range)
      setShowRangeDropdown(false)
      loadSnapshots(range.hours)
    },
    [loadSnapshots]
  )

  // Playback control functions
  const play = useCallback(() => {
    if (playbackState.snapshots.length === 0) return
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }))
  }, [playbackState.snapshots.length])

  const pause = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const skipToStart = useCallback(() => {
    if (playbackState.snapshots.length === 0) return
    setPlaybackState((prev) => ({
      ...prev,
      currentSnapshotIndex: 0,
      currentTime: prev.startTime,
      isPlaying: false,
    }))
    onSnapshotLoad(playbackState.snapshots[0])
  }, [playbackState.snapshots, onSnapshotLoad])

  const skipToEnd = useCallback(() => {
    if (playbackState.snapshots.length === 0) return
    const lastIndex = playbackState.snapshots.length - 1
    setPlaybackState((prev) => ({
      ...prev,
      currentSnapshotIndex: lastIndex,
      currentTime: prev.endTime,
      isPlaying: false,
    }))
    onSnapshotLoad(playbackState.snapshots[lastIndex])
  }, [playbackState.snapshots, onSnapshotLoad])

  const changeSpeed = useCallback((delta: number) => {
    setPlaybackState((prev) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(prev.speed)
      const newIndex = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIndex + delta))
      return { ...prev, speed: PLAYBACK_SPEEDS[newIndex] }
    })
  }, [])

  // Handle timeline click
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || playbackState.snapshots.length === 0) return
      
      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newIndex = Math.floor(percentage * playbackState.snapshots.length)
      const clampedIndex = Math.max(0, Math.min(playbackState.snapshots.length - 1, newIndex))
      
      const snapshot = playbackState.snapshots[clampedIndex]
      setPlaybackState((prev) => ({
        ...prev,
        currentSnapshotIndex: clampedIndex,
        currentTime: new Date(snapshot.timestamp),
      }))
      onSnapshotLoad(snapshot)
    },
    [playbackState.snapshots, onSnapshotLoad]
  )

  // Playback interval effect
  useEffect(() => {
    if (playbackState.isPlaying && playbackState.snapshots.length > 0) {
      playbackInterval.current = setInterval(() => {
        setPlaybackState((prev) => {
          const nextIndex = prev.currentSnapshotIndex + 1
          if (nextIndex >= prev.snapshots.length) {
            return { ...prev, isPlaying: false }
          }
          const snapshot = prev.snapshots[nextIndex]
          onSnapshotLoad(snapshot)
          return {
            ...prev,
            currentSnapshotIndex: nextIndex,
            currentTime: new Date(snapshot.timestamp),
          }
        })
      }, 1000 / playbackState.speed) // Adjusted by playback speed
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current)
      }
    }
  }, [playbackState.isPlaying, playbackState.speed, playbackState.snapshots, onSnapshotLoad])

  // Calculate timeline progress
  const progress = useMemo(() => {
    if (playbackState.snapshots.length === 0) return 0
    return (playbackState.currentSnapshotIndex / (playbackState.snapshots.length - 1)) * 100
  }, [playbackState.currentSnapshotIndex, playbackState.snapshots.length])

  // Current snapshot stats
  const currentSnapshot = playbackState.snapshots[playbackState.currentSnapshotIndex]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-4 left-4 z-40 flex items-center gap-2
          px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg
          border border-white/10 hover:border-purple-500/50 
          text-white text-sm font-medium
          transition-all hover:shadow-lg hover:shadow-purple-500/20
          ${className}
        `}
      >
        <History className="h-4 w-4 text-purple-400" />
        <span>Timeline</span>
        {!isLive && (
          <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] rounded">
            PLAYBACK
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 z-40
        bg-slate-900/95 backdrop-blur-md rounded-lg
        border border-white/10 shadow-2xl
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-purple-400" />
          <h3 className="text-white font-semibold">Timeline Playback</h3>
          
          {/* Live/Playback toggle */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onLiveMode}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${isLive
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-gray-400 hover:text-white"
                }
              `}
            >
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-300 animate-pulse" : "bg-gray-500"}`} />
                LIVE
              </span>
            </button>
            <button
              onClick={() => {
                if (playbackState.snapshots.length === 0) {
                  loadSnapshots(selectedRange.hours)
                }
              }}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${!isLive
                  ? "bg-purple-600 text-white"
                  : "bg-slate-700 text-gray-400 hover:text-white"
                }
              `}
            >
              PLAYBACK
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="relative">
            <button
              onClick={() => setShowRangeDropdown(!showRangeDropdown)}
              className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded border border-white/10 hover:border-white/20 text-sm text-white"
            >
              <Calendar className="h-4 w-4 text-gray-400" />
              {selectedRange.label}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
            {showRangeDropdown && (
              <div className="absolute top-full mt-1 right-0 bg-slate-800 rounded border border-white/10 shadow-xl z-50">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.hours}
                    onClick={() => handleRangeSelect(range)}
                    className={`
                      w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors
                      ${range.hours === selectedRange.hours ? "text-purple-400" : "text-white"}
                    `}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            <span className="ml-3 text-gray-400">Loading snapshots...</span>
          </div>
        ) : playbackState.snapshots.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No snapshots loaded</p>
            <button
              onClick={() => loadSnapshots(selectedRange.hours)}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors"
            >
              Load Snapshots
            </button>
          </div>
        ) : (
          <>
            {/* Timeline Bar */}
            <div className="space-y-2">
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-8 bg-slate-800 rounded-lg cursor-pointer overflow-hidden group"
              >
                {/* Progress bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-purple-400"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Activity indicators (mini-chart) */}
                <div className="absolute inset-0 flex items-end px-1 py-1">
                  {playbackState.snapshots.map((snapshot, i) => (
                    <div
                      key={snapshot.id}
                      className={`
                        flex-1 mx-px rounded-t
                        ${i <= playbackState.currentSnapshotIndex ? "bg-purple-300/40" : "bg-gray-600/40"}
                      `}
                      style={{ height: `${(snapshot.stats.activeNodes / 223) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                  style={{ left: `${progress}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-white rounded-full" />
                </div>

                {/* Hover tooltip */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
                  <div
                    className="absolute top-full mt-2 px-2 py-1 bg-black/90 text-white text-xs rounded"
                    style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
                  >
                    {playbackState.currentTime.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Time labels */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>{playbackState.startTime.toLocaleTimeString()}</span>
                <span className="text-purple-400 font-medium">
                  {playbackState.currentTime.toLocaleString()}
                </span>
                <span>{playbackState.endTime.toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              {/* Rewind */}
              <button
                onClick={() => changeSpeed(-1)}
                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                title="Decrease speed"
              >
                <Rewind className="h-4 w-4" />
              </button>

              {/* Skip to start */}
              <button
                onClick={skipToStart}
                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                title="Skip to start"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={playbackState.isPlaying ? pause : play}
                className="p-3 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors"
              >
                {playbackState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>

              {/* Skip to end */}
              <button
                onClick={skipToEnd}
                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                title="Skip to end"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              {/* Fast forward */}
              <button
                onClick={() => changeSpeed(1)}
                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                title="Increase speed"
              >
                <FastForward className="h-4 w-4" />
              </button>

              {/* Speed indicator */}
              <span className="ml-4 px-2 py-1 bg-slate-800 rounded text-sm text-gray-300 font-mono">
                {playbackState.speed}x
              </span>
            </div>

            {/* Snapshot Stats */}
            {currentSnapshot && (
              <div className="grid grid-cols-4 gap-4 p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-400">Active Nodes</div>
                  <div className="text-lg font-semibold text-green-400">
                    {currentSnapshot.stats.activeNodes}/{currentSnapshot.stats.totalNodes}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Connections</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {currentSnapshot.stats.activeConnections}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Msg/s</div>
                  <div className="text-lg font-semibold text-cyan-400">
                    {currentSnapshot.stats.messagesPerSecond.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avg Latency</div>
                  <div className="text-lg font-semibold text-yellow-400">
                    {currentSnapshot.stats.avgLatencyMs.toFixed(1)}ms
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
