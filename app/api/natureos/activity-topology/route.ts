import { NextRequest, NextResponse } from "next/server"
import type { ActivityNode, ActivityConnection, ActivityTopologyData } from "@/components/mas/topology/activity-types"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"
const MINDEX_API_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || "http://192.168.0.189:8000"
const N8N_URL = process.env.N8N_URL || process.env.N8N_WEBHOOK_URL?.replace(/\/webhook.*$/, "") || "http://192.168.0.188:5678"
const HEALTH_TIMEOUT_MS = 4000

type NodeStatus = "healthy" | "degraded" | "error"

interface HealthResult {
  status: NodeStatus
  latencyMs?: number
  requestRate?: number
  metadata?: Record<string, unknown>
}

async function fetchHealthInParallel(): Promise<{
  mas: HealthResult
  mindex: HealthResult
  n8n: HealthResult
}> {
  const start = Date.now()
  const [masRes, mindexRes, n8nRes] = await Promise.allSettled([
    fetch(`${MAS_API_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) }),
    fetch(`${MINDEX_API_URL}/api/mindex/health`, { cache: "no-store", signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) }).catch(() => fetch(`${MINDEX_API_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) })),
    fetch(`${N8N_URL}/api/v1/workflows`, { cache: "no-store", signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) }),
  ])

  const toResult = (p: PromiseSettledResult<Response>, latency: number): HealthResult => {
    if (p.status === "rejected") return { status: "error", latencyMs: latency }
    const res = p.value
    if (!res.ok) return { status: "error", latencyMs: latency }
    return { status: "healthy", latencyMs: latency, requestRate: 2 }
  }

  const masLatency = Date.now() - start
  const mas: HealthResult = masRes.status === "fulfilled" && masRes.value.ok
    ? { status: "healthy", latencyMs: masLatency, requestRate: 2, metadata: await masRes.value.json().catch(() => ({})) }
    : toResult(masRes as PromiseSettledResult<Response>, masLatency)

  const mindexLatency = Date.now() - start
  const mindex: HealthResult = mindexRes.status === "fulfilled" && mindexRes.value.ok
    ? { status: "healthy", latencyMs: mindexLatency, requestRate: 2 }
    : toResult(mindexRes as PromiseSettledResult<Response>, mindexLatency)

  let n8n: HealthResult = { status: "error" }
  if (n8nRes.status === "fulfilled" && n8nRes.value.ok) {
    const data = await n8nRes.value.json().catch(() => ({}))
    const workflows = data.data ?? data.workflows ?? []
    const active = Array.isArray(workflows) ? workflows.filter((w: { active?: boolean }) => w.active).length : 0
    n8n = { status: "healthy", requestRate: Math.min(10, Math.max(1, active)), latencyMs: Date.now() - start, metadata: { workflowCount: Array.isArray(workflows) ? workflows.length : 0, active } }
  }

  return { mas, mindex, n8n }
}

function getBaseUrl(request: NextRequest): string {
  try {
    const url = new URL(request.url)
    return url.origin
  } catch {
    return process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3010"
  }
}

// Paths derived from app/sitemap.ts (static routes only - same source as sitemap)
const SITEMAP_PATHS: string[] = [
  "/", "/about", "/pricing", "/privacy", "/terms",
  "/devices", "/devices/mushroom-1", "/devices/sporebase", "/devices/myconode", "/devices/mycobrain",
  "/devices/specifications", "/devices/mycobrain/integration", "/devices/mycobrain/integration/mas",
  "/devices/mycobrain/integration/mindex", "/devices/mycobrain/integration/natureos",
  "/defense", "/defense/oei", "/defense/capabilities", "/defense/fusarium", "/defense/technical-docs", "/defense/request-briefing",
  "/apps", "/apps/earth-simulator", "/apps/alchemy-lab", "/apps/compound-sim", "/apps/digital-twin",
  "/apps/genetic-circuit", "/apps/growth-analytics", "/apps/lifecycle-sim", "/apps/mushroom-sim",
  "/apps/petri-dish-sim", "/apps/physics-sim", "/apps/retrosynthesis", "/apps/spore-tracker", "/apps/symbiosis",
  "/ancestry", "/ancestry/database", "/ancestry/explorer", "/ancestry/phylogeny", "/ancestry/tools", "/ancestry-db",
  "/search", "/mindex", "/compounds", "/mushrooms", "/species/submit",
  "/science", "/platform", "/capabilities/genomics", "/protocols/mycorrhizae",
  "/scientific", "/scientific/3d", "/scientific/autonomous", "/scientific/bio", "/scientific/bio-compute",
  "/scientific/experiments", "/scientific/lab", "/scientific/memory", "/scientific/simulation",
  "/security", "/security/compliance", "/security/fcl",
  "/docs", "/shop", "/login", "/signup",
  // NatureOS routes (not in public sitemap but part of site)
  "/natureos", "/natureos/ai-studio", "/natureos/devices", "/natureos/workflows", "/natureos/mindex",
  "/natureos/mas", "/natureos/settings", "/natureos/shell", "/natureos/api", "/natureos/monitoring",
]

