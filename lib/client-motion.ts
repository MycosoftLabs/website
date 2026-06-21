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

/** Poster-only when user prefers reduced motion — never tablet/phone-only. */
export function shouldUsePosterOnlyVideo() {
  return prefersReducedVisualMotion()
}

export function useTabletLikeDevice() {
  const [tabletLike, setTabletLike] = useState(false)
  useEffect(() => {
    setTabletLike(isTabletLikeDevice())
  }, [])
  return tabletLike
}

/** Allow hero/tile video on all devices; only block when user prefers reduced motion. */
export function useAllowRichHomeMedia() {
  const [allow, setAllow] = useState(true)
  useEffect(() => {
    setAllow(!prefersReducedVisualMotion())
  }, [])
  return allow
}

