import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, "../../../../../")
const baseUrl = (process.env.FUSARIUM_BASE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "")
const allowedOrigin = new URL(baseUrl).origin
const routePath = process.env.FUSARIUM_QA_PATH ?? "/fusarium/sensing"
const routeId = process.env.FUSARIUM_QA_ID ?? routePath.split("/").filter(Boolean).at(-1) ?? "route"
const expectedMarker = process.env.FUSARIUM_QA_EXPECTED ?? "Senses Overview"
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE
  ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const outputDirectory = process.env.FUSARIUM_QA_OUTPUT_DIR
  ?? join(repositoryRoot, "docs", "codex-handoffs", "evidence", "full-sidebar-tools-matrix-sep01-2026")
const outputPath = join(outputDirectory, `focused-${routeId}-matrix.json`)

const modes = [
  { name: "desktop", viewport: { width: 1600, height: 900 }, screen: { width: 1600, height: 900 }, deviceScaleFactor: 1 },
  { name: "narrow", viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  { name: "zoom-200", viewport: { width: 800, height: 450 }, screen: { width: 1600, height: 900 }, deviceScaleFactor: 2 },
]

mkdirSync(outputDirectory, { recursive: true })

function compact(error) {
  return String(error instanceof Error ? error.message : error).replace(/\s+/g, " ").slice(0, 600)
}

function compactPageError(error) {
  const stack = error && typeof error === "object" && "stack" in error ? error.stack : null
  return String(stack || error).replace(/\s+/g, " ").slice(0, 2_000)
}

function sanitizedRequest(url, resourceType) {
  try {
    const parsed = new URL(url)
    return { origin: parsed.origin, path: parsed.pathname, resourceType }
  } catch {
    return { origin: "unparseable", path: "omitted", resourceType }
  }
}

async function isolate(context, blocked) {
  await context.route("**/*", async (route) => {
    const request = route.request()
    const url = request.url()
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("about:")) return route.continue()
    try {
      if (new URL(url).origin === allowedOrigin) return route.continue()
    } catch {
      // Malformed/non-local requests remain outside the allowlist.
    }
    blocked.push(sanitizedRequest(url, request.resourceType()))
    await route.abort("blockedbyclient")
  })
}

function attachDiagnostics(page) {
  const diagnostics = { pageErrors: [], consoleErrors: [], localErrorResponses: [] }
  const onPageError = (error) => diagnostics.pageErrors.push(compactPageError(error))
  const onConsole = (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text().replace(/\s+/g, " ").slice(0, 600))
  }
  const onResponse = (response) => {
    if (response.status() < 400) return
    try {
      const parsed = new URL(response.url())
      if (parsed.origin === allowedOrigin) diagnostics.localErrorResponses.push({ path: parsed.pathname, status: response.status() })
    } catch {
      // Ignore malformed diagnostic URLs.
    }
  }
  page.on("pageerror", onPageError)
  page.on("console", onConsole)
  page.on("response", onResponse)
  return {
    diagnostics,
    detach() {
      page.off("pageerror", onPageError)
      page.off("console", onConsole)
      page.off("response", onResponse)
    },
  }
}

async function waitForSurface(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("main.workspace") ?? document.querySelector("main")
    return Boolean(main && (main.innerText ?? "").trim().length >= 80 && main.querySelector("h1, h2, article, section, canvas, svg"))
  }, { timeout: 30_000 })
  await page.waitForTimeout(750)
}

