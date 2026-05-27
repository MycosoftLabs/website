#!/usr/bin/env node
import { chromium, devices } from "playwright"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const args = parseArgs(process.argv.slice(2))
const base = String(args.base || "http://127.0.0.1:3010").replace(/\/$/, "")
const limit = Number(args.limit || 100)
const offset = Number(args.offset || 0)
const take = Number(args.take || limit)
const outDir = String(args.out || "artifacts/search-qa")
const headless = args.headless !== "false"
const mobile = Boolean(args.mobile)
const sampleLinks = Number(args.sampleLinks || 5)
const timeoutMs = Number(args.timeout || 20000)

await mkdir(outDir, { recursive: true })

const artifact = await fetchJson(`${base}/api/search/qa/artifact?limit=${limit}`)
const scenarios = artifact.scenarios.slice(offset, offset + take)
const browser = await chromium.launch({ headless })
const context = await browser.newContext(mobile ? devices["iPhone 14 Pro"] : { viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const observations = []

for (let i = 0; i < scenarios.length; i += 1) {
  const scenario = scenarios[i]
  const started = Date.now()
  const consoleErrors = []
  page.removeAllListeners("console")
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (/Permissions policy violation: Geolocation access has been blocked/i.test(text)) return
    if (/Failed to fetch RSC payload.*hmrRefresh|hot-reloader-client|webpack-internal:\/\/\/\(app-pages-browser\)\/.*hot-reloader/i.test(text)) return
    if (/Failed to fetch RSC payload[\s\S]*hmr-refresh-reducer/i.test(text)) return
    if (/Failed to load resource: the server responded with a status of (404|429|503)/i.test(text)) return
    consoleErrors.push(text)
  })
  let homeSubmitted = false
  let navigationMs = 0
  let snapshot = null
  let text = ""
  let url = ""
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: timeoutMs })
    const input = page.locator('input[name="q"], input[aria-label="Search"]').first()
    await input.waitFor({ state: "visible", timeout: timeoutMs })
    await input.fill(scenario.query)
    const navStart = Date.now()
    await Promise.all([
      page.waitForURL(/\/search\?q=/, { timeout: timeoutMs }),
      input.press("Enter"),
    ])
    homeSubmitted = true
    navigationMs = Date.now() - navStart
    await waitForQaSnapshot(page, scenario.query, timeoutMs)
    await waitForExpectedWidgetsOrIdle(page, scenario, timeoutMs).catch(() => {})
    snapshot = await page.evaluate(() => globalThis.__MYCOSOFT_SEARCH_QA__ || null)
    text = await page.locator("body").innerText({ timeout: timeoutMs }).catch(() => "")
    url = page.url()
  } catch (error) {
    url = page.url()
    text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")
    if (!url.includes("/search?q=")) {
      await page.goto(`${base}/search?q=${encodeURIComponent(scenario.query)}`, { waitUntil: "domcontentloaded", timeout: timeoutMs }).catch(() => {})
      await waitForQaSnapshot(page, scenario.query, timeoutMs).catch(() => {})
      await waitForExpectedWidgetsOrIdle(page, scenario, timeoutMs).catch(() => {})
      snapshot = await page.evaluate(() => globalThis.__MYCOSOFT_SEARCH_QA__ || null).catch(() => null)
      text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => text)
      url = page.url()
    }
    consoleErrors.push(`runner: ${error instanceof Error ? error.message : String(error)}`)
  }

  const renderedWidgets = normalizeWidgets(snapshot?.expandedWidgets)
  const dataMap = normalizeDataMap(snapshot?.dataMap)
  const widgetsWithNoData = renderedWidgets.filter((widget) => (dataMap[widget] ?? 0) === 0)
  const linkAudit = await auditLinks(page, sampleLinks)
  observations.push({
    scenarioId: scenario.id,
    query: scenario.query,
    url,
    homeSubmitted,
    navigationMs,
    firstWidgetMs: navigationMs,
    fullHydrationMs: Date.now() - started,
    renderedWidgets,
    widgetsWithData: dataMap,
    widgetsWithNoData,
    earthLayers: Array.isArray(snapshot?.earthLayers) ? snapshot.earthLayers : [],
    visibleTextSample: text.slice(0, 4000),
    linkAudit,
    rawTimeoutVisible: /timeout after 15000ms/i.test(text),
    chunkErrorVisible: /ChunkLoadError|Loading chunk/i.test(text),
    consoleErrors: consoleErrors.slice(0, 12),
    qaSnapshot: snapshot || {},
  })

  process.stdout.write(`[${i + 1}/${scenarios.length}] ${scenario.query} -> ${renderedWidgets.join(",") || "no widgets"}\n`)
}

