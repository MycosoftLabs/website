"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { isYouTubeUrl, normalizeYouTubeEmbedUrlSync } from "@/lib/crep/youtube-embed"
import type { EagleViewportSource } from "@/lib/crep/eagle-viewport-sources"
import { hlsLivePlayerConfig, seekVideoToLiveEdge } from "@/lib/crep/hls-live-config"

export type EagleLiveStreamType = "hls" | "webrtc" | "iframe" | "mjpeg" | "snapshot"

export interface EagleLiveStreamResolved {
  stream_type: EagleLiveStreamType
  url: string
}

interface EagleLiveStreamResolveOptions {
  allowResolver?: boolean
}

function isHls(url: string) {
  return /\.m3u8(\?|$)/i.test(url)
}

function isWhep(url: string) {
  return /\/whep(\?|\/|$)/i.test(url)
}

function isMjpeg(url: string) {
  return /\/mjpeg(\?|\/|$)/i.test(url) || /multipart\/x-mixed-replace/i.test(url)
}

function isStillImage(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /\/api\/eagle\/cam-image/i.test(url)
}

function proxiedHlsUrl(url: string): string {
  if (!isHls(url) || url.startsWith("/api/eagle/hls-proxy")) return url
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    const host = parsed.hostname.toLowerCase()
    const isLocalProxy = parsed.pathname === "/api/eagle/hls-proxy"
    if (isLocalProxy) return url
    if (host.endsWith("dot.ca.gov") || host.includes("dot.ca.gov")) {
      return `/api/eagle/hls-proxy?url=${encodeURIComponent(parsed.toString())}`
    }
  } catch {
    /* keep original URL */
  }
  return url
}

export function normalizeEagleStillImageUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    if (parsed.pathname === "/api/eagle/cam-snapshot") {
      const upstream = parsed.searchParams.get("url")
      if (upstream && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(upstream)) {
        return `/api/eagle/cam-image?url=${encodeURIComponent(upstream)}`
      }
      return null
    }
  } catch {
    /* keep original URL */
  }
  return url
}

const VIDEO_EMBED_PATTERNS: RegExp[] = [
  /earthcam\.com\/embed\//i,
  /youtube(?:-nocookie)?\.com\/embed\//i,
  /youtube\.com\/live\//i,
  /youtu\.be\//i,
  /player\.twitch\.tv/i,
  /player\.vimeo\.com/i,
  /windy\.com\/webcams\/\d+/i,
  /webcams\.windy\.com\/webcams\/stream\/\d+/i,
  /ipcamlive\.com\/player\//i,
  /skylinewebcams\.com\/.+\.html$/i,
  /\.m3u8($|\?)/i,
  /\/hls\//i,
  /\/whep\//i,
  /\/mjpeg\//i,
  /cwwp2\.dot\.ca\.gov\/vm\//i,
  /webcamtaxi\.com.*embed/i,
  /surfline\.com\/embed-?cam/i,
  /cams\.cdn-surfline\.com\//i,
  /cwwp2\.dot\.ca\.gov\/vm\//i,
]

const SNAPSHOT_VIEWER_HOSTS = [
  "cameras.alertcalifornia.org",
  "www.alertcalifornia.org",
  "cameras.alertwildfire.org",
  "hpwren.ucsd.edu",
  "www.surfline.com",
  "cams.cdn-surfline.com",
  "www.earthcam.com",
  "www.skylinewebcams.com",
  "www.webcamtaxi.com",
  "www.windy.com",
  "cwwp2.dot.ca.gov",
]

function isSnapshotViewerUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return SNAPSHOT_VIEWER_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  } catch {
    return false
  }
}

function isCbpSource(source: Pick<EagleViewportSource, "provider" | "embed_url" | "stream_url">) {
  const provider = (source.provider || "").toLowerCase()
  return provider === "cbp" || provider.includes("border")
}

function shouldResolveBeforeStill(
  source: Pick<EagleViewportSource, "provider" | "stream_url" | "embed_url" | "media_url">,
) {
  const provider = (source.provider || "").toLowerCase()
  const urls = `${source.stream_url || ""} ${source.embed_url || ""} ${source.media_url || ""}`.toLowerCase()
  return provider === "caltrans" || provider.startsWith("511") || /caltrans|dot\.ca\.gov|cwwp2\.dot\.ca\.gov/.test(urls)
}

function looksLikeVideoEmbed(url: string) {
  return VIDEO_EMBED_PATTERNS.some((re) => re.test(url))
}

