"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Filter, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GlassCard, TravelingBorder } from "@/components/ui/glowing-border"

import type { MINDEXStats, Observation, Taxon } from "./mindex-dashboard-types"
import { KingdomSwitcher, type KingdomFilterId } from "./kingdom-switcher"
import { SpeciesCard } from "./species-card"

function kingdomFromMetadata(t: Taxon): string | null {
  const m = t.metadata
  if (!m || typeof m !== "object") return null
  const k = (m as Record<string, unknown>).kingdom
  return typeof k === "string" ? k.toLowerCase() : null
}

function matchesKingdom(t: Taxon, k: KingdomFilterId): boolean {
  if (k === "all") return true
  const mk = kingdomFromMetadata(t)
  if (mk) {
    if (k === "fungi") return mk.includes("fungi")
    if (k === "plantae") return mk.includes("plant") || mk.includes("plantae")
    if (k === "animalia") return mk.includes("animal")
    if (k === "bacteria") return mk.includes("bacter") || mk.includes("archae")
    return !mk.includes("fungi") && !mk.includes("plant") && !mk.includes("animal") && !mk.includes("bacter")
  }
  /* MINDEX is fungal-first: unclassified rows remain visible for fungi filter only */
  if (k === "fungi") return true
  return false
}

export function EncyclopediaSection({
  taxa,
  observations: _observations,
  searchQuery,
  setSearchQuery,
  selectedTaxon,
  setSelectedTaxon,
  stats: _stats,
  isLoading: _isLoading,
}: {
  taxa: Taxon[]
  observations: Observation[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTaxon: Taxon | null
  setSelectedTaxon: (t: Taxon | null) => void
  stats: MINDEXStats | null
  isLoading: boolean
}) {
  void _observations
  void _stats
  void _isLoading

  const [kingdom, setKingdom] = useState<KingdomFilterId>("all")
  const [preferGbif, setPreferGbif] = useState(false)
  const [requireHash, setRequireHash] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return taxa.filter((t) => {
      if (!matchesKingdom(t, kingdom)) return false
      if (preferGbif && !String(t.source || "").toLowerCase().includes("gbif")) return false
      if (requireHash) {
        const m = t.metadata as Record<string, unknown> | undefined
        const h = m?.content_hash ?? m?.content_hash_hex
        if (typeof h !== "string" || h.length < 8) return false
      }
      return true
    })
  }, [taxa, kingdom, preferGbif, requireHash])

  const visible = filtered.slice(0, 24)

  return (
    <div className="space-y-6">
      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-400" />
          Encyclopedia (all kingdoms)
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Default view is <strong className="text-white">All kingdoms</strong>. When <span className="font-mono">metadata.kingdom</span> is missing,
          rows still appear for <em>All</em> and <em>Fungi</em> filters; other kingdom filters rely on explicit metadata. No synthetic taxa.
        </p>
        <KingdomSwitcher value={kingdom} onChange={setKingdom} className="mb-4" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search species, common names, or taxonomy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 border-purple-500/30 text-white text-base placeholder:text-gray-500 focus:border-purple-500 min-h-[44px]"
            />
          </div>
          <Button type="button" variant="outline" className="border-purple-500/30 text-purple-300 min-h-[44px]">
            <Filter className="h-4 w-4 mr-2" />
            Facets
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 min-h-[44px]">
            <Switch id="gbif-only" checked={preferGbif} onCheckedChange={setPreferGbif} />
            <Label htmlFor="gbif-only" className="text-base text-gray-300">
              GBIF sources only
            </Label>
          </div>
          <div className="flex items-center gap-3 min-h-[44px]">
            <Switch id="require-hash" checked={requireHash} onCheckedChange={setRequireHash} />
            <Label htmlFor="require-hash" className="text-base text-gray-300">
              Require content hash in metadata
            </Label>
          </div>
        </div>
      </GlassCard>

      {selectedTaxon ? (
        <TravelingBorder color="cyan">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4 gap-2">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedTaxon.canonical_name}</h3>
                {selectedTaxon.common_name ? <p className="text-cyan-400">{selectedTaxon.common_name}</p> : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTaxon(null)} className="text-gray-400 hover:text-white min-h-[44px]">
                Clear
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap mb-4">
              <Button
                type="button"
                variant="outline"
                disabled={bulkBusy}
                className="min-h-[44px] border-cyan-500/40 text-cyan-200"
                onClick={async () => {
                  const m = selectedTaxon.metadata as Record<string, unknown> | undefined
                  let hex = ""
                  const raw = m?.content_hash_hex ?? m?.content_hash
                  if (typeof raw === "string") {
                    hex = raw.replace(/^sha256:/i, "").replace(/\s+/g, "")
                  }
                  setBulkBusy(true)
                  setBulkNote(null)
                  try {
                    const res = await fetch("/api/mas/tasks/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        description: `Re-anchor taxon ${selectedTaxon.canonical_name} (${selectedTaxon.id})`,
                        task_type: "etl",
                        target_agent: "anchor_router",
                        priority: "normal",
                        payload: {
                          handler: "post_anchor",
                          entity_type: "taxon",
                          entity_id: selectedTaxon.id,
                          content_hash_hex: hex,
                          tier: "dag",
                        },
                        source: "mindex-encyclopedia",
                      }),
                    })
                    setBulkNote(`MAS ${res.status}: ${(await res.text()).slice(0, 500)}`)
                  } catch (e) {
                    setBulkNote(e instanceof Error ? e.message : "submit_failed")
                  } finally {
                    setBulkBusy(false)
                  }
                }}
              >
                {bulkBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Queue re-anchor
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={bulkBusy}
                className="min-h-[44px] border-cyan-500/40 text-cyan-200"
                onClick={async () => {
                  setBulkBusy(true)
                  setBulkNote(null)
                  try {
                    const res = await fetch("/api/mas/tasks/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        description: `Synthesis sampling around taxon ${selectedTaxon.canonical_name} (${selectedTaxon.id})`,
                        task_type: "scientific",
                        target_agent: "data_synthesis",
                        priority: "normal",
                        payload: { handler: "sample_taxa", limit: 25, context_taxon_id: selectedTaxon.id },
                        source: "mindex-encyclopedia",
                      }),
                    })
                    setBulkNote(`MAS ${res.status}: ${(await res.text()).slice(0, 500)}`)
                  } catch (e) {
                    setBulkNote(e instanceof Error ? e.message : "submit_failed")
                  } finally {
                    setBulkBusy(false)
                  }
                }}
              >
                Queue synthesis
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={bulkBusy}
                className="min-h-[44px] border-cyan-500/40 text-cyan-200"
                onClick={async () => {
                  setBulkBusy(true)
                  setBulkNote(null)
                  try {
                    const res = await fetch("/api/mas/tasks/submit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        description: `IP / compliance review requested for MINDEX taxon ${selectedTaxon.canonical_name} (${selectedTaxon.id})`,
                        task_type: "mycology",
                        target_agent: "mycology-bio-agent",
                        priority: "normal",
                        payload: { taxon_id: selectedTaxon.id, canonical_name: selectedTaxon.canonical_name, intent: "ip_review" },
                        source: "mindex-encyclopedia",
                      }),
                    })
                    setBulkNote(`MAS ${res.status}: ${(await res.text()).slice(0, 500)}`)
                  } catch (e) {
                    setBulkNote(e instanceof Error ? e.message : "submit_failed")
                  } finally {
                    setBulkBusy(false)
                  }
                }}
              >
                Queue IP review
              </Button>
            </div>
            {bulkNote ? <p className="text-xs font-mono text-gray-400 mb-3 break-all">{bulkNote}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Rank:</span>
                  <span className="text-white capitalize">{selectedTaxon.rank}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Source:</span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-none">{selectedTaxon.source}</Badge>
                </div>
              </div>
              <SpeciesCard taxon={selectedTaxon} showProfileLink />
            </div>
          </div>
        </TravelingBorder>
      ) : null}

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {visible.length} of {filtered.length} filtered ({taxa.length} loaded)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((taxon, i) => (
          <motion.div
            key={taxon.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
          >
            <button
              type="button"
              className="w-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              onClick={() => setSelectedTaxon(taxon)}
            >
              <SpeciesCard taxon={taxon} showProfileLink={false} />
            </button>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No taxa match the current filters — widen kingdom or disable hash/GBIF filters.</p>
      ) : null}
    </div>
  )
}
