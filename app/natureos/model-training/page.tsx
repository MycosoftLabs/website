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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Brain, Activity, Zap, Database, Play, Pause, RefreshCw, Download, Network, Cpu, Layers,
  Target, ArrowRight, Sparkles, ChevronRight, GitBranch, Settings, Eye, BarChart3,
  Wifi, WifiOff, Server, HardDrive, Upload, CircleDot, Dna, Shuffle, TrendingUp,
  Save, RotateCcw, Square, SkipForward, AlertTriangle, CheckCircle2, Clock,
  Maximize2, Minimize2, SlidersHorizontal, Box, Workflow, Monitor, Loader2, XCircle
} from "lucide-react"
import Link from "next/link"
import FungaNetwork3D from "@/components/visualizers/FungaNetwork3D"
import { NlmDemo } from "./translator"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  training: {
    status: "idle" | "training" | "paused" | "evaluating"
    runId: string | null
    epoch: number
    totalEpochs: number
    loss: number | null
    accuracy: number | null
    learningRate: number | null
    samplesProcessed: number
    gradientNorm: number | null
    elapsedTime: number
    startedAt: string | null
    lossHistory: number[]
    accuracyHistory: number[]
  }
  model: {
    health: { status: string; model_loaded: boolean; model_name: string; model_version: string } | null
    info: any
    architecture: {
      baseModel: string | null
      hiddenSize: number | null
      numLayers: number | null
      numAttentionHeads: number | null
      vocabSize: number | null
      maxPositionEmbeddings: number | null
      useLora: boolean | null
      loraR: number | null
      loraAlpha: number | null
    } | null
    hyperparameters: any
  }
  gpu: {
    name: string
    memoryUsed: number
    memoryTotal: number
    memoryPercent: number
    utilization: number
    temperature: number
    powerDraw: number
  } | null
  gpuContainers: any[]
  devices: any[]
  deviceCount: number
  checkpoints: any[]
  dataStats: any
  connections: {
    mas: boolean
    mindex: boolean
    gpu: boolean
    mycobrain: boolean
  }
  timestamp: string
}

