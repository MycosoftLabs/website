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

import { useEffect, useRef, useState } from "react"
import { X, Minus, Square, Camera as CameraIcon } from "lucide-react"

type StreamType = "hls" | "webrtc" | "iframe" | "mjpeg" | "snapshot"

interface ResolvedStream {
  id: string
  provider: string
  kind: "permanent" | "ephemeral"
  stream_url?: string
  embed_url?: string
  stream_type: StreamType
  error?: string
}

interface ActiveFeed {
  id: string
  name: string
  provider: string
  lat: number
  lng: number
  // For direct-payload events (e.g. YouTube live from the overlay), we
  // already have embed_url on the click detail — skip the /stream lookup.
  directEmbed?: string
  thumbnail?: string
  confidence?: number
  kind: "camera" | "video_event"
}

async function resolveStream(sourceId: string): Promise<ResolvedStream> {
  const res = await fetch(`/api/eagle/stream/${encodeURIComponent(sourceId)}`)
  if (!res.ok) return { id: sourceId, provider: "unknown", kind: "permanent", stream_type: "iframe", error: `HTTP ${res.status}` }
  return res.json()
}

function HlsPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cleanup = () => {}
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari, Edge on macOS/iOS)
      video.src = url
      video.play().catch(() => { /* autoplay blocked */ })
    } else {
      // Dynamic import hls.js
      import("hls.js").then((Hls) => {
        const H = (Hls as any).default || Hls
        if (!H.isSupported()) {
          console.warn("[VideoWallWidget] hls.js unsupported in this browser")
          return
        }
        const hls = new H({ maxBufferLength: 10 })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(H.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
        cleanup = () => hls.destroy()
      }).catch((err) => {
        console.warn("[VideoWallWidget] hls.js import failed — falling back to direct src:", err?.message)
        video.src = url
      })
    }
    return cleanup
  }, [url])
  return (
    <video
      ref={videoRef}
      className="w-full h-full bg-black"
      controls
      muted
      playsInline
    />
  )
}

function WebRTCPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let pc: RTCPeerConnection | null = null
    let stopped = false
    ;(async () => {
      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
        pc.addTransceiver("video", { direction: "recvonly" })
        pc.addTransceiver("audio", { direction: "recvonly" })
        pc.ontrack = (e) => {
          if (videoRef.current && !stopped) {
            videoRef.current.srcObject = e.streams[0]
            videoRef.current.play().catch(() => {})
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
      try { pc?.close() } catch { /* ignore */ }
    }
  }, [url])
  if (err) return <div className="p-4 text-sm text-red-400 bg-black/80">{err}</div>
  return <video ref={videoRef} className="w-full h-full bg-black" controls muted playsInline />
}

function IframeEmbed({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full h-full bg-black"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      referrerPolicy="no-referrer-when-downgrade"
      loading="lazy"
    />
  )
}

function MjpegStream({ url }: { url: string }) {
  // Continuous MJPEG multipart/x-mixed-replace — the browser decodes
  // frames natively off a single long-lived <img>.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Live feed" className="w-full h-full object-contain bg-black" />
}

