"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { DNASequenceViewer, DNAHelixBanner, BASE_COLOR } from "@/components/visualizations/DNASequenceViewer"
import { 
  Dna, 
  Activity,
  Zap,
  Download,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Loader2,
  ChevronRight,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  FlaskConical,
  Target,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"

// Predefined genetic circuits
const CIRCUITS = [
  { 
    id: "psilocybin_pathway", 
    name: "Psilocybin Biosynthesis",
    species: "Psilocybe cubensis",
    genes: ["psiD", "psiK", "psiM", "psiH"],
    description: "Tryptophan → Psilocybin pathway"
  },
  { 
    id: "hericenone_pathway", 
    name: "Hericenone Production",
    species: "Hericium erinaceus",
    genes: ["her1", "her2", "her3", "her4"],
    description: "Fatty acid → Hericenone pathway"
  },
  { 
    id: "ganoderic_pathway", 
    name: "Ganoderic Acid Synthesis",
    species: "Ganoderma lucidum",
    genes: ["lanS", "cyp", "osc", "hmgr"],
    description: "Acetyl-CoA → Ganoderic acids"
  },
  { 
    id: "cordycepin_pathway", 
    name: "Cordycepin Biosynthesis",
    species: "Cordyceps militaris",
    genes: ["cns1", "cns2", "cns3", "cns4"],
    description: "Adenosine → Cordycepin pathway"
  }
]

interface GeneExpression {
  gene: string
  expression: number
  regulation: "activated" | "repressed" | "basal"
}

interface SimulationState {
  expressions: GeneExpression[]
  metaboliteLevel: number
  time: number
  fluxRate: number
}

export default function GeneticCircuitPage() {
  const [selectedCircuit, setSelectedCircuit] = useState("")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  const [simulationHistory, setSimulationHistory] = useState<SimulationState[]>([])
  
  // Custom gene modifications
  const [geneModifications, setGeneModifications] = useState<Record<string, number>>({})
  const [environmentalStress, setEnvironmentalStress] = useState(0)
  const [nutrientLevel, setNutrientLevel] = useState(50)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Initialize simulation
  useEffect(() => {
    if (!selectedCircuit) return
    
    const circuit = CIRCUITS.find(c => c.id === selectedCircuit)
    if (!circuit) return
    
    const initialExpressions = circuit.genes.map(gene => ({
      gene,
      expression: 50 + Math.random() * 30,
      regulation: "basal" as const
    }))
    
    setSimulation({
      expressions: initialExpressions,
      metaboliteLevel: 10,
      time: 0,
      fluxRate: 1
    })
    setSimulationHistory([])
  }, [selectedCircuit])

  // Simulation tick
  useEffect(() => {
    if (!isSimulating || !simulation) return
    
    const interval = setInterval(() => {
      setSimulation(prev => {
        if (!prev) return prev
        
        const newExpressions = prev.expressions.map(exp => {
          // Apply modifications
          const mod = geneModifications[exp.gene] || 0
          
          // Calculate new expression with feedback loops
          const stressFactor = 1 - environmentalStress / 200
          const nutrientFactor = nutrientLevel / 100
          
          let newExpression = exp.expression + 
            (Math.random() - 0.5) * 10 * stressFactor +
            mod * 0.5 +
            (exp.regulation === "activated" ? 5 : exp.regulation === "repressed" ? -5 : 0)
          
          newExpression = Math.max(0, Math.min(100, newExpression))
          
          // Determine regulation state
          let regulation: "activated" | "repressed" | "basal" = "basal"
          if (newExpression > 70) regulation = "activated"
          else if (newExpression < 30) regulation = "repressed"
          
          return {
            ...exp,
            expression: newExpression,
            regulation
          }
        })
        
        // Calculate metabolite production
        const avgExpression = newExpressions.reduce((sum, e) => sum + e.expression, 0) / newExpressions.length
        const newMetabolite = Math.max(0, prev.metaboliteLevel + (avgExpression / 100) * prev.fluxRate * nutrientLevel / 50)
        
        const newState = {
          expressions: newExpressions,
          metaboliteLevel: newMetabolite,
          time: prev.time + 1,
          fluxRate: avgExpression / 50
        }
        
        setSimulationHistory(hist => [...hist.slice(-50), newState])
        
        return newState
      })
    }, 200)
    
    return () => clearInterval(interval)
  }, [isSimulating, simulation, geneModifications, environmentalStress, nutrientLevel])

  // Draw circuit visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !simulation) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const draw = () => {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const genes = simulation.expressions
      const centerY = canvas.height / 2
      const geneWidth = (canvas.width - 100) / genes.length
      
      // Draw pathway arrows
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(50, centerY)
      ctx.lineTo(canvas.width - 50, centerY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw genes
      genes.forEach((gene, i) => {
        const x = 80 + i * geneWidth
        const expressionHeight = (gene.expression / 100) * 80
        
        // Gene box
        const color = gene.regulation === "activated" 
          ? "#22c55e" 
          : gene.regulation === "repressed" 
            ? "#ef4444" 
            : "#3b82f6"
        
        // Expression bar
        ctx.fillStyle = `${color}40`
        ctx.fillRect(x - 25, centerY - 50, 50, 100)
        
        ctx.fillStyle = color
        ctx.fillRect(x - 25, centerY + 50 - expressionHeight, 50, expressionHeight)
        
        // Gene label
        ctx.fillStyle = "#fff"
        ctx.font = "12px monospace"
        ctx.textAlign = "center"
        ctx.fillText(gene.gene, x, centerY + 70)
        
        // Expression value
        ctx.fillStyle = "#888"
        ctx.font = "10px monospace"
        ctx.fillText(`${gene.expression.toFixed(0)}%`, x, centerY - 55)
        
        // Arrow to next gene
        if (i < genes.length - 1) {
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x + 30, centerY)
          ctx.lineTo(x + geneWidth - 30, centerY)
          ctx.stroke()
          
          // Arrowhead
          ctx.beginPath()
          ctx.moveTo(x + geneWidth - 35, centerY - 5)
          ctx.lineTo(x + geneWidth - 30, centerY)
          ctx.lineTo(x + geneWidth - 35, centerY + 5)
          ctx.stroke()
        }
      })
      
      // Draw metabolite output
      const outputX = canvas.width - 40
      ctx.fillStyle = "#f59e0b"
      ctx.beginPath()
      ctx.arc(outputX, centerY, Math.min(30, simulation.metaboliteLevel / 2), 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = "#fff"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.fillText("Product", outputX, centerY + 45)
      ctx.fillText(`${simulation.metaboliteLevel.toFixed(1)}`, outputX, centerY + 5)
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    animationRef.current = requestAnimationFrame(draw)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [simulation])

  const circuit = CIRCUITS.find(c => c.id === selectedCircuit)

  // Demo sequence for the selected circuit
  const circuitSequence = circuit
    ? circuit.genes.map(g => {
        // Generate a representative codon sequence per gene (deterministic)
        const codons = ["ATG","GCT","TTA","CGG","AAC","TTG","GCC","AGT","CAT","GGA","TCC","ACG","TCT","GTA","CAG","TGG","ACC","GGC","GAG","TTC"]
        const len = 12 + g.charCodeAt(0) % 8
        return Array.from({length: len}, (_, i) => codons[(g.charCodeAt(0) + i) % codons.length]).join("")
      }).join("NNNNN")  // NNN separator between genes
    : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header with helix banner */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <Dna className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Genetic Circuit Simulator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gene regulatory networks • Metabolic pathway modeling
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DNAHelixBanner className="w-32 h-10 hidden sm:block" />
              <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                <Sparkles className="h-3 w-3 mr-1" />
                NLM Biology Layer
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Circuit Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Dna className="h-5 w-5 text-purple-400" />
                  Select Genetic Circuit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCircuit} onValueChange={setSelectedCircuit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a biosynthetic pathway..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CIRCUITS.map(circuit => (
                      <SelectItem key={circuit.id} value={circuit.id}>
                        <div className="flex flex-col">
                          <span>{circuit.name}</span>
                          <span className="text-xs text-muted-foreground italic">{circuit.species}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {circuit && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {circuit.description} • Genes: {circuit.genes.join(" → ")}
                    </p>
                    {/* DNA color map for the simulated circuit sequence */}
                    {circuitSequence && (
                      <DNASequenceViewer
                        sequence={circuitSequence}
                        compact
                        maxBarBases={150}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Circuit Visualization */}
            <Card className="border-purple-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-400" />
                    Pathway Visualization
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSimulating(!isSimulating)}
                      disabled={!simulation}
                    >
                      {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGeneModifications({})
                        setEnvironmentalStress(0)
                        setNutrientLevel(50)
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-black/50 overflow-hidden">
                  <canvas 
                    ref={canvasRef}
                    width={600}
                    height={250}
                    className="w-full h-[250px]"
                  />
                </div>
                
                {/* Legend */}
                <div className="flex gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Activated</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span>Basal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Repressed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    <span>Product</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-400" />
                  Simulation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gene Modifications */}
                {circuit && (
                  <div className="space-y-3">
                    <Label>Gene Modifications (Overexpression/Knockdown)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {circuit.genes.map(gene => (
                        <div key={gene} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-mono">{gene}</Label>
                            <span className="text-xs text-muted-foreground">
                              {geneModifications[gene] > 0 ? "+" : ""}{geneModifications[gene] || 0}%
                            </span>
                          </div>
                          <Slider
                            value={[geneModifications[gene] || 0]}
                            onValueChange={([v]) => setGeneModifications(prev => ({ ...prev, [gene]: v }))}
                            min={-50}
                            max={50}
                            step={5}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Environmental Parameters */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Environmental Stress</Label>
                      <span className="text-sm">{environmentalStress}%</span>
                    </div>
                    <Slider
                      value={[environmentalStress]}
                      onValueChange={([v]) => setEnvironmentalStress(v)}
                      min={0}
                      max={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Nutrient Level</Label>
                      <span className="text-sm">{nutrientLevel}%</span>
                    </div>
                    <Slider
                      value={[nutrientLevel]}
                      onValueChange={([v]) => setNutrientLevel(v)}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Simulation Metrics */}
            {simulation && (
              <Card className="border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    Simulation Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-orange-400">
                        {simulation.metaboliteLevel.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Metabolite Level</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-400">
                        {simulation.fluxRate.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Flux Rate</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xl font-bold text-green-400">{simulation.time}</p>
                    <p className="text-xs text-muted-foreground">Simulation Time</p>
                  </div>
                  
                  {/* Gene Expression Levels */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs">Gene Expression Levels</Label>
                    {simulation.expressions.map(exp => (
                      <div key={exp.gene}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono">{exp.gene}</span>
                          <span className={`
                            ${exp.regulation === "activated" ? "text-green-400" : 
                              exp.regulation === "repressed" ? "text-red-400" : "text-blue-400"}
                          `}>
                            {exp.expression.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={exp.expression} className="h-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-400" />
                  Pathway Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {simulation ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bottleneck Gene</span>
                      <span className="font-mono text-yellow-400">
                        {simulation.expressions.reduce((min, e) => 
                          e.expression < min.expression ? e : min
                        ).gene}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Expression</span>
                      <span>
                        {(simulation.expressions.reduce((sum, e) => sum + e.expression, 0) / 
                          simulation.expressions.length).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Production Rate</span>
                      <span className="text-green-400">
                        {(simulation.metaboliteLevel / Math.max(1, simulation.time) * 100).toFixed(1)} units/min
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Select a circuit to begin analysis
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Expression Data
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Design Experiment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
