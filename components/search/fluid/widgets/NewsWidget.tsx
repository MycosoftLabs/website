/**
 * NewsWidget - Feb 2026
 *
 * Default action: clicking an article opens it IN an in-app reading overlay.
 * External links are always secondary — never the default tap action.
 *
 * Save → article data stored in notepad; click notepad item to re-open the modal.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Newspaper,
  ExternalLink,
  Clock,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  X,
  BookOpen,
  Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

const ITEMS_PER_PAGE = 5

export interface NewsResult {
  id: string
  title: string
  source: string
  publishedAt: string
  url?: string
  imageUrl?: string
  summary?: string
  category?: "research" | "industry" | "event" | "discovery" | "general"
  trending?: boolean
}

interface NewsWidgetProps {
  data: NewsResult[]
  isFocused?: boolean
  isLoading?: boolean
  error?: string
  queryUsed?: string
  /** article to immediately open (from notepad restore) */
  openArticle?: NewsResult | null
  onAddToNotepad?: (item: {
    type: string
    title: string
    content: string
    source?: string
    meta?: Record<string, unknown>
  }) => void
}

// ─── Reading modal ────────────────────────────────────────────────────────────

function NewsReadingModal({
  article,
  onClose,
  onSave,
  isSaved,
}: {
  article: NewsResult
  onClose: () => void
  onSave: () => void
  isSaved: boolean
}) {
  const [mounted, setMounted] = useState(false)

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

  if (!mounted) return null

  const modal = (
    <AnimatePresence>
      <motion.div
        key="news-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <motion.div
          key="news-modal-panel"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ maxHeight: "min(88vh, 700px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
            <div className="p-2 bg-yellow-500/15 rounded-lg shrink-0 mt-0.5">
              <Newspaper className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
                  {article.category ? article.category.charAt(0).toUpperCase() + article.category.slice(1) : "News"}
                </span>
                {article.trending && (
                  <span className="flex items-center gap-1 text-[10px] text-orange-400">
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </span>
                )}
              </div>
              <h2 className="font-bold text-sm leading-snug">{article.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium">{article.source}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(article.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0">
            {/* Hero image */}
            {article.imageUrl && (
              <div className="w-full h-48 overflow-hidden shrink-0">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="px-5 py-4 space-y-4">
              {/* Summary */}
              {article.summary ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Summary</p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{article.summary}</p>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/20 border border-border px-4 py-6 text-center">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No preview available for this article.</p>
                  {article.url && (
                    <p className="text-xs text-muted-foreground/70 mt-1">Use "Open original" below to read the full article.</p>
                  )}
                </div>
              )}

              {/* Source details */}
              <div className="rounded-lg bg-muted/20 border border-border px-3 py-2.5 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Source</p>
                  <p className="text-xs font-medium truncate">{article.source}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border">
            {/* External link — secondary, opt-in only */}
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-yellow-400 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open original article
              </a>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("h-7 text-xs gap-1.5", isSaved && "text-yellow-400 border-yellow-400/30")}
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

function NewsLoadingSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-2">
          <Skeleton className="h-14 w-14 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function NewsWidget({
  data,
  isFocused = false,
  isLoading = false,
  error,
  queryUsed,
  openArticle,
  onAddToNotepad,
}: NewsWidgetProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [activeArticle, setActiveArticle] = useState<NewsResult | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Open article from notepad restore
  useEffect(() => {
    if (openArticle) setActiveArticle(openArticle)
  }, [openArticle])

  const handleSave = useCallback(() => {
    if (!activeArticle || !onAddToNotepad) return
    onAddToNotepad({
      type: "news",
      title: activeArticle.title,
      content: activeArticle.summary || `From ${activeArticle.source}`,
      source: activeArticle.source,
      // Store full article data so notepad can re-open the modal
      meta: activeArticle as unknown as Record<string, unknown>,
    })
    setSavedIds((prev) => new Set(prev).add(activeArticle.id))
  }, [activeArticle, onAddToNotepad])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "research": return "bg-blue-500/20 text-blue-300"
      case "industry": return "bg-green-500/20 text-green-300"
      case "event": return "bg-purple-500/20 text-purple-300"
      case "discovery": return "bg-yellow-500/20 text-yellow-300"
      default: return "bg-muted/40 text-muted-foreground"
    }
  }

  if (isLoading) return <NewsLoadingSkeleton />

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm text-red-400">Unable to fetch news</p>
        <p className="text-xs mt-1 text-red-300/80">
          {error.includes("401") ? "NewsAPI key is invalid" : error}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No news found</p>
        <p className="text-xs mt-1">Try "latest mushroom research" or "mycology news"</p>
      </div>
    )
  }

  const queryTerms = queryUsed
    ? queryUsed.replace(/"/g, "").split(" OR ").map((t) => t.trim()).filter(Boolean).slice(0, 5)
    : []

  const visibleItems = data.slice(0, visibleCount)
  const hasMore = data.length > visibleCount

  return (
    <>
      <div className="space-y-3 overflow-hidden flex-1">
        {/* Context pills */}
        {queryTerms.length > 1 && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {queryTerms.map((term, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20 truncate max-w-[120px]"
                title={term}
              >
                {term.length > 18 ? term.slice(0, 16) + "…" : term}
              </span>
            ))}
          </div>
        )}

        {visibleItems.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "group relative rounded-xl overflow-hidden cursor-pointer",
              "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
              "border border-border hover:border-yellow-500/40",
              "transition-all duration-200 hover:scale-[1.01]",
              savedIds.has(article.id) && "border-yellow-500/30"
            )}
            onClick={() => setActiveArticle(article)}
            title="Click to read"
          >
            <div className="flex gap-3 p-4">
              {/* Image */}
              {article.imageUrl && (
                <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", getCategoryColor(article.category))}>
                        {article.category ? article.category.charAt(0).toUpperCase() + article.category.slice(1) : "News"}
                      </span>
                      {article.trending && (
                        <span className="flex items-center gap-1 text-[10px] text-orange-400">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Trending
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-yellow-300 transition-colors">
                      {article.title}
                    </h3>
                  </div>

                  {/* Saved badge */}
                  {savedIds.has(article.id) && (
                    <BookmarkCheck className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  )}
                </div>

                {article.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{article.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                  <span className="ml-auto text-yellow-500/60 group-hover:text-yellow-400 transition-colors flex items-center gap-0.5">
                    <BookOpen className="h-2.5 w-2.5" />
                    Read
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Show {Math.min(ITEMS_PER_PAGE, data.length - visibleCount)} more ({data.length - visibleCount} remaining)
          </Button>
        )}
      </div>

      {/* Reading modal — portal, floats over entire viewport */}
      {activeArticle && (
        <NewsReadingModal
          article={activeArticle}
          onClose={() => setActiveArticle(null)}
          onSave={handleSave}
          isSaved={savedIds.has(activeArticle.id)}
        />
      )}
    </>
  )
}

export default NewsWidget
