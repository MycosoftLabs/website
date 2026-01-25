"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Network, 
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
  Droplets,
  MapPin,
  Sparkles,
  Eye,
  Clock,
  TrendingUp,
  Radio,
  Cpu
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
import { Switch } from "@/components/ui/switch"

interface NetworkNode {
  id: string
  x: number
  y: number
  type: "tip" | "junction" | "fruiting"
  resources: number
  signals: number
}

interface NetworkEdge {
  source: string
  target: string
  strength: number
}

interface MyceliumState {
  biomass: number
  networkDensity: number
  resourceLevel: number
  signalActivity: number
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  age: number
  growthRate: number
}

interface SensorData {
  temperature: number
  humidity: number
  co2: number
  light: number
  ph: number
  conductivity: number
  timestamp: string
}

export default function DigitalTwinPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [myceliumState, setMyceliumState] = useState<MyceliumState | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [predictionHours, setPredictionHours] = useState(24)
  const [predictions, setPredictions] = useState<any>(null)
  const [deviceId, setDeviceId] = useState("")
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Generate initial network
  const generateNetwork = (): MyceliumState => {
    const nodes: NetworkNode[] = []
    const edges: NetworkEdge[] = []
    
    // Generate nodes
    for (let i = 0; i < 50; i++) {
      nodes.push({
        id: `node-${i}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 75,
        type: i % 10 === 0 ? "fruiting" : i % 3 === 0 ? "junction" : "tip",
        resources: Math.random(),
        signals: Math.random()
      })
    }
    
    // Generate edges (connect nearby nodes)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        )
        if (dist < 80 && Math.random() > 0.5) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            strength: Math.random()
          })
        }
      }
    }
    
    return {
      biomass: 150 + Math.random() * 100,
      networkDensity: 0.4 + Math.random() * 0.4,
      resourceLevel: 0.5 + Math.random() * 0.3,
      signalActivity: 0.3 + Math.random() * 0.5,
      nodes,
      edges,
      age: 14 + Math.random() * 30,
      growthRate: 2 + Math.random() * 4
    }
  }

  // Initialize with mock data
  useEffect(() => {
    const state = generateNetwork()
    setMyceliumState(state)
    setSensorData({
      temperature: 22 + Math.random() * 4,
      humidity: 80 + Math.random() * 15,
      co2: 400 + Math.random() * 200,
      light: 100 + Math.random() * 400,
      ph: 5.5 + Math.random(),
      conductivity: 1.2 + Math.random() * 0.5,
      timestamp: new Date().toISOString()
    })
  }, [])

  // Draw mycelial network
  useEffect(() => {
    if (!myceliumState) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let time = 0
    
    const drawFrame = () => {
      time += 0.02
      
      // Clear canvas
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw edges (hyphae)
      myceliumState.edges.forEach(edge => {
        const sourceNode = myceliumState.nodes.find(n => n.id === edge.source)
        const targetNode = myceliumState.nodes.find(n => n.id === edge.target)
        if (!sourceNode || !targetNode) return
        
        // Pulse effect for signal activity
        const pulse = Math.sin(time * 3 + parseInt(edge.source.split('-')[1]) * 0.5) * 0.3 + 0.7
        
        ctx.strokeStyle = `rgba(34, 197, 94, ${edge.strength * pulse * 0.6})`
        ctx.lineWidth = 1 + edge.strength * 2
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.stroke()
        
        // Draw traveling signals
        if (isSimulating && Math.random() > 0.98) {
          const signalProgress = (time * 0.1) % 1
          const signalX = sourceNode.x + (targetNode.x - sourceNode.x) * signalProgress
          const signalY = sourceNode.y + (targetNode.y - sourceNode.y) * signalProgress
          
          ctx.fillStyle = "#22c55e"
          ctx.beginPath()
          ctx.arc(signalX, signalY, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      
      // Draw nodes
      myceliumState.nodes.forEach(node => {
        let color = "#22c55e"
        let size = 4
        
        if (node.type === "junction") {
          color = "#3b82f6"
          size = 6
        } else if (node.type === "fruiting") {
          color = "#f59e0b"
          size = 10
        }
        
        // Glow effect
        const glowSize = size + 8
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, "transparent")
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
        
        // Node core
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fill()
        
        // Resource indicator
        if (node.resources > 0.7) {
          ctx.strokeStyle = "#22c55e"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(node.x, node.y, size + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
      
      // Legend
      ctx.fillStyle = "#666"
      ctx.font = "12px monospace"
      ctx.fillText("● Tip   ", 20, canvas.height - 40)
      ctx.fillStyle = "#3b82f6"
      ctx.fillText("● Junction   ", 70, canvas.height - 40)
      ctx.fillStyle = "#f59e0b"
      ctx.fillText("● Fruiting", 155, canvas.height - 40)
      
      animationRef.current = requestAnimationFrame(drawFrame)
    }
    
    animationRef.current = requestAnimationFrame(drawFrame)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [myceliumState, isSimulating])

  const connectToMycoBrain = async () => {
    setIsConnected(true)
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const updateFromSensors = async () => {
    // Simulate sensor update
    setSensorData({
      temperature: 22 + Math.random() * 4,
      humidity: 80 + Math.random() * 15,
      co2: 400 + Math.random() * 200,
      light: 100 + Math.random() * 400,
      ph: 5.5 + Math.random(),
      conductivity: 1.2 + Math.random() * 0.5,
      timestamp: new Date().toISOString()
    })
    
    // Update mycelium state based on sensors
    if (myceliumState) {
      setMyceliumState({
        ...myceliumState,
        biomass: myceliumState.biomass * (1 + Math.random() * 0.01),
        networkDensity: Math.min(0.95, myceliumState.networkDensity + Math.random() * 0.01),
        resourceLevel: 0.5 + Math.random() * 0.3,
        signalActivity: 0.3 + Math.random() * 0.5
      })
    }
  }

  const runPrediction = async () => {
    setIsSimulating(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setPredictions({
      predictedBiomass: (myceliumState?.biomass || 200) * (1 + 0.03 * predictionHours / 24),
      predictedDensity: Math.min(0.95, (myceliumState?.networkDensity || 0.5) + 0.02 * predictionHours / 24),
      fruitingProbability: Math.min(0.95, 0.1 + 0.03 * predictionHours / 24),
      estimatedHarvestDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      recommendations: [
        "Increase humidity to 90% for optimal growth",
        "Reduce light exposure during primordial formation",
        "Maintain CO2 below 800ppm for fruiting"
      ]
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
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Digital Twin Mycelium
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time network simulation • MycoBrain integration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={isConnected ? "default" : "outline"} 
                className={isConnected ? "bg-green-500/20 text-green-400 border-green-400/50" : ""}
              >
                {isConnected ? (
                  <>
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Connected
                  </>
                ) : (
                  "Disconnected"
                )}
              </Badge>
            </div>
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
                      Live mycelial network topology and signal propagation
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSimulating(!isSimulating)}
                    >
                      {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyceliumState(generateNetwork())}
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
                    height={400}
                    className="w-full h-[400px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sensor Data */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-400" />
                    MycoBrain Sensor Feed
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-update" className="text-xs">Auto-update</Label>
                    <Switch 
                      id="auto-update"
                      checked={autoUpdate}
                      onCheckedChange={setAutoUpdate}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-6">
                    <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">Connect to MycoBrain to receive sensor data</p>
                    <div className="flex gap-2 justify-center">
                      <Input
                        placeholder="Device ID (e.g., MB-001)"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="max-w-[200px]"
                      />
                      <Button onClick={connectToMycoBrain}>
                        <Radio className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </div>
                ) : sensorData ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Thermometer className="h-5 w-5 mx-auto mb-1 text-red-400" />
                      <p className="text-lg font-bold">{sensorData.temperature.toFixed(1)}°</p>
                      <p className="text-xs text-muted-foreground">Temp (°C)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Droplets className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                      <p className="text-lg font-bold">{sensorData.humidity.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Activity className="h-5 w-5 mx-auto mb-1 text-green-400" />
                      <p className="text-lg font-bold">{sensorData.co2.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">CO₂ (ppm)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
                      <p className="text-lg font-bold">{sensorData.light.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Light (lux)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Waves className="h-5 w-5 mx-auto mb-1 text-purple-400" />
                      <p className="text-lg font-bold">{sensorData.ph.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">pH</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Activity className="h-5 w-5 mx-auto mb-1 text-cyan-400" />
                      <p className="text-lg font-bold">{sensorData.conductivity.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">EC (mS/cm)</p>
                    </div>
                  </div>
                ) : null}
                
                {isConnected && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Last update: {sensorData?.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : "N/A"}
                    </p>
                    <Button variant="outline" size="sm" onClick={updateFromSensors}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Network Stats */}
            {myceliumState && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    Network State
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Biomass</span>
                      <span className="font-medium">{myceliumState.biomass.toFixed(1)}g</span>
                    </div>
                    <Progress value={myceliumState.biomass / 3} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Network Density</span>
                      <span className="font-medium">{(myceliumState.networkDensity * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={myceliumState.networkDensity * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Resource Level</span>
                      <span className="font-medium">{(myceliumState.resourceLevel * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={myceliumState.resourceLevel * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Signal Activity</span>
                      <span className="font-medium">{(myceliumState.signalActivity * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={myceliumState.signalActivity * 100} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-400">{myceliumState.nodes.length}</p>
                      <p className="text-xs text-muted-foreground">Nodes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-400">{myceliumState.edges.length}</p>
                      <p className="text-xs text-muted-foreground">Connections</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xl font-bold text-orange-400">{myceliumState.age.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Age (days)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-purple-400">{myceliumState.growthRate.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">mm/day</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Predictions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Growth Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Prediction Window: {predictionHours}h</Label>
                  <Slider
                    value={[predictionHours]}
                    onValueChange={([v]) => setPredictionHours(v)}
                    min={6}
                    max={168}
                    step={6}
                  />
                </div>
                
                <Button 
                  className="w-full"
                  onClick={runPrediction}
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Predict Growth
                    </>
                  )}
                </Button>
                
                {predictions && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Predicted Biomass</span>
                      <span className="font-medium text-green-400">{predictions.predictedBiomass.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Predicted Density</span>
                      <span className="font-medium text-blue-400">{(predictions.predictedDensity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Fruiting Probability</span>
                      <span className="font-medium text-orange-400">{(predictions.fruitingProbability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Est. Harvest</span>
                      <span className="font-medium">{predictions.estimatedHarvestDate}</span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-2">Recommendations</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {predictions.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-green-400 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardContent className="py-4">
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export GeoJSON for Earth Simulator
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
