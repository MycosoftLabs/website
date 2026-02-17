/**
 * NewsWidget - Displays current news and articles about fungi
 * 
 * Shows:
 * - Latest mycology news
 * - Research breakthroughs
 * - Industry updates
 * - Event announcements
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Newspaper, ExternalLink, Clock, TrendingUp, Bookmark, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

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

export function NewsWidget({ data, isFocused = false, isLoading = false, error, onAddToNotepad }: NewsWidgetProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  if (isLoading) {
    return <NewsLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm text-red-400">Unable to fetch news</p>
        <p className="text-xs mt-1 text-red-300/80">{error.includes("401") ? "NewsAPI key is invalid - needs valid key" : error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No news found</p>
        <p className="text-xs mt-1">Try searching for "latest mushroom research" or "mycology news"</p>
      </div>
    )
  }

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
      default: return "bg-gray-500/20 text-gray-300"
    }
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "research": return "Research"
      case "industry": return "Industry"
      case "event": return "Event"
      case "discovery": return "Discovery"
      default: return "News"
    }
  }

  const visibleItems = data.slice(0, visibleCount)
  const hasMore = data.length > visibleCount

  return (
    <div className="space-y-3 overflow-hidden flex-1">
      {visibleItems.map((article, index) => (
        <motion.div
          key={article.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className={cn(
            "group relative rounded-xl overflow-hidden",
            "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
            "border border-white/10 dark:border-white/5",
            "hover:border-yellow-500/30 transition-all duration-300"
          )}
        >
          <div className="flex gap-3 p-4">
            {/* Image */}
            {article.imageUrl && (
              <div className="w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
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
                <div className="flex-1">
                  {/* Category and trending badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      getCategoryColor(article.category)
                    )}>
                      {getCategoryLabel(article.category)}
                    </span>
                    {article.trending && (
                      <span className="flex items-center gap-1 text-xs text-orange-400">
                        <TrendingUp className="h-3 w-3" />
                        Trending
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-yellow-300 transition-colors">
                    {article.title}
                  </h3>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onAddToNotepad?.({
                      type: "news",
                      title: article.title,
                      content: article.summary || `From ${article.source}`,
                      source: article.source,
                    })}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                  {article.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(article.url, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Summary */}
              {article.summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {article.summary}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{article.source}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(article.publishedAt)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Load more button */}
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
  )
}

export default NewsWidget