await browser.close()

const report = await postJson(`${base}/api/search/qa/artifact`, { scenarios, observations })
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const jsonPath = path.join(outDir, `search-qa-results-${stamp}.json`)
const promptPath = path.join(outDir, `search-qa-fix-prompt-${stamp}.md`)
await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8")
await writeFile(promptPath, report.agentPrompt || artifact.agentPrompt || "", "utf8")

console.log(JSON.stringify({
  jsonPath,
  promptPath,
  scenarioCount: scenarios.length,
  observationCount: observations.length,
  findingCount: report.findingCount,
  criticalCount: report.criticalCount,
}, null, 2))

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith("--")) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) parsed[key] = true
    else {
      parsed[key] = next
      i += 1
    }
  }
  return parsed
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
  return res.json()
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
  return res.json()
}

async function waitForQaSnapshot(page, query, timeout) {
  await page.waitForFunction(
    (expectedQuery) => {
      const qa = globalThis.__MYCOSOFT_SEARCH_QA__
      return qa && typeof qa === "object" && String(qa.query || "").toLowerCase() === String(expectedQuery).toLowerCase()
    },
    query,
    { timeout },
  )
}

async function waitForExpectedWidgetsOrIdle(page, scenario, timeout) {
  const expected = scenario.expectedWidgets.slice(0, 4)
  const requiredDataWidgets = Object.entries(scenario.expectedWidgetData || {})
    .filter(([, expectation]) => expectation?.dataRequired)
    .map(([widget]) => widget)
  await page.waitForFunction(
    ({ widgets, dataWidgets }) => {
      const qa = globalThis.__MYCOSOFT_SEARCH_QA__
      if (!qa || typeof qa !== "object") return false
      const expanded = Array.isArray(qa.expandedWidgets) ? qa.expandedWidgets.map(String) : []
      const hasExpected = widgets.length > 0 && widgets.every((widget) => expanded.includes(String(widget)))
      const dataMap = qa.dataMap && typeof qa.dataMap === "object" ? qa.dataMap : {}
      const requiredDataReady = dataWidgets
        .filter((widget) => expanded.includes(String(widget)))
        .every((widget) => Number(dataMap[widget] || 0) > 0)
      const hasAnyData = Object.values(dataMap).some((value) => Number(value) > 0)
      return (hasExpected && requiredDataReady) || (!qa.isLoading && dataWidgets.length === 0 && hasAnyData && hasExpected)
    },
    { widgets: expected, dataWidgets: requiredDataWidgets },
    { timeout },
  )
}

function normalizeWidgets(raw) {
  return Array.isArray(raw) ? [...new Set(raw.map(String).filter(Boolean))] : []
}

function normalizeDataMap(raw) {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number(value) || 0]))
}

async function auditLinks(page, sample) {
  const hrefs = await page.locator('a[href^="http"], a[href^="/"]').evaluateAll((links) =>
    links.map((link) => link.href).filter(Boolean)
  ).catch(() => [])
  const unique = [...new Set(hrefs)].slice(0, sample)
  const broken = []
  for (const href of unique) {
    try {
      const res = await fetch(href, { method: "HEAD", redirect: "follow" })
      if (res.status >= 400) broken.push({ href, status: res.status, reason: "HTTP error" })
    } catch (error) {
      broken.push({ href, reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return { total: hrefs.length, broken }
}
