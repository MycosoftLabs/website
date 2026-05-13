import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const ROOT = process.cwd()
const baseUrl = process.argv[2] || "https://mycosoft.com"
const outFile = process.argv[3] || "site-media-audit.json"
const concurrency = Number(process.env.AUDIT_CONCURRENCY || 4)
const perPageTimeout = Number(process.env.AUDIT_TIMEOUT_MS || 45000)
const settleMs = Number(process.env.AUDIT_SETTLE_MS || 4500)

function routeFromPageFile(file) {
  const rel = path.relative(path.join(ROOT, "app"), file).replaceAll(path.sep, "/")
  const parts = rel.split("/")
  parts.pop()
  const routeParts = parts.filter((part) => !part.startsWith("("))
  const route = `/${routeParts.join("/")}`.replace(/\/+/g, "/")
  return route === "/" ? "/" : route.replace(/\/$/, "")
}

async function listPageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await listPageFiles(full))
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      out.push(full)
    }
  }
  return out
}

function isAuditableRoute(route) {
  if (route.includes("[") || route.includes("]")) return false
  if (route.startsWith("/auth/")) return false
  if (route.startsWith("/admin")) return false
  if (route.startsWith("/dashboard")) return false
  if (route.startsWith("/platform/")) return false
  if (route === "/profile" || route === "/settings" || route === "/billing") return false
  return true
}

async function discoverRoutes() {
  const files = await listPageFiles(path.join(ROOT, "app"))
  const generated = [...new Set(files.map(routeFromPageFile).filter(isAuditableRoute))]
  const importantDynamic = [
    "/devices/mushroom-1",
    "/devices/agaric",
    "/devices/sporebase",
    "/devices/hyphae-1",
    "/devices/psathyrella",
    "/devices/alarm",
    "/defense/fusarium",
    "/natureos/earth-simulator",
    "/natureos/fungi-compute",
    "/sensing/fungi-compute-fci",
    "/sensing/bluesight",
    "/sensing/sine",
    "/sensing/gandha",
  ]
  return [...new Set(["/", ...generated, ...importantDynamic])].sort()
}

function classifyIssue(pageResult) {
  const issues = []
  if (!pageResult.okStatus) issues.push("bad_status")
  if (pageResult.errors.length) issues.push("request_errors")
  if (pageResult.badResponses.length) issues.push("bad_responses")
  if (pageResult.youtubeFrames.length) issues.push("youtube_frame")
  if (pageResult.brokenImages.length) issues.push("broken_images")
  if (pageResult.videos.some((v) => (!v.src || v.readyState < 2 || v.w === 0 || v.h === 0) && !v.poster)) issues.push("video_not_ready")
  if (pageResult.videos.some((v) => /youtube|youtu\.be/i.test(v.src))) issues.push("youtube_video_src")
  if (pageResult.navMs > 8000) issues.push("slow_nav")
  if (pageResult.totalVideoBytes > 125_000_000) issues.push("heavy_video_bytes")
  if (pageResult.maxResourceMs > 10000) issues.push("slow_resource")
  return issues
}

