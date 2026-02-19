/**
 * ChemistryWidget - Feb 2026
 *
 * CONSOLIDATED: Shows ALL compound results in a single widget.
 * Internal card navigation, sources section.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchContext } from "@/components/search/SearchContextProvider"
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
  Copy,
  Check,
  Globe,
} from "lucide-react"
import type { CompoundResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useAutoFetchDetail } from "@/hooks/useAutoFetchDetail"
import { MoleculeViewer } from "@/components/visualizations/MoleculeViewer"
import { useSpeciesObservations } from "@/hooks/useSpeciesObservations"
import dynamic from "next/dynamic"
const ObservationEarthPortal = dynamic(
  () => import("./ObservationEarthPortal"),
  { ssr: false }
)

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

/**
 * Clickable list of species that produce a compound.
 * Clicking a species name emits the "navigate-to-species" event so the Species
 * widget expands and shows that specific fungus — no page navigation needed.
 */
function SourceSpeciesList({
  species,
  onFocusWidget,
  onViewOnEarth,
}: {
  species: string[]
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onViewOnEarth?: (sp: string) => void
}) {
  const ctx = useSearchContext()
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Dna className="h-3 w-3" />
        Found In — click to explore
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {species.map((sp, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <button
              className="h-6 px-2.5 text-xs italic rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer"
              onClick={() => {
                ctx.emit("navigate-to-species", { name: sp })
                onFocusWidget?.({ type: "species", id: sp })
              }}
              title={`Show ${sp} in Species widget`}
            >
              {sp}
            </button>
            <button
              className="h-6 w-6 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-colors cursor-pointer flex items-center justify-center"
              onClick={() => onViewOnEarth?.(sp)}
              title={`View ${sp} on Earth`}
            >
              <Globe className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
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
  const [earthSpecies, setEarthSpecies] = useState<string | null>(null)

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
            Try a different search term or fetch from PubChem/MINDEX.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
          onClick={() => ctx.emit("refresh-search")}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Fetch from source
        </Button>
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
    <div className={cn("space-y-3 overflow-hidden", className)} draggable onDragStart={handleDragStart}>
      {/* Compound tabs */}
      {items.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 min-w-0 max-w-full">
          {items.map((c, i) => (
            <button
              key={c.id || i}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "px-2 py-1 rounded-xl text-xs shrink-0 transition-all border backdrop-blur-sm",
                i === selectedIndex
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400 font-medium shadow-sm"
                  : "bg-card/40 border-border hover:bg-card/60 hover:shadow-sm"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Selected compound header with molecule structure */}
      <div className="flex items-start gap-3">
        {/* 2D molecule structure — fetched from PubChem */}
        <div className="shrink-0">
          <MoleculeViewer name={selected.name} size="sm" />
        </div>
        <div className="min-w-0 overflow-hidden flex-1">
          <h3 className="font-semibold text-base break-words leading-snug">{selected.name}</h3>
          {selected.formula && (
            <p className="text-sm font-mono text-muted-foreground break-all">{selected.formula}</p>
          )}
          {selected.molecularWeight > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{Number(selected.molecularWeight || 0).toFixed(2)} g/mol</p>
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
            <SourceSpeciesList
              species={selected.sourceSpecies}
              onFocusWidget={onFocusWidget}
              onViewOnEarth={(sp) => setEarthSpecies(sp)}
            />
          )}

          {selected.structure && (
            <div className="p-3 bg-muted rounded-lg overflow-hidden">
              <h4 className="text-xs font-medium mb-2">Structure (SMILES)</h4>
              <code className="text-xs break-all w-full block">{selected.structure}</code>
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

    {/* Earth observation portal for source species */}
    {earthSpecies && (
      <ChemistryEarthPortalLoader
        speciesName={earthSpecies}
        compoundName={selected.name}
        onClose={() => setEarthSpecies(null)}
      />
    )}
  </>
  )
}

// ─── Compound detail modal ────────────────────────────────────────────────────

function PropTile({ label, value, wide }: { label: string; value: string | number | null | undefined; wide?: boolean }) {
  if (value == null || value === "") return null
  return (
    <div className={cn("rounded-lg bg-muted/20 border border-border px-3 py-2.5", wide && "col-span-2")}>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
      <p className="mt-0.5 text-sm font-semibold break-all leading-tight">{String(value)}</p>
    </div>
  )
}

function LipinskiBadge({ violations }: { violations: number | null | undefined }) {
  if (violations == null) return null
  const ok = violations === 0
  const warn = violations === 1
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border",
      ok   && "bg-green-500/10 text-green-400 border-green-500/25",
      warn && "bg-amber-500/10 text-amber-400 border-amber-500/25",
      !ok && !warn && "bg-red-500/10 text-red-400 border-red-500/25",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-green-400" : warn ? "bg-amber-400" : "bg-red-400")} />
      {ok ? "Drug-like" : warn ? "1 Lipinski violation" : `${violations} Lipinski violations`}
    </div>
  )
}

function CompoundDetailModal({ compound, onClose }: { compound: CompoundResult; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [showSMILES, setShowSMILES] = useState(false)
  const [copiedSmiles, setCopiedSmiles] = useState(false)
  const [copiedInchi, setCopiedInchi] = useState(false)

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

  const url = mounted ? `/api/mindex/compounds/detail?name=${encodeURIComponent(compound.name)}` : null

  const { data, loading, retrying, error } = useAutoFetchDetail<any>({
    url,
    isIncomplete: (d) => !!d && !d.molecular_formula && !d.iupac_name,
    maxAttempts: 6,
    baseDelay: 3000,
    maxDelay: 12000,
  })

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!mounted) return null

  // Use common name (from search result) as primary title; IUPAC as technical subtitle
  const displayName = data?.name || compound.name
  const formula = data?.molecular_formula || compound.formula

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
          className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ maxHeight: "min(90vh, 700px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
            <div className="p-2 bg-purple-500/15 rounded-lg shrink-0 mt-0.5">
              <FlaskConical className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Common name — large and clear */}
              <h2 className="font-bold text-base leading-tight">{displayName}</h2>
              {/* Formula as subtitle */}
              {formula && (
                <p className="font-mono text-sm text-purple-300 mt-0.5">{formula}</p>
              )}
              {/* ID badges */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {data?.cid && (
                  <span className="text-[10px] rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 font-mono">
                    CID {data.cid}
                  </span>
                )}
                {data?.cas_number && (
                  <span className="text-[10px] rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 font-mono">
                    CAS {data.cas_number}
                  </span>
                )}
                <LipinskiBadge violations={data?.lipinski_violations} />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────── */}
          <div data-widget-detail className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0">

            {/* Loading */}
            {loading && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  Fetching compound data from PubChem…
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-[200px] w-[200px] rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="px-5 py-6">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm text-destructive font-medium">Could not load compound details</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Retrying indicator */}
            {retrying && data && (
              <div className="px-5 pt-3 flex items-center gap-2 text-xs text-purple-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading additional properties…
              </div>
            )}

            {/* ── Full data layout ────────────────────────────────── */}
            {!loading && data && (
              <div className="px-5 py-4 space-y-5">

                {/* Structure + core identity — side by side on wider modal */}
                <div className="flex gap-4 items-start">
                  {/* Molecule image — clean white card */}
                  <div className="shrink-0">
                    <MoleculeViewer
                      name={displayName}
                      cid={data.cid}
                      size="md"
                    />
                  </div>

                  {/* Core properties column */}
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <PropTile label="Mol. Weight" value={data.molecular_weight ? `${Number(data.molecular_weight).toFixed(3)} g/mol` : null} />
                    <PropTile label="Exact Mass" value={data.exact_mass ? `${Number(data.exact_mass).toFixed(4)}` : null} />
                    <PropTile label="XLogP (Lipophilicity)" value={data.xlogp ?? null} />
                    <PropTile label="TPSA" value={data.tpsa ? `${data.tpsa} Å²` : null} />
                    <PropTile label="H-Bond Donors" value={data.h_bond_donors ?? null} />
                    <PropTile label="H-Bond Acceptors" value={data.h_bond_acceptors ?? null} />
                    <PropTile label="Rotatable Bonds" value={data.rotatable_bonds ?? null} />
                    <PropTile label="Heavy Atoms" value={data.heavy_atom_count ?? null} />
                  </div>
                </div>

                {/* Description */}
                {data.description && (
                  <div className="rounded-lg bg-muted/20 border border-border px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">About</p>
                    <p className="text-xs text-foreground/85 leading-relaxed">{data.description}</p>
                  </div>
                )}

                {/* Stereochemistry + structure */}
                {(data.atom_stereo_count != null || data.bond_stereo_count != null || data.complexity != null || data.charge != null) && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Structure</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <PropTile label="Stereocenters" value={data.atom_stereo_count ?? null} />
                      <PropTile label="Stereo Bonds" value={data.bond_stereo_count ?? null} />
                      <PropTile label="Complexity" value={data.complexity ?? null} />
                      <PropTile label="Formal Charge" value={data.charge ?? null} />
                    </div>
                  </div>
                )}

                {/* IUPAC name — shown separately, clearly labelled */}
                {data.iupac_name && (
                  <div className="rounded-lg bg-muted/20 border border-border px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1">IUPAC Systematic Name</p>
                    <p className="text-xs font-mono break-words leading-relaxed text-foreground/80">{data.iupac_name}</p>
                  </div>
                )}

                {/* Structure identifiers — collapsible */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/4 transition-colors"
                    onClick={() => setShowSMILES(v => !v)}
                  >
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Structure Identifiers</p>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showSMILES && "rotate-180")} />
                  </button>
                  {showSMILES && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border">
                      {(data.isomeric_smiles || data.canonical_smiles) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">SMILES</p>
                            <button
                              className="text-[9px] text-muted-foreground hover:text-purple-400 flex items-center gap-1"
                              onClick={() => copyText(data.isomeric_smiles || data.canonical_smiles, setCopiedSmiles)}
                            >
                              {copiedSmiles ? <><Check className="h-2.5 w-2.5 text-green-400" />Copied</> : <><Copy className="h-2.5 w-2.5" />Copy</>}
                            </button>
                          </div>
                          <pre className="text-[10px] font-mono bg-black/40 rounded-lg p-2 whitespace-pre-wrap break-all">
                            {data.isomeric_smiles || data.canonical_smiles}
                          </pre>
                        </div>
                      )}
                      {data.inchi_key && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">InChIKey</p>
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono bg-black/40 rounded px-2 py-1 flex-1 break-all">{data.inchi_key}</code>
                            <button onClick={() => copyText(data.inchi_key, setCopiedInchi)} className="text-muted-foreground hover:text-purple-400 shrink-0">
                              {copiedInchi ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {data.inchi && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">InChI</p>
                          <pre className="text-[10px] font-mono bg-black/40 rounded-lg p-2 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                            {data.inchi}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Synonyms */}
                {data.synonyms?.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                      Also known as <span className="normal-case font-normal">({data.synonyms.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.synonyms.slice(0, 8).map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-muted/30 border border-border rounded-lg px-2 py-0.5 break-words max-w-full text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border">
            {data?.source_url ? (
              <a href={data.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-purple-400 transition-colors">
                <Database className="h-3.5 w-3.5" />
                View on PubChem
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

function ChemistryEarthPortalLoader({
  speciesName,
  compoundName,
  onClose,
}: {
  speciesName: string
  compoundName: string
  onClose: () => void
}) {
  const { observations, loading } = useSpeciesObservations(speciesName, 20)
  return (
    <ObservationEarthPortal
      observations={loading ? [] : observations}
      title={`${speciesName} — Source of ${compoundName}`}
      onClose={onClose}
    />
  )
}

export default ChemistryWidget
