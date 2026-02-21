"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Play, Pause, RotateCcw, Download, Video, VideoOff, 
  Droplets, Thermometer, FlaskConical, Timer
} from "lucide-react"

const CHEMICAL_FIELDS = [
  "glucose",
  "amino_acids",
  "laccase",
  "xylanase",
  "pectinase",
  "amylase",
  "cellulase",
  "atp",
  "oxygen",
]

const CHEMICAL_COLORS: Record<string, string> = {
  glucose: "#facc15",
  amino_acids: "#22c55e",
  laccase: "#38bdf8",
  xylanase: "#a855f7",
  pectinase: "#f97316",
  amylase: "#ef4444",
  cellulase: "#14b8a6",
  atp: "#e11d48",
  oxygen: "#0ea5e9",
}

// Species properties with growth characteristics
const SPECIES_PROPERTIES: Record<string, SpeciesProps> = {
  shiitake: { growthRate: 1.0, filamentThickness: 0.5, branchingProbability: 0.05, color: "#A0522D", edgeColor: "#FF6347", preferredAgar: "charcoal", mergeProbability: 0.2, antifungalStrength: 2 },
  oyster: { growthRate: 1.2, filamentThickness: 0.7, branchingProbability: 0.07, color: "#87CEFA", edgeColor: "#1E90FF", preferredAgar: "dextrose", mergeProbability: 0.4, antifungalStrength: 1 },
  pinkOyster: { growthRate: 1.3, filamentThickness: 0.6, branchingProbability: 0.08, color: "#FFC0CB", edgeColor: "#FF69B4", preferredAgar: "dextrose", mergeProbability: 0.4, antifungalStrength: 1 },
  enoki: { growthRate: 0.9, filamentThickness: 0.4, branchingProbability: 0.04, color: "#FFFACD", edgeColor: "#FFD700", preferredAgar: "blood", mergeProbability: 0.3, antifungalStrength: 1 },
  cordyceps: { growthRate: 0.8, filamentThickness: 0.3, branchingProbability: 0.03, color: "#FF8C00", edgeColor: "#FF4500", preferredAgar: "feces", mergeProbability: 0.1, antifungalStrength: 2 },
  lionsMane: { growthRate: 1.1, filamentThickness: 0.6, branchingProbability: 0.06, color: "#FFFFFF", edgeColor: "#F0E68C", preferredAgar: "blood", mergeProbability: 0.35, antifungalStrength: 1 },
  buttonMushroom: { growthRate: 1.0, filamentThickness: 0.5, branchingProbability: 0.05, color: "#F5F5DC", edgeColor: "#DEB887", preferredAgar: "maltExtract", mergeProbability: 0.3, antifungalStrength: 1 },
  morel: { growthRate: 1.2, filamentThickness: 0.5, branchingProbability: 0.07, color: "#D2B48C", edgeColor: "#BC8F8F", preferredAgar: "sabouraud", mergeProbability: 0.4, antifungalStrength: 2 },
  maitake: { growthRate: 1.1, filamentThickness: 0.6, branchingProbability: 0.06, color: "#708090", edgeColor: "#2F4F4F", preferredAgar: "fungalAgar", mergeProbability: 0.35, antifungalStrength: 2 },
}

const CONTAMINANT_PROPERTIES: Record<string, SpeciesProps> = {
  mold: { growthRate: 1.5, filamentThickness: 0.4, branchingProbability: 0.1, color: "#00FF00", edgeColor: "#008000", preferredAgar: "any", mergeProbability: 0.5, antifungalStrength: 0 },
  mildew: { growthRate: 1.2, filamentThickness: 0.3, branchingProbability: 0.08, color: "#CCCCCC", edgeColor: "#888888", preferredAgar: "any", mergeProbability: 0.5, antifungalStrength: 0 },
  bacteria: { growthRate: 2.0, filamentThickness: 0.2, branchingProbability: 0.2, color: "#FFFF00", edgeColor: "#FFD700", preferredAgar: "blood", mergeProbability: 0.6, antifungalStrength: 0 },
  virus: { growthRate: 0.5, filamentThickness: 0.1, branchingProbability: 0.05, color: "#FF00FF", edgeColor: "#8B008B", preferredAgar: "any", mergeProbability: 0.8, antifungalStrength: 0 },
}

