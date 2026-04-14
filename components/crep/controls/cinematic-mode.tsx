"use client"

/**
 * Cinematic Mode — Auto-rotating globe view
 *
 * Slowly rotates the globe when enabled, pauses on user interaction,
 * resumes after idle timeout.
 */

import { useEffect, useRef, useCallback } from "react"
import { Film, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface CinematicModeProps {
  map: any // maplibregl.Map
  enabled: boolean
  onToggle: () => void
  rotationSpeed?: number // degrees per second
  idleResumeMs?: number // resume after this many ms of no interaction
}

export function CinematicMode({
  map,
  enabled,
  onToggle,
  rotationSpeed = 2,
  idleResumeMs = 5000,
}: CinematicModeProps) {
  const animRef = useRef<number | null>(null)
  const pausedRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rotate = useCallback(() => {
    if (!map || !enabled || pausedRef.current) return
    const center = map.getCenter()
    map.setCenter([center.lng + rotationSpeed / 60, center.lat])
    animRef.current = requestAnimationFrame(rotate)
  }, [map, enabled, rotationSpeed])

  useEffect(() => {
    if (!map || !enabled) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    // Start rotation
    pausedRef.current = false
    animRef.current = requestAnimationFrame(rotate)

    // Pause on user interaction
    const onInteraction = () => {
      pausedRef.current = true
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        pausedRef.current = false
        animRef.current = requestAnimationFrame(rotate)
      }, idleResumeMs)
    }

    map.on("mousedown", onInteraction)
    map.on("touchstart", onInteraction)
    map.on("wheel", onInteraction)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      map.off("mousedown", onInteraction)
      map.off("touchstart", onInteraction)
      map.off("wheel", onInteraction)
    }
  }, [map, enabled, rotate, idleResumeMs])

  return (
    <button
      onClick={onToggle}
      className={cn(
        "p-2 rounded-lg border transition-all",
        enabled
          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
          : "bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300"
      )}
      title={enabled ? "Stop cinematic view" : "Cinematic view"}
    >
      {enabled ? <Pause className="w-4 h-4" /> : <Film className="w-4 h-4" />}
    </button>
  )
}
