"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Sprout, 
  Activity,
  Timer,
  Download,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Thermometer,
  Droplets,
  Sun,
  Moon,
  Sparkles,
  TrendingUp,
  Calendar,
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"

// Lifecycle stages
const STAGES = [
  { id: "spore", name: "Spore", icon: Circle, color: "text-gray-400", duration: "1-3 days" },
  { id: "germination", name: "Germination", icon: Sprout, color: "text-green-400", duration: "2-7 days" },
  { id: "hyphal_growth", name: "Hyphal Growth", icon: Activity, color: "text-blue-400", duration: "7-14 days" },
  { id: "mycelial_network", name: "Mycelial Network", icon: Activity, color: "text-cyan-400", duration: "14-30 days" },
  { id: "primordial", name: "Primordial Formation", icon: Sprout, color: "text-yellow-400", duration: "3-7 days" },
  { id: "fruiting", name: "Fruiting Body", icon: Sun, color: "text-orange-400", duration: "5-10 days" },
  { id: "sporulation", name: "Sporulation", icon: Sparkles, color: "text-purple-400", duration: "2-5 days" },
]

// Species profiles
const SPECIES = [
  { id: "psilocybe_cubensis", name: "Psilocybe cubensis", germTemp: 24, fruitTemp: 22, humidity: 95, growthRate: 5 },
  { id: "hericium_erinaceus", name: "Hericium erinaceus", germTemp: 22, fruitTemp: 18, humidity: 90, growthRate: 3 },
  { id: "pleurotus_ostreatus", name: "Pleurotus ostreatus", germTemp: 24, fruitTemp: 15, humidity: 85, growthRate: 7 },
  { id: "ganoderma_lucidum", name: "Ganoderma lucidum", germTemp: 28, fruitTemp: 25, humidity: 90, growthRate: 2 },
  { id: "cordyceps_militaris", name: "Cordyceps militaris", germTemp: 20, fruitTemp: 18, humidity: 95, growthRate: 1 },
  { id: "trametes_versicolor", name: "Trametes versicolor", germTemp: 22, fruitTemp: 20, humidity: 85, growthRate: 4 },
]

interface SimulationState {
  currentStage: string
  stageProgress: number
  daysPassed: number
  biomass: number
  health: number
  predictions: {
    nextStageDate: string
    harvestDate: string
    expectedYield: number
  }
}