function pickLiveFromUrls(
  streamUrl?: string | null,
  embedUrl?: string | null,
): EagleLiveStreamResolved | null {
  const candidates = [streamUrl, embedUrl].filter(Boolean) as string[]
  for (const url of candidates) {
    if (isStillImage(url)) continue
    if (isHls(url)) return { stream_type: "hls", url: proxiedHlsUrl(url) }
    if (isWhep(url)) return { stream_type: "webrtc", url }
    if (isMjpeg(url)) return { stream_type: "mjpeg", url }
  }
  for (const url of candidates) {
    if (isStillImage(url)) continue
    const yt = isYouTubeUrl(url) ? normalizeYouTubeEmbedUrlSync(url) : null
    if (yt) return { stream_type: "iframe", url: yt }
    if (looksLikeVideoEmbed(url)) return { stream_type: "iframe", url }
  }
  return null
}

async function resolveEagleLiveStreamFromApi(sourceId: string): Promise<EagleLiveStreamResolved | null> {
  try {
    const res = await fetch(`/api/eagle/stream/${encodeURIComponent(sourceId)}`, {
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.stream_type === "hls" && data.stream_url) {
      return { stream_type: "hls", url: data.stream_url }
    }
    if (data.stream_type === "mjpeg" && data.stream_url) {
      return { stream_type: "mjpeg", url: data.stream_url }
    }
    if (data.stream_type === "webrtc" && data.stream_url) {
      return { stream_type: "webrtc", url: data.stream_url }
    }
    const fromApi = pickLiveFromUrls(data.stream_url, data.embed_url)
    if (fromApi) return fromApi
    if (data.stream_type === "iframe" && data.embed_url) {
      return { stream_type: "iframe", url: data.embed_url }
    }
  } catch {
    /* fall through */
  }
  return null
}

export async function resolveEagleLiveStream(
  source: Pick<EagleViewportSource, "id" | "stream_url" | "embed_url" | "provider" | "media_url">,
  options: EagleLiveStreamResolveOptions = {},
): Promise<EagleLiveStreamResolved | null> {
  const direct = pickLiveFromUrls(source.stream_url, source.embed_url)
  if (direct) return direct
  const mediaUrl = normalizeEagleStillImageUrl(source.media_url)
  if (options.allowResolver !== false && mediaUrl && isStillImage(mediaUrl) && shouldResolveBeforeStill(source)) {
    const apiResolved = await resolveEagleLiveStreamFromApi(source.id)
    if (apiResolved) return apiResolved
  }
  if (mediaUrl && isStillImage(mediaUrl)) {
    return { stream_type: "mjpeg", url: mediaUrl }
  }

  const viewerUrl = source.embed_url || source.stream_url
  if (viewerUrl && !isStillImage(viewerUrl)) {
    if (!isCbpSource(source) && isSnapshotViewerUrl(viewerUrl)) {
      return { stream_type: "snapshot", url: viewerUrl }
    }
  }

  if (options.allowResolver === false) return null

  const apiResolved = await resolveEagleLiveStreamFromApi(source.id)
  if (apiResolved) return apiResolved

  if (source.embed_url && !isStillImage(source.embed_url)) {
    const yt = isYouTubeUrl(source.embed_url) ? normalizeYouTubeEmbedUrlSync(source.embed_url) : null
    if (yt) return { stream_type: "iframe", url: yt }
    if (looksLikeVideoEmbed(source.embed_url)) {
      return { stream_type: "iframe", url: source.embed_url }
    }
  }

  return null
}

function withRetryParam(url: string, token: number): string {
  if (!token) return url
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    parsed.searchParams.set("_live_retry", String(token))
    return parsed.toString()
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}_live_retry=${token}`
  }
}

export function HlsLivePlayer({
  url,
  fallbackUrl,
  fallbackAfterMs = 5_500,
  className = "h-full w-full bg-black object-contain",
  muted = true,
}: {
  url: string
  fallbackUrl?: string
  fallbackAfterMs?: number
  className?: string
  muted?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    setRetryNonce(0)
    setUseFallback(false)
  }, [url, fallbackUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || useFallback) return
    const playbackUrl = withRetryParam(url, retryNonce)
    let disposed = false
    let hlsCleanup = () => {}
    const kickPlay = () => {
      if (disposed) return
      video.play().catch(() => {})
    }
    const markReady = () => {
      if (disposed) return
      window.clearTimeout(fallbackTimer)
    }
    const markError = () => {
      if (disposed) return
      if (fallbackUrl) setUseFallback(true)
    }
    const fallbackTimer = window.setTimeout(() => {
      if (disposed) return
      if (fallbackUrl && video.readyState < 2) setUseFallback(true)
    }, fallbackAfterMs)

    video.addEventListener("loadeddata", markReady)
    video.addEventListener("canplay", markReady)
    video.addEventListener("playing", markReady)
    video.addEventListener("error", markError)

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl
      video.addEventListener("loadedmetadata", () => seekVideoToLiveEdge(video), { once: true })
      kickPlay()
    } else {
      import("hls.js").then((Hls) => {
        if (disposed) return
        const H = (Hls as any).default || Hls
        if (!H.isSupported()) {
          video.src = playbackUrl
          kickPlay()
          return
        }
        const hls = new H({ ...hlsLivePlayerConfig() })
        hls.loadSource(playbackUrl)
        hls.attachMedia(video)
        hls.on(H.Events.MANIFEST_PARSED, () => {
          if (disposed) return
          seekVideoToLiveEdge(video, hls)
          kickPlay()
        })
        hls.on(H.Events.ERROR, (_evt: unknown, data: { fatal?: boolean }) => {
          if (disposed) return
          if (!data?.fatal) return
          if (fallbackUrl && retryNonce >= 1) {
            setUseFallback(true)
            return
          }
          if (retryNonce < 3) setRetryNonce((n) => n + 1)
        })
        const driftTimer = window.setInterval(() => {
          if (disposed) return
          if (video.duration === Infinity) seekVideoToLiveEdge(video, hls)
        }, 12_000)
        hlsCleanup = () => {
          window.clearInterval(driftTimer)
          try {
            hls.destroy()
          } catch {
            /* ignore */
          }
        }
      }).catch(() => {
        if (disposed) return
        if (fallbackUrl) {
          setUseFallback(true)
        } else {
          video.src = playbackUrl
          kickPlay()
        }
      })
    }

    return () => {
      disposed = true
      window.clearTimeout(fallbackTimer)
      video.removeEventListener("loadeddata", markReady)
      video.removeEventListener("canplay", markReady)
      video.removeEventListener("playing", markReady)
      video.removeEventListener("error", markError)
      hlsCleanup()
      try {
        video.removeAttribute("src")
        video.load()
      } catch {
        /* video may already be detached */
      }
    }
  }, [url, retryNonce, fallbackUrl, fallbackAfterMs, useFallback])

  if (useFallback && fallbackUrl) {
    return <MjpegLivePlayer url={fallbackUrl} className={className} />
  }

  return (
    <video
      ref={videoRef}
      className={className}
      muted={muted}
      autoPlay
      playsInline
      controls={false}
    />
  )
}

function snapshotSelectorChain(provider?: string): string[] {
  const p = (provider || "").toLowerCase()
  if (p === "caltrans" || p.includes("dot")) return ["img", "video", "body"]
  if (p === "surfline") return ["video", "canvas", "img", "body"]
  return ["video", "img", "canvas", "body"]
}

export function SnapshotLivePlayer({
  viewerUrl,
  provider,
  className,
}: {
  viewerUrl: string
  provider?: string
  className?: string
}) {
  const [tick, setTick] = useState(() => Date.now())
  const [selectorIdx, setSelectorIdx] = useState(0)
  const chain = snapshotSelectorChain(provider)
  const selector = chain[selectorIdx] || "body"
  const isFullpage = selector === "body"
  const snapshotApi = `/api/eagle/cam-snapshot?url=${encodeURIComponent(viewerUrl)}&selector=${encodeURIComponent(selector)}${isFullpage ? "&mode=fullpage" : ""}&_t=${tick}`

  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      setTick(Date.now())
    }, 20_000)
    return () => window.clearInterval(id)
  }, [viewerUrl])

  useEffect(() => {
    setSelectorIdx(0)
  }, [viewerUrl, provider])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={snapshotApi}
      alt={provider ? `${provider} live snapshot` : "Live camera snapshot"}
      className={className || "h-full w-full bg-black object-cover"}
      loading="eager"
      onError={() => {
        setSelectorIdx((idx) => Math.min(idx + 1, chain.length - 1))
      }}
    />
  )
}

export function MjpegLivePlayer({ url, className }: { url: string; className?: string }) {
  const [retryNonce, setRetryNonce] = useState(0)
  const [failed, setFailed] = useState(false)
  const retryTimersRef = useRef<number[]>([])

  useEffect(() => {
    setRetryNonce(0)
    setFailed(false)
    return () => {
      retryTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      retryTimersRef.current = []
    }
  }, [url])

  const src = withRetryParam(url, retryNonce)
  const retry = () => {
    if (retryNonce >= 3) {
      setFailed(true)
      return
    }
    const timer = window.setTimeout(() => {
      retryTimersRef.current = retryTimersRef.current.filter((entry) => entry !== timer)
      setRetryNonce((n) => n + 1)
    }, 1_500 * (retryNonce + 1))
    retryTimersRef.current.push(timer)
  }
  if (failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-black text-center text-[7px] uppercase tracking-wide text-cyan-300/70 ${className || ""}`}>
        Camera feed unavailable
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className || "h-full w-full bg-black object-cover"}
      onError={retry}
    />
  )
}

