/**
 * Petri Dish Link — compact status from live MAS v2 health (no static sim id).
 * Date: May 02, 2026
 */

"use client"

import { useEffect, useState } from "react"
import { FlaskConical, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PetriDishLink() {
  const [label, setLabel] = useState<string>("…")
  const [tone, setTone] = useState<"ok" | "warn" | "err">("warn")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/simulation/petri/v2/health", { signal: AbortSignal.timeout(4000) })
        const j = (await r.json()) as { status?: string; petri_v2?: string; mas?: string }
        if (cancelled) return
        if (r.ok && j.status === "ok") {
          setLabel("Engine OK")
          setTone("ok")
        } else if (j.status === "degraded") {
          setLabel("v2 degraded")
          setTone("warn")
        } else {
          setLabel(`HTTP ${r.status}`)
          setTone("err")
        }
      } catch {
        if (!cancelled) {
          setLabel("offline")
          setTone("err")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cls =
    tone === "ok"
      ? "border-emerald-500/40 text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/40 text-amber-300"
        : "border-red-500/40 text-red-300"

  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5 p-2">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md" />
        <FlaskConical className="relative h-6 w-6 text-purple-400" />
      </div>
      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${cls}`}>
        <Link2 className="h-2 w-2 mr-1" />
        {label}
      </Badge>
      <span className="text-[8px] text-cyan-400/50">Petri v2</span>
    </div>
  )
}
