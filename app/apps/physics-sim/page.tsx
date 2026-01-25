"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Atom, 
  Activity,
  Zap,
  Download,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Loader2,
  ChevronRight,
  Waves,
  Thermometer,
  Wind,
  Moon,
  Mountain,
  Sparkles,
  Layers,
  Target
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

// Predefined molecules for simulation
const MOLECULES = [
  { id: "psilocybin", name: "Psilocybin", formula: "C12H17N2O4P", atoms: 36, category: "Tryptamine" },
  { id: "muscimol", name: "Muscimol", formula: "C4H6N2O2", atoms: 14, category: "Isoxazole" },
  { id: "ergotamine", name: "Ergotamine", formula: "C33H35N5O5", atoms: 78, category: "Ergot Alkaloid" },
  { id: "hericenone", name: "Hericenone A", formula: "C35H54O5", atoms: 94, category: "Terpenoid" },
  { id: "ganoderic_acid", name: "Ganoderic Acid A", formula: "C30H44O7", atoms: 81, category: "Triterpenoid" },
  { id: "cordycepin", name: "Cordycepin", formula: "C10H13N5O3", atoms: 31, category: "Nucleoside" },
]

interface SimulationResult {
  groundStateEnergy: number
  homoLumoGap: number
  dipoleMoment: number
  polarizability: number
  trajectory?: Array<Array<{x: number, y: number, z: number}>>
  entanglement?: number
}

interface FieldPhysicsData {
  geomagneticField: { bx: number, by: number, bz: number, total: number }
  lunarInfluence: { gravitationalForce: number, tidalPotential: number, phase: string }
  atmospheric: { temperature: number, pressure: number, humidity: number }
  fruitingPrediction: { probability: number, optimalTime: string }
}

