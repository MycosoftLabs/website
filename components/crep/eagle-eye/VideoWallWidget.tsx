"use client"

/**
 * VideoWallWidget — Eagle Eye video player — Apr 20, 2026 (Phase 6)
 *
 * Universal player that handles every stream_type Eagle Eye produces:
 *   - "hls"     Shinobi/MediaMTX m3u8 — uses native HLS if supported,
 *               else dynamically imports hls.js.
 *   - "webrtc"  MediaMTX WHEP low-latency — dynamic WHEP client.
 *   - "iframe"  YouTube/Twitch/Vimeo/EarthCam/Windy embed URL.
 *   - "mjpeg"   IP camera MJPEG stream — <img> tag with refresh.
 *
 * Listens for `crep:eagle:camera-click` + `crep:eagle:event-click`
 * custom events dispatched by EagleEyeOverlay. Resolves source → stream
 * URL via /api/eagle/stream/[sourceId], then mounts the right player.
 *
 * Placement: floating draggable panel, bottom-right by default.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { X, Minus, Square, Camera as CameraIcon } from "lucide-react"
import {
  isYouTubeUrl,
  normalizeYouTubeEmbedUrlSync,
} from "@/lib/crep/youtube-embed"
import {
  normalizeEagleStillImageUrl,
  resolveEagleLiveStream,
} from "@/components/crep/eagle-eye/eagle-live-stream"
import { hlsLivePlayerConfig, seekVideoToLiveEdge } from "@/lib/crep/hls-live-config"

type StreamType = "hls" | "webrtc" | "iframe" | "mjpeg" | "snapshot"

interface ResolvedStream {
  id: string
  provider: string
  kind: "permanent" | "ephemeral"
  stream_url?: string
  embed_url?: string
  snapshot_url?: string
  stream_type: StreamType
  error?: string
}

interface ActiveFeed {
  id: string
  name: string
  provider: string
  lat: number
  lng: number
  directEmbed?: string
  embedUrl?: string
  mediaUrl?: string
  sourceStatus?: string
  thumbnail?: string
  confidence?: number
  kind: "camera" | "video_event"
}

async function resolveStream(
  sourceId: string,
  hints?: { embed_url?: string; media_url?: string },
): Promise<ResolvedStream> {
  const qs = new URLSearchParams()
  if (hints?.embed_url) qs.set("embed_url", hints.embed_url)
  if (hints?.media_url) qs.set("media_url", hints.media_url)
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  try {
    const res = await fetch(`/api/eagle/stream/${encodeURIComponent(sourceId)}${suffix}`, {
      signal: AbortSignal.timeout(12_000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        id: sourceId,
        provider: data?.provider || "unknown",
        kind: data?.kind || "permanent",
        stream_type: data?.stream_type || "iframe",
        error: data?.error || `HTTP ${res.status}`,
      }
    }
    return data || { id: sourceId, provider: "unknown", kind: "permanent", stream_type: "iframe", error: "invalid stream resolver response" }
  } catch (err) {
    return { id: sourceId, provider: "unknown", kind: "permanent", stream_type: "iframe", error: (err as Error)?.message || "stream resolver timeout" }
  }
}

function withRetryParam(url: string, token: number): string {
  if (!token) return url
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    parsed.searchParams.set("_vw_retry", String(token))
    return parsed.toString()
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}_vw_retry=${token}`
  }
}

function stableVideoWallJitter(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash % 7_000
}

function videoWallRefreshDelayMs(provider: string | undefined, url: string, selector?: string): number {
  const p = (provider || "").toLowerCase()
  const baseDelay = p === "earthcam" || selector === "body" ? 30_000 : 20_000
  return baseDelay + stableVideoWallJitter(`${p}:${selector || "still"}:${url}`)
}

const UNAVAILABLE_FEED_STATUSES = new Set([
  "offline",
  "unavailable",
  "retired",
  "disabled",
  "blocked",
  "deprecated",
  "temporarily_unavailable",
])

const KNOWN_UNAVAILABLE_FEED_IDS = new Set<string>()

const TEMPORARILY_UNPLAYABLE_PROVIDERS = new Set([
  "navy",
])

function isKnownUnavailableFeedId(id: string | undefined | null): boolean {
  return KNOWN_UNAVAILABLE_FEED_IDS.has(String(id || "").trim())
}

function isTemporarilyUnplayableProvider(provider: string | undefined | null): boolean {
  return TEMPORARILY_UNPLAYABLE_PROVIDERS.has(String(provider || "").trim().toLowerCase())
}

function isHlsUrl(url: string | undefined | null): boolean {
  return !!url && (/\.m3u8(\?|$|%3f)/i.test(url) || /\/api\/eagle\/hls-proxy(?:\?|$)/i.test(url))
}

function isStillImageUrl(url: string | undefined | null): boolean {
  return !!url && (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /\/api\/eagle\/cam-image/i.test(url))
}

function isUnavailableFeedStatus(status: string | undefined | null): boolean {
  const normalized = String(status || "").trim().toLowerCase()
  return normalized.length > 0 && UNAVAILABLE_FEED_STATUSES.has(normalized)
}

function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return
  try { video.pause() } catch { /* ignore */ }
  try {
    const srcObject = video.srcObject
    if (srcObject instanceof MediaStream) {
      srcObject.getTracks().forEach((track) => {
        try { track.stop() } catch { /* ignore */ }
      })
    }
  } catch { /* ignore */ }
  try { video.srcObject = null } catch { /* ignore */ }
  try { video.removeAttribute("src") } catch { /* ignore */ }
  try { video.load() } catch { /* ignore */ }
}

