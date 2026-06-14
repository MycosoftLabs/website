#!/usr/bin/env node

import { spawn } from "node:child_process"
import { resolve } from "node:path"

const args = parseArgs(process.argv.slice(2))
const base = String(args.base || process.env.SINE_SMOKE_BASE || "http://localhost:3010").replace(/\/$/, "")
const timeout = String(args.timeout || 90_000)
const browserTimeoutMs = Number(timeout)
const runAnalysis = Boolean(args["run-analysis"])
const jsonOutput = Boolean(args.json)

const steps = [
  {
    key: "no_fake_frontend",
    label: "Frontend no-fake semantics",
    command: [resolve("scripts/sine-no-fake-frontend-smoke.mjs"), "--json"],
    timeout_ms: 30_000,
  },
  {
    key: "aistudio_merge",
    label: "AI Studio merge audit",
    command: [resolve("scripts/sine-aistudio-merge-audit.mjs"), "--json"],
    timeout_ms: 30_000,
  },
  {
    key: "external_audio_repos",
    label: "External audio repo audit",
    command: [resolve("scripts/sine-external-repo-audit.mjs"), "--json"],
    timeout_ms: 45_000,
  },
  {
    key: "api_backend_contract",
    label: "SINE API/backend contract",
    command: [
      resolve("scripts/sine-phase-one-smoke.mjs"),
      `--base=${base}`,
      "--json",
      ...(runAnalysis ? ["--run-analysis"] : []),
    ],
    timeout_ms: 90_000,
  },
  {
    key: "rendered_player",
    label: "Rendered shared player",
    command: [resolve("scripts/sine-player-browser-smoke.mjs"), `--base=${base}`, `--timeout=${timeout}`, "--json"],
    timeout_ms: Math.max(60_000, browserTimeoutMs * 3 + 30_000),
  },
]

const report = {
  base,
  started_at: new Date().toISOString(),
  options: {
    run_analysis: runAnalysis,
    browser_timeout_ms: Number(timeout),
  },
  summary: {
    pass: 0,
    warn: 0,
    fail: 0,
  },
  steps: [],
  backend_blockers: [],
  auth_warnings: [],
}

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

function runStep(step) {
  return new Promise((resolveStep) => {
    let timedOut = false
    const child = spawn(process.execPath, step.command, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    const timer = setTimeout(() => {
      timedOut = true
      stderr += `\nSINE release gate timed out step ${step.key} after ${step.timeout_ms} ms.\n`
      child.kill()
    }, Math.max(15_000, Number(step.timeout_ms || 90_000)))
    timer.unref?.()
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      let data = null
      try {
        data = stdout.trim() ? JSON.parse(stdout) : null
      } catch {
        data = null
      }
      resolveStep({
        ...step,
        exit_code: code ?? 1,
        timed_out: timedOut,
        stdout,
        stderr,
        data,
      })
    })
  })
}

function checksFromPayload(payload) {
  if (!payload || typeof payload !== "object") return []
  if (Array.isArray(payload.checks)) return payload.checks
  if (Array.isArray(payload.repos)) {
    return payload.repos.map((repo) => ({
      status: repo.status === "pass" ? "pass" : repo.status === "warn" ? "warn" : "fail",
      name: repo.name,
      detail: repo.sine_use || repo.partial_reason || "External repo audit",
      context: repo,
    }))
  }
  if (Array.isArray(payload.findings)) {
    return payload.findings.map((finding) => ({
      status: finding.severity === "fail" ? "fail" : "warn",
      name: finding.rule,
      detail: finding.description,
      context: finding,
    }))
  }
  return []
}

function summarizeStep(result) {
  const checks = checksFromPayload(result.data)
  const summary = {
    pass: Number(result.data?.summary?.pass ?? 0),
    warn: Number(result.data?.summary?.warn ?? 0),
    fail: Number(result.data?.summary?.fail ?? 0),
  }

  if (!checks.length && Array.isArray(result.data?.findings)) {
    summary.fail = result.data.findings.filter((finding) => finding.severity === "fail").length
    summary.warn = result.data.findings.length - summary.fail
  }

  if (!result.data) {
    summary.fail += 1
  } else if (result.exit_code !== 0 && summary.fail === 0) {
    summary.fail += 1
  }

  return {
    key: result.key,
    label: result.label,
    exit_code: result.exit_code,
    status: summary.fail > 0 ? "fail" : summary.warn > 0 ? "warn" : "pass",
    summary,
    phase_status: result.data?.phase_one_status ?? result.data?.status ?? null,
    probes: result.data?.probes ?? undefined,
    surfaces: result.data?.surfaces ?? undefined,
    findings: result.data?.findings ?? undefined,
    error: result.data
      ? undefined
      : (result.timed_out ? result.stderr || "Step timed out before JSON payload returned" : result.stderr || result.stdout || "No JSON payload returned").slice(0, 1000),
    checks,
  }
}

function collectBlockers(stepSummary) {
  for (const check of stepSummary.checks || []) {
    const status = String(check.status || "").toLowerCase()
    const name = String(check.name || "")
    const detail = String(check.detail || "")
    if (status === "warn" && /mindex library acoustic embed/i.test(name) && /login|auth/i.test(detail)) {
      report.auth_warnings.push({ step: stepSummary.key, name, detail, context: check.context })
      continue
    }
    if (stepSummary.key === "external_audio_repos") {
      continue
    }
    if (status === "warn" || status === "fail") {
      if (/model|prototype|visualisation|analysis contract|classifier|evidence/i.test(`${name} ${detail}`)) {
        report.backend_blockers.push({ step: stepSummary.key, status, name, detail, context: check.context })
      }
    }
  }
}

function determineStatus() {
  if (report.summary.fail > 0) return "not_ready"
  if (report.backend_blockers.length > 0) return "frontend_ready_backend_pending"
  if (report.auth_warnings.length > 0 || report.summary.warn > 0) return "ready_with_warnings"
  return "ready"
}

async function main() {
  for (const step of steps) {
    const result = await runStep(step)
    const stepSummary = summarizeStep(result)
    report.steps.push(stepSummary)
    report.summary.pass += stepSummary.summary.pass
    report.summary.warn += stepSummary.summary.warn
    report.summary.fail += stepSummary.summary.fail
    collectBlockers(stepSummary)
  }

  report.finished_at = new Date().toISOString()
  report.status = determineStatus()

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport()
  }

  process.exitCode = report.summary.fail > 0 ? 1 : 0
}

function printHumanReport() {
  console.log("SINE release gate")
  console.log(`Base: ${report.base}`)
  console.log(`Status: ${report.status}`)
  console.log(`Checks: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`)
  console.log("")
  for (const step of report.steps) {
    console.log(`[${step.status.toUpperCase()}] ${step.label}`)
    console.log(`       ${step.summary.pass} pass, ${step.summary.warn} warn, ${step.summary.fail} fail`)
    if (step.error) console.log(`       ${step.error}`)
  }
  if (report.backend_blockers.length) {
    console.log("")
    console.log("Backend blockers:")
    for (const blocker of report.backend_blockers.slice(0, 8)) {
      console.log(`- ${blocker.name}: ${blocker.detail}`)
    }
  }
  if (report.auth_warnings.length) {
    console.log("")
    console.log("Auth/session warnings:")
    for (const warning of report.auth_warnings) {
      console.log(`- ${warning.name}: ${warning.detail}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
