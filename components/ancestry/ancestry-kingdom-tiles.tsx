"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

/** Align MINDEX kingdom labels with explorer `?kingdom=` values */
const CANONICAL_KINGDOMS = ["Fungi", "Plantae", "Animalia", "Bacteria", "Archaea", "Protista", "Viruses"] as const

function toExplorerKingdomParam(raw: string): string {
  const t = raw.trim()
  const hit = CANONICAL_KINGDOMS.find((k) => k.toLowerCase() === t.toLowerCase())
  return hit ?? t
}

interface Row {
  kingdom: string
  taxon_count: number
}

export function AncestryKingdomTiles() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/ancestry/kingdoms", { cache: "no-store" })
        const j = await r.json()
        if (!cancelled) setRows(Array.isArray(j.kingdoms) ? j.kingdoms : [])
        if (!r.ok) setErr(j?.message || "MINDEX stats unavailable")
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setErr("Could not load kingdom coverage")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (err && (!rows || rows.length === 0)) {
    return <p className="text-center text-foreground/70 text-sm">{err}</p>
  }
  if (rows === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Loading kingdom stats" />
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="text-center text-foreground/70 text-sm">
        No kingdom statistics yet. After MINDEX migration and ETL, counts appear here.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
      {rows.map((r) => {
        const kingdomQ = toExplorerKingdomParam(r.kingdom)
        const href = `/natureos/ancestry/explorer?kingdom=${encodeURIComponent(kingdomQ)}`
        return (
          <Link
            key={r.kingdom}
            href={href}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
            aria-label={`Open ancestry explorer filtered to ${kingdomQ}`}
          >
            <Card className="min-h-[44px] h-full transition-colors hover:border-emerald-500/50">
              <CardHeader className="py-2 px-3">
                <CardDescription className="text-xs sm:text-sm">{r.kingdom}</CardDescription>
                <CardTitle className="text-lg sm:text-2xl text-emerald-600">
                  {r.taxon_count.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3 text-xs text-foreground/60">taxa · explorer</CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
