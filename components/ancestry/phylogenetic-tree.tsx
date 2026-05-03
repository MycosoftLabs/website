"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TreeDeciduous, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Download, 
  RefreshCw,
  Dna,
  Info,
  Eye,
  Loader2,
  ChevronRight,
  Microscope,
  Leaf,
  GitBranch
} from "lucide-react"

// Types for phylogenetic tree data
interface PhyloNode {
  id: string
  name: string
  rank: string
  commonName?: string
  children?: PhyloNode[]
  dnaBarcode?: string
  branchLength?: number
  bootstrapValue?: number
  compounds?: string[]
  useCases?: string[]
  observations?: number
}

interface LineageTreeResponse {
  taxon_id?: string
  kingdom?: string | null
  canonical_name?: string | null
  nodes?: Array<{ name: string; taxon_id: string | null; depth: number }>
  message?: string
}

function lineageToPhyloNode(res: LineageTreeResponse): PhyloNode | null {
  const { nodes, kingdom, canonical_name } = res
  if (!nodes?.length) {
    if (res.message) {
      return {
        id: "info",
        name: kingdom || canonical_name || "Taxon",
        rank: "Kingdom",
        children: [{ id: "msg", name: res.message, rank: "Clade" }],
      }
    }
    return null
  }
  const last = nodes.length - 1
  const tip: PhyloNode = {
    id: nodes[last].taxon_id || `n-${last}`,
    name: nodes[last].name,
    rank: last === 0 ? "Species" : "Species",
  }
  let acc = tip
  for (let i = last - 1; i >= 0; i--) {
    const n = nodes[i]
    const id = n.taxon_id || `n-${i}`
    acc = {
      id,
      name: n.name,
      rank: i === 0 ? "Kingdom" : "Clade",
      children: [acc],
    }
  }
  return acc
}

interface PhylogeneticTreeProps {
  data?: PhyloNode
  /** MINDEX taxon UUID: loads lineage from `/api/ancestry/[id]/tree` (ignored when `data` is set) */
  taxonId?: string
  height?: number
  onNodeSelect?: (node: PhyloNode) => void
  showControls?: boolean
  showLegend?: boolean
  treeType?: "radial" | "dendrogram" | "cluster"
}


// Rank colors for visualization
const rankColors: Record<string, string> = {
  Kingdom: "#8b5cf6",
  Phylum: "#6366f1",
  Class: "#3b82f6",
  Order: "#0ea5e9",
  Family: "#14b8a6",
  Genus: "#22c55e",
  Species: "#84cc16",
  Clade: "#64748b"
}