function HlsPlayer({
  url,
  onFallback,
  onFrame,
  disableNoFrameWatchdog = false,
  noFrameTimeoutMs = 20_000,
  stablePlayback = false,
  showControls = true,
  className,
}: {
  url: string
  onFallback?: () => void
  onFrame?: () => void
  disableNoFrameWatchdog?: boolean
  noFrameTimeoutMs?: number
  stablePlayback?: boolean
  showControls?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onFallbackRef = useRef(onFallback)
  const onFrameRef = useRef(onFrame)
  // Apr 22, 2026 v2 — Morgan: "caltrans cameras were working fine before
  // now they are just saying loading hls what happend fix that".
  //
  // v1 added an always-on "loading HLS…" overlay that dimmed the video
  // until the playing event fired — for Caltrans streams that take 1–3 s
  // to buffer the first segment the overlay made healthy streams *look*
  // broken. Reverted to: video shows immediately, NO loading overlay on
  // the happy path; error overlay ONLY on hls.js fatal errors.
  const [errMsg, setErrMsg] = useState<string>("")
  const [recovering, setRecovering] = useState("")
  useEffect(() => {
    onFallbackRef.current = onFallback
  }, [onFallback])
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])
  useEffect(() => { setRecovering(""); setErrMsg("") }, [url])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setErrMsg("")
    setRecovering("")
    const playbackUrl = url
    let cleanup = () => {}
    let active = true
    let hasFrame = false
    let watchdog: ReturnType<typeof setTimeout> | null = null
    const markFrame = () => {
      if (video.readyState < 2 && video.videoWidth <= 0 && video.videoHeight <= 0) return
      hasFrame = true
      setRecovering("")
      onFrameRef.current?.()
    }
    const failOrFallback = (reason: string) => {
      if (onFallbackRef.current) {
        setRecovering("")
        onFallbackRef.current()
        return
      }
      setRecovering("")
      setErrMsg(reason)
    }
    const retryInsideWidget = (reason: string) => {
      if (hasFrame && video.readyState >= 2) return
      failOrFallback(reason)
    }
    const onVideoError = () => retryInsideWidget("video element reported a playback error")
    video.addEventListener("loadeddata", markFrame)
    video.addEventListener("canplay", markFrame)
    video.addEventListener("playing", markFrame)
    video.addEventListener("timeupdate", markFrame)
    video.addEventListener("error", onVideoError)
    if (!disableNoFrameWatchdog) {
      watchdog = setTimeout(() => {
        if (!hasFrame && video.readyState < 2) retryInsideWidget("no video frames received")
      }, noFrameTimeoutMs)
    }

    // Let the browser's own "play" gesture handle readiness. No phase
    // state, no overlay until / unless fatal error.
    const kickPlay = () => video.play().catch(() => { /* autoplay blocked — user clicks play */ })

    const onMeta = () => seekVideoToLiveEdge(video)
    video.addEventListener("loadedmetadata", onMeta)

    const startNativeHls = () => {
      if (!active) return
      video.src = playbackUrl
      kickPlay()
    }

    import("hls.js").then((Hls) => {
      if (!active) return
      const H = (Hls as any).default || Hls
      if (!H.isSupported()) {
        if (!video.canPlayType("application/vnd.apple.mpegurl")) {
          failOrFallback("HLS playback is not supported in this browser")
          return
        }
        // Firefox with plugin / older browsers — try direct src.
        startNativeHls()
        return
      }
      const hlsConfig = stablePlayback
        ? {
            ...hlsLivePlayerConfig(),
            lowLatencyMode: false,
            liveSyncDurationCount: 6,
            liveMaxLatencyDurationCount: 18,
            maxLiveSyncPlaybackRate: 1.05,
            backBufferLength: 20,
            maxBufferLength: 30,
            manifestLoadingTimeOut: 20_000,
            levelLoadingTimeOut: 20_000,
            fragLoadingTimeOut: 20_000,
          }
        : hlsLivePlayerConfig()
      const hls = new H(hlsConfig)
      hls.loadSource(playbackUrl)
      hls.attachMedia(video)
      hls.on(H.Events.MANIFEST_PARSED, () => {
        seekVideoToLiveEdge(video, hls)
        kickPlay()
      })
      let recoveryAttempts = 0
      hls.on(H.Events.ERROR, (_evt: any, data: any) => {
        if (!data?.fatal) return
        if (data?.type === H.ErrorTypes.NETWORK_ERROR && recoveryAttempts < 1) {
          recoveryAttempts++
          try { hls.startLoad() } catch { /* ignore */ }
          return
        }
        if (data?.type === H.ErrorTypes.MEDIA_ERROR && recoveryAttempts < 1) {
          recoveryAttempts++
          try { hls.recoverMediaError() } catch { /* ignore */ }
          return
        }
        const detail = data?.details || data?.reason || data?.type || "playback failed"
        failOrFallback(String(detail))
        try { hls.destroy() } catch { /* ignore */ }
      })
      const driftTimer = stablePlayback ? null : window.setInterval(() => {
        if (video.duration === Infinity || hls.liveSyncPosition != null) {
          seekVideoToLiveEdge(video, hls)
        }
      }, 10_000)
      cleanup = () => {
        if (driftTimer) window.clearInterval(driftTimer)
        try { hls.destroy() } catch { /* ignore */ }
      }
    }).catch((err) => {
      if (!active) return
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        startNativeHls()
      } else {
        setErrMsg("hls.js unavailable: " + (err?.message || ""))
      }
    })

    return () => {
      active = false
      if (watchdog) clearTimeout(watchdog)
      video.removeEventListener("loadedmetadata", onMeta)
      video.removeEventListener("loadeddata", markFrame)
      video.removeEventListener("canplay", markFrame)
      video.removeEventListener("playing", markFrame)
      video.removeEventListener("timeupdate", markFrame)
      video.removeEventListener("error", onVideoError)
      cleanup()
      releaseVideoElement(video)
    }
  }, [url, disableNoFrameWatchdog, noFrameTimeoutMs, stablePlayback])

  return (
    <div className={`relative w-full h-full bg-black ${className || ""}`}>
      <video
        ref={videoRef}
        className="w-full h-full bg-black object-contain"
        controls={showControls}
        muted
        autoPlay
        playsInline
        preload="auto"
      />
      {!showControls && !errMsg ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded border border-red-400/40 bg-black/70 px-2 py-1 text-[9px] font-mono font-semibold text-red-200">
          LIVE
        </div>
      ) : null}
      {recovering && !errMsg && (
        <div className="absolute right-2 top-2 rounded border border-cyan-500/30 bg-black/70 px-2 py-1 text-[9px] font-mono text-cyan-200">
          {recovering}
        </div>
      )}
      {errMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-3 text-center">
          <div className="text-[11px] text-red-300 font-mono">HLS playback error</div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">{errMsg}</div>
          <div className="text-[9px] text-gray-500 font-mono mt-1">
            Source may be offline or blocking the browser.
          </div>
        </div>
      )}
    </div>
  )
}

