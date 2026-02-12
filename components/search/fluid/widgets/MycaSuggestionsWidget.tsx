/**
 * MycaSuggestionsWidget - Feb 2026
 *
 * Displays contextual MYCA suggestions derived from the MAS intention API.
 * - Suggested widgets to open
 * - Suggested queries to run
 */

"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Brain, Search } from "lucide-react"

export interface MycaSuggestions {
  widgets: string[]
  queries: string[]
}

interface MycaSuggestionsWidgetProps {
  suggestions: MycaSuggestions
  isFocused: boolean
  onSelectWidget: (widgetType: string) => void
  onSelectQuery: (query: string) => void
  className?: string
}

export function MycaSuggestionsWidget({
  suggestions,
  isFocused,
  onSelectWidget,
  onSelectQuery,
  className,
}: MycaSuggestionsWidgetProps) {
  const widgets = suggestions.widgets || []
  const queries = suggestions.queries || []
  const hasSuggestions = widgets.length > 0 || queries.length > 0

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-md sm:rounded-lg shrink-0">
          <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm sm:text-base">MYCA Suggestions</h3>
            <Badge variant="outline" className="text-[10px]">
              {hasSuggestions ? "live" : "waiting"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {hasSuggestions
              ? "Based on your recent interactions."
              : "Interact with search to generate suggestions."}
          </p>
        </div>
      </div>

      {widgets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Suggested widgets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {widgets.slice(0, 6).map((w) => (
              <Button
                key={w}
                variant="secondary"
                size="sm"
                className="h-6 px-2 text-[11px] rounded-full"
                onClick={() => onSelectWidget(w)}
              >
                {w}
              </Button>
            ))}
          </div>
        </div>
      )}

      {queries.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Suggested queries
          </p>
          <div className="space-y-1.5">
            {queries.slice(0, 5).map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-xs rounded-lg"
                onClick={() => onSelectQuery(q)}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{q}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {isFocused && !hasSuggestions && (
        <div className="text-[11px] text-muted-foreground">
          Tip: try searching a species name, then open Chemistry or Research.
        </div>
      )}
    </div>
  )
}
