import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, request } from "playwright-core"

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, "../../../../../")
const baseUrl = (process.env.FUSARIUM_BASE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "")
const parsedBaseUrl = new URL(baseUrl)
if (!new Set(["127.0.0.1", "localhost", "::1"]).has(parsedBaseUrl.hostname)) {
  throw new Error("Full sidebar browser QA is restricted to an existing loopback preview")
}
const allowedOrigin = parsedBaseUrl.origin
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE
  ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const outputDirectory = process.env.FUSARIUM_QA_OUTPUT_DIR
  ?? join(repositoryRoot, "docs", "codex-handoffs", "evidence", "full-sidebar-tools-matrix-sep01-2026")
const outputPath = join(outputDirectory, "full-sidebar-tools-matrix.json")

const sidebarRoutes = [
  ["overview", "Overview", "/fusarium", ["Overview"]],
  ["situational-awareness", "Situational Awareness", "/fusarium/situational-awareness", ["Situational Awareness"]],
  ["threat-assessment", "Threat Assessment", "/fusarium/threat-assessment", ["Threat Assessment"]],
  ["data-fusion", "Data Fusion", "/fusarium/data-fusion", ["Data Fusion"]],
  ["command-control", "Command & Control", "/fusarium/command-control", ["Command & Control"]],
  ["oei", "OEI Narrative", "/fusarium/oei", ["OEI Narrative"]],
  ["stack", "Stack Inventory", "/fusarium/stack", ["Stack Inventory"]],
  ["nature-statistics", "Nature Statistics", "/fusarium/nature-statistics", ["Nature Statistics"]],
  ["fungi-compute", "Fungi Compute", "/fusarium/fungi-compute", ["Fungi Compute"]],
  ["earth-simulator", "Earth Simulator", "/fusarium/earth-simulator", ["Earth Simulator", "Environmental"]],
  ["virtual-petri-dish", "Virtual Petri Dish", "/fusarium/virtual-petri-dish", ["Virtual Petri Dish"]],
  ["biology-simulator", "Biology Simulator", "/fusarium/biology-simulator", ["Biology Simulator"]],
  ["compound-analyser", "Compound Analyser", "/fusarium/compound-analyser", ["Compound Analyser"]],
  ["aerosol", "Aerosol", "/fusarium/aerosol", ["Spore & Particulate Operations Map", "Aerosol"]],
  ["life-database", "Life Database", "/fusarium/life-database", ["Species Explorer"]],
  ["growth-analytics", "Growth Analytics", "/fusarium/growth-analytics", ["Growth Analytics"]],
  ["sensing", "Sensing overview", "/fusarium/sensing", ["Senses Overview"]],
  ["gcs", "Global Control System", "/fusarium/gcs", ["Psathyrella", "Global Control System"]],
  ["bluesight", "BlueSight", "/fusarium/bluesight", ["BlueSight"]],
  ["sine", "SINE", "/fusarium/sine", ["SINE"]],
  ["fci", "FCI", "/fusarium/fci", ["Device Interface", "FCI"]],
  ["thermal", "Thermal Field Laboratory", "/fusarium/thermal", ["Thermal Field Laboratory"]],
  ["gandha", "GANDHA", "/fusarium/gandha", ["Odor Signature Laboratory", "GANDHA"]],
  ["mechanical", "Tactus — Mechanical", "/fusarium/mechanical", ["Tactus — Mechanical"]],
  ["ai-studio", "MYCA AI Studio", "/fusarium/ai-studio", ["MYCA AI Studio"]],
  ["nlm-training", "NLM Training Dashboard", "/fusarium/nlm-training", ["NLM Training Dashboard"]],
  ["workflows", "Workflows", "/fusarium/workflows", ["Workflows"]],
  ["mas", "MAS Topology", "/fusarium/mas", ["MAS Operations"]],
  ["avani", "AVANI Guardian", "/fusarium/avani", ["AVANI Guardian"]],
  ["tools", "Tools Hub", "/fusarium/tools", ["Tools Hub"]],
  ["api", "API Gateway", "/fusarium/api", ["API Gateway"]],
  ["functions", "Functions", "/fusarium/functions", ["Functions"]],
  ["sdk", "SDK", "/fusarium/sdk", ["SDK"]],
  ["shell", "Cloud Shell", "/fusarium/shell", ["Cloud Shell"]],
  ["devices", "DirtNet Operations", "/fusarium/devices", ["DirtNet Operations"]],
  ["mycobrain", "DirtNet Edge Nodes", "/fusarium/mycobrain", ["DirtNet Edge Nodes"]],
  ["sporebase", "DirtNet Bioaerosol Nodes", "/fusarium/sporebase", ["DirtNet Bioaerosol Nodes"]],
  ["crep", "Earth / CREP Mission Picture", "/fusarium/crep", ["Earth / CREP Mission Picture"]],
  ["mindex", "MINDEX", "/fusarium/mindex", ["MINDEX"]],
  ["storage", "Storage", "/fusarium/storage", ["Storage"]],
  ["containers", "Containers", "/fusarium/containers", ["Containers"]],
  ["monitoring", "Mission Assurance", "/fusarium/monitoring", ["Mission Assurance"]],
  ["partner-mesh", "Partner Mesh", "/fusarium/partner-mesh", ["Partner Mesh"]],
  ["adapters", "Integration Hub", "/fusarium/adapters", ["Adapters", "Integration Hub"]],
  ["profile", "Account & Access", "/fusarium/profile", ["Account & access"]],
  ["settings", "Settings", "/fusarium/settings", ["Settings"]],
].map(([id, title, path, expectedMain]) => ({ id, title, path, expectedMain, family: "sidebar" }))

