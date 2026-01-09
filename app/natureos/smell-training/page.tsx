"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Wind,
  Beaker,
  Upload,
  Play,
  Square,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Usb,
  Clock,
  Activity,
  Thermometer,
  Droplets,
  ArrowLeft,
  FileJson,
  Archive,
  Trash2,
  Settings,
  History,
  BookOpen,
  Loader2,
} from "lucide-react"

// API base URL for smell trainer agent
const TRAINER_API = process.env.NEXT_PUBLIC_SMELL_TRAINER_URL || "http://localhost:8042"

interface Port {
  device: string
  description: string
  hwid: string
}

interface Session {
  session_id: string
  port: string
  created_at: string
  created_by?: string
  specimens: any[]
  total_samples: number
  status: string
}

interface RecordingStatus {
  state: string
  current_label?: string
  started_at?: string
  elapsed_sec: number
  sample_count: number
  last_error?: string
}

interface QAStatus {
  sensors_online: boolean
  sensor_count: number
  required_sensor_count: number
  minimum_samples: number
  current_samples: number
  can_export: boolean
  issues: string[]
}

interface Blob {
  id: string
  name: string
  blob_hash: string
  status: string
  class_labels: string[]
  training_method: string
  created_at: string
  created_by?: string
}

export default function SmellTrainingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get("tab") || "wizard"

  const [activeTab, setActiveTab] = useState(initialTab)
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null)

  // Wizard State
  const [ports, setPorts] = useState<Port[]>([])
  const [selectedPort, setSelectedPort] = useState<string>("")
  const [session, setSession] = useState<Session | null>(null)
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus | null>(null)
  const [qaStatus, setQaStatus] = useState<QAStatus | null>(null)
  const [latestReading, setLatestReading] = useState<any>(null)

  // Recording Form
  const [recordLabel, setRecordLabel] = useState("")
  const [recordDuration, setRecordDuration] = useState(60)
  const [recordDescription, setRecordDescription] = useState("")

  // Blobs
  const [blobs, setBlobs] = useState<Blob[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState("")
  const [uploadClasses, setUploadClasses] = useState("")
  const [uploading, setUploading] = useState(false)

  // Sessions History
  const [sessions, setSessions] = useState<Session[]>([])

  // Loading states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Check agent health
  const checkAgentHealth = useCallback(async () => {
    try {
      const res = await fetch(`${TRAINER_API}/health`, { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      setAgentOnline(data.ok === true)
      return data.ok === true
    } catch {
      setAgentOnline(false)
      return false
    }
  }, [])

  // Fetch ports
  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch(`${TRAINER_API}/ports`)
      const data = await res.json()
      setPorts(data || [])
    } catch {
      setPorts([])
    }
  }, [])

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${TRAINER_API}/sessions`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      setSessions([])
    }
  }, [])

  // Fetch blobs
  const fetchBlobs = useCallback(async () => {
    try {
      const res = await fetch(`${TRAINER_API}/mindex/blobs`)
      const data = await res.json()
      setBlobs(data.blobs || [])
    } catch {
      setBlobs([])
    }
  }, [])

  // Create session
  const createSession = async () => {
    if (!selectedPort) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${TRAINER_API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: selectedPort }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to create session")
      setSession({
        session_id: data.session_id,
        port: selectedPort,
        created_at: new Date().toISOString(),
        specimens: [],
        total_samples: 0,
        status: "active",
      })
      startPolling(data.session_id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!session || !recordLabel) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${TRAINER_API}/sessions/${session.session_id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: recordLabel,
          duration_sec: recordDuration,
          interval_sec: 1.0,
          description: recordDescription,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Failed to start recording")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (!session) return
    try {
      await fetch(`${TRAINER_API}/sessions/${session.session_id}/stop`, { method: "POST" })
    } catch (e) {
      console.error(e)
    }
  }

  // Start polling for session status
  const startPolling = (sessionId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        // Fetch recording status
        const statusRes = await fetch(`${TRAINER_API}/sessions/${sessionId}/status`)
        const status = await statusRes.json()
        setRecordingStatus(status)

        // Fetch QA status
        const qaRes = await fetch(`${TRAINER_API}/sessions/${sessionId}/qa`)
        const qa = await qaRes.json()
        setQaStatus(qa)

        // Fetch latest reading
        const latestRes = await fetch(`${TRAINER_API}/sessions/${sessionId}/latest`)
        const latest = await latestRes.json()
        setLatestReading(latest)

        // Fetch session details for specimen count
        const sessRes = await fetch(`${TRAINER_API}/sessions/${sessionId}`)
        const sessData = await sessRes.json()
        if (sessData.ok && sessData.session) {
          setSession((prev) => prev ? { ...prev, ...sessData.session } : prev)
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 2000)
  }

  // Stop polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // Export CSV
  const exportCSV = () => {
    if (!session) return
    window.open(`${TRAINER_API}/sessions/${session.session_id}/export.csv`, "_blank")
  }

  // Export ZIP
  const exportZIP = () => {
    if (!session) return
    window.open(`${TRAINER_API}/sessions/${session.session_id}/export.zip`, "_blank")
  }

  // Upload blob
  const uploadBlob = async () => {
    if (!uploadFile || !uploadName || !uploadClasses) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("name", uploadName)
      formData.append("classes", uploadClasses)
      formData.append("version", "1.0.0")
      formData.append("training_method", "ai_studio")

      const res = await fetch(`${TRAINER_API}/mindex/blobs`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Upload failed")
      }
      await fetchBlobs()
      setUploadFile(null)
      setUploadName("")
      setUploadClasses("")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  // Set blob status
  const setBlobStatus = async (blobId: string, status: string) => {
    try {
      const formData = new FormData()
      formData.append("status", status)
      await fetch(`${TRAINER_API}/mindex/blobs/${blobId}/status`, {
        method: "POST",
        body: formData,
      })
      await fetchBlobs()
    } catch (e) {
      console.error(e)
    }
  }

  // Initial load
  useEffect(() => {
    checkAgentHealth().then((online) => {
      if (online) {
        fetchPorts()
        fetchSessions()
        fetchBlobs()
      }
    })
    return () => stopPolling()
  }, [checkAgentHealth, fetchPorts, fetchSessions, fetchBlobs])

  // Common specimen labels
  const specimenLabels = [
    "clean_air_baseline",
    "pleurotus_ostreatus",
    "lentinula_edodes",
    "agaricus_bisporus",
    "ganoderma_lucidum",
    "hericium_erinaceus",
    "contamination_trichoderma",
    "substrate_decomposition",
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/natureos/model-training">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Model Training
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wind className="h-6 w-6 text-green-500" />
              Smell Training
            </h1>
            <p className="text-sm text-muted-foreground">
              BME688/690 gas sensor training for MINDEX fungal smell detection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agentOnline ? "default" : "destructive"} className="gap-1">
            {agentOnline ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Agent Online
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Agent Offline
              </>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => checkAgentHealth()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Agent Offline Warning */}
      {agentOnline === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Smell Trainer Agent Offline</AlertTitle>
          <AlertDescription>
            The smell trainer agent is not running. Start it with:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              python -m smell_trainer_agent.app
            </code>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wizard" className="gap-2">
            <Beaker className="h-4 w-4" />
            Training Wizard
          </TabsTrigger>
          <TabsTrigger value="blobs" className="gap-2">
            <Upload className="h-4 w-4" />
            Blob Manager
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Session History
          </TabsTrigger>
        </TabsList>

        {/* Training Wizard Tab */}
        <TabsContent value="wizard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Setup */}
            <div className="space-y-4">
              {/* Port Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Usb className="h-4 w-4" />
                    Device Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {ports.map((port) => (
                      <Button
                        key={port.device}
                        variant={selectedPort === port.device ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPort(port.device)}
                        disabled={!!session}
                      >
                        {port.device}
                      </Button>
                    ))}
                  </div>
                  {ports.length === 0 && (
                    <p className="text-sm text-muted-foreground">No ports found</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPorts}
                    className="w-full"
                    disabled={!agentOnline}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Ports
                  </Button>
                </CardContent>
              </Card>

              {/* Session Control */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!session ? (
                    <Button
                      onClick={createSession}
                      disabled={!selectedPort || loading || !agentOnline}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Start Session
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Session ID</span>
                        <span className="font-mono text-xs">{session.session_id.slice(0, 20)}...</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Port</span>
                        <span>{session.port}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Samples</span>
                        <span>{session.total_samples}</span>
                      </div>
                      <Separator />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          stopPolling()
                          setSession(null)
                          setRecordingStatus(null)
                          setQaStatus(null)
                          setLatestReading(null)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QA Status */}
              {qaStatus && (
                <Card className={qaStatus.can_export ? "border-green-500/50" : "border-yellow-500/50"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {qaStatus.can_export ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      QA Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Sensors Online</span>
                      <Badge variant={qaStatus.sensors_online ? "default" : "destructive"}>
                        {qaStatus.sensor_count}/{qaStatus.required_sensor_count}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Samples</span>
                      <Badge variant={qaStatus.current_samples >= qaStatus.minimum_samples ? "default" : "secondary"}>
                        {qaStatus.current_samples}/{qaStatus.minimum_samples}
                      </Badge>
                    </div>
                    {qaStatus.issues.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-yellow-500/10 text-xs text-yellow-600 dark:text-yellow-400">
                        {qaStatus.issues.map((issue, i) => (
                          <p key={i}>{issue}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Center Column: Recording */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5" />
                  Record Specimen
                </CardTitle>
                <CardDescription>
                  Place specimen near sensor and record gas signature
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Label Input */}
                <div className="space-y-2">
                  <Label>Specimen Label</Label>
                  <Input
                    placeholder="e.g. pleurotus_ostreatus"
                    value={recordLabel}
                    onChange={(e) => setRecordLabel(e.target.value)}
                    disabled={recordingStatus?.state === "recording"}
                  />
                  <div className="flex flex-wrap gap-1">
                    {specimenLabels.slice(0, 4).map((label) => (
                      <Button
                        key={label}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => setRecordLabel(label)}
                        disabled={recordingStatus?.state === "recording"}
                      >
                        {label.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration: {recordDuration}s</Label>
                  <Slider
                    value={[recordDuration]}
                    onValueChange={([v]) => setRecordDuration(v)}
                    min={10}
                    max={300}
                    step={10}
                    disabled={recordingStatus?.state === "recording"}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Notes about this specimen..."
                    value={recordDescription}
                    onChange={(e) => setRecordDescription(e.target.value)}
                    disabled={recordingStatus?.state === "recording"}
                  />
                </div>

                {/* Recording Status */}
                {recordingStatus?.state === "recording" && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Recording: {recordingStatus.current_label}
                      </span>
                      <Badge variant="default" className="animate-pulse">
                        <Activity className="h-3 w-3 mr-1" />
                        {Math.round(recordingStatus.elapsed_sec)}s
                      </Badge>
                    </div>
                    <Progress value={(recordingStatus.elapsed_sec / recordDuration) * 100} />
                    <p className="text-sm text-muted-foreground mt-2">
                      {recordingStatus.sample_count} samples collected
                    </p>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-2">
                  {recordingStatus?.state !== "recording" ? (
                    <Button
                      className="flex-1"
                      onClick={startRecording}
                      disabled={!session || !recordLabel || loading}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={stopRecording}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={exportCSV}
                  disabled={!session || !qaStatus?.can_export}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={exportZIP}
                  disabled={!session}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Export ZIP
                </Button>
              </CardFooter>
            </Card>

            {/* Right Column: Live Data */}
            <div className="space-y-4">
              {/* Sensor Readings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Live Sensor Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestReading?.data ? (
                    <div className="space-y-3">
                      {["bme1", "bme2"].map((sensor, idx) => {
                        const data = latestReading.data?.[sensor] || latestReading.data?.data?.[sensor]
                        if (!data) return null
                        return (
                          <div key={sensor} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {sensor.toUpperCase()} (0x{idx === 0 ? "77" : "76"})
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Temp:</span>{" "}
                                <span className="font-mono">{data.temp_c?.toFixed(1) || "—"}°C</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">RH:</span>{" "}
                                <span className="font-mono">{data.rh_pct?.toFixed(1) || "—"}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Gas:</span>{" "}
                                <span className="font-mono">{data.gas_ohm ? (data.gas_ohm / 1000).toFixed(1) : "—"} kΩ</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">IAQ:</span>{" "}
                                <span className="font-mono">{data.iaq?.toFixed(0) || "—"}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Start a session to see live data
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Specimens List */}
              {session && session.specimens.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recorded Specimens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {session.specimens.map((spec, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span className="font-mono">{spec.label}</span>
                            <Badge variant="outline">{spec.sample_count} samples</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Blob Manager Tab */}
        <TabsContent value="blobs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload BSEC Blob
                </CardTitle>
                <CardDescription>
                  Upload trained selectivity blob from Bosch AI-Studio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Blob File (.config)</Label>
                  <Input
                    type="file"
                    accept=".config,.bin"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Oyster Mushroom Detection v1"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class Labels (comma-separated)</Label>
                  <Input
                    placeholder="e.g. clean_air, pleurotus_ostreatus, contamination"
                    value={uploadClasses}
                    onChange={(e) => setUploadClasses(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={uploadBlob}
                  disabled={!uploadFile || !uploadName || !uploadClasses || uploading || !agentOnline}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Blob
                </Button>
              </CardContent>
            </Card>

            {/* Blob List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>MINDEX Blobs</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchBlobs}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {blobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No blobs uploaded yet
                      </p>
                    ) : (
                      blobs.map((blob) => (
                        <Card key={blob.id} className="bg-muted/50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{blob.name}</h4>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {blob.id.slice(0, 16)}...
                                </p>
                              </div>
                              <Badge
                                variant={
                                  blob.status === "active"
                                    ? "default"
                                    : blob.status === "testing"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {blob.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {blob.class_labels?.map((label, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {blob.status === "testing" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBlobStatus(blob.id, "active")}
                                >
                                  Activate
                                </Button>
                              )}
                              {blob.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBlobStatus(blob.id, "deprecated")}
                                >
                                  Deprecate
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `${TRAINER_API}/mindex/blobs/${blob.id}/export?format=header`,
                                    "_blank"
                                  )
                                }
                              >
                                <Download className="h-3 w-3 mr-1" />
                                .h
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Training Sessions</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchSessions}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No training sessions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <Card key={sess.session_id} className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-mono text-sm">{sess.session_id}</h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sess.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{sess.port}</Badge>
                            <Badge>{sess.total_samples} samples</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(`${TRAINER_API}/sessions/${sess.session_id}/export.csv`, "_blank")
                            }
                          >
                            <FileJson className="h-3 w-3 mr-1" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(`${TRAINER_API}/sessions/${sess.session_id}/export.zip`, "_blank")
                            }
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            ZIP
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
