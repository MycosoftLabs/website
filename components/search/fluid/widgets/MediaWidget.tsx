/**
 * MediaWidget - Displays movies, TV shows, and documentaries featuring fungi
 * 
 * Shows media results when users search for:
 * - "mushrooms in movies"
 * - "fungi documentaries"
 * - "mycology TV shows"
 */

"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Film, Tv, Play, ExternalLink, Star, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface MediaResult {
  id: string
  title: string
  type: "movie" | "tv" | "documentary"
  year?: number
  rating?: number
  overview?: string
  posterUrl?: string
  backdropUrl?: string
  streamingOn?: string[]
  fungiRelevance?: string
}

interface MediaWidgetProps {
  data: MediaResult[]
  isFocused?: boolean
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
}

export function MediaWidget({ data, isFocused = false, onAddToNotepad }: MediaWidgetProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Film className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No media results found</p>
        <p className="text-xs mt-1">Try searching for "mushrooms in movies" or "fungi documentaries"</p>
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "movie": return <Film className="h-4 w-4" />
      case "tv": return <Tv className="h-4 w-4" />
      case "documentary": return <Play className="h-4 w-4" />
      default: return <Film className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "movie": return "Movie"
      case "tv": return "TV Series"
      case "documentary": return "Documentary"
      default: return "Media"
    }
  }

  return (
    <div className={cn(
      "space-y-3",
      isFocused ? "max-h-[400px] overflow-y-auto pr-2" : "max-h-[200px] overflow-hidden"
    )}>
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "group relative rounded-xl overflow-hidden",
            "bg-gradient-to-r from-pink-500/10 to-rose-500/10",
            "border border-white/10 dark:border-white/5",
            "hover:border-pink-500/30 transition-all duration-300"
          )}
        >
          <div className="flex gap-4 p-4">
            {/* Poster */}
            <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-muted">
              {item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getTypeIcon(item.type)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {getTypeIcon(item.type)}
                      {getTypeLabel(item.type)}
                    </span>
                    {item.year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.year}
                      </span>
                    )}
                    {item.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onAddToNotepad?.({
                    type: "media",
                    title: item.title,
                    content: `${getTypeLabel(item.type)} (${item.year || "Unknown year"})${item.fungiRelevance ? ` - ${item.fungiRelevance}` : ""}`,
                    source: "Media Search",
                  })}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>

              {item.overview && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {item.overview}
                </p>
              )}

              {item.fungiRelevance && (
                <p className="text-xs text-pink-400 mt-2 italic">
                  🍄 {item.fungiRelevance}
                </p>
              )}

              {item.streamingOn && item.streamingOn.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Watch on:</span>
                  {item.streamingOn.map((service) => (
                    <span
                      key={service}
                      className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default MediaWidget
