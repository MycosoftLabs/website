"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Bitcoin, CheckCircle2, Copy, Hash, Loader2, Network, Shield, TriangleAlert, RefreshCw, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Ledger = "hypergraph" | "solana" | "bitcoin"

interface LedgerStatusResponse {
  hypergraph: {
    connected: boolean
    node_url: string
    status: string
    dag_height?: number
  }
  solana: {
    connected: boolean
    network: string
    rpc_url: string
    slot: number
    block_height: number
    health: string
    estimated_fee_sol: number
  }
  bitcoin: {
    connected: boolean
    network: string
    api_url: string
    block_height: number
    mempool_size: number
    fee_rates: {
      fastest: number
      half_hour: number
      hour: number
      economy: number
    }
  }
  last_updated: string
}

interface AnchorResult {
  ok: boolean
  ledger: Ledger
  tx_id?: string
  message?: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function normalizeIds(value: string): string[] {
  return value
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function explorerLink(ledger: Ledger, txId: string): string | null {
  if (!txId) return null
  if (ledger === "solana") return `https://explorer.solana.com/tx/${encodeURIComponent(txId)}`
  if (ledger === "bitcoin") return `https://mempool.space/tx/${encodeURIComponent(txId)}`
  // Hypergraph explorer is org-specific; keep null unless you define one.
  return null
}

export function LedgerPanel({ className }: { className?: string }) {
  // Use the new ledger status endpoint for real data
  const { data: ledgerStatus, isLoading: isLoadingStatus, mutate } = useSWR<LedgerStatusResponse>(
    "/api/natureos/mindex/ledger",
    fetcher,
    { refreshInterval: 30_000 }
  )

  const [ledger, setLedger] = useState<Ledger>("solana")
  const [recordIdsInput, setRecordIdsInput] = useState("")
  const [isAnchoring, setIsAnchoring] = useState(false)
  const [result, setResult] = useState<AnchorResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mindex:lastAnchor")
      if (stored) setResult(JSON.parse(stored) as AnchorResult)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!result) return
    try {
      localStorage.setItem("mindex:lastAnchor", JSON.stringify(result))
    } catch {
      // ignore
    }
  }, [result])

  const ids = useMemo(() => normalizeIds(recordIdsInput), [recordIdsInput])
  
  // Check if each ledger is configured based on real connection status
  const configured = useMemo(() => {
    if (!ledgerStatus) return false
    if (ledger === "hypergraph") return ledgerStatus.hypergraph?.connected
    if (ledger === "solana") return ledgerStatus.solana?.connected
    if (ledger === "bitcoin") return ledgerStatus.bitcoin?.connected
    return false
  }, [ledgerStatus, ledger])

  async function anchor() {
    setError(null)
    setResult(null)

    if (!ids.length) {
      setError("Enter one or more record IDs.")
      return
    }

    setIsAnchoring(true)
    try {
      const res = await fetch("/api/mindex/anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_ids: ids, ledger }),
      })
      const data = (await res.json()) as AnchorResult
      if (!res.ok || !data.ok) throw new Error(data?.message || "Anchor failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsAnchoring(false)
    }
  }

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-purple-400" />
          Ledger Anchoring
        </CardTitle>
        <CardDescription>Anchor MINDEX integrity records to Hypergraph, Solana, or Bitcoin (Ordinals).</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Last updated: {ledgerStatus?.last_updated ? new Date(ledgerStatus.last_updated).toLocaleTimeString() : "—"}
          </span>
          <Button size="sm" variant="ghost" onClick={() => mutate()}>
            <RefreshCw className={cn("h-4 w-4", isLoadingStatus && "animate-spin")} />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <LedgerStatusCard
            title="Hypergraph DAG"
            icon={Network}
            connected={ledgerStatus?.hypergraph?.connected}
            loading={isLoadingStatus}
            detail={ledgerStatus?.hypergraph?.dag_height ? `Height: ${ledgerStatus.hypergraph.dag_height}` : ledgerStatus?.hypergraph?.status}
          />
          <LedgerStatusCard
            title="Solana"
            icon={Shield}
            connected={ledgerStatus?.solana?.connected}
            loading={isLoadingStatus}
            detail={ledgerStatus?.solana?.connected 
              ? `Block: ${ledgerStatus.solana.block_height?.toLocaleString()} • Fee: ${ledgerStatus.solana.estimated_fee_sol?.toFixed(6)} SOL`
              : ledgerStatus?.solana?.health || "Not connected"}
          />
          <LedgerStatusCard
            title="Bitcoin"
            icon={Bitcoin}
            connected={ledgerStatus?.bitcoin?.connected}
            loading={isLoadingStatus}
            detail={ledgerStatus?.bitcoin?.connected
              ? `Block: ${ledgerStatus.bitcoin.block_height?.toLocaleString()} • Fee: ${ledgerStatus.bitcoin.fee_rates?.fastest || 0} sat/vB`
              : "Not connected"}
          />
        </div>

        <Separator className="bg-white/10" />

        <Tabs value={ledger} onValueChange={(v) => setLedger(v as Ledger)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="hypergraph">Hypergraph</TabsTrigger>
            <TabsTrigger value="solana">Solana</TabsTrigger>
            <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
          </TabsList>

          {(["hypergraph", "solana", "bitcoin"] as Ledger[]).map((l) => (
            <TabsContent key={l} value={l} className="mt-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  value={recordIdsInput}
                  onChange={(e) => setRecordIdsInput(e.target.value)}
                  placeholder="Record IDs (comma/newline separated)"
                  className="font-mono"
                />
                <Button onClick={anchor} disabled={isAnchoring || !ids.length || !configured}>
                  {isAnchoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Anchor
                </Button>
              </div>

              {!configured ? (
                <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2">
                  {l} anchoring is not configured. Set the corresponding anchor URL env var.
                </div>
              ) : null}

              {error ? (
                <div className="text-xs text-red-200/80 border border-red-500/20 bg-red-500/10 rounded-md px-3 py-2">
                  {error}
                </div>
              ) : null}

              {result ? (
                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      Anchor result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      ledger <span className="font-mono">{result.ledger}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs break-all">{result.tx_id ?? "—"}</div>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.tx_id ?? "")} disabled={!result.tx_id}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    {result.tx_id ? (
                      <div className="text-xs text-muted-foreground">
                        {explorerLink(result.ledger, result.tx_id) ? (
                          <a
                            href={explorerLink(result.ledger, result.tx_id)!}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            View on explorer
                          </a>
                        ) : (
                          <span>Explorer link not configured for this ledger.</span>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function LedgerStatusCard({
  title,
  icon: Icon,
  connected,
  loading,
  detail,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean | undefined
  loading: boolean
  detail?: string
}) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-purple-300" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking…
          </div>
        ) : connected ? (
          <div className="text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </div>
        ) : (
          <div className="text-xs text-yellow-200 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            Not connected
          </div>
        )}
        {detail && !loading && (
          <div className="text-xs text-muted-foreground truncate">{detail}</div>
        )}
      </CardContent>
    </Card>
  )
}

