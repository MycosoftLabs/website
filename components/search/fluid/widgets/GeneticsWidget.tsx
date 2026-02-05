/**
 * GeneticsWidget - Feb 2026
 * 
 * Genetics display widget with:
 * - Genome information
 * - Sequenced genes
 * - GenBank links
 */

"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Dna, 
  Database,
  ExternalLink,
} from "lucide-react"
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
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
          <Dna className="h-5 w-5 text-green-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Genome Data</h3>
          <p className="text-sm text-muted-foreground">
            Species ID: {data.speciesId}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        {data.genomeSize && (
          <Badge variant="outline" className="text-xs">
            Genome: {data.genomeSize}
          </Badge>
        )}
        {data.chromosomeCount && (
          <Badge variant="outline" className="text-xs">
            {data.chromosomeCount} chromosomes
          </Badge>
        )}
      </div>

      {/* Focused view - expanded details */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* GenBank accessions */}
          {data.genBankAccessions && data.genBankAccessions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                GenBank Accessions
              </h4>
              <div className="flex flex-wrap gap-1">
                {data.genBankAccessions.map((accession, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs font-mono"
                    asChild
                  >
                    <a 
                      href={`https://www.ncbi.nlm.nih.gov/nuccore/${accession}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {accession}
                      <ExternalLink className="h-2 w-2 ml-1" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sequenced genes */}
          {data.sequencedGenes && data.sequencedGenes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sequenced Genes
              </h4>
              <div className="space-y-1">
                {data.sequencedGenes.slice(0, 5).map((gene, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-xs"
                  >
                    <div>
                      <span className="font-medium">{gene.name}</span>
                      {gene.function && (
                        <span className="text-muted-foreground ml-2">
                          {gene.function}
                        </span>
                      )}
                    </div>
                    {gene.accession && (
                      <span className="font-mono text-muted-foreground">
                        {gene.accession}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore?.("species", data.speciesId)}
            >
              View Species
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default GeneticsWidget
