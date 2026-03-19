"use client"

/**
 * MYCA2 PSILO operator surface — real MAS/MINDEX data only (Mar 17, 2026).
 */

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Play, Square, Skull, Plus, RefreshCw } from "lucide-react"

interface SessionState {
  session_id?: string
  status?: string
  overlay_edges?: unknown[]
  metrics?: Record<string, unknown>
  dose_profile?: Record<string, unknown>
  phase_profile?: Record<string, unknown>
  integration_report?: unknown
}

export function Myca2PsiloPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [dose, setDose] = useState("1.0")
  const [phase, setPhase] = useState("explore")
  const [edgeLabel, setEdgeLabel] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/mas/myca2-psilo/session/${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j.detail || j.error || `HTTP ${r.status}`)
        setSession(null)
      } else {
        setSession(j)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const startSession = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/api/mas/myca2-psilo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dose_profile: { level: parseFloat(dose) || 0, unit: "normalized" },
          phase_profile: { phase },
        }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j.detail || JSON.stringify(j))
        return
      }
      const id = j.session_id as string
      setSessionId(id)
      const rr = await fetch(`/api/mas/myca2-psilo/session/${encodeURIComponent(id)}`, {
        cache: "no-store",
      })
      const sj = await rr.json()
      if (rr.ok) setSession(sj)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const stopSession = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      await fetch(`/api/mas/myca2-psilo/session/${encodeURIComponent(sessionId)}/stop`, {
        method: "POST",
      })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const killSession = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      await fetch(`/api/mas/myca2-psilo/session/${encodeURIComponent(sessionId)}/kill`, {
        method: "POST",
      })
      setSessionId(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  const addEdge = async () => {
    if (!sessionId || !edgeLabel.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`/api/mas/myca2-psilo/session/${encodeURIComponent(sessionId)}/edge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edge: { label: edgeLabel.trim(), domain: "cross" } }),
      })
      if (r.ok) {
        setEdgeLabel("")
        await refresh()
      } else {
        const j = await r.json().catch(() => ({}))
        setError(j.detail || "edge failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const edges = Array.isArray(session?.overlay_edges) ? session.overlay_edges : []
  const metrics = session?.metrics || {}
  const dmn =
    typeof metrics.dmn_dominance === "number"
      ? metrics.dmn_dominance
      : typeof metrics.cross_domain_ratio === "number"
        ? 1 - (metrics.cross_domain_ratio as number)
        : null

  return (
    <Card className="border-violet-500/30 bg-violet-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-violet-400" />
          MYCA2 PSILO
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Sandbox neuroplasticity control. Data from MAS → MINDEX only. Production MYCA aliases are
          gated separately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!sessionId ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="psilo-dose" className="text-base">
                Dose (normalized)
              </Label>
              <Input
                id="psilo-dose"
                type="text"
                inputMode="decimal"
                className="text-base min-h-12"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="psilo-phase" className="text-base">
                Phase profile
              </Label>
              <Input
                id="psilo-phase"
                className="text-base min-h-12"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="min-h-12 w-full min-w-[44px] touch-manipulation sm:w-auto"
              onClick={startSession}
              disabled={loading}
            >
              <Play className="mr-2 h-4 w-4" />
              Start session
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {sessionId}
              </Badge>
              <Badge variant={session?.status === "active" ? "default" : "secondary"}>
                {session?.status || "…"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Overlay edges</span>
                <p className="font-medium">{edges.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">DMN / cross-domain</span>
                <p className="font-medium">
                  {dmn != null ? `${(dmn * 100).toFixed(0)}% est. DMN` : "— (refresh after executive turn)"}
                </p>
              </div>
            </div>

            {edges.length > 0 && (
              <ul className="max-h-24 overflow-y-auto rounded border border-border/50 p-2 text-xs">
                {edges.map((e: unknown, i: number) => (
                  <li key={i} className="truncate">
                    {typeof e === "object" && e !== null && "label" in e
                      ? String((e as { label?: string }).label)
                      : JSON.stringify(e)}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Edge label"
                className="text-base min-h-12 flex-1"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-12"
                onClick={addEdge}
                disabled={loading || !edgeLabel.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add edge
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={stopSession}
                disabled={loading}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-12"
                onClick={killSession}
                disabled={loading}
              >
                <Skull className="mr-2 h-4 w-4" />
                Kill
              </Button>
            </div>

            {session?.integration_report != null && (
              <pre className="max-h-32 overflow-auto rounded bg-muted/30 p-2 text-xs">
                {JSON.stringify(session.integration_report, null, 2)}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
