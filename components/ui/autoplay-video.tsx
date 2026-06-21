"use client"

/**
 * AutoplayVideo — Hero/background videos with optional multi-source fallback.
 * Tries smaller / alternate URLs first when `sources` is set; on error or stall,
 * advances to the next source. Dev: rewrites /assets/ to production host.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { YoutubeHeroBackground } from "@/components/ui/youtube-hero-background"

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
  /** Muted background-only YouTube fallback, used only after first-party sources fail or freeze. */
  youtubeFallbackId?: string
  /** How long a visible, already-started video may stop advancing before recovery/fallback. */
  fallbackAfterFreezeMs?: number
  /** IntersectionObserver root margin for non-auto videos. */
  lazyRootMargin?: string
  /** Pause non-critical videos while they are offscreen so long sessions do not keep every decoder hot. */
  pauseWhenOutsideViewport?: boolean
  /** Remove the video element after it leaves the viewport, instead of keeping a paused decoder warm. */
  unloadWhenOutsideViewport?: boolean
  /** Prewarm a second copy near the loop seam so long-running hero videos do not visibly hitch at reset. */
  smoothLoop?: boolean
  /** Skip the 1.25s progressWatch interval (saves CPU on iPad with multiple videos). */
  disableProgressWatch?: boolean
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
  youtubeFallbackId,
  fallbackAfterFreezeMs = 5000,
  lazyRootMargin = "1400px 0px",
  pauseWhenOutsideViewport = false,
  unloadWhenOutsideViewport = false,
  smoothLoop = false,
  disableProgressWatch = false,
}: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const loopCoverRef = useRef<HTMLVideoElement>(null)
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
  const [usingYoutubeFallback, setUsingYoutubeFallback] = useState(false)
  const [youtubeFallbackReady, setYoutubeFallbackReady] = useState(false)
  const [loopCoverVisible, setLoopCoverVisible] = useState(false)
  const activeSrc = list[index] ?? ""
  const effectiveSmoothLoop =
    smoothLoop &&
    !disableProgressWatch &&
    (typeof navigator === "undefined" || (navigator.maxTouchPoints ?? 0) <= 1)
  const listRef = useRef(list)
  const recoveryCountRef = useRef(0)
  const qualityIssueCountRef = useRef(0)
  const loopCoverActiveRef = useRef(false)
  const viewportActiveRef = useRef(true)
  listRef.current = list

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
    setAllFailed(false)
    setShouldLoad(preload === "auto")
    setUsingYoutubeFallback(false)
    setYoutubeFallbackReady(false)
    setLoopCoverVisible(false)
    recoveryCountRef.current = 0
    qualityIssueCountRef.current = 0
    loopCoverActiveRef.current = false
    viewportActiveRef.current = !pauseWhenOutsideViewport
  }, [sourcesKey, preload, pauseWhenOutsideViewport])

  useEffect(() => {
    recoveryCountRef.current = 0
    qualityIssueCountRef.current = 0
    loopCoverActiveRef.current = false
    setLoopCoverVisible(false)
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
      { rootMargin: lazyRootMargin }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [preload, shouldLoad, lazyRootMargin])

  useEffect(() => {
    if (!pauseWhenOutsideViewport) {
      viewportActiveRef.current = true
      return
    }
    const v = videoRef.current
    if (!shouldLoad || !v || usingYoutubeFallback) return
    if (!("IntersectionObserver" in window)) {
      viewportActiveRef.current = true
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting)
        viewportActiveRef.current = visible
        if (visible) {
          if (unloadWhenOutsideViewport) setShouldLoad(true)
          v.play().catch(() => {})
        } else {
          v.pause()
          if (unloadWhenOutsideViewport) {
            window.setTimeout(() => {
              if (!viewportActiveRef.current) {
                setPlaying(false)
                setShouldLoad(false)
              }
            }, 250)
          }
        }
      },
      { rootMargin: "80px 0px", threshold: 0.08 }
    )
    observer.observe(v)
    return () => observer.disconnect()
  }, [pauseWhenOutsideViewport, shouldLoad, activeSrc, usingYoutubeFallback, unloadWhenOutsideViewport])

  // Skip zero-byte MP4s (origin often returns 200 + CL:0 for empty NAS files).
  // Runs in parallel with video load — does NOT block playback. If the probe
  // detects CL:0 before the video element loads, we advance immediately.
  useEffect(() => {
    if (!shouldLoad || !activeSrc || !shouldProbeEmptyMp4(activeSrc)) return
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
            if (i + 1 < L.length) return i + 1
            if (youtubeFallbackId) {
              setUsingYoutubeFallback(true)
              return i
            }
            return i
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
  }, [activeSrc, shouldLoad, youtubeFallbackId])

  useEffect(() => {
    const v = videoRef.current
    if (!shouldLoad || !v || !activeSrc || usingYoutubeFallback) return

    const shouldMaintainPlayback = () => !pauseWhenOutsideViewport || viewportActiveRef.current
    const tryPlay = () => {
      if (!shouldMaintainPlayback()) return
      v.play().catch(() => {})
    }
    const advanceSourceOrFallback = () => {
      const L = listRef.current
      setIndex((i) => {
        if (i + 1 < L.length) return i + 1
        if (youtubeFallbackId) {
          setUsingYoutubeFallback(true)
        } else if (hideUntilPlaying) {
          setAllFailed(true)
        }
        return i
      })
    }
    const recoverOrFallback = () => {
      if (document.hidden) return
      if (!shouldMaintainPlayback()) return
      if (recoveryCountRef.current < 2) {
        recoveryCountRef.current += 1
        try {
          v.pause()
          v.load()
        } catch {
          /* ignore */
        }
        window.setTimeout(tryPlay, 80)
        return
      }
      advanceSourceOrFallback()
    }
    tryPlay()
    const onUserGesture = () => tryPlay()
    const onVisibility = () => {
      if (!document.hidden) tryPlay()
    }
    const onPause = () => {
      if (!v.ended && shouldMaintainPlayback()) window.setTimeout(tryPlay, 80)
    }
    const onEnded = () => tryPlay()
    document.addEventListener("touchstart", onUserGesture, { once: true })
    document.addEventListener("pointerdown", onUserGesture, { once: true })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", tryPlay)
    window.addEventListener("pageshow", tryPlay)
    v.addEventListener("pause", onPause)
    v.addEventListener("ended", onEnded)

    let stallTimer: ReturnType<typeof setTimeout> | undefined
    const clearStall = () => {
      if (stallTimer) clearTimeout(stallTimer)
      stallTimer = undefined
    }
    const scheduleStall = () => {
      clearStall()
      stallTimer = setTimeout(() => {
        if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          if (v.currentTime === 0) {
            advanceSourceOrFallback()
            return
          }
          recoverOrFallback()
        }
      }, stallTimeoutMs)
    }

    const onCanPlay = () => clearStall()
    const onPlaying = () => {
      clearStall()
      qualityIssueCountRef.current = 0
      if (hideUntilPlaying) setPlaying(true)
    }
    const onWaiting = () => scheduleStall()
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
      clearStall()
      advanceSourceOrFallback()
    }
    const onLoadedMetadata = () => {
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) {
        advanceSourceOrFallback()
      }
    }
    let lastTime = v.currentTime
    let lastProgressAt = performance.now()
    let lastQuality:
      | { droppedVideoFrames: number; totalVideoFrames: number }
      | undefined = v.getVideoPlaybackQuality?.()
    let loopCoverTimer: ReturnType<typeof setTimeout> | undefined
    const clearLoopCover = () => {
      if (loopCoverTimer) clearTimeout(loopCoverTimer)
      loopCoverTimer = undefined
      loopCoverActiveRef.current = false
      setLoopCoverVisible(false)
      const cover = loopCoverRef.current
      if (cover) {
        try {
          cover.pause()
          cover.currentTime = 0
        } catch {
          /* ignore */
        }
      }
    }
    const armLoopCover = () => {
      if (!effectiveSmoothLoop || loopCoverActiveRef.current || !shouldMaintainPlayback()) return
      if (!Number.isFinite(v.duration) || v.duration < 8) return
      if (v.duration - v.currentTime > 1.4) return
      const cover = loopCoverRef.current
      if (!cover) return
      loopCoverActiveRef.current = true
      try {
        cover.currentTime = 0
        cover.play().catch(() => {})
      } catch {
        /* ignore */
      }
      setLoopCoverVisible(true)
      loopCoverTimer = setTimeout(clearLoopCover, 2300)
    }
    const onTimeUpdate = () => {
      lastTime = v.currentTime
      lastProgressAt = performance.now()
      armLoopCover()
    }
    const progressWatch =
      disableProgressWatch || (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 1)
        ? null
        : window.setInterval(() => {
      if (document.hidden) return
      if (!shouldMaintainPlayback()) return
      if (v.paused && !v.ended) {
        tryPlay()
        return
      }
      const now = performance.now()
      const delta = Math.abs(v.currentTime - lastTime)
      if (delta > 0.04) {
        lastTime = v.currentTime
        lastProgressAt = now
        return
      }
      const hasFrame = v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      if (!v.ended && hasFrame && now - lastProgressAt >= fallbackAfterFreezeMs) {
        recoverOrFallback()
        lastProgressAt = now
      }
      armLoopCover()
      const quality = v.getVideoPlaybackQuality?.()
      if (quality && lastQuality) {
        const totalDelta = quality.totalVideoFrames - lastQuality.totalVideoFrames
        const droppedDelta = quality.droppedVideoFrames - lastQuality.droppedVideoFrames
        if (totalDelta >= 30) {
          const droppedRatio = droppedDelta / totalDelta
          if (droppedRatio > 0.35) {
            qualityIssueCountRef.current += 1
          } else {
            qualityIssueCountRef.current = Math.max(0, qualityIssueCountRef.current - 1)
          }
          lastQuality = quality
          if (qualityIssueCountRef.current >= 3) {
            qualityIssueCountRef.current = 0
            recoverOrFallback()
          }
        }
      } else {
        lastQuality = quality
      }
    }, 1250)

    v.addEventListener("canplay", onCanPlay)
    v.addEventListener("playing", onPlaying)
    v.addEventListener("waiting", onWaiting)
    v.addEventListener("error", onError)
    v.addEventListener("loadedmetadata", onLoadedMetadata)
    v.addEventListener("timeupdate", onTimeUpdate)
    scheduleStall()

    return () => {
      clearStall()
      clearLoopCover()
      if (progressWatch != null) window.clearInterval(progressWatch)
      document.removeEventListener("touchstart", onUserGesture)
      document.removeEventListener("pointerdown", onUserGesture)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", tryPlay)
      window.removeEventListener("pageshow", tryPlay)
      v.removeEventListener("pause", onPause)
      v.removeEventListener("ended", onEnded)
      v.removeEventListener("canplay", onCanPlay)
      v.removeEventListener("playing", onPlaying)
      v.removeEventListener("waiting", onWaiting)
      v.removeEventListener("error", onError)
      v.removeEventListener("loadedmetadata", onLoadedMetadata)
      v.removeEventListener("timeupdate", onTimeUpdate)
    }
  }, [activeSrc, stallTimeoutMs, hideUntilPlaying, shouldLoad, youtubeFallbackId, usingYoutubeFallback, fallbackAfterFreezeMs, pauseWhenOutsideViewport, smoothLoop, disableProgressWatch, effectiveSmoothLoop])

  if (!activeSrc) return null
  const pointerClass = pointerEventsNone ? "pointer-events-none" : ""
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
  const showYoutubeFallback = Boolean(youtubeFallbackId && usingYoutubeFallback)
  const hidePrimaryForYoutube = showYoutubeFallback && youtubeFallbackReady
  const videoStyle = hidePrimaryForYoutube ? { ...style, opacity: 0 } : style
  const loopCoverStyle = {
    ...style,
    opacity: loopCoverVisible && !hidePrimaryForYoutube ? 1 : 0,
    transition: "opacity 420ms ease",
  }

  return (
    shouldLoad ? (
    <>
      {showYoutubeFallback && youtubeFallbackId ? (
        <YoutubeHeroBackground
          videoId={youtubeFallbackId}
          className={className}
          style={{
            ...style,
            opacity: youtubeFallbackReady ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
          onLoad={() => setYoutubeFallbackReady(true)}
        />
      ) : null}
      <video
        key={activeSrc}
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterAttr}
        preload={preload}
        className={[className, visibilityClass, pointerClass].filter(Boolean).join(" ")}
        style={videoStyle}
      >
        <source src={activeSrc} type={mediaTypeForVideo(activeSrc)} />
      </video>
      {effectiveSmoothLoop ? (
        <video
          key={`${activeSrc}-loop-cover`}
          ref={loopCoverRef}
          muted
          playsInline
          preload="auto"
          poster={posterAttr}
          className={[className, pointerClass].filter(Boolean).join(" ")}
          style={loopCoverStyle}
          aria-hidden="true"
        >
          <source src={activeSrc} type={mediaTypeForVideo(activeSrc)} />
        </video>
      ) : null}
    </>
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
