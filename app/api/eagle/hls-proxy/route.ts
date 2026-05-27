import { NextRequest, NextResponse } from "next/server"

/**
 * Same-origin HLS manifest proxy — May 25, 2026
 * Caltrans and many DOT m3u8 feeds block browser CORS; proxy manifest + segments.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOW_HOSTS = new Set([
  "cwwp2.dot.ca.gov",
  "wzmedia.dot.ca.gov",
  "media.mycosoft.com",
  "cams.cdn-surfline.com",
  "hpwren.ucsd.edu",
  "www.hpwren.ucsd.edu",
])

function allowed(url: URL): boolean {
  const h = url.hostname.toLowerCase()
  return ALLOW_HOSTS.has(h)
}

function rewriteManifest(body: string, base: URL, req: NextRequest): string {
  const origin = req.nextUrl.origin
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return line
      try {
        const abs = new URL(trimmed, base)
        if (!allowed(abs)) return line
        return `${origin}/api/eagle/hls-proxy?url=${encodeURIComponent(abs.toString())}`
      } catch {
        return line
      }
    })
    .join("\n")
}

export async function GET(req: NextRequest) {
  const qUrl = req.nextUrl.searchParams.get("url") || ""
  let target: URL
  try {
    target = new URL(qUrl)
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "only http/https" }, { status: 400 })
  }
  if (!allowed(target)) {
    return NextResponse.json({ error: `host not allowlisted: ${target.hostname}` }, { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: "*/*",
        "User-Agent": "MycosoftCREP/1.0",
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 })
    }
    const ct = upstream.headers.get("content-type") || ""
    const buf = await upstream.arrayBuffer()
    const text = new TextDecoder().decode(buf)
    const isManifest =
      /\.m3u8/i.test(target.pathname) || /mpegurl/i.test(ct) || text.includes("#EXTM3U")

    if (isManifest) {
      const rewritten = rewriteManifest(text, target, req)
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store, max-age=0",
        },
      })
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct || "application/octet-stream",
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