export function PhylogeneticTree({
  data: dataProp,
  taxonId,
  height = 600,
  onNodeSelect,
  showControls = true,
  showLegend = true,
  treeType = "radial"
}: PhylogeneticTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<PhyloNode | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTreeType, setCurrentTreeType] = useState(treeType)
  const [zoom, setZoom] = useState(1)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [remoteTree, setRemoteTree] = useState<PhyloNode | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeLoadError, setTreeLoadError] = useState<string | null>(null)

  const data = dataProp ?? remoteTree

  useEffect(() => {
    if (dataProp) {
      setRemoteTree(null)
      return
    }
    if (!taxonId) {
      setRemoteTree(null)
      setTreeLoadError(null)
      return
    }
    let cancelled = false
    setTreeLoading(true)
    setTreeLoadError(null)
    void fetch(`/api/ancestry/${encodeURIComponent(taxonId)}/tree`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((j: LineageTreeResponse) => {
        if (cancelled) return
        setRemoteTree(lineageToPhyloNode(j))
      })
      .catch((e: Error) => {
        if (!cancelled) setTreeLoadError(e.message)
      })
      .finally(() => {
        if (!cancelled) setTreeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dataProp, taxonId])

  // Search for nodes
  const searchNodes = useCallback((term: string) => {
    if (!term.trim() || !data) {
      setHighlightedNodes(new Set())
      return
    }

    const matches = new Set<string>()
    const searchLower = term.toLowerCase()

    function traverse(node: PhyloNode) {
      if (
        node.name.toLowerCase().includes(searchLower) ||
        node.commonName?.toLowerCase().includes(searchLower)
      ) {
        matches.add(node.id)
      }
      node.children?.forEach(traverse)
    }

    traverse(data)
    setHighlightedNodes(matches)
  }, [data])

  useEffect(() => {
    const timeout = setTimeout(() => searchNodes(searchTerm), 300)
    return () => clearTimeout(timeout)
  }, [searchTerm, searchNodes])

  // Render the D3 tree
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = containerRef.current.clientWidth
    const margin = { top: 40, right: 120, bottom: 40, left: 120 }

    // Create hierarchy
    const root = d3.hierarchy(data)
    
    let treeLayout: d3.TreeLayout<PhyloNode> | d3.ClusterLayout<PhyloNode>
    let transform: string

    if (currentTreeType === "radial") {
      // Radial tree
      const radius = Math.min(width, height) / 2 - 100
      treeLayout = d3.tree<PhyloNode>()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)
      
      transform = `translate(${width / 2},${height / 2})`
    } else if (currentTreeType === "cluster") {
      // Cluster dendrogram
      treeLayout = d3.cluster<PhyloNode>()
        .size([height - margin.top - margin.bottom, width - margin.left - margin.right])
      
      transform = `translate(${margin.left},${margin.top})`
    } else {
      // Standard dendrogram
      treeLayout = d3.tree<PhyloNode>()
        .size([height - margin.top - margin.bottom, width - margin.left - margin.right])
      
      transform = `translate(${margin.left},${margin.top})`
    }

    const treeData = treeLayout(root as d3.HierarchyNode<PhyloNode>)

    // Create main group with zoom
    const g = svg
      .append("g")
      .attr("transform", transform)

    // Apply zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", `${transform} scale(${event.transform.k})`)
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior)

    // Draw links
    const linkGenerator = currentTreeType === "radial"
      ? d3.linkRadial<d3.HierarchyPointLink<PhyloNode>, d3.HierarchyPointNode<PhyloNode>>()
          .angle((d: d3.HierarchyPointNode<PhyloNode>) => d.x)
          .radius((d: d3.HierarchyPointNode<PhyloNode>) => d.y)
      : d3.linkHorizontal<d3.HierarchyPointLink<PhyloNode>, d3.HierarchyPointNode<PhyloNode>>()
          .x((d: d3.HierarchyPointNode<PhyloNode>) => d.y)
          .y((d: d3.HierarchyPointNode<PhyloNode>) => d.x)

    g.selectAll(".link")
      .data(treeData.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("d", linkGenerator as unknown as string)

    // Draw nodes
    const nodes = g.selectAll(".node")
      .data(treeData.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        if (currentTreeType === "radial") {
          return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`
        }
        return `translate(${d.y},${d.x})`
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        setSelectedNode(d.data)
        onNodeSelect?.(d.data)
      })

    // Node circles
    nodes.append("circle")
      .attr("r", (d) => d.data.rank === "Species" ? 8 : 6)
      .attr("fill", (d) => {
        if (highlightedNodes.has(d.data.id)) return "#fbbf24"
        return rankColors[d.data.rank] || "#6b7280"
      })
      .attr("stroke", (d) => {
        if (selectedNode?.id === d.data.id) return "#ffffff"
        return "none"
      })
      .attr("stroke-width", 2)
      .attr("opacity", (d) => {
        if (highlightedNodes.size > 0 && !highlightedNodes.has(d.data.id)) return 0.3
        return 1
      })
      .on("mouseenter", function() {
        d3.select(this).attr("r", (d: any) => d.data.rank === "Species" ? 10 : 8)
      })
      .on("mouseleave", function() {
        d3.select(this).attr("r", (d: any) => d.data.rank === "Species" ? 8 : 6)
      })

    // Node labels
    nodes.append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => {
        if (currentTreeType === "radial") {
          return d.x < Math.PI === !d.children ? 12 : -12
        }
        return d.children ? -12 : 12
      })
      .attr("text-anchor", (d) => {
        if (currentTreeType === "radial") {
          return d.x < Math.PI === !d.children ? "start" : "end"
        }
        return d.children ? "end" : "start"
      })
      .attr("transform", (d) => {
        if (currentTreeType === "radial" && d.x >= Math.PI) {
          return "rotate(180)"
        }
        return null
      })
      .attr("fill", (d) => {
        if (highlightedNodes.has(d.data.id)) return "#fbbf24"
        return d.data.rank === "Species" ? "#e5e7eb" : "#9ca3af"
      })
      .attr("font-size", (d) => d.data.rank === "Species" ? "11px" : "10px")
      .attr("font-style", (d) => d.data.rank === "Species" ? "italic" : "normal")
      .attr("opacity", (d) => {
        if (highlightedNodes.size > 0 && !highlightedNodes.has(d.data.id)) return 0.3
        return 1
      })
      .text((d) => {
        if (d.data.rank === "Species") {
          return d.data.commonName || d.data.name
        }
        return d.data.name
      })

    // Bootstrap values (for species with high confidence)
    nodes.filter((d) => d.data.bootstrapValue && d.data.bootstrapValue >= 95)
      .append("text")
      .attr("dy", "-10px")
      .attr("text-anchor", "middle")
      .attr("fill", "#10b981")
      .attr("font-size", "9px")
      .text((d) => `${d.data.bootstrapValue}%`)

  }, [data, currentTreeType, selectedNode, highlightedNodes, height, onNodeSelect])

  // Export tree as SVG
  const exportSVG = () => {
    if (!data || !svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgData], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "phylogenetic-tree.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export as Newick format
  const exportNewick = () => {
    if (!data) return
    function toNewick(node: PhyloNode): string {
      if (!node.children || node.children.length === 0) {
        return `${node.name.replace(/\s/g, "_")}:${node.branchLength || 0.01}`
      }
      const children = node.children.map(toNewick).join(",")
      return `(${children})${node.name.replace(/\s/g, "_")}:${node.branchLength || 0.01}`
    }
    
    const newick = toNewick(data) + ";"
    const blob = new Blob([newick], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "phylogenetic-tree.nwk"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {showControls && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TreeDeciduous className="h-5 w-5 text-green-400" />
                <CardTitle className="text-lg">All-life lineage (MINDEX)</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  D3.js Visualization
                </Badge>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                  {zoom.toFixed(1)}x zoom
                </Badge>
              </div>
            </div>
            <CardDescription>
              D3 view of the taxonomic chain materialized in MINDEX for the selected taxon. Not an Open Tree
              topology — all-life expansion adds connectors later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search species..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Tree type selector */}
              <Select value={currentTreeType} onValueChange={(v: "radial" | "dendrogram" | "cluster") => setCurrentTreeType(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tree type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radial">Radial</SelectItem>
                  <SelectItem value="dendrogram">Dendrogram</SelectItem>
                  <SelectItem value="cluster">Cluster</SelectItem>
                </SelectContent>
              </Select>

              {/* Controls */}
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(z * 1.2, 3))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(z / 1.2, 0.3))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Export */}
              <Select onValueChange={(v) => v === "svg" ? exportSVG() : exportNewick()}>
                <SelectTrigger className="w-[120px]">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="svg">SVG Image</SelectItem>
                  <SelectItem value="newick">Newick Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Tree visualization */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {treeLoadError && <p className="p-4 text-sm text-destructive">{treeLoadError}</p>}
              {!data ? (
                <div
                  className="flex min-h-[400px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-8 text-center text-muted-foreground"
                  style={{ minHeight: height }}
                >
                  {treeLoading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-base">Loading lineage from MINDEX…</span>
                    </>
                  ) : (
                    <p className="max-w-lg text-base">
                      To load a tree, add{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-foreground">?taxon=UUID</code> to the URL, or
                      use <strong>View in Phylogenetic Tree</strong> on a taxon with a MINDEX ID.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  ref={containerRef}
                  className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
                  style={{ height }}
                >
                  <svg
                    ref={svgRef}
                    width="100%"
                    height={height}
                    style={{ cursor: "grab" }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected node info */}
        <div className="lg:col-span-1 space-y-4">
          {showLegend && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Taxonomic Ranks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(rankColors).map(([rank, color]) => (
                  <div key={rank} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span>{rank}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {selectedNode && (
            <Card className="border-green-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Selected Node</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium italic">{selectedNode.name}</div>
                  {selectedNode.commonName && (
                    <div className="text-sm text-muted-foreground">{selectedNode.commonName}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge 
                    style={{ backgroundColor: rankColors[selectedNode.rank] + "20", color: rankColors[selectedNode.rank], borderColor: rankColors[selectedNode.rank] }}
                    variant="outline"
                  >
                    {selectedNode.rank}
                  </Badge>
                  {selectedNode.bootstrapValue && (
                    <Badge variant="outline" className="text-green-400 border-green-500/30">
                      {selectedNode.bootstrapValue}% bootstrap
                    </Badge>
                  )}
                </div>

                {selectedNode.dnaBarcode && (
                  <div className="text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Dna className="h-3 w-3" />
                      DNA Barcode Region
                    </div>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {selectedNode.dnaBarcode}
                    </code>
                  </div>
                )}

                {selectedNode.compounds && selectedNode.compounds.length > 0 && (
                  <div className="text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Microscope className="h-3 w-3" />
                      Bioactive Compounds
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.compounds.map((compound) => (
                        <Badge key={compound} variant="secondary" className="text-xs">
                          {compound}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.useCases && selectedNode.useCases.length > 0 && (
                  <div className="text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Leaf className="h-3 w-3" />
                      Use Cases
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.useCases.map((useCase) => (
                        <Badge key={useCase} variant="outline" className="text-xs">
                          {useCase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.observations !== undefined && (
                  <div className="text-xs pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        MINDEX Observations
                      </span>
                      <span className="font-mono">{selectedNode.observations.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {highlightedNodes.size > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-400">
                    {highlightedNodes.size} match{highlightedNodes.size > 1 ? "es" : ""} found
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => {
                      setSearchTerm("")
                      setHighlightedNodes(new Set())
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhylogeneticTree
