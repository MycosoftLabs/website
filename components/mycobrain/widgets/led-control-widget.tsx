"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Zap, Radio, Play, Square, Loader2 } from "lucide-react"

interface LedControlWidgetProps {
  deviceId: string
  onCommand?: (cmd: string) => void
}

const COLOR_PRESETS = [
  { name: "Red", r: 255, g: 0, b: 0 },
  { name: "Green", r: 0, g: 255, b: 0 },
  { name: "Blue", r: 0, g: 0, b: 255 },
  { name: "Yellow", r: 255, g: 255, b: 0 },
  { name: "Cyan", r: 0, g: 255, b: 255 },
  { name: "Magenta", r: 255, g: 0, b: 255 },
  { name: "White", r: 255, g: 255, b: 255 },
  { name: "Off", r: 0, g: 0, b: 0 },
]

const PATTERN_PRESETS = [
  "solid", "blink", "breathe", "rainbow", "chase", "sparkle"
]

const OPTICAL_PROFILES = [
  { id: "camera_ook", name: "Camera OOK", description: "On-Off Keying for camera detection" },
  { id: "camera_manchester", name: "Camera Manchester", description: "Manchester encoding for cameras" },
  { id: "spatial_sm", name: "Spatial Modulation", description: "LED array spatial patterns" },
]

export function LedControlWidget({ deviceId, onCommand }: LedControlWidgetProps) {
  const [rgb, setRgb] = useState({ r: 0, g: 255, b: 0 })
  const [brightness, setBrightness] = useState(100)
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  
  // Optical modem state
  const [opticalProfile, setOpticalProfile] = useState("camera_ook")
  const [opticalPayload, setOpticalPayload] = useState("")
  const [opticalRate, setOpticalRate] = useState(10)
  const [opticalRepeat, setOpticalRepeat] = useState(1)
  const [opticalRunning, setOpticalRunning] = useState(false)

  const sendLedCommand = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    setLoading(true)
    setLastResult(null)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/led`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      })
      const data = await res.json()
      setLastResult(data.success ? "OK" : data.error || "Failed")
      onCommand?.(`led ${action}`)
    } catch (error) {
      setLastResult(String(error))
    } finally {
      setLoading(false)
    }
  }, [deviceId, onCommand])

  const setColor = (r: number, g: number, b: number) => {
    setRgb({ r, g, b })
    sendLedCommand("rgb", { r, g, b })
  }

  const startOpticalTx = async () => {
    setOpticalRunning(true)
    await sendLedCommand("optical_tx", {
      profile: opticalProfile,
      payload: opticalPayload,
      rate_hz: opticalRate,
      repeat: opticalRepeat,
    })
  }

  const stopOpticalTx = async () => {
    setOpticalRunning(false)
    // Send stop command
    try {
      await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peripheral: "led", action: "optical_stop" }),
      })
    } catch { /* ignore */ }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          LED Control
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          {lastResult && (
            <Badge variant={lastResult === "OK" ? "default" : "destructive"} className="ml-auto">
              {lastResult}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="color" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="optical">Optical TX</TabsTrigger>
          </TabsList>

          <TabsContent value="color" className="space-y-4">
            {/* Color Preview */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg border-2 shadow-inner"
                style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
              />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">R</Label>
                    <Slider
                      value={[rgb.r]}
                      onValueChange={([v]) => setRgb(p => ({ ...p, r: v }))}
                      max={255}
                      className="[&_[role=slider]]:bg-red-500"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">G</Label>
                    <Slider
                      value={[rgb.g]}
                      onValueChange={([v]) => setRgb(p => ({ ...p, g: v }))}
                      max={255}
                      className="[&_[role=slider]]:bg-green-500"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">B</Label>
                    <Slider
                      value={[rgb.b]}
                      onValueChange={([v]) => setRgb(p => ({ ...p, b: v }))}
                      max={255}
                      className="[&_[role=slider]]:bg-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <Button
              className="w-full"
              onClick={() => setColor(rgb.r, rgb.g, rgb.b)}
              disabled={loading}
            >
              Apply Color
            </Button>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setColor(preset.r, preset.g, preset.b)}
                  disabled={loading}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-1 border"
                    style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                  />
                  {preset.name}
                </Button>
              ))}
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <Label>Brightness: {brightness}%</Label>
              <Slider
                value={[brightness]}
                onValueChange={([v]) => setBrightness(v)}
                max={100}
              />
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {PATTERN_PRESETS.map((pattern) => (
                <Button
                  key={pattern}
                  variant="outline"
                  onClick={() => sendLedCommand("pattern", { pattern })}
                  disabled={loading}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {pattern}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="optical" className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4" />
                <span className="font-medium">Optical Modem TX</span>
                <Badge variant={opticalRunning ? "default" : "secondary"} className="ml-auto">
                  {opticalRunning ? "Running" : "Idle"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Transmit data via LED modulation for camera-based receivers
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Profile</Label>
                <Select value={opticalProfile} onValueChange={setOpticalProfile}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTICAL_PROFILES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payload (text)</Label>
                <Input
                  value={opticalPayload}
                  onChange={(e) => setOpticalPayload(e.target.value)}
                  placeholder="Enter message to transmit..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rate (Hz): {opticalRate}</Label>
                  <Slider
                    value={[opticalRate]}
                    onValueChange={([v]) => setOpticalRate(v)}
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <Label>Repeat: {opticalRepeat}x</Label>
                  <Slider
                    value={[opticalRepeat]}
                    onValueChange={([v]) => setOpticalRepeat(v)}
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={startOpticalTx}
                  disabled={loading || opticalRunning || !opticalPayload}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start TX
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopOpticalTx}
                  disabled={!opticalRunning}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