const existingToolRoutes = [
  ["source-provenance", "Source Provenance Inspector"],
  ["chain-of-custody", "Chain of Custody Ledger Inspector"],
  ["evidence-timeline", "Evidence Timeline Builder"],
  ["field-packet", "Field Packet Builder"],
  ["evidence-diff", "Evidence Diff"],
  ["evidence-integrity", "Evidence Integrity Check"],
  ["classification-release-checker", "Classification / Releaseability Checker"],
  ["indicator-watchlist", "Indicator Watchlist"],
  ["environmental-object-tracker", "Environmental Object Tracker"],
  ["multisensor-track-fusion", "Multi-Sensor Track Fusion"],
  ["source-health", "Source Health Matrix"],
]

const newToolRoutes = [
  ["field-coverage", "Environmental Coverage Planner"],
  ["field-diff", "Field Change Detector"],
  ["sensor-health", "Sensor Health Triage"],
  ["network-posture", "Network Posture Review"],
  ["incident-timeline", "Incident Timeline"],
]

const legacyToolRoutes = [
  ["retrosynthesis", "Retrosynthesis"],
  ["digital-twin", "Digital Twin"],
  ["physics-sim", "Physics Simulator"],
]

const toolRoutes = [
  ...existingToolRoutes.map(([id, title]) => ({ id, title, path: `/fusarium/tools/${id}`, expectedMain: [title], family: "tool-existing" })),
  ...newToolRoutes.map(([id, title]) => ({ id, title, path: `/fusarium/tools/${id}`, expectedMain: [title], family: "tool-new" })),
  ...legacyToolRoutes.map(([id, title]) => ({ id, title, path: `/fusarium/tools/${id}`, expectedMain: [title], family: "tool-legacy" })),
]

const routes = [...sidebarRoutes, ...toolRoutes]
const modes = [
  { name: "desktop", viewport: { width: 1600, height: 900 }, screen: { width: 1600, height: 900 }, deviceScaleFactor: 1, description: "1600x900 CSS viewport" },
  { name: "narrow", viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 1, description: "390x844 CSS viewport" },
  { name: "zoom-200", viewport: { width: 800, height: 450 }, screen: { width: 1600, height: 900 }, deviceScaleFactor: 2, description: "200-percent desktop equivalent: 800x450 CSS viewport on a 1600x900 physical canvas" },
]

const staleGenericMarkers = [
  "This workspace has no runtime bind yet, so it renders nothing rather than showing seeded content.",
  "This workspace is bound to the runtime. Its surfaces render from those binds only.",
  "Runtime unreachable — nothing on this page is estimated in its place.",
  "Nothing is implemented behind this route.",
  "The largest of the two gaps: this is not only a sensor readout",
  "What this tool has to do",
  "What the narrative surface needs",
  "What the inventory needs",
]

const fatalTextMarkers = [
  "This page could not be found.",
  "Internal Server Error",
  "Application error: a client-side exception",
  "Unhandled Runtime Error",
  "Build Error",
]

