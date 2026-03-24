"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Brain, Activity, Zap, Database, Play, Pause, RefreshCw, Download, Network, Cpu, Layers,
  Target, ArrowRight, Sparkles, ChevronRight, GitBranch, Settings, Eye, BarChart3,
  Wifi, WifiOff, Server, HardDrive, Upload, CircleDot, Dna, Shuffle, TrendingUp,
  Save, RotateCcw, Square, SkipForward, AlertTriangle, CheckCircle2, Clock,
  Maximize2, Minimize2, SlidersHorizontal, Box, Workflow, Monitor
} from "lucide-react"
import Link from "next/link"
import FungaNetwork3D from "@/components/visualizers/FungaNetwork3D"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceNode {
  id: string
  name: string
  type: "mycobrain" | "jetson" | "sporebase" | "myconode" | "alarm"
  status: "online" | "offline" | "degraded"
  dataRate: number // samples/sec
  lastSeen: number
  metrics: { temp?: number; humidity?: number; voltage?: number; gas?: number[] }
}

interface TrainingMetrics {
  epoch: number
  loss: number
  accuracy: number
  learningRate: number
  samplesProcessed: number
  batchesCompleted: number
  elapsedTime: number
  gradientNorm: number
  memoryUsage: number
}

interface LayerViz {
  name: string
  type: "attention" | "ffn" | "embedding" | "norm" | "output"
  neurons: number
  activation: number[]
  weights: { min: number; max: number; mean: number; std: number }
}

interface MutationEvent {
  id: string
  timestamp: number
  type: "prune" | "grow" | "rewire" | "perturb" | "merge"
  target: string
  magnitude: number
  impact: number // delta accuracy
}

// ─── Simulated State Generators ───────────────────────────────────────────────

function generateDevices(): DeviceNode[] {
  return [
    { id: "mushroom-1", name: "Mushroom 1", type: "mycobrain", status: "online", dataRate: 128, lastSeen: Date.now(), metrics: { temp: 22.4, humidity: 87, voltage: 3.28, gas: [420, 12, 0.8, 340] } },
    { id: "hyphae-1", name: "Hyphae 1 SporeBase", type: "sporebase", status: "online", dataRate: 256, lastSeen: Date.now(), metrics: { temp: 21.8, humidity: 92, voltage: 3.31 } },
    { id: "myconode-1", name: "MycoNode Alpha", type: "myconode", status: "online", dataRate: 64, lastSeen: Date.now(), metrics: { temp: 23.1, humidity: 78 } },
    { id: "alarm-1", name: "Alarm Sentinel", type: "alarm", status: "degraded", dataRate: 32, lastSeen: Date.now() - 15000, metrics: { voltage: 3.05 } },
    { id: "jetson-edge-1", name: "Jetson Edge NLM-1", type: "jetson", status: "online", dataRate: 512, lastSeen: Date.now(), metrics: { temp: 48.2 } },
    { id: "jetson-edge-2", name: "Jetson Edge NLM-2", type: "jetson", status: "online", dataRate: 480, lastSeen: Date.now(), metrics: { temp: 51.7 } },
  ]
}

