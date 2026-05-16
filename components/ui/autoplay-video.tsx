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
 * Dev asset resolution: SAME-ORIGIN ONLY.
 *
 * We used to add `https://mycosoft.com` as a cross-origin fallback in dev so
 * videos would still play without the full NAS mount. But the browser
 * CORS-blocks those fetches (ERR_BLOCKED_BY_ORB), the video fires `error`,
 * AutoplayVideo advances to the next source, key={activeSrc} remounts the
 * <video>, new load begins — and every few hundred milliseconds this loop
 * saturates the browser's network queue with hundreds of aborted requests,
 * starving the RSC fetch that Next.js needs for client-side navigation.
 *
 * Symptom: first click on a header link from / updates the URL via
 * history.pushState but the React tree never updates because the /about
 * RSC fetch was aborted by the video storm. Only a second click (after the
 * storm quiets) completes navigation.
 *
 * Opt-in cross-origin fallback: set NEXT_PUBLIC_DEV_ASSETS_ORIGIN=<url> to
 * an origin that serves /assets/* with proper CORS headers.
 */
function resolveAssetUrls(src: string, isDev: boolean): string[] {
  if (typeof src !== "string" || !src) return []
  if (!isDev || !src.startsWith("/assets/")) return [src]
  const raw = process.env.NEXT_PUBLIC_DEV_ASSETS_ORIGIN?.trim() || ""
  const lowered = raw.toLowerCase()
  if (!raw || lowered === "local" || lowered === "same") return [src]
  // Only add the cross-origin variant if the operator explicitly configures it.
  const origin = raw.replace(/\/$/, "")
  return [src, `${origin}${src}`]
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
    const resolvedCandidates = resolveAssetUrls(u, isDev)
    for (const resolved of resolvedCandidates) {
      if (!resolved) continue
      const safe = encodeSrc ? encodeAssetUrl(resolved) : resolved
      if (typeof safe !== "string" || !safe) continue
      if (!seen.has(safe)) {
        seen.add(safe)
        out.push(safe)
      }
    }
  }
  return out
}