function proxiedCaltransSnapshot(embed: string | undefined, mediaUrl?: string): string | null {
  const normalizedMedia = normalizeEagleStillImageUrl(mediaUrl)
  if (normalizedMedia && /(\.(jpe?g|png|webp)(\?|$)|\/api\/eagle\/cam-image)/i.test(normalizedMedia)) {
    return normalizedMedia.startsWith("/api/")
      ? normalizedMedia
      : `/api/eagle/cam-image?url=${encodeURIComponent(normalizedMedia)}`
  }
  if (!embed) return null
  const m = /cwwp2\.dot\.ca\.gov\/vm\/loc\/(d\d+)\/([^/.?#]+)\.htm/i.exec(embed)
  if (!m) return null
  const [, dist, slug] = m
  const upstream = `https://cwwp2.dot.ca.gov/data/${dist}/cctv/image/${slug}/${slug}.jpg`
  return `/api/eagle/cam-image?url=${encodeURIComponent(upstream)}`
}

function proxiedDotHlsUrl(url: string): string {
  if (!isHlsUrl(url) || url.startsWith("/api/eagle/hls-proxy")) return url
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    const host = parsed.hostname.toLowerCase()
    if (
      host.endsWith("dot.ca.gov") ||
      host.includes("dot.ca.gov") ||
      /videos-\d+\.earthcam\.com/i.test(host) ||
      host === "live.hdontap.com" ||
      host === "d1wse1.its.nv.gov" ||
      host.endsWith(".its.nv.gov") ||
      host === "nysdot.skyvdn.com" ||
      host.endsWith(".nysdot.skyvdn.com")
    ) {
      return `/api/eagle/hls-proxy?url=${encodeURIComponent(parsed.toString())}`
    }
  } catch {
    /* keep original URL */
  }
  return url
}

function HlsWithSnapshotFallback({
  url,
  fallbackSnapshot,
  embedUrl,
  provider,
  name,
}: {
  url: string
  fallbackSnapshot?: string | null
  embedUrl?: string | null
  provider?: string
  name?: string
}) {
  const [useSnapshot, setUseSnapshot] = useState(false)
  const [videoFrameReady, setVideoFrameReady] = useState(false)
  const frameSeenRef = useRef(false)
  const normalizedFallbackSnapshot = normalizeEagleStillImageUrl(fallbackSnapshot)
  const playbackUrl = proxiedDotHlsUrl(url)
  const providerLc = String(provider || "").toLowerCase()
  const stableHlsPlayback = providerLc === "caltrans"
  const showNativeControls = false
  const fallbackDelayMs = stableHlsPlayback ? 8_000 : 10_000
  const noFrameTimeoutMs = stableHlsPlayback ? 8_000 : 8_000
  useEffect(() => {
    frameSeenRef.current = false
    setUseSnapshot(false)
    setVideoFrameReady(false)
  }, [playbackUrl, normalizedFallbackSnapshot])
  useEffect(() => {
    if (!normalizedFallbackSnapshot || useSnapshot) return
    const timer = window.setTimeout(() => {
      if (!frameSeenRef.current) setUseSnapshot(true)
    }, fallbackDelayMs)
    return () => window.clearTimeout(timer)
  }, [fallbackDelayMs, normalizedFallbackSnapshot, playbackUrl, useSnapshot])
  if (stableHlsPlayback) {
    return (
      <HlsPlayer
        url={playbackUrl}
        stablePlayback
        showControls={showNativeControls}
        noFrameTimeoutMs={30_000}
      />
    )
  }
  if (useSnapshot && normalizedFallbackSnapshot) {
    return (
      <SnapshotStream
        url={normalizedFallbackSnapshot}
        embedUrl={embedUrl || undefined}
        provider={provider}
        name={name}
      />
    )
  }
  if (normalizedFallbackSnapshot) {
    return (
      <div className="relative h-full w-full bg-black">
        {!videoFrameReady ? (
          stableHlsPlayback ? (
            // Caltrans HLS can take a few segments to settle. Use a static
            // poster instead of a refreshing snapshot so still-image reloads
            // do not compete visually with the live player during startup.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizedFallbackSnapshot}
              alt=""
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <SnapshotStream
              url={normalizedFallbackSnapshot}
              embedUrl={embedUrl || undefined}
              provider={provider}
              name={name}
            />
          )
        ) : null}
        <HlsPlayer
          url={playbackUrl}
          className={`absolute inset-0 transition-opacity duration-200 ${videoFrameReady ? "opacity-100" : "pointer-events-none opacity-0"}`}
          stablePlayback={stableHlsPlayback}
          showControls={showNativeControls}
          onFrame={() => {
            frameSeenRef.current = true
            setVideoFrameReady(true)
          }}
          onFallback={() => setUseSnapshot(true)}
          noFrameTimeoutMs={noFrameTimeoutMs}
        />
      </div>
    )
  }
  return (
    <HlsPlayer
      url={playbackUrl}
      stablePlayback={stableHlsPlayback}
      showControls={showNativeControls}
      onFrame={() => { frameSeenRef.current = true }}
      noFrameTimeoutMs={stableHlsPlayback ? 30_000 : 20_000}
    />
  )
}

function WebRTCPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let pc: RTCPeerConnection | null = null
    let stopped = false
    let attachedVideo: HTMLVideoElement | null = null
    ;(async () => {
      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
        pc.addTransceiver("video", { direction: "recvonly" })
        pc.addTransceiver("audio", { direction: "recvonly" })
        pc.ontrack = (e) => {
          if (videoRef.current && !stopped) {
            attachedVideo = videoRef.current
            attachedVideo.srcObject = e.streams[0]
            attachedVideo.play().catch(() => {})
          }
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        // WHEP POST handshake
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp || "",
        })
        if (!resp.ok) throw new Error(`WHEP ${resp.status}`)
        const answer = await resp.text()
        await pc.setRemoteDescription({ type: "answer", sdp: answer })
      } catch (e: any) {
        if (!stopped) setErr(e?.message || "WebRTC failed")
      }
    })()
    return () => {
      stopped = true
      releaseVideoElement(attachedVideo)
      try { pc?.close() } catch { /* ignore */ }
    }
  }, [url])
  if (err) return <div className="p-4 text-sm text-red-400 bg-black/80">{err}</div>
  return <video ref={videoRef} className="w-full h-full bg-black" controls muted playsInline />
}

// URL whitelist — only these patterns are actual video player embeds we
// know iframe cleanly. Everything else is treated as a website page and
// gets the "no live stream" card instead of being iframed (Morgan
// Apr 20, 2026: "all camera widgets must be audited none can show
// iframes or website only video streams live").
//
// Apr 22, 2026 v2 (Morgan: "this caltrans not working" — SR-75 Silver
// Strand was falling through to SnapshotProxyVideo because its embed_url
// lives at /vm/loc/d11/{slug}.htm and the old pattern only matched
// iframemap.htm. Broadened to all /vm/ pages. Added surfline /surf-report
// and Surfline's embed-cam format so surfline cams at least get the
// iframe attempt before bottom-failing to the "no stream" tile.)
const VIDEO_EMBED_PATTERNS: RegExp[] = [
  /earthcam\.com\/embed\//i,
  /earthcam\.com\/.+/i,
  /youtube(?:-nocookie)?\.com\/embed\//i,
  /youtube\.com\/watch\?/i,
  /youtube\.com\/live\//i,
  /youtu\.be\//i,
  /player\.twitch\.tv/i,
  /player\.vimeo\.com/i,
  /portal\.hdontap\.com\/s\/embed\/?/i,
  /windy\.com\/webcams\/\d+/i,                 // windy player URLs (webcam ID)
  /webcams\.windy\.com\/webcams\/stream\/\d+/i, // windy stream wrapper
  /ipcamlive\.com\/player\//i,                 // IPCamLive embeddable players
  /skylinewebcams\.com\/.+\.html$/i,           // skyline /livecam/{slug}.html
  /\.m3u8($|\?)/i,                             // direct HLS
  /\/hls\//i,                                  // shinobi/mediamtx HLS path
  /\/whep\//i,                                 // WebRTC WHEP
  /\/mjpeg\//i,                                // shinobi MJPEG
  /api\.windy\.com\/webcams.*player/i,         // windy webcam player iframe
  /\.(jpe?g|png|webp|gif)(\?|$)/i,             // direct image (handled as snapshot really)
  /cwwp2\.dot\.ca\.gov\/vm\//i,                // caltrans: iframemap.htm + /loc/d{N}/{id}.htm + any /vm/ viewer
  /webcamtaxi\.com.*embed/i,
  /surfline\.com\/surf-report\//i,             // surfline spot pages — their player renders inline
  /surfline\.com\/embed-?cam/i,                // surfline official embed
  /cams\.cdn-surfline\.com\//i,                // surfline CDN player
]

function looksLikeVideoEmbed(url: string): boolean {
  return VIDEO_EMBED_PATTERNS.some((re) => re.test(url))
}

