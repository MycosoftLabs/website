"use client"

export function prefersReducedVisualMotion() {
  if (typeof window === "undefined") return true

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return true

  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 1024
}

export function shouldUseLightweightVisuals() {
  return prefersReducedVisualMotion() || isCoarsePointerDevice()
}

