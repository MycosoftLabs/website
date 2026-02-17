/**
 * ResearchWidget - Feb 2026
 *
 * CONSOLIDATED: Shows ALL research papers in a single widget.
 * Click to expand abstract inline. Document viewer stays on page.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Users,
  Calendar,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Database,
  GripVertical,
  Eye,
  X,
} from "lucide-react"
import type { ResearchResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ResearchWidgetProps {
  data: ResearchResult | ResearchResult[]
  isFocused: boolean
  isLoading?: boolean
  onExplore?: (type: string, id: string) => void
  onFocusWidget?: (target: { type: string; id?: string }) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
}

function ResearchLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
          <Skeleton className="h-5 w-5/6" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

const ITEMS_PER_PAGE = 5

export function ResearchWidget({
  data,
  isFocused,
  isLoading = false,
  onExplore,
  onFocusWidget,
  onAddToNotepad,
  className,
}: ResearchWidgetProps) {
  const items = Array.isArray(data) ? data : [data]
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)

  if (isLoading) {
    return <ResearchLoadingSkeleton />
  }

  const sources = items.map((r: any) => r._source || "Unknown").filter(Boolean)
  const uniqueSources = [...new Set(sources)]
  const visibleItems = items.slice(0, visibleCount)
  const hasMore = items.length > visibleCount

  const viewingDoc = viewingDocId ? items.find((r) => r.id === viewingDocId) : null

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-4 text-sm text-muted-foreground", className)}>
        No research papers found for this query.
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Document viewer overlay */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-card border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm">{viewingDoc.title}</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setViewingDocId(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {viewingDoc.authors?.join(", ")}
              {viewingDoc.year && (
                <>
                  <span>--</span>
                  <Calendar className="h-3 w-3" />
                  {viewingDoc.year}
                </>
              )}
            </div>
            {viewingDoc.journal && (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {viewingDoc.journal}
              </Badge>
            )}
            {viewingDoc.abstract && (
              <p className="text-sm leading-relaxed">{viewingDoc.abstract}</p>
            )}
            <div className="flex gap-2">
              {viewingDoc.doi && (
                <Button variant="default" size="sm" asChild>
                  <a href={`https://doi.org/${viewingDoc.doi}`} target="_blank" rel="noopener noreferrer">
                    Open Full Paper <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
              {onAddToNotepad && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onAddToNotepad({
                      type: "research",
                      title: viewingDoc.title,
                      content: viewingDoc.abstract?.slice(0, 200) || viewingDoc.title,
                      source: (viewingDoc as any)._source,
                    })
                  }
                >
                  <GripVertical className="h-3 w-3 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paper list */}
      {!viewingDoc && (
        <div className="space-y-2 overflow-hidden flex-1">
          {visibleItems.map((paper) => {
            const isExpanded = expandedId === paper.id
            return (
              <motion.div
                key={paper.id}
                layout
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-colors",
                  isExpanded ? "bg-muted/50 border-primary/30" : "hover:bg-muted/30"
                )}
                onClick={() => setExpandedId(isExpanded ? null : paper.id)}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("text-sm font-medium", !isExpanded && "line-clamp-2")}>
                      {paper.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        {paper.authors?.slice(0, 2).join(", ")}
                        {(paper.authors?.length || 0) > 2 && " et al."}
                      </span>
                      {paper.year > 0 && <span>{paper.year}</span>}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {paper.journal && (
                        <Badge variant="secondary" className="text-[10px]">
                          {paper.journal}
                        </Badge>
                      )}
                      {paper.abstract && (
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                          {paper.abstract}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingDocId(paper.id)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Read
                        </Button>
                        {paper.doi && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                            <a
                              href={`https://doi.org/${paper.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              DOI <ExternalLink className="h-2.5 w-2.5 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
          
          {/* Load more button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {Math.min(ITEMS_PER_PAGE, items.length - visibleCount)} more ({items.length - visibleCount} remaining)
            </Button>
          )}
        </div>
      )}

      {/* Sources */}
      {isFocused && uniqueSources.length > 0 && (
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
    </div>
  )
}

export default ResearchWidget
