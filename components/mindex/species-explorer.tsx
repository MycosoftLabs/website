"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Globe, Search, MapPin, Layers, RefreshCw, 
  Filter, Download, Maximize2, Eye, Grid3X3,
  Activity, Dna, Loader2, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Observation {
  id: string | number
  latitude: number
  longitude: number
  species_name?: string
  observed_at?: string
  image_url?: string
  source?: string
  quality_grade?: string
}

interface SpeciesStats {
  total_observations: number
  species_count: number
  countries: number
  date_range: { start: string; end: string }
}

interface SpeciesExplorerProps {
  className?: string
  initialSpecies?: string
}

// Demo observation data (will be replaced with MINDEX API data)
const generateDemoObservations = (): Observation[] => {
  const species = [
    "Psilocybe cubensis", "Psilocybe semilanceata", "Hericium erinaceus",
    "Ganoderma lucidum", "Cordyceps militaris", "Pleurotus ostreatus"
  ]
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: `obs-${i}`,
    latitude: 30 + Math.random() * 40,
    longitude: -120 + Math.random() * 100,
    species_name: species[Math.floor(Math.random() * species.length)],
    observed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    source: Math.random() > 0.5 ? "iNaturalist" : "GBIF",
    quality_grade: Math.random() > 0.7 ? "research" : "needs_id"
  }))
}

// Simple spatial heatmap visualization
function SpatialHeatmap({ 
  observations, 
  selectedSpecies,
  onCellClick 
}: { 
  observations: Observation[]
  selectedSpecies: string | null
  onCellClick?: (cell: { lat: number; lng: number; count: number }) => void
}) {
  const gridSize = 20
  
  // Create grid cells from observations
  const grid = useMemo(() => {
    const cells: Map<string, { lat: number; lng: number; count: number; species: Set<string> }> = new Map()
    
    const filtered = selectedSpecies 
      ? observations.filter(o => o.species_name === selectedSpecies)
      : observations
    
    filtered.forEach(obs => {
      const latBin = Math.floor((obs.latitude + 90) / (180 / gridSize))
      const lngBin = Math.floor((obs.longitude + 180) / (360 / gridSize))
      const key = `${latBin}-${lngBin}`
      
      if (!cells.has(key)) {
        cells.set(key, {
          lat: latBin * (180 / gridSize) - 90 + (90 / gridSize),
          lng: lngBin * (360 / gridSize) - 180 + (180 / gridSize),
          count: 0,
          species: new Set()
        })
      }
      
      const cell = cells.get(key)!
      cell.count++
      if (obs.species_name) cell.species.add(obs.species_name)
    })
    
    return Array.from(cells.values())
  }, [observations, selectedSpecies])
  
  const maxCount = Math.max(...grid.map(c => c.count), 1)
  
  return (
    <div className="relative w-full aspect-[2/1] bg-slate-900 rounded-lg overflow-hidden">
      {/* World map background grid */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 180">
        {/* Grid lines */}
        {Array.from({ length: 19 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * 10}
            x2={360}
            y2={i * 10}
            stroke="#334155"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: 37 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 10}
            y1={0}
            x2={i * 10}
            y2={180}
            stroke="#334155"
            strokeWidth={0.5}
          />
        ))}
        
        {/* Observation points */}
        {grid.map((cell, i) => {
          const x = (cell.lng + 180)
          const y = 180 - (cell.lat + 90)
          const intensity = cell.count / maxCount
          const radius = 2 + intensity * 6
          
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={radius + 2}
                fill="#22c55e"
                opacity={intensity * 0.3}
                className="animate-pulse"
              />
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="#22c55e"
                opacity={0.6 + intensity * 0.4}
                className="cursor-pointer hover:fill-green-400 transition-colors"
                onClick={() => onCellClick?.(cell)}
              />
            </g>
          )
        })}
        
        {/* Equator and prime meridian */}
        <line x1={0} y1={90} x2={360} y2={90} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={180} y1={0} x2={180} y2={180} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 4" />
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-1 text-xs text-white flex items-center gap-2">
        <span className="text-muted-foreground">Density:</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500/40" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>High</span>
        </div>
      </div>
      
      {/* Stats overlay */}
      <div className="absolute top-2 left-2 bg-black/60 rounded px-2 py-1 text-xs text-white">
        {grid.length} grid cells • {observations.length} observations
      </div>
    </div>
  )
}

