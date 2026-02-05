/**
 * SpeciesWidget - Feb 2026
 * 
 * Rich species display widget with:
 * - Photo gallery
 * - Taxonomy hierarchy
 * - Quick stats
 * - Navigation to full species page
 */

"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ExternalLink, 
  MapPin, 
  Eye, 
  ChevronRight,
  Leaf,
} from "lucide-react"
import type { SpeciesResult } from "@/lib/search/unified-search-sdk"
import { cn } from "@/lib/utils"

interface SpeciesWidgetProps {
  data: SpeciesResult
  isFocused: boolean
  onExplore?: (type: string, id: string) => void
  className?: string
}

export function SpeciesWidget({ 
  data, 
  isFocused, 
  onExplore,
  className,
}: SpeciesWidgetProps) {
  const mainPhoto = data.photos?.[0]
  const taxonomyLevels = [
    { label: "Kingdom", value: data.taxonomy.kingdom },
    { label: "Phylum", value: data.taxonomy.phylum },
    { label: "Class", value: data.taxonomy.class },
    { label: "Order", value: data.taxonomy.order },
    { label: "Family", value: data.taxonomy.family },
    { label: "Genus", value: data.taxonomy.genus },
  ].filter((t) => t.value)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with photo */}
      <div className="flex gap-4">
        {/* Photo */}
        {mainPhoto && (
          <motion.div 
            className={cn(
              "relative shrink-0 rounded-lg overflow-hidden bg-muted",
              isFocused ? "w-32 h-32" : "w-20 h-20"
            )}
            layout
          >
            <Image
              src={mainPhoto.medium_url || mainPhoto.url}
              alt={data.commonName}
              fill
              className="object-cover"
              sizes={isFocused ? "128px" : "80px"}
            />
          </motion.div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {data.commonName}
          </h3>
          <p className="text-sm text-muted-foreground italic truncate">
            {data.scientificName}
          </p>
          
          {/* Quick stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {data.observationCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {data.observationCount.toLocaleString()} observations
              </span>
            )}
            {data.rank && (
              <Badge variant="outline" className="text-xs">
                {data.rank}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Focused view - expanded details */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Description */}
          {data.description && (
            <p className="text-sm leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Photo gallery - horizontal scroll */}
          {data.photos && data.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.photos.slice(0, 6).map((photo, index) => (
                <div
                  key={photo.id || index}
                  className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={photo.medium_url || photo.url}
                    alt={`${data.commonName} photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Taxonomy trail */}
          {taxonomyLevels.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Taxonomy
              </h4>
              <div className="flex flex-wrap items-center gap-1">
                {taxonomyLevels.map((level, index) => (
                  <div key={level.label} className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onExplore?.("taxonomy", level.value)}
                    >
                      <span className="text-muted-foreground mr-1">
                        {level.label}:
                      </span>
                      {level.value}
                    </Button>
                    {index < taxonomyLevels.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button asChild variant="default" size="sm">
              <Link href={`/species/${data.id}`}>
                View Full Page
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore?.("chemistry", data.id)}
            >
              <Leaf className="h-3 w-3 mr-1" />
              Compounds
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplore?.("genetics", data.id)}
            >
              Genetics
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SpeciesWidget
