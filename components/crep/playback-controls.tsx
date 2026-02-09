"use client";

/**
 * Playback Controls Component
 * February 4, 2026
 * 
 * Timeline control for playing back historical MINDEX data
 * Allows scrubbing through historical events, weather, and entity positions
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Calendar,
  Clock,
  History,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybackControlsProps {
  // Time range for playback
  startTime?: Date;
  endTime?: Date;
  
  // Current playback state
  currentTime?: Date;
  onTimeChange?: (time: Date) => void;
  
  // Playback rate
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  
  // Data loading
  isLoading?: boolean;
  onLoadData?: (start: Date, end: Date) => Promise<void>;
  
  // Event handlers
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: Date) => void;
  onLive?: () => void;
  
  // Display options
  className?: string;
  collapsed?: boolean;
  showDatePicker?: boolean;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 30, 60];

export function PlaybackControls({
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  playbackRate = 1,
  onPlaybackRateChange,
  isLoading = false,
  onLoadData,
  onPlay,
  onPause,
  onSeek,
  onLive,
  className,
  collapsed = false,
  showDatePicker = true,
}: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localTime, setLocalTime] = useState<Date>(currentTime || new Date());
  const [isLive, setIsLive] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1); // Default 1x
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate timeline bounds
  const timelineStart = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const timelineEnd = endTime || new Date();
  const timelineRange = timelineEnd.getTime() - timelineStart.getTime();

  // Calculate slider position (0-100)
  const sliderPosition = timelineRange > 0
    ? ((localTime.getTime() - timelineStart.getTime()) / timelineRange) * 100
    : 100;

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      onPause?.();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      setIsPlaying(true);
      setIsLive(false);
      onPlay?.();
      
      // Start playback timer
      const speed = PLAYBACK_SPEEDS[speedIndex];
      intervalRef.current = setInterval(() => {
        setLocalTime((prev) => {
          const newTime = new Date(prev.getTime() + 1000 * speed);
          if (newTime >= timelineEnd) {
            setIsPlaying(false);
            return timelineEnd;
          }
          onTimeChange?.(newTime);
          return newTime;
        });
      }, 1000);
    }
  }, [isPlaying, onPause, onPlay, speedIndex, timelineEnd, onTimeChange]);

  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    const position = value[0] / 100;
    const newTime = new Date(timelineStart.getTime() + position * timelineRange);
    setLocalTime(newTime);
    setIsLive(false);
    onTimeChange?.(newTime);
    onSeek?.(newTime);
  }, [timelineStart, timelineRange, onTimeChange, onSeek]);

  // Handle speed change
  const cycleSpeed = useCallback(() => {
    const newIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(newIndex);
    onPlaybackRateChange?.(PLAYBACK_SPEEDS[newIndex]);
  }, [speedIndex, onPlaybackRateChange]);

  // Go to live
  const goToLive = useCallback(() => {
    setIsPlaying(false);
    setIsLive(true);
    setLocalTime(new Date());
    onLive?.();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [onLive]);

  // Skip forward/backward
  const skip = useCallback((direction: "forward" | "backward", amount: number = 5 * 60 * 1000) => {
    setLocalTime((prev) => {
      const delta = direction === "forward" ? amount : -amount;
      const newTime = new Date(prev.getTime() + delta);
      const clampedTime = new Date(
        Math.max(timelineStart.getTime(), Math.min(timelineEnd.getTime(), newTime.getTime()))
      );
      onTimeChange?.(clampedTime);
      return clampedTime;
    });
    setIsLive(false);
  }, [timelineStart, timelineEnd, onTimeChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update localTime when currentTime prop changes
  useEffect(() => {
    if (currentTime && !isPlaying) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isPlaying]);

  // Collapsed view - minimal controls
  if (collapsed) {
    return (
      <div className={cn("flex items-center gap-2 bg-black/80 rounded px-3 py-2", className)}>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex-1 min-w-[100px]">
          <Slider
            value={[sliderPosition]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            disabled={isLoading}
          />
        </div>
        
        <span className="text-xs text-gray-400 min-w-[60px]">
          {formatTime(localTime)}
        </span>
        
        {isLive ? (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px]"
            onClick={goToLive}
          >
            Go Live
          </Button>
        )}
      </div>
    );
  }

  // Full controls view
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Timeline Playback
          </CardTitle>
          {isLive ? (
            <Badge variant="destructive" className="text-xs gap-1">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {formatDateTime(localTime)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Timeline slider */}
        <div className="space-y-1">
          <Slider
            value={[sliderPosition]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            disabled={isLoading}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatDateTime(timelineStart)}</span>
            <span>{formatDateTime(timelineEnd)}</span>
          </div>
        </div>
        
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-1">
          {/* Skip backward 1 hour */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => skip("backward", 60 * 60 * 1000)}
            title="Skip back 1 hour"
          >
            <Rewind className="h-4 w-4" />
          </Button>
          
          {/* Skip backward 5 min */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => skip("backward")}
            title="Skip back 5 minutes"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          {/* Play/Pause */}
          <Button
            size="icon"
            variant={isPlaying ? "destructive" : "default"}
            className="h-10 w-10"
            onClick={togglePlay}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          {/* Skip forward 5 min */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => skip("forward")}
            title="Skip forward 5 minutes"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          {/* Skip forward 1 hour */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => skip("forward", 60 * 60 * 1000)}
            title="Skip forward 1 hour"
          >
            <FastForward className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Speed and Live controls */}
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={cycleSpeed}
          >
            <Clock className="h-3 w-3" />
            {PLAYBACK_SPEEDS[speedIndex]}x
          </Button>
          
          <div className="text-xs text-center text-muted-foreground">
            {isPlaying ? "Playing" : isLive ? "Live" : "Paused"}
          </div>
          
          <Button
            size="sm"
            variant={isLive ? "default" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={goToLive}
          >
            <Radio className="h-3 w-3" />
            Live
          </Button>
        </div>
        
        {/* Current time display */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{formatDateTime(localTime)}</span>
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="text-xs text-center text-amber-500 animate-pulse">
            Loading historical data...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default PlaybackControls;
