"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Loader2,
  Hand,
  Power,
  Settings,
  AlertOctagon,
  RotateCw,
} from "lucide-react"

interface OpenClawStatus {
  available: boolean
  ready?: boolean
  position?: number
  is_closed?: boolean
  force_adc?: number
  mode?: number | string
  calibrated?: boolean
  estop_latched?: boolean
  error?: string
}

interface ActionResult {
  ok: boolean
  request_id?: string
  audit_id?: number
  started_at?: string
  completed_at?: string
  result?: unknown
  error?: string
}

interface Props {
  deviceId: string
}

export function OpenClawPanel({ deviceId }: Props) {
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [position, setPosition] = useState<number>(90)
  const [pending, setPending] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ActionResult | null>(null)
  const [actions, setActions] = useState<Array<{ action: string; ts: string; ok: boolean; ms: number }>>([])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/devices/${encodeURIComponent(deviceId)}/openclaw/status`,
        { cache: "no-store" }
      )
      const body = (await res.json()) as OpenClawStatus
      setStatus(body)
      if (typeof body.position === "number") setPosition(body.position)
    } catch (err) {
      setStatus({ available: false, error: (err as Error).message })
    }
  }, [deviceId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  async function fireAction(action: string, params: Record<string, unknown> = {}) {
    if (pending) return
    setPending(action)
    const startedAt = Date.now()
    try {
      const res = await fetch(
        `/api/devices/${encodeURIComponent(deviceId)}/openclaw/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, params }),
        }
      )
      const body = (await res.json()) as ActionResult
      setLastResult(body)
      setActions((prev) =>
        [
          {
            action,
            ts: new Date().toISOString(),
            ok: !!body.ok,
            ms: Date.now() - startedAt,
          },
          ...prev,
        ].slice(0, 8)
      )
      // Re-fetch status after action for fast feedback
      setTimeout(refresh, 300)
    } catch (err) {
      setLastResult({ ok: false, error: (err as Error).message })
    } finally {
      setPending(null)
    }
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Probing OpenClaw…
        </CardContent>
      </Card>
    )
  }

  if (!status.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenClaw</CardTitle>
          <CardDescription>
            Not available on this device {status.error ? `(${status.error})` : ""}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const estop = status.estop_latched === true

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Hand className="h-4 w-4" /> OpenClaw
          </CardTitle>
          <div className="flex items-center gap-2">
            {estop && (
              <Badge variant="destructive" className="text-[10px]">
                ESTOP latched
              </Badge>
            )}
            <Badge variant={status.ready ? "default" : "secondary"} className="text-[10px]">
              {status.ready ? "READY" : "not ready"}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Live control over `:8787/openclaw/action` → MDP claw commands `0x0030`–`0x003F`
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position read-out */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Position</div>
            <div className="text-2xl font-mono">
              {typeof status.position === "number" ? `${status.position}°` : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Gripper</div>
            <div className="text-2xl font-mono">
              {status.is_closed === true ? "Closed" : status.is_closed === false ? "Open" : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Force ADC</div>
            <div className="text-2xl font-mono">
              {typeof status.force_adc === "number" ? status.force_adc : "—"}
            </div>
          </div>
        </div>

        {/* Quick-action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => fireAction("grip")}
            disabled={!!pending || estop}
          >
            {pending === "grip" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Hand className="h-4 w-4 mr-1" />}
            Grip
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fireAction("release")}
            disabled={!!pending || estop}
          >
            {pending === "release" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Power className="h-4 w-4 mr-1" />}
            Release
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fireAction("calibrate")}
            disabled={!!pending || estop}
          >
            <Settings className="h-4 w-4 mr-1" /> Calibrate
          </Button>
          {!estop ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => fireAction("estop")}
              disabled={!!pending}
            >
              <AlertOctagon className="h-4 w-4 mr-1" /> ESTOP
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => fireAction("clear_estop")}
              disabled={!!pending}
            >
              <RotateCw className="h-4 w-4 mr-1" /> Clear ESTOP
            </Button>
          )}
        </div>

        {/* Position slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Position: {position}°</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fireAction("position", { angle: position })}
              disabled={!!pending || estop}
            >
              {pending === "position" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
          <Slider
            value={[position]}
            onValueChange={(v) => setPosition(v[0] ?? 90)}
            min={0}
            max={180}
            step={1}
            disabled={!!pending || estop}
          />
        </div>

        {/* Recent actions */}
        {actions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Recent actions</div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {actions.map((a, i) => (
                <div key={i} className="text-xs font-mono flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {new Date(a.ts).toLocaleTimeString()}
                  </span>
                  <span>{a.action}</span>
                  <span className="text-muted-foreground">{a.ms}ms</span>
                  <span className={a.ok ? "text-green-500" : "text-destructive"}>
                    {a.ok ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastResult && !lastResult.ok && lastResult.error && (
          <div className="text-xs text-destructive">
            Last error: {lastResult.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