export default function PhysicsSimPage() {
  const [selectedMolecule, setSelectedMolecule] = useState<string>("")
  const [simulationType, setSimulationType] = useState<"qise" | "md" | "tensor">("qise")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [fieldData, setFieldData] = useState<FieldPhysicsData | null>(null)
  const [activeTab, setActiveTab] = useState("molecular")
  
  // Simulation parameters
  const [steps, setSteps] = useState(100)
  const [timestep, setTimestep] = useState(0.1)
  const [bondDimension, setBondDimension] = useState(32)
  
  // Location for field physics
  const [latitude, setLatitude] = useState(37.7749)
  const [longitude, setLongitude] = useState(-122.4194)
  const [altitude, setAltitude] = useState(10)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Draw molecular visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const drawFrame = (time: number) => {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      
      if (selectedMolecule) {
        const molecule = MOLECULES.find(m => m.id === selectedMolecule)
        const atomCount = molecule?.atoms || 10
        
        // Draw bonds (simplified orbital visualization)
        ctx.strokeStyle = "rgba(59, 130, 246, 0.3)"
        ctx.lineWidth = 1
        
        for (let i = 0; i < atomCount; i++) {
          for (let j = i + 1; j < Math.min(i + 4, atomCount); j++) {
            const angle1 = (i / atomCount) * Math.PI * 2 + time * 0.001
            const radius1 = 40 + (i % 3) * 30
            const x1 = centerX + Math.cos(angle1) * radius1
            const y1 = centerY + Math.sin(angle1) * radius1
            
            const angle2 = (j / atomCount) * Math.PI * 2 + time * 0.001
            const radius2 = 40 + (j % 3) * 30
            const x2 = centerX + Math.cos(angle2) * radius2
            const y2 = centerY + Math.sin(angle2) * radius2
            
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        }
        
        // Draw atoms with orbital motion
        for (let i = 0; i < atomCount; i++) {
          const angle = (i / atomCount) * Math.PI * 2 + time * 0.001
          const radius = 40 + (i % 3) * 30 + Math.sin(time * 0.003 + i) * 5
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          // Atom glow
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12)
          const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]
          gradient.addColorStop(0, colors[i % colors.length])
          gradient.addColorStop(1, "transparent")
          
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.fill()
          
          // Atom core
          ctx.fillStyle = colors[i % colors.length]
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Draw energy waves if simulating
        if (isSimulating) {
          const waveRadius = (time * 0.1) % 150
          ctx.strokeStyle = `rgba(59, 130, 246, ${1 - waveRadius / 150})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        // Molecule name
        ctx.fillStyle = "#888"
        ctx.font = "14px monospace"
        ctx.textAlign = "center"
        ctx.fillText(molecule?.name || "", centerX, canvas.height - 20)
        ctx.fillText(molecule?.formula || "", centerX, canvas.height - 40)
      } else {
        ctx.fillStyle = "#333"
        ctx.font = "16px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Select a molecule to simulate", centerX, centerY)
      }
      
      animationRef.current = requestAnimationFrame(drawFrame)
    }
    
    animationRef.current = requestAnimationFrame(drawFrame)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [selectedMolecule, isSimulating])

  const runMolecularSimulation = async () => {
    if (!selectedMolecule) return
    
    setIsSimulating(true)
    setSimulationProgress(0)
    setResult(null)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 300)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    clearInterval(progressInterval)
    setSimulationProgress(100)
    
    const molecule = MOLECULES.find(m => m.id === selectedMolecule)
    
    // Generate simulated results based on simulation type
    const baseEnergy = -(50 + (molecule?.atoms || 10) * 2)
    
    setResult({
      groundStateEnergy: baseEnergy + Math.random() * 10,
      homoLumoGap: 2 + Math.random() * 4,
      dipoleMoment: Math.random() * 5,
      polarizability: 50 + Math.random() * 100,
      entanglement: simulationType === "tensor" ? Math.random() * bondDimension / 2 : undefined,
      trajectory: simulationType === "md" ? generateTrajectory(steps) : undefined
    })
    
    setIsSimulating(false)
  }
  
  const generateTrajectory = (steps: number) => {
    const trajectory = []
    for (let i = 0; i < steps; i++) {
      trajectory.push([
        { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 }
      ])
    }
    return trajectory
  }

  const fetchFieldPhysics = async () => {
    setIsSimulating(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Generate simulated field physics data
    setFieldData({
      geomagneticField: {
        bx: (Math.random() - 0.5) * 50000,
        by: (Math.random() - 0.5) * 50000,
        bz: (Math.random() - 0.5) * 50000,
        total: 25000 + Math.random() * 25000
      },
      lunarInfluence: {
        gravitationalForce: Math.random() * 1e-6,
        tidalPotential: Math.random() * 1e-5,
        phase: ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"][Math.floor(Math.random() * 8)]
      },
      atmospheric: {
        temperature: 10 + Math.random() * 20,
        pressure: 1000 + Math.random() * 30,
        humidity: 50 + Math.random() * 40
      },
      fruitingPrediction: {
        probability: 0.3 + Math.random() * 0.5,
        optimalTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    })
    
    setIsSimulating(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Atom className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Quantum-Inspired Physics Simulator
                </h1>
                <p className="text-sm text-muted-foreground">
                  QISE Engine • Molecular Dynamics • Field Physics
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              <Sparkles className="h-3 w-3 mr-1" />
              NLM Physics Layer
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="molecular" className="gap-2">
              <Atom className="h-4 w-4" />
              Molecular
            </TabsTrigger>
            <TabsTrigger value="field" className="gap-2">
              <Waves className="h-4 w-4" />
              Field Physics
            </TabsTrigger>
          </TabsList>

          {/* Molecular Simulation Tab */}
          <TabsContent value="molecular">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Control Panel */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-400" />
                      Simulation Setup
                    </CardTitle>
                    <CardDescription>
                      Configure and run quantum-inspired molecular simulations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Molecule Selection */}
                    <div className="space-y-2">
                      <Label>Target Molecule</Label>
                      <Select value={selectedMolecule} onValueChange={setSelectedMolecule}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a fungal compound..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOLECULES.map(mol => (
                            <SelectItem key={mol.id} value={mol.id}>
                              <div className="flex items-center gap-2">
                                <span>{mol.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {mol.atoms} atoms
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedMolecule && (
                        <p className="text-xs text-muted-foreground">
                          Category: {MOLECULES.find(m => m.id === selectedMolecule)?.category}
                        </p>
                      )}
                    </div>

                    {/* Visualization Canvas */}
                    <div className="border rounded-lg bg-black/50 overflow-hidden">
                      <canvas 
                        ref={canvasRef}
                        width={600}
                        height={350}
                        className="w-full h-[350px]"
                      />
                    </div>

                    {/* Simulation Type */}
                    <div className="space-y-2">
                      <Label>Simulation Method</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          variant={simulationType === "qise" ? "default" : "outline"}
                          onClick={() => setSimulationType("qise")}
                          className="h-auto py-3 flex flex-col"
                        >
                          <Zap className="h-5 w-5 mb-1" />
                          <span className="text-xs">QISE</span>
                        </Button>
                        <Button
                          variant={simulationType === "md" ? "default" : "outline"}
                          onClick={() => setSimulationType("md")}
                          className="h-auto py-3 flex flex-col"
                        >
                          <Activity className="h-5 w-5 mb-1" />
                          <span className="text-xs">Molecular Dynamics</span>
                        </Button>
                        <Button
                          variant={simulationType === "tensor" ? "default" : "outline"}
                          onClick={() => setSimulationType("tensor")}
                          className="h-auto py-3 flex flex-col"
                        >
                          <Layers className="h-5 w-5 mb-1" />
                          <span className="text-xs">Tensor Network</span>
                        </Button>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                      {simulationType === "md" && (
                        <>
                          <div className="space-y-2">
                            <Label>Simulation Steps: {steps}</Label>
                            <Slider
                              value={[steps]}
                              onValueChange={([v]) => setSteps(v)}
                              min={10}
                              max={1000}
                              step={10}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Timestep: {timestep.toFixed(2)} fs</Label>
                            <Slider
                              value={[timestep * 100]}
                              onValueChange={([v]) => setTimestep(v / 100)}
                              min={1}
                              max={100}
                              step={1}
                            />
                          </div>
                        </>
                      )}
                      {simulationType === "tensor" && (
                        <div className="space-y-2">
                          <Label>Max Bond Dimension: {bondDimension}</Label>
                          <Slider
                            value={[bondDimension]}
                            onValueChange={([v]) => setBondDimension(v)}
                            min={8}
                            max={128}
                            step={8}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    {isSimulating && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Simulating...</span>
                          <span>{simulationProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={simulationProgress} className="h-2" />
                      </div>
                    )}

                    {/* Run Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      size="lg"
                      disabled={!selectedMolecule || isSimulating}
                      onClick={runMolecularSimulation}
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Computing Quantum States...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Run {simulationType.toUpperCase()} Simulation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel */}
              <div className="space-y-6">
                {result ? (
                  <Card className="border-green-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-green-400" />
                        Simulation Results
                      </CardTitle>
                      <CardDescription>
                        {simulationType === "qise" && "Quantum-Inspired Eigensolver Output"}
                        {simulationType === "md" && "Molecular Dynamics Trajectory"}
                        {simulationType === "tensor" && "Tensor Network Decomposition"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-blue-400">
                            {result.groundStateEnergy.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Ground State (eV)</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-green-400">
                            {result.homoLumoGap.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">HOMO-LUMO Gap (eV)</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-purple-400">
                            {result.dipoleMoment.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Dipole Moment (D)</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-orange-400">
                            {result.polarizability.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">Polarizability (Å³)</p>
                        </div>
                      </div>

                      {result.entanglement !== undefined && (
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-cyan-400">
                            {result.entanglement.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Entanglement Entropy</p>
                        </div>
                      )}

                      {result.trajectory && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-1">Trajectory Data</p>
                          <p className="text-xs text-muted-foreground">
                            {result.trajectory.length} timesteps recorded
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-4 w-4 mr-1" />
                          Export Data
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setResult(null)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Atom className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Run a simulation to see results
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">About QISE</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>
                      <strong>QISE</strong> (Quantum-Inspired Simulation Engine) uses variational 
                      algorithms to approximate quantum ground states on classical hardware.
                    </p>
                    <p>
                      <strong>Tensor Networks</strong> decompose molecular systems into manageable 
                      matrices for systems up to 50+ atoms.
                    </p>
                    <p>
                      <strong>Molecular Dynamics</strong> simulates atomic motion using classical 
                      force fields for real-time trajectory analysis.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Field Physics Tab */}
          <TabsContent value="field">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-blue-400" />
                    Environmental Field Physics
                  </CardTitle>
                  <CardDescription>
                    Analyze geomagnetic, lunar, and atmospheric influences on fungal growth
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Location Input */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value))}
                        step="0.0001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value))}
                        step="0.0001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Altitude (m)</Label>
                      <Input
                        type="number"
                        value={altitude}
                        onChange={(e) => setAltitude(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={fetchFieldPhysics}
                    disabled={isSimulating}
                  >
                    {isSimulating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching Field Data...
                      </>
                    ) : (
                      <>
                        <Mountain className="h-4 w-4 mr-2" />
                        Analyze Field Conditions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Field Results */}
              {fieldData ? (
                <div className="space-y-4">
                  {/* Geomagnetic */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        Geomagnetic Field
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-4 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.geomagneticField.bx.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Bx (nT)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.geomagneticField.by.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">By (nT)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.geomagneticField.bz.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Bz (nT)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.geomagneticField.total.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Total (nT)</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lunar */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Moon className="h-4 w-4 text-purple-400" />
                        Lunar Influence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center col-span-1">
                        <p className="text-sm font-bold">{fieldData.lunarInfluence.phase}</p>
                        <p className="text-xs text-muted-foreground">Phase</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.lunarInfluence.gravitationalForce.toExponential(2)}</p>
                        <p className="text-xs text-muted-foreground">Gravity (N/kg)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.lunarInfluence.tidalPotential.toExponential(2)}</p>
                        <p className="text-xs text-muted-foreground">Tidal Pot.</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Atmospheric */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wind className="h-4 w-4 text-cyan-400" />
                        Atmospheric Conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold flex items-center justify-center gap-1">
                          <Thermometer className="h-4 w-4" />
                          {fieldData.atmospheric.temperature.toFixed(1)}°
                        </p>
                        <p className="text-xs text-muted-foreground">Temp (°C)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.atmospheric.pressure.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Pressure (hPa)</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-lg font-bold">{fieldData.atmospheric.humidity.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Humidity</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fruiting Prediction */}
                  <Card className="border-green-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-400" />
                        Fruiting Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-green-400">
                            {(fieldData.fruitingPrediction.probability * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Fruiting Probability</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{fieldData.fruitingPrediction.optimalTime}</p>
                          <p className="text-xs text-muted-foreground">Optimal Date</p>
                        </div>
                      </div>
                      <Progress 
                        value={fieldData.fruitingPrediction.probability * 100} 
                        className="h-2 mt-3" 
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed h-fit">
                  <CardContent className="py-12 text-center">
                    <Waves className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Enter location to analyze field physics
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
