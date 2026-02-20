"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Dna,
  Cpu,
  Upload,
  Play,
} from "lucide-react"

interface AnomalyResult {
  isAnomaly?: boolean[]
  anomalyScores?: number[]
  anomalyCount?: number
  message?: string
}

interface ForecastResult {
  predictions?: number[]
  timestamps?: string[]
  confidenceInterval?: number
}

interface ClassificationResult {
  topSpecies?: string
  confidence?: number
  alternatives?: { species: string; confidence: number }[]
}

interface MatlabHealth {
  available: boolean
  mode: string
  message?: string
}

export default function AIStudioPage() {
  const [matlabHealth, setMatlabHealth] = useState<MatlabHealth | null>(null)
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(null)
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [anomalyInput, setAnomalyInput] = useState("")
  const [forecastMetric, setForecastMetric] = useState("temperature")
  const [forecastHours, setForecastHours] = useState(24)
  const [classificationInput, setClassificationInput] = useState("")

  const base = typeof window !== "undefined" ? window.location.origin : ""

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${base}/api/natureos/matlab/health`)
      const data = await res.json()
      setMatlabHealth(data)
    } catch {
      setMatlabHealth({ available: false, mode: "Unavailable", message: "Health check failed" })
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const runAnomalyDetection = async () => {
    const values = anomalyInput
      .split(/[\s,]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n))
    if (values.length === 0) return
    setLoading(true)
    setAnomalyResult(null)
    try {
      const res = await fetch(`${base}/api/natureos/matlab/anomaly-detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (res.ok) setAnomalyResult(await res.json())
      else setAnomalyResult({ message: "Anomaly detection failed" })
    } catch (err) {
      setAnomalyResult({ message: "Backend unavailable" })
    } finally {
      setLoading(false)
    }
  }

  const runForecast = async () => {
    setLoading(true)
    setForecastResult(null)
    try {
      const res = await fetch(`${base}/api/natureos/matlab/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: forecastMetric,
          horizonHours: forecastHours,
          historicalData: [],
        }),
      })
      if (res.ok) setForecastResult(await res.json())
      else setForecastResult({})
    } catch {
      setForecastResult({})
    } finally {
      setLoading(false)
    }
  }

  const runClassificationRequest = async () => {
    const values = classificationInput
      .split(/[\s,]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n))
    if (values.length === 0) return
    setLoading(true)
    setClassificationResult(null)
    try {
      const res = await fetch(`${base}/api/natureos/matlab/classification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (res.ok) setClassificationResult(await res.json())
      else setClassificationResult({ topSpecies: "Error", confidence: 0 })
    } catch {
      setClassificationResult({ topSpecies: "Backend unavailable", confidence: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="AI Studio"
        text="MATLAB-driven anomaly detection, forecasting, and classification"
      >
        <div className="flex gap-2 items-center">
          <Badge variant={matlabHealth?.available ? "default" : "secondary"}>
            {matlabHealth?.mode ?? "Checking..."}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        <Tabs defaultValue="anomaly">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="anomaly" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Anomaly Detection
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="classification" className="gap-2">
              <Dna className="h-4 w-4" />
              Classification
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Cpu className="h-4 w-4" />
              Model Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anomaly" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection</CardTitle>
                <CardDescription>
                  Paste time-series data (comma or space separated) to detect anomalies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="anomaly-input">Time series values</Label>
                  <Input
                    id="anomaly-input"
                    placeholder="e.g. 1.2, 1.5, 1.3, 10.0, 1.4, 1.2"
                    value={anomalyInput}
                    onChange={(e) => setAnomalyInput(e.target.value)}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <Button onClick={runAnomalyDetection} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? "Running..." : "Detect Anomalies"}
                </Button>
                {anomalyResult && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium">
                      Anomalies found: {anomalyResult.anomalyCount ?? 0}
                    </p>
                    {anomalyResult.message && (
                      <p className="text-sm text-muted-foreground">{anomalyResult.message}</p>
                    )}
                    {anomalyResult.anomalyScores && anomalyResult.anomalyScores.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Max score: {Math.max(...anomalyResult.anomalyScores).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environmental Forecasting</CardTitle>
                <CardDescription>Predict environmental metrics for the next hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Metric</Label>
                    <Input
                      value={forecastMetric}
                      onChange={(e) => setForecastMetric(e.target.value)}
                      placeholder="temperature"
                    />
                  </div>
                  <div>
                    <Label>Horizon (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={forecastHours}
                      onChange={(e) => setForecastHours(parseInt(e.target.value, 10) || 24)}
                    />
                  </div>
                </div>
                <Button onClick={runForecast} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? "Running..." : "Run Forecast"}
                </Button>
                {forecastResult && (
                  <div className="rounded-lg border p-4 space-y-2">
                    {forecastResult.predictions && forecastResult.predictions.length > 0 ? (
                      <>
                        <p className="text-sm font-medium">
                          Predictions: {forecastResult.predictions.length} points
                        </p>
                        <p className="text-xs text-muted-foreground">
                          First: {forecastResult.predictions[0]?.toFixed(2)}, Last:{" "}
                          {forecastResult.predictions[forecastResult.predictions.length - 1]?.toFixed(
                            2
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No predictions (NatureOS backend may not be configured)
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classification" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fungal Morphology Classification</CardTitle>
                <CardDescription>
                  Paste signal/morphology feature vector (comma or space separated numbers)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="class-input">Signal vector</Label>
                  <Input
                    id="class-input"
                    placeholder="e.g. 0.1, 0.5, 0.3, 0.8, 0.2"
                    value={classificationInput}
                    onChange={(e) => setClassificationInput(e.target.value)}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <Button onClick={runClassificationRequest} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? "Running..." : "Classify"}
                </Button>
                {classificationResult && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium">
                      Top species: {classificationResult.topSpecies ?? "Unknown"}
                    </p>
                    <p className="text-sm">
                      Confidence: {((classificationResult.confidence ?? 0) * 100).toFixed(1)}%
                    </p>
                    {classificationResult.alternatives &&
                      classificationResult.alternatives.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Alternatives:{" "}
                          {classificationResult.alternatives
                            .map((a) => `${a.species} (${(a.confidence * 100).toFixed(1)}%)`)
                            .join(", ")}
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Management</CardTitle>
                <CardDescription>
                  View deployed MATLAB models and retrain triggers (placeholder)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Model management UI coming soon. MATLAB models run via NatureOS backend:
                  anomalyDetector, environmentalForecaster, fungalClassifier, biodiversityPredictor.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