async function inspect(page) {
  return page.evaluate((marker) => {
    const html = document.documentElement
    const body = document.body
    const workspace = document.querySelector("main.workspace") ?? document.querySelector("main")
    const viewportWidth = html.clientWidth
    const bodyStyle = getComputedStyle(body)
    const htmlStyle = getComputedStyle(html)
    const workspaceStyle = workspace ? getComputedStyle(workspace) : null
    const clips = (value) => value === "hidden" || value === "clip"
    const documentScrollWidth = Math.max(html.scrollWidth, body.scrollWidth)
    const workspaceScrollWidth = workspace?.scrollWidth ?? 0
    const workspaceClientWidth = workspace?.clientWidth ?? 0
    const documentOverflow = documentScrollWidth > viewportWidth + 1
      && !clips(htmlStyle.overflowX)
      && !clips(bodyStyle.overflowX)
    const workspaceOverflow = workspaceScrollWidth > workspaceClientWidth + 1
      && !clips(workspaceStyle?.overflowX ?? "visible")
    const workspaceRect = workspace?.getBoundingClientRect() ?? { left: 0, right: viewportWidth }
    const describe = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const id = element.id ? `#${element.id}` : ""
      const classes = [...element.classList].slice(0, 6).map((name) => `.${name}`).join("")
      return {
        selector: `${element.tagName.toLowerCase()}${id}${classes}`.slice(0, 240),
        text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 180),
        rect: { left: Math.round(rect.left * 10) / 10, right: Math.round(rect.right * 10) / 10, width: Math.round(rect.width * 10) / 10 },
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        display: style.display,
        position: style.position,
        overflowX: style.overflowX,
        minWidth: style.minWidth,
        whiteSpace: style.whiteSpace,
      }
    }
    const candidates = workspace
      ? [...workspace.querySelectorAll("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 0
            && rect.height > 0
            && style.display !== "none"
            && style.visibility !== "hidden"
            && (rect.right > workspaceRect.right + 1 || element.scrollWidth > element.clientWidth + 1)
        })
        .map(describe)
        .sort((left, right) => Math.max(right.rect.right - workspaceRect.right, right.scrollWidth - right.clientWidth)
          - Math.max(left.rect.right - workspaceRect.right, left.scrollWidth - left.clientWidth))
        .slice(0, 30)
      : []
    const text = (workspace?.innerText ?? "").replace(/\s+/g, " ").trim()
    return {
      finalUrl: location.href,
      title: document.title,
      textLength: text.length,
      expectedMarkerPresent: text.toLowerCase().includes(marker.toLowerCase()),
      documentScrollWidth,
      viewportWidth,
      htmlOverflowX: htmlStyle.overflowX,
      bodyOverflowX: bodyStyle.overflowX,
      workspaceScrollWidth,
      workspaceClientWidth,
      workspaceOverflowX: workspaceStyle?.overflowX ?? null,
      documentOverflow,
      workspaceOverflow,
      horizontalOverflow: documentOverflow || workspaceOverflow,
      candidates,
    }
  }, expectedMarker)
}

function issuesFor(status, inspection, diagnostics) {
  const issues = []
  if (status !== 200) issues.push(`HTTP ${String(status)}`)
  if (!inspection?.expectedMarkerPresent) issues.push(`expected marker missing: ${expectedMarker}`)
  if (inspection?.horizontalOverflow) issues.push(`horizontal overflow: document ${inspection.documentScrollWidth}/${inspection.viewportWidth}; workspace ${inspection.workspaceScrollWidth}/${inspection.workspaceClientWidth}`)
  if (diagnostics.pageErrors.length) issues.push(`uncaught page errors: ${diagnostics.pageErrors.join(" | ")}`)
  const fatalConsole = diagnostics.consoleErrors.filter((message) => /uncaught|referenceerror|typeerror|syntaxerror|hydration failed|client-side exception/i.test(message))
  if (fatalConsole.length) issues.push(`fatal console errors: ${fatalConsole.join(" | ")}`)
  return issues
}

async function runAttempt(context, label, action, screenshotName) {
  const blockedExternal = []
  await isolate(context, blockedExternal)
  const page = await context.newPage()
  const attached = attachDiagnostics(page)
  const { diagnostics } = attached
  let status = null
  let inspection = null
  let navigationError = null
  const startedAt = new Date().toISOString()
  const start = Date.now()
  try {
    const response = await action(page)
    status = response?.status() ?? null
    await waitForSurface(page)
    inspection = await inspect(page)
    if (screenshotName) await page.screenshot({ path: join(outputDirectory, screenshotName), fullPage: false })
  } catch (error) {
    navigationError = compact(error)
    try { inspection = await inspect(page) } catch { /* Keep the original navigation failure. */ }
  }
  const issues = issuesFor(status, inspection, diagnostics)
  if (navigationError) issues.push(`navigation/render wait: ${navigationError}`)
  const output = { label, startedAt, durationMs: Date.now() - start, status, inspection, diagnostics, blockedExternal, issues, pass: issues.length === 0 }
  attached.detach()
  await page.close()
  return output
}

