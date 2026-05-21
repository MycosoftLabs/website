"use client"

/**
 * AI Studio Mesh tab — agent coordination, channel health, API explorer.
 * Real data only via BFF proxies. Date: May 19, 2026
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot,
  CheckCircle,
  Code,
  Inbox,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Send,
  Users,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { DESKTOP_MESH_AGENT_IDS } from "@/lib/myca/desktop-mesh-agents"

const AGENT_LABELS: Record<string, string> = {
  cursor: "Cursor",
  "claude-desktop": "Claude Desktop",
  codex: "Codex",
  myca: "MYCA (Desktop)",
  "human-morgan": "Morgan (Human)",
  chatgpt: "ChatGPT",
  "perplexity-computer": "Perplexity Computer",
}

type AnyRecord = Record<string, unknown>

interface MeshApiEndpoint {
  method: "GET" | "POST"
  path: string
  description: string
  bodySchema?: string
}

const MESH_API_ENDPOINTS: MeshApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/myca/coordination/status",
    description: "Desktop mesh agent status board (via MAS bridge)",
  },
  {
    method: "GET",
    path: "/api/myca/coordination/inbox",
    description: "Recent coordination messages and handoffs",
  },
  {
    method: "GET",
    path: "/api/myca/capabilities",
    description: "Machine-readable MYCA capability catalog",
  },
  {
    method: "GET",
    path: "/api/myca/openapi",
    description: "OpenAPI spec for external tool configuration",
  },
  {
    method: "GET",
    path: "/api/myca/connectivity",
    description: "MAS / orchestrator / channel connectivity checks",
  },
  {
    method: "GET",
    path: "/api/mas/agents",
    description: "MAS agent registry with live status when available",
  },
  {
    method: "POST",
    path: "/api/myca/coordination/message",
    description: "Post message to desktop mesh (owner/superuser)",
    bodySchema: `{
  "to": "all",
  "message": "Broadcast from MYCA App",
  "tags": ["broadcast", "myca-app"]
}`,
  },
]

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function time(value: unknown): string {
  const raw = text(value)
  if (!raw) return ""
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

const stateBadge: Record<string, string> = {
  idle: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  working: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  waiting: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  done: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  unknown: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
}

export function MeshTab() {
  const [coordStatus, setCoordStatus] = useState<AnyRecord | null>(null)
  const [coordInbox, setCoordInbox] = useState<AnyRecord | null>(null)
  const [masAgents, setMasAgents] = useState<AnyRecord | null>(null)
  const [connectivity, setConnectivity] = useState<AnyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [broadcastText, setBroadcastText] = useState("")
  const [posting, setPosting] = useState(false)
  const [postResult, setPostResult] = useState<string | null>(null)

  const [selectedEndpoint, setSelectedEndpoint] = useState<MeshApiEndpoint | null>(MESH_API_ENDPOINTS[0])
  const [apiResponse, setApiResponse] = useState("")
  const [apiStatus, setApiStatus] = useState<number | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [requestBody, setRequestBody] = useState(MESH_API_ENDPOINTS[6]?.bodySchema || "")

  const loadMeshData = useCallback(async () => {
    setLoading(true)
    const nextErrors: string[] = []

    const [statusRes, inboxRes, agentsRes, connRes] = await Promise.all([
      fetch("/api/myca/coordination/status", { cache: "no-store" }),
      fetch("/api/myca/coordination/inbox", { cache: "no-store" }),
      fetch("/api/mas/agents", { cache: "no-store" }),
      fetch("/api/myca/connectivity", { cache: "no-store" }),
    ])

    if (statusRes.ok) {
      setCoordStatus(await statusRes.json().catch(() => null))
    } else {
      setCoordStatus(null)
      nextErrors.push(`coordination/status: HTTP ${statusRes.status}`)
    }

    if (inboxRes.ok) {
      setCoordInbox(await inboxRes.json().catch(() => null))
    } else {
      setCoordInbox(null)
      nextErrors.push(`coordination/inbox: HTTP ${inboxRes.status}`)
    }

    if (agentsRes.ok) {
      setMasAgents(await agentsRes.json().catch(() => null))
    } else {
      setMasAgents(null)
      nextErrors.push(`mas/agents: HTTP ${agentsRes.status}`)
    }

    if (connRes.ok) {
      setConnectivity(await connRes.json().catch(() => null))
    } else {
      setConnectivity(null)
      nextErrors.push(`connectivity: HTTP ${connRes.status}`)
    }

    setErrors(nextErrors)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMeshData()
    const id = window.setInterval(loadMeshData, 15000)
    return () => window.clearInterval(id)
  }, [loadMeshData])

  const latestByAgent = useMemo(() => {
    const fromStatus =
      (coordStatus?.latest_status_by_agent as Record<string, AnyRecord>) ||
      (coordStatus?.agents as Record<string, AnyRecord>) ||
      {}
    return fromStatus
  }, [coordStatus])

  const meshAgentRows = useMemo(() => {
    return DESKTOP_MESH_AGENT_IDS.map((id) => {
      const record = latestByAgent[id] || {}
      const state = text(record.state, "unknown")
      return {
        id,
        label: AGENT_LABELS[id] || id,
        state,
        summary: text(record.summary) || text(record.message),
        updatedAt: time(record.updated_at || record.timestamp),
      }
    })
  }, [latestByAgent])

  const inboxMessages = useMemo(() => {
    const raw =
      (Array.isArray(coordInbox?.messages) && coordInbox.messages) ||
      (Array.isArray(coordInbox?.items) && coordInbox.items) ||
      []
    return raw.slice(0, 40)
  }, [coordInbox])

  const masAgentCount = useMemo(() => {
    const agents = masAgents?.agents
    return Array.isArray(agents) ? agents.length : 0
  }, [masAgents])

  const postBroadcast = async () => {
    const message = broadcastText.trim()
    if (!message) return
    setPosting(true)
    setPostResult(null)
    try {
      const res = await fetch("/api/myca/coordination/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "all",
          message,
          tags: ["broadcast", "myca-app", "ai-studio"],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPostResult(text(data.error, `Failed: HTTP ${res.status}`))
      } else {
        setPostResult("Message posted to coordination mesh.")
        setBroadcastText("")
        await loadMeshData()
      }
    } catch (e) {
      setPostResult(e instanceof Error ? e.message : "Post failed")
    } finally {
      setPosting(false)
    }
  }

  const testApiEndpoint = async (endpoint: MeshApiEndpoint) => {
    setApiLoading(true)
    setApiResponse("")
    setApiStatus(null)
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
      if (endpoint.method === "POST" && requestBody.trim()) {
        options.body = requestBody
      }
      const res = await fetch(endpoint.path, options)
      setApiStatus(res.status)
      const textBody = await res.text()
      try {
        setApiResponse(JSON.stringify(JSON.parse(textBody), null, 2))
      } catch {
        setApiResponse(textBody)
      }
    } catch (e) {
      setApiResponse(e instanceof Error ? e.message : "Request failed")
      setApiStatus(500)
    } finally {
      setApiLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Agent Mesh
          </h2>
          <p className="text-sm text-muted-foreground">
            Desktop coordination, MAS agents, and channel health — live from upstream APIs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMeshData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {errors.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Some upstream sources are unavailable</p>
              <ul className="mt-1 list-disc list-inside text-amber-200/80 text-xs">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agent Status Board
            </CardTitle>
            <CardDescription>
              Desktop mesh ({meshAgentRows.filter((r) => r.state !== "unknown").length}/
              {DESKTOP_MESH_AGENT_IDS.length} reporting) · MAS registry {masAgentCount} agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !coordStatus ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading coordination status…
              </p>
            ) : meshAgentRows.every((r) => r.state === "unknown" && !r.summary) ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                No desktop mesh status yet. Ensure MAS coordination bridge is running and agents have
                posted update_status.
              </p>
            ) : (
              <ScrollArea className="h-[280px] pr-3">
                <div className="space-y-2">
                  {meshAgentRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-muted/30"
                    >
                      <div>
                        <div className="font-medium text-sm">{row.label}</div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {row.summary || "No status summary"}
                        </p>
                        {row.updatedAt && (
                          <p className="text-[10px] text-muted-foreground mt-1">{row.updatedAt}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={stateBadge[row.state] || stateBadge.unknown}>
                        {row.state}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Message Feed
            </CardTitle>
            <CardDescription>Recent handoffs and broadcasts from coordination inbox</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !coordInbox ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading inbox…
              </p>
            ) : inboxMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                Inbox empty or coordination bridge unavailable.
              </p>
            ) : (
              <ScrollArea className="h-[280px] pr-3">
                <div className="space-y-2">
                  {inboxMessages.map((msg, i) => (
                    <div key={text(msg.id, `msg-${i}`)} className="rounded-lg border p-3 text-sm bg-muted/20">
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground mb-1">
                        <span>
                          {text(msg.from)} → {text(msg.to, "all")}
                        </span>
                        <span>{time(msg.timestamp || msg.created_at)}</span>
                      </div>
                      <p className="text-sm">{text(msg.message) || text(msg.body) || JSON.stringify(msg)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Channel Health
            </CardTitle>
            <CardDescription>From /api/myca/connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!connectivity ? (
              <p className="text-sm text-muted-foreground">Connectivity data unavailable.</p>
            ) : (
              <>
                <p className="text-sm">{text(connectivity.summary, "No summary")}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["MAS", connectivity.mas],
                      ["Consciousness", connectivity.mas_consciousness],
                      ["Route mounts", connectivity.mas_route_mounts],
                      ["LLM keys", connectivity.llm_keys],
                    ] as const
                  ).map(([label, check]) => {
                    const ok = (check as AnyRecord)?.ok === true
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-2 rounded border px-2 py-2 bg-muted/30"
                      >
                        {ok ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Quick Actions
            </CardTitle>
            <CardDescription>Post to all desktop agents (owner/superuser)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Broadcast message to all mesh agents…"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              rows={4}
            />
            <Button onClick={postBroadcast} disabled={posting || !broadcastText.trim()} className="w-full">
              {posting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Post to all agents
            </Button>
            {postResult && <p className="text-xs text-muted-foreground">{postResult}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            MYCA API Explorer
          </CardTitle>
          <CardDescription>Test Mesh-related BFF routes in-app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ScrollArea className="h-[320px] border rounded-lg">
              <div className="p-2 space-y-1">
                {MESH_API_ENDPOINTS.map((ep) => (
                  <button
                    key={ep.path + ep.method}
                    type="button"
                    onClick={() => {
                      setSelectedEndpoint(ep)
                      if (ep.bodySchema) setRequestBody(ep.bodySchema)
                    }}
                    className={`w-full text-left rounded-md px-2 py-2 text-xs transition-colors ${
                      selectedEndpoint?.path === ep.path
                        ? "bg-primary/15 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Badge variant="outline" className="mr-2 text-[10px]">
                      {ep.method}
                    </Badge>
                    <span className="font-mono">{ep.path}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="lg:col-span-2 space-y-3">
              {selectedEndpoint && (
                <>
                  <p className="text-sm text-muted-foreground">{selectedEndpoint.description}</p>
                  {selectedEndpoint.method === "POST" && (
                    <Textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="font-mono text-xs min-h-[100px]"
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => testApiEndpoint(selectedEndpoint)}
                    disabled={apiLoading}
                  >
                    {apiLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run request
                  </Button>
                  {apiStatus !== null && (
                    <Badge variant={apiStatus < 400 ? "default" : "destructive"}>HTTP {apiStatus}</Badge>
                  )}
                  <pre className="text-xs bg-muted/50 border rounded-lg p-3 max-h-[200px] overflow-auto font-mono">
                    {apiResponse || "—"}
                  </pre>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