interface MutationEvent {
  id: string
  timestamp: number
  type: "prune" | "grow" | "rewire" | "perturb" | "merge"
  target: string
  magnitude: number
  impact: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModelTrainingToolPage() {
  // ── Dashboard state from real backend
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ── Hyperparameters (editable, sent to backend on start)
  const [learningRate, setLearningRate] = useState(2e-5)
  const [batchSize, setBatchSize] = useState(4)
  const [maxEpochs, setMaxEpochs] = useState(3)
  const [warmupSteps, setWarmupSteps] = useState(100)
  const [weightDecay, setWeightDecay] = useState(0.01)
  const [dropoutRate, setDropoutRate] = useState(0.05)
  const [optimizer, setOptimizer] = useState("adamw")
  const [scheduler, setScheduler] = useState("cosine")
  const [gradClip, setGradClip] = useState(1.0)

  // ── Plasticity / Mutation (sent to backend)
  const [plasticityEnabled, setPlasticityEnabled] = useState(false)
  const [plasticityRate, setPlasticityRate] = useState(0.05)
  const [mutationMode, setMutationMode] = useState<"none" | "prune" | "grow" | "rewire" | "perturb">("none")
  const [mutationLog, setMutationLog] = useState<MutationEvent[]>([])
  const [autoMutate, setAutoMutate] = useState(false)
  const [mutationThreshold, setMutationThreshold] = useState(0.01)

  // ── Visualization
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [vizMode, setVizMode] = useState<"network" | "weights" | "activations" | "attention">("network")
  const [showFullscreen, setShowFullscreen] = useState(false)

  // ── Inference test
  const [inferenceInput, setInferenceInput] = useState("")
  const [inferenceOutput, setInferenceOutput] = useState<any>(null)
  const [inferenceLoading, setInferenceLoading] = useState(false)

  // ── Active tab
  const [activeTab, setActiveTab] = useState("pipeline")

  // ── Fetch dashboard data from real backend
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/nlm-training")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: DashboardData = await res.json()
      setData(json)
      setError(null)

      // Sync hyperparameters from backend config on first load
      if (json.model.hyperparameters) {
        const hp = json.model.hyperparameters
        if (hp.learning_rate) setLearningRate(hp.learning_rate)
        if (hp.batch_size) setBatchSize(hp.batch_size)
        if (hp.epochs) setMaxEpochs(hp.epochs)
        if (hp.warmup_steps) setWarmupSteps(hp.warmup_steps)
        if (hp.weight_decay) setWeightDecay(hp.weight_decay)
        if (hp.lr_scheduler_type) setScheduler(hp.lr_scheduler_type)
        if (hp.max_grad_norm) setGradClip(hp.max_grad_norm)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling: 3s during training, 10s otherwise
  useEffect(() => {
    const interval = setInterval(
      fetchData,
      data?.training.status === "training" ? 3000 : 10000
    )
    return () => clearInterval(interval)
  }, [fetchData, data?.training.status])

  // ── Training control actions
  const sendAction = async (action: string, params: Record<string, any> = {}) => {
    setActionLoading(action)
    try {
      const res = await fetch("/api/natureos/nlm-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Action failed")
      } else {
        setError(null)
        // Refresh data after action
        await fetchData()
      }
      return json
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartTraining = () =>
    sendAction("start", {
      learningRate,
      batchSize,
      epochs: maxEpochs,
      warmupSteps,
      weightDecay,
      dropout: dropoutRate,
      optimizer,
      scheduler,
      gradClip,
    })

  const handlePauseTraining = () =>
    sendAction("pause", { runId: data?.training.runId })

  const handleStopTraining = () =>
    sendAction("stop", { runId: data?.training.runId })

  const handleResumeTraining = () =>
    sendAction("resume", { runId: data?.training.runId })

  const handleSaveCheckpoint = () =>
    sendAction("checkpoint", { runId: data?.training.runId })

  const handleExport = () =>
    sendAction("export", {
      runId: data?.training.runId,
      format: "gguf",
    })

  const handleApplyMutation = () => {
    if (mutationMode === "none" || !data?.training.runId) return
    sendAction("mutate", {
      runId: data.training.runId,
      mutationType: mutationMode,
      targetLayer: selectedLayer !== null ? `layer_${selectedLayer}` : null,
      magnitude: plasticityRate,
    })
  }

  const handleLoadCheckpoint = (checkpointId: string) =>
    sendAction("load_checkpoint", { checkpointId })

  const handleRunInference = async () => {
    if (!inferenceInput.trim()) return
    setInferenceLoading(true)
    setInferenceOutput(null)
    try {
      const res = await fetch("/api/natureos/nlm-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inference",
          text: inferenceInput,
          queryType: "general",
          maxTokens: 512,
          temperature: 0.7,
        }),
      })
      const json = await res.json()
      setInferenceOutput(json)
    } catch (e) {
      setInferenceOutput({ error: e instanceof Error ? e.message : "Inference failed" })
    } finally {
      setInferenceLoading(false)
    }
  }

  // ── Derived values
  const trainingStatus = data?.training.status || "idle"
  const onlineDevices = data?.devices.filter((d: any) => d.status === "online") || []
  const totalDevices = data?.deviceCount || 0
  const totalDataRate = onlineDevices.reduce((s: number, d: any) => s + (d.dataRate || d.data_rate || 0), 0)
  const connections = data?.connections || { mas: false, mindex: false, gpu: false, mycobrain: false }
  const lossHistory = data?.training.lossHistory || []
  const accHistory = data?.training.accuracyHistory || []
  const arch = data?.model.architecture
  const gpu = data?.gpu
  const checkpoints = data?.checkpoints || []

