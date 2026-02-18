"use client"

/**
 * Quick Facts Widget - Grid layout with real data
 * Conservation, habitat, distribution, edibility, toxicity
 * "Needs Research" indicator for missing data
 */

import { Leaf, MapPin, Globe, Utensils, AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QuickFactsData {
  conservationStatus?: string | null
  habitat?: string | null
  distribution?: string | null
  edibility?: string | null
  toxicity?: string | null
  family?: string | null
  commonName?: string | null
  rank?: string | null
}

interface QuickFactsWidgetProps {
  speciesName: string
  data: QuickFactsData
  className?: string
}

function FactCard({
  icon,
  label,
  value,
  needsResearch,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  needsResearch?: boolean
}) {
  const empty = !value || value.trim() === ""
  const display = empty ? "Not specified" : value
  const showNeedsResearch = needsResearch || empty

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card/50",
        "min-h-[80px] flex flex-col justify-between"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "text-sm font-medium",
          empty && "text-muted-foreground italic"
        )}
      >
        {display}
      </p>
      {showNeedsResearch && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 mt-1">
          <HelpCircle className="h-3 w-3" />
          Needs research
        </span>
      )}
    </div>
  )
}

export function QuickFactsWidget({
  speciesName,
  data,
  className,
}: QuickFactsWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <Leaf className="h-4 w-4 text-green-600" />
        Quick Facts
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FactCard
          icon={<Leaf className="h-3.5 w-3" />}
          label="Family"
          value={data.family}
          needsResearch={!data.family}
        />
        <FactCard
          icon={<AlertTriangle className="h-3.5 w-3" />}
          label="Conservation"
          value={data.conservationStatus}
          needsResearch={!data.conservationStatus}
        />
        <FactCard
          icon={<MapPin className="h-3.5 w-3" />}
          label="Habitat"
          value={data.habitat}
          needsResearch={!data.habitat}
        />
        <FactCard
          icon={<Globe className="h-3.5 w-3" />}
          label="Distribution"
          value={data.distribution}
          needsResearch={!data.distribution}
        />
        <FactCard
          icon={<Utensils className="h-3.5 w-3" />}
          label="Edibility"
          value={data.edibility}
          needsResearch={!data.edibility}
        />
        <FactCard
          icon={<AlertTriangle className="h-3.5 w-3" />}
          label="Toxicity"
          value={data.toxicity}
          needsResearch={!data.toxicity}
        />
      </div>
    </div>
  )
}
