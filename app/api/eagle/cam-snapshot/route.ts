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
import http from "node:http"
import https from "node:https"

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
const failureCache = new Map<string, number>()
const inFlightSnapshots = new Map<string, Promise<Buffer | null>>()
const CACHE_TTL_MS = 12_000
const FAILURE_TTL_MS = 20_000
const STILL_IMAGE_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i

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

async function snapshotUrl(viewerUrl: string, selector: string | null, waitMs: number, mode: "element" | "fullpage"): Promise<Buffer | null> {
  let page: Page | null = null
  try {
    const browser = await getBrowser()
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ignoreHTTPSErrors: true, // HPWREN expired cert
    })
    page = await ctx.newPage()
    try {
      await page.goto(viewerUrl, { waitUntil: "domcontentloaded", timeout: 4_500 })
    } catch (err: any) {
      // EarthCam and similar viewer pages can keep ads/analytics pending long
      // enough for domcontentloaded to timeout even after the visible viewer has
      // painted. Keep going so fullpage fallback can still return the frame.
      if (mode !== "fullpage") throw err
      console.warn("[cam-snapshot] continuing after navigation timeout:", err?.message || err)
    }
    // If a video selector was provided, wait for it to mount + start.
    // Otherwise generic wait_ms for any JS player to settle.
    if (selector && mode === "element") {
      try { await page.waitForSelector(selector, { timeout: 2_500 }) } catch { /* fall through; we'll still screenshot */ }
    }
    if (waitMs > 0) await page.waitForTimeout(waitMs)
    let buf: Buffer
    try {
      if (mode === "fullpage") {
        // Apr 21, 2026 (Morgan: "all data will be within its widgets
        // live including video streams"). Fullpage mode screenshots
        // the entire viewer page — used as last-resort fallback in the
        // SnapshotProxyVideo selector chain so we ALWAYS return an
        // image rather than bouncing the user to the provider site.
        buf = await page.screenshot({ type: "jpeg", quality: 75, fullPage: false })
      } else {
        const handle = selector ? await page.$(selector) : null
        if (handle) {
          buf = await handle.screenshot({ type: "jpeg", quality: 80 })
        } else {
          // Selector didn't match any element — return null so the
          // client-side selector chain advances to the next candidate.
          return null
        }
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

async function fetchDirectImage(target: URL): Promise<Buffer | null> {
  try {
    const response = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    })
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.toLowerCase().startsWith("image/") && !STILL_IMAGE_RE.test(target.toString())) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return fetchDirectImageViaNode(target)
  }
}

function fetchDirectImageViaNode(target: URL, redirects = 2): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const client = target.protocol === "http:" ? http : https
    const req = client.request(target, {
      timeout: 5_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      agent: target.protocol === "https:" ? new https.Agent({ rejectUnauthorized: false }) : undefined,
    }, (res) => {
      const status = res.statusCode || 0
      const location = res.headers.location
      if (status >= 300 && status < 400 && location && redirects > 0) {
        res.resume()
        try {
          resolve(fetchDirectImageViaNode(new URL(location, target), redirects - 1))
        } catch {
          resolve(null)
        }
        return
      }
      if (status < 200 || status >= 300) {
        res.resume()
        resolve(null)
        return
      }
      const contentType = String(res.headers["content-type"] || "")
      const chunks: Buffer[] = []
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      res.on("end", () => {
        if (!contentType.toLowerCase().startsWith("image/") && !STILL_IMAGE_RE.test(target.toString())) {
          resolve(null)
          return
        }
        resolve(Buffer.concat(chunks))
      })
    })
    req.on("timeout", () => {
      req.destroy()
      resolve(null)
    })
    req.on("error", () => resolve(null))
    req.end()
  })
}

export async function GET(req: NextRequest) {
  const qUrl = req.nextUrl.searchParams.get("url") || ""
  const selector = req.nextUrl.searchParams.get("selector") || null
  const waitMs = Math.min(2_000, Math.max(0, Number(req.nextUrl.searchParams.get("wait_ms") || 500)))
  const mode = (req.nextUrl.searchParams.get("mode") === "fullpage") ? "fullpage" : "element"

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

  const cacheKey = `${target.toString()}|${selector || ""}|${waitMs}|${mode}`
  const now = Date.now()
  const failedAt = failureCache.get(cacheKey)
  if (failedAt && now - failedAt < FAILURE_TTL_MS) {
    return NextResponse.json(
      { error: "snapshot temporarily unavailable" },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "Retry-After": "60",
          "X-Snapshot-Source": "failure-cache",
        },
      },
    )
  }
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

  const isDirectStill = STILL_IMAGE_RE.test(target.toString())
  let snapshotPromise = inFlightSnapshots.get(cacheKey)
  if (!snapshotPromise) {
    snapshotPromise = (isDirectStill
      ? fetchDirectImage(target)
      : snapshotUrl(target.toString(), selector, waitMs, mode as "element" | "fullpage")
    ).finally(() => {
      inFlightSnapshots.delete(cacheKey)
    })
    inFlightSnapshots.set(cacheKey, snapshotPromise)
  }
  const buf = await snapshotPromise
  if (!buf) {
    failureCache.set(cacheKey, now)
    return NextResponse.json(
      { error: "snapshot render failed" },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
          "X-Snapshot-Source": "selector-miss",
        },
      },
    )
  }
  failureCache.delete(cacheKey)
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
