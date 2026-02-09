"use client"

/**
 * useTimeline - React hook for timeline state management
 * February 6, 2026
 * 
 * Manages timeline state, data loading, and playback controls.
 * Integrates with TimelineDataLoader and cache system.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { 
  TimelineDataLoader, 
  createTimelineLoader, 
  TimeLoaderState,
  TimeLoaderOptions 
} from "@/lib/timeline/time-loader"
import { TimelineDataPoint } from "@/lib/timeline/cache-manager"
import { EntityType } from "@/lib/timeline/indexeddb-cache"

export interface UseTimelineOptions {
  /** Initial timestamp */
  initialTime?: number
  /** Entity types to load */
  entityTypes?: EntityType[]
  /** Auto-load data when time changes */
  autoLoad?: boolean
  /** Enable playback */
  enablePlayback?: boolean
  /** Initial playback speed */
  initialSpeed?: number
}

export interface TimelineState {
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  loadingState: TimeLoaderState
  data: TimelineDataPoint[]
  cacheSource: string | null
}

export interface UseTimelineReturn {
  /** Current timeline state */
  state: TimelineState
  
  /** Set current time */
  setTime: (timestamp: number) => void
  
  /** Jump to specific time */
  jumpTo: (timestamp: number) => void
  
  /** Step forward/backward by amount */
  step: (deltaMs: number) => void
  
  /** Jump to now */
  jumpToNow: () => void
  
  /** Start playback */
  play: () => void
  
  /** Pause playback */
  pause: () => void
  
  /** Toggle playback */
  togglePlay: () => void
  
  /** Set playback speed */
  setSpeed: (speed: number) => void
  
  /** Load data for current time */
  loadData: () => Promise<void>
  
  /** Load data for a range */
  loadRange: (start: number, end: number) => Promise<TimelineDataPoint[]>
  
  /** Get entity at current time */
  getEntityAt: (entityType: EntityType, entityId: string) => TimelineDataPoint | null
}

export function useTimeline(options: UseTimelineOptions = {}): UseTimelineReturn {
  const {
    initialTime = Date.now(),
    entityTypes = ["aircraft", "vessel", "satellite"] as EntityType[],
    autoLoad = true,
    enablePlayback = true,
    initialSpeed = 1,
  } = options
  
  // State
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed)
  const [loadingState, setLoadingState] = useState<TimeLoaderState>({
    currentTime: initialTime,
    loadingState: "idle",
    loadedRanges: [],
    error: null,
    lastLoadTime: 0,
  })
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [cacheSource, setCacheSource] = useState<string | null>(null)
  
  // Refs
  const loaderRef = useRef<TimelineDataLoader | null>(null)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Initialize loader
  useEffect(() => {
    const loader = createTimelineLoader({
      entityTypes,
      onData: (newData) => {
        setData(newData)
      },
      onStateChange: (state) => {
        setLoadingState(state)
      },
      prefetch: true,
    })
    
    loaderRef.current = loader
    
    return () => {
      loader.destroy()
    }
  }, [entityTypes])
  
  // Auto-load when time changes
  useEffect(() => {
    if (autoLoad && loaderRef.current) {
      loaderRef.current.loadAtTime(currentTime)
    }
  }, [currentTime, autoLoad])
  
  // Playback loop
  useEffect(() => {
    if (isPlaying && enablePlayback) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1000 * playbackSpeed)
      }, 100)
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
    }
    
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, enablePlayback])
  
  // Set time
  const setTime = useCallback((timestamp: number) => {
    setCurrentTime(timestamp)
  }, [])
  
  // Jump to time (stops playback)
  const jumpTo = useCallback((timestamp: number) => {
    setIsPlaying(false)
    setCurrentTime(timestamp)
  }, [])
  
  // Step by delta
  const step = useCallback((deltaMs: number) => {
    setCurrentTime(prev => prev + deltaMs)
  }, [])
  
  // Jump to now
  const jumpToNow = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(Date.now())
  }, [])
  
  // Playback controls
  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])
  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), [])
  const setSpeed = useCallback((speed: number) => setPlaybackSpeed(speed), [])
  
  // Load data manually
  const loadData = useCallback(async () => {
    if (loaderRef.current) {
      await loaderRef.current.loadAtTime(currentTime)
    }
  }, [currentTime])
  
  // Load range
  const loadRange = useCallback(async (start: number, end: number) => {
    if (loaderRef.current) {
      return loaderRef.current.loadRange(start, end)
    }
    return []
  }, [])
  
  // Get entity at current time
  const getEntityAt = useCallback((entityType: EntityType, entityId: string) => {
    // Find in current data
    const matches = data.filter(
      d => d.entityType === entityType && d.entityId === entityId
    )
    
    if (matches.length === 0) return null
    
    // Find closest to current time
    let closest = matches[0]
    let minDelta = Math.abs(matches[0].timestamp - currentTime)
    
    for (const m of matches) {
      const delta = Math.abs(m.timestamp - currentTime)
      if (delta < minDelta) {
        minDelta = delta
        closest = m
      }
    }
    
    return closest
  }, [data, currentTime])
  
  // Build state object
  const state: TimelineState = useMemo(() => ({
    currentTime,
    isPlaying,
    playbackSpeed,
    loadingState,
    data,
    cacheSource,
  }), [currentTime, isPlaying, playbackSpeed, loadingState, data, cacheSource])
  
  return {
    state,
    setTime,
    jumpTo,
    step,
    jumpToNow,
    play,
    pause,
    togglePlay,
    setSpeed,
    loadData,
    loadRange,
    getEntityAt,
  }
}