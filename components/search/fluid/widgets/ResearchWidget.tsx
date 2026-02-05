/**
 * ResearchWidget - Feb 2026
 * 
 * Research paper display widget with:
 * - Paper title and authors
 * - Abstract preview
 * - DOI link
 * - Related species
 */

"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Users,
  Calendar,
  ExternalLink,
  BookOpen,
} from "lucide-react"
import type { ResearchResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"

interface ResearchWidgetProps {
  data: ResearchResult
  isFocused: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

export function ResearchWidget({ 
  data, 
  isFocused,
  onExplore,
  className,
}: ResearchWidgetProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
          <FileText className="h-5 w-5 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-semibold",
            !isFocused && "line-clamp-2"
          )}>
            {data.title}
          </h3>
        </div>
      </div>

      {/* Authors and year */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span className="truncate">
          {data.authors?.slice(0, 3).join(", ")}
          {data.authors?.length > 3 && " et al."}
        </span>
        {data.year && (
          <>
            <span>•</span>
            <Calendar className="h-3 w-3" />
            <span>{data.year}</span>
          </>
        )}
      </div>

      {/* Journal */}
      {data.journal && (
        <Badge variant="secondary" className="text-xs">
          <BookOpen className="h-3 w-3 mr-1" />
          {data.journal}
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
          {/* Abstract */}
          {data.abstract && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Abstract
              </h4>
              <p className="text-sm leading-relaxed">
                {data.abstract}
              </p>
            </div>
          )}

          {/* Related species */}
          {data.relatedSpecies && data.relatedSpecies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Species Mentioned
              </h4>
              <div className="flex flex-wrap gap-1">
                {data.relatedSpecies.map((species, index) => (
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {data.doi && (
              <Button variant="default" size="sm" asChild>
                <a 
                  href={`https://doi.org/${data.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Paper
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore?.("research", data.authors?.[0] || "")}
            >
              More from Authors
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ResearchWidget
