"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Share2, 
  Activity,
  Download,
  RotateCcw,
  Search,
  Loader2,
  ChevronRight,
  TreeDeciduous,
  Bug,
  Leaf,
  Sparkles,
  Target,
  Eye,
  Filter,
  MapPin,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Relationship types
const RELATIONSHIP_TYPES = [
  { id: "mycorrhizal", name: "Mycorrhizal", color: "#22c55e", description: "Mutualistic root association" },
  { id: "parasitic", name: "Parasitic", color: "#ef4444", description: "One organism benefits at expense of other" },
  { id: "saprotrophic", name: "Saprotrophic", color: "#f59e0b", description: "Decomposer of dead organic matter" },
  { id: "endophytic", name: "Endophytic", color: "#3b82f6", description: "Living within plant tissues" },
  { id: "lichen", name: "Lichen Partnership", color: "#8b5cf6", description: "Fungi-algae symbiosis" },
  { id: "predatory", name: "Predatory", color: "#ef4444", description: "Nematode-trapping or other predation" },
]

interface Organism {
  id: string
  name: string
  type: "fungus" | "plant" | "bacteria" | "insect" | "algae" | "animal"
  x: number
  y: number
}

interface Relationship {
  source: string
  target: string
  type: string
  strength: number
}

interface NetworkData {
  organisms: Organism[]
  relationships: Relationship[]
}

// Sample network data
const generateNetworkData = (): NetworkData => {
  const organisms: Organism[] = [
    // Fungi
    { id: "amanita", name: "Amanita muscaria", type: "fungus", x: 300, y: 200 },
    { id: "boletus", name: "Boletus edulis", type: "fungus", x: 200, y: 300 },
    { id: "armillaria", name: "Armillaria mellea", type: "fungus", x: 400, y: 300 },
    { id: "trichoderma", name: "Trichoderma viride", type: "fungus", x: 150, y: 150 },
    { id: "arthrobotrys", name: "Arthrobotrys oligospora", type: "fungus", x: 450, y: 150 },
    // Plants
    { id: "birch", name: "Betula (Birch)", type: "plant", x: 300, y: 100 },
    { id: "pine", name: "Pinus (Pine)", type: "plant", x: 150, y: 250 },
    { id: "oak", name: "Quercus (Oak)", type: "plant", x: 450, y: 250 },
    // Others
    { id: "nematode", name: "Nematode", type: "animal", x: 500, y: 100 },
    { id: "rhizobium", name: "Rhizobium", type: "bacteria", x: 100, y: 350 },
    { id: "cladonia_algae", name: "Trebouxia (Algae)", type: "algae", x: 350, y: 380 },
    { id: "cladonia", name: "Cladonia (Lichen)", type: "fungus", x: 350, y: 350 },
  ]
  
  const relationships: Relationship[] = [
    // Mycorrhizal
    { source: "amanita", target: "birch", type: "mycorrhizal", strength: 0.9 },
    { source: "boletus", target: "pine", type: "mycorrhizal", strength: 0.85 },
    { source: "boletus", target: "oak", type: "mycorrhizal", strength: 0.7 },
    { source: "armillaria", target: "oak", type: "parasitic", strength: 0.6 },
    // Lichen
    { source: "cladonia", target: "cladonia_algae", type: "lichen", strength: 0.95 },
    // Predatory
    { source: "arthrobotrys", target: "nematode", type: "predatory", strength: 0.8 },
    // Endophytic
    { source: "trichoderma", target: "pine", type: "endophytic", strength: 0.5 },
    // Saprotrophic interactions (indirect)
    { source: "armillaria", target: "birch", type: "saprotrophic", strength: 0.4 },
  ]
  
  return { organisms, relationships }
}

