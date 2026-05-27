#!/usr/bin/env node
/**
 * Live coherence audit for website <-> MYCA/MAS/MINDEX/Supabase.
 *
 * This script intentionally redacts concrete URLs, tokens, keys, DSNs, and raw
 * response bodies. It records target classes, route paths, status, latency, and
 * structural response signals so the report is useful without leaking internals.
 */

import fs from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const cwd = process.cwd()
const codeRoot = path.resolve(cwd, "..", "..")
const repos = {
  website: cwd,
  mas: path.join(codeRoot, "MAS", "mycosoft-mas"),
  mindex: path.join(codeRoot, "MINDEX", "mindex"),
}

const now = new Date()
const stamp = now.toISOString().replace(/[:.]/g, "-")
const outDir = path.join(cwd, "docs", "reports")
const jsonOut = path.join(outDir, `live-system-connections-audit-${stamp}.json`)
const mdOut = path.join(outDir, `LIVE_SYSTEM_CONNECTIONS_AUDIT_${stamp}.md`)

const RELEVANT_ENV_KEYS = [
  "NEXT_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "MAS_API_URL",
  "MAS_API_BASE_URL",
  "MAS_ORCHESTRATOR_URL",
  "NEXT_PUBLIC_MAS_API_URL",
  "NEXT_PUBLIC_MAS_URL",
  "MAS_INTERNAL_SERVICE_TOKEN",
  "MYCA_INTERNAL_SERVICE_TOKEN",
  "MINDEX_API_URL",
  "MINDEX_API_BASE_URL",
  "NEXT_PUBLIC_MINDEX_API_URL",
  "NEXT_PUBLIC_MINDEX_URL",
  "MINDEX_API_KEY",
  "MINDEX_INTERNAL_TOKEN",
  "MINDEX_INTERNAL_TOKENS",
  "DATABASE_URL",
  "MINDEX_DATABASE_URL",
  "MINDEX_DB_DSN",
  "REDIS_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MYCOBRAIN_SERVICE_URL",
  "MYCOBRAIN_API_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "XAI_API_KEY",
]