// Species list sidebar
function SpeciesList({
  observations,
  selectedSpecies,
  onSelectSpecies
}: {
  observations: Observation[]
  selectedSpecies: string | null
  onSelectSpecies: (species: string | null) => void
}) {
  const speciesCounts = useMemo(() => {
    const counts: Map<string, number> = new Map()
    observations.forEach(obs => {
      if (obs.species_name) {
        counts.set(obs.species_name, (counts.get(obs.species_name) || 0) + 1)
      }
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [observations])
  
  return (
    <div className="space-y-2">
      <Button
        variant={selectedSpecies === null ? "secondary" : "ghost"}
        size="sm"
        className="w-full justify-start"
        onClick={() => onSelectSpecies(null)}
      >
        <Grid3X3 className="h-4 w-4 mr-2" />
        All Species ({observations.length})
      </Button>
      
      <ScrollArea className="h-[200px]">
        <div className="space-y-1">
          {speciesCounts.map(([species, count]) => (
            <Button
              key={species}
              variant={selectedSpecies === species ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => onSelectSpecies(species)}
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate text-sm italic">{species}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {count}
                </Badge>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// Observation details panel
function ObservationPanel({ observation }: { observation: Observation | null }) {
  if (!observation) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Select a grid cell to view observations
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <MapPin className="h-5 w-5 text-green-500" />
        <div>
          <div className="font-medium">{observation.species_name}</div>
          <div className="text-sm text-muted-foreground">
            {observation.latitude.toFixed(4)}°, {observation.longitude.toFixed(4)}°
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Source:</span>{" "}
          <Badge variant="outline">{observation.source}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Quality:</span>{" "}
          <Badge 
            variant={observation.quality_grade === "research" ? "default" : "secondary"}
          >
            {observation.quality_grade}
          </Badge>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Observed:</span>{" "}
          {observation.observed_at 
            ? new Date(observation.observed_at).toLocaleDateString() 
            : "Unknown"}
        </div>
      </div>
    </div>
  )
}

export function SpeciesExplorer({ className, initialSpecies }: SpeciesExplorerProps) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(initialSpecies || null)
  const [selectedCell, setSelectedCell] = useState<{ lat: number; lng: number; count: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"spatial" | "grid" | "timeline">("spatial")

  const fetchObservations = useCallback(async () => {
    setLoading(true)
    try {
      // Try to fetch from MINDEX API
      const response = await fetch("/api/natureos/mindex/observations?limit=500")
      
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          setObservations(data.results.map((obs: any) => ({
            id: obs.id,
            latitude: obs.latitude || obs.decimalLatitude,
            longitude: obs.longitude || obs.decimalLongitude,
            species_name: obs.species_guess || obs.taxon?.name,
            observed_at: obs.observed_on || obs.time_observed_at,
            source: obs.source || "iNaturalist",
            quality_grade: obs.quality_grade
          })).filter((obs: Observation) => obs.latitude && obs.longitude))
          setLoading(false)
          return
        }
      }
      
      // Fallback to demo data
      setObservations(generateDemoObservations())
    } catch (err) {
      console.error("Failed to fetch observations:", err)
      setObservations(generateDemoObservations())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchObservations()
  }, [fetchObservations])

  const stats: SpeciesStats = useMemo(() => {
    const species = new Set(observations.map(o => o.species_name).filter(Boolean))
    const dates = observations
      .map(o => o.observed_at)
      .filter(Boolean)
      .sort() as string[]
    
    return {
      total_observations: observations.length,
      species_count: species.size,
      countries: Math.floor(observations.length / 15), // Rough estimate
      date_range: {
        start: dates[0] || "",
        end: dates[dates.length - 1] || ""
      }
    }
  }, [observations])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Globe className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Species Explorer
                <Badge variant="outline" className="text-xs">Vitessce</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Spatial distribution and multi-modal data visualization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchObservations}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <div className="text-lg font-bold text-cyan-500">{stats.total_observations}</div>
            <div className="text-xs text-muted-foreground">Observations</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <div className="text-lg font-bold text-green-500">{stats.species_count}</div>
            <div className="text-xs text-muted-foreground">Species</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-500">{stats.countries}</div>
            <div className="text-xs text-muted-foreground">Regions</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <div className="text-lg font-bold text-amber-500">
              {observations.filter(o => o.quality_grade === "research").length}
            </div>
            <div className="text-xs text-muted-foreground">Research Grade</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="spatial" className="gap-2">
              <Globe className="h-4 w-4" />
              Spatial
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Activity className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="spatial" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Species filter sidebar */}
                <div className="lg:col-span-1 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter species..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <SpeciesList
                    observations={observations.filter(o => 
                      !searchQuery || 
                      o.species_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )}
                    selectedSpecies={selectedSpecies}
                    onSelectSpecies={setSelectedSpecies}
                  />
                </div>

                {/* Main visualization */}
                <div className="lg:col-span-3 space-y-4">
                  <SpatialHeatmap
                    observations={observations}
                    selectedSpecies={selectedSpecies}
                    onCellClick={setSelectedCell}
                  />
                  
                  {selectedCell && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Selected Region: {selectedCell.count} observations
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Center: {selectedCell.lat.toFixed(2)}°N, {selectedCell.lng.toFixed(2)}°E
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="grid" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {observations.slice(0, 24).map(obs => (
                  <div 
                    key={String(obs.id)} 
                    className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium truncate italic">
                      {obs.species_name || "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {obs.latitude?.toFixed(2)}°, {obs.longitude?.toFixed(2)}°
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        {obs.source}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="font-medium">Timeline View</div>
                <div className="text-sm">Observation frequency over time</div>
                <div className="text-xs mt-2">Coming soon with full Vitessce integration</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