// Provider categories where there's NO video element on the upstream
// page at all (purely informational pages — CBP wait times, etc.).
// These skip the snapshot attempt entirely and go straight to the
// Apr 21, 2026 (Morgan: "we will not have any open provider links no one
// will be directed to leave crep all data will be within its widgets
// live including video streams"). INFO_ONLY_PROVIDERS is now EMPTY —
// every provider goes through the snapshot-chain fallback which tries
// multiple selectors + a full-page screenshot before giving up. If every
// attempt fails, we render a "stream unavailable" status tile (no
// external link) and a map pin back to the marker.
const INFO_ONLY_PROVIDERS = new Set<string>([])

// Apr 21, 2026: NEVER show an external-link card. If no video can be
// resolved, render a compact "no stream" status tile inside CREP itself.
// The user stays in CREP; no data ever lives outside the widget.
function NoStreamStatusTile({ provider, name, kind }: { provider?: string; name?: string; kind?: string }) {
  // Apr 22, 2026 v3 (Morgan: "what is this" — the old "All snapshot
  // variants returned empty" wording was read as a CREP bug rather than
  // as the upstream provider not exposing video. New copy is plainer:
  // stream not available from source right now, try again later.)
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#061121] flex flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="text-3xl opacity-60">📷</div>
      <div className="text-xs text-white/85 font-semibold uppercase tracking-wider">Stream unavailable</div>
      <div className="text-[10px] text-cyan-300/70 max-w-xs">
        Source didn't expose a playable feed. The marker remains on the map for location context.
      </div>
      {name ? <div className="text-[9px] text-cyan-400 font-mono mt-1">{name}</div> : null}
      {provider ? <div className="text-[8px] text-white/40 font-mono">provider: {provider} · kind: {kind || "camera"}</div> : null}
    </div>
  )
}

// Back-compat shim so old call sites keep working without the external
// link. Always returns the NoStreamStatusTile.
function ProviderInfoCard({ provider, name, kind }: { url?: string; provider?: string; name?: string; kind?: string }) {
  return <NoStreamStatusTile provider={provider} name={name} kind={kind} />
}

