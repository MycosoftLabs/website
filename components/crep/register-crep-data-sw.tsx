"use client"

/**
 * Registers a narrow service worker that caches same-origin GET /data/crep/*
 * (GeoJSON) for faster repeat visits. Apr 17, 2026.
 */
import { useEffect } from "react"

export function RegisterCrepDataServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV === "development") {
      // Avoid stale GeoJSON while iterating locally
      return
    }
    void navigator.serviceWorker.register("/sw-crep-data.js", { scope: "/" }).catch(() => {})
  }, [])
  return null
}
