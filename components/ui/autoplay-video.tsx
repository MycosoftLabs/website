"use client"

/**
 * AutoplayVideo — Hero/background videos with optional multi-source fallback.
 * Tries smaller / alternate URLs first when `sources` is set; on error or stall,
 * advances to the next source. Dev: rewrites /assets/ to production host.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { encodeAssetUrl } from "@/lib/encode-asset-url"

/**
 * NAS / Docker can serve 200 + Content-Length: 0 for missing uploads — HEAD-skip before <video> stalls.
 * Only same-origin: cross-origin HEAD from localhost hits CORS and tells us nothing.
 */
function shouldProbeEmptyMp4(url: string): boolean {
  if (typeof url !== "string" || !url) return false
  if (typeof window === "undefined") return false
  try {
    const u = new URL(url, window.location.href)
    if (u.origin !== window.location.origin) return false
    return u.pathname.startsWith("/assets/") && u.pathname.toLowerCase().endsWith(".mp4")
  } catch {
    return false
  }
}

/**
 * Dev: `/assets/*` has no NAS on localhost unless you copy files into `public/assets`.
 * - Unset `NEXT_PUBLIC_DEV_ASSETS_ORIGIN` → prefix `https://mycosoft.com` (matches prod assets).
 * - `NEXT_PUBLIC_DEV_ASSETS_ORIGIN=local` (or `same`) → keep same-origin for real local files.
 * - Any other value → that origin (e.g. sandbox).
 */
function resolveAssetUrl(src: string, isDev: boolean): string {
  if (typeof src !== "string" || !src) return ""
  if (!isDev || !src.startsWith("/assets/")) return src
  const raw = process.env.NEXT_PUBLIC_DEV_ASSETS_ORIGIN?.trim().toLowerCase()
  if (raw === "local" || raw === "same") return src
  const origin = (process.env.NEXT_PUBLIC_DEV_ASSETS_ORIGIN || "https://mycosoft.com").replace(/\/$/, "")
  return `${origin}${src}`
}

function normalizeSources(
  src: string | undefined,
  sources: string[] | undefined,
  isDev: boolean,
  encodeSrc: boolean
): string[] {
  const combined: unknown[] = [
    ...(Array.isArray(sources) ? sources : []),
    ...(typeof src === "string" && src ? [src] : []),
  ]
  const raw = combined.flat(Infinity).filter((x) => x != null && x !== "")
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of raw) {
    if (typeof u !== "string") continue
    const resolved = resolveAssetUrl(u, isDev)
    if (!resolved) continue
    const safe = encodeSrc ? encodeAssetUrl(resolved) : resolved
    if (typeof safe !== "string" || !safe) continue
    if (!seen.has(safe)) {
      seen.add(safe)
      out.push(safe)
    }
  }
  return out
}

interface AutoplayVideoProps {
  /** Primary URL (backward compatible) */
  src?: string
  /** Ordered fallbacks — try first entries first (e.g. smaller `-web` before full file) */
  sources?: string[]
  className?: string
  style?: CSSProperties
  /** Encode URL segments (paths with spaces). Default true */
  encodeSrc?: boolean
  /** If playback does not reach HAVE_FUTURE_DATA within this many ms, try next source */
  stallTimeoutMs?: number
  /**
   * Opacity 0 until `playing` — use over a poster image so missing/broken sources do not flash black.
   * When every source fails, the component unmounts (`return null`).
   */
  hideUntilPlaying?: boolean
  /** Video preload strategy. "auto" for hero videos (faster start), "metadata" for below-fold. Default "auto" */
  preload?: "auto" | "metadata" | "none"
}

export function AutoplayVideo({
  src,
  sources,
  className = "",
  style,
  encodeSrc = true,
  stallTimeoutMs = 12000,
  hideUntilPlaying = false,
  preload = "auto",
}: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isDev = process.env.NODE_ENV === "development"
  const list = useMemo(
    () => normalizeSources(src, sources, isDev, encodeSrc),
    [src, sources, isDev, encodeSrc]
  )
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [allFailed, setAllFailed] = useState(false)
  const activeSrc = list[index] ?? ""
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
    setAllFailed(false)
  }, [list.join("|")])

  // Skip zero-byte MP4s (origin often returns 200 + CL:0 for empty NAS files).
  // Runs in parallel with video load — does NOT block playback. If the probe
  // detects CL:0 before the video element loads, we advance immediately.
  useEffect(() => {
    if (!activeSrc || !shouldProbeEmptyMp4(activeSrc)) return
    let cancelled = false
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(activeSrc, {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        })
        const cl = r.headers.get("content-length")
        if (cancelled) return
        // Advance on zero-byte or 404/5xx
        if (!r.ok || cl === "0") {
          setIndex((i) => {
            const L = listRef.current
            return i + 1 < L.length ? i + 1 : i
          })
        }
      } catch {
        /* ignore — fall through to normal video load */
      }
    })()
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [activeSrc])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !activeSrc) return

    const tryPlay = () => {
      v.play().catch(() => {})
    }
    tryPlay()
    const onTouch = () => tryPlay()
    document.addEventListener("touchstart", onTouch, { once: true })

    let stallTimer: ReturnType<typeof setTimeout> | undefined
    const clearStall = () => {
      if (stallTimer) clearTimeout(stallTimer)
      stallTimer = undefined
    }
    const scheduleStall = () => {
      clearStall()
      stallTimer = setTimeout(() => {
        if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && v.currentTime === 0) {
          const L = listRef.current
          setIndex((i) => {
            if (i + 1 < L.length) return i + 1
            if (hideUntilPlaying) setAllFailed(true)
            return i
          })
        }
      }, stallTimeoutMs)
    }

    const onCanPlay = () => clearStall()
    const onPlaying = () => {
      clearStall()
      if (hideUntilPlaying) setPlaying(true)
    }
    const onWaiting = () => scheduleStall()
    const onError = () => {
      clearStall()
      const L = listRef.current
      setIndex((i) => {
        if (i + 1 < L.length) return i + 1
        if (hideUntilPlaying) setAllFailed(true)
        return i
      })
    }
    const onLoadedMetadata = () => {
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) {
        setIndex((i) => {
          if (i + 1 < L.length) return i + 1
          if (hideUntilPlaying) setAllFailed(true)
          return i
        })
      }
    }

    v.addEventListener("canplay", onCanPlay)
    v.addEventListener("playing", onPlaying)
    v.addEventListener("waiting", onWaiting)
    v.addEventListener("error", onError)
    v.addEventListener("loadedmetadata", onLoadedMetadata)
    scheduleStall()

    return () => {
      clearStall()
      document.removeEventListener("touchstart", onTouch)
      v.removeEventListener("canplay", onCanPlay)
      v.removeEventListener("playing", onPlaying)
      v.removeEventListener("waiting", onWaiting)
      v.removeEventListener("error", onError)
      v.removeEventListener("loadedmetadata", onLoadedMetadata)
    }
  }, [activeSrc, stallTimeoutMs, hideUntilPlaying])

  if (!activeSrc) return null
  if (hideUntilPlaying && allFailed) return null

  const visibilityClass =
    hideUntilPlaying && !playing ? "opacity-0" : hideUntilPlaying ? "opacity-100 transition-opacity duration-500" : ""

  return (
    <video
      key={activeSrc}
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      className={[className, visibilityClass].filter(Boolean).join(" ")}
      style={style}
    >
      <source src={activeSrc} type="video/mp4" />
    </video>
  )
}
