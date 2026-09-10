/**
 * Windy webcam still-frame helper — Sep 10, 2026
 *
 * Windy stream pages (webcams.windy.com) often set X-Frame-Options and
 * cannot be iframed. They also publish public JPEGs that refresh every
 * few minutes — no Playwright / cam-snapshot required.
 *
 * URL pattern (verified 2026-09-10):
 *   https://images-webcams.windy.com/{last2}/{id}/current/full/{id}.jpg
 */

export function parseWindyWebcamId(sourceId?: string | null, embedUrl?: string | null): string | null {
  const haystack = `${sourceId || ""} ${embedUrl || ""}`
  const fromUrl = /(?:webcams\.windy\.com\/webcams\/stream\/|windy\.com\/webcams\/(?:stream\/)?)(\d{6,})/i.exec(haystack)
  if (fromUrl) return fromUrl[1]
  const fromId = /(?:^|-)(\d{8,})$/.exec(String(sourceId || "").trim())
  return fromId ? fromId[1] : null
}

export function windyWebcamUpstreamJpeg(sourceId?: string | null, embedUrl?: string | null): string | null {
  const id = parseWindyWebcamId(sourceId, embedUrl)
  if (!id) return null
  const last2 = id.slice(-2)
  return `https://images-webcams.windy.com/${last2}/${id}/current/full/${id}.jpg`
}

export function windyProxiedSnapshot(sourceId?: string | null, embedUrl?: string | null): string | null {
  const upstream = windyWebcamUpstreamJpeg(sourceId, embedUrl)
  if (!upstream) return null
  return `/api/eagle/cam-image?url=${encodeURIComponent(upstream)}`
}