const result = {
  schemaVersion: "fusarium-full-sidebar-tools-browser-matrix/v1",
  startedAt: new Date().toISOString(),
  finishedAt: null,
  baseUrl,
  browser: { executablePath, product: "Microsoft Edge via playwright-core", version: null },
  isolation: {
    allowedOrigin,
    externalRequests: "blocked in the browser; recorded as origin plus path only",
    serviceLifecycle: "no start, stop, restart, rebind, or deployment action",
  },
  routeInventory: {
    sidebar: sidebarRoutes.length,
    toolsExisting: existingToolRoutes.length,
    toolsNew: newToolRoutes.length,
    toolsLegacy: legacyToolRoutes.length,
    toolsTotal: toolRoutes.length,
    totalUnique: new Set(routes.map((entry) => entry.path)).size,
  },
  modes,
  navigationInventory: null,
  coldLoads: [],
  http: [],
  browserChecks: [],
  summary: null,
}

mkdirSync(outputDirectory, { recursive: true })

function save() {
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")
}

function compactError(error) {
  return String(error instanceof Error ? error.message : error).replace(/\s+/g, " ").slice(0, 600)
}

function sanitizedRequest(url, resourceType) {
  try {
    const parsed = new URL(url)
    return { origin: parsed.origin, path: parsed.pathname, resourceType }
  } catch {
    return { origin: "unparseable", path: "omitted", resourceType }
  }
}

function installIsolation(context, blocked) {
  return context.route("**/*", async (route) => {
    const request = route.request()
    const url = request.url()
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("about:")) {
      await route.continue()
      return
    }
    try {
      if (new URL(url).origin === allowedOrigin) {
        await route.continue()
        return
      }
    } catch {
      // The request is not a valid local URL and therefore stays outside the allowlist.
    }
    blocked.push(sanitizedRequest(url, request.resourceType()))
    await route.abort("blockedbyclient")
  })
}

async function establishOwnerSession(requestContext, redirectTo = "/fusarium") {
  const response = await requestContext.post(`${baseUrl}/api/auth/local-dev-session`, {
    headers: { Origin: allowedOrigin },
    data: { redirectTo },
    failOnStatusCode: false,
  })
  const body = await response.json().catch(() => null)
  if (response.status() !== 200 || body?.success !== true) {
    throw new Error(`local owner QA session unavailable (HTTP ${response.status()})`)
  }
}

async function waitForRenderedSurface(page) {
  await page.waitForFunction(() => {
    const workspace = document.querySelector("main.workspace") ?? document.querySelector("main")
    if (!workspace) return false
    const textLength = (workspace.innerText || "").trim().length
    const visual = workspace.querySelector("h1, h2, article, section, canvas, svg, [role='main']")
    return textLength >= 80 && Boolean(visual)
  }, { timeout: 30_000 })
  await page.waitForTimeout(650)
}

async function inspect(page, entry) {
  return page.evaluate(({ expectedMain, staleGenericMarkers, fatalTextMarkers }) => {
    const workspace = document.querySelector("main.workspace") ?? document.querySelector("main")
    const text = (workspace?.innerText ?? "").replace(/\s+/g, " ").trim()
    const lower = text.toLowerCase()
    const headings = [...(workspace?.querySelectorAll("h1, h2") ?? [])]
      .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 12)
    const staleMarkers = staleGenericMarkers.filter((marker) => lower.includes(marker.toLowerCase()))
    const fatalMarkers = fatalTextMarkers.filter((marker) => lower.includes(marker.toLowerCase()))
    const expectedMatch = expectedMain.find((marker) => lower.includes(marker.toLowerCase())) ?? null
    const html = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(html.scrollWidth, body?.scrollWidth ?? 0)
    const clientWidth = html.clientWidth
    const htmlOverflowX = getComputedStyle(html).overflowX
    const bodyOverflowX = body ? getComputedStyle(body).overflowX : "visible"
    const workspaceOverflowX = workspace ? getComputedStyle(workspace).overflowX : "visible"
    const workspaceScrollWidth = workspace?.scrollWidth ?? 0
    const workspaceClientWidth = workspace?.clientWidth ?? 0
    const clipsHorizontalOverflow = (value) => value === "hidden" || value === "clip"
    const rawDocumentOverflow = scrollWidth > clientWidth + 1
    const rootOverflowClipped = clipsHorizontalOverflow(htmlOverflowX) || clipsHorizontalOverflow(bodyOverflowX)
    const workspaceHorizontalOverflow = workspaceScrollWidth > workspaceClientWidth + 1
      && !clipsHorizontalOverflow(workspaceOverflowX)
    const overlaySelectors = [
      "[data-nextjs-dialog]",
      "[data-nextjs-error-overlay]",
      "#webpack-dev-server-client-overlay",
      "vite-error-overlay",
    ]
    const directOverlay = overlaySelectors.find((selector) => document.querySelector(selector)) ?? null
    const portalOverlay = [...document.querySelectorAll("nextjs-portal")].some((portal) => {
      const portalText = portal.shadowRoot?.textContent ?? ""
      return /build error|runtime error|unhandled error|failed to compile/i.test(portalText)
    })
    const visualCount = workspace?.querySelectorAll("h1, h2, article, section, canvas, svg, [role='main']").length ?? 0
    return {
      finalUrl: location.href,
      title: document.title,
      readyState: document.readyState,
      workspaceTextLength: text.length,
      headings,
      expectedMatch,
      staleMarkers,
      fatalMarkers,
      visualCount,
      scrollWidth,
      clientWidth,
      rawDocumentOverflow,
      rootOverflowClipped,
      htmlOverflowX,
      bodyOverflowX,
      workspaceScrollWidth,
      workspaceClientWidth,
      workspaceOverflowX,
      workspaceHorizontalOverflow,
      horizontalOverflow: (rawDocumentOverflow && !rootOverflowClipped) || workspaceHorizontalOverflow,
      errorOverlay: directOverlay ?? (portalOverlay ? "nextjs-portal" : null),
    }
  }, { expectedMain: entry.expectedMain, staleGenericMarkers, fatalTextMarkers })
}