const SECRET_LIKE_PATTERNS = [
  { id: "credentialed-postgres-dsn", regex: /postgres(?:ql)?:\/\/[^:\s"'`]+:[^@\s"'`]+@/i },
  { id: "jwt-like-token", regex: /\beyJ[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}\b/ },
  { id: "openai-like-key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: "cloudflare-like-token", regex: /\b[A-Za-z0-9_-]{35,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
]

const INTERNAL_DISCLOSURE_PATTERNS = [
  /\brtx\s*\d{3,5}\b/i,
  /\bgpu(?:s)?\b/i,
  /\b(?:api|service)\s+keys?\b/i,
  /\b(?:redis|postgres(?:ql)?|qdrant|docker|proxmox|ollama|nemotron|personaplex)\b/i,
  /\b(?:192\.168\.|10\.0\.|172\.16\.|localhost:\d+)/i,
  /\b(?:provider_timings|fallback_reason|model provider|external language model)\b/i,
  /\b(?:claude|openai|gemini|grok|groq)\b/i,
]

function parseEnvFile(filePath) {
  const out = {}
  if (!existsSync(filePath)) return out
  const raw = readFileSync(filePath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[match[1]] = value
  }
  return out
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8")
}

function mergeEnv() {
  const envFiles = {}
  for (const name of [".env.local", ".env", ".env.production", ".env.production.generated"]) {
    const full = path.join(cwd, name)
    envFiles[name] = parseEnvFile(full)
  }
  return { ...envFiles[".env.production.generated"], ...envFiles[".env"], ...envFiles[".env.local"], ...process.env }
}

function firstEnv(env, keys, fallback = "") {
  for (const key of keys) {
    const value = String(env[key] || "").trim()
    if (value) return { key, value }
  }
  return { key: null, value: fallback }
}

function classifyUrl(value) {
  if (!value) return "unset"
  if (value.startsWith("/")) return "relative"
  try {
    const u = new URL(value)
    const host = u.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "loopback"
    if (/^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return "private-lan"
    if (host.endsWith(".supabase.co")) return "public-supabase"
    if (host.endsWith("mycosoft.com") || host.endsWith("mycosoft.org")) return "public-mycosoft"
    return "public-or-external"
  } catch {
    return "invalid"
  }
}

function joinUrl(base, routePath) {
  return `${base.replace(/\/$/, "")}${routePath.startsWith("/") ? routePath : `/${routePath}`}`
}

async function timedFetch({ name, group, method = "GET", base, path: routePath, headers, body, timeoutMs = 8000 }) {
  const started = Date.now()
  const targetClass = classifyUrl(base)
  const result = {
    name,
    group,
    method,
    path: routePath,
    targetClass,
    ok: false,
    status: "not_run",
    latencyMs: 0,
    contentType: null,
    jsonKeys: [],
    signals: {},
    error: null,
  }
  if (!base || targetClass === "invalid" || targetClass === "unset") {
    result.status = "skipped"
    result.error = "target_unset_or_invalid"
    return result
  }
  try {
    const response = await fetch(joinUrl(base, routePath), {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })
    result.status = response.status
    result.ok = response.ok
    if (name === "supabase-rest-root" && [200, 401, 404].includes(response.status)) {
      result.ok = true
      result.signals.supabaseReachable = true
    }
    result.latencyMs = Date.now() - started
    result.contentType = response.headers.get("content-type")
    const text = await response.text()
    const lowerText = text.toLowerCase()
    result.signals.internalDisclosureCandidate = INTERNAL_DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text))
    result.signals.bodyBytes = Buffer.byteLength(text)
    result.signals.hasHtml = lowerText.includes("<!doctype html") || lowerText.includes("<html")
    if (text && result.contentType?.includes("json")) {
      try {
        const data = JSON.parse(text)
        result.jsonKeys = Object.keys(data || {}).slice(0, 30)
        if (name === "myca-chat-smoke") {
          const responseText = String(data.response_text || data.answer || data.message || data.response || "")
          result.signals.responseTextLength = responseText.length
          result.signals.disclosureInResponse = INTERNAL_DISCLOSURE_PATTERNS.some((pattern) => pattern.test(responseText))
          result.signals.hasAudioPayload = Boolean(data.audio_base64)
          result.signals.hasProviderFields = Boolean(data.provider || data.routed_to || data.provider_timings || data.fallback_reason)
          result.signals.memorySaved = data.actions?.memory_saved ?? null
        }
        if (name === "myca-connectivity") {
          result.signals.exposesConcreteMasUrl = Object.prototype.hasOwnProperty.call(data, "mas_api_url")
          result.signals.chatReady = data.ok ?? null
        }
        if (name.includes("mindex") || name.includes("natureos-mindex")) {
          result.signals.service = data.service || data.status || data.health || null
          result.signals.hasDatabaseSignal = JSON.stringify(data).toLowerCase().includes("database")
        }
        if (name === "crep-fungal-san-diego") {
          const observations = Array.isArray(data.observations) ? data.observations : Array.isArray(data.results) ? data.results : []
          result.signals.observationCount = observations.length
          result.signals.total = data.total ?? data.count ?? null
        }
      } catch {
        result.signals.invalidJson = true
      }
    }
  } catch (error) {
    result.status = "error"
    result.latencyMs = Date.now() - started
    result.error = error instanceof Error ? error.message : String(error)
  }
  return result
}

async function listFiles(dir, predicate, maxFiles = 5000) {
  const out = []
  async function walk(current) {
    if (out.length >= maxFiles) return
    let entries = []
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".next" ||
        entry.name === ".pytest_cache" ||
        entry.name === ".venv" ||
        entry.name === "venv" ||
        entry.name === "__pycache__" ||
        entry.name === ".cursor" ||
        entry.name.startsWith(".codex")
      ) {
        continue
      }
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (predicate(full)) {
        out.push(full)
      }
      if (out.length >= maxFiles) return
    }
  }
  await walk(dir)
  return out
}

