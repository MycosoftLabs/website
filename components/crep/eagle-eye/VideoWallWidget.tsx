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
  // Apr 23, 2026 audit: no timeout on the stream resolver meant a slow
  // Eagle Eye backend left every video tile stuck at "Loading stream".
  // 8 s deadline; on timeout we fall through to iframe embed which at
  // least lets the user click through to the provider site.
  try {
    const res = await fetch(`/api/eagle/stream/${encodeURIComponent(sourceId)}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { id: sourceId, provider: "unknown", kind: "permanent", stream_type: "iframe", error: `HTTP ${res.status}` }
    return res.json()
  } catch (err) {
    return { id: sourceId, provider: "unknown", kind: "permanent", stream_type: "iframe", error: (err as Error)?.message || "stream resolver timeout" }
  }
}

function HlsPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // Apr 22, 2026 v2 — Morgan: "caltrans cameras were working fine before
  // now they are just saying loading hls what happend fix that".
  //
  // v1 added an always-on "loading HLS…" overlay that dimmed the video
  // until the playing event fired — for Caltrans streams that take 1–3 s
  // to buffer the first segment the overlay made healthy streams *look*
  // broken. Reverted to: video shows immediately, NO loading overlay on
  // the happy path; error overlay ONLY on hls.js fatal errors.
  const [errMsg, setErrMsg] = useState<string>("")
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setErrMsg("")
    let cleanup = () => {}

    // Let the browser's own "play" gesture handle readiness. No phase
    // state, no overlay until / unless fatal error.
    const kickPlay = () => video.play().catch(() => { /* autoplay blocked — user clicks play */ })

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari / iOS / Edge on macOS)
      video.src = url
      kickPlay()
    } else {
      import("hls.js").then((Hls) => {
        const H = (Hls as any).default || Hls
        if (!H.isSupported()) {
          // Firefox with plugin / older browsers — try direct src.
          video.src = url
          kickPlay()
          return
        }
        const hls = new H({ maxBufferLength: 10, manifestLoadingTimeOut: 12_000, levelLoadingTimeOut: 12_000, fragLoadingTimeOut: 12_000 })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(H.Events.MANIFEST_PARSED, kickPlay)
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
          setErrMsg(String(detail))
          try { hls.destroy() } catch { /* ignore */ }
        })
        cleanup = () => { try { hls.destroy() } catch { /* ignore */ } }
      }).catch((err) => {
        video.src = url
        video.play().catch(() => {
          setErrMsg("hls.js unavailable: " + (err?.message || ""))
        })
      })
    }

    return () => { cleanup() }
  }, [url])

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full bg-black"
        controls
        muted
        autoPlay
        playsInline
      />
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
  /youtube\.com\/embed\//i,
  /youtube\.com\/watch\?/i,
  /youtu\.be\//i,
  /player\.twitch\.tv/i,
  /player\.vimeo\.com/i,
  /windy\.com\/webcams\/\d+/i,                 // windy player URLs (webcam ID)
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
  if (looksLikeVideoEmbed(url)) {
    // Apr 22, 2026 — Morgan: "every surfline camera needs to not open a
    // widget with a play button it needs to open the video widget and
    // auto play". Autoplay is in the allow list; eager load so we don't
    // wait for intersection observer; referrerPolicy kept permissive so
    // surfline/earthcam/twitch can verify the embed source.
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
  // Try the headless snapshot service for everything else. The service
  // returns 403 for non-allowlisted hosts (then we fall back to info)
  // and 502 when the page has no video element to capture (same).
  return <SnapshotProxyVideo url={url} provider={provider} name={name} />
}

// Headless-snapshot-backed pseudo-video player. Loads the upstream
// viewer page in server-side Chromium, screenshots the <video> element
// every 8 s, serves the resulting JPEG via /api/eagle/cam-snapshot.
// Auto-refreshes every 8 s so the widget shows near-live frames. If
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
                      : provider === "surfline" ? ["video", "canvas", "iframe", "img[src*='surfline']", "img", "body"]
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

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      setT(Date.now())
    }, 8_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { setSelectorIdx(0); setAllFailed(false) }, [url])

  const currentSelector = selectorChain[selectorIdx] || "body"
  const isFullpage = selectorIdx >= selectorChain.length - 1 && currentSelector === "body"
  const snapshotApi = `/api/eagle/cam-snapshot?url=${encodeURIComponent(url)}&selector=${encodeURIComponent(currentSelector)}${isFullpage ? "&mode=fullpage" : ""}&_t=${t}`

  const onImgError = () => {
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
      />
      <div className="absolute top-2 left-2 bg-black/70 text-cyan-300 text-[9px] px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
        ◉ LIVE · headless render · sel={currentSelector} · refresh 8s
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
  // Continuous MJPEG multipart/x-mixed-replace — the browser decodes
  // frames natively off a single long-lived <img>.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Live feed" className="w-full h-full object-contain bg-black" />
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
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      setT(Date.now())
    }, 20_000)
    return () => clearInterval(id)
  }, [])
  // Reset failure state when url changes (different cam selected)
  useEffect(() => { setFailed(false) }, [url])

  const src = url.includes("?") ? `${url}&_t=${t}` : `${url}?_t=${t}`

  if (failed) {
    // Apr 23, 2026 — Morgan: "not one nyc camera works". Verified that
    // 511ny.org/map/GetImage?id=* currently 302-redirects to /NotFound
    // (HTML 404) for every cam, so the JPEG the proxy expects never
    // arrives. This is an UPSTREAM outage on 511ny.org's side, not a
    // bug in our proxy or cam selection. Show a provider-specific
    // status so it's obvious Mycosoft isn't at fault.
    const providerLc = (provider || "").toLowerCase()
    const isStateDot = /nysdot|vdot|mdot|dotd|wsdot|fdot|txdot|caltrans|chart|511/.test(providerLc)
    const isNysdot = providerLc.includes("nysdot") || providerLc.includes("511ny") || /511ny\.org/.test(url)
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
        {embedUrl ? (
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
        onError={() => setFailed(true)}
      />
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
      // Apr 20, 2026 (Morgan: Caltrans cam page shown instead of video).
      // PREFER stream_url (raw HLS m3u8 / WebRTC / MJPEG) over embed_url
      // (which is often a viewer page wrapping the video). Caltrans cams
      // expose stream_url=https://wzmedia.dot.ca.gov/D{N}/...m3u8 +
      // embed_url=https://cwwp2.dot.ca.gov/vm/iframemap.htm — we want
      // the m3u8 so HlsPlayer renders pure video, not the iframe page.
      setFeed({
        id: d.id, name: d.name || `${d.provider} camera`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "camera",
        directEmbed: d.stream_url || d.embed_url || undefined,
        thumbnail: d.media_url || d.thumbnail || undefined,
      })
    }
    const onEvent = (e: any) => {
      const d = e?.detail || {}
      // Same priority for ephemeral events.
      setFeed({
        id: d.id, name: d.title || d.name || `${d.provider} clip`, provider: d.provider,
        lat: d.lat, lng: d.lng, kind: "video_event",
        directEmbed: d.stream_url || d.embed_url || undefined,
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

  // Resolve stream URL when feed changes.
  //
  // Apr 22, 2026 v2 (Morgan: "this caltrans not working", "no surflines
  // working"). Priority reordered: LIVE video (HLS / WebRTC) ALWAYS wins
  // over a static snapshot when the source gave us both. Previously
  // Caltrans cams that carry both streamingVideoURL (m3u8) AND
  // currentImageURL (jpg) were rendering the stale jpg instead of the
  // live feed because the thumbnail-snapshot path fired first. Also
  // patched Caltrans /vm/loc/ pages to auto-derive the refreshing
  // snapshot URL (cwwp2 /data/d{N}/cctv/image/{slug}/{slug}.jpg).
  //
  // Priority order:
  //   1. directEmbed is HLS (.m3u8) → HlsPlayer (live video wins)
  //   2. directEmbed is WHEP (/whep/) → WebRTCPlayer (low-latency live)
  //   3. media_url / thumbnail ending in .jpg/.png → SnapshotStream
  //   4. directEmbed matches a known video-embed pattern → IframeEmbed
  //   5. directEmbed + Caltrans /vm/loc/ URL → derive snapshot URL
  //   6. directEmbed + Surfline surf-report URL → use embed-cam URL
  //   7. Anything else → IframeEmbed (fall through to snapshot proxy)
  //   8. No URL at all → round-trip to /api/eagle/stream/{id}
  useEffect(() => {
    if (!feed) { setResolved(null); return }

    const isHls    = (u: string) => /\.m3u8(\?|$)/i.test(u)
    const isWhep   = (u: string) => /\/whep(\?|\/|$)/i.test(u)
    const isImage  = (u: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
    const isOurCamSnap = (u: string) => /\/api\/eagle\/cam-(snapshot|image)/i.test(u)

    const pickStreamType = (url: string): StreamType => {
      if (isOurCamSnap(url)) return "snapshot"
      if (isImage(url))      return "snapshot"
      if (isHls(url))        return "hls"
      if (isWhep(url))       return "webrtc"
      return "iframe"
    }

    // Caltrans /vm/loc/d{N}/{slug}.htm → refreshing JPEG at
    // /data/d{N}/cctv/image/{slug}/{slug}.jpg. Every Caltrans cam that
    // publishes a viewer page also publishes this JPEG — it refreshes
    // every ~30 s server-side and renders fine in a plain <img>.
    function deriveCaltransSnapshot(embed: string | undefined): string | null {
      if (!embed) return null
      const m = /cwwp2\.dot\.ca\.gov\/vm\/loc\/(d\d+)\/([^/.?#]+)\.htm/i.exec(embed)
      if (!m) return null
      const [, dist, slug] = m
      return `https://cwwp2.dot.ca.gov/data/${dist}/cctv/image/${slug}/${slug}.jpg`
    }

    // Surfline surf-report URL → official embed-cam URL with autoplay.
    // Morgan Apr 22, 2026: "every surfline camera needs to not open a
    // widget with a play button it needs to open the video widget and
    // auto play thats dumb". Use ?autoplay=1&muted=1 so the browser's
    // autoplay policy permits playback (muted autoplay is always
    // allowed; we let the user unmute).
    //   https://www.surfline.com/surf-report/{slug}/{camId}
    //     → https://www.surfline.com/embed-cam/{camId}?autoplay=1&muted=1
    function deriveSurflineEmbed(embed: string | undefined): string | null {
      if (!embed) return null
      const m = /surfline\.com\/surf-report\/[^/]+\/([a-f0-9]{16,})/i.exec(embed)
      if (!m) return null
      return `https://www.surfline.com/embed-cam/${m[1]}?autoplay=1&muted=1`
    }

    // Apr 23, 2026 — Morgan: "none of these headless cameras work at
    // all ... fix that its not tolerable if they show up but no video
    // shows". State-DOT viewer pages route through the headless
    // snapshot proxy today but that almost always fails (no <video>
    // element, selector chain drains, body-screenshot returns 502).
    // Every state DOT exposes its JPEG snapshot at a predictable URL
    // derived from the viewer page URL — rewrite those here and route
    // through /api/eagle/cam-image (allowlist-safe, works every time).
    function deriveStateDotSnapshot(embed: string | undefined, mediaUrl?: string): string | null {
      if (!embed) return null
      // 511NY: /map/Cctv/{id}  →  /map/GetImage?id={id}
      let m = /511ny\.org\/map\/Cctv\/(\d+)/i.exec(embed)
      if (m) return `/api/eagle/cam-image?url=${encodeURIComponent(`https://511ny.org/map/GetImage?id=${m[1]}`)}`
      // 511VA: same pattern
      m = /511va\.org\/map\/Cctv\/(\d+)/i.exec(embed)
      if (m) return `/api/eagle/cam-image?url=${encodeURIComponent(`https://511va.org/map/GetImage?id=${m[1]}`)}`
      // MDOT CHART: chart.maryland.gov/video/video.asp?feed=XX → /video/VideoStill.asp?feed=XX
      m = /chart\.maryland\.gov\/video\/video\.asp\?feed=(\w+)/i.exec(embed)
      if (m) return `/api/eagle/cam-image?url=${encodeURIComponent(`https://chart.maryland.gov/video/VideoStill.asp?feed=${m[1]}`)}`
      // Apr 23, 2026 — NYC DOT TMC. Two URL shapes observed in the wild:
      //   viewer: https://webcams.nyctmc.org/map/camera/{uuid}
      //   image : https://webcams.nyctmc.org/api/cameras/{uuid}/image
      m = /webcams\.nyctmc\.org\/(?:map\/camera|api\/cameras)\/([a-f0-9-]{36})/i.exec(embed)
      if (m) return `/api/eagle/cam-image?url=${encodeURIComponent(`https://webcams.nyctmc.org/api/cameras/${m[1]}/image`)}`
      return null
    }

    const de = feed.directEmbed

    // 1+2: live video (HLS / WebRTC) always wins
    if (de && (isHls(de) || isWhep(de))) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: isHls(de) ? "hls" : "webrtc",
        stream_url: de,
        embed_url: de,
      })
      return
    }

    // 3: static snapshot — media_url ending in image extension
    //    OR a /api/eagle/cam-image proxy URL (Apr 23, 2026 fix —
    //    Morgan: "none of these headless cameras work at all ... fix
    //    that its not tolerable if they show up but no video shows").
    //    Our proxy URL is `/api/eagle/cam-image?url=<encoded>` which
    //    doesn't end in .jpg, so the old isImage()-only check fell
    //    through to IframeEmbed → SnapshotProxyVideo → headless render
    //    (which almost always fails for state-DOT viewer pages). The
    //    proxy endpoint already returns the JPEG bytes from the
    //    allowlisted upstream, so it's the right thing to render as
    //    a refreshing <img>.
    if (feed.thumbnail && (isImage(feed.thumbnail) || isOurCamSnap(feed.thumbnail))) {
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

    // 4a: Caltrans — no stream_url + no media_url, derive snapshot JPEG
    // from the /vm/loc/ URL so the user sees the live-ish frame instead
    // of a blank iframemap fallback.
    const caltransSnap = deriveCaltransSnapshot(de)
    if (caltransSnap && !feed.thumbnail) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "snapshot",
        stream_url: caltransSnap,
        embed_url: de,
      })
      return
    }

    // 4a2: State DOT viewer page — derive the proxied JPEG URL
    // (Apr 23, 2026 — NYSDOT / VDOT / MDOT CHART fix).
    const stateDotSnap = deriveStateDotSnapshot(de, feed.thumbnail)
    if (stateDotSnap) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "snapshot",
        stream_url: stateDotSnap,
        embed_url: de,
      })
      return
    }

    // 4b: Surfline — rewrite surf-report to embed-cam
    const surflineEmbed = deriveSurflineEmbed(de)
    if (surflineEmbed) {
      setResolved({
        id: feed.id,
        provider: feed.provider,
        kind: feed.kind === "camera" ? "permanent" : "ephemeral",
        stream_type: "iframe",
        stream_url: surflineEmbed,
        embed_url: surflineEmbed,
      })
      return
    }

    // 5: any other directEmbed
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

    // 6: fallback to server-side resolver
    setLoading(true)
    resolveStream(feed.id).then((r) => {
      setResolved(r)
      setLoading(false)
    })
  }, [feed?.id, feed?.directEmbed, feed?.thumbnail, feed?.provider, feed?.kind])

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
              {feed.provider} · {feed.lat?.toFixed(6)}, {feed.lng?.toFixed(6)}
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
              case "iframe": return <IframeEmbed url={url} provider={feed.provider} name={feed.name} />
              case "mjpeg": return <MjpegStream url={url} />
              case "snapshot": return <SnapshotStream url={url} embedUrl={resolved.embed_url} provider={feed.provider} name={feed.name} />
              default: return <IframeEmbed url={url} provider={feed.provider} name={feed.name} />
            }
          })()}
        </div>
      )}
    </div>
  )
}
