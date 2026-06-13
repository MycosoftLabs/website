"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2, Play } from "lucide-react"
import {
  bboxKeyFromBounds,
  loadViewportEagleSources,
  type EagleViewportSource,
} from "@/lib/crep/eagle-viewport-sources"
import type { MapBoundsLike } from "@/lib/crep/viewport-revision"
import { EagleLivePreviewTile } from "./eagle-live-stream"

interface EagleEyeThumbnailGridProps {
  mapBounds: MapBoundsLike | null
  revisionKey: string | null
  assetsReady: boolean
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void
  limit?: number
  prefetchedSources?: EagleViewportSource[] | null
  prefetchedLoading?: boolean
}

function sourceLabel(source: EagleViewportSource) {
  return source.name || `${source.provider} camera`
}

function previewPriority(source: EagleViewportSource) {
  const status = String(source.source_status || "").toLowerCase()
  if (status.includes("unavailable") || status === "offline") return 100
  const provider = String(source.provider || "").toLowerCase()
  const urls = `${source.stream_url || ""} ${source.embed_url || ""} ${source.media_url || ""}`.toLowerCase()
  if (/\.m3u8(\?|$)|\/mjpeg(\?|\/|$)|\/whep(\?|\/|$)/i.test(urls)) return 0
  if (/youtube|youtu\.be|hdontap|ipcamlive|webcamtaxi/.test(urls)) return 1
  if (/earthcam/.test(urls) && (source.stream_url || source.media_url)) return 2
  if (/surfline/.test(urls) && (source.stream_url || source.media_url)) return 3
  if (/earthcam|surfline/.test(urls)) return 25
  if (/\/api\/eagle\/cam-image|\.jpe?g(\?|$)|\.png(\?|$)|\.webp(\?|$)/i.test(urls)) return 30
  if (/\/api\/eagle\/cam-snapshot|alertcalifornia|alertwildfire/.test(urls)) return 40
  if (provider === "caltrans" || provider.includes("dot")) return 45
  return 50
}

function dispatchEagleCameraClick(detail: Record<string, unknown>) {
  try {
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("crep:eagle:camera-click", { detail }))
      return
    }
  } catch {
    /* fall back below */
  }
  try {
    const event = new Event("crep:eagle:camera-click")
    ;(event as Event & { detail?: Record<string, unknown> }).detail = detail
    window.dispatchEvent(event)
  } catch {
    /* keep the fly-to behavior even if the player event cannot dispatch */
  }
}

export function openEagleCamera(
  source: EagleViewportSource,
  onFlyTo?: (lng: number, lat: number, zoom?: number) => void,
) {
  dispatchEagleCameraClick({
    id: source.id,
    name: sourceLabel(source),
    provider: source.provider,
    lat: source.lat,
    lng: source.lng,
    stream_url: source.stream_url,
    embed_url: source.embed_url,
    media_url: source.media_url,
    thumbnail_url: source.thumbnail_url,
    source_status: source.source_status,
  })
  window.setTimeout(() => onFlyTo?.(source.lng, source.lat, 12.5), 1_200)
}

