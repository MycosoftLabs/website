"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { isYouTubeUrl, normalizeYouTubeEmbedUrlSync } from "@/lib/crep/youtube-embed"
import type { EagleViewportSource } from "@/lib/crep/eagle-viewport-sources"

export type EagleLiveStreamType = "hls" | "webrtc" | "iframe" | "mjpeg" | "snapshot"

export interface EagleLiveStreamResolved {
  stream_type: EagleLiveStreamType
  url: string
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
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /\/api\/eagle\/cam-(snapshot|image)/i.test(url)
}

const VIDEO_EMBED_PATTERNS: RegExp[] = [
  /earthcam\.com\/embed\//i,
  /youtube(?:-nocookie)?\.com\/embed\//i,
  /youtube\.com\/live\//i,
  /youtu\.be\//i,
  /player\.twitch\.tv/i,
  /player\.vimeo\.com/i,
  /windy\.com\/webcams\/\d+/i,
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
  "bwt.cbp.gov",
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
  if (provider === "cbp" || provider.includes("border")) return true
  return isSnapshotViewerUrl(source.embed_url || "") || isSnapshotViewerUrl(source.stream_url || "")
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
    if (isHls(url)) return { stream_type: "hls", url }
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

export async function resolveEagleLiveStream(
  source: Pick<EagleViewportSource, "id" | "stream_url" | "embed_url" | "provider">,
): Promise<EagleLiveStreamResolved | null> {
  const direct = pickLiveFromUrls(source.stream_url, source.embed_url)
  if (direct) return direct

  const viewerUrl = source.embed_url || source.stream_url
  if (viewerUrl && !isStillImage(viewerUrl)) {
    if (isCbpSource(source) || isSnapshotViewerUrl(viewerUrl)) {
      return { stream_type: "snapshot", url: viewerUrl }
    }
  }

  try {
    const res = await fetch(`/api/eagle/stream/${encodeURIComponent(source.id)}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.stream_type === "snapshot" && data.stream_url) {
        return { stream_type: "snapshot", url: data.stream_url }
      }
      const fromApi = pickLiveFromUrls(data.stream_url, data.embed_url)
      if (fromApi) return fromApi
    }
  } catch {
    /* fall through */
  }

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
  className = "h-full w-full bg-black object-contain",
  muted = true,
}: {
  url: string
  className?: string
  muted?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    setRetryNonce(0)
  }, [url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const playbackUrl = withRetryParam(url, retryNonce)
    let cleanup = () => {}
    const kickPlay = () => video.play().catch(() => {})

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl
      kickPlay()
    } else {
      import("hls.js").then((Hls) => {
        const H = (Hls as any).default || Hls
        if (!H.isSupported()) {
          video.src = playbackUrl
          kickPlay()
          return
        }
        const hls = new H({
          maxBufferLength: 8,
          manifestLoadingTimeOut: 10_000,
          levelLoadingTimeOut: 10_000,
          fragLoadingTimeOut: 10_000,
        })
        hls.loadSource(playbackUrl)
        hls.attachMedia(video)
        hls.on(H.Events.MANIFEST_PARSED, kickPlay)
        hls.on(H.Events.ERROR, (_evt: unknown, data: { fatal?: boolean }) => {
          if (data?.fatal && retryNonce < 3) setRetryNonce((n) => n + 1)
        })
        cleanup = () => {
          try {
            hls.destroy()
          } catch {
            /* ignore */
          }
        }
      }).catch(() => {
        video.src = playbackUrl
        kickPlay()
      })
    }

    return cleanup
  }, [url, retryNonce])

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
  if (p === "cbp" || p.includes("border")) return ["video", "img", "canvas", "body"]
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
    }, 8_000)
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
  const src = withRetryParam(url, retryNonce)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className || "h-full w-full bg-black object-cover"}
      onError={() => setRetryNonce((n) => n + 1)}
    />
  )
}

export function EagleLiveStreamPlayer({
  resolved,
  className,
  muted = true,
  provider,
}: {
  resolved: EagleLiveStreamResolved
  className?: string
  muted?: boolean
  provider?: string
}) {
  switch (resolved.stream_type) {
    case "hls":
      return <HlsLivePlayer url={resolved.url} className={className} muted={muted} />
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

  useEffect(() => {
    let cancelled = false
    setPhase("loading")
    setResolved(null)
    void resolveEagleLiveStream(source).then((next) => {
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
  }, [source.id, source.stream_url, source.embed_url])

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

  return (
    <div className={`relative overflow-hidden bg-black ${className || ""}`}>
      <EagleLiveStreamPlayer resolved={resolved} provider={source.provider} muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[6px] font-mono uppercase tracking-wide text-cyan-300">
        LIVE
      </div>
    </div>
  )
}
