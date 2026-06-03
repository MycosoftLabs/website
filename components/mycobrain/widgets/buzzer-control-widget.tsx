"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Volume2, Radio, Play, Square, Loader2, Music } from "lucide-react"

interface BuzzerControlWidgetProps {
  deviceId: string
  onCommand?: (cmd: string) => void
}

const SOUND_PRESETS = [
  { id: "coin", name: "Coin", icon: "🪙", description: "Coin pickup sound" },
  { id: "bump", name: "Bump", icon: "💥", description: "Bump/collision sound" },
  { id: "power", name: "Power", icon: "⚡", description: "Power up sound" },
  { id: "1up", name: "1-Up", icon: "🍄", description: "Extra life sound" },
  { id: "morgio", name: "Morgio", icon: "🎵", description: "SuperMorgIO jingle" },
]

const ACOUSTIC_PROFILES = [
  { id: "simple_fsk", name: "Simple FSK", description: "Basic frequency shift keying" },
  { id: "ggwave_like", name: "GGWave-like", description: "Audio data transmission" },
  { id: "dtmf", name: "DTMF", description: "Dual-tone multi-frequency" },
]

export function BuzzerControlWidget({ deviceId, onCommand }: BuzzerControlWidgetProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("presets")
  
  // Custom tone state
  const [toneHz, setToneHz] = useState(1000)
  const [toneMs, setToneMs] = useState(200)
  
  // Acoustic modem state
  const [acousticProfile, setAcousticProfile] = useState("simple_fsk")
  const [acousticPayload, setAcousticPayload] = useState("")
  const [symbolMs, setSymbolMs] = useState(100)
  const [f0, setF0] = useState(1000)
  const [f1, setF1] = useState(2000)
  const [acousticRepeat, setAcousticRepeat] = useState(1)
  const [acousticRunning, setAcousticRunning] = useState(false)

  const sendBuzzerCommand = useCallback(async (
    action: string,
    params: Record<string, unknown> = {},
    actionKey = action
  ) => {
    setPendingAction(actionKey)
    setLastResult(null)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/buzzer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
        signal: AbortSignal.timeout(14000),
      })
      const data = await res.json()
      setLastResult(data.success ? "OK" : data.error || "Failed")
      onCommand?.(`buzzer ${action}`)
    } catch (error) {
      setLastResult(String(error))
    } finally {
      setPendingAction((current) => current === actionKey ? null : current)
    }
  }, [deviceId, onCommand])

  const playPreset = (preset: string) => {
    sendBuzzerCommand("preset", { preset }, `preset-${preset}`)
  }

  const playTone = () => {
    sendBuzzerCommand("tone", { hz: toneHz, ms: toneMs }, "tone")
  }

  const startAcousticTx = async () => {
    setAcousticRunning(false)
    setLastResult("Standby")
    onCommand?.("acoustic tx standby: Side-B science comms pending")
  }

  const stopAcousticTx = async () => {
    setAcousticRunning(false)
    await sendBuzzerCommand("stop", {})
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="h-5 w-5 text-purple-500" />
          Buzzer Control
          <Loader2 className={`h-4 w-4 ml-auto ${pendingAction ? "animate-spin opacity-100" : "opacity-0"}`} />
          <Badge variant={lastResult === "OK" ? "default" : lastResult ? "destructive" : "secondary"}>
            {pendingAction ? "Sending" : lastResult || "Ready"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div role="tablist" aria-label="Buzzer controls" className="grid w-full grid-cols-3 rounded-lg bg-muted p-[3px] text-muted-foreground">
            {[
              { value: "presets", label: "Presets" },
              { value: "tone", label: "Custom Tone" },
              { value: "acoustic", label: "Acoustic TX" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ${activeTab === tab.value ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "presets" && (
          <section role="tabpanel" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {SOUND_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => playPreset(preset.id)}
                >
                  <span className="text-2xl">{preset.icon}</span>
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </section>
          )}

          {activeTab === "tone" && (
          <section role="tabpanel" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Frequency: {toneHz} Hz</Label>
                <Slider
                  value={[toneHz]}
                  onValueChange={([v]) => setToneHz(v)}
                  min={100}
                  max={8000}
                  step={50}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>100 Hz</span>
                  <span>8000 Hz</span>
                </div>
              </div>

              <div>
                <Label>Duration: {toneMs} ms</Label>
                <Slider
                  value={[toneMs]}
                  onValueChange={([v]) => setToneMs(v)}
                  min={50}
                  max={2000}
                  step={50}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>50 ms</span>
                  <span>2000 ms</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={playTone}
              >
                <Music className="h-4 w-4 mr-2" />
                Play Tone
              </Button>
            </div>
          </section>
          )}

          {activeTab === "acoustic" && (
          <section role="tabpanel" className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4" />
                <span className="font-medium">Acoustic Modem TX</span>
                <Badge variant={acousticRunning ? "default" : "secondary"} className="ml-auto">
                  {acousticRunning ? "Running" : "Idle"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Transmit data via audio modulation for microphone-based receivers
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Profile</Label>
                <Select value={acousticProfile} onValueChange={setAcousticProfile}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACOUSTIC_PROFILES.map((p) => (
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
                  value={acousticPayload}
                  onChange={(e) => setAcousticPayload(e.target.value)}
                  placeholder="Enter message to transmit..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Symbol: {symbolMs}ms</Label>
                  <Slider
                    value={[symbolMs]}
                    onValueChange={([v]) => setSymbolMs(v)}
                    min={10}
                    max={500}
                  />
                </div>
                <div>
                  <Label className="text-xs">F0: {f0}Hz</Label>
                  <Slider
                    value={[f0]}
                    onValueChange={([v]) => setF0(v)}
                    min={200}
                    max={4000}
                  />
                </div>
                <div>
                  <Label className="text-xs">F1: {f1}Hz</Label>
                  <Slider
                    value={[f1]}
                    onValueChange={([v]) => setF1(v)}
                    min={200}
                    max={4000}
                  />
                </div>
              </div>

              <div>
                <Label>Repeat: {acousticRepeat}x</Label>
                <Slider
                  value={[acousticRepeat]}
                  onValueChange={([v]) => setAcousticRepeat(v)}
                  min={1}
                  max={10}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={startAcousticTx}
                  disabled={acousticRunning || !acousticPayload}
                  title="Side-B acoustic modem firmware is pending"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Standby
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopAcousticTx}
                  disabled={!acousticRunning}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          </section>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

























