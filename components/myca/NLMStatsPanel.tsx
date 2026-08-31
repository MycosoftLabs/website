"use client"

import { useEffect, useState } from "react"
import { Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface NLMMetricsResponse {
  source: "live" | "degraded" | "unavailable"
  fetched_at: string
  phase: string
  model_status: string
  translation_accuracy: number | null
  signal_samples: number | null
  overall_progress: number | null
  engine_online: boolean
  provenance?: { note?: string }
}

function formatSampleCount(value: number | null): string {
  if (value == null) return "—"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatAccuracy(value: number | null): string {
  if (value == null) return "—"
  return `${value.toFixed(1)}%`
}

function formatProgress(value: number | null): string {
  if (value == null) return "—"
  return `${Math.round(value)}%`
}

export function NLMStatsPanel() {
  const [metrics, setMetrics] = useState<NLMMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMetrics() {
      try {
        const res = await fetch("/api/myca/nlm/metrics", { cache: "no-store" })
        if (!res.ok) throw new Error(`Metrics unavailable (${res.status})`)
        const data = (await res.json()) as NLMMetricsResponse
        if (!cancelled) {
          setMetrics(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setMetrics(null)
          setError(e instanceof Error ? e.message : "Failed to load metrics")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMetrics()
    const interval = setInterval(loadMetrics, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const sourceLabel =
    metrics?.source === "live"
      ? "Live engine"
      : metrics?.source === "degraded"
        ? "Engine online — metrics pending"
        : "Engine unreachable"

  const sourceVariant =
    metrics?.source === "live"
      ? "default"
      : metrics?.source === "degraded"
        ? "secondary"
        : "outline"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={sourceVariant} className="text-xs">
          {sourceLabel}
        </Badge>
        {metrics?.fetched_at ? (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(metrics.fetched_at).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" /> Model Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics?.model_status ?? "Unavailable"}
            </div>
            <p className="text-sm text-muted-foreground">{metrics?.phase ?? "NLM-Funga"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Translation Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {formatAccuracy(metrics?.translation_accuracy ?? null)}
            </div>
            {metrics?.translation_accuracy != null ? (
              <Progress value={metrics.translation_accuracy} className="h-2 mt-2" />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No live training metrics yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Training Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatSampleCount(metrics?.signal_samples ?? null)}
            </div>
            <p className="text-sm text-muted-foreground">Signal samples</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatProgress(metrics?.overall_progress ?? null)}
            </div>
            {metrics?.overall_progress != null ? (
              <Progress value={metrics.overall_progress} className="h-2 mt-2" />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Progress unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {error}. Showing empty states — not fabricated numbers.
        </p>
      ) : null}
    </div>
  )
}
