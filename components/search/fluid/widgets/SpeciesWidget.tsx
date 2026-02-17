/**
 * SpeciesWidget - Feb 2026
 *
 * Dense, dashboard-style species card.
 * Shows everything at a glance -- no scrolling needed.
 * Horizontal layout: photo left, info center, taxonomy/actions right.
 * Species strip at top for switching between results.
 */

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ExternalLink,
  Eye,
  ChevronRight,
  ChevronLeft,
  Leaf,
  Dna,
  Sparkles,
  Database,
  BookmarkPlus,
  FileText,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react"
import type { SpeciesResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useAutoFetchDetail } from "@/hooks/useAutoFetchDetail"

interface SpeciesWidgetProps {
  data: SpeciesResult | SpeciesResult[]
  isFocused: boolean
  isLoading?: boolean
  focusedId?: string
  onExplore?: (type: string, id: string) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
}

function SpeciesLoadingSkeleton() {
  return (
    <div className="flex gap-4 p-4 h-full">
      {/* Species strip skeleton */}
      <div className="flex-shrink-0 w-16">
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-md" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex gap-4">
        <Skeleton className="h-40 w-40 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 italic" />
          <div className="flex gap-2 flex-wrap mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full mt-3" />
        </div>
      </div>
    </div>
  )
}