async function resolveYouTubeEmbedUrl(raw: string): Promise<string | null> {
  const localEmbed = normalizeYouTubeEmbedUrlSync(raw)
  if (localEmbed) return localEmbed
  try {
    const res = await fetch(`/api/eagle/youtube-embed?url=${encodeURIComponent(raw)}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return normalizeYouTubeEmbedUrlSync(raw)
    const data = await res.json()
    return (data?.embed_url as string) || normalizeYouTubeEmbedUrlSync(raw)
  } catch {
    return normalizeYouTubeEmbedUrlSync(raw)
  }
}

function YouTubeEmbedResolver({ rawUrl, name }: { rawUrl: string; name?: string }) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(() => normalizeYouTubeEmbedUrlSync(rawUrl) || rawUrl)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    const immediate = normalizeYouTubeEmbedUrlSync(rawUrl)
    if (immediate) {
      setEmbedUrl(immediate)
      return () => { cancelled = true }
    }
    setEmbedUrl(null)
    resolveYouTubeEmbedUrl(rawUrl).then((resolved) => {
      if (cancelled) return
      if (resolved) setEmbedUrl(resolved)
      else setFailed(true)
    })
    return () => { cancelled = true }
  }, [rawUrl])

  if (failed) {
    return <NoStreamStatusTile provider="youtube_live" name={name} />
  }
  if (!embedUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-cyan-400">
        Loading YouTube stream…
      </div>
    )
  }
  return (
    <iframe
      src={embedUrl}
      className="w-full h-full bg-black"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      loading="eager"
      title={name || "YouTube live stream"}
    />
  )
}

function IframeEmbed({ url, provider, name }: { url: string; provider?: string; name?: string }) {
  // Apr 20, 2026 (Morgan: "all videos that say anything like this need a
  // full workaround to get that video placed in a passthrough directly
  // into the widget no excuses").
  //
  // Decision tree:
  //   1. URL matches video-player whitelist (EarthCam embed, YouTube,
  //      Twitch, Vimeo, Windy player, *.m3u8, /hls/, /whep/, etc.) →
  //      iframe directly. These are designed for embedding.
  //   2. URL is for a provider known to host a <video> element on the
  //      page (alertwildfire, surfline, hpwren, nps, usgs, windy,
  //      skylinewebcams, webcamtaxi, ski/zoo/wildlife sites in the
  //      cam-snapshot allowlist) → render via SnapshotProxyVideo which
  //      headless-renders the page, screenshots the video element
  //      every 8 s, and serves the JPEG. No iframe at all.
  //   3. Anything else → info card with external link.
  // CBP wait-time pages, static-POE markers, etc. → no video element,
  // skip snapshot attempt entirely
  if (provider && INFO_ONLY_PROVIDERS.has(provider)) {
    return <ProviderInfoCard url={url} provider={provider} name={name} />
  }

  const providerLc = (provider || "").toLowerCase()
  if (isTemporarilyUnplayableProvider(providerLc)) {
    return <NoStreamStatusTile provider={provider} name={name} />
  }
  const youtubeCandidate =
    providerLc === "youtube_live" ||
    providerLc === "youtube-live" ||
    providerLc.includes("youtube") ||
    isYouTubeUrl(url)
  const iframeSrc = youtubeCandidate ? null : looksLikeVideoEmbed(url) ? url : null

  if (youtubeCandidate) {
    return <YouTubeEmbedResolver rawUrl={url} name={name} />
  }

  if (iframeSrc) {
    const src = iframeSrc
    // Apr 22, 2026 — Morgan: "every surfline camera needs to not open a
    // widget with a play button it needs to open the video widget and
    // auto play". Autoplay is in the allow list; eager load so we don't
    // wait for intersection observer; referrerPolicy kept permissive so
    // surfline/earthcam/twitch can verify the embed source.
    return (
      <iframe
        src={src}
        className="w-full h-full bg-black"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        loading="eager"
        title={name || "Live stream"}
      />
    )
  }

  if (looksLikeVideoEmbed(url)) {
    return (
      <iframe
        src={url}
        className="w-full h-full bg-black"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        loading="eager"
      />
    )
  }

  const SNAPSHOT_PROVIDERS = new Set([
    "hpwren",
    "alertwildfire",
    "alertcalifornia",
    "windy",
    "nps",
    "usgs",
    "caltrans",
  ])
  const headlessSnapshotsEnabled = false
  const providerKey = (provider || "").toLowerCase()
  if (headlessSnapshotsEnabled && (SNAPSHOT_PROVIDERS.has(providerKey) || /hpwren|windy|alert/i.test(url))) {
    return <SnapshotProxyVideo url={url} provider={provider} name={name} />
  }

  return <NoStreamStatusTile provider={provider} name={name} />
}

// Headless-snapshot-backed pseudo-video player. Loads the upstream
// viewer page in server-side Chromium, screenshots the <video> element
// every 20 s, serves the resulting JPEG via /api/eagle/cam-snapshot.
// Auto-refreshes every 20 s so the widget shows near-live frames. If
// the snapshot service can't render (host not allowlisted, no video
// element on page, render error), gracefully falls back to the
// ProviderInfoCard with external link.
function SnapshotProxyVideo({ url, provider, name }: { url: string; provider?: string; name?: string }) {
  // Apr 21, 2026 (Morgan: "any widget that falls back to This source
  // doesn't expose a live video stream ... needs to be automatically
  // checked for linked video stream and that video stream needs to be
  // fit perfectly into widget").
  //
  // Selector-chain fallback — we try multiple CSS selectors in order,
  // advancing to the next one when the current one returns 502 (no
  // element found). Final fallback is `mode=fullpage` which screenshots
  // the whole viewer page. Only after ALL attempts fail do we show the
  // no-stream status tile.
  // Apr 22, 2026 — Surfline renders cam inside a nested iframe with a
  // canvas; the <video> element is gated behind their player JS. Broad
  // chain + body fallback so we always end up with SOME screenshot.
  //
  // Apr 23, 2026 — Morgan: "none of these headless cameras work at
  // all ... fix that". State-DOT providers (nysdot/vdot/chart-md/ddot)
  // viewer pages are <img>-based not <video>, so we skip straight to
  // the `img` selector and fall through to body. Starting at "video"
  // wastes 8s + a 502 before advancing.
  const selectorChain = provider === "hpwren" ? ["img[src*='camera']", "img", "video", "canvas", "body"]
                      : provider === "windy" ? ["video", ".player-video", "canvas.leaflet-zoom-animated", "body"]
                      : provider === "alertwildfire" ? ["video", "img", "canvas", "body"]
                      : provider === "earthcam" ? ["body"]
                      : provider === "hdontap" ? ["video", "canvas", "img", "body"]
                      : provider === "surfline" ? ["video", "canvas", "img[src*='surfline']", "img", "body"]
                      : provider === "caltrans" ? ["img", "video", "body"]
                      : provider === "nysdot" ? ["img", "body"]
                      : provider === "vdot" ? ["img", "body"]
                      : provider === "chart-md" ? ["img", "body"]
                      : provider === "ddot" ? ["img", "body"]
                      : provider === "wsdot" ? ["img", "body"]
                      : provider === "fdot" ? ["img", "body"]
                      : provider === "txdot" ? ["img", "body"]
                      : ["video", "img", "canvas", "body"]
  const [t, setT] = useState(Date.now())
  const [selectorIdx, setSelectorIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const refreshTimerRef = useRef<number | null>(null)
  const loadWatchdogRef = useRef<number | null>(null)

  const currentSelector = selectorChain[selectorIdx] || "body"
  const isFullpage = selectorIdx >= selectorChain.length - 1 && currentSelector === "body"
  const snapshotApi = `/api/eagle/cam-snapshot?url=${encodeURIComponent(url)}&selector=${encodeURIComponent(currentSelector)}${isFullpage ? "&mode=fullpage" : ""}&_t=${t}`
  const refreshDelayMs = videoWallRefreshDelayMs(provider, url, currentSelector)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const clearLoadWatchdog = useCallback(() => {
    if (loadWatchdogRef.current !== null) {
      window.clearTimeout(loadWatchdogRef.current)
      loadWatchdogRef.current = null
    }
  }, [])

  const scheduleNextRefresh = useCallback((delayMs: number) => {
    if (typeof window === "undefined") return
    clearRefreshTimer()
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNextRefresh(delayMs)
        return
      }
      setT(Date.now())
    }, delayMs)
  }, [clearRefreshTimer])

  useEffect(() => {
    return () => {
      clearRefreshTimer()
      clearLoadWatchdog()
    }
  }, [clearLoadWatchdog, clearRefreshTimer])

  useEffect(() => {
    setSelectorIdx(0)
    setAllFailed(false)
    setT(Date.now())
    clearRefreshTimer()
    clearLoadWatchdog()
  }, [clearLoadWatchdog, clearRefreshTimer, url])

  useEffect(() => {
    clearLoadWatchdog()
    loadWatchdogRef.current = window.setTimeout(() => {
      loadWatchdogRef.current = null
      if (selectorIdx < selectorChain.length - 1) {
        setSelectorIdx((idx) => Math.min(idx + 1, selectorChain.length - 1))
      } else {
        setAllFailed(true)
      }
    }, isFullpage ? 10_000 : 7_000)
    return clearLoadWatchdog
  }, [clearLoadWatchdog, currentSelector, isFullpage, selectorChain.length, selectorIdx, url])

  const onImgError = () => {
    clearLoadWatchdog()
    clearRefreshTimer()
    // Advance to next selector; if exhausted, show no-stream tile
    if (selectorIdx < selectorChain.length - 1) {
      console.warn(`[VideoWall] selector "${currentSelector}" failed → trying "${selectorChain[selectorIdx + 1]}"`)
      setSelectorIdx(selectorIdx + 1)
    } else {
      console.warn(`[VideoWall] all ${selectorChain.length} selectors failed for ${provider}/${url}`)
      setAllFailed(true)
    }
  }

  if (allFailed) {
    return <NoStreamStatusTile provider={provider} name={name} />
  }
  return (
    <div className="relative w-full h-full bg-black group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={snapshotApi}
        alt=""
        className="w-full h-full object-contain bg-black"
        onError={onImgError}
        onLoad={(event) => {
          clearLoadWatchdog()
          const img = event.currentTarget
          if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
            onImgError()
            return
          }
          scheduleNextRefresh(refreshDelayMs)
        }}
      />
      <div className="absolute top-2 left-2 bg-black/70 text-cyan-300 text-[9px] px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
        ◉ LIVE · headless render · sel={currentSelector}
      </div>
      {name ? (
        <div className="absolute bottom-2 left-2 bg-black/60 text-cyan-200 text-[9px] px-2 py-1 rounded font-mono border border-cyan-500/30">
          {name}
        </div>
      ) : null}
    </div>
  )
}

function MjpegStream({ url }: { url: string }) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setRetryNonce(0)
    setFailed(false)
  }, [url])
  const src = withRetryParam(url, retryNonce)
  useEffect(() => {
    const image = imageRef.current
    return () => {
      if (!image) return
      try { image.removeAttribute("src") } catch { /* ignore */ }
    }
  }, [src])
  const retry = () => {
    if (retryNonce >= 3) {
      setFailed(true)
      return
    }
    window.setTimeout(() => setRetryNonce((value) => value + 1), 1_500 * (retryNonce + 1))
  }
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-center text-[10px] uppercase tracking-wide text-cyan-300/70">
        Camera feed unavailable
      </div>
    )
  }
  // Continuous MJPEG multipart/x-mixed-replace — the browser decodes
  // frames natively off a single long-lived <img>.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} src={src} alt="Live feed" className="w-full h-full object-contain bg-black" onError={retry} />
}

function SnapshotStream({ url, embedUrl, provider, name }: { url: string; embedUrl?: string; provider?: string; name?: string }) {
  // Auto-refresh still JPEG every 20 s with cache-busting query. Covers
  // HPWREN / ALERTWildfire / USGS cams that publish a fresh image every
  // 2-5 min. The browser keeps the previous image painted while the new
  // one loads — no flicker.
  //
  // Apr 20, 2026 (Morgan: "SOME VIDEOS SHOW BROKEN LIVE SNAPSHOT TEXT
  // WITH BROKEN LINK"). Added onError → fallback card so broken image
  // URLs (expired cert, 404, host down) render a clean "image unavailable"
  // card with a link to the provider site instead of the browser's raw
  // broken-image icon + alt-text.
  //
  // Apr 20, 2026 perf-3: skip refresh interval when document.hidden so
  // backgrounded widgets stop hammering the snapshot proxy.
  const [t, setT] = useState(Date.now())
  const [failed, setFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const refreshTimerRef = useRef<number | null>(null)
  const normalizedUrl = normalizeEagleStillImageUrl(url) || url
  const providerLc = (provider || "").toLowerCase()
  const shouldUseViewerSnapshotProxy =
    !isStillImageUrl(normalizedUrl) &&
    (
      providerLc === "windy" ||
      providerLc === "webcamtaxi" ||
      providerLc === "skylinewebcams" ||
      /windy\.com|webcamtaxi\.com|skylinewebcams\.com/i.test(normalizedUrl)
    )

  const refreshDelayMs = videoWallRefreshDelayMs(provider, normalizedUrl)
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])
  const scheduleNextRefresh = useCallback((delayMs: number) => {
    if (typeof window === "undefined") return
    clearRefreshTimer()
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNextRefresh(delayMs)
        return
      }
      setT(Date.now())
    }, delayMs)
  }, [clearRefreshTimer])
  useEffect(() => clearRefreshTimer, [clearRefreshTimer])
  // Reset failure state when url changes (different cam selected)
  useEffect(() => {
    clearRefreshTimer()
    setFailed(false)
    setRetryCount(0)
    setT(Date.now())
  }, [clearRefreshTimer, normalizedUrl])

  if (shouldUseViewerSnapshotProxy) {
    return <SnapshotProxyVideo url={normalizedUrl} provider={provider} name={name} />
  }

  const src = normalizedUrl.includes("?") ? `${normalizedUrl}&_t=${t}` : `${normalizedUrl}?_t=${t}`
  const retryImage = () => {
    clearRefreshTimer()
    if (retryCount >= 3) {
      setFailed(true)
      return
    }
    window.setTimeout(() => {
      setRetryCount((value) => value + 1)
      setT(Date.now())
    }, 2_000)
  }

  if (failed) {
    // Apr 23, 2026 — Morgan: "not one nyc camera works". Verified that
    // 511ny.org/map/GetImage?id=* currently 302-redirects to /NotFound
    // (HTML 404) for every cam, so the JPEG the proxy expects never
    // arrives. This is an UPSTREAM outage on 511ny.org's side, not a
    // bug in our proxy or cam selection. Show a provider-specific
    // status so it's obvious Mycosoft isn't at fault.
    const providerLc = (provider || "").toLowerCase()
    const isStateDot = /nysdot|vdot|mdot|dotd|wsdot|fdot|txdot|caltrans|chart|511/.test(providerLc)
    const isNysdot = providerLc.includes("nysdot") || providerLc.includes("511ny") || /511ny\.org/.test(normalizedUrl)
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#061121] flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="text-3xl opacity-40">📷</div>
        <div className="text-xs text-white font-semibold">
          {isNysdot ? "NYSDOT camera upstream offline" : isStateDot ? "State DOT camera offline" : "Image unavailable"}
        </div>
        <div className="text-[10px] text-gray-400 max-w-xs">
          {isNysdot
            ? "511ny.org is currently returning HTTP 404 for all camera JPEGs. Wait for NYSDOT's feed to come back — the map marker stays so the camera re-appears the moment they fix upstream."
            : isStateDot
            ? "Upstream state DOT image feed is returning an error. Try the provider site or check back later."
            : provider
            ? `${provider} didn't serve a still frame — the source host may be offline or blocking our proxy.`
            : "Source host offline or blocking proxy."}
        </div>
        {false && embedUrl ? (
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-700 hover:bg-cyan-500 text-white text-[11px] px-3 py-1.5 rounded font-semibold border border-cyan-400/40 transition-colors"
          >
            Open provider site ↗
          </a>
        ) : null}
        {name ? <div className="text-[9px] text-cyan-400 font-mono">{name}</div> : null}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain bg-black"
        onError={retryImage}
        onLoad={(event) => {
          const img = event.currentTarget
          if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
            retryImage()
            return
          }
          setRetryCount(0)
          setFailed(false)
          scheduleNextRefresh(refreshDelayMs)
        }}
      />
      {retryCount > 0 && !failed && (
        <div className="absolute right-2 top-2 rounded border border-cyan-500/30 bg-black/70 px-2 py-1 text-[9px] font-mono text-cyan-200">
          Refreshing camera frame
        </div>
      )}
      {false && embedUrl && (
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 bg-black/60 hover:bg-cyan-700/80 text-cyan-200 hover:text-white text-[10px] px-2 py-1 rounded pointer-events-auto border border-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open full player"
        >
          Live player ↗
        </a>
      )}
    </div>
  )
}

