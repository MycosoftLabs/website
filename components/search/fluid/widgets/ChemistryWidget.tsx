/**
 * ChemistryWidget - Feb 2026
 * 
 * Compound display widget with:
 * - Molecular formula
 * - Chemical class
 * - Biological activity
 * - Source species links
 */

"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FlaskConical, 
  Activity, 
  Dna,
  ExternalLink,
} from "lucide-react"
import type { CompoundResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"

interface ChemistryWidgetProps {
  data: CompoundResult
  isFocused: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

export function ChemistryWidget({ 
  data, 
  isFocused,
  onExplore,
  className,
}: ChemistryWidgetProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
          <FlaskConical className="h-5 w-5 text-purple-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">{data.name}</h3>
          <p className="text-sm font-mono text-muted-foreground">
            {data.formula}
          </p>
        </div>
      </div>

      {/* Chemical class */}
      {data.chemicalClass && (
        <Badge variant="secondary" className="text-xs">
          {data.chemicalClass}
        </Badge>
      )}

      {/* Focused view - expanded details */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Molecular weight */}
          {data.molecularWeight > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Molecular Weight:</span>
              <span className="font-mono">{data.molecularWeight.toFixed(2)} g/mol</span>
            </div>
          )}

          {/* Biological activities */}
          {data.biologicalActivity && data.biologicalActivity.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Biological Activity
              </h4>
              <div className="flex flex-wrap gap-1">
                {data.biologicalActivity.map((activity, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source species */}
          {data.sourceSpecies && data.sourceSpecies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Dna className="h-3 w-3" />
                Found In
              </h4>
              <div className="flex flex-wrap gap-1">
                {data.sourceSpecies.map((species, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs italic"
                    onClick={() => onExplore?.("species", species)}
                  >
                    {species}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* SMILES structure preview placeholder */}
          {data.structure && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">Structure (SMILES)</h4>
              <code className="text-xs break-all">{data.structure}</code>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="default" size="sm">
              View Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore?.("research", data.name)}
            >
              Related Research
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ChemistryWidget
