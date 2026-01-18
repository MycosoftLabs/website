"use client"

/**
 * Unified Biodiversity Layer Component
 * 
 * Displays biodiversity data from multiple sources:
 * - GBIF: Global biodiversity observations
 * - eBird: Bird sightings
 * - OBIS: Marine species
 * - iNaturalist: Community observations (existing)
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { useMap, Marker, Popup } from "react-map-gl/maplibre"
import type { Entity, GeoLocation, GeoBounds } from "@/types/oei"
import type { SpeciesEntity } from "@/lib/oei/connectors/gbif"
import type { BirdObservationEntity } from "@/lib/oei/connectors/ebird"
import type { MarineSpeciesEntity } from "@/lib/oei/connectors/obis"

// =============================================================================
// TYPES
// =============================================================================

export type BiodiversitySource = "gbif" | "ebird" | "obis" | "inaturalist" | "all"

export interface BiodiversityLayerProps {
  visible?: boolean
  sources?: BiodiversitySource[]
  bounds?: GeoBounds
  kingdom?: string  // Filter by kingdom (Fungi, Animalia, Plantae, etc.)
  onEntityClick?: (entity: Entity) => void
  onEntityHover?: (entity: Entity | null) => void
  maxEntities?: number
  refreshInterval?: number  // milliseconds
}

interface BiodiversityData {
  gbif: SpeciesEntity[]
  ebird: BirdObservationEntity[]
  obis: MarineSpeciesEntity[]
  inaturalist: Entity[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// =============================================================================
// ICON CONFIGURATIONS
// =============================================================================

const SOURCE_ICONS: Record<string, { emoji: string; color: string; bgColor: string }> = {
  gbif: { emoji: "🌍", color: "#22c55e", bgColor: "bg-green-600" },
  ebird: { emoji: "🐦", color: "#3b82f6", bgColor: "bg-blue-500" },
  obis: { emoji: "🐋", color: "#06b6d4", bgColor: "bg-cyan-500" },
  inaturalist: { emoji: "🍄", color: "#d97706", bgColor: "bg-amber-600" },
}

const KINGDOM_ICONS: Record<string, string> = {
  Fungi: "🍄",
  Animalia: "🦎",
  Plantae: "🌿",
  Aves: "🐦",
  Mammalia: "🦊",
  Reptilia: "🦎",
  Amphibia: "🐸",
  Insecta: "🦋",
  Mollusca: "🐚",
  Cnidaria: "🪸",
  default: "🔬",
}

// =============================================================================
// DATA FETCHING HOOKS
// =============================================================================

function useBiodiversityData(
  sources: BiodiversitySource[],
  bounds?: GeoBounds,
  kingdom?: string,
  maxEntities = 100
): BiodiversityData {
  const [data, setData] = useState<BiodiversityData>({
    gbif: [],
    ebird: [],
    obis: [],
    inaturalist: [],
    loading: false,
    error: null,
    lastUpdated: null,
  })

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }))

    const shouldFetch = (source: BiodiversitySource) => 
      sources.includes("all") || sources.includes(source)

    try {
      const results = await Promise.allSettled([
        // GBIF
        shouldFetch("gbif") 
          ? fetch(`/api/oei/gbif?${new URLSearchParams({
              ...(bounds ? {
                north: String(bounds.north),
                south: String(bounds.south),
                east: String(bounds.east),
                west: String(bounds.west),
              } : {}),
              ...(kingdom ? { kingdom } : {}),
              limit: String(maxEntities),
              hasCoordinate: "true",
            })}`).then(r => r.json())
          : Promise.resolve({ entities: [] }),
        
        // eBird (needs lat/lng, use center of bounds)
        shouldFetch("ebird") && bounds
          ? fetch(`/api/oei/ebird?${new URLSearchParams({
              lat: String((bounds.north + bounds.south) / 2),
              lng: String((bounds.east + bounds.west) / 2),
              dist: "50",
              maxResults: String(maxEntities),
            })}`).then(r => r.json())
          : Promise.resolve({ entities: [] }),
        
        // OBIS
        shouldFetch("obis")
          ? fetch(`/api/oei/obis?${new URLSearchParams({
              ...(bounds ? {
                north: String(bounds.north),
                south: String(bounds.south),
                east: String(bounds.east),
                west: String(bounds.west),
              } : {}),
              size: String(maxEntities),
            })}`).then(r => r.json())
          : Promise.resolve({ entities: [] }),
      ])

      setData({
        gbif: results[0].status === "fulfilled" ? results[0].value.entities || [] : [],
        ebird: results[1].status === "fulfilled" ? results[1].value.entities || [] : [],
        obis: results[2].status === "fulfilled" ? results[2].value.entities || [] : [],
        inaturalist: [], // Handled by existing fungal layer
        loading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch biodiversity data",
      }))
    }
  }, [sources, bounds, kingdom, maxEntities])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return data
}

// =============================================================================
// MARKER COMPONENTS
// =============================================================================

interface BiodiversityMarkerProps {
  entity: Entity
  source: BiodiversitySource
  isSelected?: boolean
  onClick?: () => void
  onHover?: (hovering: boolean) => void
}

function BiodiversityMarker({ entity, source, isSelected, onClick, onHover }: BiodiversityMarkerProps) {
  if (!entity.location) return null

  const config = SOURCE_ICONS[source] || SOURCE_ICONS.gbif
  const kingdom = (entity.properties as { kingdom?: string })?.kingdom
  const icon = kingdom ? (KINGDOM_ICONS[kingdom] || KINGDOM_ICONS.default) : config.emoji

  return (
    <Marker
      longitude={entity.location.longitude}
      latitude={entity.location.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick?.()
      }}
    >
      <button
        className={`
          flex items-center justify-center rounded-full transition-all duration-200
          ${config.bgColor}/90 hover:${config.bgColor} hover:scale-110
          ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-125" : ""}
          shadow-lg cursor-pointer
        `}
        style={{
          width: isSelected ? 36 : 28,
          height: isSelected ? 36 : 28,
          fontSize: isSelected ? 18 : 14,
        }}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        data-marker="biodiversity"
        title={entity.name}
      >
        <span>{icon}</span>
      </button>
    </Marker>
  )
}

// =============================================================================
// POPUP COMPONENT
// =============================================================================

interface BiodiversityPopupProps {
  entity: Entity
  source: BiodiversitySource
  onClose: () => void
}

function BiodiversityPopup({ entity, source, onClose }: BiodiversityPopupProps) {
  if (!entity.location) return null

  const config = SOURCE_ICONS[source]
  const props = entity.properties as Record<string, unknown>

  return (
    <Popup
      longitude={entity.location.longitude}
      latitude={entity.location.latitude}
      anchor="bottom"
      offset={[0, -20]}
      closeButton
      closeOnClick={false}
      onClose={onClose}
      className="biodiversity-popup"
      maxWidth="320px"
    >
      <div className="p-3 min-w-[280px]">
        {/* Header */}
        <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-gray-700`}>
          <span className="text-xl">{config.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{entity.name}</h3>
            <p className="text-xs text-gray-400 capitalize">{source}</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 text-sm">
          {/* Scientific Name */}
          {props.scientificName && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-20">Scientific:</span>
              <span className="text-gray-200 italic flex-1">{String(props.scientificName)}</span>
            </div>
          )}

          {/* Taxonomy */}
          {(props.kingdom || props.phylum || props.family) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-20">Taxonomy:</span>
              <span className="text-gray-300 flex-1">
                {[props.kingdom, props.phylum, props.family].filter(Boolean).join(" › ")}
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start gap-2">
            <span className="text-gray-500 w-20">Location:</span>
            <span className="text-gray-300 flex-1">
              {entity.location.latitude.toFixed(4)}, {entity.location.longitude.toFixed(4)}
            </span>
          </div>

          {/* Depth (for marine) */}
          {props.depth && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-20">Depth:</span>
              <span className="text-gray-300">{props.depth}m</span>
            </div>
          )}

          {/* Date */}
          {(props.eventDate || props.observationDate) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-20">Observed:</span>
              <span className="text-gray-300">
                {new Date(String(props.eventDate || props.observationDate)).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Count */}
          {props.count && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-20">Count:</span>
              <span className="text-gray-300">{props.count}</span>
            </div>
          )}
        </div>

        {/* External Link */}
        {entity.provenance?.url && (
          <a
            href={entity.provenance.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              mt-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded
              ${config.bgColor} hover:opacity-90 text-white text-sm transition-all
            `}
          >
            View on {source.toUpperCase()} →
          </a>
        )}
      </div>
    </Popup>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BiodiversityLayer({
  visible = true,
  sources = ["all"],
  bounds,
  kingdom,
  onEntityClick,
  onEntityHover,
  maxEntities = 100,
  refreshInterval,
}: BiodiversityLayerProps) {
  const [selectedEntity, setSelectedEntity] = useState<{ entity: Entity; source: BiodiversitySource } | null>(null)
  
  const data = useBiodiversityData(sources, bounds, kingdom, maxEntities)

  // Combine all entities
  const allEntities = useMemo(() => {
    const combined: Array<{ entity: Entity; source: BiodiversitySource }> = []
    
    data.gbif.forEach(e => combined.push({ entity: e, source: "gbif" }))
    data.ebird.forEach(e => combined.push({ entity: e, source: "ebird" }))
    data.obis.forEach(e => combined.push({ entity: e, source: "obis" }))
    
    return combined.slice(0, maxEntities)
  }, [data.gbif, data.ebird, data.obis, maxEntities])

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval) return
    
    const interval = setInterval(() => {
      // Trigger re-fetch by updating a dependency
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  if (!visible) return null

  return (
    <>
      {/* Markers */}
      {allEntities.map(({ entity, source }) => (
        <BiodiversityMarker
          key={`${source}-${entity.id}`}
          entity={entity}
          source={source}
          isSelected={selectedEntity?.entity.id === entity.id}
          onClick={() => {
            setSelectedEntity({ entity, source })
            onEntityClick?.(entity)
          }}
          onHover={(hovering) => onEntityHover?.(hovering ? entity : null)}
        />
      ))}

      {/* Popup */}
      {selectedEntity && (
        <BiodiversityPopup
          entity={selectedEntity.entity}
          source={selectedEntity.source}
          onClose={() => setSelectedEntity(null)}
        />
      )}

      {/* Loading indicator */}
      {data.loading && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
          Loading biodiversity data...
        </div>
      )}

      {/* Error message */}
      {data.error && (
        <div className="absolute top-4 right-4 bg-red-900/70 text-white px-3 py-1 rounded text-sm">
          {data.error}
        </div>
      )}
    </>
  )
}

export default BiodiversityLayer