const evidence = {
  schemaVersion: "fusarium-focused-route-matrix/v1",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  baseUrl,
  routePath,
  routeId,
  expectedMarker,
  browser: { executablePath, version: null },
  isolation: "external browser requests blocked; existing 8012 service only; no lifecycle changes",
  coldLoads: [],
  modes: [],
  summary: null,
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-sync", "--no-first-run", "--no-default-browser-check"],
})
evidence.browser.version = browser.version()
try {
  const coldBlocked = []
  const coldContext = await browser.newContext({ viewport: { width: 1600, height: 900 }, screen: { width: 1600, height: 900 }, serviceWorkers: "block", colorScheme: "dark" })
  await isolate(coldContext, coldBlocked)
  const coldPage = await coldContext.newPage()
  const client = await coldContext.newCDPSession(coldPage)
  await client.send("Network.enable")
  await client.send("Network.setCacheDisabled", { cacheDisabled: true })
  await coldPage.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" })
  for (const label of ["fresh-profile-direct", "same-page-reload"]) {
    const attached = attachDiagnostics(coldPage)
    const { diagnostics } = attached
    let status = null
    let inspection = null
    let navigationError = null
    const startedAt = new Date().toISOString()
    const start = Date.now()
    try {
      const response = label === "fresh-profile-direct"
        ? await coldPage.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
        : await coldPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 })
      status = response?.status() ?? null
      await waitForSurface(coldPage)
      inspection = await inspect(coldPage)
    } catch (error) {
      navigationError = compact(error)
      try { inspection = await inspect(coldPage) } catch { /* Keep original failure. */ }
    }
    const issues = issuesFor(status, inspection, diagnostics)
    if (navigationError) issues.push(`navigation/render wait: ${navigationError}`)
    evidence.coldLoads.push({ label, startedAt, durationMs: Date.now() - start, status, inspection, diagnostics, issues, pass: issues.length === 0 })
    attached.detach()
  }
  await coldPage.screenshot({ path: join(outputDirectory, `focused-${routeId}-cold-reload.png`), fullPage: false })
  evidence.coldLoads.at(-1).blockedExternal = coldBlocked
  await coldPage.close()
  await coldContext.close()

  for (const mode of modes) {
    const context = await browser.newContext({ viewport: mode.viewport, screen: mode.screen, deviceScaleFactor: mode.deviceScaleFactor, serviceWorkers: "block", colorScheme: "dark", reducedMotion: "reduce" })
    const check = await runAttempt(
      context,
      mode.name,
      (page) => page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 60_000 }),
      `focused-${routeId}-${mode.name}.png`,
    )
    evidence.modes.push(check)
    await context.close()
  }
} finally {
  await browser.close()
}

const coldPassed = evidence.coldLoads.filter((entry) => entry.pass).length
const modesPassed = evidence.modes.filter((entry) => entry.pass).length
evidence.finishedAt = new Date().toISOString()
evidence.summary = {
  coldChecks: evidence.coldLoads.length,
  coldPassed,
  modeChecks: evidence.modes.length,
  modesPassed,
  failures: [...evidence.coldLoads, ...evidence.modes].filter((entry) => !entry.pass).map((entry) => ({ label: entry.label, issues: entry.issues })),
  pass: coldPassed === evidence.coldLoads.length && modesPassed === evidence.modes.length,
}
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
console.log(JSON.stringify(evidence.summary, null, 2))
if (!evidence.summary.pass) process.exitCode = 1