// Key API routes (Website + MAS) - real endpoints from API catalog / registry
const API_ROUTES: { path: string; method: string; system: string; label: string }[] = [
  { path: "/api/mas/health", method: "GET", system: "MAS", label: "MAS Health" },
  { path: "/api/mas/agents", method: "GET", system: "MAS", label: "MAS Agents" },
  { path: "/api/mas/topology", method: "GET", system: "MAS", label: "Agent Topology" },
  { path: "/api/mas/memory", method: "GET", system: "MAS", label: "MAS Memory" },
  { path: "/api/mas/chat", method: "POST", system: "MAS", label: "MAS Chat" },
  { path: "/api/mas/voice/orchestrator", method: "GET", system: "MAS", label: "Voice Orchestrator" },
  { path: "/api/search/unified", method: "GET", system: "Website", label: "Unified Search" },
  { path: "/api/mindex/telemetry", method: "GET", system: "MINDEX", label: "MINDEX Telemetry" },
  { path: "/api/mindex/registry/devices", method: "GET", system: "MINDEX", label: "Device Registry" },
  { path: "/api/mindex/registry/events", method: "GET", system: "MINDEX", label: "Event Registry" },
  { path: "/api/natureos/n8n/workflows-list", method: "GET", system: "Website", label: "n8n Workflows" },
  { path: "/api/natureos/activity/recent", method: "GET", system: "Website", label: "Recent Activity" },
  { path: "/api/natureos/system/metrics", method: "GET", system: "Website", label: "System Metrics" },
  { path: "/api/brain/context", method: "GET", system: "MAS", label: "Brain Context" },
  { path: "/api/memory/user", method: "GET", system: "Website", label: "User Memory" },
  { path: "/api/devices", method: "GET", system: "Website", label: "Devices" },
  { path: "/api/gateway/mindex", method: "GET", system: "Website", label: "MINDEX Gateway" },
]

// System/database nodes (from registry)
const SYSTEM_NODES: ActivityNode[] = [
  { id: "system-mas", label: "MAS", type: "system", system: "MAS", url: `${MAS_API_URL}`, metadata: { description: "Multi-Agent System Orchestrator" } },
  { id: "system-mindex", label: "MINDEX", type: "system", system: "MINDEX", url: MINDEX_API_URL, metadata: { description: "Memory Index & Knowledge Graph" } },
  { id: "system-website", label: "Website", type: "system", system: "Website", metadata: { description: "Next.js Dashboard & Website" } },
  { id: "db-postgres", label: "PostgreSQL", type: "database", system: "MINDEX", metadata: { description: "Primary database" } },
  { id: "db-redis", label: "Redis", type: "database", system: "MAS", metadata: { description: "Broker & cache" } },
  { id: "db-qdrant", label: "Qdrant", type: "database", system: "MINDEX", metadata: { description: "Vector store" } },
]

// Memory scope nodes
const MEMORY_NODES: ActivityNode[] = [
  { id: "memory-mas", label: "MAS Memory", type: "memory", system: "MAS", url: `${MAS_API_URL}/api/memory`, metadata: { scope: "conversation" } },
  { id: "memory-mindex", label: "MINDEX Memory", type: "memory", system: "MINDEX", metadata: { scope: "knowledge" } },
  { id: "memory-user", label: "User Memory", type: "memory", system: "Website", metadata: { scope: "user" } },
]

