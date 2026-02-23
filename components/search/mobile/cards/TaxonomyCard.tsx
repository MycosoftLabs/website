"use client"

/**
 * TaxonomyCard - Feb 2026
 * 
 * Collapsible taxonomy tree card for mobile.
 */

import { useState } from "react"
import { Layers, Bookmark, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TaxonomyCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

const TAXONOMY_ORDER = ["kingdom", "phylum", "class", "order", "family", "genus", "species"]

export function TaxonomyCard({ data, onSave }: TaxonomyCardProps) {
  const [expanded, setExpanded] = useState(false)

  const name = (data.name || data.species || "Unknown") as string
  const taxonomy = (data.taxonomy || data) as Record<string, string>
  
  // Extract taxonomy levels in order
  const levels = TAXONOMY_ORDER.map(rank => ({
    rank,
    value: taxonomy[rank] || taxonomy[rank.charAt(0).toUpperCase() + rank.slice(1)],
  })).filter(l => l.value)

  // Find the most specific level for display
  const primaryLevel = levels[levels.length - 1]

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 p-3">
        <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Layers className="h-5 w-5 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate italic">{name}</h3>
          <p className="text-xs text-muted-foreground">
            Taxonomic Classification
          </p>
          <div className="flex items-center gap-2 mt-1">
            {primaryLevel && (
              <Badge variant="outline" className="text-[10px] h-5 capitalize">
                {primaryLevel.rank}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-5">
              {levels.length} levels
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded content - Taxonomy tree */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t">
          <div className="pt-2 space-y-0">
            {levels.map((level, idx) => (
              <TaxonomyLevel
                key={level.rank}
                rank={level.rank}
                value={level.value}
                depth={idx}
                isLast={idx === levels.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TaxonomyLevelProps {
  rank: string
  value: string
  depth: number
  isLast: boolean
}

function TaxonomyLevel({ rank, value, depth, isLast }: TaxonomyLevelProps) {
  return (
    <div 
      className="flex items-center gap-2 py-1"
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      <ChevronRight className={cn(
        "h-3 w-3 text-muted-foreground shrink-0",
        isLast && "text-amber-500"
      )} />
      <span className={cn(
        "text-xs capitalize text-muted-foreground w-16 shrink-0",
        isLast && "text-foreground font-medium"
      )}>
        {rank}
      </span>
      <span className={cn(
        "text-xs truncate",
        isLast ? "font-semibold italic" : "italic text-muted-foreground"
      )}>
        {value}
      </span>
    </div>
  )
}
