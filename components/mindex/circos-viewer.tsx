"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CircleDot, RefreshCw, Download, Maximize2, Loader2,
  Dna, GitBranch, Workflow
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CircosViewerProps {
  speciesName?: string
  plotType?: "genome" | "pathway" | "phylogeny"
  className?: string
  onLoad?: (imageData: string) => void
}

const PLOT_TYPES = [
  { id: "genome", label: "Genome", icon: Dna, description: "Chromosome-level visualization" },
  { id: "pathway", label: "Pathway", icon: Workflow, description: "Metabolic pathway view" },
  { id: "phylogeny", label: "Phylogeny", icon: GitBranch, description: "Evolutionary relationships" },
]

const DEMO_SPECIES = [
  "Psilocybe cubensis",
  "Psilocybe semilanceata",
  "Hericium erinaceus",
  "Ganoderma lucidum",
  "Cordyceps militaris",
]

export function CircosViewer({
  speciesName = "Psilocybe cubensis",
  plotType: initialPlotType = "genome",
  className,
  onLoad
}: CircosViewerProps) {
  const [imageData, setImageData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plotType, setPlotType] = useState<string>(initialPlotType)
  const [species, setSpecies] = useState(speciesName)
  const [isFallback, setIsFallback] = useState(false)

  const fetchCircos = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type: plotType,
        species,
        format: "svg"
      })
      
      const response = await fetch(`/api/mindex/visualization/circos?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch circos: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.image) {
        setImageData(data.image)
        setIsFallback(data.fallback || false)
        onLoad?.(data.image)
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (err) {
      console.error("Circos fetch error:", err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [plotType, species, onLoad])

  useEffect(() => {
    fetchCircos()
  }, [fetchCircos])

  const handleDownload = () => {
    if (!imageData) return
    
    const link = document.createElement("a")
    link.href = imageData
    link.download = `${species.replace(/\s+/g, "_")}_${plotType}_circos.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const selectedPlotInfo = PLOT_TYPES.find(p => p.id === plotType)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CircleDot className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Circos Visualization
                <Badge variant="outline" className="text-xs">
                  pyCirclize
                </Badge>
                {isFallback && (
                  <Badge variant="secondary" className="text-xs">
                    Demo Mode
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Circular genomics and pathway visualization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchCircos}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!imageData}
              title="Download SVG"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Select value={plotType} onValueChange={setPlotType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Plot Type" />
            </SelectTrigger>
            <SelectContent>
              {PLOT_TYPES.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={species} onValueChange={setSpecies}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Species" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_SPECIES.map(sp => (
                <SelectItem key={sp} value={sp}>
                  {sp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPlotInfo && (
            <span className="text-xs text-muted-foreground">
              {selectedPlotInfo.description}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative aspect-square bg-[#0a0a0f] rounded-lg overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="text-sm text-muted-foreground">Generating circos plot...</span>
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <p className="text-destructive mb-2">Failed to generate plot</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchCircos} variant="outline" size="sm" className="mt-3">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : imageData ? (
            <img
              src={imageData}
              alt={`${species} ${plotType} circos plot`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground">No visualization available</div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-muted-foreground">Genes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-purple-500" />
              <span className="text-muted-foreground">Variants</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-cyan-500" />
              <span className="text-muted-foreground">Expression</span>
            </div>
          </div>
          
          {isFallback && (
            <span className="text-xs text-muted-foreground">
              Demo visualization • Install pyCirclize for full features
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
