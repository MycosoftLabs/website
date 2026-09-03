import { tmpdir } from "node:os"
import { join } from "node:path"
import { chromium } from "../../../../../node_modules/playwright-core/index.mjs"

const baseUrl = (process.env.FUNGI_COMPUTE_QA_BASE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "")
const origin = new URL(baseUrl).origin
const executablePath = process.env.FUNGI_COMPUTE_QA_BROWSER
  ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

if (!new Set(["127.0.0.1", "localhost", "::1"]).has(new URL(baseUrl).hostname)) {
  throw new Error("Fungi Compute browser QA is restricted to an existing loopback preview")
}

const registeredDevice = {
  id: "fci-alpha",
  name: "FCI Alpha QA",
  type: "mycobrain",
  probeType: "copper_steel",
  status: "online",
  channels: 1,
  sampleRate: 10,
  lastSeen: "2026-09-02T12:00:00.000Z",
  firmwareVersion: "qa-only",
}

const results = []
function check(condition, label, detail = "") {
  results.push({ pass: Boolean(condition), label, detail })
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ""}`)
}

async function establishOwnerSession(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/local-dev-session`, {
    headers: { Origin: origin },
    data: { redirectTo: "/fusarium/fungi-compute" },
    failOnStatusCode: false,
  })
  const payload = await response.json().catch(() => null)
  check(response.status() === 200 && payload?.success === true, "local owner QA session established", String(response.status()))
}

async function createIsolatedContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    screen: { width: 1600, height: 1000 },
    serviceWorkers: "block",
    colorScheme: "dark",
    reducedMotion: "reduce",
  })
  await establishOwnerSession(context)

  const websocketUrls = []
  await context.routeWebSocket("**/api/fci/ws/stream/**", async (socket) => {
    websocketUrls.push(socket.url())
    socket.onMessage(() => {})
    // This intentionally lacks provider identity, observedAt, unit, schema, and
    // provenance. The legacy client will stamp identity/time locally; the
    // Fusarium truth boundary must still withhold it.
    setTimeout(() => {
      socket.send(JSON.stringify({
        type: "sample",
        payload: { channels: [0], samples: [[0.25, -0.5, 0.75]], sampleRate: 10 },
      }))
    }, 100)
  })

  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url())
    if (requestUrl.origin !== origin) {
      await route.abort("blockedbyclient")
      return
    }
    if (requestUrl.pathname === "/api/fci/devices") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ devices: [registeredDevice] }) })
      return
    }
    if (requestUrl.pathname === "/api/fusarium/nlm/status") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ available: false, reason: "isolated QA" }) })
      return
    }
    if (requestUrl.pathname.startsWith("/api/auth/") || requestUrl.pathname === "/api/fusarium/operator/state") {
      await route.continue()
      return
    }
    if (requestUrl.pathname.startsWith("/api/")) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ available: false, reason: "isolated QA" }) })
      return
    }
    await route.continue()
  })

  return {
    context,
    fciWebsocketCount: () => websocketUrls.filter((url) => /\/api\/fci\/ws\/stream\//.test(url)).length,
  }
}

async function inspectPage(page) {
  const root = page.locator("[data-fusarium-fungi-evidence-mode]")
  await root.waitFor({ state: "attached", timeout: 60_000 })
  await page.locator('[data-fusarium-twin-surface][data-navigation-ready="true"]')
    .waitFor({ state: "attached", timeout: 15_000 })
    .catch(() => {})
  await page.waitForTimeout(250)
  const layout = await root.evaluate((element) => {
    const parent = element.parentElement
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const ancestors = []
    let current = element.parentElement
    while (current && ancestors.length < 6) {
      const currentRect = current.getBoundingClientRect()
      ancestors.push({
        tag: current.tagName,
        className: current.className,
        width: currentRect.width,
        height: currentRect.height,
        display: getComputedStyle(current).display,
      })
      current = current.parentElement
    }
    return {
      viewportWidth: document.documentElement.clientWidth,
      desktopMedia: matchMedia("(min-width: 1024px)").matches,
      rootDisplay: style.display,
      rootVisibility: style.visibility,
      rootOpacity: style.opacity,
      rootWidth: rect.width,
      rootHeight: rect.height,
      parentDisplay: parent ? getComputedStyle(parent).display : null,
      bodyTextLength: document.body.innerText.trim().length,
      navigationReady: element.closest("[data-fusarium-twin-surface]")?.getAttribute("data-navigation-ready") ?? null,
      ancestors,
    }
  })
  return {
    mode: await root.getAttribute("data-fusarium-fungi-evidence-mode"),
    state: await root.getAttribute("data-fusarium-fungi-evidence-state"),
    transport: await root.getAttribute("data-fusarium-fungi-transport-state"),
    device: await root.getAttribute("data-fusarium-fungi-selected-device"),
    text: (await root.innerText()).replace(/\s+/g, " "),
    canvasCount: await page.locator("canvas").count(),
    visible: await root.isVisible(),
    layout,
    errorOverlayCount: await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count(),
  }
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-sync", "--no-first-run"],
})

