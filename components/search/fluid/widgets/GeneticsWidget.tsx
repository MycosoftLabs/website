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
} from "lucide-react"
import type { GeneticsResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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

function GeneticsCard({
  item,
  isExpanded,
  onViewDetails,
}: {
  item: GeneticsResult
  isExpanded: boolean
  onViewDetails: (item: GeneticsResult) => void
}) {
  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium truncate flex-1 italic" title={item.speciesName}>
          {item.speciesName || "Unknown species"}
        </p>
        {item.accession && (
          <Badge variant="outline" className="text-[10px] font-mono shrink-0 tabular-nums">
            {item.accession}
          </Badge>
        )}
      </div>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={() => onViewDetails(item)}
          >
            <FileText className="h-3 w-3 mr-1.5" />
            View details
          </Button>
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
  const [detail, setDetail] = useState<GeneticsDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  // Fetch detail (MINDEX → ingest → NCBI direct with full sequence)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setSeqExpanded(false)

    const acc = item.accession
    const params = acc
      ? `accession=${encodeURIComponent(acc)}`
      : `id=${encodeURIComponent(String(item.id))}`

    fetch(`/api/mindex/genetics/detail?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Sequence not found" : `Error ${res.status}`)
        return res.json()
      })
      .then((data: GeneticsDetail) => { if (!cancelled) setDetail(data) })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [item.id, item.accession])

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
              <h2 className="font-semibold text-sm leading-snug italic truncate">
                {detail?.organism || detail?.species_name || item.speciesName || "Genetic Sequence"}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-[11px] text-muted-foreground">
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

          {/* ── Scrollable body ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 min-h-0">

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
                {hasSequence ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Nucleotide sequence
                        <span className="ml-2 text-green-400 font-semibold">
                          {detail!.sequence_length.toLocaleString()} bp
                        </span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(detail!.sequence)}
                      >
                        {copied ? (
                          <><Check className="h-3 w-3 mr-1 text-green-400" />Copied</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" />Copy</>
                        )}
                      </Button>
                    </div>
                    <pre className="text-[11px] font-mono bg-black/40 border border-white/8 rounded-lg p-3 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all leading-relaxed max-h-48 select-all">
                      {displaySeq}
                      {isTruncated && <span className="text-muted-foreground">…</span>}
                    </pre>
                    {isTruncated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] w-full"
                        onClick={() => setSeqExpanded(true)}
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show full sequence ({detail!.sequence_length.toLocaleString()} bp)
                      </Button>
                    )}
                    {seqExpanded && detail!.sequence.length > seqPreviewLen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] w-full"
                        onClick={() => setSeqExpanded(false)}
                      >
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Collapse sequence
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-3">
                    <p className="text-xs text-amber-400">
                      Sequence is being fetched from GenBank and will be available on next open.
                    </p>
                    {detail.source_url && (
                      <a
                        href={detail.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View full record on GenBank
                      </a>
                    )}
                  </div>
                )}
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
    </>
  )
}

export default GeneticsWidget
