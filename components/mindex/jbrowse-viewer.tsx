"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  Dna, ZoomIn, ZoomOut, RefreshCw, Download, 
  Maximize2, Search, ChevronLeft, ChevronRight, Loader2,
  Layers, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

interface JBrowseViewerProps {
  className?: string
  speciesId?: string
  initialAssembly?: string
}

interface Assembly {
  id: string
  name: string
  scientificName: string
  chromosomes: { name: string; length: number }[]
}

// Demo assemblies for fungal species
const DEMO_ASSEMBLIES: Assembly[] = [
  {
    id: "psilocybe_cubensis",
    name: "P. cubensis",
    scientificName: "Psilocybe cubensis",
    chromosomes: [
      { name: "chr1", length: 5200000 },
      { name: "chr2", length: 4800000 },
      { name: "chr3", length: 4200000 },
      { name: "chr4", length: 3900000 },
      { name: "chr5", length: 3500000 },
    ]
  },
  {
    id: "hericium_erinaceus",
    name: "H. erinaceus",
    scientificName: "Hericium erinaceus",
    chromosomes: [
      { name: "chr1", length: 4800000 },
      { name: "chr2", length: 4500000 },
      { name: "chr3", length: 4100000 },
      { name: "chr4", length: 3700000 },
    ]
  },
  {
    id: "ganoderma_lucidum",
    name: "G. lucidum",
    scientificName: "Ganoderma lucidum",
    chromosomes: [
      { name: "chr1", length: 5500000 },
      { name: "chr2", length: 5100000 },
      { name: "chr3", length: 4700000 },
      { name: "chr4", length: 4300000 },
      { name: "chr5", length: 3900000 },
      { name: "chr6", length: 3500000 },
    ]
  }
]

// Demo gene annotations
const generateDemoGenes = (chromosome: string, length: number) => {
  const genes = []
  let position = 50000
  const geneNames = ["abc1", "def2", "ghi3", "jkl4", "mno5", "pqr6", "stu7", "vwx8"]
  
  while (position < length - 100000) {
    const geneLength = 2000 + Math.random() * 8000
    genes.push({
      id: `gene_${genes.length + 1}`,
      name: geneNames[Math.floor(Math.random() * geneNames.length)] + (genes.length + 1),
      chromosome,
      start: Math.floor(position),
      end: Math.floor(position + geneLength),
      strand: Math.random() > 0.5 ? "+" : "-",
      type: Math.random() > 0.7 ? "biosynthesis" : "housekeeping"
    })
    position += geneLength + 20000 + Math.random() * 50000
  }
  
  return genes
}