export default function SymbiosisPage() {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [selectedOrganism, setSelectedOrganism] = useState<Organism | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Initialize network
  useEffect(() => {
    setNetworkData(generateNetworkData())
  }, [])

  // Draw network visualization
  useEffect(() => {
    if (!networkData) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let time = 0
    
    const draw = () => {
      time += 0.02
      
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Filter relationships
      const filteredRelationships = networkData.relationships.filter(r => 
        filterType === "all" || r.type === filterType
      )
      
      // Draw relationships (edges)
      filteredRelationships.forEach(rel => {
        const source = networkData.organisms.find(o => o.id === rel.source)
        const target = networkData.organisms.find(o => o.id === rel.target)
        if (!source || !target) return
        
        const relType = RELATIONSHIP_TYPES.find(t => t.id === rel.type)
        const isHighlighted = hoveredNode === source.id || hoveredNode === target.id ||
                             selectedOrganism?.id === source.id || selectedOrganism?.id === target.id
        
        // Animated pulse
        const pulse = Math.sin(time * 2 + parseInt(source.id, 36) * 0.1) * 0.2 + 0.8
        
        ctx.strokeStyle = isHighlighted 
          ? relType?.color || "#666"
          : `${relType?.color || "#666"}${Math.floor(pulse * 80).toString(16).padStart(2, '0')}`
        ctx.lineWidth = isHighlighted ? 3 : 1 + rel.strength
        
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
        
        // Relationship label on hover
        if (isHighlighted) {
          const midX = (source.x + target.x) / 2
          const midY = (source.y + target.y) / 2
          
          ctx.fillStyle = "#fff"
          ctx.font = "10px sans-serif"
          ctx.textAlign = "center"
          ctx.fillText(relType?.name || rel.type, midX, midY - 5)
        }
      })
      
      // Draw organisms (nodes)
      networkData.organisms.forEach(org => {
        const isSelected = selectedOrganism?.id === org.id
        const isHovered = hoveredNode === org.id
        const isHighlighted = isSelected || isHovered
        
        // Get connected relationships for this organism
        const connectedRels = networkData.relationships.filter(
          r => (r.source === org.id || r.target === org.id) &&
               (filterType === "all" || r.type === filterType)
        )
        
        // Skip if filtered out and not directly viewed
        if (filterType !== "all" && connectedRels.length === 0 && !isSelected) {
          return
        }
        
        let color = "#666"
        let size = 12
        
        switch (org.type) {
          case "fungus": color = "#22c55e"; break
          case "plant": color = "#84cc16"; break
          case "bacteria": color = "#06b6d4"; break
          case "insect": color = "#f59e0b"; break
          case "algae": color = "#10b981"; break
          case "animal": color = "#ef4444"; break
        }
        
        if (isHighlighted) size = 18
        
        // Glow effect
        const gradient = ctx.createRadialGradient(org.x, org.y, 0, org.x, org.y, size + 10)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, "transparent")
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(org.x, org.y, size + 10, 0, Math.PI * 2)
        ctx.fill()
        
        // Node
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(org.x, org.y, size, 0, Math.PI * 2)
        ctx.fill()
        
        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = "#fff"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(org.x, org.y, size + 4, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        // Label
        ctx.fillStyle = isHighlighted ? "#fff" : "#888"
        ctx.font = isHighlighted ? "12px sans-serif" : "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(org.name.split(" ")[0], org.x, org.y + size + 15)
      })
      
      // Legend
      ctx.fillStyle = "#666"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "left"
      let legendY = 20
      
      const types = [
        { type: "fungus", color: "#22c55e", label: "Fungi" },
        { type: "plant", color: "#84cc16", label: "Plants" },
        { type: "bacteria", color: "#06b6d4", label: "Bacteria" },
        { type: "animal", color: "#ef4444", label: "Animals" },
        { type: "algae", color: "#10b981", label: "Algae" },
      ]
      
      types.forEach(t => {
        ctx.fillStyle = t.color
        ctx.beginPath()
        ctx.arc(20, legendY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#888"
        ctx.fillText(t.label, 30, legendY + 4)
        legendY += 18
      })
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [networkData, filterType, selectedOrganism, hoveredNode])

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!networkData) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    
    // Find clicked organism
    const clicked = networkData.organisms.find(org => {
      const dist = Math.sqrt(Math.pow(org.x - x, 2) + Math.pow(org.y - y, 2))
      return dist < 20
    })
    
    setSelectedOrganism(clicked || null)
  }

  // Handle canvas mouse move
  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!networkData) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    
    const hovered = networkData.organisms.find(org => {
      const dist = Math.sqrt(Math.pow(org.x - x, 2) + Math.pow(org.y - y, 2))
      return dist < 20
    })
    
    setHoveredNode(hovered?.id || null)
  }

  // Get relationships for selected organism
  const getRelationshipsFor = (orgId: string) => {
    if (!networkData) return []
    return networkData.relationships.filter(
      r => r.source === orgId || r.target === orgId
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                  Symbiosis Network Mapper
                </h1>
                <p className="text-sm text-muted-foreground">
                  Inter-species relationships • Ecosystem dynamics
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-400 border-green-400/50">
              <Sparkles className="h-3 w-3 mr-1" />
              NLM Biology Layer
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Visualization */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-green-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-green-400" />
                      Network Visualization
                    </CardTitle>
                    <CardDescription>
                      Click on organisms to explore their symbiotic relationships
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Relationships</SelectItem>
                        {RELATIONSHIP_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: type.color }}
                              />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNetworkData(generateNetworkData())
                        setSelectedOrganism(null)
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-black/50 overflow-hidden cursor-pointer">
                  <canvas 
                    ref={canvasRef}
                    width={600}
                    height={450}
                    className="w-full h-[450px]"
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMove}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Relationship Types Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Relationship Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {RELATIONSHIP_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFilterType(type.id === filterType ? "all" : type.id)}
                      className={`p-3 rounded-lg text-left transition-colors ${
                        filterType === type.id ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm font-medium">{type.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Selected Organism Details */}
            {selectedOrganism ? (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {selectedOrganism.type === "fungus" && <Sparkles className="h-4 w-4 text-green-400" />}
                    {selectedOrganism.type === "plant" && <TreeDeciduous className="h-4 w-4 text-lime-400" />}
                    {selectedOrganism.type === "animal" && <Bug className="h-4 w-4 text-red-400" />}
                    {selectedOrganism.type === "bacteria" && <Activity className="h-4 w-4 text-cyan-400" />}
                    Selected Organism
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-lg font-bold italic">{selectedOrganism.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {selectedOrganism.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs">Symbiotic Relationships</Label>
                    {getRelationshipsFor(selectedOrganism.id).length > 0 ? (
                      getRelationshipsFor(selectedOrganism.id).map((rel, i) => {
                        const partner = networkData?.organisms.find(
                          o => o.id === (rel.source === selectedOrganism.id ? rel.target : rel.source)
                        )
                        const relType = RELATIONSHIP_TYPES.find(t => t.id === rel.type)
                        
                        return (
                          <div key={i} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: relType?.color }}
                              />
                              <span className="text-sm">{partner?.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {relType?.name}
                            </Badge>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No relationships found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Click on an organism to view details
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Network Statistics */}
            {networkData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    Network Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-400">
                        {networkData.organisms.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Organisms</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-400">
                        {networkData.relationships.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Relationships</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fungi</span>
                      <span>{networkData.organisms.filter(o => o.type === "fungus").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plants</span>
                      <span>{networkData.organisms.filter(o => o.type === "plant").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span>{networkData.organisms.filter(o => !["fungus", "plant"].includes(o.type)).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export GeoJSON
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  View in Earth Simulator
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
