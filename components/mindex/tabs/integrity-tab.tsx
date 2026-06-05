"use client"

import { useEffect, useMemo, useState } from "react"
import { Radio, Shield, TerminalSquare, Wallet } from "lucide-react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glowing-border"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { MINDEXSearchInput } from "@/components/mindex/search-input"
import { MINDEXIntegrityBadge } from "@/components/mindex/integrity-badge"
import { MINDEXVerificationPanel } from "@/components/mindex/verification-panel"
import { HashChainVisualizer } from "@/components/mindex/hash-chain-visualizer"

import type { Taxon } from "./mindex-dashboard-types"

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`HTTP ${response.status}${body ? `: ${body.slice(0, 220)}` : ""}`)
  }
  return response.json()
}

interface IntegritySummary {
  timestamp?: string
  content_hashes?: Record<string, { total: number | null; hashed: number | null }>
  anchors_total?: number | null
}

interface AnchorRow {
  id?: string
  entity_type?: string
  entity_id?: string
  content_hash_hex?: string
  tier?: string
  solana_signature?: string | null
  ordinal_inscription_id?: string | null
  platform_one_ref?: string | null
  created_at?: string
}

interface LiveIntegrityTick {
  ts?: string
  anchor_count?: number
  latest_anchor?: AnchorRow | null
  error?: string
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1
}

function statusWord(online: boolean): string {
  return online ? "online" : "pending"
}

function statusColor(online: boolean): string {
  return online ? "text-emerald-300" : "text-amber-300"
}