const AGAR_TYPES = {
  charcoal: { label: "Charcoal Agar", nutrientLevel: 80 },
  blood: { label: "Blood Agar", nutrientLevel: 120 },
  dextrose: { label: "Dextrose Pine Wood Agar", nutrientLevel: 100 },
  feces: { label: "Feces Agar", nutrientLevel: 60 },
  maltExtract: { label: "Malt Extract Agar (MEA)", nutrientLevel: 110 },
  fungalAgar: { label: "Fungal Agar", nutrientLevel: 100 },
  sabouraud: { label: "Sabouraud Dextrose Agar", nutrientLevel: 90 },
}

interface SpeciesProps {
  growthRate: number
  filamentThickness: number
  branchingProbability: number
  color: string
  edgeColor: string
  preferredAgar: string
  mergeProbability: number
  antifungalStrength: number
}

interface Branch {
  x: number
  y: number
  angle: number
  age: number
  atEdgeTime?: number
}

interface Organism {
  species: string
  branches: Branch[]
  id: string
  color: string
  nutrients: number
  isContaminant: boolean
}

export function MyceliumSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  
  // State
  const [selectedTool, setSelectedTool] = useState<"sporeSwab" | "scalpel" | "contamination">("sporeSwab")
  const [selectedSpecies, setSelectedSpecies] = useState("shiitake")
  const [selectedContaminant, setSelectedContaminant] = useState("mold")
  const [agarType, setAgarType] = useState("charcoal")
  const [speed, setSpeed] = useState(5)
  const [pH, setpH] = useState(6.0)
  const [temperature, setTemperature] = useState(70)
  const [humidity, setHumidity] = useState(70)
  const [virtualHours, setVirtualHours] = useState(0)
  const [selectedChemicalOverlay, setSelectedChemicalOverlay] = useState("none")
  const [isRunning, setIsRunning] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [consoleLog, setConsoleLog] = useState<string[]>([])
  
  // Simulation refs (mutable during animation)
  const samplesRef = useRef<Organism[]>([])
  const contaminantsRef = useRef<Organism[]>([])
  const nutrientGridRef = useRef<number[][]>([])
  const occupancyGridRef = useRef<(Organism | null)[][]>([])
  const antifungalGridRef = useRef<number[][]>([])
  const chemicalFieldsRef = useRef<Record<string, number[][]>>({})
  
  const DISH_RADIUS = 300
  const CANVAS_SIZE = 650
  
  const logToConsole = useCallback((message: string) => {
    setConsoleLog(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])
  
  // Initialize grids
  const initializeGrids = useCallback(() => {
    const nutrientLevel = AGAR_TYPES[agarType as keyof typeof AGAR_TYPES]?.nutrientLevel || 80
    const grid: number[][] = []
    const occupancy: (Organism | null)[][] = []
    const antifungal: number[][] = []
    const chemicalFields: Record<string, number[][]> = {}
    CHEMICAL_FIELDS.forEach((field) => {
      chemicalFields[field] = []
    })
    
    for (let x = 0; x < CANVAS_SIZE; x++) {
      grid[x] = []
      occupancy[x] = []
      antifungal[x] = []
      CHEMICAL_FIELDS.forEach((field) => {
        chemicalFields[field][x] = []
      })
      for (let y = 0; y < CANVAS_SIZE; y++) {
        grid[x][y] = nutrientLevel
        occupancy[x][y] = null
        antifungal[x][y] = 0
        chemicalFields["glucose"][x][y] = nutrientLevel
        chemicalFields["oxygen"][x][y] = 100
        CHEMICAL_FIELDS.filter(field => field !== "glucose" && field !== "oxygen").forEach((field) => {
          chemicalFields[field][x][y] = 0
        })
      }
    }
    
    nutrientGridRef.current = grid
    occupancyGridRef.current = occupancy
    antifungalGridRef.current = antifungal
    chemicalFieldsRef.current = chemicalFields
  }, [agarType])
  
  // Check if point is inside petri dish
  const isInsideDish = (x: number, y: number): boolean => {
    const dx = x - CANVAS_SIZE / 2
    const dy = y - CANVAS_SIZE / 2
    return Math.sqrt(dx * dx + dy * dy) <= DISH_RADIUS
  }
  
  // Draw petri dish background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    
    ctx.beginPath()
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, DISH_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.fill()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  const renderChemicalOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    if (selectedChemicalOverlay === "none") return
    const grid = chemicalFieldsRef.current[selectedChemicalOverlay]
    if (!grid) return

    const color = CHEMICAL_COLORS[selectedChemicalOverlay] || "#ffffff"
    const step = 4
    let maxValue = 0
    for (let x = 0; x < CANVAS_SIZE; x += step) {
      for (let y = 0; y < CANVAS_SIZE; y += step) {
        if (!isInsideDish(x, y)) continue
        maxValue = Math.max(maxValue, grid[x]?.[y] || 0)
      }
    }
    const scale = maxValue > 0 ? 1 / maxValue : 0

    ctx.save()
    for (let x = 0; x < CANVAS_SIZE; x += step) {
      for (let y = 0; y < CANVAS_SIZE; y += step) {
        if (!isInsideDish(x, y)) continue
        const value = grid[x]?.[y] || 0
        if (value <= 0) continue
        ctx.globalAlpha = Math.min(0.5, value * scale)
        ctx.fillStyle = color
        ctx.fillRect(x, y, step, step)
      }
    }
    ctx.restore()
  }, [selectedChemicalOverlay])
  
  // Get growth factors based on environment
  const getGrowthFactors = (species: string) => {
    const optimalPH: Record<string, number> = { shiitake: 5.5, oyster: 6.0, lionsMane: 6.0, mold: 5.0, bacteria: 7.0 }
    const optimalTemp: Record<string, { optimal: number; range: number }> = {
      shiitake: { optimal: 60, range: 20 }, oyster: { optimal: 65, range: 25 }, 
      lionsMane: { optimal: 60, range: 20 }, mold: { optimal: 70, range: 30 }, bacteria: { optimal: 98.6, range: 20 }
    }
    const optimalHumidity: Record<string, { optimal: number; range: number }> = {
      shiitake: { optimal: 80, range: 20 }, oyster: { optimal: 85, range: 15 }, 
      lionsMane: { optimal: 85, range: 15 }, mold: { optimal: 90, range: 20 }, bacteria: { optimal: 85, range: 20 }
    }
    
    const targetPH = optimalPH[species] || 6.5
    const pHFactor = Math.max(0, 1 - Math.abs(pH - targetPH) / 2.0)
    
    const tempData = optimalTemp[species] || { optimal: 70, range: 20 }
    const tempFactor = Math.max(0, 1 - Math.abs(temperature - tempData.optimal) / tempData.range)
    
    const humidData = optimalHumidity[species] || { optimal: 80, range: 20 }
    const humidFactor = Math.max(0, 1 - Math.abs(humidity - humidData.optimal) / humidData.range)
    
    return pHFactor * tempFactor * humidFactor
  }
  
  // Place sample on canvas
  const placeSample = useCallback((x: number, y: number, isContaminant: boolean = false) => {
    if (!isInsideDish(x, y)) return
    
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    
    const species = isContaminant ? selectedContaminant : selectedSpecies
    const props = isContaminant 
      ? CONTAMINANT_PROPERTIES[species] 
      : SPECIES_PROPERTIES[species]
    
    if (!props) return
    
    ctx.beginPath()
    ctx.fillStyle = props.color
    ctx.arc(x, y, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    const branches: Branch[] = []
    const numBranches = 8
    for (let i = 0; i < numBranches; i++) {
      branches.push({
        x, y,
        angle: (i / numBranches) * 2 * Math.PI + (Math.random() - 0.5) * 0.1,
        age: 0,
      })
    }
    
    const organism: Organism = {
      species,
      branches,
      id: Math.random().toString(36).substr(2, 9),
      color: props.color,
      nutrients: 0,
      isContaminant,
    }
    
    if (isContaminant) {
      contaminantsRef.current.push(organism)
    } else {
      samplesRef.current.push(organism)
    }
    
    if (!isRunning) setIsRunning(true)
    logToConsole(`Placed ${isContaminant ? "contaminant" : "sample"}: ${species} at (${x.toFixed(0)}, ${y.toFixed(0)})`)
  }, [selectedSpecies, selectedContaminant, isRunning, logToConsole])
  
  // Draw filament
  const drawFilament = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, props: SpeciesProps, isStarved: boolean = false) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = isStarved ? "gray" : props.color
    ctx.lineWidth = Math.max(0.1, isStarved ? props.filamentThickness - 0.3 : props.filamentThickness)
    ctx.stroke()
  }
  
  // Simulation step
  const simulateStep = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    
    setVirtualHours(h => h + 1)
    
    const simulateOrganism = (organism: Organism) => {
      const props = organism.isContaminant 
        ? CONTAMINANT_PROPERTIES[organism.species]
        : SPECIES_PROPERTIES[organism.species]
      
      if (!props) return
      
      const envFactor = getGrowthFactors(organism.species)
      const agarBonus = props.preferredAgar === agarType || props.preferredAgar === "any" ? 1.2 : 1.0
      let baseGrowthRate = props.growthRate * envFactor * agarBonus
      
      if (baseGrowthRate <= 0) return
      
      const newBranches: Branch[] = []
      
      organism.branches.forEach((branch) => {
        branch.age += 1
        
        const dx = Math.cos(branch.angle) * baseGrowthRate
        const dy = Math.sin(branch.angle) * baseGrowthRate
        const newX = branch.x + dx
        const newY = branch.y + dy
        
        const gridX = Math.floor(newX)
        const gridY = Math.floor(newY)
        
        if (isInsideDish(newX, newY) && gridX >= 0 && gridX < CANVAS_SIZE && gridY >= 0 && gridY < CANVAS_SIZE) {
          const nutrient = nutrientGridRef.current[gridX]?.[gridY] || 0
          
          if (nutrient > 0) {
            nutrientGridRef.current[gridX][gridY] = Math.max(0, nutrient - 0.5)
            if (chemicalFieldsRef.current.glucose?.[gridX]?.[gridY] !== undefined) {
              chemicalFieldsRef.current.glucose[gridX][gridY] = Math.max(
                0,
                chemicalFieldsRef.current.glucose[gridX][gridY] - 0.5
              )
            }
            
            const nutrientFactor = nutrient / 100
            drawFilament(ctx, branch.x, branch.y, newX, newY, props, nutrient < 10)
            
            occupancyGridRef.current[gridX][gridY] = organism
            
            newBranches.push({
              x: newX, y: newY,
              angle: branch.angle + (Math.random() - 0.5) * 0.3,
              age: branch.age,
            })
            
            if (Math.random() < props.branchingProbability * nutrientFactor) {
              newBranches.push({
                x: newX, y: newY,
                angle: branch.angle + (Math.random() - 0.5) * Math.PI / 2,
                age: branch.age,
              })
            }
          }
        } else if (!isInsideDish(newX, newY)) {
          // At edge - potential fruiting
          branch.atEdgeTime = (branch.atEdgeTime || 0) + 1
          if (branch.atEdgeTime > 50 && !organism.isContaminant) {
            ctx.beginPath()
            ctx.fillStyle = props.edgeColor
            ctx.arc(branch.x, branch.y, 4, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      })
      
      organism.branches = newBranches
    }
    
    samplesRef.current.forEach(simulateOrganism)
    contaminantsRef.current.forEach(simulateOrganism)

    renderChemicalOverlay(ctx)
    
    // Clean up dead organisms
    samplesRef.current = samplesRef.current.filter(s => s.branches.length > 0)
    contaminantsRef.current = contaminantsRef.current.filter(c => c.branches.length > 0)
    
    if (samplesRef.current.length === 0 && contaminantsRef.current.length === 0) {
      setIsRunning(false)
    }
  }, [agarType, pH, temperature, humidity])
  
  // Animation loop
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      simulateStep()
    }, 1000 / (speed * 2))
    
    return () => clearInterval(interval)
  }, [isRunning, speed, simulateStep])
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    initializeGrids()
    drawBackground(ctx)
  }, [initializeGrids, drawBackground])
  
  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    if (selectedTool === "sporeSwab") {
      placeSample(x, y, false)
    } else if (selectedTool === "contamination") {
      placeSample(x, y, true)
    } else if (selectedTool === "scalpel") {
      // Place tissue sample (multiple points)
      const numPoints = 5
      for (let i = 0; i < numPoints; i++) {
        const angle = Math.random() * 2 * Math.PI
        const dist = Math.random() * 15
        placeSample(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, false)
      }
    }
  }
  
  // Reset simulation
  const resetSimulation = () => {
    setIsRunning(false)
    setVirtualHours(0)
    samplesRef.current = []
    contaminantsRef.current = []
    initializeGrids()
    setConsoleLog([])
    
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      drawBackground(ctx)
    }
    
    logToConsole("Simulation reset")
  }
  
  // Save simulation data
  const saveSimulation = () => {
    const data = {
      virtualHours,
      samples: samplesRef.current.length,
      contaminants: contaminantsRef.current.length,
      settings: { agarType, pH, temperature, humidity },
      timestamp: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mycelium_simulation_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    logToConsole("Simulation data saved")
  }
  
  // Toggle recording
  const toggleRecording = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    if (!isRecording) {
      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" })
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `mycelium_recording_${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      logToConsole("Recording started")
    } else {
      recorderRef.current?.stop()
      setIsRecording(false)
      logToConsole("Recording stopped")
    }
  }
  
  const getCursorClass = () => {
    switch (selectedTool) {
      case "sporeSwab": return "cursor-crosshair"
      case "scalpel": return "cursor-cell"
      case "contamination": return "cursor-pointer"
      default: return ""
    }
  }
  
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Canvas Area */}
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleCanvasClick}
          className={`border-2 border-white/20 rounded-lg bg-black ${getCursorClass()}`}
          style={{ maxWidth: "100%", height: "auto" }}
        />
        
        {/* Console */}
        <Card className="w-full max-w-[650px]">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Console</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-32 bg-black rounded-b-lg">
              <div className="p-3 font-mono text-xs text-green-400 space-y-1">
                {consoleLog.length === 0 ? (
                  <p className="text-muted-foreground">Waiting for activity...</p>
                ) : (
                  consoleLog.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls Panel */}
      <Card className="lg:w-64 shrink-0">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-base">
            Controls
            <Badge variant="outline">
              <Timer className="h-3 w-3 mr-1" />
              {virtualHours}h
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playback Controls */}
          <div className="flex gap-2">
            <Button 
              variant={isRunning ? "destructive" : "default"} 
              size="sm" 
              className="flex-1"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button variant="outline" size="sm" onClick={resetSimulation}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator />
          
          {/* Species Selection */}
          <div className="space-y-2">
            <Label className="text-xs">Mushroom Species</Label>
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(SPECIES_PROPERTIES).map(species => (
                  <SelectItem key={species} value={species} className="text-xs">
                    {species.charAt(0).toUpperCase() + species.slice(1).replace(/([A-Z])/g, " $1")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tools */}
          <div className="space-y-2">
            <Label className="text-xs">Tool</Label>
            <div className="grid grid-cols-3 gap-1">
              <Button 
                variant={selectedTool === "sporeSwab" ? "default" : "outline"} 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setSelectedTool("sporeSwab")}
              >
                Swab
              </Button>
              <Button 
                variant={selectedTool === "scalpel" ? "default" : "outline"} 
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedTool("scalpel")}
              >
                Scalpel
              </Button>
              <Button 
                variant={selectedTool === "contamination" ? "destructive" : "outline"} 
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedTool("contamination")}
              >
                Contam
              </Button>
            </div>
          </div>
          
          {/* Contaminant Type */}
          {selectedTool === "contamination" && (
            <div className="space-y-2">
              <Label className="text-xs">Contaminant</Label>
              <Select value={selectedContaminant} onValueChange={setSelectedContaminant}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CONTAMINANT_PROPERTIES).map(c => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Agar Type */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <FlaskConical className="h-3 w-3" /> Agar Type
            </Label>
            <Select value={agarType} onValueChange={(v) => { setAgarType(v); initializeGrids(); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGAR_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Chemical Overlay */}
          <div className="space-y-2">
            <Label className="text-xs">Chemical Overlay</Label>
            <Select value={selectedChemicalOverlay} onValueChange={setSelectedChemicalOverlay}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">None</SelectItem>
                {CHEMICAL_FIELDS.map(field => (
                  <SelectItem key={field} value={field} className="text-xs">
                    {field.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          {/* Environment Sliders */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                Speed <span className="font-mono">{speed}x</span>
              </Label>
              <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={1} max={10} step={1} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> pH</span>
                <span className="font-mono">{pH.toFixed(1)}</span>
              </Label>
              <Slider value={[pH]} onValueChange={([v]) => setpH(v)} min={4} max={10} step={0.1} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temp</span>
                <span className="font-mono">{temperature}°F</span>
              </Label>
              <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={50} max={120} step={1} />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                Humidity <span className="font-mono">{humidity}%</span>
              </Label>
              <Slider value={[humidity]} onValueChange={([v]) => setHumidity(v)} min={40} max={100} step={1} />
            </div>
          </div>
          
          <Separator />
          
          {/* Save/Record */}
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={saveSimulation}>
              <Download className="h-3 w-3 mr-1" /> Save Data
            </Button>
            <Button 
              variant={isRecording ? "destructive" : "outline"} 
              size="sm" 
              className="w-full text-xs"
              onClick={toggleRecording}
            >
              {isRecording ? <VideoOff className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
              {isRecording ? "Stop Recording" : "Record"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





























