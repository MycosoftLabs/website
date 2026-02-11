/**
 * GeneticsWidget - Feb 2026
 *
 * Genetics display widget aligned with unified API shape:
 * id, accession, speciesName, geneRegion, sequenceLength, gcContent, source
 */

"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dna, Database, ExternalLink } from "lucide-react"
import type { GeneticsResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"

interface GeneticsWidgetProps {
  data: GeneticsResult
  isFocused: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

export function GeneticsWidget({
  data,
  isFocused,
  onExplore,
  className,
}: GeneticsWidgetProps) {
  // Empty state
  if (!data || !data.id) {
    return (
      <div className={cn("space-y-3 text-center py-6", className)}>
        <div className="p-3 bg-green-500/10 rounded-lg w-fit mx-auto">
          <Dna className="h-6 w-6 text-green-500/50" />
        </div>
        <div>
          <h3 className="font-medium text-muted-foreground">No Genetic Data</h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            No sequences found. Try searching for a specific species or accession number.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
          <Dna className="h-5 w-5 text-green-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Sequence Data</h3>
          <p className="text-sm text-muted-foreground truncate" title={data.speciesName}>
            {data.speciesName}
          </p>
        </div>
      </div>

      {/* Quick stats: accession, gene region, length, GC */}
      <div className="flex flex-wrap gap-2">
        {data.accession && (
          <Badge variant="outline" className="text-xs font-mono">
            {data.accession}
          </Badge>
        )}
        {data.geneRegion && (
          <Badge variant="outline" className="text-xs">
            {data.geneRegion}
          </Badge>
        )}
        {data.sequenceLength > 0 && (
          <Badge variant="outline" className="text-xs">
            {data.sequenceLength} bp
          </Badge>
        )}
        {data.gcContent != null && (
          <Badge variant="outline" className="text-xs">
            GC {typeof data.gcContent === "number" ? `${(data.gcContent * 100).toFixed(1)}%` : data.gcContent}
          </Badge>
        )}
      </div>

      {/* Focused view - GenBank link */}
      {isFocused && data.accession && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              GenBank
            </h4>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono" asChild>
              <a
                href={`https://www.ncbi.nlm.nih.gov/nuccore/${data.accession}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.accession}
                <ExternalLink className="h-2 w-2 ml-1" />
              </a>
            </Button>
          </div>
          {data.source && (
            <p className="text-xs text-muted-foreground">Source: {data.source}</p>
          )}
          {onExplore && data.speciesName && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore("species", data.id)}
            >
              View details
            </Button>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default GeneticsWidget
