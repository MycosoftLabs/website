"use client"

/**
 * ResearchCard - Feb 2026
 * 
 * Compact card for research papers and news articles.
 */

import { useState } from "react"
import { FileText, Newspaper, Bookmark, ChevronDown, ExternalLink, Users, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ResearchCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

export function ResearchCard({ data, onSave }: ResearchCardProps) {
  const [expanded, setExpanded] = useState(false)

  const title = (data.title || data.name || "Untitled") as string
  const isNews = data.type === "news" || data.source === "news"
  const authors = (data.authors || []) as string[]
  const journal = data.journal as string | undefined
  const year = data.year as number | string | undefined
  const doi = data.doi as string | undefined
  const url = (data.url || data.link) as string | undefined
  const abstract = data.abstract as string | undefined
  const publishedDate = data.publishedDate as string | undefined
  const source = data.source as string | undefined

  const Icon = isNews ? Newspaper : FileText
  const iconColor = isNews ? "text-yellow-500" : "text-orange-500"
  const bgColor = isNews ? "bg-yellow-500/10" : "bg-orange-500/10"

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 p-3">
        <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", bgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {journal && (
              <Badge variant="outline" className="text-[10px] h-5 max-w-[120px] truncate">
                {journal}
              </Badge>
            )}
            {year && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {year}
              </span>
            )}
            {authors.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {authors.length} author{authors.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t">
          {authors.length > 0 && (
            <div className="text-xs pt-2">
              <span className="text-muted-foreground">Authors: </span>
              <span>{authors.slice(0, 3).join(", ")}{authors.length > 3 ? ` +${authors.length - 3} more` : ""}</span>
            </div>
          )}

          {abstract && (
            <div className="text-xs">
              <span className="text-muted-foreground">Abstract: </span>
              <span className="line-clamp-3">{abstract}</span>
            </div>
          )}

          {doi && (
            <div className="text-xs">
              <span className="text-muted-foreground">DOI: </span>
              <a 
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {doi}
              </a>
            </div>
          )}

          {source && !journal && (
            <div className="text-xs">
              <span className="text-muted-foreground">Source: </span>
              <span>{source}</span>
            </div>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              Read full {isNews ? "article" : "paper"}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
