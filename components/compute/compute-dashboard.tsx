"use client"

import { useCallback, useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Server } from "lucide-react"

interface FleetSnapshot {
  generated_at?: string
  schema_version?: number
  legions?: Record<string, unknown>
  auxiliary_nodes?: unknown[]
  vm_http_checks?: unknown[]
  unifi?: Record<string, unknown>
  nas?: Record<string, unknown>
  aws?: Record<string, unknown>
  proxmox?: Record<string, unknown>
  local_orchestrator_gpu?: Record<string, unknown> | null
  error?: string
}

const POLL_MS = 15_000

interface ComputeDashboardProps {
  /** Same-origin API route (proxies MAS). */
  apiPath?: string
  heading?: string
  subheading?: string
  /** Auto-refresh interval in ms; 0 disables. */
  pollIntervalMs?: number
}

export function ComputeDashboard({
  apiPath = "/api/compute/snapshot",
  heading = "Compute",
  subheading = "Live LAN GPUs, VM/service HTTP checks, UniFi, NAS, optional AWS — from MAS",
  pollIntervalMs = POLL_MS,
}: ComputeDashboardProps) {
  const [data, setData] = useState<FleetSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(apiPath, { cache: "no-store" })
      const json = (await res.json()) as FleetSnapshot & { error?: string }
      if (!res.ok) {
        setErr(json.error || `HTTP ${res.status}`)
        setData(null)
        return
      }
      setData(json)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return
    const t = setInterval(() => void load(), pollIntervalMs)
    return () => clearInterval(t)
  }, [load, pollIntervalMs])

  return (
    <DashboardShell>
      <DashboardHeader heading={heading} text={subheading} />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground sm:max-w-2xl">
              API: <code className="text-xs">GET {apiPath}</code>
              {" · "}
              MAS: <code className="text-xs">/api/compute-fleet/snapshot</code>
              {pollIntervalMs > 0 ? (
                <span className="block sm:inline sm:before:content-['·_']">
                  Auto-refresh every {Math.round(pollIntervalMs / 1000)}s
                </span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full min-w-[44px] sm:w-auto"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh compute snapshot"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {err ? (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">No fleet data</CardTitle>
              <CardDescription>{err}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Point <code className="text-xs">MAS_API_URL</code> at your orchestrator (e.g.{" "}
              <code className="text-xs">http://192.168.0.188:8001</code>) and deploy the compute-fleet router on MAS.
            </CardContent>
          </Card>
        ) : null}

        {data?.generated_at ? (
          <p className="text-sm text-muted-foreground">
            Snapshot: {data.generated_at}
            {data.schema_version != null ? ` · schema v${data.schema_version}` : ""}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legion 4080 nodes</CardTitle>
              <CardDescription>Voice + Earth-2 (SSH + HTTP service health)</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[420px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data ? "Loading…" : JSON.stringify(data?.legions ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auxiliary SSH nodes</CardTitle>
              <CardDescription>GTX 1090 Ti, RTX 5090, etc. via COMPUTE_FLEET_AUX_NODES on MAS</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[420px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data
                  ? "Loading…"
                  : JSON.stringify(data?.auxiliary_nodes ?? [], null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">VMs &amp; services</CardTitle>
              <CardDescription>
                MAS, MINDEX, Sandbox, MYCA, n8n, Ollama, Prometheus + COMPUTE_FLEET_EXTRA_CHECKS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[360px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data
                  ? "Loading…"
                  : JSON.stringify(data?.vm_http_checks ?? [], null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">UniFi / Dream Machine</CardTitle>
              <CardDescription>Controller summary (Vault-backed on MAS)</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[320px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data ? "Loading…" : JSON.stringify(data?.unifi ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">NAS</CardTitle>
              <CardDescription>Mount status from MAS host</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[240px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data ? "Loading…" : JSON.stringify(data?.nas ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AWS</CardTitle>
              <CardDescription>Optional EC2 (boto3 + credentials on MAS)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.aws?.configured === false ? (
                <Badge variant="secondary">Not configured</Badge>
              ) : null}
              <pre className="max-h-[280px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data ? "Loading…" : JSON.stringify(data?.aws ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Proxmox &amp; local GPU</CardTitle>
              <CardDescription>
                Proxmox: COMPUTE_FLEET_INCLUDE_PROXMOX=1. Local nvidia-smi: COMPUTE_FLEET_LOCAL_NVIDIA=1.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[200px] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                {loading && !data
                  ? "Loading…"
                  : JSON.stringify(
                      { proxmox: data?.proxmox, local_orchestrator_gpu: data?.local_orchestrator_gpu },
                      null,
                      2
                    )}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