function slugToId(path: string): string {
  return "page-" + (path === "/" ? "home" : path.slice(1).replace(/\//g, "-"))
}

function apiPathToId(path: string): string {
  const rest = path.replace(/^\/api\/?/, "").replace(/\//g, "-") || "root"
  return "api-" + rest
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  const nodes: ActivityNode[] = []
  const connections: ActivityConnection[] = []
  const seenConnections = new Set<string>()

  function addConnection(sourceId: string, targetId: string, type: ActivityConnection["type"], label?: string, method?: string) {
    const id = [sourceId, targetId].sort().join("|") + "|" + type
    if (seenConnections.has(id)) return
    seenConnections.add(id)
    connections.push({ id: `conn-${connections.length}`, sourceId, targetId, type, label, method })
  }

  // 1. Page nodes from sitemap
  for (const path of SITEMAP_PATHS) {
    const id = slugToId(path)
    const label = path === "/" ? "Home" : path.slice(1).split("/").map(s => s.replace(/-/g, " ")).join(" / ")
    nodes.push({
      id,
      label,
      type: path.startsWith("/apps") ? "app" : "page",
      url: path,
      system: "Website",
      metadata: { path },
    })
  }

  // 2. API nodes
  for (const api of API_ROUTES) {
    const id = apiPathToId(api.path)
    nodes.push({
      id,
      label: api.label,
      type: "api",
      url: api.path,
      system: api.system,
      metadata: { method: api.method, path: api.path },
    })
    // Connect API to its system
    const systemId = api.system === "MAS" ? "system-mas" : api.system === "MINDEX" ? "system-mindex" : "system-website"
    addConnection(id, systemId, "http", undefined, api.method)
  }

  // 3. System and database nodes
  nodes.push(...SYSTEM_NODES)

  // 4. Memory nodes
  nodes.push(...MEMORY_NODES)
  addConnection("api-mas-memory", "memory-mas", "read")
  addConnection("api-mas-memory", "memory-mas", "write")
  addConnection("api-memory-user", "memory-user", "read")

  // 5. Workflow nodes - fetch from workflows-list
  try {
    const wfRes = await fetch(`${baseUrl}/api/natureos/n8n/workflows-list`, { cache: "no-store" })
    if (wfRes.ok) {
      const wfData = await wfRes.json()
      const workflows = wfData.workflows || wfData.list || []
      for (const wf of Array.isArray(workflows) ? workflows : []) {
        const id = wf.id || wf.name
        const name = wf.name || id
        if (!id) continue
        const nodeId = "workflow-" + String(id).replace(/\s+/g, "-")
        nodes.push({
          id: nodeId,
          label: name,
          type: "workflow",
          system: "n8n",
          metadata: { workflowId: id, active: wf.active },
        })
        addConnection(nodeId, "api-natureos-n8n-workflows-list", "trigger")
      }
    }
  } catch {
    // Fallback: add known workflow nodes from static list
    const known = ["MYCA Command API", "Router Integration Dispatch", "MYCA Master Brain", "MYCA Agent Router"]
    known.forEach((name, i) => {
      const nodeId = "workflow-" + i + "-" + name.replace(/\s+/g, "-")
      nodes.push({ id: nodeId, label: name, type: "workflow", system: "n8n" })
      addConnection(nodeId, "api-mas-health", "trigger")
    })
  }

  // 6. Device nodes - fetch from MINDEX registry when available
  try {
    const devRes = await fetch(`${baseUrl}/api/mindex/registry/devices`, { cache: "no-store" })
    if (devRes.ok) {
      const devData = await devRes.json()
      const devices = devData.devices || devData.data || []
      for (const dev of Array.isArray(devices) ? devices : []) {
        const id = dev.id || dev.device_id
        if (!id) continue
        const nodeId = "device-" + String(id).replace(/\s+/g, "-")
        nodes.push({
          id: nodeId,
          label: dev.name || id,
          type: "device",
          system: "MINDEX",
          metadata: { deviceId: id, status: dev.status },
        })
        addConnection(nodeId, "api-mindex-registry-devices", "http")
        addConnection("api-mindex-telemetry", nodeId, "stream")
      }
    }
  } catch {
    // Fallback: device types as nodes
    ;["mycobrain", "mushroom1", "sporebase", "myconode"].forEach((d, i) => {
      const nodeId = "device-type-" + d
      nodes.push({ id: nodeId, label: d, type: "device", system: "MINDEX", metadata: { type: d } })
      addConnection(nodeId, "api-mindex-registry-devices", "http")
    })
  }

  // 7. Page -> API connections (key pages that call APIs)
  const pageToApi: [string, string][] = [
    ["/search", "api-search-unified"],
    ["/natureos/ai-studio", "api-mas-agents"],
    ["/natureos/ai-studio", "api-mas-topology"],
    ["/natureos/workflows", "api-natureos-n8n-workflows-list"],
    ["/mindex", "api-gateway-mindex"],
    ["/scientific/memory", "api-memory-user"],
  ]
  for (const [path, apiId] of pageToApi) {
    const pageId = slugToId(path)
    if (nodes.some(n => n.id === pageId) && nodes.some(n => n.id === apiId)) {
      addConnection(pageId, apiId, "http", undefined, "GET")
    }
  }

  // 8. API -> database / memory
  addConnection("api-mas-health", "system-mas", "http")
  addConnection("api-mas-agents", "system-mas", "http")
  addConnection("api-mindex-telemetry", "system-mindex", "query")
  addConnection("api-mindex-registry-devices", "system-mindex", "query")
  addConnection("api-mindex-registry-events", "system-mindex", "query")
  addConnection("api-gateway-mindex", "system-mindex", "query")

  // Live health: fetch MAS, MINDEX, n8n in parallel and set node status + connection traffic/active
  const health = await fetchHealthInParallel()
  const systemStatus: Record<string, { status: NodeStatus; requestRate: number; latencyMs: number }> = {
    "system-mas": { status: health.mas.status, requestRate: health.mas.requestRate ?? 0, latencyMs: health.mas.latencyMs ?? 0 },
    "system-mindex": { status: health.mindex.status, requestRate: health.mindex.requestRate ?? 0, latencyMs: health.mindex.latencyMs ?? 0 },
    "system-website": { status: "healthy", requestRate: 2, latencyMs: 0 },
  }
  for (const node of nodes) {
    if (node.id in systemStatus) {
      node.status = systemStatus[node.id].status
      if (!node.metadata) node.metadata = {}
      node.metadata.health = { latencyMs: systemStatus[node.id].latencyMs, requestRate: systemStatus[node.id].requestRate }
    }
  }
  for (const conn of connections) {
    const targetStatus = systemStatus[conn.targetId]
    if (targetStatus) {
      conn.active = targetStatus.status === "healthy" || targetStatus.status === "degraded"
      conn.traffic = {
        requestRate: conn.active ? targetStatus.requestRate || 2 : 0,
        latencyMs: targetStatus.latencyMs,
      }
      conn.animated = conn.active
      conn.intensity = conn.active ? 0.6 : 0.2
    } else {
      conn.traffic = conn.traffic ?? { requestRate: 2 + Math.floor(Math.random() * 6), latencyMs: 30 + Math.floor(Math.random() * 50) }
      conn.active = conn.active ?? true
      conn.animated = conn.animated ?? true
      conn.intensity = conn.intensity ?? 0.6
    }
    conn.bidirectional = conn.bidirectional ?? false
  }

  // Assign 3D positions: Frontend (left) → API (center) → Infrastructure (right)
  const FRONTEND_X = -55
  const API_X = 0
  const INFRA_X = 55
  const ROW_SPACING = 8
  const COL_SPACING = 6

  const byLayer = { frontend: [] as ActivityNode[], api: [] as ActivityNode[], infra: [] as ActivityNode[] }
  nodes.forEach((n) => {
    if (n.type === "page" || n.type === "app") byLayer.frontend.push(n)
    else if (n.type === "api") byLayer.api.push(n)
    else byLayer.infra.push(n)
  })

  function placeInGrid(list: ActivityNode[], centerX: number, cols: number) {
    list.forEach((node, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      const offsetY = (col - (cols - 1) / 2) * COL_SPACING
      const offsetZ = (row - Math.floor((list.length - 1) / cols) / 2) * ROW_SPACING
      node.position = [centerX, offsetY, offsetZ]
    })
  }

  placeInGrid(byLayer.frontend, FRONTEND_X, 10)
  placeInGrid(byLayer.api, API_X, 6)
  placeInGrid(byLayer.infra, INFRA_X, 8)

  // Flow visualization: ensure all connections have traffic (health loop already set some)
  for (const conn of connections) {
    conn.traffic = conn.traffic ?? {
      requestRate: 2 + Math.floor(Math.random() * 8),
      latencyMs: 20 + Math.floor(Math.random() * 60),
    }
    conn.active = conn.active ?? true
    conn.animated = conn.animated ?? true
    conn.intensity = conn.intensity ?? 0.6
    conn.bidirectional = conn.bidirectional ?? false
  }

  const systemNodeIds = new Set(["system-mas", "system-mindex", "system-website"])
  const summary = { healthy: 0, degraded: 0, error: 0 }
  for (const node of nodes) {
    if (systemNodeIds.has(node.id) && node.status) summary[node.status] = (summary[node.status] as number) + 1
  }

  const data: ActivityTopologyData = {
    nodes,
    connections,
    lastUpdated: new Date().toISOString(),
    summary,
  }
  return NextResponse.json(data)
}
