"use client"

/**
 * ExperiencePacketView – collapsible JSON viewer for Experience Packets.
 * Fetches from /api/myca/grounding/ep/[id].
 * Dev-only: only visible when NODE_ENV === "development".
 * Created: February 17, 2026
 */

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, FileJson, Loader2 } from "lucide-react"

interface ExperiencePacketViewProps {
  epId: string
  className?: string
}

function JsonNode({
  label,
  value,
  defaultOpen = false,
  depth = 0,
}: {
  label: string
  value: unknown
  defaultOpen?: boolean
  depth?: number
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2)
  const isObject = value !== null && typeof value === "object"
  const isArray = Array.isArray(value)
  const hasChildren = isObject && (isArray ? (value as unknown[]).length > 0 : Object.keys(value as Record<string, unknown>).length > 0)

  if (!isObject) {
    return (
      <div className="flex gap-2 py-0.5" style={{ paddingLeft: `${depth * 12}px` }}>
        <span className="text-muted-foreground font-mono text-xs">{label}:</span>
        <span className="font-mono text-xs break-all">
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
      </div>
    )
  }

  return (
    <div className="py-0.5" style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 min-h-[28px] hover:bg-muted/50 rounded touch-manipulation text-left w-full"
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        <span className="text-muted-foreground font-mono text-xs">{label}</span>
        <span className="text-muted-foreground text-xs">
          {isArray ? `[${(value as unknown[]).length}]` : `{${Object.keys(value as Record<string, unknown>).length}}`}
        </span>
      </button>
      {open && hasChildren && (
        <div className="border-l border-border ml-1.5 pl-1">
          {isArray
            ? (value as unknown[]).map((v, i) => (
                <JsonNode key={i} label={`[${i}]`} value={v} depth={depth + 1} />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <JsonNode key={k} label={k} value={v} depth={depth + 1} />
              ))}
        </div>
      )}
    </div>
  )
}

export function ExperiencePacketView({ epId, className }: ExperiencePacketViewProps) {
  const [ep, setEp] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!epId) return
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/myca/grounding/ep/${encodeURIComponent(epId)}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (mounted) setEp(data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [epId])

  if (process.env.NODE_ENV !== "development") return null

  return (
    <Card className={cn("overflow-hidden border border-border", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <FileJson className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">EP: {epId.slice(0, 20)}…</span>
      </div>
      <div className="p-2 max-h-[320px] overflow-y-auto font-mono text-xs">
        {loading && (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
        {error && (
          <p className="py-2 text-destructive">{error}</p>
        )}
        {!loading && !error && ep && (
          <JsonNode label="root" value={ep} defaultOpen />
        )}
      </div>
    </Card>
  )
}
