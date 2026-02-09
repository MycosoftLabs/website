"use client"

/**
 * Timeline Slider Component - February 6, 2026
 * 
 * Interactive timeline control for CREP dashboard with:
 * - Draggable time cursor
 * - Play/pause/speed controls
 * - Event markers on timeline
 * - Visual past/present/future distinction
 * - Zoom in/out on timeline scale
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock, 
  ZoomIn, 
  ZoomOut,
  Calendar,
  FastForward,
  Rewind,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type TimelineScale = "hours" | "days" | "weeks" | "months"

export interface TimelineEvent {
  id: string
  timestamp: number
  type: "earthquake" | "storm" | "wildfire" | "forecast" | "alert" | "custom"
  label: string
  severity?: "low" | "medium" | "high" | "critical"
}

export interface TimelineSliderProps {
  /** Current timestamp (ms) */
  currentTime: number
  /** Minimum time (ms) - start of timeline */
  minTime?: number
  /** Maximum time (ms) - end of timeline */
  maxTime?: number
  /** Callback when time changes */
  onTimeChange: (timestamp: number) => void
  /** Callback when playing/paused */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Events to show as markers */
  events?: TimelineEvent[]
  /** Loading state */
  isLoading?: boolean
  /** Cache hit indicator */
  cacheSource?: string
  /** Playback speed multiplier */
  playbackSpeed?: number
  /** Callback when speed changes */
  onSpeedChange?: (speed: number) => void
  /** Class name for styling */
  className?: string
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 30, 60]

const SCALE_DURATIONS: Record<TimelineScale, number> = {
  hours: 6 * 60 * 60 * 1000,     // 6 hours
  days: 24 * 60 * 60 * 1000,     // 1 day  
  weeks: 7 * 24 * 60 * 60 * 1000, // 1 week
  months: 30 * 24 * 60 * 60 * 1000, // 30 days
}

