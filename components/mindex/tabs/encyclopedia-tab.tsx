"use client"

import { useEffect, useMemo, useState } from "react"
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
  if (typeof t.kingdom === "string" && t.kingdom.trim()) return t.kingdom.toLowerCase()
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
  return false
}

export function EncyclopediaSection({
  taxa,
  observations,
  searchQuery,
  setSearchQuery,
  selectedTaxon,
  setSelectedTaxon,
  taxaError,
  stats: _stats,
  isLoading: _isLoading,
}: {
  taxa: Taxon[]
  observations: Observation[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTaxon: Taxon | null
  setSelectedTaxon: (t: Taxon | null) => void
  taxaError?: string | null
  stats: MINDEXStats | null
  isLoading: boolean
}) {
  void _stats
  void _isLoading

  const [kingdom, setKingdom] = useState<KingdomFilterId>("all")
  const [preferGbif, setPreferGbif] = useState(false)
  const [requireHash, setRequireHash] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState<string | null>(null)
  const [fallbackObservations, setFallbackObservations] = useState<Observation[]>([])
  const [fallbackObservationsError, setFallbackObservationsError] = useState<string | null>(null)
  const [fallbackObservationsLoading, setFallbackObservationsLoading] = useState(false)

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
  useEffect(() => {
    let cancelled = false

    async function fetchFallbackObservations() {
      setFallbackObservationsLoading(true)
      setFallbackObservationsError(null)
      try {
        const res = await fetch("/api/natureos/mindex/observations?limit=60", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) {
          const rows = Array.isArray(data.observations)
            ? data.observations
            : Array.isArray(data.data)
              ? data.data
              : []
          setFallbackObservations(rows as Observation[])
        } else {
          setFallbackObservations([])
          setFallbackObservationsError(
            data.message || data.error || `MINDEX observations endpoint returned HTTP ${res.status}`,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setFallbackObservations([])
          setFallbackObservationsError(error instanceof Error ? error.message : "Failed to fetch MINDEX observations")
        }
      } finally {
        if (!cancelled) setFallbackObservationsLoading(false)
      }
    }

    if (taxaError && observations.length === 0) {
      void fetchFallbackObservations()
    }

    return () => {
      cancelled = true
    }
  }, [observations.length, taxaError])

  const effectiveObservations = observations.length > 0 ? observations : fallbackObservations
  const observationPreview = effectiveObservations.slice(0, 12)

  const metadataRecord = (metadata: unknown): Record<string, unknown> => {
    return metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {}
  }

  const firstMediaUrl = (media: unknown): string | null => {
    if (!Array.isArray(media)) return null
    for (const item of media) {
      if (item && typeof item === "object") {
        const url = (item as Record<string, unknown>).url
        if (typeof url === "string" && url.trim()) return url
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-400" />
          Encyclopedia (all kingdoms)
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Default view is <strong className="text-white">All kingdoms</strong>. Kingdom filters read MINDEX taxonomy fields directly;
          unclassified rows remain visible only in the all-life view. No synthetic taxa.
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
                  <span className="text-gray-500">Kingdom:</span>
                  <span className="text-white capitalize">{selectedTaxon.kingdom || "Unclassified"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Source:</span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-none">{selectedTaxon.source}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-md bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-500">Observations</p>
                    <p className="font-mono text-cyan-200">{(selectedTaxon.obs_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-500">Images</p>
                    <p className="font-mono text-cyan-200">{(selectedTaxon.image_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-500">Genomes</p>
                    <p className="font-mono text-green-200">{(selectedTaxon.genome_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-500">Compounds</p>
                    <p className="font-mono text-green-200">{(selectedTaxon.compound_link_count ?? 0).toLocaleString()}</p>
                  </div>
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

      {taxaError ? (
        <div className="space-y-4">
          <GlassCard color="orange">
            <p className="text-sm font-medium text-amber-200">All-life taxonomy profiles are not available from MINDEX yet.</p>
            <p className="mt-2 text-sm text-gray-400">
              Live observations are still flowing below. Species profile pages will fill in when the all-life taxonomy
              catalog is available.
            </p>
          </GlassCard>

          <GlassCard color="cyan">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Live biology observations</h3>
                <p className="text-sm text-gray-400">
                  Observation-backed records from MINDEX while species profiles finish loading.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-cyan-500/30 text-cyan-200">
                {effectiveObservations.length.toLocaleString()} loaded
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {observationPreview.map((obs) => {
                const metadata = metadataRecord(obs.metadata)
                const image = firstMediaUrl(obs.media)
                const place = typeof metadata.place_guess === "string" ? metadata.place_guess : "location unavailable"
                const uri = typeof metadata.uri === "string" ? metadata.uri : null
                return (
                  <div key={obs.id} className="overflow-hidden rounded-lg border border-cyan-500/20 bg-black/30">
                    {image ? (
                      <img src={image} alt="" className="h-36 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-white/5 text-xs text-gray-500">
                        no media in row
                      </div>
                    )}
                    <div className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-cyan-500/20 text-cyan-200 border-none text-xs">{obs.source}</Badge>
                        <span className="font-mono text-xs text-gray-500">{String(obs.id).slice(0, 8)}</span>
                      </div>
                      <p className="line-clamp-2 min-h-10 text-sm text-gray-300">{place}</p>
                      <p className="text-xs text-gray-500">
                        {obs.observed_at ? new Date(obs.observed_at).toLocaleString() : "time unavailable"}
                      </p>
                      {uri ? (
                        <a href={uri} target="_blank" rel="noreferrer" className="block text-xs text-cyan-300 hover:text-cyan-200">
                          Open source observation
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
            {fallbackObservationsLoading && observationPreview.length === 0 ? (
              <p className="text-sm text-cyan-200">Loading live observations from MINDEX...</p>
            ) : null}
            {fallbackObservationsError ? (
              <p className="text-sm text-amber-200">Observation fallback failed: {fallbackObservationsError}</p>
            ) : null}
            {observationPreview.length === 0 ? (
              <p className="text-sm text-gray-500">No observations are loaded in this dashboard snapshot.</p>
            ) : null}
          </GlassCard>
        </div>
      ) : null}

      {!taxaError && filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No taxa match the current filters - widen kingdom or disable hash/GBIF filters.</p>
      ) : null}
    </div>
  )
}
