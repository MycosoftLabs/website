"use client"

import { useEffect, useMemo, useState } from "react"
import { Shield, Radio, Wallet } from "lucide-react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glowing-border"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { MINDEXSearchInput } from "@/components/mindex/search-input"
import { MINDEXIntegrityBadge } from "@/components/mindex/integrity-badge"
import { MINDEXVerificationPanel } from "@/components/mindex/verification-panel"
import { HashChainVisualizer } from "@/components/mindex/hash-chain-visualizer"

import type { Taxon } from "./mindex-dashboard-types"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
})

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
              placeholder="ledger.anchor UUID…"
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

          <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-300 mb-3">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-gray-500 mb-1">Summary (DB)</div>
              <pre className="text-xs font-mono overflow-auto max-h-32">{JSON.stringify(summary ?? {}, null, 2)}</pre>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-gray-500 mb-1">SSE tick</div>
              <pre className="text-xs font-mono overflow-auto max-h-32">{JSON.stringify(live ?? {}, null, 2)}</pre>
            </div>
          </div>

          {anchorsLoading ? <p className="text-sm text-gray-500">Loading anchors…</p> : null}
          {anchorsError ? <p className="text-sm text-amber-300">Failed to load anchors.</p> : null}

          <ScrollArea className="h-[min(55vh,520px)] rounded-md border border-white/10 mt-2">
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
                        {a.tier || "—"}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {a.entity_type}:{a.entity_id?.slice(0, 8)}…
                      </span>
                    </div>
                    <span className="font-mono text-xs text-cyan-200/90 truncate max-w-full sm:max-w-[240px]">{a.content_hash_hex || "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {rows.length === 0 && !anchorsLoading ? (
              <p className="p-4 text-sm text-gray-500">No anchors for this filter, or MINDEX returned an empty set.</p>
            ) : null}
          </ScrollArea>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-400" />
            Chain / wallet rail
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Operator keys stay in <span className="font-mono">.credentials.local</span> / VM env — UI shows configuration presence from MINDEX only.
          </p>
          <ScrollArea className="h-48 rounded-md border border-white/10">
            <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(walletCfg ?? {}, null, 2)}</pre>
          </ScrollArea>
          <Separator className="my-4 bg-white/10" />
          <p className="text-sm text-gray-400 mb-2">Hash chain tool (loads by record IDs when your integrity API exposes rows)</p>
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
