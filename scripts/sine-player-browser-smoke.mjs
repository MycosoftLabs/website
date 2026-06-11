#!/usr/bin/env node

import { chromium } from "playwright"

const args = parseArgs(process.argv.slice(2))
const base = String(args.base || process.env.SINE_SMOKE_BASE || "http://localhost:3010").replace(/\/$/, "")
const timeoutMs = Number(args.timeout || 120_000)
const jsonOutput = Boolean(args.json)
const requireMindex = Boolean(args["require-mindex"])
const nonce = Date.now()

const report = {
  base,
  started_at: new Date().toISOString(),
  summary: { pass: 0, warn: 0, fail: 0 },
  checks: [],
  surfaces: {},
}
let reportFinished = false

const surfaces = [
  {
    key: "public_sine",
    name: "Public SINE page",
    path: `/sensing/sine?codex_sine_browser=${nonce}`,
    required: true,
    expectedMode: "standalone",
  },
  {
    key: "standalone_player",
    name: "Standalone SINE player",
    path: `/sensing/sine/player?codex_sine_browser=${nonce}`,
    required: true,
    expectedMode: "standalone",
  },
  {
    key: "mindex_library",
    name: "MINDEX Library Acoustic embed",
    path: `/natureos/mindex?codex_sine_browser=${nonce}`,
    required: requireMindex,
    expectedMode: "compact",
    prepare: async (page) => {
      const libraryTab = page.getByRole("button", { name: /library/i }).first()
      const libraryLink = page.getByRole("link", { name: /library/i }).first()
      try {
        if (await libraryTab.isVisible({ timeout: 5_000 })) {
          await libraryTab.click()
          return
        }
      } catch {}
      try {
        if (await libraryLink.isVisible({ timeout: 2_000 })) {
          await libraryLink.click()
        }
      } catch {}
    },
  },
]

const watchdog = setTimeout(() => {
  addCheck("fail", "Browser smoke watchdog", "Rendered-player smoke exceeded its bounded runtime before all surfaces could be verified", {
    timeout_ms: timeoutMs,
    surfaces_started: Object.keys(report.surfaces),
  })
  finishReport()
  process.exit(1)
}, Math.max(60_000, timeoutMs * surfaces.length + 20_000))
watchdog.unref?.()

function parseArgs(argv) {
  const parsed = {}
  for (const item of argv) {
    if (item.startsWith("--") && item.includes("=")) {
      const [key, ...rest] = item.slice(2).split("=")
      parsed[key] = rest.join("=")
    } else if (item.startsWith("--")) {
      parsed[item.slice(2)] = true
    }
  }
  return parsed
}

function addCheck(status, name, detail, extra = {}) {
  report.summary[status] += 1
  report.checks.push({ status, name, detail, context: extra })
}

function numberAttr(attrs, key) {
  const value = Number(attrs[key])
  return Number.isFinite(value) ? value : 0
}

function boolAttr(attrs, key) {
  return String(attrs[key] || "").toLowerCase() === "true"
}

function looksAuthBlocked(page) {
  const url = page.url().toLowerCase()
  return url.includes("/login") || url.includes("redirectto=") || url.includes("callbackurl=")
}

async function collectPlayerAttrs(page) {
  return await page.evaluate(() => {
    const node = document.querySelector('[data-sine-player="true"]')
    if (!node) return null
    const attrs = {}
    for (const attr of node.attributes) attrs[attr.name] = attr.value
    return attrs
  })
}

function hasHighDensityScope(attrs) {
  if (!attrs) return false
  const waveformPoints = numberAttr(attrs, "data-sine-scope-waveform-points")
  const spectrogramRows = numberAttr(attrs, "data-sine-scope-spectrogram-rows")
  const spectrogramCols = numberAttr(attrs, "data-sine-scope-spectrogram-cols")
  const scopeSource = String(attrs["data-sine-scope-source"] || "")
  return waveformPoints >= 4096 && spectrogramRows >= 128 && spectrogramCols >= 256 && scopeSource !== "none"
}