export function TimelineSlider({
  currentTime,
  minTime,
  maxTime,
  onTimeChange,
  onPlayStateChange,
  events = [],
  isLoading = false,
  cacheSource,
  playbackSpeed = 1,
  onSpeedChange,
  className,
}: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [scale, setScale] = useState<TimelineScale>("hours")
  const [isDragging, setIsDragging] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const sliderRef = useRef<HTMLDivElement>(null)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Calculate time range based on scale
  const scaleDuration = SCALE_DURATIONS[scale]
  const effectiveMinTime = minTime ?? currentTime - scaleDuration / 2
  const effectiveMaxTime = maxTime ?? currentTime + scaleDuration / 2
  
  // Determine if current time is in past, present, or future
  const now = Date.now()
  const timeState = currentTime < now - 60000 ? "past" : 
                    currentTime > now + 60000 ? "future" : "present"
  
  // Format time display
  const formatTime = useCallback((timestamp: number): string => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (scale === "hours") {
      return isToday 
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleString([], { 
            month: "short", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit" 
          })
    } else if (scale === "days") {
      return date.toLocaleDateString([], { 
        weekday: "short", 
        month: "short", 
        day: "numeric" 
      })
    } else {
      return date.toLocaleDateString([], { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      })
    }
  }, [scale])
  
  // Format duration display
  const formatDuration = useCallback((ms: number): string => {
    const absMs = Math.abs(ms)
    const minutes = Math.floor(absMs / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }, [])
  
  // Play/pause handling
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        const step = 1000 * playbackSpeed // 1 second of real time * speed
        const newTime = currentTime + step
        
        if (newTime >= effectiveMaxTime) {
          setIsPlaying(false)
          onPlayStateChange?.(false)
        } else {
          onTimeChange(newTime)
        }
      }, 100) // Update every 100ms for smooth playback
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, currentTime, playbackSpeed, effectiveMaxTime, onTimeChange, onPlayStateChange])
  
  // Toggle play/pause
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const newState = !prev
      onPlayStateChange?.(newState)
      return newState
    })
  }, [onPlayStateChange])
  
  // Jump to now
  const jumpToNow = useCallback(() => {
    onTimeChange(Date.now())
  }, [onTimeChange])
  
  // Step forward/backward
  const stepTime = useCallback((direction: "forward" | "backward") => {
    const stepSize = scale === "hours" ? 15 * 60 * 1000 : // 15 minutes
                     scale === "days" ? 60 * 60 * 1000 : // 1 hour
                     scale === "weeks" ? 24 * 60 * 60 * 1000 : // 1 day
                     7 * 24 * 60 * 60 * 1000 // 1 week
    
    const newTime = direction === "forward" 
      ? Math.min(currentTime + stepSize, effectiveMaxTime)
      : Math.max(currentTime - stepSize, effectiveMinTime)
    
    onTimeChange(newTime)
  }, [scale, currentTime, effectiveMaxTime, effectiveMinTime, onTimeChange])
  
  // Change speed
  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    onSpeedChange?.(SPEED_OPTIONS[nextIndex])
  }, [playbackSpeed, onSpeedChange])
  
  // Zoom in/out (change scale)
  const zoomIn = useCallback(() => {
    const scales: TimelineScale[] = ["months", "weeks", "days", "hours"]
    const currentIndex = scales.indexOf(scale)
    if (currentIndex < scales.length - 1) {
      setScale(scales[currentIndex + 1])
    }
  }, [scale])
  
  const zoomOut = useCallback(() => {
    const scales: TimelineScale[] = ["months", "weeks", "days", "hours"]
    const currentIndex = scales.indexOf(scale)
    if (currentIndex > 0) {
      setScale(scales[currentIndex - 1])
    }
  }, [scale])
  
  // Calculate slider position (0-100)
  const sliderPosition = useMemo(() => {
    const range = effectiveMaxTime - effectiveMinTime
    const position = currentTime - effectiveMinTime
    return Math.max(0, Math.min(100, (position / range) * 100))
  }, [currentTime, effectiveMinTime, effectiveMaxTime])
  
  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    const range = effectiveMaxTime - effectiveMinTime
    const newTime = effectiveMinTime + (value[0] / 100) * range
    onTimeChange(Math.round(newTime))
  }, [effectiveMinTime, effectiveMaxTime, onTimeChange])
  
  // Calculate event positions
  const eventPositions = useMemo(() => {
    const range = effectiveMaxTime - effectiveMinTime
    
    return events
      .filter(e => e.timestamp >= effectiveMinTime && e.timestamp <= effectiveMaxTime)
      .map(event => ({
        ...event,
        position: ((event.timestamp - effectiveMinTime) / range) * 100,
      }))
  }, [events, effectiveMinTime, effectiveMaxTime])
  
  // Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "critical": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-blue-500"
      default: return "bg-gray-500"
    }
  }
  
  return (
    <div className={cn("w-full", className)}>
      {/* Main timeline container */}
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
        
        {/* Top bar: Time display and controls */}
        <div className="flex items-center justify-between mb-3">
          {/* Current time display */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-2xl font-mono text-white">
                {formatTime(currentTime)}
              </span>
              <span className={cn(
                "text-xs",
                timeState === "past" && "text-blue-400",
                timeState === "present" && "text-green-400",
                timeState === "future" && "text-purple-400",
              )}>
                {timeState === "past" && `${formatDuration(now - currentTime)} ago`}
                {timeState === "present" && "Live"}
                {timeState === "future" && `+${formatDuration(currentTime - now)}`}
              </span>
            </div>
            
            {/* Loading/cache indicator */}
            {isLoading && (
              <Badge variant="outline" className="animate-pulse bg-yellow-500/20">
                Loading...
              </Badge>
            )}
            {cacheSource && !isLoading && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  cacheSource === "memory" && "bg-green-500/20 text-green-400",
                  cacheSource === "indexeddb" && "bg-blue-500/20 text-blue-400",
                  cacheSource === "redis" && "bg-purple-500/20 text-purple-400",
                  cacheSource === "api" && "bg-gray-500/20 text-gray-400",
                )}
              >
                {cacheSource}
              </Badge>
            )}
          </div>
          
          {/* Zoom and scale controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={zoomIn}
              disabled={scale === "hours"}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="min-w-[60px] justify-center">
              {scale}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={zoomOut}
              disabled={scale === "months"}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Timeline slider with event markers */}
        <div className="relative mb-3" ref={sliderRef}>
          {/* Background gradient showing past/future */}
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-900/30 to-transparent"
              style={{ 
                width: `${Math.min(100, ((now - effectiveMinTime) / (effectiveMaxTime - effectiveMinTime)) * 100)}%` 
              }}
            />
            <div 
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-purple-900/30 to-transparent"
              style={{ 
                width: `${Math.max(0, 100 - ((now - effectiveMinTime) / (effectiveMaxTime - effectiveMinTime)) * 100)}%` 
              }}
            />
          </div>
          
          {/* Event markers */}
          {eventPositions.map(event => (
            <div
              key={event.id}
              className={cn(
                "absolute top-0 bottom-0 w-1 rounded cursor-pointer transition-transform hover:scale-x-150",
                getSeverityColor(event.severity),
              )}
              style={{ left: `${event.position}%` }}
              title={`${event.label} - ${formatTime(event.timestamp)}`}
            />
          ))}
          
          {/* Now indicator */}
          {now >= effectiveMinTime && now <= effectiveMaxTime && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-green-500 pointer-events-none"
              style={{ 
                left: `${((now - effectiveMinTime) / (effectiveMaxTime - effectiveMinTime)) * 100}%` 
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full" />
            </div>
          )}
          
          {/* Slider */}
          <Slider
            value={[sliderPosition]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="py-4"
          />
        </div>
        
        {/* Time range labels */}
        <div className="flex justify-between text-xs text-slate-400 mb-3">
          <span>{formatTime(effectiveMinTime)}</span>
          <span>{formatTime(effectiveMaxTime)}</span>
        </div>
        
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Jump to start */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTimeChange(effectiveMinTime)}
            title="Jump to start"
          >
            <Rewind className="h-4 w-4" />
          </Button>
          
          {/* Step back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => stepTime("backward")}
            title="Step backward"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          {/* Play/Pause */}
          <Button
            variant="default"
            size="sm"
            onClick={togglePlay}
            className="w-12"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          {/* Step forward */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => stepTime("forward")}
            title="Step forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          {/* Jump to end */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTimeChange(effectiveMaxTime)}
            title="Jump to end"
          >
            <FastForward className="h-4 w-4" />
          </Button>
          
          {/* Divider */}
          <div className="w-px h-6 bg-slate-700 mx-2" />
          
          {/* Jump to now */}
          <Button
            variant="outline"
            size="sm"
            onClick={jumpToNow}
            className={cn(
              timeState === "present" && "bg-green-500/20 border-green-500"
            )}
          >
            <Clock className="h-4 w-4 mr-1" />
            Now
          </Button>
          
          {/* Speed control */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            title="Playback speed"
          >
            {playbackSpeed}x
          </Button>
          
          {/* Date picker */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDatePicker(!showDatePicker)}
            title="Pick date"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Date picker dropdown (simplified) */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 border-t border-slate-700 pt-3"
            >
              <input
                type="datetime-local"
                className="bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 w-full"
                value={new Date(currentTime).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  if (!isNaN(date.getTime())) {
                    onTimeChange(date.getTime())
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}