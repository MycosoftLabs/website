"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Terminal, Lightbulb, Volume2, Power } from "lucide-react"

interface CommandResult {
  ok?: boolean
  seq?: number
  ack?: { received_at?: string; success?: boolean; message?: string }
  telemetry?: unknown
  error?: string
}

interface Entry {
  ts: string
  target: string
  cmd: string
  params: Record<string, unknown>
  result: CommandResult
  ms: number
}

interface Props {
  deviceId: string
}

const QUICK_ACTIONS: Array<{
  label: string
  icon: React.ReactNode
  target: "side_a" | "side_b"
  cmd: string
  params: Record<string, unknown>
}> = [
  {
    label: "Read sensors",
    icon: <Terminal className="h-4 w-4" />,
    target: "side_a",
    cmd: "read_sensors",
    params: {},
  },
  {
    label: "LED red",
    icon: <Lightbulb className="h-4 w-4" />,
    target: "side_a",
    cmd: "output_control",
    params: { id: "neopixel", value: 1, r: 255, g: 0, b: 0 },
  },
  {
    label: "LED green",
    icon: <Lightbulb className="h-4 w-4" />,
    target: "side_a",
    cmd: "output_control",
    params: { id: "neopixel", value: 1, r: 0, g: 255, b: 0 },
  },
  {
    label: "LED off",
    icon: <Lightbulb className="h-4 w-4" />,
    target: "side_a",
    cmd: "output_control",
    params: { id: "neopixel", value: 0 },
  },
  {
    label: "Buzzer ding",
    icon: <Volume2 className="h-4 w-4" />,
    target: "side_a",
    cmd: "output_control",
    params: { id: "buzzer", value: 1, freq: 1200, duration_ms: 200 },
  },
  {
    label: "Estop",
    icon: <Power className="h-4 w-4" />,
    target: "side_a",
    cmd: "estop",
    params: {},
  },
  {
    label: "Clear estop",
    icon: <Power className="h-4 w-4" />,
    target: "side_a",
    cmd: "clear_estop",
    params: {},
  },
  {
    label: "Transport status",
    icon: <Terminal className="h-4 w-4" />,
    target: "side_b",
    cmd: "transport_status",
    params: {},
  },
]

export function LiveCommandConsole({ deviceId }: Props) {
  const [history, setHistory] = useState<Entry[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const [target, setTarget] = useState<"side_a" | "side_b">("side_a")
  const [cmd, setCmd] = useState<string>("read_sensors")
  const [paramsText, setParamsText] = useState<string>("{}")

  async function send(
    t: "side_a" | "side_b",
    c: string,
    p: Record<string, unknown>,
    label?: string,
  ) {
    if (pending) return
    const key = label || `${t}:${c}`
    setPending(key)
    const startedAt = Date.now()
    try {
      const res = await fetch(
        `/api/devices/${encodeURIComponent(deviceId)}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: t,
            cmd: c,
            params: p,
            ack_requested: true,
          }),
        }
      )
      const result = (await res.json()) as CommandResult
      setHistory((prev) =>
        [
          {
            ts: new Date().toISOString(),
            target: t,
            cmd: c,
            params: p,
            result,
            ms: Date.now() - startedAt,
          },
          ...prev,
        ].slice(0, 30)
      )
    } catch (err) {
      setHistory((prev) =>
        [
          {
            ts: new Date().toISOString(),
            target: t,
            cmd: c,
            params: p,
            result: { ok: false, error: (err as Error).message },
            ms: Date.now() - startedAt,
          },
          ...prev,
        ].slice(0, 30)
      )
    } finally {
      setPending(null)
    }
  }

  function sendCustom() {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(paramsText || "{}")
    } catch (err) {
      alert(`Bad JSON in params: ${(err as Error).message}`)
      return
    }
    send(target, cmd, parsed, "custom")
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Terminal className="h-4 w-4" /> Live Command Console
        </CardTitle>
        <CardDescription className="text-xs">
          Direct MDP command surface — same vocabulary as the COM7 bench session, now over `:8787/command`.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((q) => (
            <Button
              key={q.label}
              size="sm"
              variant="outline"
              onClick={() => send(q.target, q.cmd, q.params, q.label)}
              disabled={!!pending}
            >
              {pending === q.label ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <span className="mr-1">{q.icon}</span>
              )}
              {q.label}
            </Button>
          ))}
        </div>

        {/* Custom command form */}
        <div className="grid gap-2 md:grid-cols-[auto_1fr_2fr_auto] md:items-end">
          <div>
            <Label className="text-xs">target</Label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as "side_a" | "side_b")}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              disabled={!!pending}
            >
              <option value="side_a">side_a</option>
              <option value="side_b">side_b</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">cmd</Label>
            <Input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              disabled={!!pending}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">params (JSON)</Label>
            <Input
              value={paramsText}
              onChange={(e) => setParamsText(e.target.value)}
              disabled={!!pending}
              className="h-9 font-mono"
            />
          </div>
          <Button size="sm" onClick={sendCustom} disabled={!!pending}>
            {pending === "custom" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Send
          </Button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">History</div>
            <div className="space-y-1 max-h-64 overflow-auto font-mono text-xs">
              {history.map((h, i) => (
                <div key={i} className="border-l-2 pl-2 py-1" style={{
                  borderColor: h.result.ok ? "rgb(34,197,94)" : "rgb(239,68,68)"
                }}>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{new Date(h.ts).toLocaleTimeString()}</span>
                    <span>{h.target} / {h.cmd}</span>
                    <span>{h.ms}ms</span>
                    <span className={h.result.ok ? "text-green-500" : "text-destructive"}>
                      {h.result.ok ? "✓" : "✗"}
                    </span>
                  </div>
                  {h.result.error && (
                    <div className="text-destructive">{h.result.error}</div>
                  )}
                  {h.result.ack && (
                    <div>ack: {h.result.ack.message || (h.result.ack.success ? "ok" : "fail")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
