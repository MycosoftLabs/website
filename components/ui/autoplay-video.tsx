"use client"

/**
 * AutoplayVideo — Hero/background videos with optional multi-source fallback.
 * Tries smaller / alternate URLs first when `sources` is set; on error or stall,
 * advances to the next source. Dev: rewrites /assets/ to production host.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { encodeAssetUrl } from "@/lib/encode-asset-url"

function resolveAssetUrl(src: string, isDev: boolean): string {
  if (isDev && src.startsWith("/assets/")) return `https://mycosoft.com${src}`
  return src
}

function normalizeSources(
  src: string | undefined,
  sources: string[] | undefined,
  isDev: boolean,
  encodeSrc: boolean
): string[] {
  const raw = [...(sources?.length ? sources : []), ...(src ? [src] : [])].filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of raw) {
    const resolved = resolveAssetUrl(u, isDev)
    const safe = encodeSrc ? encodeAssetUrl(resolved) : resolved
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
}

export function AutoplayVideo({
  src,
  sources,
  className = "",
  style,
  encodeSrc = true,
  stallTimeoutMs = 14000,
}: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isDev = process.env.NODE_ENV === "development"
  const list = useMemo(
    () => normalizeSources(src, sources, isDev, encodeSrc),
    [src, sources, isDev, encodeSrc]
  )
  const [index, setIndex] = useState(0)
  const activeSrc = list[index] ?? ""
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    setIndex(0)
  }, [list.join("|")])

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
          setIndex((i) => (i + 1 < L.length ? i + 1 : i))
        }
      }, stallTimeoutMs)
    }

    const onCanPlay = () => clearStall()
    const onPlaying = () => clearStall()
    const onWaiting = () => scheduleStall()
    const onError = () => {
      clearStall()
      const L = listRef.current
      setIndex((i) => (i + 1 < L.length ? i + 1 : i))
    }
    const onLoadedMetadata = () => {
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) {
        const L = listRef.current
        setIndex((i) => (i + 1 < L.length ? i + 1 : i))
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
  }, [activeSrc, stallTimeoutMs])

  if (!activeSrc) return null

  return (
    <video
      key={activeSrc}
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
      style={style}
    >
      <source src={activeSrc} type="video/mp4" />
    </video>
  )
}