export function IntegritySection({
  integrityRecordId,
  setIntegrityRecordId,
  setSelectedTaxon,
}: {
  integrityRecordId: string
  setIntegrityRecordId: (id: string) => void
  setSelectedTaxon: (t: Taxon | null) => void
}) {
  const [tierFilter, setTierFilter] = useState("")

  const { data: summary } = useSWR<IntegritySummary>("/api/mindex/integrity/summary", fetcher, { refreshInterval: 60_000 })
  const anchorsUrl = useMemo(() => {
    const q = new URLSearchParams()
    q.set("limit", "200")
    return `/api/mindex/integrity/anchors/recent?${q.toString()}`
  }, [])
  const { data: anchorsBody, error: anchorsError, isLoading: anchorsLoading } = useSWR<{ items?: AnchorRow[] }>(
    anchorsUrl,
    fetcher,
    { refreshInterval: 45_000 },
  )

  const [live, setLive] = useState<LiveIntegrityTick | null>(null)
  useEffect(() => {
    const es = new EventSource("/api/mindex/integrity/stream")
    const onMsg = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as LiveIntegrityTick
        setLive(parsed)
      } catch {
        /* ignore malformed SSE frames */
      }
    }
    es.onmessage = onMsg
    es.onerror = () => {
      es.close()
    }
    return () => es.close()
  }, [])

  const { data: walletCfg } = useSWR<Record<string, unknown>>("/api/mindex/ledger/wallet/balances", fetcher, {
    refreshInterval: 120_000,
  })

  const rows = useMemo(() => {
    const items = anchorsBody?.items ?? []
    if (!tierFilter) return items
    return items.filter((a) => (a.tier || "").toLowerCase() === tierFilter.toLowerCase())
  }, [anchorsBody, tierFilter])

  const [openRow, setOpenRow] = useState<AnchorRow | null>(null)
  const summaryRows = useMemo(() => {
    const hashes = summary?.content_hashes ?? {}
    return [
      { label: "Taxa hashed", key: "taxon", total: hashes.taxon?.total, hashed: hashes.taxon?.hashed },
      { label: "Observations hashed", key: "observation", total: hashes.observation?.total, hashed: hashes.observation?.hashed },
      { label: "Compounds hashed", key: "taxon_compound", total: hashes.taxon_compound?.total, hashed: hashes.taxon_compound?.hashed },
    ]
  }, [summary])

  const walletRailLines = useMemo(() => {
    const token = walletCfg?.myca_token as { configured?: boolean; connected?: boolean; supply?: string | number | null } | undefined
    const solanaConnected = asBool(walletCfg?.solana_connected) || asBool(token?.connected)
    const tokenConfigured = asBool(token?.configured) || Boolean(walletCfg?.myca_solana_mint)
    const bitcoinConnected = asBool(walletCfg?.bitcoin_rpc_connected) || asBool(walletCfg?.bitcoin_rpc_configured)
    const ordinalsReady = asBool(walletCfg?.btc_ordinals_wallet_configured)
    const platformReady = asBool(walletCfg?.p1_connected) || asBool(walletCfg?.p1_configured)
    const hypergraphReady = asBool(walletCfg?.hypergraph_connected) || asBool(walletCfg?.hypergraph_configured)

    return [
      { label: "ledger.wallet", value: walletCfg ? "poll complete" : "waiting for status", online: Boolean(walletCfg) },
      { label: "myca.token", value: tokenConfigured ? "registry detected" : "registry pending", online: tokenConfigured },
      { label: "solana.anchor", value: solanaConnected ? "relay online" : "relay pending", online: solanaConnected },
      { label: "bitcoin.node", value: bitcoinConnected ? "node reachable" : "node pending", online: bitcoinConnected },
      { label: "bitcoin.ordinals", value: ordinalsReady ? "wallet rail ready" : "wallet rail pending", online: ordinalsReady },
      { label: "hypergraph.dag", value: hypergraphReady ? "DAG relay online" : "DAG relay pending", online: hypergraphReady },
      { label: "platform.one", value: platformReady ? "correlation relay online" : "correlation relay pending", online: platformReady },
    ]
  }, [walletCfg])

  return (
    <div className="space-y-6">
      <GlassCard color="orange">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-400" />
          Integrity Verification
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Search Taxa</label>
            <MINDEXSearchInput
              onSelectTaxonId={async (taxonId) => {
                try {
                  const res = await fetch(`/api/natureos/mindex/taxa/${encodeURIComponent(taxonId)}`)
                  if (res.ok) {
                    const data = await res.json()
                    setSelectedTaxon(data)
                  }
                } catch {
                  /* network / API errors surface elsewhere */
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Verify Record ID</label>
            <Input
              value={integrityRecordId}
              onChange={(e) => setIntegrityRecordId(e.target.value)}
              placeholder="ledger.anchor UUID..."
              className="bg-black/40 border-orange-500/30 text-white text-base min-h-[44px]"
            />
            {integrityRecordId.trim() ? <MINDEXIntegrityBadge recordId={integrityRecordId.trim()} /> : null}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <GlassCard color="purple">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Radio className="h-5 w-5 text-purple-400" />
                Anchor tail (ledger.anchor)
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Live counts from <span className="font-mono">GET /api/mindex/integrity/summary</span>; mempool-style list from{" "}
                <span className="font-mono">/integrity/anchors/recent</span> + <span className="font-mono">/integrity/stream</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={tierFilter === "" ? "default" : "outline"} className="min-h-[44px]" onClick={() => setTierFilter("")}>
                All tiers
              </Button>
              <Button type="button" variant={tierFilter === "dag" ? "default" : "outline"} className="min-h-[44px]" onClick={() => setTierFilter("dag")}>
                DAG
              </Button>
              <Button
                type="button"
                variant={tierFilter === "solana" ? "default" : "outline"}
                className="min-h-[44px]"
                onClick={() => setTierFilter("solana")}
              >
                Solana
              </Button>
              <Button type="button" variant={tierFilter === "btc" ? "default" : "outline"} className="min-h-[44px]" onClick={() => setTierFilter("btc")}>
                Ordinals
              </Button>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-gray-300 mb-3 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Summary DB</div>
                  <p className="text-sm text-gray-300">Content hashing coverage from MINDEX integrity tables.</p>
                </div>
                <Badge variant="outline" className="border-orange-500/30 text-orange-200">
                  {(summary?.anchors_total ?? 0).toLocaleString()} anchors
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {summaryRows.map((row) => {
                  const total = row.total ?? 0
                  const hashed = row.hashed ?? 0
                  const pct = total > 0 ? Math.round((hashed / total) * 100) : 0
                  return (
                    <div key={row.key} className="rounded-md bg-white/5 p-3">
                      <p className="text-xs text-gray-500">{row.label}</p>
                      <p className="mt-1 font-mono text-lg text-white">{hashed.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {total.toLocaleString()} total, {pct}% covered
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {summary?.timestamp ? `Snapshot ${new Date(summary.timestamp).toLocaleString()}` : "Waiting for integrity summary."}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-gray-500 mb-1">SSE tick</div>
              <pre className="text-xs font-mono overflow-auto max-h-32">{JSON.stringify(live ?? {}, null, 2)}</pre>
            </div>
          </div>

          {anchorsLoading ? <p className="text-sm text-gray-500">Loading anchors...</p> : null}
          {anchorsError ? (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-200">Anchor rows are unavailable.</p>
              <p className="mt-1 text-sm text-gray-400">
                Integrity summary is available, but recent anchor rows are not ready. The anchor list will open when the
                stream has records to display.
              </p>
            </div>
          ) : null}

          {!anchorsError ? (
          <div className="h-[min(44vh,420px)] overflow-auto rounded-md border border-white/10 mt-2">
            <ul className="divide-y divide-white/10">
              {rows.map((a) => (
                <li key={String(a.id)}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-3 hover:bg-white/5 min-h-[52px] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setOpenRow(a)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                          {a.tier || "-"}
                      </Badge>
                      <span className="text-xs text-gray-400">
                          {a.entity_type}:{a.entity_id?.slice(0, 8)}...
                      </span>
                    </div>
                      <span className="font-mono text-xs text-cyan-200/90 truncate max-w-full sm:max-w-[240px]">{a.content_hash_hex || "-"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {rows.length === 0 && !anchorsLoading ? (
              <p className="p-4 text-sm text-gray-500">No anchors for this filter, or MINDEX returned an empty set.</p>
            ) : null}
          </div>
          ) : null}
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-400" />
            Chain / wallet rail
          </h3>
          <p className="text-sm text-gray-400 mb-3">Live anchoring readiness reported by MINDEX.</p>
          <div className="h-56 overflow-auto rounded-md border border-cyan-500/20 bg-[#050812] shadow-inner shadow-cyan-500/10">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-cyan-100/80">
              <TerminalSquare className="h-3.5 w-3.5 text-cyan-300" />
              <span className="font-mono">mindex-ledger-terminal</span>
              <span className="ml-auto font-mono text-[10px] text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="space-y-1 p-3 font-mono text-xs">
              {walletRailLines.map((line) => (
                <div key={line.label} className="grid grid-cols-[82px_1fr] gap-2">
                  <span className={statusColor(line.online)}>[{statusWord(line.online)}]</span>
                  <span className="min-w-0 break-words text-gray-300">
                    <span className="text-cyan-200">{line.label}</span>
                    <span className="text-gray-500"> :: </span>
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Separator className="my-4 bg-white/10" />
          <p className="text-sm text-gray-400 mb-2">Hash chain verification</p>
          <HashChainVisualizer />
        </GlassCard>
      </div>

      {integrityRecordId.trim() ? <MINDEXVerificationPanel recordId={integrityRecordId.trim()} /> : null}

      <Sheet open={Boolean(openRow)} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent side="bottom" className="h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-[#0A0A0F] border-white/10 text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Anchor detail</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-gray-400">
              Merkle / signature verify for <span className="font-mono">ledger.anchor</span> requires dedicated proof endpoints; this drawer shows the
              raw anchor row from MINDEX.
            </p>
            <pre className="text-xs font-mono bg-black/40 border border-white/10 rounded-md p-3 overflow-auto max-h-[60vh]">{JSON.stringify(openRow, null, 2)}</pre>
            {openRow?.entity_type === "taxon" && openRow.entity_id ? (
              <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
                <a href={`/natureos/mindex/species/${encodeURIComponent(openRow.entity_id)}`}>Open species profile</a>
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
