/**
 * SpeciesWidget - Feb 2026
 *
 * The primary search result driver.
 *
 * Compact (non-focused): always shows image + name + genus + observation count
 * Focused: full card — photo, description, FULL taxonomy breadcrumb,
 *          action buttons, mini photo gallery
 *
 * "Details" modal:
 *   - Wikipedia description (full, with Wikipedia link)
 *   - Up-to-8 photo gallery
 *   - Complete taxonomy tree from iNaturalist ancestors
 *   - Conservation status, observation stats, source link
 *   - Auto-fetched and stored in MINDEX (same pattern as genetics/chemistry)
 */

"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ExternalLink, Eye, ChevronRight, ChevronLeft, Leaf, Dna,
  Sparkles, Database, BookmarkPlus, FileText, X, Loader2,
  RefreshCw, TreeDeciduous, Globe, ShieldCheck, BookOpen, FlaskConical,
} from "lucide-react"
import type { SpeciesResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { useAutoFetchDetail } from "@/hooks/useAutoFetchDetail"
import { useSpeciesObservations } from "@/hooks/useSpeciesObservations"
import dynamic from "next/dynamic"
const ObservationEarthPortal = dynamic(
  () => import("./ObservationEarthPortal").then(m => m.ObservationEarthPortal),
  { ssr: false }
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpeciesWidgetProps {
  data: SpeciesResult | SpeciesResult[]
  isFocused: boolean
  isLoading?: boolean
  focusedId?: string
  onExplore?: (type: string, id: string) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
  /** Species name from Chemistry/Genetics widget click — show it prominently */
  pinnedSpeciesName?: string | null
}

interface SpeciesDetail {
  id: number
  inat_id?: number
  name: string
  common_name?: string | null
  rank?: string
  description?: string | null
  wikipedia_url?: string | null
  observation_count?: number
  conservation_status?: string | null
  photos: Array<{ id: string | number; url: string; large_url?: string; attribution?: string }>
  taxonomy: Record<string, string | null>
  ancestors?: Array<{ id: number; name: string; rank: string; common_name?: string | null }>
  source?: string
  source_url?: string
  _source?: string
}

// ─── Tab strip with auto-scroll + auto-open detail ───────────────────────────
function SpeciesTabStrip({
  items,
  selectedIndex,
  onSelect,
}: {
  items: SpeciesResult[]
  selectedIndex: number
  onSelect: (i: number) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const tabRefs  = useRef<(HTMLButtonElement | null)[]>([])

  // Scroll selected tab to center whenever selection changes
  useEffect(() => {
    const strip = stripRef.current
    const tab   = tabRefs.current[selectedIndex]
    if (!strip || !tab) return
    const stripRect = strip.getBoundingClientRect()
    const tabRect   = tab.getBoundingClientRect()
    const offset    = tabRect.left - stripRect.left - (stripRect.width / 2 - tabRect.width / 2)
    strip.scrollBy({ left: offset, behavior: "smooth" })
  }, [selectedIndex])

  const go = (i: number) => onSelect(Math.max(0, Math.min(items.length - 1, i)))

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
        disabled={selectedIndex === 0}
        onClick={() => go(selectedIndex - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <div ref={stripRef} className="flex gap-0.5 sm:gap-1 overflow-x-auto overscroll-x-contain flex-1 scrollbar-hide min-w-0">
        {items.slice(0, 8).map((sp, i) => (
          <button
            key={sp.id || i}
            ref={el => { tabRefs.current[i] = el }}
            onClick={() => onSelect(i)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] sm:text-[10px] shrink-0 transition-all border",
              i === selectedIndex
                ? "bg-primary/20 border-primary/40 text-primary font-semibold ring-1 ring-primary/20"
                : "bg-card/40 border-transparent hover:bg-card/70"
            )}
          >
            {sp.photos?.[0] && (
              <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                <Image src={sp.photos[0].medium_url || sp.photos[0].url} alt="" fill className="object-cover" sizes="20px" />
              </div>
            )}
            <span className="truncate max-w-[72px]">{sp.commonName || sp.scientificName}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
        disabled={selectedIndex >= items.length - 1}
        onClick={() => go(selectedIndex + 1)}>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums">
        {selectedIndex + 1}/{items.length}
      </span>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get a nice species page URL from search result id */
function getSpeciesPageUrl(item: SpeciesResult): string {
  const raw = String(item.id || "")
  const inatMatch = raw.match(/^inat-(\d+)$/)
  if (inatMatch) return `/ancestry/species/${inatMatch[1]}`
  if (/^\d+$/.test(raw) && raw !== "0") return `/ancestry/species/${raw}`
  return `/ancestry/species/name/${encodeURIComponent(item.scientificName)}`
}

/** Ordered taxonomy ranks for display */
const TAXONOMY_RANKS = ["kingdom", "phylum", "class", "order", "family", "genus"] as const

/** Rank display labels */
const RANK_LABEL: Record<string, string> = {
  kingdom: "Kingdom", phylum: "Phylum", class: "Class",
  order: "Order", family: "Family", genus: "Genus",
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SpeciesLoadingSkeleton() {
  return (
    <div className="flex gap-3 p-2">
      <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          {[1,2,3].map(i => <Skeleton key={i} className="h-5 w-16 rounded-full" />)}
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}

// ─── Taxonomy tree row ────────────────────────────────────────────────────────

function TaxonomyTree({
  taxonomy,
  compact = false,
  onLevelClick,
}: {
  taxonomy: Record<string, string | null | undefined>
  compact?: boolean
  onLevelClick?: (rank: string, value: string) => void
}) {
  const levels = TAXONOMY_RANKS
    .map(r => ({ rank: r, value: taxonomy[r] }))
    .filter(l => l.value)

  if (!levels.length) return null

  if (compact) {
    // Single-line breadcrumb: Kingdom › Phylum › … › Genus
    return (
      <div className="flex items-center flex-wrap gap-0.5 text-[10px] text-muted-foreground">
        {levels.map((l, i) => (
          <span key={l.rank} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />}
            <button
              className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
              onClick={() => onLevelClick?.(l.rank, l.value!)}
              title={RANK_LABEL[l.rank]}
            >
              {l.value}
            </button>
          </span>
        ))}
      </div>
    )
  }

  // Vertical tree with rank labels
  return (
    <div className="space-y-0.5">
      {levels.map((l, i) => (
        <div key={l.rank} className="flex items-center gap-2 text-xs" style={{ paddingLeft: `${i * 10}px` }}>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-[9px] text-muted-foreground/60 w-14 shrink-0 uppercase tracking-wide">
            {RANK_LABEL[l.rank]}
          </span>
          <button
            className="font-medium hover:text-green-400 hover:underline underline-offset-2 transition-colors text-left"
            onClick={() => onLevelClick?.(l.rank, l.value!)}
          >
            {l.value}
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Species Detail Modal (portal) ───────────────────────────────────────────

function SpeciesDetailModal({ species, onClose }: { species: SpeciesResult; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const ctx = useSearchContext()

  // Navigate to a widget and close this modal
  const exploreIn = useCallback((widgetType: "chemistry" | "genetics" | "ai") => {
    onClose()
    // Give the modal time to close before emitting
    setTimeout(() => {
      ctx.emit("navigate-to-species", { name: species.scientificName })
      ctx.focusWidget({ type: widgetType, id: species.scientificName } as any)
    }, 150)
  }, [ctx, onClose, species.scientificName])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [mounted, onClose])

  useEffect(() => {
    if (!mounted) return
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = orig }
  }, [mounted])

  // Extract iNaturalist numeric ID for fast direct lookup
  const inatId = String(species.id).match(/^inat-(\d+)$/)?.[1]

  const url = mounted
    ? inatId
      ? `/api/mindex/species/detail?id=inat-${inatId}`
      : `/api/mindex/species/detail?name=${encodeURIComponent(species.scientificName)}`
    : null

  const { data, loading, retrying, error } = useAutoFetchDetail<SpeciesDetail>({
    url,
    // Complete when we have either description or multiple photos
    isIncomplete: (d) => !!d && !d.description && (!d.photos || d.photos.length === 0),
    maxAttempts: 5,
    baseDelay: 2500,
    maxDelay: 10000,
  })

  if (!mounted) return null

  const photos = data?.photos?.length ? data.photos : species.photos?.length ? species.photos : []
  const mainPhoto = photos[photoIdx]
  const description = data?.description || species.description
  const displayName = data?.common_name || species.commonName || species.scientificName
  const taxonomy = data?.taxonomy || species.taxonomy

  // Build full ancestor breadcrumb if available
  const ancestors = data?.ancestors || []
  const taxonomyLevels: Array<{ id: number; name: string; rank: string }> = ancestors
    .filter(a => TAXONOMY_RANKS.includes(a.rank as any))
    .concat({ id: 0, name: species.scientificName, rank: data?.rank || "species" })

  const modal = (
    <AnimatePresence>
      <motion.div
        key="species-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
        <motion.div
          key="species-modal-panel"
          initial={{ opacity: 0, scale: 0.97, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl"
          style={{ maxHeight: "min(90vh, 700px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-white/8 shrink-0">
            <div className="p-2 bg-emerald-500/15 rounded-lg shrink-0 mt-0.5">
              <Leaf className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base">{displayName}</h2>
              <p className="text-sm italic text-muted-foreground mt-0.5">{species.scientificName}</p>
              {/* Compact taxonomy breadcrumb in header */}
              <TaxonomyTree taxonomy={taxonomy || {}} compact />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div data-widget-detail className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0">

            {/* Loading */}
            {loading && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  Loading species data from iNaturalist…
                </div>
                <Skeleton className="h-52 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="px-5 py-6">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm text-destructive">Could not load species data</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            )}

            {retrying && (
              <div className="px-5 pt-3 flex items-center gap-2 text-xs text-emerald-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading full species record…
              </div>
            )}

            {(!loading || data) && (
              <div className="px-5 py-4 space-y-5">

                {/* Photo gallery */}
                {photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden bg-muted/20 border border-white/8" style={{ height: "220px" }}>
                      <Image
                        src={mainPhoto?.url || mainPhoto?.large_url || ""}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="672px"
                        unoptimized
                      />
                      {/* Navigation arrows */}
                      {photos.length > 1 && (
                        <>
                          <button
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
                            onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
                            onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {/* Photo counter + attribution */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                        {mainPhoto?.attribution && (
                          <p className="text-[9px] text-white/70 truncate">{mainPhoto.attribution}</p>
                        )}
                        {photos.length > 1 && (
                          <p className="text-[9px] text-white/60">{photoIdx + 1} / {photos.length}</p>
                        )}
                      </div>
                    </div>
                    {/* Thumbnail strip */}
                    {photos.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
                        {photos.map((p, i) => (
                          <button
                            key={p.id || i}
                            onClick={() => setPhotoIdx(i)}
                            className={cn(
                              "relative h-12 w-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                              i === photoIdx ? "border-emerald-400" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                          >
                            <Image src={p.url || ""} alt="" fill className="object-cover" sizes="48px" unoptimized />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {(data?.observation_count ?? species.observationCount ?? 0) > 0 && (
                    <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Observations</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-400">
                        {((data?.observation_count ?? species.observationCount) || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Rank</p>
                    <p className="mt-0.5 text-sm font-bold capitalize">{data?.rank || species.rank || "Species"}</p>
                  </div>
                  {(data?.conservation_status) && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-amber-400/70">Conservation</p>
                      <p className="mt-0.5 text-xs font-semibold text-amber-400 capitalize">{data.conservation_status}</p>
                    </div>
                  )}
                </div>

                {/* Description — full Wikipedia summary */}
                {description ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Description</p>
                      {data?.wikipedia_url && (
                        <a
                          href={data.wikipedia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-[9px] text-muted-foreground hover:text-emerald-400 flex items-center gap-0.5"
                        >
                          Wikipedia <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-foreground/85 leading-relaxed">{description}</p>
                  </div>
                ) : !loading && (
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground italic">Description not yet available. Loading from Wikipedia…</p>
                  </div>
                )}

                {/* Full taxonomy tree */}
                {taxonomyLevels.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <TreeDeciduous className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Taxonomy</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 border border-white/6 px-4 py-3">
                      <div className="space-y-1">
                        {taxonomyLevels.map((l, i) => (
                          <div
                            key={`${l.rank}-${l.id}`}
                            className="flex items-center gap-2 text-xs"
                            style={{ paddingLeft: `${i * 12}px` }}
                          >
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <span className={cn(
                              "text-[9px] uppercase tracking-wide shrink-0 w-16",
                              l.rank === "species" ? "text-emerald-400/80" : "text-muted-foreground/60"
                            )}>
                              {l.rank === "species" ? "Species" : RANK_LABEL[l.rank] || l.rank}
                            </span>
                            <a
                              href={l.id ? `https://www.inaturalist.org/taxa/${l.id}` : "#"}
                              target={l.id ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className={cn(
                                "font-medium transition-colors hover:underline underline-offset-2",
                                l.rank === "species"
                                  ? "italic text-emerald-400 font-semibold"
                                  : "hover:text-emerald-400"
                              )}
                            >
                              {l.name}
                            </a>
                            {l.rank === "species" || l.rank === "genus" ? null : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer — cross-widget explore links (all in-app, no external navigation) */}
          <div className="shrink-0 px-5 py-3 border-t border-white/8 space-y-2.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Explore in search results</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "Compounds",   icon: FlaskConical, color: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20", action: () => exploreIn("chemistry") },
                { label: "Genetics",    icon: Dna,          color: "bg-blue-500/10   text-blue-400   border-blue-500/20   hover:bg-blue-500/20",   action: () => exploreIn("genetics")  },
                { label: "Ask MYCA",    icon: Sparkles,     color: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20", action: () => exploreIn("ai")        },
              ].map(({ label, icon: Icon, color, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${color}`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data?.source_url && (
                  <a href={data.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-emerald-400 transition-colors">
                    iNaturalist <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {data?.wikipedia_url && (
                  <a href={data.wikipedia_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-emerald-400 transition-colors">
                    Wikipedia <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>Close</Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function SpeciesWidget({
  data,
  isFocused,
  isLoading = false,
  focusedId,
  onExplore,
  onFocusWidget,
  onAddToNotepad,
  className,
  pinnedSpeciesName,
}: SpeciesWidgetProps) {
  const items = useMemo(() => Array.isArray(data) ? data : [data], [data])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [detailSpecies, setDetailSpecies] = useState<SpeciesResult | null>(null)
  const handleCloseDetail = useCallback(() => setDetailSpecies(null), [])
  const [earthOpen, setEarthOpen] = useState(false)
  // Enriched data — fetched automatically when focused so we get real taxonomy + photos
  const [enriched, setEnriched] = useState<SpeciesDetail | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)

  // Pinned species data — fetched from species detail API when a species name
  // is clicked in the Chemistry or Genetics widget
  const [pinnedData, setPinnedData] = useState<SpeciesDetail | null>(null)
  const [pinnedLoading, setPinnedLoading] = useState(false)
  const prevPinnedName = useRef<string | null>(null)

  useEffect(() => {
    if (!pinnedSpeciesName || pinnedSpeciesName === prevPinnedName.current) return
    prevPinnedName.current = pinnedSpeciesName
    setPinnedData(null)
    setPinnedLoading(true)
    fetch(`/api/mindex/species/detail?name=${encodeURIComponent(pinnedSpeciesName)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPinnedData(d as SpeciesDetail) })
      .catch(() => {})
      .finally(() => setPinnedLoading(false))
  }, [pinnedSpeciesName])

  useEffect(() => {
    if (focusedId && items.length > 0) {
      const idx = items.findIndex(s =>
        s.id === focusedId ||
        s.scientificName?.toLowerCase() === focusedId.toLowerCase() ||
        s.commonName?.toLowerCase() === focusedId.toLowerCase()
      )
      if (idx >= 0) setSelectedIndex(idx)
    }
  }, [focusedId]) // eslint-disable-line

  // Auto-enrich when focused: fetch real taxonomy, description, and photos from iNaturalist
  const selected0 = items[0]
  useEffect(() => {
    if (!isFocused || !selected0) return
    setEnriched(null)
    const inatId = String(selected0.id).match(/^inat-(\d+)$/)?.[1]
    const url = inatId
      ? `/api/mindex/species/detail?id=inat-${inatId}`
      : `/api/mindex/species/detail?name=${encodeURIComponent(selected0.scientificName)}`
    setEnrichLoading(true)
    fetch(url, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEnriched(d as SpeciesDetail) })
      .catch(() => {})
      .finally(() => setEnrichLoading(false))
  }, [isFocused, selected0?.id]) // eslint-disable-line

  if (isLoading) return <SpeciesLoadingSkeleton />

  const selected = items[selectedIndex] || items[0]
  if (!selected) return null

  // Merge enriched data (real taxonomy/photos/desc) with search result
  const enrichedForSelected = selectedIndex === 0 ? enriched : null
  const photos = enrichedForSelected?.photos?.length
    ? enrichedForSelected.photos.map(p => ({ ...p, medium_url: p.url, large_url: (p as any).large_url || p.url }))
    : selected.photos || []
  const taxonomy = (() => {
    const base = selected.taxonomy || {}
    const enriched = enrichedForSelected?.taxonomy || {}
    // Prefer enriched taxonomy — it has real phylum/class/order/family/genus
    const merged: Record<string, string> = {}
    for (const k of TAXONOMY_RANKS) {
      merged[k] = (enriched as any)[k] || (base as any)[k] || ""
    }
    return merged
  })()
  const description = enrichedForSelected?.description || selected.description || ""
  const mainPhoto = photos[0]
  const sources = [...new Set(items.map((s: any) => s._source).filter(Boolean))]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/search-widget", JSON.stringify({
      type: "species",
      title: selected.commonName || selected.scientificName,
      content: selected.description?.slice(0, 200) || selected.scientificName,
      source: (selected as any)._source || "Search",
    }))
    e.dataTransfer.effectAllowed = "copy"
  }

  // ── NON-FOCUSED: compact pill ─────────────────────────────────────────────
  if (!isFocused) {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)} draggable onDragStart={handleDragStart}>
          {/* Always show image — even in compact mode */}
          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-muted/40 shrink-0 border border-white/10">
            {mainPhoto ? (
              <Image
                src={mainPhoto.medium_url || mainPhoto.url}
                alt={selected.commonName || selected.scientificName}
                fill className="object-cover" sizes="36px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Leaf className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{selected.commonName || selected.scientificName}</p>
            <p className="text-[10px] text-muted-foreground italic truncate">{selected.scientificName}</p>
            {/* Taxonomy breadcrumb even in compact mode */}
            <TaxonomyTree taxonomy={taxonomy} compact />
          </div>
          {items.length > 1 && (
            <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">{items.length}</Badge>
          )}
        </div>
        {detailSpecies && <SpeciesDetailModal species={detailSpecies} onClose={handleCloseDetail} />}
      </>
    )
  }

  // ── FOCUSED: full dashboard layout ────────────────────────────────────────
  return (
    <>
      <div className={cn("flex flex-col gap-2", className)} draggable onDragStart={handleDragStart}>

        {/* ── Pinned species from Chemistry/Genetics click ───────────────────── */}
        {(pinnedSpeciesName) && (
          <div className={cn(
            "rounded-xl border px-3 py-2.5 space-y-1.5",
            pinnedLoading
              ? "bg-muted/20 border-white/8"
              : pinnedData
                ? "bg-emerald-500/8 border-emerald-500/20"
                : "bg-muted/10 border-white/6"
          )}>
            <div className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-emerald-400 shrink-0" />
              <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-medium">
                Navigated from search
              </p>
            </div>
            {pinnedLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading <span className="italic">{pinnedSpeciesName}</span>…
              </div>
            ) : pinnedData ? (
              <div className="flex items-center gap-2.5">
                {pinnedData.photos?.[0]?.url && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <Image src={pinnedData.photos[0].url} alt="" fill className="object-cover" sizes="40px" unoptimized />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold italic truncate">
                    {pinnedData.common_name || pinnedData.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground italic truncate">{pinnedData.name}</p>
                  {pinnedData.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{pinnedData.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] shrink-0"
                  onClick={() => {
                    // Open full detail modal for this species
                    const fakeResult: any = {
                      id: `inat-${pinnedData.inat_id || 0}`,
                      scientificName: pinnedData.name,
                      commonName: pinnedData.common_name || pinnedData.name,
                      taxonomy: pinnedData.taxonomy || {},
                      description: pinnedData.description || "",
                      photos: pinnedData.photos || [],
                      observationCount: pinnedData.observation_count || 0,
                      rank: pinnedData.rank || "species",
                    }
                    setDetailSpecies(fakeResult)
                  }}
                >
                  Details
                </Button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">{pinnedSpeciesName}</p>
            )}
          </div>
        )}

        {/* Species tabs — clicking/arrowing auto-centers tab AND opens detail card */}
        {items.length > 1 && (
          <SpeciesTabStrip
            items={items}
            selectedIndex={selectedIndex}
            onSelect={(i) => {
              setSelectedIndex(i)
              // Auto-open the species detail modal when navigating to a new species
              setDetailSpecies(items[i])
            }}
          />
        )}

        {/* Main content */}
        <div className="flex gap-3 items-start">
          {/* Photo column */}
          <div className="shrink-0 flex flex-col gap-1.5">
            <div className="relative rounded-xl overflow-hidden bg-muted/30 shadow-inner border border-white/10"
              style={{ width: 110, height: 110 }}>
              {mainPhoto ? (
                <Image
                  src={mainPhoto.medium_url || mainPhoto.url}
                  alt={selected.commonName || selected.scientificName}
                  fill className="object-cover"
                  sizes="110px"
                />
              ) : enrichLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-muted-foreground/40 animate-spin" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-900/20">
                  <Leaf className="h-8 w-8 text-emerald-600/40" />
                </div>
              )}
            </div>
            {/* Mini gallery from enriched photos */}
            {photos.length > 1 && (
              <div className="flex gap-0.5">
                {photos.slice(1, 5).map((photo, i) => (
                  <div key={(photo as any).id || i} className="relative w-[24px] h-[24px] rounded overflow-hidden bg-muted border border-white/8">
                    <Image src={(photo as any).medium_url || photo.url} alt="" fill className="object-cover" sizes="24px" unoptimized />
                  </div>
                ))}
              </div>
            )}
            {/* Observation count */}
            {(enrichedForSelected?.observation_count || selected.observationCount) > 0 && (
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Eye className="h-2.5 w-2.5" />
                {((enrichedForSelected?.observation_count || selected.observationCount) || 0).toLocaleString()}
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Compound-derived context banner */}
            {(selected as any)._derivedFromCompound && (
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 flex items-center gap-1.5">
                <FlaskConical className="h-3 w-3 text-purple-400 shrink-0" />
                <p className="text-[10px] text-purple-300 leading-tight">
                  Produces <span className="font-semibold capitalize">{(selected as any)._derivedFromCompound}</span>
                </p>
              </div>
            )}
            {/* Name */}
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {enrichedForSelected?.common_name || selected.commonName || selected.scientificName}
              </h3>
              <p className="text-[11px] text-muted-foreground italic leading-tight">{selected.scientificName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(enrichedForSelected?.rank || selected.rank) && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                    {enrichedForSelected?.rank || selected.rank}
                  </Badge>
                )}
                {enrichedForSelected?.conservation_status && (
                  <Badge className="text-[9px] h-4 px-1 capitalize bg-amber-500/15 text-amber-400 border-amber-500/25">
                    {enrichedForSelected.conservation_status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Full taxonomy tree — enriched with real phylum/class/order/family */}
            {enrichLoading && Object.values(taxonomy).every(v => !v || v === "Fungi") ? (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading taxonomy…
              </div>
            ) : (
              <TaxonomyTree
                taxonomy={taxonomy}
                onLevelClick={(rank, value) => onExplore?.("taxonomy", value)}
              />
            )}

            {/* Description — real Wikipedia text, auto-enriched */}
            {description && !description.startsWith("A species of fungus") ? (
              <p className="text-[10px] text-foreground/75 leading-relaxed line-clamp-4">
                {description}
              </p>
            ) : enrichLoading ? (
              <div className="space-y-1">
                <div className="h-2.5 bg-muted/40 rounded animate-pulse w-full" />
                <div className="h-2.5 bg-muted/40 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-muted/40 rounded animate-pulse w-3/5" />
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <Button asChild size="sm" className="h-6 px-2 text-[10px] rounded-lg">
                <a href={getSpeciesPageUrl(selected)}>
                  Full Page <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                </a>
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-lg text-teal-400 border-teal-500/30 hover:bg-teal-500/10"
                onClick={() => setEarthOpen(true)}>
                <Globe className="h-2.5 w-2.5 mr-0.5" /> On Earth
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-lg"
                onClick={() => setDetailSpecies(selected)}>
                <FileText className="h-2.5 w-2.5 mr-0.5" /> Details
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-lg"
                onClick={() => onFocusWidget?.({ type: "chemistry", id: selected.scientificName })}>
                <Leaf className="h-2.5 w-2.5 mr-0.5" /> Compounds
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-lg"
                onClick={() => onFocusWidget?.({ type: "genetics", id: selected.scientificName })}>
                <Dna className="h-2.5 w-2.5 mr-0.5" /> Genetics
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-lg"
                onClick={() => onFocusWidget?.({ type: "ai" })}>
                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
              </Button>
              {onAddToNotepad && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] rounded-lg"
                  onClick={() => onAddToNotepad({
                    type: "species",
                    title: selected.commonName || selected.scientificName,
                    content: selected.description?.slice(0, 200) || selected.scientificName,
                    source: (selected as any)._source,
                  })}>
                  <BookmarkPlus className="h-2.5 w-2.5 mr-0.5" /> Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {detailSpecies && <SpeciesDetailModal species={detailSpecies} onClose={handleCloseDetail} />}

      {/* Earth observation portal — fetches real iNaturalist sightings for this species */}
      {earthOpen && (
        <SpeciesEarthPortalLoader
          speciesName={selected.scientificName}
          title={selected.commonName || selected.scientificName}
          onClose={() => setEarthOpen(false)}
        />
      )}
    </>
  )
}

// Separate component so the hook only runs when the portal is open
function SpeciesEarthPortalLoader({
  speciesName,
  title,
  onClose,
}: {
  speciesName: string
  title: string
  onClose: () => void
}) {
  const { observations, loading } = useSpeciesObservations(speciesName, 25)
  return (
    <ObservationEarthPortal
      observations={loading ? [] : observations}
      title={`${title} — Field Observations`}
      onClose={onClose}
    />
  )
}

export default SpeciesWidget
