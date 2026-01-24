"use client"

import useSWR from "swr"
import { cn } from "@/lib/utils"

interface MINDEXIntegrityBadgeProps {
  recordId: string
  className?: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function MINDEXIntegrityBadge({ recordId, className }: MINDEXIntegrityBadgeProps) {
  const { data, error, isLoading } = useSWR(`/api/mindex/verify/${encodeURIComponent(recordId)}`, fetcher, {
    refreshInterval: 30_000,
  })

  const state = isLoading ? "loading" : error ? "error" : data?.valid ? "verified" : "invalid"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        state === "verified" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        state === "invalid" && "border-red-500/40 bg-red-500/10 text-red-200",
        state === "error" && "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
        state === "loading" && "border-white/10 bg-white/5 text-white/70",
        className,
      )}
      title={error ? "Integrity check failed" : state === "invalid" ? "Signature or hash mismatch" : "Integrity status"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "verified" && "bg-emerald-400",
          state === "invalid" && "bg-red-400",
          state === "error" && "bg-yellow-400",
          state === "loading" && "bg-white/40",
        )}
      />
      {state === "verified" ? "Verified" : state === "invalid" ? "Invalid" : state === "error" ? "Unavailable" : "Checking…"}
    </span>
  )
}