export default function VideoWallWidget() {
  const [feed, setFeed] = useState<ActiveFeed | null>(null)
  const [resolved, setResolved] = useState<ResolvedStream | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastOpenAtRef = useRef(0)
  const lastCameraEventRef = useRef<{ id: string; at: number } | null>(null)
  const resolveSeqRef = useRef(0)
  const closeWidget = useCallback(() => {
    resolveSeqRef.current += 1
    setFeed(null)
    setResolved(null)
    setLoading(false)
    setMinimized(false)
    setMaximized(false)
  }, [])
  const handleCloseControl = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void; nativeEvent?: { stopImmediatePropagation?: () => void } }) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    event?.nativeEvent?.stopImmediatePropagation?.()
    closeWidget()
  }, [closeWidget])
  const consumeClosePointerDown = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void; nativeEvent?: { stopImmediatePropagation?: () => void } }) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    event?.nativeEvent?.stopImmediatePropagation?.()
  }, [])

  // Listen for camera + event clicks from EagleEyeOverlay
  useEffect(() => {
    // Apr 20, 2026 fix (Morgan: "see camera icon but in widget no video
    // resolving stream only needs to be instant load"). Previously only
    // onEvent read d.embed_url; onCamera dropped it → every permanent
    // camera click round-tripped to /api/eagle/stream/{id}, which 404'd
    // for every STATIC_SEED camera because those aren't in MINDEX yet.
    // Result: "Resolving stream…" stayed up indefinitely.
    //
    // Now both handlers pass through the direct stream_url / embed_url
    // from the feature properties. EagleEyeOverlay already populates
    // these on every source's GeoJSON feature (see eagle-eye-overlay.tsx
    // properties mapping). If present, we skip the /stream lookup
    // entirely and render instantly.
    const isViewerPage = (u: string) =>
      /\.htm(\?|$)/i.test(u) ||
      /cwwp2\.dot\.ca\.gov\/vm\//i.test(u) ||
      /bwt\.cbp\.gov/i.test(u)

    const onCamera = (e: any) => {
      const d = e?.detail || {}
      const eventId = String(d.id || d.name || d.stream_url || d.embed_url || "")
      const now = Date.now()
      if (eventId && lastCameraEventRef.current?.id === eventId && now - lastCameraEventRef.current.at < 150) return
      if (eventId) lastCameraEventRef.current = { id: eventId, at: now }
      lastOpenAtRef.current = Date.now()
      const streamUrl = d.stream_url || undefined
      const embedUrl = d.embed_url || undefined
      const mediaUrl = d.media_url || undefined
      const sourceStatus = isKnownUnavailableFeedId(d.id) ? "temporarily_unavailable" : d.source_status || d.status || undefined
      const providerLc = String(d.provider || "").toLowerCase()
      const hasYouTubeUrl = isYouTubeUrl(streamUrl || "") || isYouTubeUrl(embedUrl || "")
      const resolveViaStreamApi =
        (providerLc === "earthcam" || providerLc === "skylinewebcams" || providerLc === "surfline") &&
        !hasYouTubeUrl &&
        !isHlsUrl(streamUrl)
      const directEmbed =
        resolveViaStreamApi
          ? undefined
          :
        (streamUrl && isHlsUrl(streamUrl) ? streamUrl : undefined) ||
        (streamUrl && !isViewerPage(streamUrl) ? streamUrl : undefined) ||
        (embedUrl && isHlsUrl(embedUrl) ? embedUrl : undefined) ||
        (embedUrl && looksLikeVideoEmbed(embedUrl) && !isViewerPage(embedUrl) ? embedUrl : undefined) ||
        undefined
      setResolved(null)
      setLoading(false)
      setMinimized(false)
      setMaximized(false)
      setFeed({
        id: d.id, name: d.name || `${d.provider} camera`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "camera",
        directEmbed,
        embedUrl,
        mediaUrl,
        sourceStatus,
      })
    }
    const onEvent = (e: any) => {
      const d = e?.detail || {}
      lastOpenAtRef.current = Date.now()
      setFeed({
        id: d.id, name: d.title || d.name || `${d.provider} clip`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "video_event",
        directEmbed: d.stream_url || d.embed_url || undefined,
        embedUrl: d.embed_url || undefined,
        mediaUrl: d.media_url || undefined,
        sourceStatus: d.source_status || d.status || undefined,
        thumbnail: d.thumbnail || undefined,
        confidence: d.confidence,
      })
    }
    window.addEventListener("crep:eagle:camera-click", onCamera as any)
    window.addEventListener("crep:camera:click", onCamera as any)
    window.addEventListener("crep:eagle:event-click", onEvent as any)
    return () => {
      window.removeEventListener("crep:eagle:camera-click", onCamera as any)
      window.removeEventListener("crep:camera:click", onCamera as any)
      window.removeEventListener("crep:eagle:event-click", onEvent as any)
    }
  }, [])

  useEffect(() => {
    const closeOnMapClick = (event: MouseEvent) => {
      if (!feed) return
      if (Date.now() - lastOpenAtRef.current < 300) return
      const target = event.target as HTMLElement | null
      if (target?.closest?.("[data-video-wall-widget]")) return
      if (target?.closest?.(".maplibregl-canvas, .mapboxgl-canvas, [data-crep-map]")) {
        closeWidget()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWidget()
    }
    window.addEventListener("crep:eagle:close", closeWidget as EventListener)
    window.addEventListener("click", closeOnMapClick, true)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("crep:eagle:close", closeWidget as EventListener)
      window.removeEventListener("click", closeOnMapClick, true)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [closeWidget, feed])

  // May 26, 2026 — Caltrans HLS via stream API when registry lacks m3u8;
  // proxied JPEG fallback only after HLS fails; Surfline embed-cam iframe.
  useEffect(() => {
    if (!feed) {
      resolveSeqRef.current += 1
      setResolved(null)
      setLoading(false)
      return
    }
    setResolved(null)
    setLoading(false)
    const resolveSeq = ++resolveSeqRef.current
    let cancelled = false
    const isCurrentResolve = () => !cancelled && resolveSeq === resolveSeqRef.current
    const settleResolved = (next: ResolvedStream) => {
      if (!isCurrentResolve()) return false
      setResolved(next)
      setLoading(false)
      return true
    }

    if (
      isUnavailableFeedStatus(feed.sourceStatus) ||
      isKnownUnavailableFeedId(feed.id) ||
      isTemporarilyUnplayableProvider(feed.provider)
    ) {
      const unavailableReason = feed.sourceStatus
        ? `Source status: ${feed.sourceStatus}`
        : `${feed.provider || "source"} live stream unavailable`
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "iframe",
        error: unavailableReason,
      })
      return () => { cancelled = true }
    }

    const isHls    = (u: string) => isHlsUrl(u)
    const isWhep   = (u: string) => /\/whep(\?|\/|$)/i.test(u)
    const isMjpeg  = (u: string) => /\/mjpeg(\?|\/|$)/i.test(u) || /multipart\/x-mixed-replace/i.test(u)
    const isStill  = (u: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) || /\/api\/eagle\/cam-image/i.test(u)

    const pickStreamType = (url: string, apiType?: string): StreamType => {
      if (apiType === "snapshot") return "snapshot"
      if (isHls(url))        return "hls"
      if (isWhep(url))       return "webrtc"
      if (isMjpeg(url))      return "mjpeg"
      if (isStill(url))      return "snapshot"
      return "iframe"
    }

    const pickLiveUrl = (...candidates: (string | undefined | null)[]) => {
      for (const candidate of candidates) {
        if (candidate && !isStill(candidate)) return candidate
      }
      return undefined
    }

    function deriveSurflineEmbed(embed: string | undefined): string | null {
      if (!embed) return null
      const m = /surfline\.com\/surf-report\/[^/]+\/([a-f0-9]{16,})/i.exec(embed)
      if (!m) return null
      return `https://www.surfline.com/embed-cam/${m[1]}?autoplay=1&muted=1&playsinline=1`
    }

    const providerLc = (feed.provider || "").toLowerCase()
    const normalizedMediaUrl = normalizeEagleStillImageUrl(feed.mediaUrl)
    const isSnapshotPageProvider =
      providerLc === "webcamtaxi" ||
      providerLc === "windy"
    const caltransNeedsResolve =
      providerLc === "caltrans"

    const de = caltransNeedsResolve
      ? undefined
      : pickLiveUrl(feed.directEmbed)

    // 1: live video (HLS / WebRTC / MJPEG) wins
    if (de && (isHls(de) || isWhep(de) || isMjpeg(de))) {
      const snap =
        providerLc === "caltrans"
          ? proxiedCaltransSnapshot(feed.embedUrl, feed.mediaUrl)
          : feed.mediaUrl && isStill(feed.mediaUrl)
            ? feed.mediaUrl
            : null
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: isHls(de) ? "hls" : isWhep(de) ? "webrtc" : "mjpeg",
        stream_url: de,
        embed_url: feed.embedUrl || de,
        snapshot_url: snap || undefined,
      })
      return
    }

    // 2: Surfline — rewrite surf-report to embed-cam
    const surflineEmbed = deriveSurflineEmbed(de || feed.embedUrl)
    if (surflineEmbed && providerLc !== "surfline") {
      const embed = surflineEmbed
      if (embed) {
        setResolved({
          id: feed.id,
          provider: feed.provider,
          kind: feed.kind === "camera" ? "permanent" : "ephemeral",
          stream_type: "iframe",
          stream_url: embed,
          embed_url: embed,
        })
        return
      }
    }

    // 3: YouTube — always iframe
    const isYoutubeFeed =
      providerLc.includes("youtube") || (de ? isYouTubeUrl(de) : false) || (feed.embedUrl ? isYouTubeUrl(feed.embedUrl) : false)
    const ytRaw = de || feed.embedUrl

    if (ytRaw && isYoutubeFeed) {
      const yt = normalizeYouTubeEmbedUrlSync(ytRaw) || ytRaw
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "iframe",
        embed_url: yt,
        stream_url: yt,
      })
      return
    }

    if (providerLc !== "caltrans" && normalizedMediaUrl && isStill(normalizedMediaUrl)) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "snapshot",
        stream_url: normalizedMediaUrl,
        embed_url: feed.embedUrl,
        snapshot_url: normalizedMediaUrl,
      })
      return
    }

    if (isSnapshotPageProvider && feed.embedUrl) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "snapshot",
        stream_url: feed.embedUrl,
        embed_url: feed.embedUrl,
      })
      return
    }

    // 4: any other live directEmbed
    if (de) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: pickStreamType(de),
        embed_url: de,
        stream_url: de,
      })
      return
    }

    // 5: server-side live stream resolver (Caltrans HLS lookup, Surfline, etc.)
    setLoading(true)
    void (async () => {
      try {
        const r = await resolveStream(feed.id, {
          embed_url: feed.embedUrl,
          media_url: normalizedMediaUrl || feed.mediaUrl,
        })
        if (!isCurrentResolve()) return
        if (r.stream_type === "snapshot" && r.stream_url) {
          settleResolved({
            ...r,
            embed_url: r.embed_url || feed.embedUrl,
            snapshot_url: r.stream_url,
          })
          return
        }
        const liveFromApi = pickLiveUrl(r.stream_url, r.embed_url)
        if (liveFromApi) {
          const snap =
            r.snapshot_url ||
            (providerLc === "caltrans"
              ? proxiedCaltransSnapshot(feed.embedUrl || r.embed_url, normalizedMediaUrl || feed.mediaUrl)
              : null)
          settleResolved({
            ...r,
            stream_url: liveFromApi,
            embed_url: r.embed_url || feed.embedUrl || liveFromApi,
            snapshot_url: snap || undefined,
            stream_type: pickStreamType(liveFromApi, r.stream_type),
          })
          return
        }
        if (r.error) {
          settleResolved({
            ...r,
            id: feed.id,
            provider: feed.provider,
            kind: feed.kind === "camera" ? "permanent" : "ephemeral",
            error: r.error,
          })
          return
        }
        if (providerLc === "earthcam") {
          settleResolved({
            ...r,
            id: feed.id,
            provider: feed.provider,
            kind: feed.kind === "camera" ? "permanent" : "ephemeral",
            error: r.error || "EarthCam live stream unavailable",
          })
          return
        }
        const resolvedLive = await resolveEagleLiveStream({
          id: feed.id,
          stream_url: r.stream_url || feed.mediaUrl,
          embed_url: r.embed_url || feed.embedUrl,
          media_url: normalizedMediaUrl || feed.mediaUrl,
          provider: feed.provider,
        })
        if (!isCurrentResolve()) return
        if (resolvedLive) {
          settleResolved({
            id: feed.id,
            provider: feed.provider,
            kind: feed.kind === "camera" ? "permanent" : "ephemeral",
            stream_type: resolvedLive.stream_type,
            stream_url: resolvedLive.url,
            embed_url: feed.embedUrl || resolvedLive.url,
            snapshot_url:
              resolvedLive.stream_type === "snapshot"
                ? resolvedLive.url
                : normalizedMediaUrl && isStill(normalizedMediaUrl)
                  ? normalizedMediaUrl
                  : undefined,
          })
        } else if (normalizedMediaUrl && isStill(normalizedMediaUrl)) {
          settleResolved({
            id: feed.id,
            provider: feed.provider,
            kind: feed.kind === "camera" ? "permanent" : "ephemeral",
            stream_type: "snapshot",
            stream_url: normalizedMediaUrl,
            embed_url: feed.embedUrl,
            snapshot_url: normalizedMediaUrl,
          })
        } else {
          settleResolved({ ...r, error: r.error || "No live video stream available" })
        }
      } catch (err) {
        settleResolved({
          id: feed.id,
          provider: feed.provider,
          kind: feed.kind === "camera" ? "permanent" : "ephemeral",
          stream_type: "iframe",
          error: (err as Error)?.message || "Stream resolver failed",
        })
      }
    })()

    return () => { cancelled = true }
  }, [feed])

  if (!feed) return null

  const posClass = maximized
    ? "inset-4"
    : minimized
    ? "bottom-4 right-4 w-64 h-16"
    : "bottom-4 right-4 w-[420px] h-[300px]"

  return (
    <div
      data-video-wall-widget
      className={`fixed z-[10000] ${posClass} bg-[#0a1628] border border-cyan-500/40 rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all`}
      style={{ transitionDuration: "150ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-900/70 to-blue-900/30 border-b border-cyan-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <CameraIcon className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{feed.name}</div>
            <div className="text-[10px] text-cyan-300/80 uppercase tracking-wide truncate">
              {feed.provider} · {feed.lat?.toFixed(6)}, {feed.lng?.toFixed(6)}
              {feed.confidence != null && feed.kind === "video_event" ? (
                <span className="ml-2 text-yellow-400">confidence {(feed.confidence * 100).toFixed(0)}%</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(event) => {
              setMinimized((m) => !m)
              event.preventDefault()
              event.stopPropagation()
            }}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Minimize"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={(event) => {
              setMaximized((m) => !m)
              setMinimized(false)
              event.preventDefault()
              event.stopPropagation()
            }}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Maximize"
            title={maximized ? "Restore" : "Maximize"}
          >
            <Square className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            type="button"
            onPointerDown={consumeClosePointerDown}
            onClick={handleCloseControl}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex-1 bg-black relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-cyan-400">
              Resolving stream…
            </div>
          )}
          {!loading && resolved?.error && (
            <NoStreamStatusTile provider={feed.provider} name={feed.name} kind={feed.kind} />
          )}
          {!loading && resolved && !resolved.error && (() => {
            const url = resolved.stream_url || resolved.embed_url || feed.directEmbed
            if (!url) {
              return (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-yellow-400 p-4 text-center">
                  No playable URL on this source.
                </div>
              )
            }
            switch (resolved.stream_type) {
              case "hls":
                return (
                  <HlsWithSnapshotFallback
                    url={url}
                    fallbackSnapshot={
                      resolved.snapshot_url ||
                      (feed.provider === "caltrans"
                        ? proxiedCaltransSnapshot(feed.embedUrl, feed.mediaUrl)
                        : normalizeEagleStillImageUrl(feed.mediaUrl))
                    }
                    embedUrl={resolved.embed_url || feed.embedUrl}
                    provider={feed.provider}
                    name={feed.name}
                  />
                )
              case "webrtc": return <WebRTCPlayer url={url} />
              case "iframe": return <IframeEmbed url={url} provider={feed.provider} name={feed.name} />
              case "mjpeg": return <MjpegStream url={url} />
              case "snapshot":
                return (
                  <SnapshotStream
                    url={url}
                    embedUrl={resolved.embed_url || feed.embedUrl}
                    provider={feed.provider}
                    name={feed.name}
                  />
                )
              default: return <IframeEmbed url={url} provider={feed.provider} name={feed.name} />
            }
          })()}
        </div>
      )}
    </div>
  )
}