try {
  {
    const { context, fciWebsocketCount } = await createIsolatedContext(browser)
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    const failedResponses = []
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message))
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()) })
    page.on("response", (entry) => { if (entry.status() >= 400) failedResponses.push(`${entry.status()} ${entry.url()}`) })
    const response = await page.goto(`${baseUrl}/fusarium/fungi-compute`, { waitUntil: "domcontentloaded", timeout: 90_000 })
    const state = await inspectPage(page)
    check(response?.status() === 200, "unbound page returns HTTP 200", String(response?.status()))
    check(pageErrors.length === 0, "unbound page has no uncaught page errors before visibility", JSON.stringify({ pageErrors, consoleErrors, failedResponses }))
    check(state.visible && state.layout.bodyTextLength > 0, "unbound page renders visible content", JSON.stringify({ layout: state.layout, consoleErrors, failedResponses }))
    check(state.device === "unbound" && state.mode === "unavailable", "inventory does not auto-select or become LIVE", JSON.stringify(state))
    check(fciWebsocketCount() === 0, "unbound page opens no FCI device WebSocket", String(fciWebsocketCount()))
    check(/READ ONLY/.test(state.text) && !/Control Center|Stimulation Control/.test(state.text), "read-only surface exposes no device command controls")
    const unexpectedConsoleErrors = consoleErrors.filter((message) => !/OuterLayoutRouter|Failed to load resource: the server responded with a status of 503/i.test(message))
    check(unexpectedConsoleErrors.length === 0, "unbound page has no unexpected console errors", unexpectedConsoleErrors.join(" | "))
    check(state.errorOverlayCount === 0 && pageErrors.length === 0, "unbound page has no framework or page errors", pageErrors.join(" | "))
    await page.screenshot({ path: join(tmpdir(), "fusarium-fungi-compute-unbound-qa.png"), fullPage: false })
    await context.close()
  }

  {
    const { context, fciWebsocketCount } = await createIsolatedContext(browser)
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    const response = await page.goto(`${baseUrl}/fusarium/fungi-compute?deviceId=fci-missing&source=fusarium-fci`, { waitUntil: "domcontentloaded", timeout: 90_000 })
    const state = await inspectPage(page)
    check(response?.status() === 200, "unknown-device handoff returns HTTP 200", String(response?.status()))
    check(state.device === "unbound" && state.mode === "unavailable", "unknown device handoff remains unbound", JSON.stringify(state))
    check(fciWebsocketCount() === 0, "unknown device handoff opens no FCI WebSocket", String(fciWebsocketCount()))
    check(/not an exact registry match/i.test(state.text), "unknown handoff explains exact-match rejection")
    check(state.errorOverlayCount === 0 && pageErrors.length === 0, "unknown-device page has no framework or page errors", pageErrors.join(" | "))
    await context.close()
  }

  {
    const { context, fciWebsocketCount } = await createIsolatedContext(browser)
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    const response = await page.goto(`${baseUrl}/fusarium/fungi-compute?deviceId=fci-alpha&source=fusarium-fci`, { waitUntil: "domcontentloaded", timeout: 90_000 })
    await page.locator('[data-fusarium-fungi-transport-state="connected"]').waitFor({ state: "visible", timeout: 15_000 })
    const state = await inspectPage(page)
    check(response?.status() === 200, "exact-device handoff returns HTTP 200", String(response?.status()))
    check(state.device === "fci-alpha", "exact unique handoff selects its inventory identity", JSON.stringify(state))
    check(fciWebsocketCount() === 1 && state.transport === "connected", "transport reachability is reported separately", JSON.stringify({ websocketCount: fciWebsocketCount(), transport: state.transport }))
    check(state.mode === "unavailable" && state.state === "unavailable", "open transport plus client-stamped samples never becomes LIVE", JSON.stringify(state))
    check(/schemaVersion is not supported|provider-authored sample envelope/i.test(state.text), "withheld sample explains the missing provider evidence contract")
    check(state.canvasCount === 0, "withheld samples never reach scientific charts", String(state.canvasCount))
    check(state.errorOverlayCount === 0 && pageErrors.length === 0, "exact-device page has no framework or page errors", pageErrors.join(" | "))
    await page.screenshot({ path: join(tmpdir(), "fusarium-fungi-compute-withheld-qa.png"), fullPage: false })
    await context.close()
  }
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(JSON.stringify({ assertions: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2))
if (failed.length > 0) process.exitCode = 1