export function SpeciesWidget({
  data,
  isFocused,
  isLoading = false,
  focusedId,
  onExplore,
  onFocusWidget,
  onAddToNotepad,
  className,
}: SpeciesWidgetProps) {
  const items = useMemo(() => Array.isArray(data) ? data : [data], [data])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [detailSpecies, setDetailSpecies] = useState<SpeciesResult | null>(null)
  const handleCloseDetail = useCallback(() => setDetailSpecies(null), [])

  useEffect(() => {
    // Only respond to focusedId if this widget is actually being focused for a species item
    // Check that focusedId matches one of our species IDs to avoid cross-widget interference
    if (focusedId && items.length > 0) {
      const idx = items.findIndex(
        (s) =>
          s.id === focusedId ||
          s.commonName?.toLowerCase() === focusedId.toLowerCase() ||
          s.scientificName?.toLowerCase() === focusedId.toLowerCase()
      )
      // Only update index if we actually found a matching species
      if (idx >= 0) {
        setSelectedIndex(idx)
      }
    }
  }, [focusedId, items])

  // Loading state check AFTER all hooks
  if (isLoading) {
    return <SpeciesLoadingSkeleton />
  }

  const selected = items[selectedIndex] || items[0]
  if (!selected) return null

  const mainPhoto = selected.photos?.[0]
  const taxonomyLevels = [
    { label: "Kingdom", value: selected.taxonomy?.kingdom },
    { label: "Phylum", value: selected.taxonomy?.phylum },
    { label: "Class", value: selected.taxonomy?.class },
    { label: "Order", value: selected.taxonomy?.order },
    { label: "Family", value: selected.taxonomy?.family },
    { label: "Genus", value: selected.taxonomy?.genus },
  ].filter((t) => t.value)

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

  // --- NON-FOCUSED: compact pill ---
  if (!isFocused) {
    return (
      <>
      <div className={cn("flex items-center gap-2", className)} draggable onDragStart={handleDragStart}>
        {mainPhoto && (
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <Image src={mainPhoto.medium_url || mainPhoto.url} alt="" fill className="object-cover" sizes="32px" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{selected.commonName || selected.scientificName}</p>
          <p className="text-[10px] text-muted-foreground italic truncate">{selected.scientificName}</p>
        </div>
        {items.length > 1 && (
          <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">{items.length}</Badge>
        )}
      </div>
      {detailSpecies && <SpeciesDetailModal species={detailSpecies} onClose={handleCloseDetail} />}
      </>
    )
  }

  // --- FOCUSED: full dashboard layout ---
  return (
    <>
    <div className={cn("flex flex-col gap-2", className)} draggable onDragStart={handleDragStart}>
      {/* Species strip -- horizontal scrollable tabs */}
      {items.length > 1 && (
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" disabled={selectedIndex === 0}
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}>
            <ChevronLeft className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          </Button>
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {items.slice(0, 6).map((sp, i) => (
              <button key={sp.id || i} onClick={() => setSelectedIndex(i)}
                className={cn(
                  "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-1.5 py-1 sm:py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] shrink-0 transition-all border",
                  i === selectedIndex
                    ? "bg-primary/15 border-primary/30 text-primary font-medium"
                    : "bg-card/40 border-transparent hover:bg-card/60 active:bg-card/80"
                )}>
                {sp.photos?.[0] && (
                  <div className="relative w-4 h-4 sm:w-4 sm:h-4 rounded-sm overflow-hidden shrink-0">
                    <Image src={sp.photos[0].medium_url || sp.photos[0].url} alt="" fill className="object-cover" sizes="16px" />
                  </div>
                )}
                <span className="truncate max-w-[50px] sm:max-w-[60px]">{sp.commonName || sp.scientificName}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" disabled={selectedIndex >= items.length - 1}
            onClick={() => setSelectedIndex((i) => Math.min(items.length - 1, i + 1))}>
            <ChevronRight className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          </Button>
          <span className="text-[8px] sm:text-[9px] text-muted-foreground shrink-0">{selectedIndex + 1}/{items.length}</span>
        </div>
      )}

      {/* Main content -- responsive: stack on mobile, horizontal on desktop */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start">
        {/* Photo column */}
        <div className="shrink-0 flex flex-row sm:flex-col gap-2 sm:gap-1 w-full sm:w-auto">
          {mainPhoto && (
            <motion.div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-lg sm:rounded-xl overflow-hidden bg-muted shadow-inner shrink-0" layout>
              <Image src={mainPhoto.medium_url || mainPhoto.url} alt={selected.commonName} fill className="object-cover" sizes="(max-width: 640px) 80px, 112px" />
            </motion.div>
          )}
          {/* Mobile: name next to photo, Mini gallery hidden */}
          <div className="flex-1 min-w-0 sm:hidden">
            <h3 className="font-semibold text-sm leading-tight truncate">{selected.commonName}</h3>
            <p className="text-[10px] text-muted-foreground italic leading-tight truncate">{selected.scientificName}</p>
            {/* Stats row mobile */}
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-1">
              {selected.observationCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Eye className="h-2 w-2" />
                  {selected.observationCount.toLocaleString()}
                </span>
              )}
              {selected.rank && <Badge variant="outline" className="text-[8px] h-3.5 px-1">{selected.rank}</Badge>}
            </div>
          </div>
          {/* Mini gallery - desktop only */}
          {selected.photos && selected.photos.length > 1 && (
            <div className="hidden sm:flex gap-0.5">
              {selected.photos.slice(1, 5).map((photo, i) => (
                <div key={photo.id || i} className="relative w-[26px] h-[26px] rounded overflow-hidden bg-muted">
                  <Image src={photo.medium_url || photo.url} alt="" fill className="object-cover" sizes="26px" />
                </div>
              ))}
              {selected.photos.length > 5 && (
                <div className="w-[26px] h-[26px] rounded bg-muted/60 flex items-center justify-center text-[8px] text-muted-foreground">
                  +{selected.photos.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info column - desktop */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="hidden sm:block font-semibold text-base leading-tight truncate">{selected.commonName}</h3>
          <p className="hidden sm:block text-xs text-muted-foreground italic leading-tight">{selected.scientificName}</p>

          {/* Stats row - desktop */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
            {selected.observationCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                {selected.observationCount.toLocaleString()}
              </span>
            )}
            {selected.rank && <Badge variant="outline" className="text-[9px] h-4 px-1">{selected.rank}</Badge>}
            {sources.length > 0 && (
              <span className="flex items-center gap-0.5">
                <Database className="h-2.5 w-2.5" />
                {sources.join(", ")}
              </span>
            )}
          </div>

          {/* Description -- expanded for main species widget */}
          {selected.description && (
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs leading-relaxed text-foreground/80 line-clamp-6 sm:line-clamp-none">
                {selected.description}
              </p>
              {/* Additional habitat/characteristics if available */}
              {(selected as any).habitat && (
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                  <span className="font-medium">Habitat:</span> {(selected as any).habitat}
                </div>
              )}
              {(selected as any).distribution && (
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                  <span className="font-medium">Distribution:</span> {(selected as any).distribution}
                </div>
              )}
              {(selected as any).edibility && (
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                  <span className="font-medium">Edibility:</span> {(selected as any).edibility}
                </div>
              )}
            </div>
          )}
          {/* If no description, show a placeholder */}
          {!selected.description && (
            <p className="text-[10px] sm:text-xs leading-relaxed text-muted-foreground italic">
              Scientific classification: {selected.scientificName}
              {selected.rank && ` (${selected.rank})`}
              {selected.taxonomy?.family && ` — Family: ${selected.taxonomy.family}`}
            </p>
          )}

          {/* Action buttons -- compact, wrap on mobile */}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <Button asChild size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg">
              <a href={`/ancestry/explorer?search=${encodeURIComponent(selected.scientificName)}`}>
                Full Page <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg"
              onClick={() => setDetailSpecies(selected)}>
              <FileText className="h-2.5 w-2.5 mr-0.5" /> Details
            </Button>
            <Button variant="outline" size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg"
              onClick={() => onFocusWidget?.({ type: "chemistry", id: selected.scientificName })}>
              <Leaf className="h-2.5 w-2.5 mr-0.5" /> <span className="hidden xs:inline">Compounds</span><span className="xs:hidden">Chem</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg"
              onClick={() => onFocusWidget?.({ type: "genetics", id: selected.scientificName })}>
              <Dna className="h-2.5 w-2.5 mr-0.5" /> <span className="hidden xs:inline">Genetics</span><span className="xs:hidden">DNA</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg"
              onClick={() => onFocusWidget?.({ type: "ai" })}>
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
            </Button>
            {onAddToNotepad && (
              <Button variant="ghost" size="sm" className="h-7 sm:h-6 px-2.5 sm:px-2 text-[10px] rounded-lg"
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

        {/* Taxonomy column -- vertical breadcrumb, hidden on mobile */}
        {taxonomyLevels.length > 0 && (
          <div className="shrink-0 w-[130px] hidden lg:flex flex-col gap-0.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Taxonomy</p>
            {taxonomyLevels.map((level, index) => (
              <button key={level.label}
                className="flex items-center gap-1 text-[10px] hover:text-primary transition-colors text-left"
                onClick={() => onExplore?.("taxonomy", level.value)}
                style={{ paddingLeft: `${index * 6}px` }}>
                <ChevronRight className="h-2 w-2 text-muted-foreground/50 shrink-0" />
                <span className="text-muted-foreground">{level.label.slice(0, 3)}:</span>
                <span className="font-medium truncate">{level.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    {detailSpecies && (
      <SpeciesDetailModal species={detailSpecies} onClose={handleCloseDetail} />
    )}
  </>
  )
}

// ─── Species detail modal ─────────────────────────────────────────────────────

function SpeciesDetailModal({ species, onClose }: { species: SpeciesResult; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [mounted, onClose])

  useEffect(() => {
    if (!mounted) return
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = orig }
  }, [mounted])

  const url = mounted
    ? `/api/mindex/species/detail?name=${encodeURIComponent(species.scientificName)}`
    : null

  // System-wide hook — auto-retries until full description + photos arrive
  const { data, loading, retrying, error } = useAutoFetchDetail<any>({
    url,
    isIncomplete: (d) => !!d && !d.description && !d.photos?.length,
    maxAttempts: 6,
    baseDelay: 3000,
    maxDelay: 12000,
  })

  if (!mounted) return null

  const photos: any[] = data?.photos || []

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
          className="relative z-10 w-full max-w-xl flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl"
          style={{ maxHeight: "min(88vh, 660px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-white/8 shrink-0">
            <div className="p-2 bg-emerald-500/15 rounded-lg shrink-0">
              <Leaf className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm italic">{data?.name || species.scientificName}</h2>
              {(data?.common_name || species.commonName) && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data?.common_name || species.commonName}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 min-h-0">
            {loading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  Fetching from iNaturalist…
                </div>
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            )}
            {retrying && data && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading full species data…
              </div>
            )}
            {!loading && error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-sm text-destructive">Could not load species details</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            )}
            {!loading && data && (
              <>
                {/* Photo gallery */}
                {photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((p: any, i: number) => p.url && (
                      <div key={i} className="shrink-0 h-28 w-28 rounded-lg overflow-hidden bg-muted/30">
                        <Image src={p.url} alt={p.attribution || species.scientificName}
                          width={112} height={112} className="object-cover w-full h-full"
                          unoptimized />
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rank</p>
                    <p className="mt-1 text-sm font-semibold capitalize">{data.rank || "Species"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Observations</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {(data.observation_count || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm font-semibold capitalize">
                      {data.conservation_status || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {data.description && (
                  <div className="rounded-lg bg-muted/30 border border-white/6 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Wikipedia Summary</p>
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-8">{data.description}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/8">
            {data?.source_url ? (
              <a href={data.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-400 transition-colors">
                <Database className="h-3.5 w-3.5" />
                Open in iNaturalist
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : <div />}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

export default SpeciesWidget