function attachDiagnostics(page, diagnostics) {
  const onPageError = (error) => diagnostics.pageErrors.push(compactError(error))
  const onConsole = (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text().replace(/\s+/g, " ").slice(0, 600))
  }
  const onResponse = (response) => {
    if (response.status() < 400) return
    try {
      const parsed = new URL(response.url())
      if (parsed.origin !== allowedOrigin) return
      diagnostics.localErrorResponses.push({ path: parsed.pathname, status: response.status() })
    } catch {
      // Ignore malformed diagnostic URLs.
    }
  }
  page.on("pageerror", onPageError)
  page.on("console", onConsole)
  page.on("response", onResponse)
  return () => {
    page.off("pageerror", onPageError)
    page.off("console", onConsole)
    page.off("response", onResponse)
  }
}

function issuesFor(status, inspection, diagnostics) {
  const issues = []
  if (status !== 200) issues.push(`navigation HTTP ${status ?? "no response"}`)
  if (!inspection) issues.push("rendered surface unavailable")
  if (inspection && inspection.workspaceTextLength < 80) issues.push(`workspace text length ${inspection.workspaceTextLength}`)
  if (inspection && inspection.visualCount === 0) issues.push("no rendered visual surface")
  if (inspection && !inspection.expectedMatch) issues.push("route-specific main-surface marker missing")
  if (inspection?.horizontalOverflow) issues.push(`horizontal overflow ${inspection.scrollWidth}/${inspection.clientWidth}`)
  if (inspection?.staleMarkers.length) issues.push(`stale generic fallback: ${inspection.staleMarkers.join(" | ")}`)
  if (inspection?.fatalMarkers.length) issues.push(`fatal rendered marker: ${inspection.fatalMarkers.join(" | ")}`)
  if (inspection?.errorOverlay) issues.push(`framework error overlay: ${inspection.errorOverlay}`)
  if (diagnostics.pageErrors.length) issues.push(`uncaught page errors: ${diagnostics.pageErrors.join(" | ")}`)
  const fatalConsole = diagnostics.consoleErrors.filter((message) => /uncaught|referenceerror|typeerror|syntaxerror|hydration failed|client-side exception/i.test(message))
  if (fatalConsole.length) issues.push(`fatal console errors: ${fatalConsole.join(" | ")}`)
  return issues
}