export function EagleLiveStreamPlayer({
  resolved,
  className,
  muted = true,
  provider,
  fallbackUrl,
}: {
  resolved: EagleLiveStreamResolved
  className?: string
  muted?: boolean
  provider?: string
  fallbackUrl?: string
}) {
  switch (resolved.stream_type) {
    case "hls":
      return <HlsLivePlayer url={resolved.url} fallbackUrl={fallbackUrl} className={className} muted={muted} />
    case "mjpeg":
      return <MjpegLivePlayer url={resolved.url} className={className} />
    case "snapshot":
      return <SnapshotLivePlayer viewerUrl={resolved.url} provider={provider} className={className} />
    case "iframe":
      return (
        <iframe
          src={resolved.url}
          className={className || "h-full w-full bg-black"}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          loading="eager"
          title="Live camera"
        />
      )
    case "webrtc":
      return (
        <div className={`flex items-center justify-center text-[9px] text-cyan-300 ${className || ""}`}>
          Open full player for WebRTC feed
        </div>
      )
    default:
      return null
  }
}

export function EagleLivePreviewTile({
  source,
  className,
}: {
  source: EagleViewportSource
  className?: string
}) {
  const [resolved, setResolved] = useState<EagleLiveStreamResolved | null>(null)
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading")
  const { id, stream_url, embed_url, media_url, provider } = source

  useEffect(() => {
    let cancelled = false
    setPhase("loading")
    setResolved(null)
    void resolveEagleLiveStream({ id, stream_url, embed_url, media_url, provider }, { allowResolver: true }).then((next) => {
      if (cancelled) return
      if (next) {
        setResolved(next)
        setPhase("ready")
      } else {
        setPhase("error")
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, stream_url, embed_url, media_url, provider])

  if (phase === "loading") {
    return (
      <div className={`flex items-center justify-center bg-black ${className || ""}`}>
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400/70" />
      </div>
    )
  }

  if (phase === "error" || !resolved) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-950 to-black px-1 text-center ${className || ""}`}>
        <span className="text-[7px] font-semibold uppercase tracking-wide text-cyan-300/80">Live stream</span>
        <span className="text-[6px] text-gray-500">Resolving HD feed…</span>
      </div>
    )
  }

  if (resolved.stream_type === "snapshot") {
    const mediaUrl = normalizeEagleStillImageUrl(source.media_url)
    if (mediaUrl && isStillImage(mediaUrl)) {
      return <MjpegLivePlayer url={mediaUrl} className={className} />
    }
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-950 to-black px-1 text-center ${className || ""}`}>
        <span className="text-[7px] font-semibold uppercase tracking-wide text-cyan-300/80">Camera feed</span>
        <span className="text-[6px] text-gray-500">Tap to open live view</span>
      </div>
    )
  }

  if (resolved.stream_type === "iframe" || resolved.stream_type === "webrtc") {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-950 to-black px-1 text-center ${className || ""}`}>
        <span className="text-[7px] font-semibold uppercase tracking-wide text-cyan-300/80">Live feed</span>
        <span className="text-[6px] text-gray-500">Tap to open player</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-black ${className || ""}`}>
      <EagleLiveStreamPlayer
        resolved={resolved}
        provider={source.provider}
        fallbackUrl={(() => {
          const mediaUrl = normalizeEagleStillImageUrl(source.media_url)
          return mediaUrl && isStillImage(mediaUrl) ? mediaUrl : undefined
        })()}
        muted
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[6px] font-mono uppercase tracking-wide text-cyan-300">
        LIVE
      </div>
    </div>
  )
}
