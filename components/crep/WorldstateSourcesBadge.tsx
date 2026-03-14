"use client"

/**
 * WorldstateSourcesBadge — Mar 14, 2026
 *
 * Optional CREP integration: displays worldstate source count when MAS worldstate API is available.
 * NO MOCK DATA — renders nothing when unavailable.
 * Aligns CREP to canonical worldstate read contract (passive awareness).
 */

import { useEffect, useState } from "react"
import { fetchWorldstateSources } from "@/lib/mas/worldstate-client"
import { Globe } from "lucide-react"

export function WorldstateSourcesBadge() {
  const [sourcesCount, setSourcesCount] = useState<number | null>(null)
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchWorldstateSources().then((data) => {
      if (!mounted) return
      if (!data?.sources?.length) return
      setSourcesCount(data.sources.length)
      setDegraded(Boolean(data.degraded))
    })
    return () => { mounted = false }
  }, [])

  if (sourcesCount == null) return null

  return (
    <div
      className={[
        "flex items-center gap-1 text-[10px]",
        degraded ? "text-amber-400" : "text-cyan-400",
      ].join(" ")}
      title="Worldstate sources (passive awareness)"
    >
      <Globe className="w-3 h-3 shrink-0" />
      <span className="uppercase font-medium">WS</span>
      <span className="text-gray-500">{sourcesCount}</span>
    </div>
  )
}