async function coldLoadProbe(entry) {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-sync", "--no-first-run", "--no-default-browser-check"],
  })
  const blocked = []
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, screen: { width: 1600, height: 900 }, serviceWorkers: "block" })
  await establishOwnerSession(context.request, entry.path)
  await installIsolation(context, blocked)
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send("Network.enable")
  await client.send("Network.setCacheDisabled", { cacheDisabled: true })
  await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" })
  const attempts = []
  try {
    for (const kind of ["fresh-profile-direct", "same-page-reload"]) {
      const diagnostics = { pageErrors: [], consoleErrors: [], localErrorResponses: [] }
      const detachDiagnostics = attachDiagnostics(page, diagnostics)
      let status = null
      let inspection = null
      let navigationError = null
      const startedAt = new Date().toISOString()
      const start = Date.now()
      try {
        const response = kind === "fresh-profile-direct"
          ? await page.goto(`${baseUrl}${entry.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
          : await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 })
        status = response?.status() ?? null
        await waitForRenderedSurface(page)
        inspection = await inspect(page, entry)
      } catch (error) {
        navigationError = compactError(error)
        try { inspection = await inspect(page, entry) } catch { /* evidence remains unavailable */ }
      }
      const issues = issuesFor(status, inspection, diagnostics)
      if (navigationError) issues.push(`navigation/render wait: ${navigationError}`)
      attempts.push({ kind, startedAt, durationMs: Date.now() - start, status, inspection, diagnostics, issues, pass: issues.length === 0 })
      detachDiagnostics()
    }
    await page.screenshot({ path: join(outputDirectory, `cold-${entry.id}-reload.png`), fullPage: false })
  } finally {
    await context.close()
    await browser.close()
  }
  const initial = attempts[0]
  const reload = attempts[1]
  return {
    route: entry.path,
    expectedMain: entry.expectedMain,
    freshBrowserProcess: true,
    cacheDisabled: true,
    attempts,
    recoveredAfterInitialFailure: Boolean(!initial?.pass && reload?.pass),
    pass: Boolean(reload?.pass),
    blockedExternal: blocked,
  }
}

async function httpProbe(requestContext, entry) {
  const attempts = []
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const startedAt = new Date().toISOString()
    const start = Date.now()
    try {
      const response = await requestContext.get(entry.path, {
        maxRedirects: 0,
        timeout: 45_000,
        headers: { Accept: "text/html", "Cache-Control": "no-cache", "User-Agent": "FusariumLocalBrowserMatrix/1.0" },
      })
      const body = await response.text()
      attempts.push({
        attempt,
        startedAt,
        durationMs: Date.now() - start,
        status: response.status(),
        contentType: response.headers()["content-type"] ?? null,
        bodyBytes: Buffer.byteLength(body),
        pass: response.status() === 200 && /text\/html/i.test(response.headers()["content-type"] ?? "") && body.length > 80,
      })
    } catch (error) {
      attempts.push({ attempt, startedAt, durationMs: Date.now() - start, status: null, error: compactError(error), pass: false })
    }
    if (attempts.at(-1)?.pass) break
  }
  return {
    family: entry.family,
    id: entry.id,
    title: entry.title,
    path: entry.path,
    attempts,
    recovered: attempts.length > 1 && attempts.at(-1)?.pass,
    pass: Boolean(attempts.at(-1)?.pass),
  }
}

async function browserCheck(context, entry, mode) {
  const page = await context.newPage()
  const diagnostics = { pageErrors: [], consoleErrors: [], localErrorResponses: [] }
  const detachDiagnostics = attachDiagnostics(page, diagnostics)
  let status = null
  let inspection = null
  let navigationError = null
  const start = Date.now()
  try {
    const response = await page.goto(`${baseUrl}${entry.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    status = response?.status() ?? null
    await waitForRenderedSurface(page)
    inspection = await inspect(page, entry)
  } catch (error) {
    navigationError = compactError(error)
    try { inspection = await inspect(page, entry) } catch { /* evidence remains unavailable */ }
  }
  const issues = issuesFor(status, inspection, diagnostics)
  if (navigationError) issues.push(`navigation/render wait: ${navigationError}`)
  const check = {
    family: entry.family,
    id: entry.id,
    title: entry.title,
    path: entry.path,
    mode: mode.name,
    durationMs: Date.now() - start,
    status,
    inspection,
    diagnostics,
    issues,
    pass: issues.length === 0,
  }
  if (!check.pass) {
    try {
      await page.screenshot({ path: join(outputDirectory, `failure-${mode.name}-${entry.id}.png`), fullPage: false })
    } catch {
      // The JSON evidence still records the failure when a screenshot cannot be captured.
    }
  }
  detachDiagnostics()
  await page.close()
  return check
}

async function navigationInventoryCheck(browser) {
  const blocked = []
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    screen: { width: 1600, height: 900 },
    serviceWorkers: "block",
    colorScheme: "dark",
  })
  await establishOwnerSession(context.request)
  await installIsolation(context, blocked)
  const page = await context.newPage()
  const diagnostics = { pageErrors: [], consoleErrors: [], localErrorResponses: [] }
  const detachDiagnostics = attachDiagnostics(page, diagnostics)
  let sidebarStatus = null
  let toolsStatus = null
  let sidebarPaths = []
  let dedicatedToolPaths = []
  let error = null
  try {
    const sidebarResponse = await page.goto(`${baseUrl}/fusarium`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    sidebarStatus = sidebarResponse?.status() ?? null
    await waitForRenderedSurface(page)
    sidebarPaths = await page.locator("#sidebar-nav a[href]").evaluateAll((anchors) => anchors.map((anchor) => new URL(anchor.href).pathname))
    const toolsResponse = await page.goto(`${baseUrl}/fusarium/tools`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    toolsStatus = toolsResponse?.status() ?? null
    await waitForRenderedSurface(page)
    dedicatedToolPaths = await page.locator("main.workspace a[href^='/fusarium/tools/']").evaluateAll((anchors) => anchors.map((anchor) => new URL(anchor.href).pathname))
  } catch (caught) {
    error = compactError(caught)
  } finally {
    detachDiagnostics()
    await page.close()
    await context.close()
  }
  const expectedSidebar = sidebarRoutes.map((entry) => entry.path)
  const expectedTools = toolRoutes.map((entry) => entry.path)
  const uniqueSidebar = [...new Set(sidebarPaths)]
  const uniqueDedicatedTools = [...new Set(dedicatedToolPaths)]
  const missingSidebar = expectedSidebar.filter((path) => !uniqueSidebar.includes(path))
  const missingTools = expectedTools.filter((path) => !uniqueDedicatedTools.includes(path))
  const additionalDedicatedToolLinks = uniqueDedicatedTools.filter((path) => !expectedTools.includes(path))
  const issues = []
  if (sidebarStatus !== 200) issues.push(`sidebar inventory HTTP ${sidebarStatus ?? "no response"}`)
  if (toolsStatus !== 200) issues.push(`Tools Hub inventory HTTP ${toolsStatus ?? "no response"}`)
  if (uniqueSidebar.length !== sidebarRoutes.length) issues.push(`sidebar unique-link count ${uniqueSidebar.length}/${sidebarRoutes.length}`)
  if (missingSidebar.length) issues.push(`missing sidebar links: ${missingSidebar.join(", ")}`)
  if (missingTools.length) issues.push(`missing required Tools Hub links: ${missingTools.join(", ")}`)
  if (diagnostics.pageErrors.length) issues.push(`uncaught page errors: ${diagnostics.pageErrors.join(" | ")}`)
  if (error) issues.push(error)
  return {
    sidebarStatus,
    toolsStatus,
    sidebarLinkCount: uniqueSidebar.length,
    requiredToolLinkCount: expectedTools.filter((path) => uniqueDedicatedTools.includes(path)).length,
    allDedicatedToolLinkCount: uniqueDedicatedTools.length,
    missingSidebar,
    missingTools,
    additionalDedicatedToolLinks,
    diagnostics,
    blockedExternal: blocked,
    issues,
    pass: issues.length === 0,
  }
}

function finalizeSummary() {
  const httpPass = result.http.filter((entry) => entry.pass).length
  const browserPass = result.browserChecks.filter((entry) => entry.pass).length
  const browserFailures = result.browserChecks.filter((entry) => !entry.pass)
  const allPageErrors = result.browserChecks.flatMap((entry) => entry.diagnostics.pageErrors.map((message) => ({ path: entry.path, mode: entry.mode, message })))
  const overflowFailures = result.browserChecks.filter((entry) => entry.inspection?.horizontalOverflow)
  const clippedOverflowDiagnostics = result.browserChecks.filter((entry) => entry.inspection?.rawDocumentOverflow && !entry.inspection?.horizontalOverflow)
  const staleGenericFailures = result.browserChecks.filter((entry) => entry.inspection?.staleMarkers.length)
  const blocked = result.browserChecks.flatMap((entry) => entry.blockedExternal ?? [])
  result.summary = {
    routeCount: routes.length,
    modeCount: modes.length,
    httpChecks: result.http.length,
    httpPassed: httpPass,
    httpFailed: result.http.length - httpPass,
    browserChecks: result.browserChecks.length,
    browserPassed: browserPass,
    browserFailed: result.browserChecks.length - browserPass,
    coldLoadChecks: result.coldLoads.length,
    coldLoadPassed: result.coldLoads.filter((entry) => entry.pass).length,
    navigationInventory: result.navigationInventory,
    uncaughtPageErrors: allPageErrors,
    horizontalOverflowFailures: overflowFailures.map((entry) => ({ path: entry.path, mode: entry.mode, scrollWidth: entry.inspection.scrollWidth, clientWidth: entry.inspection.clientWidth })),
    clippedDocumentOverflowDiagnostics: clippedOverflowDiagnostics.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      scrollWidth: entry.inspection.scrollWidth,
      clientWidth: entry.inspection.clientWidth,
      htmlOverflowX: entry.inspection.htmlOverflowX,
      bodyOverflowX: entry.inspection.bodyOverflowX,
      workspaceScrollWidth: entry.inspection.workspaceScrollWidth,
      workspaceClientWidth: entry.inspection.workspaceClientWidth,
      workspaceOverflowX: entry.inspection.workspaceOverflowX,
    })),
    staleGenericFallbackFailures: staleGenericFailures.map((entry) => ({ path: entry.path, mode: entry.mode, markers: entry.inspection.staleMarkers })),
    failures: browserFailures.map((entry) => ({ path: entry.path, mode: entry.mode, issues: entry.issues })),
    pass: httpPass === result.http.length
      && browserPass === result.browserChecks.length
      && result.navigationInventory?.pass === true
      && result.coldLoads.every((entry) => entry.pass),
  }
  result.finishedAt = new Date().toISOString()
}

