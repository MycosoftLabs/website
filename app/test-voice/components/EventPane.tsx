"use client"

/**
 * Voice v9 EventPane - March 2, 2026.
 * Displays speechworthy events from the v9 event rail.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { SpeechworthyEvent } from "@/lib/voice-v9/types"
import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventPaneProps {
  events: SpeechworthyEvent[]
  maxHeight?: string
  className?: string
}

export function EventPane({
  events,
  maxHeight = "200px",
  className,
}: EventPaneProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          Events
          {events.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {events.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="rounded border p-2">
          <div className="space-y-2 text-sm">
            {events.map((e) => (
              <div
                key={e.event_id}
                className="rounded px-2 py-1 bg-muted/50 border-l-2 border-primary/50"
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{e.source}</span>
                  <span>u:{e.urgency}</span>
                  {e.speech_worthy && (
                    <Badge variant="outline" className="text-[10px]">
                      speech
                    </Badge>
                  )}
                </div>
                <p className="break-words">{e.summary}</p>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-muted-foreground text-xs">No events yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