function SnapshotStream({ url, embedUrl }: { url: string; embedUrl?: string }) {
  // Auto-refresh still JPEG every 20 s with cache-busting query. Covers
  // HPWREN / ALERTWildfire / USGS cams that publish a fresh image every
  // 2-5 min. The browser keeps the previous image painted while the new
  // one loads — no flicker. Clicking opens the upstream player page
  // (embed_url) in a new tab for the live player.
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 20_000)
    return () => clearInterval(id)
  }, [])
  const src = url.includes("?") ? `${url}&_t=${t}` : `${url}?_t=${t}`
  return (
    <div className="relative w-full h-full bg-black group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Live snapshot" className="w-full h-full object-contain bg-black" />
      {embedUrl && (
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
    const onCamera = (e: any) => {
      const d = e?.detail || {}
      setFeed({
        id: d.id, name: d.name || `${d.provider} camera`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "camera",
        directEmbed: d.embed_url || d.stream_url || undefined,
        thumbnail: d.media_url || d.thumbnail || undefined,
      })
    }
    const onEvent = (e: any) => {
      const d = e?.detail || {}
      setFeed({
        id: d.id, name: d.title || d.name || `${d.provider} clip`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "video_event",
        directEmbed: d.embed_url || d.stream_url || undefined,
        thumbnail: d.thumbnail || d.media_url || undefined,
        confidence: d.confidence,
      })
    }
    window.addEventListener("crep:eagle:camera-click", onCamera as any)
    window.addEventListener("crep:eagle:event-click", onEvent as any)
    return () => {
      window.removeEventListener("crep:eagle:camera-click", onCamera as any)
      window.removeEventListener("crep:eagle:event-click", onEvent as any)
    }
  }, [])

  // Resolve stream URL when feed changes. Priority order:
  //   1. media_url ending in .jpg/.jpeg/.png → render as auto-refreshing
  //      snapshot (instant load, perfect for HPWREN static cams)
  //   2. directEmbed pointing to .m3u8 → HLS player (Shinobi / MediaMTX)
  //   3. directEmbed pointing to WHEP endpoint → WebRTC (low-latency)
  //   4. Any other directEmbed → iframe (EarthCam, Surfline, Twitch, etc.)
  //   5. No direct URL → round-trip to /api/eagle/stream/{id}
  useEffect(() => {
    if (!feed) { setResolved(null); return }

    const pickStreamType = (url: string): StreamType => {
      if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return "snapshot"
      if (/\.m3u8(\?|$)/i.test(url)) return "hls"
      if (/\/whep(\?|$)|\/whep\//i.test(url)) return "webrtc"
      return "iframe"
    }

    // Instant-load path: thumbnail snapshot wins over iframe because it
    // starts rendering on the next paint with zero network spin-up. User
    // can still click the iframe URL in a new tab if they want the
    // full interactive player.
    if (feed.thumbnail && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(feed.thumbnail)) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "snapshot",
        stream_url: feed.thumbnail,
        embed_url: feed.directEmbed,
      })
      return
    }
    if (feed.directEmbed) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: pickStreamType(feed.directEmbed),
        embed_url: feed.directEmbed,
        stream_url: feed.directEmbed,
      })
      return
    }
    setLoading(true)
    resolveStream(feed.id).then((r) => {
      setResolved(r)
      setLoading(false)
    })
  }, [feed?.id, feed?.directEmbed, feed?.thumbnail])

  if (!feed) return null

  const posClass = maximized
    ? "inset-4"
    : minimized
    ? "bottom-4 right-4 w-64 h-16"
    : "bottom-4 right-4 w-[420px] h-[300px]"

  return (
    <div
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
              {feed.provider} · {feed.lat?.toFixed(3)}, {feed.lng?.toFixed(3)}
              {feed.confidence != null && feed.kind === "video_event" ? (
                <span className="ml-2 text-yellow-400">confidence {(feed.confidence * 100).toFixed(0)}%</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized((m) => !m)}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Minimize"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => { setMaximized((m) => !m); setMinimized(false) }}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Maximize"
            title={maximized ? "Restore" : "Maximize"}
          >
            <Square className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => setFeed(null)}
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
            <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400 p-4 text-center">
              Stream resolver error: {resolved.error}
              <br />
              <span className="text-gray-500 text-[10px]">
                Source may be offline or require additional auth.
              </span>
            </div>
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
              case "hls": return <HlsPlayer url={url} />
              case "webrtc": return <WebRTCPlayer url={url} />
              case "iframe": return <IframeEmbed url={url} />
              case "mjpeg": return <MjpegStream url={url} />
              case "snapshot": return <SnapshotStream url={url} embedUrl={resolved.embed_url} />
              default: return <IframeEmbed url={url} />
            }
          })()}
        </div>
      )}
    </div>
  )
}
