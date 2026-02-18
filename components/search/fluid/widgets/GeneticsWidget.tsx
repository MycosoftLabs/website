/**
 * GeneticsWidget - Feb 2026
 *
 * List view inside the search widget. "View details" opens a portal modal that:
 *   - Renders at document.body (never clipped by the widget container)
 *   - Locks page scroll while open
 *   - Always shows the full nucleotide sequence (fetched live from NCBI if not in MINDEX)
 *   - Stores the sequence to MINDEX in the background so next open is instant
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useSearchContext } from "@/components/search/SearchContextProvider"
import { useSpeciesObservations } from "@/hooks/useSpeciesObservations"
import dynamic from "next/dynamic"
const ObservationEarthPortal = dynamic(
  () => import("./ObservationEarthPortal"),
  { ssr: false }
)
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dna,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Globe,
} from "lucide-react"
import type { GeneticsResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useAutoFetchDetail } from "@/hooks/useAutoFetchDetail"
import { DNAColorBar, DNASequenceViewer } from "@/components/visualizations/DNASequenceViewer"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneticsWidgetProps {
  data: GeneticsResult | GeneticsResult[]
  isFocused: boolean
  focusedId?: string | null
  isLoading?: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

interface GeneticsDetail {
  id: number
  accession: string
  species_name: string | null
  gene: string | null
  region: string | null
  sequence: string
  sequence_length: number
  sequence_type: string | null
  source: string
  source_url: string | null
  definition: string | null
  organism: string | null
  pubmed_id: number | null
  doi: string | null
  _source?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = original }
  }, [active])
}

function useCopyToClipboard(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])
  return [copied, copy]
}

function extractGeneFromDefinition(definition: string): string {
  const m = definition.match(/\b(ITS[12]?|LSU|SSU|RPB[12]|TEF1|COI|18S|28S|5\.8S)\b/i)
  return m ? m[1].toUpperCase() : ""
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function GeneticsLoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="p-3 bg-muted/30 rounded-lg space-y-2">
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── List card ───────────────────────────────────────────────────────────────

// Placeholder color bar when no real sequence is available yet
// Uses a synthetic sequence derived from the GC content hint or just a demo
function GCColorBar({ sequenceLength, gcContent }: { sequenceLength: number; gcContent?: number | null }) {
  // Synthesize a representative bar from GC% (for list preview)
  const gc = gcContent != null ? gcContent : 0.5
  const len = Math.min(sequenceLength, 80)
  const synth = Array.from({ length: len }, (_, i) => {
    const r = Math.sin(i * 73.137 + gc * 1000) * 0.5 + 0.5 // deterministic pseudo-random
    if (r < gc * 0.5) return "G"
    if (r < gc) return "C"
    if (r < gc + (1 - gc) * 0.5) return "A"
    return "T"
  }).join("")
  return <DNAColorBar sequence={synth} maxBases={80} height={5} />
}

function GeneticsCard({
  item,
  isExpanded,
  onViewDetails,
  onViewOnEarth,
}: {
  item: GeneticsResult
  isExpanded: boolean
  onViewDetails: (item: GeneticsResult) => void
  onViewOnEarth?: (speciesName: string) => void
}) {
  const ctx = useSearchContext()
  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        {/* Species name is clickable — opens species widget with this organism */}
        <button
          className="text-sm font-medium truncate flex-1 italic text-left hover:text-green-400 transition-colors cursor-pointer"
          title={item.speciesName ? `Show ${item.speciesName} in Species widget` : undefined}
          onClick={() => {
            if (item.speciesName) {
              ctx.emit("navigate-to-species", { name: item.speciesName })
            }
          }}
        >
          {item.speciesName || "Unknown species"}
        </button>
        {item.accession && (
          <Badge variant="outline" className="text-[10px] font-mono shrink-0 tabular-nums">
            {item.accession}
          </Badge>
        )}
      </div>
      {/* DNA color bar preview for every card */}
      {item.sequenceLength > 0 && (
        <GCColorBar sequenceLength={item.sequenceLength} gcContent={item.gcContent} />
      )}
      <div className="flex flex-wrap gap-1.5">
        {item.geneRegion && (
          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
            {item.geneRegion}
          </Badge>
        )}
        {item.sequenceLength > 0 && (
          <Badge variant="secondary" className="text-xs">
            {item.sequenceLength.toLocaleString()} bp
          </Badge>
        )}
        {item.gcContent != null && (
          <Badge variant="secondary" className="text-xs">
            GC {typeof item.gcContent === "number" ? `${(item.gcContent * 100).toFixed(1)}%` : item.gcContent}
          </Badge>
        )}
      </div>
      {isExpanded && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={() => onViewDetails(item)}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              View details
            </Button>
            {item.speciesName && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                onClick={() => onViewOnEarth?.(item.speciesName)}
                title={`View ${item.speciesName} observations on Earth`}
              >
                <Globe className="h-3 w-3 mr-1" />
                Earth
              </Button>
            )}
          </div>
          {item.source && (
            <span className="text-[10px] text-muted-foreground">via {item.source}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail overlay modal ─────────────────────────────────────────────────────

function GeneticsDetailModal({
  item,
  onClose,
}: {
  item: GeneticsResult
  onClose: () => void
}) {
  const [seqExpanded, setSeqExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, copyToClipboard] = useCopyToClipboard()

  useEffect(() => { setMounted(true) }, [])
  useBodyScrollLock(mounted)

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Build the detail URL
  const acc = item.accession
  const detailUrl = mounted
    ? acc
      ? `/api/mindex/genetics/detail?accession=${encodeURIComponent(acc)}`
      : `/api/mindex/genetics/detail?id=${encodeURIComponent(String(item.id))}`
    : null

  /**
   * useAutoFetchDetail handles:
   *  1. Initial fetch of the detail record
   *  2. Auto-retry with exponential backoff when sequence is missing
   *  3. Live update of the modal when the sequence finally arrives
   *     (from NCBI or from MINDEX after background ingest completes)
   *
   * This is the system-wide pattern — same hook used for chemistry and taxonomy.
   */
  const { data: detail, loading, retrying, attempt, gaveUp, error } =
    useAutoFetchDetail<GeneticsDetail>({
      url: detailUrl,
      // Sequence is "incomplete" when we have length metadata but not the actual bases
      isIncomplete: (d) => !!d && !d.sequence && (d.sequence_length ?? 0) > 0,
      maxAttempts: 8,
      baseDelay: 2500,
      maxDelay: 12000,
    })

  if (!mounted) return null

  const hasSequence = !!detail?.sequence
  const seqPreviewLen = 480
  const displaySeq = hasSequence
    ? seqExpanded
      ? detail!.sequence
      : detail!.sequence.slice(0, seqPreviewLen)
    : ""
  const isTruncated = hasSequence && detail!.sequence.length > seqPreviewLen && !seqExpanded

  // Gene region: prefer explicit field, fall back to extracting from definition
  const geneRegion = detail?.gene || detail?.region ||
    (detail?.definition ? extractGeneFromDefinition(detail.definition) : "") ||
    item.geneRegion

  const modal = (
    <AnimatePresence>
      <motion.div
        key="genetics-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        {/* Panel — fixed height, scrolls internally, never overflows viewport */}
        <motion.div
          key="genetics-modal-panel"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative z-10 w-full max-w-xl flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl"
          style={{ maxHeight: "min(88vh, 640px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-white/8 shrink-0">
            <div className="mt-0.5 p-2 bg-green-500/15 rounded-lg shrink-0">
              <Dna className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Species name in modal header: clicking shows it in Species widget */}
              <button
                className="font-semibold text-sm leading-snug italic truncate block text-left hover:text-green-400 transition-colors w-full"
                title="Click to show in Species widget"
                onClick={() => {
                  const sName = detail?.organism || detail?.species_name || item.speciesName
                  if (sName) {
                    try {
                      // Access event bus via a custom window event (safe SSR fallback)
                      window.dispatchEvent(new CustomEvent("mycosoft:navigate-to-species", { detail: { name: sName } }))
                    } catch {}
                  }
                }}
              >
                {detail?.organism || detail?.species_name || item.speciesName || "Genetic Sequence"}
              </button>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-[11px] text-muted-foreground break-all">
                  {detail?.accession || item.accession}
                </span>
                {geneRegion && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-400 border-green-500/25">
                    {geneRegion}
                  </Badge>
                )}
                {detail?.sequence_type && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                    {detail.sequence_type}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Scrollable body — overflow-x-hidden prevents horizontal bleed ─ */}
          <div data-widget-detail className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 space-y-4 min-h-0">

            {/* Loading state */}
            {loading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                  <span>Fetching sequence from GenBank…</span>
                </div>
                <Skeleton className="h-5 w-4/5 rounded" />
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Could not load sequence</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                {item.accession && (
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/nuccore/${item.accession}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on GenBank
                  </a>
                )}
              </div>
            )}

            {/* Retry indicator — subtle banner when the hook is re-fetching in the background */}
            {retrying && detail && (
              <div className="flex items-center gap-2 text-xs text-blue-400 px-1">
                <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                Pulling sequence from GenBank…
              </div>
            )}

            {/* Detail content */}
            {!loading && detail && (
              <>
                {/* Definition — shown as a tidy annotation pill */}
                {detail.definition && (
                  <div className="rounded-lg bg-muted/30 border border-white/6 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      NCBI Definition
                    </p>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {detail.definition}
                    </p>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Length</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {detail.sequence_length.toLocaleString()}
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">bp</span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</p>
                    <p className="mt-1 text-sm font-semibold uppercase">{detail.sequence_type || "DNA"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Source</p>
                    <p className="mt-1 text-sm font-semibold">{detail.source}</p>
                  </div>
                </div>

                {/* Organism row */}
                {detail.organism && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 shrink-0">Organism</span>
                    <span className="text-sm italic">{detail.organism}</span>
                  </div>
                )}

                {/* PubMed link */}
                {detail.pubmed_id && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 shrink-0">PubMed</span>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${detail.pubmed_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1"
                    >
                      {detail.pubmed_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Nucleotide sequence */}
                {/* Auto-retry notice — shown while sequence is being pulled from NCBI/MINDEX */}
                {!hasSequence && detail!.sequence_length > 0 && (
                  <div className={cn(
                    "rounded-lg border px-3 py-3 space-y-1.5",
                    gaveUp
                      ? "bg-muted/20 border-border/30"
                      : "bg-blue-500/8 border-blue-500/20"
                  )}>
                    {!gaveUp ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                        <p className="text-xs text-blue-300">
                          Pulling sequence from GenBank
                          {attempt > 0 ? ` (attempt ${attempt + 1})` : ""}…
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sequence temporarily unavailable from GenBank.
                      </p>
                    )}
                    {detail!.source_url && (
                      <a
                        href={detail!.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View full record on GenBank
                      </a>
                    )}
                  </div>
                )}

                {/* Full DNA sequence visualization with color map, composition, and colored text */}
                {hasSequence ? (
                  <DNASequenceViewer
                    sequence={detail!.sequence}
                    textPreview={480}
                    maxBarBases={300}
                  />
                ) : null /* sequence missing notice is rendered above */}
              </>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/8">
            {detail?.source_url ? (
              <a
                href={detail.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-400 transition-colors"
              >
                <Database className="h-3.5 w-3.5" />
                Open in GenBank
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : <div />}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function GeneticsWidget({
  data,
  isFocused,
  isLoading = false,
  onExplore,
  className,
}: GeneticsWidgetProps) {
  const items = Array.isArray(data) ? data : (data?.id ? [data] : [])
  const [modalItem, setModalItem] = useState<GeneticsResult | null>(null)
  const [earthSpecies, setEarthSpecies] = useState<string | null>(null)

  const handleViewDetails = useCallback((item: GeneticsResult) => {
    setModalItem(item)
    onExplore?.("genetics", String(item.id))
  }, [onExplore])

  const handleCloseModal = useCallback(() => setModalItem(null), [])

  if (isLoading) return <GeneticsLoadingSkeleton />

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="p-3 bg-green-500/10 rounded-xl mb-3">
          <Dna className="h-6 w-6 text-green-500/50" />
        </div>
        <h3 className="font-medium text-sm text-muted-foreground">No Genetic Data</h3>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          Try a specific species name or GenBank accession number.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="p-1.5 bg-green-500/10 rounded-lg">
            <Dna className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-semibold text-sm flex-1 min-w-0">Genetic Sequences</h3>
          <Badge variant="outline" className="text-xs tabular-nums">
            {items.length} {items.length === 1 ? "sequence" : "sequences"}
          </Badge>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-auto space-y-2">
          {items.slice(0, isFocused ? 8 : 3).map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <GeneticsCard
                item={item}
                isExpanded={isFocused}
                onViewDetails={handleViewDetails}
                onViewOnEarth={(sp) => setEarthSpecies(sp)}
              />
            </motion.div>
          ))}
          {items.length > (isFocused ? 8 : 3) && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{items.length - (isFocused ? 8 : 3)} more sequences
            </p>
          )}
        </div>
      </div>

      {/* Portal modal — independent of widget layout */}
      {modalItem && (
        <GeneticsDetailModal item={modalItem} onClose={handleCloseModal} />
      )}

      {/* Earth observation portal for this organism */}
      {earthSpecies && (
        <GeneticsEarthPortalLoader
          speciesName={earthSpecies}
          onClose={() => setEarthSpecies(null)}
        />
      )}
    </>
  )
}

function GeneticsEarthPortalLoader({
  speciesName,
  onClose,
}: {
  speciesName: string
  onClose: () => void
}) {
  const { observations, loading } = useSpeciesObservations(speciesName, 20)
  return (
    <ObservationEarthPortal
      observations={loading ? [] : observations}
      title={`${speciesName} — Sequence Collection Sites`}
      onClose={onClose}
    />
  )
}

export default GeneticsWidget
