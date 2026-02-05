"use client";

/**
 * Forecast Timeline Component
 * February 4, 2026
 * 
 * Timeline slider for animating Earth-2 forecast data
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ForecastTimelineProps {
  minHours: number;
  maxHours: number;
  stepHours: number;
  currentHours: number;
  onTimeChange: (hours: number) => void;
  modelType: "forecast" | "nowcast";
  forecastStartTime?: Date;
  isLoading?: boolean;
}

export function ForecastTimeline({
  minHours,
  maxHours,
  stepHours,
  currentHours,
  onTimeChange,
  modelType,
  forecastStartTime = new Date(),
  isLoading = false,
}: ForecastTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate current forecast time
  const getForecastTime = useCallback(
    (hours: number) => {
      const time = new Date(forecastStartTime);
      time.setHours(time.getHours() + hours);
      return time;
    },
    [forecastStartTime]
  );

  // Format time display
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `Tomorrow ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Playback controls
  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  const reset = () => {
    setIsPlaying(false);
    onTimeChange(minHours);
  };
  const skipForward = () => {
    const nextHours = Math.min(currentHours + stepHours, maxHours);
    onTimeChange(nextHours);
  };
  const skipBack = () => {
    const prevHours = Math.max(currentHours - stepHours, minHours);
    onTimeChange(prevHours);
  };
  const toggleSpeed = () => {
    setPlaybackSpeed((s) => (s >= 4 ? 1 : s * 2));
  };

  // Animation loop - uses currentHours prop and onTimeChange callback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const next = currentHours + stepHours;
        if (next > maxHours) {
          setIsPlaying(false);
          onTimeChange(minHours);
        } else {
          onTimeChange(next);
        }
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, stepHours, maxHours, minHours, onTimeChange, currentHours]);

  const currentTime = getForecastTime(currentHours);
  const progress = ((currentHours - minHours) / (maxHours - minHours)) * 100;

  return (
    <div className="bg-black/90 border border-emerald-500/30 rounded-lg p-3 backdrop-blur-sm">
      {/* Time Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400/70 uppercase">
            {modelType === "nowcast" ? "Nowcast" : "Forecast"}
          </span>
          <span
            className={cn(
              "text-xs font-mono",
              isLoading ? "text-yellow-400" : "text-emerald-400"
            )}
          >
            +{currentHours}h
          </span>
        </div>
        <span className="text-xs text-white">{formatTime(currentTime)}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-2">
        <Slider
          min={minHours}
          max={maxHours}
          step={stepHours}
          value={[currentHours]}
          onValueChange={([v]) => onTimeChange(v)}
          disabled={isLoading}
          className="w-full"
        />
        {/* Time markers */}
        <div className="flex justify-between mt-1 text-[9px] text-gray-500">
          <span>Now</span>
          {modelType === "nowcast" ? (
            <>
              <span>+2h</span>
              <span>+4h</span>
              <span>+6h</span>
            </>
          ) : (
            <>
              <span>+1d</span>
              <span>+3d</span>
              <span>+5d</span>
              <span>+7d</span>
            </>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="h-7 w-7 p-0 hover:bg-emerald-500/20"
        >
          <SkipBack className="w-3.5 h-3.5 text-emerald-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={skipBack}
          className="h-7 w-7 p-0 hover:bg-emerald-500/20"
        >
          <SkipBack className="w-3 h-3 text-emerald-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? pause : play}
          disabled={isLoading}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isPlaying
              ? "bg-emerald-500/30 hover:bg-emerald-500/40"
              : "hover:bg-emerald-500/20"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-emerald-400" />
          ) : (
            <Play className="w-4 h-4 text-emerald-400 ml-0.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={skipForward}
          className="h-7 w-7 p-0 hover:bg-emerald-500/20"
        >
          <SkipForward className="w-3 h-3 text-emerald-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSpeed}
          className="h-7 px-2 hover:bg-emerald-500/20"
        >
          <FastForward className="w-3 h-3 text-emerald-400 mr-1" />
          <span className="text-[10px] text-emerald-400">{playbackSpeed}x</span>
        </Button>
      </div>

      {/* Validity Info */}
      <div className="mt-2 pt-2 border-t border-emerald-500/20 text-center">
        <span className="text-[10px] text-gray-500">
          Valid: {formatTime(forecastStartTime)} —{" "}
          {formatTime(getForecastTime(maxHours))}
        </span>
      </div>
    </div>
  );
}

export default ForecastTimeline;