if (sidebarRoutes.length !== 46 || toolRoutes.length !== 19 || routes.length !== 65 || new Set(routes.map((entry) => entry.path)).size !== 65) {
  throw new Error(`route inventory mismatch: sidebar=${sidebarRoutes.length}, tools=${toolRoutes.length}, total=${routes.length}`)
}

save()

for (const id of ["sensing", "nlm-training"]) {
  const entry = sidebarRoutes.find((route) => route.id === id)
  const cold = await coldLoadProbe(entry)
  result.coldLoads.push(cold)
  save()
  console.log(`[cold] ${entry.path} ${cold.pass ? "PASS" : "FAIL"}`)
}

const httpRequestContext = await request.newContext({
  baseURL: baseUrl,
  extraHTTPHeaders: { Origin: allowedOrigin },
})
try {
  await establishOwnerSession(httpRequestContext)
  for (let index = 0; index < routes.length; index += 1) {
    const entry = routes[index]
    const probe = await httpProbe(httpRequestContext, entry)
    result.http.push(probe)
    save()
    if (!probe.pass || (index + 1) % 10 === 0 || index + 1 === routes.length) {
      console.log(`[http] ${index + 1}/${routes.length} ${entry.path} ${probe.pass ? "PASS" : "FAIL"}`)
    }
  }
} finally {
  await httpRequestContext.dispose()
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-sync", "--no-first-run", "--no-default-browser-check"],
})
result.browser.version = browser.version()

try {
  result.navigationInventory = await navigationInventoryCheck(browser)
  save()
  console.log(`[navigation] ${result.navigationInventory.pass ? "PASS" : "FAIL"}`)
  for (const mode of modes) {
    const blocked = []
    const context = await browser.newContext({
      viewport: mode.viewport,
      screen: mode.screen,
      deviceScaleFactor: mode.deviceScaleFactor,
      serviceWorkers: "block",
      colorScheme: "dark",
      reducedMotion: "reduce",
    })
    await establishOwnerSession(context.request)
    await installIsolation(context, blocked)
    for (let index = 0; index < routes.length; index += 1) {
      const entry = routes[index]
      const check = await browserCheck(context, entry, mode)
      check.blockedExternal = blocked.splice(0)
      result.browserChecks.push(check)
      save()
      if (!check.pass || (index + 1) % 10 === 0 || index + 1 === routes.length) {
        console.log(`[browser:${mode.name}] ${index + 1}/${routes.length} ${entry.path} ${check.pass ? "PASS" : "FAIL"}`)
      }
    }
    await context.close()
  }
} finally {
  await browser.close()
}

finalizeSummary()
save()
console.log(JSON.stringify(result.summary, null, 2))
if (!result.summary.pass) process.exitCode = 1