function sidecarPosterForVideo(src: string): string | undefined {
  if (!src) return undefined
  try {
    const url = /^https?:\/\//i.test(src) ? new URL(src) : null
    const pathOnly = url ? url.pathname : src.split(/[?#]/, 1)[0]
    if (!pathOnly.startsWith("/assets/")) return undefined
    if (!/\.(mp4|mov|webm)$/i.test(pathOnly)) return undefined
    const posterPath = pathOnly.replace(/\.(mp4|mov|webm)$/i, "-poster.jpg")
    if (url) {
      url.pathname = posterPath
      return url.toString()
    }
    const suffix = src.slice(pathOnly.length)
    return `${posterPath}${suffix}`
  } catch {
    return undefined
  }
}

function mediaTypeForVideo(src: string): string {
  const path = src.split(/[?#]/, 1)[0]?.toLowerCase() || ""
  if (path.endsWith(".webm")) return "video/webm"
  if (path.endsWith(".mov")) return "video/quicktime"
  return "video/mp4"
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
  /** Video preload strategy. Use "auto" only for true first-viewport hero videos. Default "metadata" */
  preload?: "auto" | "metadata" | "none"
  /** Still image until first frame decodes (faster perceived hero load). */
  poster?: string
  /** Skip the same-origin empty-file HEAD probe for hot, visible media. */
  probeEmptyMp4?: boolean
  /**
   * When true (default), the video does not receive pointer events so full-bleed heroes
   * do not sit above the footer/header stack and eat the first tap/click.
   * Parent `pointer-events-none` alone does NOT disable hits on child video elements.
   */
  pointerEventsNone?: boolean
}

export function AutoplayVideo({
  src,
  sources,
  className = "",
  style,
  encodeSrc = true,
  stallTimeoutMs = 12000,
  hideUntilPlaying = false,
  preload = "metadata",
  pointerEventsNone = true,
  poster,
  probeEmptyMp4 = true,
}: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lazyProbeRef = useRef<HTMLDivElement>(null)
  const isDev = process.env.NODE_ENV === "development"
  const list = useMemo(
    () => normalizeSources(src, sources, isDev, encodeSrc),
    [src, sources, isDev, encodeSrc]
  )
  const sourcesKey = useMemo(() => list.join("|"), [list])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [allFailed, setAllFailed] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(preload === "auto")
  const [retryToken, setRetryToken] = useState(0)
  const activeSrc = list[index] ?? ""
  const listRef = useRef(list)
  const retryCountRef = useRef(0)
  listRef.current = list

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
    setAllFailed(false)
    setShouldLoad(preload === "auto")
    setRetryToken(0)
    retryCountRef.current = 0
  }, [sourcesKey, preload])

  useEffect(() => {
    retryCountRef.current = 0
  }, [activeSrc])

  useEffect(() => {
    if (preload === "auto" || shouldLoad) return
    const target = lazyProbeRef.current
    if (!target) return
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "1400px 0px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [preload, shouldLoad])

  // Skip zero-byte MP4s (origin often returns 200 + CL:0 for empty NAS files).
  // Runs in parallel with video load — does NOT block playback. If the probe
  // detects CL:0 before the video element loads, we advance immediately.
  useEffect(() => {
    if (!probeEmptyMp4 || !shouldLoad || !activeSrc || !shouldProbeEmptyMp4(activeSrc)) return
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
  }, [activeSrc, shouldLoad, probeEmptyMp4])

  useEffect(() => {
    const v = videoRef.current
    if (!shouldLoad || !v || !activeSrc) return

    const tryPlay = () => {
      if (v.readyState === HTMLMediaElement.HAVE_NOTHING) {
        v.load()
      }
      v.play().catch(() => {})
    }
    const restartLoopIfNeeded = () => {
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) return false
      if (v.currentTime < Math.max(0, dur - 0.18)) return false
      try {
        v.currentTime = 0
      } catch {
        return false
      }
      tryPlay()
      return true
    }
    tryPlay()
    const onTouch = () => tryPlay()
    document.addEventListener("touchstart", onTouch, { once: true })

    let stallTimer: ReturnType<typeof setTimeout> | undefined
    let progressTimer: ReturnType<typeof setInterval> | undefined
    let lastProgressTime = v.currentTime
    let stalledTicks = 0
    const clearStall = () => {
      if (stallTimer) clearTimeout(stallTimer)
      stallTimer = undefined
    }
    const scheduleStall = () => {
      clearStall()
      const startTime = v.currentTime
      stallTimer = setTimeout(() => {
        if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && v.currentTime <= startTime + 0.04) {
          if (restartLoopIfNeeded()) return
          advanceOrRetry()
        }
      }, stallTimeoutMs)
    }
    const advanceOrRetry = () => {
      clearStall()
      const L = listRef.current
      setPlaying(false)
      setIndex((i) => {
        if (i + 1 < L.length) {
          retryCountRef.current = 0
          return i + 1
        }
        if (retryCountRef.current < 2) {
          retryCountRef.current += 1
          setRetryToken((token) => token + 1)
          return i
        }
        if (hideUntilPlaying) setAllFailed(true)
        return i
      })
    }

    const onCanPlay = () => clearStall()
    const onPlaying = () => {
      clearStall()
      retryCountRef.current = 0
      if (hideUntilPlaying) setPlaying(true)
    }
    const onWaiting = () => scheduleStall()
    const onEnded = () => {
      if (!restartLoopIfNeeded()) advanceOrRetry()
    }
    // Only advance on terminal media errors (MEDIA_ERR_SRC_NOT_SUPPORTED /
    // MEDIA_ERR_NETWORK). Aborted requests during navigation show up as
    // generic `error` events too — advancing on those causes a remount loop
    // that storms the network and starves out other fetches.
    const onError = () => {
      const code = v.error?.code
      const terminal =
        code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
        code === MediaError.MEDIA_ERR_NETWORK
      if (!terminal) return
      advanceOrRetry()
    }
    const onLoadedMetadata = () => {
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) {
        advanceOrRetry()
      }
    }
    const monitorProgress = () => {
      if (v.paused || v.seeking) {
        lastProgressTime = v.currentTime
        stalledTicks = 0
        return
      }
      if (restartLoopIfNeeded()) {
        lastProgressTime = 0
        stalledTicks = 0
        return
      }
      if (Math.abs(v.currentTime - lastProgressTime) < 0.03) {
        stalledTicks += 1
        if (stalledTicks >= 2 && v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          advanceOrRetry()
        }
        return
      }
      lastProgressTime = v.currentTime
      stalledTicks = 0
    }

    v.addEventListener("canplay", onCanPlay)
    v.addEventListener("playing", onPlaying)
    v.addEventListener("waiting", onWaiting)
    v.addEventListener("ended", onEnded)
    v.addEventListener("error", onError)
    v.addEventListener("loadedmetadata", onLoadedMetadata)
    scheduleStall()
    progressTimer = setInterval(monitorProgress, 700)

    return () => {
      clearStall()
      if (progressTimer) clearInterval(progressTimer)
      document.removeEventListener("touchstart", onTouch)
      v.removeEventListener("canplay", onCanPlay)
      v.removeEventListener("playing", onPlaying)
      v.removeEventListener("waiting", onWaiting)
      v.removeEventListener("ended", onEnded)
      v.removeEventListener("error", onError)
      v.removeEventListener("loadedmetadata", onLoadedMetadata)
    }
  }, [activeSrc, stallTimeoutMs, hideUntilPlaying, shouldLoad, retryToken])

  if (!activeSrc) return null
  const derivedPoster = sidecarPosterForVideo(activeSrc)
  const rawPoster = typeof poster === "string" && poster ? poster : derivedPoster
  const posterAttr =
    typeof rawPoster === "string" && rawPoster
      ? encodeSrc
        ? encodeAssetUrl(rawPoster)
        : rawPoster
      : undefined

  if (hideUntilPlaying && allFailed) {
    if (!posterAttr) return null
    return (
      <div
        aria-hidden="true"
        className={[className, pointerEventsNone ? "pointer-events-none" : ""].filter(Boolean).join(" ")}
        style={{
          ...style,
          backgroundImage: `url("${posterAttr}")`,
          backgroundSize: style?.backgroundSize || "cover",
          backgroundPosition: style?.backgroundPosition || "center",
        }}
      />
    )
  }

  const visibilityClass =
    hideUntilPlaying && !playing && !posterAttr
      ? "opacity-0"
      : hideUntilPlaying
        ? "opacity-100 transition-opacity duration-500"
        : ""
  const pointerClass = pointerEventsNone ? "pointer-events-none" : ""

  return (
    shouldLoad ? (
    <video
      key={`${activeSrc}:${retryToken}`}
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      poster={posterAttr}
      preload={preload}
      className={[className, visibilityClass, pointerClass].filter(Boolean).join(" ")}
      style={style}
    >
      <source src={activeSrc} type={mediaTypeForVideo(activeSrc)} />
    </video>
    ) : (
      <div
        ref={lazyProbeRef}
        aria-hidden="true"
        className={[className, pointerClass].filter(Boolean).join(" ")}
        style={{
          ...style,
          backgroundImage: posterAttr ? `url("${posterAttr}")` : style?.backgroundImage,
          backgroundSize: style?.backgroundSize || "cover",
          backgroundPosition: style?.backgroundPosition || "center",
        }}
      />
    )
  )
}