function routeFileToPath(file) {
  const rel = path.relative(path.join(cwd, "app", "api"), file).replace(/\\/g, "/")
  return `/api/${rel.replace(/\/route\.(ts|tsx|js|mjs)$/, "").replace(/\[\[\.\.\.([^\]]+)\]\]/g, ":$1*").replace(/\[\.\.\.([^\]]+)\]/g, ":$1*").replace(/\[([^\]]+)\]/g, ":$1")}`
}

async function routeInventory() {
  const routeFiles = await listFiles(
    path.join(cwd, "app", "api"),
    (file) => /route\.(ts|tsx|js|mjs)$/.test(file),
    2000
  )
  const groups = ["myca", "mas", "mindex", "natureos", "crep", "eagle", "search", "health", "supabase"]
  const grouped = Object.fromEntries(groups.map((group) => [group, []]))
  for (const file of routeFiles) {
    const routePath = routeFileToPath(file)
    for (const group of groups) {
      if (routePath.includes(`/${group}`) || (group === "health" && routePath.includes("/health"))) {
        grouped[group].push(routePath)
      }
    }
  }
  return {
    totalApiRoutes: routeFiles.length,
    groups: Object.fromEntries(
      Object.entries(grouped).map(([group, routes]) => [
        group,
        {
          count: routes.length,
          sample: routes.sort().slice(0, 40),
        },
      ])
    ),
  }
}

async function scanEnvReferences() {
  const files = await listFiles(
    cwd,
    (file) => /\.(ts|tsx|js|mjs)$/.test(file) && /[\\\/](app|lib|scripts|components)[\\\/]/.test(file),
    5000
  )
  const counts = {}
  const fileHits = {}
  for (const file of files) {
    const text = await readText(file).catch(() => "")
    const matches = [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1])
    if (!matches.length) continue
    const rel = path.relative(cwd, file).replace(/\\/g, "/")
    for (const key of matches) {
      if (!RELEVANT_ENV_KEYS.includes(key) && !/^(MAS|MYCA|MINDEX|SUPABASE|DATABASE|POSTGRES|REDIS|MYCOBRAIN|OPENAI|ANTHROPIC|GOOGLE|GEMINI|GROQ|XAI|N8N)/.test(key)) continue
      counts[key] = (counts[key] || 0) + 1
      if (!fileHits[key]) fileHits[key] = []
      if (fileHits[key].length < 15 && !fileHits[key].includes(rel)) fileHits[key].push(rel)
    }
  }
  return Object.fromEntries(
    Object.keys(counts)
      .sort()
      .map((key) => [key, { references: counts[key], files: fileHits[key] }])
  )
}