export default function LifecycleSimPage() {
  const [selectedSpecies, setSelectedSpecies] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  
  // Environmental conditions
  const [temperature, setTemperature] = useState(22)
  const [humidity, setHumidity] = useState(85)
  const [lightHours, setLightHours] = useState(12)
  const [co2Level, setCo2Level] = useState(500)

  // Initialize simulation
  const initSimulation = () => {
    if (!selectedSpecies) return
    
    setSimulation({
      currentStage: "spore",
      stageProgress: 0,
      daysPassed: 0,
      biomass: 0.1,
      health: 100,
      predictions: {
        nextStageDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        harvestDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        expectedYield: 150 + Math.random() * 100
      }
    })
  }

  // Simulation tick
  useEffect(() => {
    if (!isRunning || !simulation) return
    
    const interval = setInterval(() => {
      setSimulation(prev => {
        if (!prev) return prev
        
        const species = SPECIES.find(s => s.id === selectedSpecies)
        if (!species) return prev
        
        // Calculate growth rate based on conditions
        const tempOptimality = 1 - Math.abs(temperature - species.fruitTemp) / 20
        const humidityOptimality = 1 - Math.abs(humidity - species.humidity) / 30
        const growthFactor = tempOptimality * humidityOptimality * (species.growthRate / 5)
        
        let newProgress = prev.stageProgress + growthFactor * 2 * speed
        let newStage = prev.currentStage
        let newDays = prev.daysPassed + 0.1 * speed
        
        // Stage progression
        if (newProgress >= 100) {
          const currentIndex = STAGES.findIndex(s => s.id === newStage)
          if (currentIndex < STAGES.length - 1) {
            newStage = STAGES[currentIndex + 1].id
            newProgress = 0
          } else {
            newProgress = 100
            setIsRunning(false)
          }
        }
        
        return {
          ...prev,
          currentStage: newStage,
          stageProgress: newProgress,
          daysPassed: newDays,
          biomass: prev.biomass * (1 + growthFactor * 0.01),
          health: Math.max(0, Math.min(100, prev.health - (1 - tempOptimality * humidityOptimality) * 0.5))
        }
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [isRunning, simulation, selectedSpecies, temperature, humidity, speed])

  const currentStageIndex = simulation 
    ? STAGES.findIndex(s => s.id === simulation.currentStage)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg">
                <Sprout className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
                  Spore Lifecycle Simulator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Complete fungal lifecycle modeling • Environmental optimization
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
          
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Species Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-400" />
                  Select Species
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSpecies} onValueChange={(v) => { setSelectedSpecies(v); initSimulation(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a fungal species..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES.map(species => (
                      <SelectItem key={species.id} value={species.id}>
                        <span className="italic">{species.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Lifecycle Timeline */}
            <Card className="border-green-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-green-400" />
                    Lifecycle Timeline
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRunning(!isRunning)}
                      disabled={!simulation}
                    >
                      {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={initSimulation}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Stage Timeline */}
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((currentStageIndex + (simulation?.stageProgress || 0) / 100) / STAGES.length) * 100}%` 
                      }}
                    />
                  </div>
                  
                  {/* Stages */}
                  <div className="relative flex justify-between">
                    {STAGES.map((stage, i) => {
                      const isActive = simulation?.currentStage === stage.id
                      const isComplete = i < currentStageIndex
                      const StageIcon = stage.icon
                      
                      return (
                        <div key={stage.id} className="flex flex-col items-center z-10">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${isComplete ? "bg-green-500" : isActive ? "bg-yellow-500" : "bg-muted"}
                            transition-colors duration-300
                          `}>
                            {isComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            ) : (
                              <StageIcon className={`h-5 w-5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                            )}
                          </div>
                          <p className={`text-xs mt-2 text-center max-w-[80px] ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                            {stage.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{stage.duration}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Current Stage Details */}
                {simulation && (
                  <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Stage</p>
                        <p className="text-xl font-bold">
                          {STAGES.find(s => s.id === simulation.currentStage)?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Day</p>
                        <p className="text-xl font-bold">{simulation.daysPassed.toFixed(1)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stage Progress</span>
                        <span>{simulation.stageProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={simulation.stageProgress} className="h-3" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environmental Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-orange-400" />
                  Environmental Conditions
                </CardTitle>
                <CardDescription>
                  Adjust conditions to optimize growth for selected species
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <Thermometer className="h-4 w-4 text-red-400" />
                        Temperature
                      </Label>
                      <span className="text-sm font-medium">{temperature}°C</span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={10}
                      max={35}
                      step={1}
                    />
                    {selectedSpecies && (
                      <p className="text-xs text-muted-foreground">
                        Optimal: {SPECIES.find(s => s.id === selectedSpecies)?.fruitTemp}°C
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <Droplets className="h-4 w-4 text-blue-400" />
                        Humidity
                      </Label>
                      <span className="text-sm font-medium">{humidity}%</span>
                    </div>
                    <Slider
                      value={[humidity]}
                      onValueChange={([v]) => setHumidity(v)}
                      min={50}
                      max={100}
                      step={1}
                    />
                    {selectedSpecies && (
                      <p className="text-xs text-muted-foreground">
                        Optimal: {SPECIES.find(s => s.id === selectedSpecies)?.humidity}%
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <Sun className="h-4 w-4 text-yellow-400" />
                        Light Hours
                      </Label>
                      <span className="text-sm font-medium">{lightHours}h</span>
                    </div>
                    <Slider
                      value={[lightHours]}
                      onValueChange={([v]) => setLightHours(v)}
                      min={0}
                      max={24}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <Activity className="h-4 w-4 text-green-400" />
                        CO₂ Level
                      </Label>
                      <span className="text-sm font-medium">{co2Level} ppm</span>
                    </div>
                    <Slider
                      value={[co2Level]}
                      onValueChange={([v]) => setCo2Level(v)}
                      min={200}
                      max={2000}
                      step={50}
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Simulation Speed</Label>
                    <span className="text-sm font-medium">{speed}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={([v]) => setSpeed(v)}
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Simulation Stats */}
            {simulation && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    Growth Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Biomass</span>
                      <span className="font-medium">{simulation.biomass.toFixed(2)}g</span>
                    </div>
                    <Progress value={Math.min(simulation.biomass, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Health</span>
                      <span className="font-medium">{simulation.health.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={simulation.health} 
                      className={`h-2 ${simulation.health < 50 ? "bg-red-500" : ""}`} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold text-green-400">{simulation.daysPassed.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Days Elapsed</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold text-blue-400">{currentStageIndex + 1}/{STAGES.length}</p>
                      <p className="text-xs text-muted-foreground">Stage</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Predictions */}
            {simulation?.predictions && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Next Stage</span>
                    <span className="text-sm font-medium">{simulation.predictions.nextStageDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Harvest Date</span>
                    <span className="text-sm font-medium">{simulation.predictions.harvestDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expected Yield</span>
                    <span className="text-sm font-medium text-green-400">{simulation.predictions.expectedYield.toFixed(0)}g</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSpecies ? (
                  <ul className="text-sm space-y-2">
                    {simulation && simulation.health < 80 && (
                      <li className="flex items-start gap-2 text-yellow-400">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Adjust conditions to improve health
                      </li>
                    )}
                    {temperature < (SPECIES.find(s => s.id === selectedSpecies)?.fruitTemp || 20) - 3 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                        Increase temperature for faster growth
                      </li>
                    )}
                    {humidity < (SPECIES.find(s => s.id === selectedSpecies)?.humidity || 85) - 5 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                        Increase humidity for optimal conditions
                      </li>
                    )}
                    {co2Level > 1000 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                        Reduce CO₂ for better fruiting
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a species to see recommendations
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardContent className="py-4">
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Simulation Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