async function waitForRenderedPlayer(page, surface) {
  await page.waitForSelector('[data-sine-player="true"]', { timeout: surface.required ? timeoutMs : 30_000 })

  await page.waitForFunction(() => {
    const player = document.querySelector('[data-sine-player="true"]')
    if (!player) return false
    const loaded = Number(player.getAttribute("data-sine-loaded-files") || "0")
    const selectedMode = player.getAttribute("data-sine-selected-record-mode") || ""
    return loaded > 0 && selectedMode !== "" && selectedMode !== "none"
  }, null, { timeout: timeoutMs }).catch(() => null)

  await page.waitForFunction(() => {
    const player = document.querySelector('[data-sine-player="true"]')
    if (!player) return false
    const waveform = Number(player.getAttribute("data-sine-scope-waveform-points") || "0")
    const rows = Number(player.getAttribute("data-sine-scope-spectrogram-rows") || "0")
    const cols = Number(player.getAttribute("data-sine-scope-spectrogram-cols") || "0")
    const source = player.getAttribute("data-sine-scope-source") || "none"
    return waveform >= 4096 && rows >= 128 && cols >= 256 && source !== "none"
  }, null, { timeout: timeoutMs }).catch(() => null)

  return await collectPlayerAttrs(page)
}

function assessSurface(surface, attrs, consoleErrors, pageErrors, failedRequests) {
  const loadedFiles = numberAttr(attrs, "data-sine-loaded-files")
  const filteredFiles = numberAttr(attrs, "data-sine-filtered-files")
  const analysisReadyFiles = numberAttr(attrs, "data-sine-analysis-ready-files")
  const playbackOnlyFiles = numberAttr(attrs, "data-sine-playback-only-files")
  const waveformPoints = numberAttr(attrs, "data-sine-scope-waveform-points")
  const spectrogramRows = numberAttr(attrs, "data-sine-scope-spectrogram-rows")
  const spectrogramCols = numberAttr(attrs, "data-sine-scope-spectrogram-cols")
  const soundTargets = numberAttr(attrs, "data-sine-sound-targets")
  const mode = attrs["data-sine-player-mode"] || ""
  const readinessLabel = attrs["data-sine-readiness-label"] || ""
  const scopeSource = attrs["data-sine-scope-source"] || ""
  const selectedRecordMode = attrs["data-sine-selected-record-mode"] || ""
  const modelRuntimeLive = boolAttr(attrs, "data-sine-model-runtime-live")
  const modelEvidencePresent = boolAttr(attrs, "data-sine-model-evidence-present")
  const highDensityScope = waveformPoints >= 4096 && spectrogramRows >= 128 && spectrogramCols >= 256 && scopeSource !== "none"
  const fakeReady =
    !modelRuntimeLive &&
    !modelEvidencePresent &&
    /scientific classifier ready|classifier ready|ai ready/i.test(readinessLabel)

  const summary = {
    mode,
    loaded_files: loadedFiles,
    filtered_files: filteredFiles,
    analysis_ready_files: analysisReadyFiles,
    playback_only_files: playbackOnlyFiles,
    selected_record_mode: selectedRecordMode,
    readiness_label: readinessLabel,
    model_runtime_live: modelRuntimeLive,
    model_evidence_present: modelEvidencePresent,
    scope_source: scopeSource,
    waveform_points: waveformPoints,
    spectrogram_rows: spectrogramRows,
    spectrogram_cols: spectrogramCols,
    sound_targets: soundTargets,
    console_errors: consoleErrors.length,
    page_errors: pageErrors.length,
    failed_requests: failedRequests.length,
  }

  if (mode !== surface.expectedMode) {
    addCheck("fail", `${surface.name} mode`, `Expected ${surface.expectedMode}, got ${mode || "none"}`, summary)
  } else {
    addCheck("pass", `${surface.name} mode`, `Rendered shared player in ${mode} mode`, summary)
  }

  if (consoleErrors.length || pageErrors.length) {
    addCheck("fail", `${surface.name} browser errors`, "Browser console/page errors were detected", {
      ...summary,
      console_errors_sample: consoleErrors.slice(0, 5),
      page_errors_sample: pageErrors.slice(0, 5),
      failed_requests_sample: failedRequests.slice(0, 5),
    })
  } else {
    addCheck("pass", `${surface.name} browser errors`, "No browser console/page errors detected", summary)
  }

  if (loadedFiles <= 0) {
    addCheck("fail", `${surface.name} acoustic catalog`, "No acoustic files loaded in the rendered player", summary)
  } else {
    addCheck("pass", `${surface.name} acoustic catalog`, `${loadedFiles} file(s) loaded`, summary)
  }

  if (!selectedRecordMode || selectedRecordMode === "none") {
    addCheck("fail", `${surface.name} selected recording`, "No selected acoustic recording is active", summary)
  } else if (selectedRecordMode === "playback-only") {
    addCheck("warn", `${surface.name} selected recording`, "Selected file can play, but it is not UUID-backed for SINE analysis yet", summary)
  } else {
    addCheck("pass", `${surface.name} selected recording`, `Selected recording is ${selectedRecordMode}`, summary)
  }

  if (playbackOnlyFiles > 0) {
    addCheck("warn", `${surface.name} registration coverage`, `${playbackOnlyFiles} loaded file(s) are playback-only registration gaps`, summary)
  } else {
    addCheck("pass", `${surface.name} registration coverage`, "Loaded files are UUID-backed for analysis", summary)
  }

  if (!highDensityScope) {
    addCheck("fail", `${surface.name} high-density scope`, `Scope is not high density: ${waveformPoints} waveform, ${spectrogramRows}x${spectrogramCols} spectrogram`, summary)
  } else {
    addCheck("pass", `${surface.name} high-density scope`, `${scopeSource} scope has ${waveformPoints} waveform points and ${spectrogramRows}x${spectrogramCols} spectrogram`, summary)
  }

  if (fakeReady) {
    addCheck("fail", `${surface.name} evidence honesty`, "Player claims classifier readiness without model runtime or model evidence", summary)
  } else {
    addCheck("pass", `${surface.name} evidence honesty`, `Readiness is honest: ${readinessLabel || "unlabeled"}`, summary)
  }

  if (soundTargets < 31) {
    addCheck("fail", `${surface.name} sound target coverage`, `Expected at least 31 sound targets, got ${soundTargets}`, summary)
  } else {
    addCheck("pass", `${surface.name} sound target coverage`, `${soundTargets} sound targets exposed`, summary)
  }

  return summary
}

async function verifySurface(browser, surface) {
  const page = await browser.newPage({
    viewport: { width: surface.expectedMode === "compact" ? 1440 : 1600, height: surface.expectedMode === "compact" ? 950 : 1100 },
  })
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({
        text: message.text(),
        location: message.location(),
      })
    }
  })
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "",
    })
  })

  try {
    await page.goto(`${base}${surface.path}`, { waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 60_000) })
    if (looksAuthBlocked(page)) {
      const summary = { url: page.url(), auth_blocked: true }
      report.surfaces[surface.key] = summary
      addCheck(surface.required ? "fail" : "warn", surface.name, "Route is behind login/auth in this browser session", summary)
      return
    }

    if (surface.prepare) await surface.prepare(page)

    let attrs = null
    try {
      attrs = await waitForRenderedPlayer(page, surface)
    } catch (error) {
      const summary = { url: page.url(), message: error.message }
      report.surfaces[surface.key] = summary
      addCheck(surface.required ? "fail" : "warn", surface.name, "Shared SINE player did not render", summary)
      return
    }

    if (attrs && (pageErrors.length > 0 || !hasHighDensityScope(attrs))) {
      pageErrors.length = 0
      consoleErrors.length = 0
      await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 60_000) })
      if (surface.prepare) await surface.prepare(page)
      attrs = await waitForRenderedPlayer(page, surface).catch(() => attrs)
    }

    if (!attrs) {
      const summary = { url: page.url(), player_missing_after_wait: true }
      report.surfaces[surface.key] = summary
      addCheck(surface.required ? "fail" : "warn", surface.name, "Shared SINE player disappeared before attributes could be collected", summary)
      return
    }
    const summary = assessSurface(surface, attrs, consoleErrors, pageErrors, failedRequests)
    report.surfaces[surface.key] = { url: page.url(), ...summary }
  } finally {
    await page.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const surface of surfaces) {
      await verifySurface(browser, surface)
    }
  } finally {
    await browser.close()
  }

  clearTimeout(watchdog)
  finishReport()

  process.exitCode = report.summary.fail > 0 ? 1 : 0
}

function finishReport() {
  if (reportFinished) return
  reportFinished = true
  report.finished_at = new Date().toISOString()
  report.status = report.summary.fail > 0 ? "not_ready" : report.summary.warn > 0 ? "ready_with_warnings" : "ready"
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport()
  }
}

function printHumanReport() {
  console.log("SINE rendered player browser smoke")
  console.log(`Base: ${report.base}`)
  console.log(`Status: ${report.status}`)
  console.log(`Checks: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`)
  console.log("")
  for (const check of report.checks) {
    const icon = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL"
    console.log(`[${icon}] ${check.name}`)
    console.log(`       ${check.detail}`)
  }
}

main().catch((error) => {
  addCheck("fail", "Browser smoke runner", "Rendered-player smoke crashed before all surfaces could be verified", {
    message: error?.message || String(error),
    stack: error?.stack || null,
  })
  finishReport()
  process.exit(1)
})
