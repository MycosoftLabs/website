/**
 * YouTube embed URL normalization for Eagle Eye / VideoWall — May 24, 2026
 *
 * Seed rows and live API results use several URL shapes that do not iframe
 * cleanly (@handle/live, watch?v=, youtu.be, embed/live_stream?channel=).
 * This module converts them to a browser-embeddable URL with autoplay muted.
 */

const EMBED_PARAMS = "autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1"

/** @handle → UC channel id (scraped May 24, 2026). Used when YouTube API is unavailable. */
export const YOUTUBE_HANDLE_CHANNEL_IDS: Record<string, string> = {
  cityoflasvegas: "UCCs9Fy2QlMXah1JPxRs9Xdw",
  yellowstonenps: "UCaiMu1oDfXlgIkzQwR04aYg",
  nasaspaceflight: "UCf0LRbPxIUFuoFfh-Dh9guQ",
  spacex: "UCX6OQ3DkcsbYNE6H8uQQuVA",
}

export function isYouTubeUrl(url: string): boolean {
  if (!url) return false
  return /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(url)
}

function appendEmbedParams(base: string): string {
  try {
    const u = new URL(base)
    u.searchParams.set("autoplay", "1")
    u.searchParams.set("mute", "1")
    u.searchParams.set("playsinline", "1")
    u.searchParams.set("rel", "0")
    u.searchParams.set("modestbranding", "1")
    return u.toString()
  } catch {
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}${EMBED_PARAMS}`
  }
}

function handleKeyFromUrl(url: string): string | null {
  const m = /youtube\.com\/@([\w.-]+)/i.exec(url)
  if (!m) return null
  return m[1].replace(/\./g, "").toLowerCase()
}

/** Sync normalization — no network. Returns null if handle needs API lookup. */
export function normalizeYouTubeEmbedUrlSync(raw: string): string | null {
  const url = (raw || "").trim()
  if (!url || !isYouTubeUrl(url)) return null

  // Already a video embed (11-char id only — not live_stream)
  let m = /youtube(?:-nocookie)?\.com\/embed\/(?!live_stream)([a-zA-Z0-9_-]{11})(?:\?|$)/i.exec(url)
  if (m) return appendEmbedParams(`https://www.youtube.com/embed/${m[1]}`)

  // live_stream?channel=UC... (before generic /embed/ passthrough)
  m = /[?&]channel=((?:UC|HC)[\w-]{20,})/i.exec(url)
  if (m) {
    return appendEmbedParams(`https://www.youtube.com/embed/live_stream?channel=${m[1]}`)
  }

  if (/youtube\.com\/embed\/live_stream/i.test(url)) {
    return appendEmbedParams(url.replace("youtube-nocookie.com", "youtube.com"))
  }

  m = /[?&]v=([a-zA-Z0-9_-]{11})/i.exec(url)
  if (m) return appendEmbedParams(`https://www.youtube.com/embed/${m[1]}`)

  m = /youtu\.be\/([a-zA-Z0-9_-]{11})/i.exec(url)
  if (m) return appendEmbedParams(`https://www.youtube.com/embed/${m[1]}`)

  m = /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i.exec(url)
  if (m) return appendEmbedParams(`https://www.youtube.com/embed/${m[1]}`)

  if (/youtube\.com\/embed\//i.test(url)) {
    return appendEmbedParams(url.replace("youtube-nocookie.com", "youtube.com"))
  }

  const handleKey = handleKeyFromUrl(url)
  if (handleKey) {
    const channelId = YOUTUBE_HANDLE_CHANNEL_IDS[handleKey]
    if (channelId?.startsWith("UC")) {
      return appendEmbedParams(`https://www.youtube.com/embed/live_stream?channel=${channelId}`)
    }
    return null
  }

  return null
}

export function looksLikeYouTubeEmbedUrl(url: string): boolean {
  if (!isYouTubeUrl(url)) return false
  if (normalizeYouTubeEmbedUrlSync(url)) return true
  return /youtube\.com\/embed\//i.test(url)
}