async function auditRoute(context, route) {
  const page = await context.newPage()
  const url = new URL(route, baseUrl).toString()
  const started = Date.now()
  const errors = []
  const badResponses = []
  const mediaResponses = []
  page.on("requestfailed", (request) => {
    const failure = request.failure()
    const reqUrl = request.url()
    if (reqUrl.includes("static.cloudflareinsights.com")) return
    if (failure?.errorText === "net::ERR_ABORTED" && /\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(reqUrl)) return
    errors.push({ url: reqUrl, error: failure?.errorText || "request failed" })
  })
  page.on("response", async (response) => {
    const status = response.status()
    const reqUrl = response.url()
    const headers = response.headers()
    const method = response.request().method()
    const type = headers["content-type"] || ""
    const len = Number(headers["content-length"] || 0)
    if (status >= 400) {
      badResponses.push({ status, url: reqUrl, type, len })
    }
    if (/image|video|audio/i.test(type) || /\.(mp4|webm|jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(reqUrl)) {
      mediaResponses.push({ status, method, url: reqUrl, type, len })
    }
  })

  let status = 0
  let title = ""
  let navMs = 0
  let loadState = "unknown"
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: perPageTimeout })
    status = response?.status() || 0
    await page.waitForTimeout(settleMs)
    title = await page.title()
    navMs = Date.now() - started
    loadState = "domcontentloaded"
  } catch (error) {
    errors.push({ url, error: error instanceof Error ? error.message : String(error) })
    navMs = Date.now() - started
  }

  const browserState = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0]
    const resources = performance.getEntriesByType("resource")
      .filter((entry) => /\.(mp4|webm|jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(entry.name))
      .map((entry) => ({
        url: entry.name,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20)
    return {
      navTiming: nav ? {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        responseEnd: Math.round(nav.responseEnd),
      } : null,
      videos: Array.from(document.querySelectorAll("video")).map((video, index) => ({
        index,
        src: video.currentSrc || video.src,
        poster: video.poster,
        preload: video.preload,
        readyState: video.readyState,
        currentTime: Number(video.currentTime.toFixed(2)),
        paused: video.paused,
        w: video.videoWidth,
        h: video.videoHeight,
      })),
      youtubeFrames: Array.from(document.querySelectorAll("iframe"))
        .map((iframe) => iframe.src)
        .filter((src) => /youtube|youtu\.be/i.test(src)),
      brokenImages: Array.from(document.querySelectorAll("img"))
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
        .slice(0, 25),
      imageCount: document.images.length,
      linkCount: document.links.length,
      resources,
    }
  }).catch((error) => ({
    navTiming: null,
    videos: [],
    youtubeFrames: [],
    brokenImages: [],
    imageCount: 0,
    linkCount: 0,
    resources: [],
    evalError: error instanceof Error ? error.message : String(error),
  }))

  await page.close()
  const totalVideoBytes = mediaResponses
    .filter((r) => r.method !== "HEAD" && /video|\.mp4|\.webm/i.test(`${r.type} ${r.url}`))
    .reduce((sum, r) => sum + (r.len || 0), 0)
  const maxResourceMs = Math.max(0, ...browserState.resources.map((r) => r.duration || 0))
  const result = {
    route,
    url,
    status,
    okStatus: status >= 200 && status < 400,
    title,
    loadState,
    navMs,
    navTiming: browserState.navTiming,
    imageCount: browserState.imageCount,
    linkCount: browserState.linkCount,
    videos: browserState.videos,
    youtubeFrames: browserState.youtubeFrames,
    brokenImages: browserState.brokenImages,
    mediaResponses,
    totalVideoBytes,
    slowResources: browserState.resources,
    maxResourceMs,
    errors,
    badResponses,
  }
  result.issues = classifyIssue(result)
  return result
}

async function main() {
  const routes = await discoverRoutes()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const results = []
  let cursor = 0
  async function worker() {
    while (cursor < routes.length) {
      const route = routes[cursor++]
      const result = await auditRoute(context, route)
      results.push(result)
      const mark = result.issues.length ? `ISSUES ${result.issues.join(",")}` : "ok"
      console.log(`${results.length}/${routes.length} ${route} ${result.status} ${result.navMs}ms ${mark}`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  await browser.close()
  results.sort((a, b) => a.route.localeCompare(b.route))
  const summary = {
    baseUrl,
    auditedAt: new Date().toISOString(),
    routeCount: routes.length,
    issueCount: results.filter((r) => r.issues.length).length,
    issueRoutes: results.filter((r) => r.issues.length).map((r) => ({
      route: r.route,
      status: r.status,
      navMs: r.navMs,
      issues: r.issues,
      videoCount: r.videos.length,
      totalVideoBytes: r.totalVideoBytes,
      badResponses: r.badResponses.slice(0, 5),
      errors: r.errors.slice(0, 5),
    })),
    slowestRoutes: [...results].sort((a, b) => b.navMs - a.navMs).slice(0, 20).map((r) => ({
      route: r.route,
      navMs: r.navMs,
      status: r.status,
      issues: r.issues,
    })),
    heaviestVideoRoutes: [...results].sort((a, b) => b.totalVideoBytes - a.totalVideoBytes).slice(0, 20).map((r) => ({
      route: r.route,
      totalVideoBytes: r.totalVideoBytes,
      videos: r.videos.map((v) => v.src),
      issues: r.issues,
    })),
    results,
  }
  await fs.writeFile(outFile, JSON.stringify(summary, null, 2))
  console.log(`Wrote ${outFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
