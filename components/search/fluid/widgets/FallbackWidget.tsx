/**
 * FallbackWidget — Mar 14, 2026
 *
 * Generic widget for result buckets that have no dedicated widget (missing-widget detection).
 * Renders a simple card list so new answer types from MAS still show in the UI.
 */

"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WidgetType } from "@/lib/search/widget-registry"

interface FallbackWidgetProps {
  title?: string
  bucketKey: string
  items: Array<Record<string, unknown>>
  className?: string
  size?: "sm" | "md" | "lg"
  widgetType?: WidgetType
}

export function FallbackWidget({
  title,
  bucketKey,
  items,
  className,
  size = "md",
  widgetType = "fallback",
}: FallbackWidgetProps) {
  if (!items?.length) {
    return (
      <Card className={cn("overflow-hidden", className)} data-widget-type={widgetType}>
        <CardHeader className="py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {title || bucketKey}
          </span>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-sm text-muted-foreground">No results</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)} data-widget-type={widgetType}>
      <CardHeader className="py-3">
        <span className="text-sm font-medium">
          {title || bucketKey}
        </span>
        <span className="text-xs text-muted-foreground ml-2">({items.length})</span>
      </CardHeader>
      <CardContent className="py-2">
        <ul className={cn(
          "space-y-2",
          size === "sm" && "text-xs",
          size === "lg" && "text-base"
        )}>
          {items.slice(0, 10).map((item, i) => (
            <li
              key={(item.id ?? item.uuid ?? i) as string}
              className="rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 text-sm"
            >
              {typeof item.title === "string" && item.title}
              {typeof item.name === "string" && item.name}
              {typeof item.scientific_name === "string" && item.scientific_name}
              {!item.title && !item.name && !item.scientific_name && (
                <span className="text-muted-foreground truncate block">
                  {JSON.stringify(item).slice(0, 80)}…
                </span>
              )}
            </li>
          ))}
        </ul>
        {items.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2">+{items.length - 10} more</p>
        )}
      </CardContent>
    </Card>
  )
}
