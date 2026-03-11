"use client"

/**
 * Voice v9 LiveTranscriptPane - March 2, 2026.
 * Displays live transcript chunks from the v9 session.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TranscriptChunk } from "@/lib/voice-v9/types"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveTranscriptPaneProps {
  transcripts: TranscriptChunk[]
  interimText?: string
  maxHeight?: string
  className?: string
}

export function LiveTranscriptPane({
  transcripts,
  interimText = "",
  maxHeight = "200px",
  className,
}: LiveTranscriptPaneProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="rounded border p-2">
          <div className="space-y-2 text-sm">
            {transcripts.map((t) => (
              <div
                key={t.chunk_id}
                className={cn(
                  "rounded px-2 py-1",
                  t.role === "user"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50"
                )}
              >
                <span className="text-xs text-muted-foreground">
                  {t.role}
                  {!t.is_final && " (partial)"}
                </span>
                <p className="break-words">{t.text}</p>
              </div>
            ))}
            {interimText && (
              <div className="rounded px-2 py-1 bg-muted/30 italic text-muted-foreground">
                {interimText}
              </div>
            )}
            {transcripts.length === 0 && !interimText && (
              <p className="text-muted-foreground text-xs">No transcripts yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
