/**
 * Encode path segments for static asset URLs without double-encoding existing %XX sequences.
 * encodeURI("/assets/foo%20bar.mp4") would turn % into %25 — browsers then request a wrong path.
 */

function encodePathSegments(path: string): string {
  const qIndex = path.indexOf("?")
  const hIndex = path.indexOf("#")
  let cut = path.length
  if (qIndex >= 0) cut = Math.min(cut, qIndex)
  if (hIndex >= 0) cut = Math.min(cut, hIndex)
  const pathOnly = path.slice(0, cut)
  const rest = path.slice(cut)
  const parts = pathOnly.split("/")
  const encoded = parts.map((seg) => {
    if (!seg) return ""
    try {
      return encodeURIComponent(decodeURIComponent(seg))
    } catch {
      return encodeURIComponent(seg)
    }
  })
  return encoded.join("/") + rest
}

export function encodeAssetUrl(src: string): string {
  if (!src) return src
  try {
    if (/^https?:\/\//i.test(src)) {
      const u = new URL(src)
      u.pathname = encodePathSegments(u.pathname)
      return u.toString()
    }
    return encodePathSegments(src)
  } catch {
    return src
  }
}
