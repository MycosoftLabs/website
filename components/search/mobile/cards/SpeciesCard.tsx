"use client"

/**
 * SpeciesCard - Feb 2026
 * 
 * Compact mobile card displaying species information.
 */

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Leaf, MapPin, ExternalLink, Bookmark, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SpeciesCardProps {
  data: Record<string, unknown>
  onSave?: () => void
}

export function SpeciesCard({ data, onSave }: SpeciesCardProps) {
  const [expanded, setExpanded] = useState(false)

  const name = (data.name || data.scientificName || "Unknown Species") as string
  const commonName = (data.commonName || data.vernacularName) as string | undefined
  const imageUrl = data.imageUrl as string | undefined
  const habitat = data.habitat as string | undefined
  const edibility = data.edibility as string | undefined
  const taxonomy = data.taxonomy as Record<string, string> | undefined
  const observations = data.observationCount as number | undefined
  const id = data.id as string | undefined

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header with image */}
      <div className="flex gap-3 p-3">
        {imageUrl ? (
          <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-muted">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Leaf className="h-6 w-6 text-green-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate italic">{name}</h3>
          {commonName && (
            <p className="text-xs text-muted-foreground truncate">{commonName}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {edibility && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] h-5",
                  edibility.toLowerCase().includes("edible") && "bg-green-500/10 text-green-500 border-green-500/20",
                  edibility.toLowerCase().includes("toxic") && "bg-red-500/10 text-red-500 border-red-500/20",
                  edibility.toLowerCase().includes("poison") && "bg-red-500/10 text-red-500 border-red-500/20"
                )}
              >
                {edibility}
              </Badge>
            )}
            {observations && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {observations.toLocaleString()} observations
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t">
          {habitat && (
            <div className="text-xs pt-2">
              <span className="text-muted-foreground">Habitat: </span>
              <span>{habitat}</span>
            </div>
          )}
          
          {taxonomy && (
            <div className="text-xs space-y-1">
              <span className="text-muted-foreground">Taxonomy:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(taxonomy).slice(0, 4).map(([rank, value]) => (
                  <Badge key={rank} variant="outline" className="text-[9px]">
                    {rank}: {value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {id && (
            <Link
              href={`/species/${id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              View full details
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