  // ── Mini sparkline renderer
  const Sparkline = ({ data: chartData, color, height = 40 }: { data: number[]; color: string; height?: number }) => {
    if (chartData.length < 2) return <div className="text-xs text-muted-foreground">Waiting for data...</div>
    const min = Math.min(...chartData)
    const max = Math.max(...chartData)
    const range = max - min || 1
    const w = 200
    const points = chartData.map((v, i) => `${(i / (chartData.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ")
    return (
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    )
  }

  // ── Connection status indicator
  const ConnectionBadge = ({ name, connected }: { name: string; connected: boolean }) => (
    <Badge variant="outline" className={`text-xs ${connected ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
      {connected ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {name}
    </Badge>
  )

  // ── Loading state
  if (loading && !data) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          <p className="text-muted-foreground">Connecting to NLM Training Infrastructure...</p>
          <div className="flex gap-2 justify-center">
            <Badge variant="outline" className="text-xs">MAS MAS_HOST</Badge>
            <Badge variant="outline" className="text-xs">GPU 192.168.0.190</Badge>
            <Badge variant="outline" className="text-xs">MINDEX MINDEX_HOST</Badge>
          </div>
        </div>
      </div>
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
            <Badge
              variant="outline"
              className={
                trainingStatus === "training"
                  ? "bg-green-500/20 text-green-400 border-green-500/50 animate-pulse"
                  : trainingStatus === "paused"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : trainingStatus === "evaluating"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                      : "bg-muted text-muted-foreground"
              }
            >
              {trainingStatus === "training" ? "Training" : trainingStatus === "paused" ? "Paused" : trainingStatus === "evaluating" ? "Evaluating" : "Idle"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" /> {onlineDevices.length}/{totalDevices} Devices
            </Badge>
            <ConnectionBadge name="MAS" connected={connections.mas} />
            <ConnectionBadge name="MINDEX" connected={connections.mindex} />
            <ConnectionBadge name="GPU" connected={connections.gpu} />
          </div>
          <div className="flex items-center gap-2">
            {trainingStatus === "idle" && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleStartTraining} disabled={actionLoading === "start"}>
                {actionLoading === "start" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} Start Training
              </Button>
            )}
            {trainingStatus === "training" && (
              <>
                <Button size="sm" variant="outline" onClick={handlePauseTraining} disabled={!!actionLoading}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
                <Button size="sm" variant="destructive" onClick={handleStopTraining} disabled={!!actionLoading}>
                  <Square className="h-4 w-4 mr-1" /> Stop
                </Button>
              </>
            )}
            {trainingStatus === "paused" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleResumeTraining} disabled={!!actionLoading}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
                <Button size="sm" variant="destructive" onClick={handleStopTraining} disabled={!!actionLoading}>
                  <Square className="h-4 w-4 mr-1" /> Stop
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={handleSaveCheckpoint} disabled={trainingStatus === "idle" || !!actionLoading}>
              <Save className="h-4 w-4 mr-1" /> Checkpoint
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={trainingStatus === "idle" || !!actionLoading}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button size="sm" variant="ghost" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/myca/nlm">
              <Button size="sm" variant="ghost" className="text-muted-foreground">NLM Docs <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* ── Live Metrics Bar ─────────────────────────────────────────────── */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Epoch</div>
              <div className="text-lg font-bold">{data?.training.epoch ?? 0}/{data?.training.totalEpochs || maxEpochs}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Loss</div>
              <div className="text-lg font-bold text-red-400">{data?.training.loss != null ? data.training.loss.toFixed(4) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <div className="text-lg font-bold text-green-400">{data?.training.accuracy != null ? `${data.training.accuracy.toFixed(2)}%` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LR</div>
              <div className="text-lg font-bold">{data?.training.learningRate != null ? data.training.learningRate.toExponential(1) : learningRate.toExponential(1)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Samples</div>
              <div className="text-lg font-bold">{data?.training.samplesProcessed ? `${(data.training.samplesProcessed / 1000).toFixed(1)}K` : "0"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Grad Norm</div>
              <div className="text-lg font-bold">{data?.training.gradientNorm != null ? data.training.gradientNorm.toFixed(3) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">GPU VRAM</div>
              <div className="text-lg font-bold">{gpu ? `${gpu.memoryPercent.toFixed(0)}%` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">GPU Temp</div>
              <div className="text-lg font-bold text-blue-400">{gpu ? `${gpu.temperature}°C` : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 mb-4">
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm"><Workflow className="h-3 w-3 mr-1 hidden sm:inline" />Pipeline</TabsTrigger>
            <TabsTrigger value="visualization" className="text-xs sm:text-sm"><Eye className="h-3 w-3 mr-1 hidden sm:inline" />Visualize</TabsTrigger>
            <TabsTrigger value="parameters" className="text-xs sm:text-sm"><SlidersHorizontal className="h-3 w-3 mr-1 hidden sm:inline" />Parameters</TabsTrigger>
            <TabsTrigger value="plasticity" className="text-xs sm:text-sm"><Dna className="h-3 w-3 mr-1 hidden sm:inline" />Plasticity</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />Metrics</TabsTrigger>
            <TabsTrigger value="checkpoints" className="text-xs sm:text-sm"><Save className="h-3 w-3 mr-1 hidden sm:inline" />Checkpoints</TabsTrigger>
            <TabsTrigger value="inference" className="text-xs sm:text-sm"><Brain className="h-3 w-3 mr-1 hidden sm:inline" />Inference</TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PIPELINE TAB                                                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Device Fleet — Real data from MAS Device Registry + MycoBrain */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg"><Server className="h-5 w-5 text-blue-400" /> Device Fleet — Live Data Sources</CardTitle>
                  <CardDescription>MycoBrain devices + Jetson edge nodes from MAS Device Registry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.devices && data.devices.length > 0 ? (
                    data.devices.map((device: any) => (
                      <div key={device.device_id || device.id} className={`flex items-center justify-between p-3 rounded-lg border ${device.status === "online" ? "border-green-500/30 bg-green-500/5" : device.status === "degraded" || device.status === "stale" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-500 animate-pulse" : device.status === "degraded" || device.status === "stale" ? "bg-amber-500" : "bg-red-500"}`} />
                          <div>
                            <div className="font-medium text-sm">{device.display_name || device.device_name || device.name || device.device_id}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] h-4">{device.device_role || device.type || device.board_type}</Badge>
                              {device.firmware_version && <span>v{device.firmware_version}</span>}
                              {device.host && <span>{device.host}</span>}
                              {device.sensors?.length > 0 && <span>{device.sensors.length} sensors</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono">{device.connection_type || device.source}</div>
                          <div className="text-xs text-muted-foreground">{device.status}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No devices detected.</p>
                      <p className="text-xs mt-1">Ensure MAS Device Registry and MycoBrain service are running.</p>
                      {!connections.mas && <p className="text-xs text-red-400 mt-2">MAS connection unavailable (MAS_HOST:8001)</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pipeline Flow + GPU Status */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><Workflow className="h-5 w-5 text-purple-400" /> System Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "MAS Orchestrator", icon: Network, color: "text-purple-400", detail: connections.mas ? "Connected (188:8001)" : "Disconnected", ok: connections.mas },
                      { label: "MycoBrain Devices", icon: CircleDot, color: "text-green-400", detail: `${onlineDevices.length} online`, ok: connections.mycobrain },
                      { label: "MINDEX Database", icon: Database, color: "text-green-400", detail: connections.mindex ? "Connected (189:8000)" : "Disconnected", ok: connections.mindex },
                      { label: "GPU Node (190)", icon: Cpu, color: "text-amber-400", detail: gpu ? `${gpu.name} — ${gpu.utilization}% util` : "Disconnected", ok: connections.gpu },
                      { label: "NLM Model", icon: Brain, color: "text-purple-400", detail: data?.model.health?.model_loaded ? `Loaded (${data.model.health.model_version})` : "Not loaded", ok: data?.model.health?.model_loaded ?? false },
                      { label: "Training Engine", icon: Zap, color: "text-amber-400", detail: trainingStatus === "training" ? `Running (epoch ${data?.training.epoch})` : trainingStatus === "paused" ? "Paused" : "Standby", ok: trainingStatus === "training" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.ok ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          <step.icon className={`h-4 w-4 ${step.ok ? step.color : "text-red-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{step.label}</div>
                          <div className="text-xs text-muted-foreground">{step.detail}</div>
                        </div>
                        {step.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* GPU Metrics Card */}
                {gpu && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4 text-amber-400" /> GPU — {gpu.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">VRAM</span><span className="font-mono">{gpu.memoryUsed}MB / {gpu.memoryTotal}MB ({gpu.memoryPercent.toFixed(0)}%)</span></div>
                      <Progress value={gpu.memoryPercent} className="h-2" />
                      <div className="flex justify-between"><span className="text-muted-foreground">Utilization</span><span className="font-mono">{gpu.utilization}%</span></div>
                      <Progress value={gpu.utilization} className="h-2" />
                      <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span className="font-mono">{gpu.temperature}°C</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Power</span><span className="font-mono">{gpu.powerDraw}W</span></div>
                    </CardContent>
                  </Card>
                )}

                {/* Data Stats from MINDEX */}
                {data?.dataStats && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">MINDEX Data Stats</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {Object.entries(data.dataStats).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono">{typeof val === "number" ? val.toLocaleString() : String(val)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* VISUALIZATION TAB                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
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
                  <CardDescription>
                    {arch ? `${arch.numLayers || "?"} layers, ${arch.numAttentionHeads || "?"} attention heads, ${arch.hiddenSize || "?"} hidden dim` : "Connect to MAS to load model architecture"}
                    {arch?.baseModel && ` — Base: ${arch.baseModel}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vizMode === "network" && (
                    <FungaNetwork3D status={trainingStatus === "training" ? "live" : trainingStatus === "paused" ? "degraded" : "loading"} loss={data?.training.loss ?? 2.5} />
                  )}

                  {vizMode === "weights" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Weight visualization requires an active training run.</p>
                      <p className="text-xs mt-1">Start training to view real-time weight distributions from the GPU node.</p>
                    </div>
                  )}

                  {vizMode === "activations" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Activation maps are streamed from the GPU during training.</p>
                      <p className="text-xs mt-1">Start training to see live neuron activation heatmaps.</p>
                    </div>
                  )}

                  {vizMode === "attention" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Attention head visualization requires an active model.</p>
                      <p className="text-xs mt-1">Load the NLM model or start training to see attention patterns.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Training Curves */}
              {!showFullscreen && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Model Architecture</CardTitle></CardHeader>
                    <CardContent>
                      {arch ? (
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Base Model:</span></div>
                            <div className="font-mono truncate">{arch.baseModel}</div>
                            <div><span className="text-muted-foreground">Hidden Size:</span></div>
                            <div className="font-mono">{arch.hiddenSize}</div>
                            <div><span className="text-muted-foreground">Layers:</span></div>
                            <div className="font-mono">{arch.numLayers}</div>
                            <div><span className="text-muted-foreground">Attn Heads:</span></div>
                            <div className="font-mono">{arch.numAttentionHeads}</div>
                            <div><span className="text-muted-foreground">Vocab Size:</span></div>
                            <div className="font-mono">{arch.vocabSize?.toLocaleString()}</div>
                            <div><span className="text-muted-foreground">Max Position:</span></div>
                            <div className="font-mono">{arch.maxPositionEmbeddings?.toLocaleString()}</div>
                            {arch.useLora && (
                              <>
                                <div><span className="text-muted-foreground">LoRA r:</span></div>
                                <div className="font-mono">{arch.loraR}</div>
                                <div><span className="text-muted-foreground">LoRA alpha:</span></div>
                                <div className="font-mono">{arch.loraAlpha}</div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Connect to MAS to load model architecture.</p>
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PARAMETERS TAB                                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="parameters" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Training Hyperparameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Training Hyperparameters</CardTitle>
                  <CardDescription>Configure before starting training — sent to GPU node on start</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Learning Rate</span><span className="font-mono text-sm">{learningRate.toExponential(1)}</span></Label>
                    <Slider min={-6} max={-1} step={0.1} value={[Math.log10(learningRate)]} onValueChange={([v]) => setLearningRate(Math.pow(10, v))} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Batch Size</span><span className="font-mono text-sm">{batchSize}</span></Label>
                    <Slider min={1} max={64} step={1} value={[batchSize]} onValueChange={([v]) => setBatchSize(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Max Epochs</span><span className="font-mono text-sm">{maxEpochs}</span></Label>
                    <Slider min={1} max={100} step={1} value={[maxEpochs]} onValueChange={([v]) => setMaxEpochs(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Warmup Steps</span><span className="font-mono text-sm">{warmupSteps}</span></Label>
                    <Slider min={0} max={5000} step={50} value={[warmupSteps]} onValueChange={([v]) => setWarmupSteps(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Weight Decay</span><span className="font-mono text-sm">{weightDecay}</span></Label>
                    <Slider min={0} max={0.1} step={0.001} value={[weightDecay]} onValueChange={([v]) => setWeightDecay(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>LoRA Dropout</span><span className="font-mono text-sm">{dropoutRate}</span></Label>
                    <Slider min={0} max={0.5} step={0.01} value={[dropoutRate]} onValueChange={([v]) => setDropoutRate(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Gradient Clipping</span><span className="font-mono text-sm">{gradClip}</span></Label>
                    <Slider min={0.1} max={10} step={0.1} value={[gradClip]} onValueChange={([v]) => setGradClip(v)} disabled={trainingStatus === "training"} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Optimizer</Label>
                      <Select value={optimizer} onValueChange={setOptimizer} disabled={trainingStatus === "training"}>
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
                      <Select value={scheduler} onValueChange={setScheduler} disabled={trainingStatus === "training"}>
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

              {/* Architecture (read from backend) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Model Architecture</CardTitle>
                  <CardDescription>Read from NLM config on MAS — architecture changes require backend update</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {arch ? (
                    <>
                      <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                        <h4 className="font-medium text-sm">NLM Configuration (from MAS)</h4>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>Base Model:</span><span className="font-mono">{arch.baseModel}</span>
                          <span>Hidden Size:</span><span className="font-mono">{arch.hiddenSize}</span>
                          <span>Layers:</span><span className="font-mono">{arch.numLayers}</span>
                          <span>Attention Heads:</span><span className="font-mono">{arch.numAttentionHeads}</span>
                          <span>Head Dim:</span><span className="font-mono">{arch.hiddenSize && arch.numAttentionHeads ? Math.floor(arch.hiddenSize / arch.numAttentionHeads) : "—"}</span>
                          <span>Vocab Size:</span><span className="font-mono">{arch.vocabSize?.toLocaleString()}</span>
                          <span>Context Length:</span><span className="font-mono">{arch.maxPositionEmbeddings?.toLocaleString()} tokens</span>
                          <span>Fine-Tuning:</span><span className="font-mono">{arch.useLora ? `LoRA (r=${arch.loraR}, α=${arch.loraAlpha})` : "Full"}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Network className="h-4 w-4 text-blue-400" /> Integration Stack</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            { name: "MAS", desc: "Multi-Agent System orchestration", ok: connections.mas },
                            { name: "MINDEX", desc: "Data provenance & indexing", ok: connections.mindex },
                            { name: "GPU Node", desc: "192.168.0.190 — training compute", ok: connections.gpu },
                            { name: "MycoBrain", desc: "IoT device telemetry", ok: connections.mycobrain },
                            { name: "NLM API", desc: "Prediction & inference", ok: data?.model.health !== null },
                            { name: "Qdrant", desc: "Vector embeddings (189:6333)", ok: connections.mindex },
                          ].map(s => (
                            <div key={s.name} className="flex items-center gap-2">
                              {s.ok ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                              <span><strong>{s.name}</strong> — {s.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Architecture config unavailable.</p>
                      <p className="text-xs mt-1">Connect to MAS to load the NLM model configuration.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PLASTICITY TAB                                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="plasticity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-purple-400" /> Neural Plasticity Engine</CardTitle>
                  <CardDescription>Live model mutation — commands sent to GPU training node</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Enable Plasticity</Label>
                    <Switch checked={plasticityEnabled} onCheckedChange={setPlasticityEnabled} />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex justify-between"><span>Plasticity Rate</span><span className="font-mono text-sm">{plasticityRate.toFixed(3)}</span></Label>
                    <Slider min={0.001} max={0.2} step={0.001} value={[plasticityRate]} onValueChange={([v]) => setPlasticityRate(v)} disabled={!plasticityEnabled} />
                    <p className="text-xs text-muted-foreground">Controls the magnitude of structural changes sent to the training node.</p>
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

                  <Button className="w-full" disabled={!plasticityEnabled || mutationMode === "none" || trainingStatus !== "training" || !!actionLoading} onClick={handleApplyMutation}>
                    {actionLoading === "mutate" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shuffle className="h-4 w-4 mr-2" />}
                    Apply Mutation Now
                  </Button>

                  {trainingStatus !== "training" && plasticityEnabled && (
                    <p className="text-xs text-amber-400">Training must be active to apply mutations.</p>
                  )}

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h4 className="font-medium text-sm mb-2">Model Evolution System</h4>
                    <p className="text-xs text-muted-foreground">
                      NLM&apos;s plasticity engine enables live structural evolution during training.
                      Mutation commands are sent to the GPU training node which applies them to the active model.
                      Prune dead neurons, grow new pathways, rewire attention patterns, and inject controlled perturbations
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
                      <p className="text-xs">Enable plasticity, start training, and apply mutations to see the evolution log.</p>
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* METRICS TAB                                                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
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
                  <Progress value={data?.training.totalEpochs ? (data.training.epoch / data.training.totalEpochs) * 100 : 0} className="h-3 mb-2" />
                  <div className="text-xs text-muted-foreground">Epoch {data?.training.epoch ?? 0} of {data?.training.totalEpochs || maxEpochs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gradient Health</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.training.gradientNorm != null ? data.training.gradientNorm.toFixed(4) : "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {data?.training.gradientNorm != null
                      ? data.training.gradientNorm < 0.01
                        ? "Warning: Vanishing gradients"
                        : data.training.gradientNorm > 5
                          ? "Warning: Exploding gradients"
                          : "Healthy gradient flow"
                      : "Start training to monitor gradient health"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">GPU Utilization</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{gpu ? `${gpu.utilization}%` : "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {gpu ? `${gpu.name} — ${gpu.memoryUsed}MB/${gpu.memoryTotal}MB VRAM` : "GPU node not connected (192.168.0.190)"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CHECKPOINTS TAB                                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="checkpoints" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Saved Checkpoints</CardTitle>
                  <CardDescription>Model weights stored via MAS on MINDEX + NAS</CardDescription>
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
                      {checkpoints.map((cp: any) => (
                        <div key={cp.id || cp.checkpoint_id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-xs font-bold">{cp.epoch}</div>
                            <div>
                              <div className="text-sm font-medium">Epoch {cp.epoch}{cp.label ? ` — ${cp.label}` : ""}</div>
                              <div className="text-xs text-muted-foreground">
                                Loss: {cp.loss?.toFixed(4) ?? "—"} | Acc: {cp.accuracy?.toFixed(2) ?? "—"}% | {cp.location || cp.storage || "MAS"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{cp.created_at ? new Date(cp.created_at).toLocaleString() : ""}</span>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleLoadCheckpoint(cp.id || cp.checkpoint_id)} disabled={!!actionLoading}>
                              <SkipForward className="h-3 w-3 mr-1" /> Load
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => sendAction("export", { checkpointId: cp.id || cp.checkpoint_id })} disabled={!!actionLoading}>
                              <Download className="h-3 w-3 mr-1" /> Export
                            </Button>
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
                      <span>MINDEX (189:8000)</span>
                      <Badge variant={connections.mindex ? "default" : "destructive"} className="text-xs">{connections.mindex ? "Connected" : "Disconnected"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>GPU Node (190)</span>
                      <Badge variant={connections.gpu ? "default" : "destructive"} className="text-xs">{connections.gpu ? "Connected" : "Disconnected"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>MAS (188:8001)</span>
                      <Badge variant={connections.mas ? "default" : "destructive"} className="text-xs">{connections.mas ? "Connected" : "Disconnected"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Checkpoints</span>
                      <span className="font-mono">{checkpoints.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Weight Versioning</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>All checkpoints are versioned via MAS with full provenance — device source, training config, mutation history, and dataset snapshot hash.</p>
                    <p>Weights are stored on MINDEX (Postgres + Qdrant) and synced to NAS for fast restore and offline training continuity.</p>
                    <p>Load any checkpoint to resume training from that point or compare model behavior across versions.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* INFERENCE TAB                                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="inference" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-400" /> NLM Inference Test</CardTitle>
                <CardDescription>Send a query to the live NLM model via MAS and see the real response</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Input Query</Label>
                    <Textarea
                      value={inferenceInput}
                      onChange={(e) => setInferenceInput(e.target.value)}
                      placeholder="e.g., What are the key characteristics of Ganoderma lucidum?"
                      className="min-h-[200px] font-mono text-xs"
                    />
                    <Button onClick={handleRunInference} disabled={inferenceLoading || !inferenceInput.trim()}>
                      {inferenceLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                      Run Inference
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Model Response</Label>
                    <Card className="min-h-[200px] p-3">
                      {inferenceOutput ? (
                        inferenceOutput.error ? (
                          <div className="text-sm text-red-400">
                            <p className="font-medium">Error:</p>
                            <pre className="whitespace-pre-wrap break-words text-xs mt-1">{inferenceOutput.error}</pre>
                            {inferenceOutput.detail && <pre className="whitespace-pre-wrap break-words text-xs mt-1 text-muted-foreground">{inferenceOutput.detail}</pre>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <pre className="whitespace-pre-wrap break-words text-xs">{inferenceOutput.text}</pre>
                            <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                              {inferenceOutput.model && <div>Model: {inferenceOutput.model}</div>}
                              {inferenceOutput.confidence != null && <div>Confidence: {(inferenceOutput.confidence * 100).toFixed(1)}%</div>}
                              {inferenceOutput.tokens_used != null && <div>Tokens: {inferenceOutput.tokens_used}</div>}
                              {inferenceOutput.latency_ms != null && <div>Latency: {inferenceOutput.latency_ms.toFixed(0)}ms</div>}
                            </div>
                            {inferenceOutput.sources?.length > 0 && (
                              <div className="border-t pt-2 text-xs">
                                <span className="text-muted-foreground">Sources: </span>
                                {inferenceOutput.sources.join(", ")}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground">Enter a query and run inference to see the NLM model response.</p>
                      )}
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NLM Mycospeak Translator (existing component) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-green-400" /> Mycospeak Signal Interpreter</CardTitle>
                <CardDescription>Feed bioelectric signal data and get NLM interpretation</CardDescription>
              </CardHeader>
              <CardContent>
                <NlmDemo />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
