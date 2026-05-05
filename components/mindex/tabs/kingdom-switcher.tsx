"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type KingdomFilterId = "all" | "fungi" | "plantae" | "animalia" | "bacteria" | "other"

const KINGDOMS: { id: KingdomFilterId; label: string }[] = [
  { id: "all", label: "All life" },
  { id: "fungi", label: "Fungi" },
  { id: "plantae", label: "Plants" },
  { id: "animalia", label: "Animals" },
  { id: "bacteria", label: "Bacteria / Archaea" },
  { id: "other", label: "Other" },
]

export function KingdomSwitcher({
  value,
  onChange,
  className,
}: {
  value: KingdomFilterId
  onChange: (k: KingdomFilterId) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="tablist" aria-label="Kingdom filter">
      {KINGDOMS.map((k) => (
        <Button
          key={k.id}
          type="button"
          variant={value === k.id ? "default" : "outline"}
          size="sm"
          className={cn(
            "min-h-[44px] touch-manipulation text-base sm:text-sm",
            value === k.id ? "bg-purple-600 hover:bg-purple-700" : "border-purple-500/30 text-purple-200",
          )}
          onClick={() => onChange(k.id)}
          aria-pressed={value === k.id}
        >
          {k.label}
        </Button>
      ))}
    </div>
  )
}
