/**
 * SpeciesWidget - Feb 2026
 *
 * Dense, dashboard-style species card.
 * Shows everything at a glance -- no scrolling needed.
 * Horizontal layout: photo left, info center, taxonomy/actions right.
 * Species strip at top for switching between results.
 */

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
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
} from "lucide-react"
import type { SpeciesResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"

interface SpeciesWidgetProps {
  data: SpeciesResult | SpeciesResult[]
  isFocused: boolean
  focusedId?: string
  onExplore?: (type: string, id: string) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
}

export function SpeciesWidget({
  data,
  isFocused,
  focusedId,
  onExplore,
  onFocusWidget,
  onAddToNotepad,
  className,
}: SpeciesWidgetProps) {
  const items = Array.isArray(data) ? data : [data]
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (focusedId && items.length > 0) {
      const idx = items.findIndex(
        (s) =>
          s.id === focusedId ||
          s.commonName?.toLowerCase() === focusedId.toLowerCase() ||
          s.scientificName?.toLowerCase() === focusedId.toLowerCase()
      )
      if (idx >= 0) setSelectedIndex(idx)
    }
  }, [focusedId]) // eslint-disable-line

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
    )
  }

  // --- FOCUSED: full dashboard layout ---
  return (
    <div className={cn("flex flex-col gap-2", className)} draggable onDragStart={handleDragStart}>
      {/* Species strip -- horizontal scrollable tabs */}
      {items.length > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" disabled={selectedIndex === 0}
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <div className="flex gap-1 overflow-x-auto flex-1">
            {items.slice(0, 8).map((sp, i) => (
              <button key={sp.id || i} onClick={() => setSelectedIndex(i)}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] shrink-0 transition-all border",
                  i === selectedIndex
                    ? "bg-primary/15 border-primary/30 text-primary font-medium"
                    : "bg-card/40 border-transparent hover:bg-card/60"
                )}>
                {sp.photos?.[0] && (
                  <div className="relative w-4 h-4 rounded-sm overflow-hidden shrink-0">
                    <Image src={sp.photos[0].medium_url || sp.photos[0].url} alt="" fill className="object-cover" sizes="16px" />
                  </div>
                )}
                <span className="truncate max-w-[60px]">{sp.commonName || sp.scientificName}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" disabled={selectedIndex >= items.length - 1}
            onClick={() => setSelectedIndex((i) => Math.min(items.length - 1, i + 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <span className="text-[9px] text-muted-foreground shrink-0">{selectedIndex + 1}/{items.length}</span>
        </div>
      )}

      {/* Main content -- horizontal: photo | info | taxonomy */}
      <div className="flex gap-3 items-start">
        {/* Photo column */}
        <div className="shrink-0 flex flex-col gap-1">
          {mainPhoto && (
            <motion.div className="relative w-28 h-28 rounded-xl overflow-hidden bg-muted shadow-inner" layout>
              <Image src={mainPhoto.medium_url || mainPhoto.url} alt={selected.commonName} fill className="object-cover" sizes="112px" />
            </motion.div>
          )}
          {/* Mini gallery */}
          {selected.photos && selected.photos.length > 1 && (
            <div className="flex gap-0.5">
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

        {/* Info column */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-semibold text-base leading-tight truncate">{selected.commonName}</h3>
          <p className="text-xs text-muted-foreground italic leading-tight">{selected.scientificName}</p>

          {/* Stats row */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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

          {/* Description -- 3 lines max */}
          {selected.description && (
            <p className="text-[11px] leading-snug text-foreground/80 line-clamp-3">{selected.description}</p>
          )}

          {/* Action buttons -- compact row */}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <Button asChild size="sm" className="h-6 px-2 text-[10px] rounded-lg">
              <a href={`/ancestry/explorer?search=${encodeURIComponent(selected.scientificName)}`}>
                Full Page <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
              </a>
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
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> MYCA
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

        {/* Taxonomy column -- vertical breadcrumb */}
        {taxonomyLevels.length > 0 && (
          <div className="shrink-0 w-[130px] hidden md:flex flex-col gap-0.5">
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
  )
}

export default SpeciesWidget
