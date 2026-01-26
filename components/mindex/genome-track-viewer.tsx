"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dna, ZoomIn, ZoomOut, RotateCcw, Download, 
  Maximize2, ChevronLeft, ChevronRight, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GenomeTrack {
  id: string
  name: string
  type: "gene" | "variant" | "expression" | "annotation"
  data: TrackDataPoint[]
  color?: string
}

interface TrackDataPoint {
  chromosome: string
  start: number
  end: number
  value?: number
  name?: string
  strand?: "+" | "-"
}

interface GenomeTrackViewerProps {
  speciesId?: string
  speciesName?: string
  tracks?: GenomeTrack[]
  className?: string
  onRegionSelect?: (region: { chr: string; start: number; end: number }) => void
}

// Default fungal genome data for demonstration
const defaultTracks: GenomeTrack[] = [
  {
    id: "genes",
    name: "Predicted Genes",
    type: "gene",
    color: "#22c55e",
    data: [
      { chromosome: "chr1", start: 1000, end: 5000, name: "psiD", strand: "+" },
      { chromosome: "chr1", start: 6000, end: 9000, name: "psiK", strand: "+" },
      { chromosome: "chr1", start: 10000, end: 14000, name: "psiM", strand: "-" },
      { chromosome: "chr1", start: 15000, end: 20000, name: "psiH", strand: "+" },
      { chromosome: "chr1", start: 22000, end: 26000, name: "psiR", strand: "-" },
      { chromosome: "chr1", start: 28000, end: 32000, name: "norbaeocystin", strand: "+" },
    ]
  },
  {
    id: "variants",
    name: "Genetic Variants",
    type: "variant",
    color: "#f59e0b",
    data: [
      { chromosome: "chr1", start: 2500, end: 2501, value: 0.8, name: "SNP-001" },
      { chromosome: "chr1", start: 7500, end: 7501, value: 0.6, name: "SNP-002" },
      { chromosome: "chr1", start: 12000, end: 12001, value: 0.9, name: "SNP-003" },
      { chromosome: "chr1", start: 18000, end: 18001, value: 0.7, name: "SNP-004" },
      { chromosome: "chr1", start: 24000, end: 24001, value: 0.5, name: "SNP-005" },
    ]
  },
  {
    id: "expression",
    name: "Expression Levels",
    type: "expression",
    color: "#8b5cf6",
    data: Array.from({ length: 50 }, (_, i) => ({
      chromosome: "chr1",
      start: i * 1000,
      end: (i + 1) * 1000,
      value: Math.random() * 100,
    }))
  },
  {
    id: "annotations",
    name: "Functional Annotations",
    type: "annotation",
    color: "#06b6d4",
    data: [
      { chromosome: "chr1", start: 1000, end: 9000, name: "Psilocybin biosynthesis cluster" },
      { chromosome: "chr1", start: 15000, end: 26000, name: "Secondary metabolism region" },
    ]
  }
]

