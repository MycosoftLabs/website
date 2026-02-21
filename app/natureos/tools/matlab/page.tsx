"use client"

import { useState, type FormEvent } from "react"
import { Activity, Brain, LineChart, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ToolResponse {
  status: "idle" | "loading" | "success" | "error"
  message?: string
  data?: unknown
}

export default function NatureOSMatlabToolsPage() {
  const [health, setHealth] = useState<ToolResponse>({ status: "idle" })
  const [deviceId, setDeviceId] = useState("")
  const [anomalyResult, setAnomalyResult] = useState<ToolResponse>({ status: "idle" })
  const [metric, setMetric] = useState("")
  const [horizonHours, setHorizonHours] = useState("")
  const [forecastResult, setForecastResult] = useState<ToolResponse>({ status: "idle" })
  const [signalVector, setSignalVector] = useState("")
  const [classificationResult, setClassificationResult] = useState<ToolResponse>({ status: "idle" })

  async function runHealthCheck() {
    setHealth({ status: "loading" })
    try {
      const response = await fetch("/api/natureos/matlab/health")
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setHealth({ status: "success", data })
    } catch (error) {
      setHealth({ status: "error", message: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  async function runAnomalyDetection(event: FormEvent) {
    event.preventDefault()
    setAnomalyResult({ status: "loading" })
    try {
      const response = await fetch("/api/natureos/matlab/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setAnomalyResult({ status: "success", data })
    } catch (error) {
      setAnomalyResult({ status: "error", message: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  async function runForecast(event: FormEvent) {
    event.preventDefault()
    setForecastResult({ status: "loading" })
    try {
      const hours = Number(horizonHours)
      const response = await fetch("/api/natureos/matlab/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, horizonHours: Number.isFinite(hours) ? hours : undefined }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setForecastResult({ status: "success", data })
    } catch (error) {
      setForecastResult({ status: "error", message: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  async function runClassification(event: FormEvent) {
    event.preventDefault()
    setClassificationResult({ status: "loading" })
    try {
      const vector = signalVector
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value))

      const response = await fetch("/api/natureos/matlab/classification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalVector: vector }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setClassificationResult({ status: "success", data })
    } catch (error) {
      setClassificationResult({ status: "error", message: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>NatureOS Tools</span>
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">MATLAB Tools</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Run MATLAB-backed analysis workflows for NatureOS devices and datasets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            MATLAB Health
          </CardTitle>
          <CardDescription>Verify that the MATLAB integration service is online.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={runHealthCheck} disabled={health.status === "loading"} className="w-full sm:w-auto">
            {health.status === "loading" ? "Checking..." : "Run Health Check"}
          </Button>
          {health.status === "success" && (
            <pre className="rounded-lg border bg-muted/30 p-4 text-xs overflow-x-auto">
              {JSON.stringify(health.data, null, 2)}
            </pre>
          )}
          {health.status === "error" && (
            <div className="text-sm text-red-500">Health check failed: {health.message}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Anomaly Detection
            </CardTitle>
            <CardDescription>Run MATLAB anomaly detection for a NatureOS device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={runAnomalyDetection} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(event) => setDeviceId(event.target.value)}
                  placeholder="Enter device ID"
                  className="text-base"
                />
              </div>
              <Button type="submit" disabled={!deviceId || anomalyResult.status === "loading"}>
                {anomalyResult.status === "loading" ? "Running..." : "Run Detection"}
              </Button>
              {anomalyResult.status === "success" && (
                <pre className="rounded-lg border bg-muted/30 p-4 text-xs overflow-x-auto">
                  {JSON.stringify(anomalyResult.data, null, 2)}
                </pre>
              )}
              {anomalyResult.status === "error" && (
                <div className="text-sm text-red-500">Request failed: {anomalyResult.message}</div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              Forecasting
            </CardTitle>
            <CardDescription>Predict environmental metrics using MATLAB models.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={runForecast} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="metric">Metric</Label>
                <Input
                  id="metric"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                  placeholder="Enter metric name"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horizonHours">Horizon (hours)</Label>
                <Input
                  id="horizonHours"
                  value={horizonHours}
                  onChange={(event) => setHorizonHours(event.target.value)}
                  placeholder="Enter forecast horizon"
                  inputMode="numeric"
                  className="text-base"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={!metric || forecastResult.status === "loading"} className="w-full sm:w-auto">
                  {forecastResult.status === "loading" ? "Running..." : "Run Forecast"}
                </Button>
              </div>
            </form>
            <Separator />
            {forecastResult.status === "success" && (
              <pre className="rounded-lg border bg-muted/30 p-4 text-xs overflow-x-auto">
                {JSON.stringify(forecastResult.data, null, 2)}
              </pre>
            )}
            {forecastResult.status === "error" && (
              <div className="text-sm text-red-500">Request failed: {forecastResult.message}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-500" />
            Signal Classification
          </CardTitle>
          <CardDescription>Classify morphology from a numeric signal vector.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={runClassification} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="signalVector">Signal Vector (comma separated)</Label>
              <Textarea
                id="signalVector"
                value={signalVector}
                onChange={(event) => setSignalVector(event.target.value)}
                placeholder="Enter comma-separated numeric values"
                className="min-h-[120px] text-base"
              />
            </div>
            <Button type="submit" disabled={!signalVector || classificationResult.status === "loading"} className="w-full sm:w-auto">
              {classificationResult.status === "loading" ? "Running..." : "Run Classification"}
            </Button>
          </form>
          {classificationResult.status === "success" && (
            <pre className="rounded-lg border bg-muted/30 p-4 text-xs overflow-x-auto">
              {JSON.stringify(classificationResult.data, null, 2)}
            </pre>
          )}
          {classificationResult.status === "error" && (
            <div className="text-sm text-red-500">Request failed: {classificationResult.message}</div>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Requires NatureOS MATLAB API</Badge>
            <Badge variant="outline">No mock data</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