// Custom linear genome view component
function LinearGenomeView({
  assembly,
  chromosome,
  start,
  end,
  genes,
  onNavigate
}: {
  assembly: Assembly
  chromosome: string
  start: number
  end: number
  genes: any[]
  onNavigate: (chr: string, start: number, end: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hoveredGene, setHoveredGene] = useState<any>(null)

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth)
    }
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const scale = (pos: number) => ((pos - start) / (end - start)) * width
  const formatPosition = (pos: number) => {
    if (pos >= 1000000) return `${(pos / 1000000).toFixed(2)} Mb`
    if (pos >= 1000) return `${(pos / 1000).toFixed(1)} kb`
    return `${pos} bp`
  }

  const visibleGenes = genes.filter(
    g => g.chromosome === chromosome && g.end >= start && g.start <= end
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Chromosome selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {assembly.chromosomes.map((chr, i) => (
          <Button
            key={chr.name}
            variant={chromosome === chr.name ? "default" : "outline"}
            size="sm"
            onClick={() => onNavigate(chr.name, 0, chr.length)}
            className="flex-shrink-0"
          >
            {chr.name}
          </Button>
        ))}
      </div>

      {/* Ruler */}
      <div className="h-8 bg-slate-800 rounded-t-lg relative overflow-hidden">
        {Array.from({ length: 11 }).map((_, i) => {
          const pos = start + ((end - start) * i) / 10
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${i * 10}%` }}
            >
              <div className="h-3 w-px bg-slate-500" />
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {formatPosition(pos)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Ideogram track */}
      <div className="h-6 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 relative">
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
          {chromosome} : {formatPosition(start)} - {formatPosition(end)}
        </div>
      </div>

      {/* Gene track */}
      <div className="h-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-12 h-full bg-slate-800 flex items-center justify-center z-10">
          <span className="text-[10px] text-slate-400 rotate-[-90deg]">Genes</span>
        </div>
        <div className="ml-12 h-full relative">
          {visibleGenes.map((gene, i) => {
            const x = scale(gene.start)
            const geneWidth = Math.max(4, scale(gene.end) - x)
            const y = gene.strand === "+" ? 15 : 45
            const color = gene.type === "biosynthesis" ? "#22c55e" : "#6366f1"
            
            if (x > width || x + geneWidth < 0) return null
            
            return (
              <div
                key={gene.id}
                className="absolute h-6 rounded cursor-pointer transition-all hover:brightness-125"
                style={{
                  left: Math.max(0, x),
                  top: y,
                  width: Math.min(geneWidth, width - Math.max(0, x)),
                  backgroundColor: color
                }}
                onMouseEnter={() => setHoveredGene(gene)}
                onMouseLeave={() => setHoveredGene(null)}
              >
                {geneWidth > 40 && (
                  <span className="text-[10px] text-white px-1 truncate block leading-6">
                    {gene.name}
                  </span>
                )}
                {/* Arrow for strand direction */}
                <div 
                  className="absolute right-0 top-0 h-full w-2"
                  style={{
                    background: gene.strand === "+" 
                      ? `linear-gradient(to right, transparent, ${color})`
                      : `linear-gradient(to left, transparent, ${color})`
                  }}
                />
              </div>
            )
          })}
        </div>
        
        {/* Strand labels */}
        <div className="absolute right-2 top-4 text-[10px] text-green-400">+ strand</div>
        <div className="absolute right-2 bottom-4 text-[10px] text-blue-400">- strand</div>
      </div>

      {/* Sequence track placeholder */}
      <div className="h-10 bg-slate-800 rounded-b-lg flex items-center justify-center text-xs text-slate-500">
        <Dna className="h-4 w-4 mr-2 opacity-50" />
        Sequence track (zoom in to 10kb to view)
      </div>

      {/* Hover tooltip */}
      {hoveredGene && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 p-3 bg-popover border rounded-lg shadow-xl z-50 text-sm min-w-[200px]">
          <div className="font-medium">{hoveredGene.name}</div>
          <div className="text-muted-foreground text-xs mt-1">
            {hoveredGene.chromosome}:{formatPosition(hoveredGene.start)}-{formatPosition(hoveredGene.end)}
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant={hoveredGene.type === "biosynthesis" ? "default" : "secondary"}>
              {hoveredGene.type}
            </Badge>
            <Badge variant="outline">{hoveredGene.strand} strand</Badge>
          </div>
        </div>
      )}
    </div>
  )
}

export function JBrowseViewer({ className, speciesId, initialAssembly }: JBrowseViewerProps) {
  const [loading, setLoading] = useState(true)
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly>(
    DEMO_ASSEMBLIES.find(a => a.id === initialAssembly) || DEMO_ASSEMBLIES[0]
  )
  const [chromosome, setChromosome] = useState(selectedAssembly.chromosomes[0].name)
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(selectedAssembly.chromosomes[0].length)
  const [genes, setGenes] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch genes from MINDEX API
  useEffect(() => {
    const fetchGenes = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/natureos/mindex/genes/${selectedAssembly.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.genes && data.genes.length > 0) {
            setGenes(data.genes)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("Failed to fetch genes from API:", error)
      }
      
      // Fallback to demo data if API fails
      const allGenes = selectedAssembly.chromosomes.flatMap(chr => 
        generateDemoGenes(chr.name, chr.length)
      )
      setGenes(allGenes)
      setLoading(false)
    }
    
    fetchGenes()
  }, [selectedAssembly])

  // Handle assembly change
  const handleAssemblyChange = useCallback((assemblyId: string) => {
    const assembly = DEMO_ASSEMBLIES.find(a => a.id === assemblyId)
    if (assembly) {
      setSelectedAssembly(assembly)
      setChromosome(assembly.chromosomes[0].name)
      setViewStart(0)
      setViewEnd(assembly.chromosomes[0].length)
    }
  }, [])

  // Navigation handlers
  const handleZoomIn = useCallback(() => {
    const center = (viewStart + viewEnd) / 2
    const newWidth = (viewEnd - viewStart) * 0.5
    setViewStart(Math.max(0, center - newWidth / 2))
    setViewEnd(center + newWidth / 2)
  }, [viewStart, viewEnd])

  const handleZoomOut = useCallback(() => {
    const chrLength = selectedAssembly.chromosomes.find(c => c.name === chromosome)?.length || 1000000
    const center = (viewStart + viewEnd) / 2
    const newWidth = Math.min((viewEnd - viewStart) * 2, chrLength)
    setViewStart(Math.max(0, center - newWidth / 2))
    setViewEnd(Math.min(chrLength, center + newWidth / 2))
  }, [viewStart, viewEnd, chromosome, selectedAssembly])

  const handlePan = useCallback((direction: "left" | "right") => {
    const chrLength = selectedAssembly.chromosomes.find(c => c.name === chromosome)?.length || 1000000
    const width = viewEnd - viewStart
    const shift = width * 0.25 * (direction === "left" ? -1 : 1)
    const newStart = Math.max(0, Math.min(chrLength - width, viewStart + shift))
    setViewStart(newStart)
    setViewEnd(newStart + width)
  }, [viewStart, viewEnd, chromosome, selectedAssembly])

  const handleNavigate = useCallback((chr: string, start: number, end: number) => {
    setChromosome(chr)
    setViewStart(start)
    setViewEnd(end)
  }, [])

  const handleSearch = useCallback(() => {
    if (!searchQuery) return
    
    // Search for gene by name
    const gene = genes.find(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    if (gene) {
      const padding = (gene.end - gene.start) * 2
      setChromosome(gene.chromosome)
      setViewStart(Math.max(0, gene.start - padding))
      setViewEnd(gene.end + padding)
    }
  }, [searchQuery, genes])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Layers className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Genome Browser
                <Badge variant="outline" className="text-xs">JBrowse2</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground italic">
                {selectedAssembly.scientificName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select 
              value={selectedAssembly.id} 
              onValueChange={handleAssemblyChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_ASSEMBLIES.map(assembly => (
                  <SelectItem key={assembly.id} value={assembly.id}>
                    {assembly.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gene..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handlePan("left")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handlePan("right")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <LinearGenomeView
            assembly={selectedAssembly}
            chromosome={chromosome}
            start={viewStart}
            end={viewEnd}
            genes={genes}
            onNavigate={handleNavigate}
          />
        )}

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-muted-foreground">Biosynthesis genes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span className="text-muted-foreground">Housekeeping genes</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {genes.filter(g => g.chromosome === chromosome).length} genes on {chromosome}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
