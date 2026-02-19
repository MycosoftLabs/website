/**
 * ResearchWidget - Feb 2026
 *
 * Default action: clicking "Read" opens the paper IN an in-app reading overlay.
 * External DOI links are always secondary — never the default tap action.
 *
 * Save → paper data stored in notepad; click notepad item to re-open the modal.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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
  Bookmark,
  BookmarkCheck,
  Quote,
  Copy,
  Check,
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
  /** Paper to immediately open (from notepad restore) */
  openPaper?: ResearchResult | null
  onAddToNotepad?: (item: {
    type: string
    title: string
    content: string
    source?: string
    meta?: Record<string, unknown>
  }) => void
  className?: string
}

// ─── Reading modal ────────────────────────────────────────────────────────────

function ResearchReadingModal({
  paper,
  onClose,
  onSave,
  isSaved,
}: {
  paper: ResearchResult
  onClose: () => void
  onSave: () => void
  isSaved: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [copiedDoi, setCopiedDoi] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [mounted, onClose])

  useEffect(() => {
    if (!mounted) return
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = orig }
  }, [mounted])

  const copyDoi = useCallback(() => {
    if (!paper.doi) return
    navigator.clipboard.writeText(`https://doi.org/${paper.doi}`).then(() => {
      setCopiedDoi(true)
      setTimeout(() => setCopiedDoi(false), 2000)
    })
  }, [paper.doi])

  if (!mounted) return null

  const modal = (
    <AnimatePresence>
      <motion.div
        key="research-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <motion.div
          key="research-modal-panel"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ maxHeight: "min(90vh, 720px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
            <div className="p-2 bg-blue-500/15 rounded-lg shrink-0 mt-0.5">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm leading-snug">{paper.title}</h2>
              {paper.authors && paper.authors.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {paper.authors.slice(0, 4).join(", ")}
                  {paper.authors.length > 4 && ` + ${paper.authors.length - 4} more`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {paper.journal && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    <BookOpen className="h-2.5 w-2.5 mr-0.5" />
                    {paper.journal}
                  </Badge>
                )}
                {paper.year > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    <Calendar className="h-2.5 w-2.5 mr-0.5" />
                    {paper.year}
                  </Badge>
                )}
                {(paper as any).citationCount > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-400/30">
                    <Quote className="h-2.5 w-2.5 mr-0.5" />
                    {(paper as any).citationCount} citations
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 space-y-4 min-h-0">

            {/* Abstract */}
            {paper.abstract ? (
              <div className="space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Abstract</p>
                <p className="text-sm text-foreground/85 leading-relaxed">{paper.abstract}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/20 border border-border px-4 py-6 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No abstract available.</p>
                {paper.doi && (
                  <p className="text-xs text-muted-foreground/70 mt-1">Use "Open full paper" below to view on the publisher's site.</p>
                )}
              </div>
            )}

            {/* Related species */}
            {paper.relatedSpecies && paper.relatedSpecies.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Related species</p>
                <div className="flex flex-wrap gap-1.5">
                  {paper.relatedSpecies.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] italic">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* DOI info */}
            {paper.doi && (
              <div className="rounded-lg bg-muted/20 border border-border px-3 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">DOI</p>
                  <p className="text-xs font-mono truncate">{paper.doi}</p>
                </div>
                <button
                  onClick={copyDoi}
                  className="p-1.5 rounded-md hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Copy DOI link"
                >
                  {copiedDoi ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border">
            {/* External link — secondary only */}
            {paper.doi ? (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full paper
              </a>
            ) : (paper as any).url ? (
              <a
                href={(paper as any).url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View paper
              </a>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("h-7 text-xs gap-1.5", isSaved && "text-blue-400 border-blue-400/30")}
                onClick={onSave}
              >
                {isSaved
                  ? <><BookmarkCheck className="h-3.5 w-3.5" />Saved</>
                  : <><Bookmark className="h-3.5 w-3.5" />Save to notepad</>
                }
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

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
        </div>
      ))}
    </div>
  )
}

const ITEMS_PER_PAGE = 5

// ─── Main widget ──────────────────────────────────────────────────────────────

export function ResearchWidget({
  data,
  isFocused,
  isLoading = false,
  onExplore,
  onFocusWidget,
  openPaper,
  onAddToNotepad,
  className,
}: ResearchWidgetProps) {
  const items = Array.isArray(data) ? data : [data]
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activePaper, setActivePaper] = useState<ResearchResult | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showSources, setShowSources] = useState(false)

  // Open paper from notepad restore
  useEffect(() => {
    if (openPaper) setActivePaper(openPaper)
  }, [openPaper])

  const handleSave = useCallback(() => {
    if (!activePaper || !onAddToNotepad) return
    onAddToNotepad({
      type: "research",
      title: activePaper.title,
      content: activePaper.abstract?.slice(0, 200) || activePaper.title,
      source: (activePaper as any)._source,
      meta: activePaper as unknown as Record<string, unknown>,
    })
    setSavedIds((prev) => new Set(prev).add(activePaper.id))
  }, [activePaper, onAddToNotepad])

  if (isLoading) return <ResearchLoadingSkeleton />

  const sources = items.map((r: any) => r._source || "Unknown").filter(Boolean)
  const uniqueSources = [...new Set(sources)]
  const visibleItems = items.slice(0, visibleCount)
  const hasMore = items.length > visibleCount

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-4 text-sm text-muted-foreground", className)}>
        No research papers found for this query.
      </div>
    )
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Paper list */}
        <div className="space-y-2 overflow-hidden flex-1">
          {visibleItems.map((paper) => {
            const isExpanded = expandedId === paper.id
            const isSavedItem = savedIds.has(paper.id)
            return (
              <motion.div
                key={paper.id}
                layout
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-colors",
                  isExpanded ? "bg-muted/50 border-primary/30" : "hover:bg-muted/30",
                  isSavedItem && "border-blue-500/25"
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
                      {isSavedItem && <BookmarkCheck className="h-3 w-3 text-blue-400 ml-auto" />}
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
                      {/* Read opens the in-app modal — primary action */}
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActivePaper(paper)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Read
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onAddToNotepad) {
                              onAddToNotepad({
                                type: "research",
                                title: paper.title,
                                content: paper.abstract?.slice(0, 200) || paper.title,
                                source: (paper as any)._source,
                                meta: paper as unknown as Record<string, unknown>,
                              })
                              setSavedIds((prev) => new Set(prev).add(paper.id))
                            }
                          }}
                        >
                          {isSavedItem
                            ? <><BookmarkCheck className="h-3 w-3 mr-1 text-blue-400" />Saved</>
                            : <><GripVertical className="h-3 w-3 mr-1" />Save</>
                          }
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {Math.min(ITEMS_PER_PAGE, items.length - visibleCount)} more
            </Button>
          )}
        </div>

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

      {/* Reading modal — portal, floats over entire viewport */}
      {activePaper && (
        <ResearchReadingModal
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onSave={handleSave}
          isSaved={savedIds.has(activePaper.id)}
        />
      )}
    </>
  )
}

export default ResearchWidget
