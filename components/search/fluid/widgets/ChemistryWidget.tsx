/**
 * ChemistryWidget - Feb 2026
 *
 * CONSOLIDATED: Shows ALL compound results in a single widget.
 * Internal card navigation, sources section.
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
} from "lucide-react"
import type { CompoundResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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
  )
}

export default ChemistryWidget
