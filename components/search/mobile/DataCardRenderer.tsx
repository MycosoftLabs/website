"use client"

/**
 * DataCardRenderer - Feb 2026
 * 
 * Dynamically renders the appropriate card component based on data type.
 */

import { lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"
import type { DataCard } from "./MobileSearchChat"
import { SpeciesCard } from "./cards/SpeciesCard"
import { ChemistryCard } from "./cards/ChemistryCard"
import { GeneticsCard } from "./cards/GeneticsCard"
import { MapCard } from "./cards/MapCard"
import { TaxonomyCard } from "./cards/TaxonomyCard"
import { ImageGalleryCard } from "./cards/ImageGalleryCard"
import { ResearchCard } from "./cards/ResearchCard"

interface DataCardRendererProps {
  card: DataCard
  onSave?: () => void
}

export function DataCardRenderer({ card, onSave }: DataCardRendererProps) {
  const CardComponent = getCardComponent(card.type)
  
  if (!CardComponent) {
    return null
  }

  return (
    <Suspense fallback={<CardSkeleton />}>
      <CardComponent data={card.data} onSave={onSave} />
    </Suspense>
  )
}

function getCardComponent(type: DataCard["type"]) {
  switch (type) {
    case "species":
      return SpeciesCard
    case "chemistry":
      return ChemistryCard
    case "genetics":
      return GeneticsCard
    case "location":
      return MapCard
    case "taxonomy":
      return TaxonomyCard
    case "images":
      return ImageGalleryCard
    case "research":
    case "news":
      return ResearchCard
    default:
      return null
  }
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}