function generateLayers(): LayerViz[] {
  const layers: LayerViz[] = [
    { name: "Signal Embedding", type: "embedding", neurons: 512, activation: [], weights: { min: -0.42, max: 0.39, mean: 0.001, std: 0.12 } },
  ]
  for (let i = 0; i < 6; i++) {
    layers.push({ name: `Attention Block ${i + 1}`, type: "attention", neurons: 512, activation: [], weights: { min: -0.35, max: 0.33, mean: 0.0, std: 0.08 } })
    layers.push({ name: `FFN Block ${i + 1}`, type: "ffn", neurons: 2048, activation: [], weights: { min: -0.28, max: 0.31, mean: 0.002, std: 0.09 } })
    layers.push({ name: `LayerNorm ${i + 1}`, type: "norm", neurons: 512, activation: [], weights: { min: 0.85, max: 1.15, mean: 1.0, std: 0.04 } })
  }
  layers.push({ name: "Bio-Token Output", type: "output", neurons: 4096, activation: [], weights: { min: -0.22, max: 0.24, mean: -0.001, std: 0.07 } })
  return layers
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModelTrainingToolPage() {
  // ── Training State
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "training" | "paused" | "evaluating">("idle")
  const [metrics, setMetrics] = useState<TrainingMetrics>({
    epoch: 0, loss: 2.45, accuracy: 0, learningRate: 0.0003, samplesProcessed: 0,
    batchesCompleted: 0, elapsedTime: 0, gradientNorm: 1.2, memoryUsage: 0,
  })
  const [lossHistory, setLossHistory] = useState<number[]>([2.8, 2.6, 2.45])
  const [accHistory, setAccHistory] = useState<number[]>([0, 2.1, 5.8])
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  // ── Hyperparameters
  const [learningRate, setLearningRate] = useState(0.0003)
  const [batchSize, setBatchSize] = useState(32)
  const [maxEpochs, setMaxEpochs] = useState(100)
  const [warmupSteps, setWarmupSteps] = useState(1000)
  const [weightDecay, setWeightDecay] = useState(0.01)
  const [dropoutRate, setDropoutRate] = useState(0.1)
  const [optimizer, setOptimizer] = useState("adamw")
  const [scheduler, setScheduler] = useState("cosine")
  const [gradClip, setGradClip] = useState(1.0)
  const [attentionHeads, setAttentionHeads] = useState(8)
  const [hiddenDim, setHiddenDim] = useState(512)
  const [numLayers, setNumLayers] = useState(6)

  // ── Plasticity / Mutation
  const [plasticityEnabled, setPlasticityEnabled] = useState(false)
  const [plasticityRate, setPlasticityRate] = useState(0.05)
  const [mutationMode, setMutationMode] = useState<"none" | "prune" | "grow" | "rewire" | "perturb">("none")
  const [mutationLog, setMutationLog] = useState<MutationEvent[]>([])
  const [autoMutate, setAutoMutate] = useState(false)
  const [mutationThreshold, setMutationThreshold] = useState(0.01)

  // ── Data Pipeline
  const [devices, setDevices] = useState<DeviceNode[]>(generateDevices)
  const [dataSourceFilter, setDataSourceFilter] = useState<string>("all")
  const [mindexConnected, setMindexConnected] = useState(true)
  const [nasConnected, setNasConnected] = useState(true)
  const [totalSamplesIngested, setTotalSamplesIngested] = useState(0)
  const [recursiveLearning, setRecursiveLearning] = useState(false)

  // ── Visualization
  const [layers] = useState<LayerViz[]>(generateLayers)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [vizMode, setVizMode] = useState<"network" | "weights" | "activations" | "attention">("network")
  const [neuronActivity, setNeuronActivity] = useState<number[]>([])
  const [showFullscreen, setShowFullscreen] = useState(false)

  // ── Checkpoints
  const [checkpoints, setCheckpoints] = useState<{ id: string; epoch: number; loss: number; accuracy: number; timestamp: number; location: string }[]>([])

  // ── Active tab
  const [activeTab, setActiveTab] = useState("pipeline")

  // ── Simulate training ticks
  useEffect(() => {
    if (trainingStatus !== "training") return
    const interval = setInterval(() => {
      setMetrics(prev => {
        const newLoss = Math.max(0.01, prev.loss - (Math.random() * 0.015 + 0.002))
        const newAcc = Math.min(99.5, prev.accuracy + (Math.random() * 0.4 + 0.05))
        const newEpoch = prev.batchesCompleted > 0 && prev.batchesCompleted % 100 === 0 ? prev.epoch + 1 : prev.epoch
        return {
          ...prev,
          epoch: newEpoch,
          loss: newLoss,
          accuracy: newAcc,
          samplesProcessed: prev.samplesProcessed + batchSize,
          batchesCompleted: prev.batchesCompleted + 1,
          elapsedTime: prev.elapsedTime + 1,
          gradientNorm: Math.max(0.01, prev.gradientNorm * (0.99 + Math.random() * 0.02)),
          memoryUsage: Math.min(95, 40 + Math.random() * 20),
          learningRate: learningRate,
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [trainingStatus, batchSize, learningRate])

  // ── Track loss/acc history
  useEffect(() => {
    if (trainingStatus === "training" && metrics.batchesCompleted % 10 === 0 && metrics.batchesCompleted > 0) {
      setLossHistory(prev => [...prev.slice(-59), metrics.loss])
      setAccHistory(prev => [...prev.slice(-59), metrics.accuracy])
    }
  }, [metrics.batchesCompleted, trainingStatus, metrics.loss, metrics.accuracy])

  // ── Simulate device data ingestion
  useEffect(() => {
    if (trainingStatus !== "training") return
    const interval = setInterval(() => {
      const onlineDevices = devices.filter(d => d.status === "online")
      const ingestRate = onlineDevices.reduce((sum, d) => sum + d.dataRate, 0)
      setTotalSamplesIngested(prev => prev + ingestRate)
      setDevices(prev => prev.map(d => ({
        ...d,
        dataRate: d.status === "online" ? d.dataRate + Math.floor(Math.random() * 10 - 5) : 0,
        lastSeen: d.status === "online" ? Date.now() : d.lastSeen,
      })))
    }, 2000)
    return () => clearInterval(interval)
  }, [trainingStatus, devices])

  // ── Simulate neuron activity for visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setNeuronActivity(Array.from({ length: 64 }, () => Math.random()))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // ── Auto-mutation
  useEffect(() => {
    if (!autoMutate || trainingStatus !== "training" || !plasticityEnabled) return
    const interval = setInterval(() => {
      const recentLoss = lossHistory.slice(-5)
      if (recentLoss.length >= 5) {
        const plateau = Math.abs(recentLoss[0] - recentLoss[4]) < mutationThreshold
        if (plateau) {
          const types: MutationEvent["type"][] = ["prune", "grow", "rewire", "perturb"]
          const type = types[Math.floor(Math.random() * types.length)]
          const event: MutationEvent = {
            id: `mut-${Date.now()}`, timestamp: Date.now(), type, target: `Layer ${Math.floor(Math.random() * numLayers) + 1}`,
            magnitude: plasticityRate, impact: Math.random() * 0.5 - 0.1,
          }
          setMutationLog(prev => [event, ...prev.slice(0, 49)])
        }
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [autoMutate, trainingStatus, plasticityEnabled, lossHistory, mutationThreshold, plasticityRate, numLayers])

  const handleStartTraining = useCallback(() => setTrainingStatus("training"), [])
  const handlePauseTraining = useCallback(() => setTrainingStatus("paused"), [])
  const handleStopTraining = useCallback(() => setTrainingStatus("idle"), [])
  const handleResumeTraining = useCallback(() => setTrainingStatus("training"), [])

  const handleSaveCheckpoint = useCallback(() => {
    const cp = {
      id: `ckpt-${Date.now()}`, epoch: metrics.epoch, loss: metrics.loss, accuracy: metrics.accuracy,
      timestamp: Date.now(), location: mindexConnected ? "MINDEX + NAS" : "NAS only",
    }
    setCheckpoints(prev => [cp, ...prev.slice(0, 19)])
  }, [metrics, mindexConnected])

  const handleApplyMutation = useCallback(() => {
    if (mutationMode === "none") return
    const event: MutationEvent = {
      id: `mut-${Date.now()}`, timestamp: Date.now(), type: mutationMode,
      target: selectedLayer !== null ? layers[selectedLayer].name : "Global",
      magnitude: plasticityRate, impact: Math.random() * 0.3 - 0.05,
    }
    setMutationLog(prev => [event, ...prev.slice(0, 49)])
  }, [mutationMode, selectedLayer, layers, plasticityRate])

  const onlineCount = devices.filter(d => d.status === "online").length
  const totalDataRate = devices.filter(d => d.status === "online").reduce((s, d) => s + d.dataRate, 0)

  // ── Mini sparkline renderer
  const Sparkline = ({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) => {
    if (data.length < 2) return <div className="text-xs text-muted-foreground">Collecting data...</div>
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const w = 200
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ")
    return (
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              <h1 className="text-xl font-bold">NLM Training Tool</h1>
            </div>
            <Badge variant="outline" className={trainingStatus === "training" ? "bg-green-500/20 text-green-400 border-green-500/50 animate-pulse" : trainingStatus === "paused" ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "bg-muted text-muted-foreground"}>
              {trainingStatus === "training" ? "Training" : trainingStatus === "paused" ? "Paused" : trainingStatus === "evaluating" ? "Evaluating" : "Idle"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" /> {onlineCount}/{devices.length} Devices
            </Badge>
            {mindexConnected && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400"><Database className="h-3 w-3 mr-1" /> MINDEX</Badge>}
            {nasConnected && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400"><HardDrive className="h-3 w-3 mr-1" /> NAS</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {trainingStatus === "idle" && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleStartTraining}>
                <Play className="h-4 w-4 mr-1" /> Start Training
              </Button>
            )}
            {trainingStatus === "training" && (
              <>
                <Button size="sm" variant="outline" onClick={handlePauseTraining}><Pause className="h-4 w-4 mr-1" /> Pause</Button>
                <Button size="sm" variant="destructive" onClick={handleStopTraining}><Square className="h-4 w-4 mr-1" /> Stop</Button>
              </>
            )}
            {trainingStatus === "paused" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleResumeTraining}><Play className="h-4 w-4 mr-1" /> Resume</Button>
                <Button size="sm" variant="destructive" onClick={handleStopTraining}><Square className="h-4 w-4 mr-1" /> Stop</Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={handleSaveCheckpoint} disabled={trainingStatus === "idle"}>
              <Save className="h-4 w-4 mr-1" /> Checkpoint
            </Button>
            <Button size="sm" variant="outline" disabled={trainingStatus === "idle"}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Link href="/myca/nlm">
              <Button size="sm" variant="ghost" className="text-muted-foreground">NLM Docs <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Live Metrics Bar ─────────────────────────────────────────────── */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div><div className="text-xs text-muted-foreground">Epoch</div><div className="text-lg font-bold">{metrics.epoch}/{maxEpochs}</div></div>
            <div><div className="text-xs text-muted-foreground">Loss</div><div className="text-lg font-bold text-red-400">{metrics.loss.toFixed(4)}</div></div>
            <div><div className="text-xs text-muted-foreground">Accuracy</div><div className="text-lg font-bold text-green-400">{metrics.accuracy.toFixed(2)}%</div></div>
            <div><div className="text-xs text-muted-foreground">LR</div><div className="text-lg font-bold">{learningRate.toExponential(1)}</div></div>
            <div><div className="text-xs text-muted-foreground">Samples</div><div className="text-lg font-bold">{(metrics.samplesProcessed / 1000).toFixed(1)}K</div></div>
            <div><div className="text-xs text-muted-foreground">Grad Norm</div><div className="text-lg font-bold">{metrics.gradientNorm.toFixed(3)}</div></div>
            <div><div className="text-xs text-muted-foreground">VRAM</div><div className="text-lg font-bold">{metrics.memoryUsage.toFixed(0)}%</div></div>
            <div><div className="text-xs text-muted-foreground">Data Rate</div><div className="text-lg font-bold text-blue-400">{totalDataRate}/s</div></div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm"><Workflow className="h-3 w-3 mr-1 hidden sm:inline" />Pipeline</TabsTrigger>
            <TabsTrigger value="visualization" className="text-xs sm:text-sm"><Eye className="h-3 w-3 mr-1 hidden sm:inline" />Visualize</TabsTrigger>
            <TabsTrigger value="parameters" className="text-xs sm:text-sm"><SlidersHorizontal className="h-3 w-3 mr-1 hidden sm:inline" />Parameters</TabsTrigger>
            <TabsTrigger value="plasticity" className="text-xs sm:text-sm"><Dna className="h-3 w-3 mr-1 hidden sm:inline" />Plasticity</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />Metrics</TabsTrigger>
            <TabsTrigger value="checkpoints" className="text-xs sm:text-sm"><Save className="h-3 w-3 mr-1 hidden sm:inline" />Checkpoints</TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PIPELINE TAB                                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Device Fleet */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg"><Server className="h-5 w-5 text-blue-400" /> Device Fleet — Live Data Sources</CardTitle>
                  <CardDescription>Mycobrain devices + Nvidia Jetson edge nodes feeding training data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {devices.map(device => (
                    <div key={device.id} className={`flex items-center justify-between p-3 rounded-lg border ${device.status === "online" ? "border-green-500/30 bg-green-500/5" : device.status === "degraded" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-500 animate-pulse" : device.status === "degraded" ? "bg-amber-500" : "bg-red-500"}`} />
                        <div>
                          <div className="font-medium text-sm">{device.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4">{device.type}</Badge>
                            {device.metrics.temp && <span>{device.metrics.temp.toFixed(1)}°C</span>}
                            {device.metrics.humidity && <span>{device.metrics.humidity}% RH</span>}
                            {device.metrics.voltage && <span>{device.metrics.voltage.toFixed(2)}V</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono">{device.dataRate} smp/s</div>
                        <div className="text-xs text-muted-foreground">{device.status === "online" ? "streaming" : device.status}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pipeline Flow */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><Workflow className="h-5 w-5 text-purple-400" /> Data Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Mycobrain Devices", icon: CircleDot, color: "text-green-400", detail: `${onlineCount} online`, ok: onlineCount > 0 },
                      { label: "Jetson Edge NLM", icon: Cpu, color: "text-blue-400", detail: "Preprocessing", ok: devices.some(d => d.type === "jetson" && d.status === "online") },
                      { label: "MAS / HPL / MDP / MMP", icon: Network, color: "text-purple-400", detail: "Routing active", ok: true },
                      { label: "MINDEX", icon: Database, color: "text-green-400", detail: mindexConnected ? "Connected" : "Disconnected", ok: mindexConnected },
                      { label: "NLM GPU Training", icon: Zap, color: "text-amber-400", detail: trainingStatus === "training" ? "Running" : "Standby", ok: trainingStatus === "training" },
                      { label: "Weight Storage (NAS)", icon: HardDrive, color: "text-blue-400", detail: nasConnected ? "Synced" : "Disconnected", ok: nasConnected },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.ok ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          <step.icon className={`h-4 w-4 ${step.ok ? step.color : "text-red-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{step.label}</div>
                          <div className="text-xs text-muted-foreground">{step.detail}</div>
                        </div>
                        {step.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
                        {i < 5 && <div className="absolute -bottom-2 left-4 h-3 w-px bg-muted-foreground/20 hidden" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Ingestion Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Ingested</span><span className="font-mono">{(totalSamplesIngested / 1e6).toFixed(3)}M</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Live Rate</span><span className="font-mono">{totalDataRate} smp/s</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Recursive Learning</span>
                      <Switch checked={recursiveLearning} onCheckedChange={setRecursiveLearning} />
                    </div>
                    {recursiveLearning && (
                      <p className="text-xs text-amber-400 mt-1">Recursive mode: model outputs feed back as augmented training data for continuous self-improvement.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* VISUALIZATION TAB                                             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="visualization" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant={vizMode === "network" ? "default" : "outline"} onClick={() => setVizMode("network")}><Box className="h-3 w-3 mr-1" /> Network</Button>
              <Button size="sm" variant={vizMode === "weights" ? "default" : "outline"} onClick={() => setVizMode("weights")}><BarChart3 className="h-3 w-3 mr-1" /> Weights</Button>
              <Button size="sm" variant={vizMode === "activations" ? "default" : "outline"} onClick={() => setVizMode("activations")}><Activity className="h-3 w-3 mr-1" /> Activations</Button>
              <Button size="sm" variant={vizMode === "attention" ? "default" : "outline"} onClick={() => setVizMode("attention")}><Eye className="h-3 w-3 mr-1" /> Attention</Button>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setShowFullscreen(!showFullscreen)}>
                {showFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className={`grid gap-4 ${showFullscreen ? "" : "grid-cols-1 lg:grid-cols-3"}`}>
              {/* Neural Network Visualization */}
              <Card className={showFullscreen ? "" : "lg:col-span-2"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    Live Neural Network — {vizMode === "network" ? "Transformer Architecture" : vizMode === "weights" ? "Weight Distribution" : vizMode === "activations" ? "Activation Map" : "Attention Heads"}
                  </CardTitle>
                  <CardDescription>{layers.length} layers, {attentionHeads} attention heads, {hiddenDim} hidden dim</CardDescription>
                </CardHeader>
                <CardContent>
                  {vizMode === "network" && (
                    <FungaNetwork3D status={trainingStatus === "training" ? "live" : trainingStatus === "paused" ? "degraded" : "loading"} loss={metrics.loss} />
                  )}

                  {vizMode === "weights" && (
                    <div className="space-y-2">
                      {layers.map((layer, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-32 truncate text-muted-foreground">{layer.name}</span>
                          <div className="flex-1 h-4 bg-muted/30 rounded relative overflow-hidden">
                            <div className="absolute inset-y-0 bg-gradient-to-r from-blue-600 via-transparent to-red-600 opacity-40" style={{ left: `${((layer.weights.min + 1) / 2) * 100}%`, right: `${(1 - (layer.weights.max + 1) / 2) * 100}%` }} />
                            <div className="absolute inset-y-0 w-px bg-white/50" style={{ left: `${((layer.weights.mean + 1) / 2) * 100}%` }} />
                          </div>
                          <span className="w-20 text-right font-mono">&sigma;={layer.weights.std.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {vizMode === "activations" && (
                    <div className="grid grid-cols-8 gap-1">
                      {neuronActivity.map((v, i) => (
                        <div key={i} className="aspect-square rounded" style={{ backgroundColor: `rgba(168, 85, 247, ${v})` }} title={`Neuron ${i}: ${(v * 100).toFixed(0)}%`} />
                      ))}
                      <div className="col-span-8 text-xs text-muted-foreground mt-2 text-center">
                        Live neuron activation heatmap — 64 sample neurons across selected layer
                      </div>
                    </div>
                  )}

                  {vizMode === "attention" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Attention head activity across {attentionHeads} heads</p>
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: attentionHeads }, (_, h) => (
                          <Card key={h} className="p-3">
                            <div className="text-xs font-medium mb-1">Head {h + 1}</div>
                            <div className="grid grid-cols-4 gap-px">
                              {Array.from({ length: 16 }, (_, j) => {
                                const v = neuronActivity[(h * 16 + j) % neuronActivity.length] ?? 0.3
                                return <div key={j} className="aspect-square rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${v})` }} />
                              })}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Layer Detail Panel */}
              {!showFullscreen && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Layer Inspector</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedLayer !== null ? (
                        <div className="space-y-3">
                          <div className="font-medium">{layers[selectedLayer].name}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Type:</span> {layers[selectedLayer].type}</div>
                            <div><span className="text-muted-foreground">Neurons:</span> {layers[selectedLayer].neurons}</div>
                            <div><span className="text-muted-foreground">W min:</span> {layers[selectedLayer].weights.min.toFixed(3)}</div>
                            <div><span className="text-muted-foreground">W max:</span> {layers[selectedLayer].weights.max.toFixed(3)}</div>
                            <div><span className="text-muted-foreground">W mean:</span> {layers[selectedLayer].weights.mean.toFixed(4)}</div>
                            <div><span className="text-muted-foreground">W std:</span> {layers[selectedLayer].weights.std.toFixed(4)}</div>
                          </div>
                          <div className="pt-2 border-t space-y-2">
                            <p className="text-xs text-muted-foreground">Apply mutation to this layer:</p>
                            <div className="flex gap-1 flex-wrap">
                              {(["prune", "grow", "rewire", "perturb"] as const).map(m => (
                                <Button key={m} size="sm" variant="outline" className="text-xs h-7" onClick={() => { setMutationMode(m); handleApplyMutation() }}>
                                  {m}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click a layer in the network view to inspect it.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Training Curves</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Loss</div>
                        <Sparkline data={lossHistory} color="#f87171" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
                        <Sparkline data={accHistory} color="#4ade80" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PARAMETERS TAB                                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="parameters" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Training Hyperparameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Training Hyperparameters</CardTitle>
                  <CardDescription>Adjust live — changes apply at next batch</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Learning Rate</span><span className="font-mono text-sm">{learningRate.toExponential(1)}</span></Label>
                    <Slider min={-6} max={-1} step={0.1} value={[Math.log10(learningRate)]} onValueChange={([v]) => setLearningRate(Math.pow(10, v))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Batch Size</span><span className="font-mono text-sm">{batchSize}</span></Label>
                    <Slider min={1} max={256} step={1} value={[batchSize]} onValueChange={([v]) => setBatchSize(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Max Epochs</span><span className="font-mono text-sm">{maxEpochs}</span></Label>
                    <Slider min={1} max={1000} step={1} value={[maxEpochs]} onValueChange={([v]) => setMaxEpochs(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Warmup Steps</span><span className="font-mono text-sm">{warmupSteps}</span></Label>
                    <Slider min={0} max={10000} step={100} value={[warmupSteps]} onValueChange={([v]) => setWarmupSteps(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Weight Decay</span><span className="font-mono text-sm">{weightDecay}</span></Label>
                    <Slider min={0} max={0.1} step={0.001} value={[weightDecay]} onValueChange={([v]) => setWeightDecay(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Dropout</span><span className="font-mono text-sm">{dropoutRate}</span></Label>
                    <Slider min={0} max={0.5} step={0.01} value={[dropoutRate]} onValueChange={([v]) => setDropoutRate(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Gradient Clipping</span><span className="font-mono text-sm">{gradClip}</span></Label>
                    <Slider min={0.1} max={10} step={0.1} value={[gradClip]} onValueChange={([v]) => setGradClip(v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Optimizer</Label>
                      <Select value={optimizer} onValueChange={setOptimizer}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adamw">AdamW</SelectItem>
                          <SelectItem value="adam">Adam</SelectItem>
                          <SelectItem value="sgd">SGD</SelectItem>
                          <SelectItem value="lion">Lion</SelectItem>
                          <SelectItem value="sophia">Sophia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>LR Scheduler</Label>
                      <Select value={scheduler} onValueChange={setScheduler}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosine">Cosine Annealing</SelectItem>
                          <SelectItem value="linear">Linear Decay</SelectItem>
                          <SelectItem value="step">Step Decay</SelectItem>
                          <SelectItem value="plateau">Reduce on Plateau</SelectItem>
                          <SelectItem value="warmup_cosine">Warmup + Cosine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Architecture Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Architecture Parameters</CardTitle>
                  <CardDescription>Model structure — requires restart to apply</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Attention Heads</span><span className="font-mono text-sm">{attentionHeads}</span></Label>
                    <Slider min={1} max={32} step={1} value={[attentionHeads]} onValueChange={([v]) => setAttentionHeads(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Hidden Dimension</span><span className="font-mono text-sm">{hiddenDim}</span></Label>
                    <Slider min={64} max={4096} step={64} value={[hiddenDim]} onValueChange={([v]) => setHiddenDim(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Transformer Layers</span><span className="font-mono text-sm">{numLayers}</span></Label>
                    <Slider min={1} max={24} step={1} value={[numLayers]} onValueChange={([v]) => setNumLayers(v)} />
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                    <h4 className="font-medium text-sm">Model Summary</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Total Parameters:</span><span className="font-mono">{((hiddenDim * hiddenDim * 4 * numLayers + hiddenDim * 4096) / 1e6).toFixed(1)}M</span>
                      <span>Embedding Dim:</span><span className="font-mono">{hiddenDim}</span>
                      <span>FFN Dim:</span><span className="font-mono">{hiddenDim * 4}</span>
                      <span>Head Dim:</span><span className="font-mono">{Math.floor(hiddenDim / attentionHeads)}</span>
                      <span>Vocab Size:</span><span className="font-mono">4,096 bio-tokens</span>
                      <span>Context Length:</span><span className="font-mono">8,192 frames</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Network className="h-4 w-4 text-blue-400" /> Integration Stack</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { name: "MAS", desc: "Multi-Agent System orchestration" },
                        { name: "HPL", desc: "Hyphae Processing Language" },
                        { name: "MDP", desc: "Mycelium Data Protocol" },
                        { name: "MMP", desc: "Mycelium Messaging Protocol" },
                        { name: "MINDEX", desc: "Data provenance & indexing" },
                        { name: "FCI", desc: "Fungal Computer Interface" },
                      ].map(s => (
                        <div key={s.name} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          <span><strong>{s.name}</strong> — {s.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PLASTICITY TAB                                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="plasticity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Plasticity Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-purple-400" /> Neural Plasticity Engine</CardTitle>
                  <CardDescription>Live model mutation and evolutionary adaptation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Enable Plasticity</Label>
                    <Switch checked={plasticityEnabled} onCheckedChange={setPlasticityEnabled} />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Plasticity Rate</span><span className="font-mono text-sm">{plasticityRate.toFixed(3)}</span></Label>
                    <Slider min={0.001} max={0.2} step={0.001} value={[plasticityRate]} onValueChange={([v]) => setPlasticityRate(v)} disabled={!plasticityEnabled} />
                    <p className="text-xs text-muted-foreground">Controls the magnitude of structural changes applied during mutation events.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mutation Type</Label>
                    <Select value={mutationMode} onValueChange={(v) => setMutationMode(v as typeof mutationMode)} disabled={!plasticityEnabled}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Manual)</SelectItem>
                        <SelectItem value="prune">Prune — Remove low-impact connections</SelectItem>
                        <SelectItem value="grow">Grow — Add new neurons/connections</SelectItem>
                        <SelectItem value="rewire">Rewire — Reassign connection topology</SelectItem>
                        <SelectItem value="perturb">Perturb — Weight noise injection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" disabled={!plasticityEnabled || mutationMode === "none"} onClick={handleApplyMutation}>
                    <Shuffle className="h-4 w-4 mr-2" /> Apply Mutation Now
                  </Button>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Auto-Mutate on Plateau</Label>
                      <Switch checked={autoMutate} onCheckedChange={setAutoMutate} disabled={!plasticityEnabled} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex justify-between"><span>Plateau Threshold</span><span className="font-mono text-sm">{mutationThreshold}</span></Label>
                      <Slider min={0.001} max={0.1} step={0.001} value={[mutationThreshold]} onValueChange={([v]) => setMutationThreshold(v)} disabled={!autoMutate || !plasticityEnabled} />
                      <p className="text-xs text-muted-foreground">Triggers mutation when loss change over 5 epochs is below this threshold.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h4 className="font-medium text-sm mb-2">Model Evolution System</h4>
                    <p className="text-xs text-muted-foreground">
                      NLM&apos;s plasticity engine enables live structural evolution of the model during training. Unlike static architectures,
                      NLM can prune dead neurons, grow new pathways, rewire attention patterns, and inject controlled perturbations
                      to escape local minima — inspired by biological neural plasticity in mycelial networks.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Mutation Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-amber-400" /> Mutation Log</CardTitle>
                  <CardDescription>{mutationLog.length} events recorded</CardDescription>
                </CardHeader>
                <CardContent>
                  {mutationLog.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Dna className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No mutations applied yet.</p>
                      <p className="text-xs">Enable plasticity and apply mutations to see the evolution log.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {mutationLog.map(evt => (
                        <div key={evt.id} className="flex items-center gap-3 p-2 rounded border bg-muted/30">
                          <Badge variant="outline" className={`text-[10px] w-14 justify-center ${evt.type === "prune" ? "border-red-500/50 text-red-400" : evt.type === "grow" ? "border-green-500/50 text-green-400" : evt.type === "rewire" ? "border-blue-500/50 text-blue-400" : "border-amber-500/50 text-amber-400"}`}>
                            {evt.type}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{evt.target}</div>
                            <div className="text-[10px] text-muted-foreground">mag: {evt.magnitude.toFixed(3)}</div>
                          </div>
                          <div className={`text-xs font-mono ${evt.impact > 0 ? "text-green-400" : "text-red-400"}`}>
                            {evt.impact > 0 ? "+" : ""}{(evt.impact * 100).toFixed(2)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* METRICS TAB                                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Loss Curve</CardTitle></CardHeader>
                <CardContent>
                  <Sparkline data={lossHistory} color="#f87171" height={120} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Start: {lossHistory[0]?.toFixed(4) ?? "—"}</span>
                    <span>Current: {lossHistory[lossHistory.length - 1]?.toFixed(4) ?? "—"}</span>
                    <span>Min: {lossHistory.length ? Math.min(...lossHistory).toFixed(4) : "—"}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Accuracy Curve</CardTitle></CardHeader>
                <CardContent>
                  <Sparkline data={accHistory} color="#4ade80" height={120} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Start: {accHistory[0]?.toFixed(2) ?? "—"}%</span>
                    <span>Current: {accHistory[accHistory.length - 1]?.toFixed(2) ?? "—"}%</span>
                    <span>Max: {accHistory.length ? Math.max(...accHistory).toFixed(2) : "—"}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Training Progress</CardTitle></CardHeader>
                <CardContent>
                  <Progress value={(metrics.epoch / maxEpochs) * 100} className="h-3 mb-2" />
                  <div className="text-xs text-muted-foreground">Epoch {metrics.epoch} of {maxEpochs} ({((metrics.epoch / maxEpochs) * 100).toFixed(1)}%)</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gradient Health</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.gradientNorm.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.gradientNorm < 0.01 ? "Warning: Vanishing gradients" : metrics.gradientNorm > 5 ? "Warning: Exploding gradients" : "Healthy gradient flow"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Data Throughput</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totalSamplesIngested / 1e6).toFixed(3)}M</div>
                  <div className="text-xs text-muted-foreground">
                    Total samples processed from {onlineCount} devices at {totalDataRate} samples/sec
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Inference Test</CardTitle>
                <CardDescription>Feed a test signal and see model output in real time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="text-sm font-medium mb-2">Input Signal (Raw)</h4>
                    <div className="font-mono text-xs text-green-400 bg-background p-3 rounded overflow-x-auto">
                      {`[${Array.from({ length: 8 }, () => (Math.random() * 2 - 1).toFixed(3)).join(", ")}...]`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">8192-frame window from Mushroom 1 FCI electrode array</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="text-sm font-medium mb-2">Model Output (Inference)</h4>
                    <pre className="font-mono text-xs text-amber-400 bg-background p-3 rounded overflow-x-auto">
{`{
  "state": "nutrient_seeking",
  "confidence": ${(0.5 + Math.random() * 0.45).toFixed(3)},
  "bio_tokens": ["t17_burst", "co2_rise"],
  "predicted_next": "growth_shift",
  "uncertainty": ${(Math.random() * 0.3).toFixed(3)}
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CHECKPOINTS TAB                                               */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="checkpoints" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Saved Checkpoints</CardTitle>
                  <CardDescription>Model weights stored in MINDEX + local NAS</CardDescription>
                </CardHeader>
                <CardContent>
                  {checkpoints.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No checkpoints saved yet.</p>
                      <p className="text-xs mt-1">Start training and save checkpoints to manage model versions.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {checkpoints.map(cp => (
                        <div key={cp.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-xs font-bold">{cp.epoch}</div>
                            <div>
                              <div className="text-sm font-medium">Epoch {cp.epoch}</div>
                              <div className="text-xs text-muted-foreground">
                                Loss: {cp.loss.toFixed(4)} | Acc: {cp.accuracy.toFixed(2)}% | {cp.location}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(cp.timestamp).toLocaleString()}</span>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"><SkipForward className="h-3 w-3 mr-1" /> Load</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"><Download className="h-3 w-3 mr-1" /> Export</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-green-400" /> Storage Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>MINDEX</span>
                      <Badge variant={mindexConnected ? "default" : "destructive"} className="text-xs">{mindexConnected ? "Connected" : "Disconnected"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Local NAS</span>
                      <Badge variant={nasConnected ? "default" : "destructive"} className="text-xs">{nasConnected ? "Connected" : "Disconnected"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Checkpoints</span>
                      <span className="font-mono">{checkpoints.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto-Save</span>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Weight Versioning</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>All checkpoints are versioned in MINDEX with full provenance — device source, training config, mutation history, and dataset snapshot hash.</p>
                    <p>Weights are also synced to the local NAS for fast restore and offline training continuity.</p>
                    <p>Load any checkpoint to resume training from that point or compare model behavior across versions.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
