/**
 * ChemistryWidget - Feb 2026
 *
 * CONSOLIDATED: Shows ALL compound results in a single widget.
 * Internal card navigation, sources section.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FlaskConical,
  Activity,
  Dna,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  GripVertical,
  FileText,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react"
import type { CompoundResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useAutoFetchDetail } from "@/hooks/useAutoFetchDetail"

interface ChemistryWidgetProps {
  data: CompoundResult | CompoundResult[]
  isFocused: boolean
  isLoading?: boolean
  /** Pre-select a specific compound by ID or name (from notepad restore) */
  focusedId?: string
  onExplore?: (type: string, id: string) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
}

function ChemistryLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Compound tabs skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      {/* Main compound info skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        {/* Bioactivity skeleton */}
        <div className="flex gap-2 flex-wrap mt-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ChemistryWidget({
  data,
  isFocused,
  isLoading = false,
  focusedId,
  onExplore,
  onFocusWidget,
  onAddToNotepad,
  className,
}: ChemistryWidgetProps) {
  const items = Array.isArray(data) ? data : [data]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showSources, setShowSources] = useState(false)
  const [detailCompound, setDetailCompound] = useState<CompoundResult | null>(null)
  const handleCloseDetail = useCallback(() => setDetailCompound(null), [])

  // When focusedId changes, find and select that compound
  useEffect(() => {
    if (focusedId && items.length > 0) {
      const idx = items.findIndex(
        (c) => c.id === focusedId || c.name?.toLowerCase() === focusedId.toLowerCase()
      )
      if (idx >= 0) setSelectedIndex(idx)
    }
  }, [focusedId]) // eslint-disable-line

  // Loading state check AFTER all hooks
  if (isLoading) {
    return <ChemistryLoadingSkeleton />
  }

  const selected = items[selectedIndex] || items[0]
  
  // Empty state - no compounds found
  if (!selected || items.length === 0) {
    return (
      <div className={cn("space-y-3 text-center py-6", className)}>
        <div className="p-3 bg-purple-500/10 rounded-lg w-fit mx-auto">
          <FlaskConical className="h-6 w-6 text-purple-500/50" />
        </div>
        <div>
          <h3 className="font-medium text-muted-foreground">No Compounds Found</h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try a different search term or check MINDEX for available compound data.
          </p>
        </div>
      </div>
    )
  }

  const sources = items.map((c: any) => c._source || "Unknown").filter(Boolean)
  const uniqueSources = [...new Set(sources)]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/search-widget",
      JSON.stringify({
        type: "compound",
        title: selected.name,
        content: `${selected.formula} - ${selected.chemicalClass}`,
        source: (selected as any)._source || "Search",
      })
    )
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <>
    <div className={cn("space-y-3", className)} draggable onDragStart={handleDragStart}>
      {/* Compound tabs */}
      {items.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {items.map((c, i) => (
            <button
              key={c.id || i}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "px-2 py-1 rounded-xl text-xs shrink-0 transition-all border backdrop-blur-sm",
                i === selectedIndex
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400 font-medium shadow-sm"
                  : "bg-card/40 border-white/5 hover:bg-card/60 hover:shadow-sm"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Selected compound header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
          <FlaskConical className="h-5 w-5 text-purple-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">{selected.name}</h3>
          {selected.formula && (
            <p className="text-sm font-mono text-muted-foreground">{selected.formula}</p>
          )}
        </div>
      </div>

      {selected.chemicalClass && (
        <Badge variant="secondary" className="text-xs">{selected.chemicalClass}</Badge>
      )}

      {/* Expanded view */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4"
        >
          {selected.molecularWeight > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Molecular Weight:</span>
              <span className="font-mono">{selected.molecularWeight.toFixed(2)} g/mol</span>
            </div>
          )}

          {selected.biologicalActivity?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Biological Activity
              </h4>
              <div className="flex flex-wrap gap-1">
                {selected.biologicalActivity.map((activity, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{activity}</Badge>
                ))}
              </div>
            </div>
          )}

          {selected.sourceSpecies?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Dna className="h-3 w-3" />
                Found In
              </h4>
              <div className="flex flex-wrap gap-1">
                {selected.sourceSpecies.map((species, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs italic"
                    onClick={() => onFocusWidget?.({ type: "species", id: species })}
                  >
                    {species}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selected.structure && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">Structure (SMILES)</h4>
              <code className="text-xs break-all">{selected.structure}</code>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onFocusWidget?.({ type: "research", id: selected.name })}
            >
              <FileText className="h-3 w-3 mr-1" />
              Related Research
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailCompound(selected)}
            >
              <FileText className="h-3 w-3 mr-1" />
              View full details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFocusWidget?.({ type: "ai" })}
            >
              Ask MYCA about {selected.name}
            </Button>
            {onAddToNotepad && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onAddToNotepad({
                    type: "compound",
                    title: selected.name,
                    content: `${selected.formula} - ${selected.chemicalClass}`,
                    source: (selected as any)._source,
                  })
                }
              >
                <GripVertical className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>

          {/* Sources */}
          {uniqueSources.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                <Database className="h-3 w-3 mr-1" />
                Sources ({uniqueSources.length})
              </Button>
              {showSources && (
                <div className="flex flex-wrap gap-1 mt-1 pl-4">
                  {uniqueSources.map((src) => (
                    <Badge key={src} variant="outline" className="text-[10px]">{src}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
    {/* Compound detail portal modal */}
    {detailCompound && (
      <CompoundDetailModal compound={detailCompound} onClose={handleCloseDetail} />
    )}
  </>
  )
}

// ─── Compound detail modal ────────────────────────────────────────────────────

function CompoundDetailModal({ compound, onClose }: { compound: CompoundResult; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [mounted, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!mounted) return
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = orig }
  }, [mounted])

  const url = mounted
    ? `/api/mindex/compounds/detail?name=${encodeURIComponent(compound.name)}`
    : null

  // Uses same system-wide hook — auto-retries until full data arrives
  const { data, loading, retrying, error } = useAutoFetchDetail<any>({
    url,
    // "Incomplete" = IUPAC name or formula is missing (PubChem wasn't reached yet)
    isIncomplete: (d) => !!d && !d.molecular_formula && !d.iupac_name,
    maxAttempts: 6,
    baseDelay: 3000,
    maxDelay: 12000,
  })

  if (!mounted) return null

  const modal = (
    <AnimatePresence>
      <motion.div
        key="compound-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
        <motion.div
          key="compound-modal-panel"
          initial={{ opacity: 0, scale: 0.97, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative z-10 w-full max-w-xl flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl"
          style={{ maxHeight: "min(88vh, 640px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-white/8 shrink-0">
            <div className="p-2 bg-purple-500/15 rounded-lg shrink-0">
              <FlaskConical className="h-4 w-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm">{data?.name || compound.name}</h2>
              {data?.molecular_formula && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{data.molecular_formula}</p>
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
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  Fetching from PubChem…
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              </div>
            )}
            {retrying && data && (
              <div className="flex items-center gap-2 text-xs text-purple-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Fetching full details from PubChem…
              </div>
            )}
            {!loading && error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-sm text-destructive">Could not load compound details</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            )}
            {!loading && data && (
              <>
                {data.description && (
                  <div className="rounded-lg bg-muted/30 border border-white/6 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{data.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {data.iupac_name && (
                    <div className="col-span-2 rounded-lg bg-muted/20 border border-white/6 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">IUPAC Name</span>
                      <p className="mt-0.5 font-mono text-[11px] break-all">{data.iupac_name}</p>
                    </div>
                  )}
                  {[
                    { label: "Formula", value: data.molecular_formula },
                    { label: "Weight", value: data.molecular_weight ? `${data.molecular_weight} g/mol` : null },
                    { label: "XLogP", value: data.xlogp },
                    { label: "H-Bond Donors", value: data.h_bond_donors },
                    { label: "H-Bond Acceptors", value: data.h_bond_acceptors },
                    { label: "Rotatable Bonds", value: data.rotatable_bonds },
                  ].filter(f => f.value != null).map(f => (
                    <div key={f.label} className="rounded-lg bg-muted/20 border border-white/6 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</span>
                      <p className="mt-0.5 font-semibold">{String(f.value)}</p>
                    </div>
                  ))}
                </div>
                {data.canonical_smiles && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">SMILES</p>
                    <pre className="text-[10px] font-mono bg-black/40 border border-white/8 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {data.canonical_smiles}
                    </pre>
                  </div>
                )}
                {data.synonyms?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Synonyms</p>
                    <div className="flex flex-wrap gap-1">
                      {data.synonyms.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/8">
            {data?.source_url ? (
              <a href={data.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-purple-400 transition-colors">
                <Database className="h-3.5 w-3.5" />
                Open in PubChem
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

export default ChemistryWidget
