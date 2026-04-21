import { NextRequest, NextResponse } from "next/server"

/**
 * Headless cam snapshot service — Apr 20, 2026
 *
 * Morgan: "all camera widgets must only show camera video" + "all
 * cameras need forced take scrape embed of video no excuses ignore
 * the websites saying you cannot do that".
 *
 * For provider viewer pages that block iframing (X-Frame-Options:
 * DENY) but DO render a `<video>` element on their own page —
 * ALERTCalifornia, HPWREN viewer, many fire-watch portals — this
 * route loads the page in a server-side Chromium, waits for the
 * video element to appear and play, screenshots it, and serves the
 * resulting JPEG back as same-origin image content.
 *
 * The CREP widget then displays that JPEG via SnapshotStream which
 * auto-refreshes every 20 s, giving Morgan a live-ish video frame
 * on the map without iframing the provider's chrome.
 *
 * URL contract:
 *   /api/eagle/cam-snapshot?url=<encoded viewer page URL>
 *                          &selector=<optional CSS selector for the video element>
 *                          &wait_ms=<optional ms to wait after page load>
 *
 * Allowlist: only specific known-public providers are served. Keeps
 * the endpoint from being a general SSRF tool.
 *
 * Cache: in-memory 8 s per URL — multiple browser clients viewing
 * the same cam share a single Chromium render.
 */

import { chromium, type Browser, type Page } from "playwright-core"
import { existsSync } from "node:fs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

// Allowlist of hosts we'll headless-render. Each is a public viewer page
// for cameras whose stream URL isn't directly accessible. Apr 20, 2026 v2
// (Morgan: "all videos that say anything like this need a full workaround
// to get that video placed in a passthrough directly into the widget no
// excuses") — list expanded to cover every provider VideoWallWidget might
// encounter so it can ALWAYS try a headless render before falling back to
// the info card.
const ALLOW_HOSTS = new Set<string>([
  // Fire-watch / wilderness research
  "cameras.alertcalifornia.org", "www.alertcalifornia.org",
  "cameras.alertwildfire.org", "www.alertwildfire.org",
  "alertca.live",
  "hpwren.ucsd.edu", "www.hpwren.ucsd.edu",
  // Surf
  "www.surfline.com", "cams.cdn-surfline.com",
  // EarthCam viewer pages
  "www.earthcam.com",
  // Skyline / global landmark viewer
  "www.skylinewebcams.com",
  // Webcamtaxi
  "www.webcamtaxi.com",
  // NPS park webcam pages
  "www.nps.gov", "webcams.nps.gov",
  // USGS webcam pages
  "volcanoes.usgs.gov", "hvo-api.wr.usgs.gov", "www.usgs.gov",
  // Windy webcam viewer
  "www.windy.com",
  // State DOTs
  "cwwp2.dot.ca.gov",
  "wsdot.wa.gov",
  "fl511.com",
  "511ny.org",
  "www.drivetexas.org",
  // Marine / port operations
  "www.portofrotterdam.com",
  "www.portoflosangeles.org",
  "micanaldepanama.com",
  // Resort / wildlife / aquarium
  "www.mammothmountain.com", "www.vail.com", "www.northstarcalifornia.com",
  "www.whistlerblackcomb.com",
  "www.sandiegozoo.org", "nationalzoo.si.edu",
  "www.montereybayaquarium.org",
  "explore.org", "www.africam.com",
  // Aviation
  "www.flysfo.com", "www.jfkairport.com",
  // Pikes Peak / weather
  "pikespeakwebcam.com",
])

type CacheEntry = { jpeg: Buffer; t: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 8_000

let browserPromise: Promise<Browser> | null = null
function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise
  browserPromise = (async () => {
    // Try several Chromium discovery paths so this works on dev (where
    // Playwright was installed via `npm i playwright`) and in production
    // Docker (where we may have system Chromium).
    const candidates = [
      process.env.CHROMIUM_EXECUTABLE_PATH || "",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ].filter(Boolean)
    const executablePath = candidates.find((p) => existsSync(p)) || undefined
    return chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
    })
  })()
  return browserPromise
}

async function snapshotUrl(viewerUrl: string, selector: string | null, waitMs: number): Promise<Buffer | null> {
  let page: Page | null = null
  try {
    const browser = await getBrowser()
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ignoreHTTPSErrors: true, // HPWREN expired cert
    })
    page = await ctx.newPage()
    await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 12_000 })
    // If a video selector was provided, wait for it to mount + start.
    // Otherwise generic wait_ms for any JS player to settle.
    if (selector) {
      try { await page.waitForSelector(selector, { timeout: 8_000 }) } catch { /* fall through; we'll still screenshot */ }
    }
    if (waitMs > 0) await page.waitForTimeout(waitMs)
    let buf: Buffer
    try {
      const handle = selector ? await page.$(selector) : null
      if (handle) {
        buf = await handle.screenshot({ type: "jpeg", quality: 80 })
      } else {
        // Crop to where most cam viewers put the video (top-center, 16:9)
        buf = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false })
      }
    } finally {
      await ctx.close().catch(() => undefined)
    }
    return buf
  } catch (err: any) {
    console.warn("[cam-snapshot] error:", err?.message || err)
    return null
  } finally {
    try { await page?.close() } catch { /* ignore */ }
  }
}

export async function GET(req: NextRequest) {
  const qUrl = req.nextUrl.searchParams.get("url") || ""
  const selector = req.nextUrl.searchParams.get("selector") || null
  const waitMs = Math.min(8_000, Math.max(0, Number(req.nextUrl.searchParams.get("wait_ms") || 2000)))

  let target: URL
  try { target = new URL(qUrl) } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "only http/https" }, { status: 400 })
  }
  if (!ALLOW_HOSTS.has(target.hostname.toLowerCase())) {
    return NextResponse.json({ error: `host not allowlisted: ${target.hostname}` }, { status: 403 })
  }

  const cacheKey = `${target.toString()}|${selector || ""}|${waitMs}`
  const now = Date.now()
  const hit = cache.get(cacheKey)
  if (hit && now - hit.t < CACHE_TTL_MS) {
    return new NextResponse(new Uint8Array(hit.jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
        "X-Snapshot-Source": "cache",
      },
    })
  }

  const buf = await snapshotUrl(target.toString(), selector, waitMs)
  if (!buf) {
    return NextResponse.json({ error: "snapshot render failed" }, { status: 502 })
  }
  cache.set(cacheKey, { jpeg: buf, t: now })
  // Trim cache when too large
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].t - b[1].t)[0]
    if (oldest) cache.delete(oldest[0])
  }
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
      "X-Snapshot-Source": "render",
      "X-Snapshot-Bytes": String(buf.length),
    },
  })
}