export function GenomeTrackViewer({
  speciesId,
  speciesName = "Psilocybe cubensis",
  tracks = defaultTracks,
  className,
  onRegionSelect
}: GenomeTrackViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [viewRange, setViewRange] = useState({ start: 0, end: 50000 })
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [hoveredFeature, setHoveredFeature] = useState<TrackDataPoint | null>(null)
  
  const genomeLength = 50000 // Simplified genome length for demo
  const trackHeight = 40
  const trackGap = 8

  useEffect(() => {
    // Simulate loading genome data
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [speciesId])

  const handleZoomIn = useCallback(() => {
    const center = (viewRange.start + viewRange.end) / 2
    const newWidth = (viewRange.end - viewRange.start) * 0.5
    setViewRange({
      start: Math.max(0, center - newWidth / 2),
      end: Math.min(genomeLength, center + newWidth / 2)
    })
  }, [viewRange, genomeLength])

  const handleZoomOut = useCallback(() => {
    const center = (viewRange.start + viewRange.end) / 2
    const newWidth = (viewRange.end - viewRange.start) * 2
    setViewRange({
      start: Math.max(0, center - newWidth / 2),
      end: Math.min(genomeLength, center + newWidth / 2)
    })
  }, [viewRange, genomeLength])

  const handlePanLeft = useCallback(() => {
    const width = viewRange.end - viewRange.start
    const shift = width * 0.25
    setViewRange({
      start: Math.max(0, viewRange.start - shift),
      end: Math.max(width, viewRange.end - shift)
    })
  }, [viewRange])

  const handlePanRight = useCallback(() => {
    const width = viewRange.end - viewRange.start
    const shift = width * 0.25
    setViewRange({
      start: Math.min(genomeLength - width, viewRange.start + shift),
      end: Math.min(genomeLength, viewRange.end + shift)
    })
  }, [viewRange, genomeLength])

  const handleReset = useCallback(() => {
    setViewRange({ start: 0, end: genomeLength })
    setSelectedTrack(null)
  }, [genomeLength])

  const scalePosition = useCallback((pos: number): number => {
    const containerWidth = containerRef.current?.clientWidth || 800
    return ((pos - viewRange.start) / (viewRange.end - viewRange.start)) * containerWidth
  }, [viewRange])

  const formatPosition = (pos: number): string => {
    if (pos >= 1000000) return `${(pos / 1000000).toFixed(2)}Mb`
    if (pos >= 1000) return `${(pos / 1000).toFixed(1)}kb`
    return `${pos}bp`
  }

  const renderTrack = (track: GenomeTrack, index: number) => {
    const isSelected = selectedTrack === track.id
    const visibleData = track.data.filter(
      d => d.end >= viewRange.start && d.start <= viewRange.end
    )

    return (
      <div
        key={track.id}
        className={cn(
          "relative transition-all",
          isSelected && "ring-2 ring-primary rounded"
        )}
        style={{ height: trackHeight + trackGap }}
        onClick={() => setSelectedTrack(isSelected ? null : track.id)}
      >
        {/* Track label */}
        <div className="absolute left-0 top-0 w-32 h-full flex items-center text-xs font-medium text-muted-foreground truncate pr-2">
          {track.name}
        </div>

        {/* Track content */}
        <div 
          className="absolute left-32 right-0 top-0 bg-muted/30 rounded overflow-hidden"
          style={{ height: trackHeight }}
        >
          {track.type === "gene" && visibleData.map((gene, i) => {
            const x = scalePosition(gene.start)
            const width = Math.max(4, scalePosition(gene.end) - x)
            if (x > (containerRef.current?.clientWidth || 800) - 128 || x + width < 0) return null
            
            return (
              <div
                key={i}
                className="absolute h-6 top-2 rounded cursor-pointer hover:brightness-110 transition-all flex items-center justify-center text-[10px] text-white font-medium overflow-hidden"
                style={{
                  left: Math.max(0, x),
                  width: Math.min(width, (containerRef.current?.clientWidth || 800) - 128 - Math.max(0, x)),
                  backgroundColor: track.color,
                  transform: gene.strand === "-" ? "scaleY(-1)" : undefined
                }}
                onMouseEnter={() => setHoveredFeature(gene)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                {width > 50 && gene.name}
              </div>
            )
          })}

          {track.type === "variant" && visibleData.map((variant, i) => {
            const x = scalePosition(variant.start)
            if (x < 0 || x > (containerRef.current?.clientWidth || 800) - 128) return null
            
            return (
              <div
                key={i}
                className="absolute w-2 h-full rounded-full cursor-pointer hover:scale-150 transition-transform"
                style={{
                  left: x - 4,
                  backgroundColor: track.color,
                  opacity: variant.value || 0.8
                }}
                onMouseEnter={() => setHoveredFeature(variant)}
                onMouseLeave={() => setHoveredFeature(null)}
              />
            )
          })}

          {track.type === "expression" && (
            <svg className="absolute inset-0 w-full h-full">
              <path
                d={visibleData.map((d, i) => {
                  const x = scalePosition((d.start + d.end) / 2)
                  const y = trackHeight - (d.value || 0) / 100 * (trackHeight - 4)
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')}
                fill="none"
                stroke={track.color}
                strokeWidth={2}
              />
              <path
                d={`${visibleData.map((d, i) => {
                  const x = scalePosition((d.start + d.end) / 2)
                  const y = trackHeight - (d.value || 0) / 100 * (trackHeight - 4)
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')} L ${scalePosition(visibleData[visibleData.length - 1]?.end || 0)} ${trackHeight} L ${scalePosition(visibleData[0]?.start || 0)} ${trackHeight} Z`}
                fill={track.color}
                fillOpacity={0.2}
              />
            </svg>
          )}

          {track.type === "annotation" && visibleData.map((anno, i) => {
            const x = scalePosition(anno.start)
            const width = Math.max(4, scalePosition(anno.end) - x)
            if (x > (containerRef.current?.clientWidth || 800) - 128 || x + width < 0) return null
            
            return (
              <div
                key={i}
                className="absolute h-4 top-3 rounded-sm cursor-pointer hover:brightness-110 transition-all border-2 flex items-center px-1"
                style={{
                  left: Math.max(0, x),
                  width: Math.min(width, (containerRef.current?.clientWidth || 800) - 128 - Math.max(0, x)),
                  borderColor: track.color,
                  backgroundColor: `${track.color}20`
                }}
                onMouseEnter={() => setHoveredFeature(anno)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <span className="text-[9px] text-muted-foreground truncate">{anno.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Dna className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Genome Track Viewer
                <Badge variant="outline" className="text-xs">Gosling.js</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{speciesName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePanLeft} title="Pan left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePanRight} title="Pan right">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset view">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Export">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Position indicator */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>chr1:{formatPosition(viewRange.start)}</span>
          <span>Region: {formatPosition(viewRange.end - viewRange.start)}</span>
          <span>chr1:{formatPosition(viewRange.end)}</span>
        </div>
      </CardHeader>

      <CardContent ref={containerRef}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Chromosome scale */}
            <div className="relative h-6 ml-32 bg-muted/50 rounded">
              {Array.from({ length: 11 }).map((_, i) => {
                const pos = viewRange.start + (viewRange.end - viewRange.start) * (i / 10)
                return (
                  <div
                    key={i}
                    className="absolute text-[10px] text-muted-foreground"
                    style={{ left: `${i * 10}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="h-2 w-px bg-muted-foreground/50 mx-auto" />
                    {formatPosition(pos)}
                  </div>
                )
              })}
            </div>

            {/* Tracks */}
            {tracks.map((track, index) => renderTrack(track, index))}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              {tracks.map(track => (
                <div key={track.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-muted-foreground">{track.name}</span>
                </div>
              ))}
            </div>

            {/* Hover tooltip */}
            {hoveredFeature && (
              <div className="fixed bottom-4 right-4 p-3 bg-popover border rounded-lg shadow-lg text-sm z-50">
                <div className="font-medium">{hoveredFeature.name || "Feature"}</div>
                <div className="text-muted-foreground">
                  Position: {formatPosition(hoveredFeature.start)} - {formatPosition(hoveredFeature.end)}
                </div>
                {hoveredFeature.value !== undefined && (
                  <div className="text-muted-foreground">
                    Value: {hoveredFeature.value.toFixed(2)}
                  </div>
                )}
                {hoveredFeature.strand && (
                  <div className="text-muted-foreground">
                    Strand: {hoveredFeature.strand}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
