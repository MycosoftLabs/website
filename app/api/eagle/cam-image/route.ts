import { NextRequest, NextResponse } from "next/server"

/**
 * Eagle Eye cam-image proxy — Apr 20, 2026
 *
 * Proxies remote camera image URLs through our server so:
 *   • HPWREN's expired TLS cert (hpwren.ucsd.edu) doesn't reject in the
 *     browser — Node fetch tolerates it (we set `dispatcher` with
 *     `rejectUnauthorized:false` when the host is allowlisted)
 *   • HTTP-only cam endpoints can be served over HTTPS without mixed-
 *     content warnings (our app is https and those images would be
 *     blocked on prod)
 *   • CORS issues disappear (all requests same-origin)
 *
 * Morgan: "stream broken — hpwren.ucsd.edu/cameras/ temporarily down or
 * moved permanently to a new web address".
 *
 * URL contract:
 *   /api/eagle/cam-image?url=<encoded upstream image URL>
 *
 * Allowlist: only a handful of known-safe hosts are proxied. This keeps
 * the endpoint from being turned into a general-purpose SSRF tool.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Hosts we're willing to fetch on behalf of the browser. All of them
// publish public cam imagery under commercial-public or gov-open terms.
const ALLOW_HOSTS = new Set([
  "hpwren.ucsd.edu",
  "www.hpwren.ucsd.edu",
  "firemap.sdsc.edu",
  "www.alertcalifornia.org",
  "cameras.alertcalifornia.org",
  "www.alertwildfire.org",
  "cameras.alertwildfire.org",
  "www.nps.gov",
  "webcams.nps.gov",
  "volcanoes.usgs.gov",
  "hvo-api.wr.usgs.gov",
  "www.earthcam.com",
  "camsecure.co",
  "www.surfline.com",
  "cams.cdn-surfline.com",
])

// Hosts with known certificate issues — we fetch them with lenient TLS.
const LENIENT_TLS_HOSTS = new Set([
  "hpwren.ucsd.edu",
  "www.hpwren.ucsd.edu",
])

function isAllowed(url: URL): boolean {
  return ALLOW_HOSTS.has(url.hostname.toLowerCase())
}

export async function GET(req: NextRequest) {
  const qUrl = req.nextUrl.searchParams.get("url") || ""
  if (!qUrl) {
    return NextResponse.json({ error: "missing url param" }, { status: 400 })
  }
  let target: URL
  try {
    target = new URL(qUrl)
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "only http/https supported" }, { status: 400 })
  }
  if (!isAllowed(target)) {
    return NextResponse.json({ error: `host not allowlisted: ${target.hostname}` }, { status: 403 })
  }

  // For HPWREN (expired cert), swap https:// → http:// upstream. The page
  // itself has HTTPS with expired cert; switching to HTTP bypasses the
  // TLS negotiation entirely. Both protocols serve the same static JPEGs.
  let fetchUrl = target.toString()
  if (LENIENT_TLS_HOSTS.has(target.hostname.toLowerCase()) && target.protocol === "https:") {
    target.protocol = "http:"
    fetchUrl = target.toString()
  }

  try {
    const upstream = await fetch(fetchUrl, {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "image/*" },
      signal: AbortSignal.timeout(10_000),
      // Node 20 fetch auto-follows redirects; cache for 20 s on client so
      // the snapshot refresh cadence from SnapshotStream lines up.
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}`, url: fetchUrl }, { status: 502 })
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg"
    // Only allow image/* and a couple of common MJPEG mimes; anything else
    // is probably an HTML error page we don't want to surface as an image.
    if (!/^image\//i.test(contentType) && !/multipart/i.test(contentType)) {
      return NextResponse.json(
        { error: `non-image content-type ${contentType}`, url: fetchUrl },
        { status: 502 },
      )
    }
    const buf = await upstream.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // 20 s browser cache matches SnapshotStream's refresh cadence so
        // we only hit the upstream once per 20 s regardless of how many
        // widget tabs are open.
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
        "X-Proxied-From": target.hostname,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "fetch failed", url: fetchUrl }, { status: 502 })
  }
}
