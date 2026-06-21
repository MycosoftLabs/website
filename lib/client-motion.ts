"use client"

import { useEffect, useState } from "react"

export function prefersReducedVisualMotion() {
  if (typeof window === "undefined") return true

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** iPad / tablet — matches Earth Simulator perf-class (maxTouchPoints is reliable on iPadOS). */
export function isTabletLikeDevice() {
  if (typeof window === "undefined") return false
  const width = window.innerWidth || 1440
  const height = window.innerHeight || width
  const touch = (navigator.maxTouchPoints ?? 0) > 1
  const shortEdge = Math.min(width, height)
  if (shortEdge <= 540) return false
  const coarse = window.matchMedia("(pointer: coarse)").matches
  return touch || coarse || width <= 1180
}

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return true

  return window.matchMedia("(pointer: coarse)").matches || isTabletLikeDevice()
}

export function shouldUseLightweightVisuals() {
  return prefersReducedVisualMotion() || isCoarsePointerDevice()
}

/** Poster-only video on tablet/iPad — avoids multiple simultaneous decoders. */
export function shouldUsePosterOnlyVideo() {
  return shouldUseLightweightVisuals() && isTabletLikeDevice()
}

export function useTabletLikeDevice() {
  const [tabletLike, setTabletLike] = useState(false)
  useEffect(() => {
    setTabletLike(isTabletLikeDevice())
  }, [])
  return tabletLike
}

