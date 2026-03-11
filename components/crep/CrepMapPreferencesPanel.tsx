"use client"

/**
 * CREP Map Preferences Panel
 *
 * Save/load map state (bounds, zoom, layers, ground filter) to Supabase
 * via /api/crep/preferences. Requires authenticated user.
 *
 * @see app/api/crep/preferences/route.ts
 */

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Save, Download, Loader2 } from "lucide-react"
import type { GroundFilter } from "@/components/crep/map-controls"

export interface CrepMapPreferences {
  bounds?: { north: number; south: number; east: number; west: number } | null
  center_lat?: number | null
  center_lng?: number | null
  zoom?: number | null
  layers?: string[] | null
  kingdom_filter?: string | null
}

interface LayerConfig {
  id: string
  enabled: boolean
}

interface CrepMapPreferencesPanelProps {
  mapRef: unknown
  mapBounds: { north: number; south: number; east: number; west: number } | null
  mapZoom: number
  layers: LayerConfig[]
  groundFilter: GroundFilter
  onApply: (prefs: CrepMapPreferences) => void
  className?: string
}

export function CrepMapPreferencesPanel({
  mapRef,
  mapBounds,
  mapZoom,
  layers,
  groundFilter,
  onApply,
  className,
}: CrepMapPreferencesPanelProps) {
  const [loading, setLoading] = useState<"save" | "load" | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const clearMessage = useCallback(() => {
    setMessage(null)
  }, [])

  const handleLoad = useCallback(async () => {
    setLoading("load")
    setMessage(null)
    try {
      const res = await fetch("/api/crep/preferences?name=default")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      if (!data.authenticated) {
        setMessage("Sign in to load saved preferences")
        return
      }
      const prefs = data.preferences as CrepMapPreferences | null
      if (!prefs) {
        setMessage("No saved preferences")
        return
      }
      onApply(prefs)
      setMessage("Preferences applied")
      setTimeout(clearMessage, 2000)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed")
    } finally {
      setLoading(null)
    }
  }, [onApply, clearMessage])

  const handleSave = useCallback(async () => {
    setLoading("save")
    setMessage(null)
    try {
      const map = mapRef as maplibregl.Map | null
      let center_lng: number | null = null
      let center_lat: number | null = null
      let zoom: number = mapZoom
      if (map) {
        const c = map.getCenter()
        center_lng = c.lng
        center_lat = c.lat
        zoom = map.getZoom()
      } else if (mapBounds) {
        center_lat = (mapBounds.north + mapBounds.south) / 2
        center_lng = (mapBounds.east + mapBounds.west) / 2
      }

      const enabledLayerIds = layers.filter((l) => l.enabled).map((l) => l.id)
      const kingdom_filter = JSON.stringify(groundFilter)

      const res = await fetch("/api/crep/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "default",
          bounds: mapBounds ?? null,
          center_lat: center_lat ?? null,
          center_lng: center_lng ?? null,
          zoom: zoom ?? 8,
          layers: enabledLayerIds,
          kingdom_filter,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setMessage("Sign in to save preferences")
          return
        }
        throw new Error(data.error || "Failed to save")
      }
      setMessage("Preferences saved")
      setTimeout(clearMessage, 2000)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed")
    } finally {
      setLoading(null)
    }
  }, [mapRef, mapBounds, mapZoom, layers, groundFilter, clearMessage])

  return (
    <div
      className={
        className ??
        "flex flex-col gap-1.5 rounded-lg border border-border/50 bg-background/95 p-2 backdrop-blur-sm"
      }
    >
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={handleLoad}
          disabled={loading !== null}
        >
          {loading === "load" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Load
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={handleSave}
          disabled={loading !== null}
        >
          {loading === "save" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