async function scanCodeRisk(repoName, repoPath) {
  if (!existsSync(repoPath)) return { repo: repoName, available: false }
  const files = await listFiles(
    repoPath,
    (file) => /\.(py|ts|tsx|js|mjs|md|txt|yml|yaml)$/.test(file),
    repoName === "website" ? 8000 : 12000
  )
  const risks = {
    loopbackServiceDefaults: [],
    internalUrlResponseKeys: [],
    secretLiteralCandidates: [],
  }
  for (const file of files) {
    const rel = path.relative(repoPath, file).replace(/\\/g, "/")
    if (/(\.next|node_modules|screenshots|artifacts|\.codex|\.venv|site-packages|test_output|failed_log|fail_log)/.test(rel)) continue
    const text = await readText(file).catch(() => "")
    if (/localhost:(8000|8001|8003|8040|8765)|127\.0\.0\.1:(8000|8001|8003|8040|8765)|host\.docker\.internal:(8000|8001|8003|8040|8765)/.test(text)) {
      risks.loopbackServiceDefaults.push(rel)
    }
    if (/\b(mas_api_url|mindex_api_url|database_url|redis_url|service_role_key)\b/i.test(text) && /NextResponse\.json|return\s+\{/.test(text)) {
      risks.internalUrlResponseKeys.push(rel)
    }
    for (const { id, regex } of SECRET_LIKE_PATTERNS) {
      if (regex.test(text)) {
        risks.secretLiteralCandidates.push({ file: rel, pattern: id })
        break
      }
    }
  }
  for (const key of Object.keys(risks)) {
    risks[key] = risks[key].slice(0, 120)
  }
  return { repo: repoName, available: true, ...risks }
}

function envContract(env) {
  return RELEVANT_ENV_KEYS.map((key) => {
    const value = String(env[key] || "").trim()
    const isUrlKey = /URL|DSN|DATABASE|REDIS/.test(key)
    return {
      key,
      configured: Boolean(value),
      targetClass: isUrlKey ? classifyUrl(value) : undefined,
      secretLike: /KEY|TOKEN|SECRET|PASSWORD|DSN|DATABASE|REDIS/.test(key),
    }
  })
}

function findFindings(report) {
  const findings = []
  const failedCritical = report.probes.filter((p) => ["website", "myca", "mas", "mindex", "supabase"].includes(p.group) && !p.ok)
  if (failedCritical.length) {
    findings.push({
      severity: "high",
      title: "One or more critical integration probes failed",
      detail: `${failedCritical.length} critical probes failed or timed out. See probe table for paths and status codes.`,
    })
  }
  const slow = report.probes.filter((p) => p.ok && p.latencyMs > 3000)
  if (slow.length) {
    findings.push({
      severity: "medium",
      title: "Slow integration probes exceed public MYCA target",
      detail: `${slow.length} probes took longer than 3000 ms.`,
    })
  }
  const myca = report.probes.find((p) => p.name === "myca-chat-smoke")
  if (myca?.signals?.disclosureInResponse || myca?.signals?.hasProviderFields) {
    findings.push({
      severity: "critical",
      title: "MYCA smoke response exposes internal fields or disallowed content",
      detail: "The public orchestrator response had disclosure flags. Inspect the local JSON report and route sanitization.",
    })
  }
  const connectivity = report.probes.find((p) => p.name === "myca-connectivity")
  if (connectivity?.signals?.exposesConcreteMasUrl) {
    findings.push({
      severity: "high",
      title: "MYCA connectivity endpoint exposes concrete MAS URL",
      detail: "Public diagnostics must report status without returning private service locations.",
    })
  }
  for (const scan of report.codeRiskScan) {
    if (scan.secretLiteralCandidates?.length) {
      findings.push({
        severity: "critical",
        title: `${scan.repo} contains secret-like literals in source/documentation`,
        detail: `${scan.secretLiteralCandidates.length} file(s) matched secret-like patterns. Paths only are included in the report.`,
      })
    }
    if (scan.loopbackServiceDefaults?.length) {
      findings.push({
        severity: "medium",
        title: `${scan.repo} still has loopback service defaults`,
        detail: `${scan.loopbackServiceDefaults.length} file(s) reference loopback service ports. Verify each is dev-only or routed through a resolver.`,
      })
    }
  }
  const missingRequired = report.envContract.filter((item) =>
    ["MAS_API_URL", "MINDEX_API_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].includes(item.key) && !item.configured
  )
  if (missingRequired.length) {
    findings.push({
      severity: "medium",
      title: "Key integration env vars are missing in this audit runtime",
      detail: `${missingRequired.map((item) => item.key).join(", ")} were not configured in parsed env/process env.`,
    })
  }
  return findings
}

function markdown(report) {
  const lines = []
  lines.push("# Live System Connections Audit")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push("")
  lines.push("## Scope")
  lines.push("")
  lines.push("- Website API/BFF routes for MYCA, MAS, MINDEX, CREP, Eagle Eye, search, and health.")
  lines.push("- Direct MAS and MINDEX health surfaces when configured.")
  lines.push("- Supabase REST reachability when configured.")
  lines.push("- Code-level risk scan for loopback defaults, response-key leaks, and secret-like literals.")
  lines.push("")
  lines.push("## Findings")
  lines.push("")
  if (!report.findings.length) {
    lines.push("- No critical findings were generated by the automated audit.")
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity.toUpperCase()}: ${finding.title} ${finding.detail}`)
    }
  }
  lines.push("")
  lines.push("## Probe Results")
  lines.push("")
  lines.push("| Group | Probe | Method | Path | Target | Status | Latency | OK |")
  lines.push("| --- | --- | --- | --- | --- | ---: | ---: | --- |")
  for (const probe of report.probes) {
    lines.push(`| ${probe.group} | ${probe.name} | ${probe.method} | ${probe.path} | ${probe.targetClass} | ${probe.status} | ${probe.latencyMs}ms | ${probe.ok ? "yes" : "no"} |`)
  }
  lines.push("")
  lines.push("## Route Inventory")
  lines.push("")
  lines.push(`Total website API route files: ${report.routeInventory.totalApiRoutes}`)
  for (const [group, entry] of Object.entries(report.routeInventory.groups)) {
    lines.push(`- ${group}: ${entry.count}`)
  }
  lines.push("")
  lines.push("## Notes")
  lines.push("")
  lines.push("- This report intentionally redacts concrete service URLs, raw response bodies, keys, tokens, and DSNs.")
  lines.push("- Secret-like scan entries are file paths and pattern labels only; inspect and rotate credentials separately if any are real.")
  lines.push("- Deployment is not performed by this audit.")
  lines.push("")
  return lines.join("\n")
}

async function main() {
  const env = mergeEnv()
  const websiteBase = firstEnv(env, ["NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_SITE_URL"], "http://localhost:3010").value
  const mas = firstEnv(env, ["MAS_API_URL", "MAS_API_BASE_URL", "MAS_ORCHESTRATOR_URL", "NEXT_PUBLIC_MAS_API_URL", "NEXT_PUBLIC_MAS_URL"], "http://192.168.0.188:8001")
  const mindex = firstEnv(env, ["MINDEX_API_URL", "MINDEX_API_BASE_URL", "NEXT_PUBLIC_MINDEX_API_URL", "NEXT_PUBLIC_MINDEX_URL"], "http://192.168.0.189:8000")
  const supabase = firstEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"])
  const supabaseAnon = firstEnv(env, ["NEXT_PUBLIC_SUPABASE_ANON_KEY"])
  const mindexHeaders = {
    Accept: "application/json",
    ...(env.MINDEX_INTERNAL_TOKEN ? { "X-Internal-Token": env.MINDEX_INTERNAL_TOKEN } : {}),
    ...(env.MINDEX_API_KEY ? { "X-API-Key": env.MINDEX_API_KEY } : {}),
  }

  const probeDefs = [
    { name: "website-health", group: "website", base: websiteBase, path: "/api/health", timeoutMs: 10000 },
    { name: "crep-health", group: "crep", base: websiteBase, path: "/api/crep/health", timeoutMs: 4000 },
    { name: "myca-connectivity", group: "myca", base: websiteBase, path: "/api/myca/connectivity", timeoutMs: 12000 },
    { name: "myca-live-activity", group: "myca", base: websiteBase, path: "/api/myca/live-activity", timeoutMs: 12000 },
    { name: "myca-orchestrator-get", group: "myca", base: websiteBase, path: "/api/mas/voice/orchestrator", timeoutMs: 5000 },
    {
      name: "myca-chat-smoke",
      group: "myca",
      method: "POST",
      base: websiteBase,
      path: "/api/mas/voice/orchestrator",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        message: "hello",
        want_audio: false,
        source: "connection-audit",
        context: {
          platform: "connection-audit",
          include_memory_context: false,
          isolate_from_chat_memory: true,
        },
      }),
      timeoutMs: 12000,
    },
    { name: "website-mas-health-proxy", group: "mas", base: websiteBase, path: "/api/mas/health", timeoutMs: 8000 },
    { name: "website-mindex-health-proxy", group: "mindex", base: websiteBase, path: "/api/mindex/health", timeoutMs: 8000 },
    { name: "natureos-mindex-health", group: "mindex", base: websiteBase, path: "/api/natureos/mindex/health", timeoutMs: 12000 },
    {
      name: "crep-fungal-san-diego",
      group: "crep",
      base: websiteBase,
      path: "/api/crep/fungal?north=33.20&south=32.45&east=-116.70&west=-117.35&limit=200",
      timeoutMs: 35000,
    },
    { name: "direct-mas-health", group: "mas", base: mas.value, path: "/health", timeoutMs: 6000 },
    { name: "direct-mas-myca-ping", group: "mas", base: mas.value, path: "/api/myca/ping", headers: { Accept: "application/json" }, timeoutMs: 8000 },
    { name: "direct-mindex-root-health", group: "mindex", base: mindex.value, path: "/health", timeoutMs: 15000 },
    { name: "direct-mindex-health", group: "mindex", base: mindex.value, path: "/api/mindex/health", headers: mindexHeaders, timeoutMs: 15000 },
    { name: "direct-mindex-health-all", group: "mindex", base: mindex.value, path: "/api/mindex/health/all", headers: mindexHeaders, timeoutMs: 20000 },
  ]
  if (supabase.value && supabaseAnon.value) {
    probeDefs.push({
      name: "supabase-rest-root",
      group: "supabase",
      base: supabase.value,
      path: "/rest/v1/",
      headers: {
        Accept: "application/json",
        apikey: supabaseAnon.value,
        Authorization: `Bearer ${supabaseAnon.value}`,
      },
      timeoutMs: 8000,
    })
  }

  const probes = []
  for (const probe of probeDefs) {
    probes.push(await timedFetch(probe))
  }
  const report = {
    generatedAt: now.toISOString(),
    workspace: path.relative(codeRoot, cwd).replace(/\\/g, "/"),
    scope: {
      repos: Object.fromEntries(Object.entries(repos).map(([key, value]) => [key, existsSync(value)])),
      serviceTargets: {
        website: { sourceKey: "NEXT_PUBLIC_BASE_URL/NEXT_PUBLIC_SITE_URL/fallback", targetClass: classifyUrl(websiteBase) },
        mas: { sourceKey: mas.key || "fallback", targetClass: classifyUrl(mas.value) },
        mindex: { sourceKey: mindex.key || "fallback", targetClass: classifyUrl(mindex.value) },
        supabase: { sourceKey: supabase.key || "unset", targetClass: classifyUrl(supabase.value) },
      },
    },
    envContract: envContract(env),
    routeInventory: await routeInventory(),
    envReferences: await scanEnvReferences(),
    probes,
    codeRiskScan: await Promise.all(Object.entries(repos).map(([repoName, repoPath]) => scanCodeRisk(repoName, repoPath))),
  }
  report.findings = findFindings(report)

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  await fs.writeFile(mdOut, markdown(report), "utf8")

  console.log(JSON.stringify({
    ok: !report.findings.some((finding) => finding.severity === "critical"),
    generatedAt: report.generatedAt,
    json: path.relative(cwd, jsonOut).replace(/\\/g, "/"),
    markdown: path.relative(cwd, mdOut).replace(/\\/g, "/"),
    probes: {
      total: report.probes.length,
      ok: report.probes.filter((probe) => probe.ok).length,
      failed: report.probes.filter((probe) => !probe.ok).length,
    },
    findings: report.findings.map((finding) => ({
      severity: finding.severity,
      title: finding.title,
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