function EagleEyeThumbnailGrid({
  mapBounds,
  revisionKey,
  assetsReady,
  onFlyTo,
  limit = 6,
  prefetchedSources,
  prefetchedLoading = false,
}: EagleEyeThumbnailGridProps) {
  const useParentPrefetch = prefetchedSources !== undefined
  const [sources, setSources] = useState<EagleViewportSource[]>(() => prefetchedSources ?? [])
  const [phase, setPhase] = useState<"idle" | "loading" | "ready">(() =>
    useParentPrefetch
      ? prefetchedLoading && !(prefetchedSources?.length)
        ? "loading"
        : "ready"
      : "idle",
  )
  const lastFetchedKey = useRef<string | null>(null)
  const loadGen = useRef(0)
  const lastOpenRef = useRef<{ id: string; at: number } | null>(null)

  useEffect(() => {
    if (useParentPrefetch) {
      setSources(prefetchedSources ?? [])
      setPhase(
        prefetchedLoading && !(prefetchedSources?.length)
          ? "loading"
          : prefetchedSources?.length
            ? "ready"
            : prefetchedLoading
              ? "loading"
              : "ready",
      )
      return
    }

    if (!mapBounds || !revisionKey || !assetsReady) return

    const fetchKey = `${revisionKey}:${bboxKeyFromBounds(mapBounds)}`
    if (lastFetchedKey.current === fetchKey) return

    const controller = new AbortController()
    const gen = ++loadGen.current
    setPhase("loading")

    void loadViewportEagleSources(
      mapBounds,
      limit,
      (next, loadPhase) => {
        if (gen !== loadGen.current) return
        setSources(next)
        setPhase(next.length ? "ready" : loadPhase === "full" ? "ready" : "loading")
      },
      controller.signal,
    )
      .then(() => {
        if (gen !== loadGen.current) return
        lastFetchedKey.current = fetchKey
        setPhase("ready")
      })
      .catch((error) => {
        if ((error as Error)?.name === "AbortError") return
        if (gen !== loadGen.current) return
        setPhase("ready")
        console.warn("[EagleEyeThumbnailGrid] load failed:", (error as Error)?.message)
      })

    return () => {
      controller.abort()
    }
  }, [mapBounds, revisionKey, assetsReady, limit, useParentPrefetch, prefetchedSources, prefetchedLoading])

  const openCamera = useCallback(
    (source: EagleViewportSource) => {
      const now = Date.now()
      if (lastOpenRef.current?.id === source.id && now - lastOpenRef.current.at < 500) return
      lastOpenRef.current = { id: source.id, at: now }
      openEagleCamera(source, onFlyTo)
    },
    [onFlyTo],
  )

  const previewSources = useMemo(
    () => [...sources].sort((a, b) => previewPriority(a) - previewPriority(b)),
    [sources],
  )
  const slots = Array.from({ length: limit }, (_, i) => previewSources[i] ?? null)
  const statusLabel =
    phase === "loading" && sources.length === 0
      ? "loading…"
      : phase === "loading"
        ? `${sources.length} · updating…`
        : `${sources.length} in view`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-200">Eagle Eye</span>
        </div>
        <span className="text-[8px] text-gray-500">{statusLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {slots.map((source, index) => (
          <button
            key={source?.id || `empty-${index}`}
            type="button"
            disabled={!source}
            onPointerDown={(event) => {
              if (!source || event.button !== 0) return
              event.stopPropagation()
            }}
            onClick={(event) => {
              if (!source) return
              event.preventDefault()
              event.stopPropagation()
              openCamera(source)
            }}
            onKeyDown={(event) => {
              if (!source || (event.key !== "Enter" && event.key !== " ")) return
              event.preventDefault()
              event.stopPropagation()
              openCamera(source)
            }}
            className="group relative min-h-[52px] aspect-video overflow-hidden rounded border border-cyan-500/25 bg-black/50 transition-colors hover:border-cyan-400/60 disabled:cursor-default disabled:opacity-40 touch-manipulation pointer-events-auto"
            title={source ? `${sourceLabel(source)} — tap to fly & play live` : "No camera in view"}
            aria-label={source ? `Fly to ${sourceLabel(source)}` : "Empty camera slot"}
          >
            {source ? (
              <>
                <EagleLivePreviewTile
                  source={source}
                  deferMs={index * 900}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-0.5">
                  <div className="truncate text-[7px] font-medium text-white">{sourceLabel(source)}</div>
                  <div className="truncate text-[6px] text-cyan-300/80">{source.provider}</div>
                </div>
                <div className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <Play className="h-2.5 w-2.5 text-cyan-300" />
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[7px] text-gray-600">
                {phase === "loading" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-500/50" />
                ) : (
                  "—"
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(EagleEyeThumbnailGrid)
