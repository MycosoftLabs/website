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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  RotateCcw, Download, Video, VideoOff, 
  Droplets, Thermometer, FlaskConical, Timer, Trash2, Cloud
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
  transparent: { label: "Transparent Agar", nutrientLevel: 70 },
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

type ExperimentEventType =
  | "sample"
  | "contamination"
  | "swab"
  | "scalpel"
  | "environment"
  | "recording"
  | "snapshot"
  | "system"
  | "mindex"

interface ExperimentEvent {
  id: string
  timestamp: string
  virtualHour: number
  type: ExperimentEventType
  message: string
  useful: boolean
  persistable: boolean
  debug?: boolean
  payload?: Record<string, unknown>
}

interface PendingArtifactSave {
  title: string
  description: string
  filename: string
  contentType: string
  kind: "simulation-data" | "timelapse-video"
  blob: Blob
  metadata: Record<string, unknown>
}

const MINDEX_CACHE_KEY = "mycosoft:petri:mindex-candidates:v1"
const MAX_MINDEX_CACHE_EVENTS = 240

const canUseLocalStorage = () => typeof window !== "undefined" && "localStorage" in window

const readMindexCandidateCache = (): ExperimentEvent[] => {
  if (!canUseLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(MINDEX_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeMindexCandidateCache = (events: ExperimentEvent[]) => {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(MINDEX_CACHE_KEY, JSON.stringify(events.slice(-MAX_MINDEX_CACHE_EVENTS)))
}

export interface SimulatorMetrics {
  virtual_hours: number
  sample_count: number
  contaminant_count: number
  total_branches: number
  avg_nutrient: number
  glucose_mean: number
  oxygen_mean: number
}

export interface SimulatorCompounds {
  glucose: number
  amino_acids: number
  laccase: number
  xylanase: number
  pectinase: number
  amylase: number
  cellulase: number
  atp: number
  oxygen: number
}

export interface MyceliumSimulatorProps {
  onMetricsUpdate?: (metrics: SimulatorMetrics) => void
  onCompoundsUpdate?: (compounds: SimulatorCompounds) => void
}

export function MyceliumSimulator({ onMetricsUpdate, onCompoundsUpdate }: MyceliumSimulatorProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rimCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number>(0)
  const experimentIdRef = useRef(`petri-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  
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
  const [mindexLive, setMindexLive] = useState<boolean | null>(null)
  const [consoleLog, setConsoleLog] = useState<string[]>([])
  const [pendingArtifactSave, setPendingArtifactSave] = useState<PendingArtifactSave | null>(null)
  const [artifactSaveStatus, setArtifactSaveStatus] = useState<string | null>(null)
  const selectedToolRef = useRef(selectedTool)
  const selectedSpeciesRef = useRef(selectedSpecies)
  const selectedContaminantRef = useRef(selectedContaminant)
  const virtualHoursRef = useRef(virtualHours)
  const isSwabbingRef = useRef(false)
  const lastSwabPointRef = useRef<{ x: number; y: number } | null>(null)
  const experimentEventsRef = useRef<ExperimentEvent[]>([])
  
  // Simulation refs (mutable during animation)
  const samplesRef = useRef<Organism[]>([])
  const contaminantsRef = useRef<Organism[]>([])
  const nutrientGridRef = useRef<number[][]>([])
  const occupancyGridRef = useRef<(Organism | null)[][]>([])
  const antifungalGridRef = useRef<number[][]>([])
  const chemicalFieldsRef = useRef<Record<string, number[][]>>({})
  
  const DISH_RADIUS = 300
  const GROWTH_RADIUS = DISH_RADIUS - 2
  const CANVAS_SIZE = 650
  
  const queueMindexCandidate = useCallback((event: ExperimentEvent) => {
    if (!event.persistable || !event.useful || event.debug) return
    const cached = readMindexCandidateCache()
    writeMindexCandidateCache([...cached, event])
  }, [])

  const recordExperimentEvent = useCallback((input: Omit<ExperimentEvent, "id" | "timestamp" | "virtualHour">) => {
    const timestamp = new Date().toISOString()
    const event: ExperimentEvent = {
      ...input,
      id: `${experimentIdRef.current}-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      virtualHour: virtualHoursRef.current,
    }
    experimentEventsRef.current = [...experimentEventsRef.current, event].slice(-500)
    queueMindexCandidate(event)
    const time = new Date(timestamp).toLocaleTimeString()
    const marker = event.persistable && event.useful ? "MINDEX" : event.debug ? "DEBUG" : "LOCAL"
    setConsoleLog(prev => [...prev.slice(-80), `[${time}] [${marker}] ${event.message}`])
  }, [queueMindexCandidate])

  const logToConsole = useCallback((message: string) => {
    recordExperimentEvent({
      type: "system",
      message,
      useful: false,
      persistable: false,
    })
  }, [recordExperimentEvent])

  const isInsideDish = (x: number, y: number): boolean => {
    const dx = x - CANVAS_SIZE / 2
    const dy = y - CANVAS_SIZE / 2
    return Math.sqrt(dx * dx + dy * dy) <= DISH_RADIUS
  }

  const isInsideGrowthArea = (x: number, y: number): boolean => {
    const dx = x - CANVAS_SIZE / 2
    const dy = y - CANVAS_SIZE / 2
    return Math.sqrt(dx * dx + dy * dy) <= GROWTH_RADIUS
  }

  const emitMetricsAndCompounds = useCallback((overrideVirtualHours?: number) => {
    if (!onMetricsUpdate && !onCompoundsUpdate) return
    const samples = samplesRef.current
    const contaminants = contaminantsRef.current
    const nutrient = nutrientGridRef.current
    const chem = chemicalFieldsRef.current
    let totalNutrient = 0
    let nutrientCells = 0
    const compoundSums: Record<string, number> = {}
    CHEMICAL_FIELDS.forEach(f => { compoundSums[f] = 0 })
    let compoundCells = 0
    for (let x = 0; x < CANVAS_SIZE; x++) {
      for (let y = 0; y < CANVAS_SIZE; y++) {
        if (!isInsideDish(x, y)) continue
        if (nutrient[x]?.[y] !== undefined) {
          totalNutrient += nutrient[x][y]
          nutrientCells++
        }
        CHEMICAL_FIELDS.forEach(f => {
          const v = chem[f]?.[x]?.[y]
          if (typeof v === "number") {
            compoundSums[f] += v
            if (f === "glucose") compoundCells++
          }
        })
      }
    }
    if (compoundCells === 0) compoundCells = 1
    if (nutrientCells === 0) nutrientCells = 1
    const totalBranches = samples.reduce((a, s) => a + s.branches.length, 0) +
      contaminants.reduce((a, c) => a + c.branches.length, 0)
    onMetricsUpdate?.({
      virtual_hours: overrideVirtualHours ?? virtualHoursRef.current,
      sample_count: samples.length,
      contaminant_count: contaminants.length,
      total_branches: totalBranches,
      avg_nutrient: totalNutrient / nutrientCells,
      glucose_mean: compoundSums.glucose / compoundCells,
      oxygen_mean: compoundSums.oxygen / compoundCells,
    })
    onCompoundsUpdate?.({
      glucose: compoundSums.glucose / compoundCells,
      amino_acids: compoundSums.amino_acids / compoundCells,
      laccase: compoundSums.laccase / compoundCells,
      xylanase: compoundSums.xylanase / compoundCells,
      pectinase: compoundSums.pectinase / compoundCells,
      amylase: compoundSums.amylase / compoundCells,
      cellulase: compoundSums.cellulase / compoundCells,
      atp: compoundSums.atp / compoundCells,
      oxygen: compoundSums.oxygen / compoundCells,
    })
  }, [onMetricsUpdate, onCompoundsUpdate])

  useEffect(() => {
    selectedToolRef.current = selectedTool
  }, [selectedTool])

  useEffect(() => {
    selectedSpeciesRef.current = selectedSpecies
  }, [selectedSpecies])

  useEffect(() => {
    selectedContaminantRef.current = selectedContaminant
  }, [selectedContaminant])

  useEffect(() => {
    virtualHoursRef.current = virtualHours
  }, [virtualHours])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 3500)

    fetch("/api/natureos/mindex/etl-status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => setMindexLive(response.ok))
      .catch(() => setMindexLive(false))
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) window.clearInterval(recordingIntervalRef.current)
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    }
  }, [])
  
  // Initialize grids
  const initializeGrids = useCallback((nextAgarType = agarType) => {
    const nutrientLevel = AGAR_TYPES[nextAgarType as keyof typeof AGAR_TYPES]?.nutrientLevel || 80
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
  
  const drawDishRim = useCallback(() => {
    const rimCanvas = rimCanvasRef.current
    const ctx = rimCanvas?.getContext("2d")
    if (!rimCanvas || !ctx) return

    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)"
    ctx.shadowBlur = 5

    ctx.beginPath()
    ctx.arc(cx, cy, DISH_RADIUS, 0, 2 * Math.PI)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.58)"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(cx, cy, DISH_RADIUS - 0.5, 0, 2 * Math.PI)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.26)"
    ctx.lineWidth = 0.75
    ctx.stroke()
    ctx.restore()
  }, [])

  // Draw petri dish background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    ctx.beginPath()
    ctx.arc(cx, cy, DISH_RADIUS, 0, 2 * Math.PI)
    ctx.clip()

  }, [])

  const renderChemicalOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext("2d")
    if (!overlay || !ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (selectedChemicalOverlay === "none") return

    const grid = chemicalFieldsRef.current[selectedChemicalOverlay]
    if (!grid) return

    const color = CHEMICAL_COLORS[selectedChemicalOverlay] || "#ffffff"
    const step = 2
    let maxValue = 0
    for (let x = 0; x < CANVAS_SIZE; x += step) {
      for (let y = 0; y < CANVAS_SIZE; y += step) {
        if (!isInsideDish(x, y)) continue
        maxValue = Math.max(maxValue, grid[x]?.[y] || 0)
      }
    }
    const scale = maxValue > 0 ? 1 / maxValue : 0

    ctx.save()
    ctx.globalCompositeOperation = "source-over"
    for (let x = 0; x < CANVAS_SIZE; x += step) {
      for (let y = 0; y < CANVAS_SIZE; y += step) {
        if (!isInsideDish(x, y)) continue
        const value = grid[x]?.[y] || 0
        if (value <= 0) continue
        ctx.globalAlpha = Math.min(0.18, value * scale * 0.18)
        ctx.fillStyle = color
        ctx.fillRect(x, y, step, step)
      }
    }
    ctx.restore()
  }, [selectedChemicalOverlay])
  
  // Get growth factors based on environment
  const getGrowthFactors = useCallback((species: string) => {
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
  }, [humidity, pH, temperature])
  
  // Place sample on canvas
  const placeSample = useCallback((x: number, y: number, isContaminant: boolean = false, logPlacement: boolean = true, emitUpdate: boolean = true) => {
    if (!isInsideGrowthArea(x, y)) return
    
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    
    const species = isContaminant ? selectedContaminantRef.current : selectedSpeciesRef.current
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
    if (logPlacement) {
      recordExperimentEvent({
        type: isContaminant ? "contamination" : "sample",
        message: `Placed ${isContaminant ? "contaminant" : "sample"}: ${species} at (${x.toFixed(0)}, ${y.toFixed(0)})`,
        useful: true,
        persistable: true,
        payload: {
          species,
          tool: selectedToolRef.current,
          x: Math.round(x),
          y: Math.round(y),
          agarType,
          pH,
          temperature,
          humidity,
        },
      })
    }
    if (emitUpdate) emitMetricsAndCompounds()
  }, [agarType, emitMetricsAndCompounds, humidity, isRunning, pH, recordExperimentEvent, temperature])
  
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
    
    const nextVirtualHours = virtualHoursRef.current + 1
    virtualHoursRef.current = nextVirtualHours
    setVirtualHours(nextVirtualHours)
    
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
        
        if (isInsideGrowthArea(newX, newY) && gridX >= 0 && gridX < CANVAS_SIZE && gridY >= 0 && gridY < CANVAS_SIZE) {
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
        } else if (!isInsideGrowthArea(newX, newY)) {
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

    if (selectedChemicalOverlay !== "none") renderChemicalOverlay()
    
    // Clean up dead organisms
    samplesRef.current = samplesRef.current.filter(s => s.branches.length > 0)
    contaminantsRef.current = contaminantsRef.current.filter(c => c.branches.length > 0)
    
    emitMetricsAndCompounds(nextVirtualHours)
  }, [agarType, emitMetricsAndCompounds, getGrowthFactors, renderChemicalOverlay, selectedChemicalOverlay])
  
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
    drawDishRim()
    renderChemicalOverlay()
    emitMetricsAndCompounds()
    // Keep the live growth canvas stable; do not reinitialize on metric/time updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeGrids, drawBackground, drawDishRim])

  useEffect(() => {
    renderChemicalOverlay()
  }, [renderChemicalOverlay])

  useEffect(() => {
    if (selectedChemicalOverlay !== "none") return
    const overlayCtx = overlayCanvasRef.current?.getContext("2d")
    overlayCtx?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }, [selectedChemicalOverlay])
  
  const clientPointToDishPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const placeScalpelTissueChunk = (x: number, y: number) => {
    if (!isInsideGrowthArea(x, y)) return

    const ctx = canvasRef.current?.getContext("2d")
    const species = selectedSpeciesRef.current
    const props = SPECIES_PROPERTIES[species]
    if (ctx && props) {
      ctx.save()
      const tissueGradient = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 18)
      tissueGradient.addColorStop(0, `${props.color}f2`)
      tissueGradient.addColorStop(0.56, `${props.color}a8`)
      tissueGradient.addColorStop(1, `${props.color}1f`)
      ctx.beginPath()
      ctx.ellipse(x, y, 18, 12, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fillStyle = tissueGradient
      ctx.fill()
      ctx.restore()
    }

    const numPoints = 18
    for (let i = 0; i < numPoints; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * 12
      placeSample(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, false, false, false)
    }
    recordExperimentEvent({
      type: "scalpel",
      message: `Placed tissue chunk: ${species} at (${x.toFixed(0)}, ${y.toFixed(0)})`,
      useful: true,
      persistable: true,
      payload: {
        species,
        x: Math.round(x),
        y: Math.round(y),
        clusterPoints: numPoints,
        agarType,
        pH,
        temperature,
        humidity,
      },
    })
    emitMetricsAndCompounds()
  }

  const swabToPoint = (x: number, y: number) => {
    if (!isInsideGrowthArea(x, y)) return
    const last = lastSwabPointRef.current
    const spacing = 18
    if (!last) {
      placeSample(x, y, false, false, false)
      lastSwabPointRef.current = { x, y }
      return
    }

    const dx = x - last.x
    const dy = y - last.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance < spacing) return

    const steps = Math.max(1, Math.floor(distance / spacing))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      placeSample(last.x + dx * t, last.y + dy * t, false, false, false)
    }
    lastSwabPointRef.current = { x, y }
  }

  const placeFromClientPoint = (clientX: number, clientY: number) => {
    const point = clientPointToDishPoint(clientX, clientY)
    if (!point) return
    const { x, y } = point
    
    const activeTool = selectedToolRef.current
    if (activeTool === "sporeSwab") {
      swabToPoint(x, y)
    } else if (activeTool === "contamination") {
      placeSample(x, y, true)
    } else if (activeTool === "scalpel") {
      placeScalpelTissueChunk(x, y)
    }
  }

  // Handle canvas placement with pointer events so it works while the simulation is running.
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const activeTool = selectedToolRef.current
    if (activeTool === "sporeSwab") {
      isSwabbingRef.current = true
      lastSwabPointRef.current = null
    }
    placeFromClientPoint(e.clientX, e.clientY)
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSwabbingRef.current || selectedToolRef.current !== "sporeSwab") return
    e.preventDefault()
    const point = clientPointToDishPoint(e.clientX, e.clientY)
    if (!point) return
    swabToPoint(point.x, point.y)
  }

  const endCanvasPointerAction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (isSwabbingRef.current) {
      const species = selectedSpeciesRef.current
      recordExperimentEvent({
        type: "swab",
        message: `Swabbed ${species} across dish`,
        useful: true,
        persistable: true,
        payload: {
          species,
          agarType,
          pH,
          temperature,
          humidity,
        },
      })
      emitMetricsAndCompounds()
    }
    isSwabbingRef.current = false
    lastSwabPointRef.current = null
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
    drawDishRim()
    const overlayCtx = overlayCanvasRef.current?.getContext("2d")
    overlayCtx?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    
    recordExperimentEvent({
      type: "system",
      message: "Simulation reset",
      useful: false,
      persistable: false,
    })
    emitMetricsAndCompounds(0)
  }
  
  const buildSimulationSnapshot = useCallback(() => {
    const samples = samplesRef.current
    const contaminants = contaminantsRef.current
    const totalBranches = samples.reduce((total, sample) => total + sample.branches.length, 0) +
      contaminants.reduce((total, contaminant) => total + contaminant.branches.length, 0)

    return {
      schema: "mycosoft.petri.simulation.snapshot.v1",
      experimentId: experimentIdRef.current,
      timestamp: new Date().toISOString(),
      virtualHours: virtualHoursRef.current,
      settings: {
        selectedSpecies,
        selectedContaminant,
        selectedTool,
        agarType,
        pH,
        temperature,
        humidity,
        speed,
        chemicalOverlay: selectedChemicalOverlay,
      },
      summary: {
        samples: samples.length,
        contaminants: contaminants.length,
        totalBranches,
        sampleSpecies: Array.from(new Set(samples.map(sample => sample.species))),
        contaminantSpecies: Array.from(new Set(contaminants.map(contaminant => contaminant.species))),
      },
      events: experimentEventsRef.current.filter(event => event.useful && event.persistable && !event.debug).slice(-120),
      cachePolicy: {
        localStorageKey: MINDEX_CACHE_KEY,
        maxCachedEvents: MAX_MINDEX_CACHE_EVENTS,
        purgeable: true,
        debugEventsExcluded: true,
      },
    }
  }, [agarType, humidity, pH, selectedChemicalOverlay, selectedContaminant, selectedSpecies, selectedTool, speed, temperature])

  const drawRecordingAgarLayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const agarPalette: Record<string, { fill: string; edge: string }> = {
      transparent: { fill: "rgba(230, 245, 255, 0.2)", edge: "rgba(255, 255, 255, 0.38)" },
      charcoal: { fill: "rgba(13, 18, 24, 0.62)", edge: "rgba(140, 158, 176, 0.34)" },
      blood: { fill: "rgba(142, 27, 42, 0.55)", edge: "rgba(255, 180, 190, 0.28)" },
      dextrose: { fill: "rgba(119, 78, 43, 0.45)", edge: "rgba(230, 180, 120, 0.3)" },
      feces: { fill: "rgba(86, 52, 29, 0.5)", edge: "rgba(196, 160, 120, 0.25)" },
      maltExtract: { fill: "rgba(211, 171, 107, 0.38)", edge: "rgba(255, 230, 180, 0.32)" },
      fungalAgar: { fill: "rgba(189, 213, 155, 0.34)", edge: "rgba(230, 255, 205, 0.28)" },
      sabouraud: { fill: "rgba(240, 196, 126, 0.4)", edge: "rgba(255, 236, 190, 0.3)" },
    }
    const palette = agarPalette[agarType] ?? agarPalette.charcoal

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.save()
    ctx.fillStyle = "rgba(245, 247, 250, 0.82)"
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.globalAlpha = 0.08
    ctx.fillStyle = "#111827"
    for (let x = 0; x < CANVAS_SIZE; x += 28) {
      for (let y = 0; y < CANVAS_SIZE; y += 28) {
        ctx.beginPath()
        ctx.arc(x + 2, y + 2, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(cx, cy, DISH_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = palette.fill
    ctx.fill()
    ctx.strokeStyle = palette.edge
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }, [agarType])

  const drawRecordingFrame = useCallback(() => {
    const recordCanvas = recordingCanvasRef.current
    const ctx = recordCanvas?.getContext("2d")
    if (!recordCanvas || !ctx) return

    drawRecordingAgarLayer(ctx)
    if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (selectedChemicalOverlay !== "none" && overlayCanvasRef.current) {
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.globalCompositeOperation = "screen"
      ctx.drawImage(overlayCanvasRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.restore()
    }
    if (rimCanvasRef.current) ctx.drawImage(rimCanvasRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }, [drawRecordingAgarLayer, selectedChemicalOverlay])

  const purgeMindexCache = () => {
    if (canUseLocalStorage()) window.localStorage.removeItem(MINDEX_CACHE_KEY)
    recordExperimentEvent({
      type: "mindex",
      message: "Purged local MINDEX candidate cache",
      useful: false,
      persistable: false,
    })
  }

  const downloadArtifactToDesktop = (artifact: PendingArtifactSave) => {
    const url = URL.createObjectURL(artifact.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = artifact.filename
    a.click()
    URL.revokeObjectURL(url)
    setPendingArtifactSave(null)
    setArtifactSaveStatus(null)
    recordExperimentEvent({
      type: artifact.kind === "timelapse-video" ? "recording" : "snapshot",
      message: `Downloaded ${artifact.filename} locally`,
      useful: false,
      persistable: false,
    })
  }

  const saveArtifactToNatureOS = async (artifact: PendingArtifactSave) => {
    setArtifactSaveStatus("Saving to NatureOS storage...")
    try {
      const formData = new FormData()
      formData.append("file", artifact.blob, artifact.filename)
      formData.append("appId", "virtual-petri-dish")
      formData.append("kind", artifact.kind)
      formData.append("metadata", JSON.stringify(artifact.metadata))

      const response = await fetch("/api/natureos/storage/artifacts", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(response.status === 401 ? "Sign in to save this artifact to NatureOS storage." : data?.error || "NatureOS storage save failed")
      }
      setPendingArtifactSave(null)
      setArtifactSaveStatus(null)
      recordExperimentEvent({
        type: artifact.kind === "timelapse-video" ? "recording" : "snapshot",
        message: `Saved ${artifact.filename} to NatureOS storage`,
        useful: true,
        persistable: true,
        payload: {
          artifactId: data.artifact?.id,
          storagePath: data.artifact?.relativePath,
          size: artifact.blob.size,
        },
      })
    } catch (error) {
      setArtifactSaveStatus(error instanceof Error ? error.message : "NatureOS storage save failed")
    }
  }

  // Save simulation data
  const saveSimulation = () => {
    const data = buildSimulationSnapshot()
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    setArtifactSaveStatus(null)
    setPendingArtifactSave({
      title: "Save Simulation Data",
      description: "Save this console and simulation JSON locally or to your gated NatureOS storage.",
      filename: `mycosoft_petri_mindex_snapshot_${Date.now()}.json`,
      contentType: "application/json",
      kind: "simulation-data",
      blob,
      metadata: {
        experimentId: data.experimentId,
        virtualHours: data.virtualHours,
        samples: data.summary.samples,
        contaminants: data.summary.contaminants,
        totalBranches: data.summary.totalBranches,
      },
    })
  }
  
  // Toggle recording
  const toggleRecording = () => {
    if (!isRecording) {
      const recordCanvas = document.createElement("canvas")
      recordCanvas.width = CANVAS_SIZE
      recordCanvas.height = CANVAS_SIZE
      recordingCanvasRef.current = recordCanvas
      drawRecordingFrame()

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm"
      const stream = recordCanvas.captureStream(12)
      const recorder = new MediaRecorder(stream, { mimeType })
      recordingChunksRef.current = []
      recordingStartedAtRef.current = Date.now()
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        if (recordingIntervalRef.current) {
          window.clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
        }
        const blob = new Blob(recordingChunksRef.current, { type: mimeType })
        const durationSeconds = Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
        const snapshot = buildSimulationSnapshot()
        setArtifactSaveStatus(null)
        setPendingArtifactSave({
          title: "Save Petri Timelapse",
          description: "Save this visual recording locally or to the Microsoft NatureOS cloud for MYCA/MINDEX analysis.",
          filename: `mycosoft_petri_timelapse_${Date.now()}.webm`,
          contentType: mimeType,
          kind: "timelapse-video",
          blob,
          metadata: {
            experimentId: snapshot.experimentId,
            durationSeconds,
            virtualHours: snapshot.virtualHours,
            samples: snapshot.summary.samples,
            contaminants: snapshot.summary.contaminants,
          },
        })
        recordExperimentEvent({
          type: "recording",
          message: `Timelapse ready for save (${durationSeconds}s, ${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
          useful: true,
          persistable: true,
          payload: {
            durationSeconds,
            sizeBytes: blob.size,
            mimeType,
            snapshot,
          },
        })
        recordingCanvasRef.current = null
        recordingChunksRef.current = []
      }
      
      recordingIntervalRef.current = window.setInterval(drawRecordingFrame, 1000 / 12)
      recorder.start(1000)
      recorderRef.current = recorder
      setIsRecording(true)
      recordExperimentEvent({
        type: "recording",
        message: "Timelapse recording started",
        useful: false,
        persistable: false,
      })
    } else {
      recorderRef.current?.stop()
      setIsRecording(false)
      recordExperimentEvent({
        type: "recording",
        message: "Timelapse recording stopped",
        useful: false,
        persistable: false,
      })
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
    <>
    <div className="petri-app-frame flex w-full min-w-0 flex-col gap-4 overflow-x-hidden rounded-3xl border p-3 xl:flex-row xl:p-4">
      {/* Canvas Area */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-hidden">
        <div className="petri-canvas-glass flex w-full max-w-[650px] items-center justify-center overflow-hidden rounded-2xl border p-2">
          <div className="petri-dish-stage relative aspect-square w-full overflow-hidden rounded-xl">
          <div className={`petri-agar-layer petri-agar-${agarType}`} aria-hidden="true" />
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={endCanvasPointerAction}
            onPointerCancel={endCanvasPointerAction}
            onPointerLeave={endCanvasPointerAction}
            className={`relative z-10 block h-full w-full touch-none bg-transparent ${getCursorClass()}`}
          />
          <canvas
            ref={rimCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="pointer-events-none absolute inset-0 z-30 h-full w-full"
            aria-hidden="true"
          />
          {selectedChemicalOverlay !== "none" ? (
            <canvas
              ref={overlayCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="pointer-events-none absolute inset-0 z-20 h-full w-full mix-blend-screen opacity-70"
              aria-hidden="true"
            />
          ) : (
            <canvas
              ref={overlayCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="hidden"
              aria-hidden="true"
            />
          )}
          <div className="petri-dish-button-shadow" aria-hidden="true" />
          <div className="petri-dish-hover-glass" aria-hidden="true" />
          </div>
        </div>
        
        {/* Console */}
        <Card className="petri-console-glass w-full max-w-[650px]">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Console</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="petri-console-log h-32 rounded-b-lg">
              <div className="space-y-1 p-3 font-mono text-xs">
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
      <Card className="petri-controls-glass w-full min-w-0 shrink-0 gap-0 py-0 xl:w-80">
        <div className="petri-controls-topbar">
          <CardTitle className="text-sm font-semibold tracking-tight">Controls</CardTitle>
          <div className="petri-controls-status">
            <span className="petri-mindex-status" data-live={mindexLive === true} data-checking={mindexLive == null}>
              <span className="petri-mindex-led" aria-hidden="true" />
              <span>MINDEX</span>
            </span>
            <Badge variant="outline" className="petri-hour-badge">
              <Timer className="h-3 w-3 mr-1" />
              {virtualHours}h
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-4 overflow-visible pt-0">
          {/* Playback Controls */}
          <div className="petri-playback-row relative flex h-[5rem] items-center justify-center overflow-visible">
            <div className="petri-codepen-button-demo">
              <div className="button-wrap">
                <button
                  type="button"
                  aria-pressed={isRunning}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setIsRunning((running) => !running)
                  }}
                >
                  <span>{isRunning ? "Pause" : "Start"}</span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
            <div className="petri-codepen-button-demo petri-codepen-button-demo-reset absolute right-0 top-1/2 -translate-y-1/2">
              <div className="button-wrap">
                <button
                  type="button"
                  aria-label="Reset simulation"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    resetSimulation()
                  }}
                >
                  <span>
                    <RotateCcw className="h-[1em] w-[1em]" />
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="petri-control-layer-card petri-control-layer-card-top space-y-3">
            {/* Species Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Mushroom Species</Label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger className="petri-glass-select-trigger h-8 text-xs">
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
                <div className="petri-codepen-button-demo petri-codepen-button-demo-rect" data-active={selectedTool === "sporeSwab"}>
                  <div className="button-wrap">
                    <button type="button" aria-pressed={selectedTool === "sporeSwab"} onClick={() => setSelectedTool("sporeSwab")}>
                      <span>Swab</span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
                <div className="petri-codepen-button-demo petri-codepen-button-demo-rect" data-active={selectedTool === "scalpel"}>
                  <div className="button-wrap">
                    <button type="button" aria-pressed={selectedTool === "scalpel"} onClick={() => setSelectedTool("scalpel")}>
                      <span>Scalpel</span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
                <div className="petri-codepen-button-demo petri-codepen-button-demo-rect" data-active={selectedTool === "contamination"}>
                  <div className="button-wrap">
                    <button type="button" aria-pressed={selectedTool === "contamination"} onClick={() => setSelectedTool("contamination")}>
                      <span>Contam</span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contaminant Type */}
            {selectedTool === "contamination" && (
              <div className="space-y-2">
                <Label className="text-xs">Contaminant</Label>
                <Select value={selectedContaminant} onValueChange={setSelectedContaminant}>
                  <SelectTrigger className="petri-glass-select-trigger h-8 text-xs">
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
              <Select value={agarType} onValueChange={(v) => { setAgarType(v); initializeGrids(v); }}>
                <SelectTrigger className="petri-glass-select-trigger h-8 text-xs">
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
                <SelectTrigger className="petri-glass-select-trigger h-8 text-xs">
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
          </div>
          
          <Separator />
          
          {/* Environment Sliders */}
          <div className="petri-control-layer-card petri-control-layer-card-sliders space-y-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                Speed <span className="font-mono">{speed.toFixed(1)}x</span>
              </Label>
              <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={1} max={10} step={0.1} />
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
            <div className="petri-codepen-button-demo petri-codepen-button-demo-rect petri-codepen-button-demo-wide">
              <div className="button-wrap">
                <button type="button" onClick={saveSimulation}>
                  <span>
                    <Download className="h-[1em] w-[1em]" />
                    Save Data
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
            <div className="petri-codepen-button-demo petri-codepen-button-demo-rect petri-codepen-button-demo-wide" data-active={isRecording}>
              <div className="button-wrap">
                <button type="button" aria-pressed={isRecording} onClick={toggleRecording}>
                  <span>
                    {isRecording ? <VideoOff className="h-[1em] w-[1em]" /> : <Video className="h-[1em] w-[1em]" />}
                    {isRecording ? "Stop Recording" : "Record"}
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
            <div className="petri-codepen-button-demo petri-codepen-button-demo-rect petri-codepen-button-demo-wide">
              <div className="button-wrap">
                <button type="button" onClick={purgeMindexCache}>
                  <span>
                    <Trash2 className="h-[1em] w-[1em]" />
                    Purge Cache
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    <Dialog open={pendingArtifactSave != null} onOpenChange={(open) => {
      if (!open) {
        setPendingArtifactSave(null)
        setArtifactSaveStatus(null)
      }
    }}>
      <DialogContent className="border-white/30 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-black/70">
        <DialogHeader>
          <DialogTitle>{pendingArtifactSave?.title ?? "Save Artifact"}</DialogTitle>
          <DialogDescription>
            {pendingArtifactSave?.description}
          </DialogDescription>
        </DialogHeader>
        {pendingArtifactSave ? (
          <div className="rounded-2xl border border-white/25 bg-white/35 p-3 text-sm shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-white/10">
            <div className="font-mono text-xs break-all">{pendingArtifactSave.filename}</div>
            <div className="mt-1 text-muted-foreground">
              {(pendingArtifactSave.blob.size / 1024 / 1024).toFixed(2)} MB • {pendingArtifactSave.contentType}
            </div>
            {artifactSaveStatus ? (
              <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs">
                {artifactSaveStatus}
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => pendingArtifactSave && downloadArtifactToDesktop(pendingArtifactSave)}
          >
            <Download className="mr-2 h-4 w-4" />
            Save to Desktop
          </Button>
          <Button
            type="button"
            onClick={() => pendingArtifactSave && saveArtifactToNatureOS(pendingArtifactSave)}
          >
            <Cloud className="mr-2 h-4 w-4" />
            Save to NatureOS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}








