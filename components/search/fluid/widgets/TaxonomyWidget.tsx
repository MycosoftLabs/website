/**
 * TaxonomyWidget - Feb 2026
 * 
 * Taxonomy hierarchy display widget with:
 * - Visual taxonomy tree
 * - Quick navigation to related taxa
 */

"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  TreeDeciduous, 
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TaxonomyData {
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  species?: string
  commonName?: string
}

interface TaxonomyWidgetProps {
  data: TaxonomyData
  isFocused: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

const taxonomyColors: Record<string, string> = {
  kingdom: "bg-red-500/10 text-red-700 dark:text-red-400",
  phylum: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  class: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  order: "bg-green-500/10 text-green-700 dark:text-green-400",
  family: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  genus: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  species: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
}

export function TaxonomyWidget({ 
  data, 
  isFocused,
  onExplore,
  className,
}: TaxonomyWidgetProps) {
  const levels = [
    { rank: "kingdom", value: data.kingdom },
    { rank: "phylum", value: data.phylum },
    { rank: "class", value: data.class },
    { rank: "order", value: data.order },
    { rank: "family", value: data.family },
    { rank: "genus", value: data.genus },
    { rank: "species", value: data.species },
  ].filter((l) => l.value)

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
          <TreeDeciduous className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">Taxonomy</h3>
          {data.commonName && (
            <p className="text-sm text-muted-foreground">
              {data.commonName}
            </p>
          )}
        </div>
      </div>

      {/* Compact view */}
      {!isFocused && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {levels.slice(-3).map((level, index) => (
            <div key={level.rank} className="flex items-center">
              <span className={cn(
                "px-2 py-0.5 rounded",
                taxonomyColors[level.rank]
              )}>
                {level.value}
              </span>
              {index < 2 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Focused view - full hierarchy */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-1"
        >
          {levels.map((level, index) => (
            <motion.div
              key={level.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center"
              style={{ paddingLeft: `${index * 12}px` }}
            >
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <div className="w-3 h-3 border-l border-b border-muted-foreground/30 rounded-bl" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs",
                    taxonomyColors[level.rank]
                  )}
                  onClick={() => onExplore?.("taxonomy", level.value)}
                >
                  <span className="text-muted-foreground mr-1 capitalize">
                    {level.rank}:
                  </span>
                  {level.value}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default TaxonomyWidget
