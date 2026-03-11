"use client"

/**
 * Voice v9 LatencyPane - March 2, 2026.
 * Displays latency traces from the v9 session.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LatencyTrace } from "@/lib/voice-v9/types"
import { BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LatencyPaneProps {
  traces: LatencyTrace[]
  maxHeight?: string
  className?: string
}

function avgLatency(traces: LatencyTrace[], stage?: string): number {
  const filtered = stage
    ? traces.filter((t) => t.stage === stage)
    : traces
  if (filtered.length === 0) return 0
  return Math.round(
    filtered.reduce((a, t) => a + t.latency_ms, 0) / filtered.length
  )
}

export function LatencyPane({
  traces,
  maxHeight = "200px",
  className,
}: LatencyPaneProps) {
  const avg = avgLatency(traces)
  const sttAvg = avgLatency(traces, "stt")
  const llmAvg = avgLatency(traces, "llm")
  const ttsAvg = avgLatency(traces, "tts")

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 className="h-4 w-4" />
          Latency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-muted-foreground">Avg</span> {avg}ms
          </div>
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-muted-foreground">STT</span> {sttAvg}ms
          </div>
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-muted-foreground">LLM</span> {llmAvg}ms
          </div>
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-muted-foreground">TTS</span> {ttsAvg}ms
          </div>
        </div>
        <ScrollArea style={{ maxHeight }} className="rounded border p-2">
          <div className="space-y-1 text-xs">
            {traces.slice(-20).reverse().map((t) => (
              <div
                key={t.trace_id}
                className="flex justify-between text-muted-foreground"
              >
                <span>{t.stage}</span>
                <span>{t.latency_ms}ms</span>
              </div>
            ))}
            {traces.length === 0 && (
              <p className="text-muted-foreground">No traces yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
