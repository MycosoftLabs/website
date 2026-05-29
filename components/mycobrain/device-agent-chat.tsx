"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Loader2, Send } from "lucide-react"

interface ChatLine {
  role: "user" | "agent" | "system"
  text: string
}

interface DeviceAgentChatProps {
  deviceId: string
  deviceName?: string
}

const PRESETS = [
  { label: "Report firmware version", message: "Report firmware version", task_type: "diagnostics" },
  { label: "Run I2C scan", message: "Run I2C scan on Side A", task_type: "diagnostics" },
  {
    label: "Propose MDP 2.1.0 update",
    message: "Propose firmware update to side-a-mdp-2.1.0 mushroom1 profile",
    task_type: "firmware_update",
  },
]

export function DeviceAgentChat({ deviceId, deviceName }: DeviceAgentChatProps) {
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "system",
      text: `MAS relay → edge OpenClaw for ${deviceName || deviceId}. Destructive flash jobs require explicit approval.`,
    },
  ])

  async function send(message: string, taskType = "chat") {
    if (!message.trim()) return
    setBusy(true)
    setLines((prev) => [...prev, { role: "user", text: message }])
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/agent/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, task_type: taskType }),
      })
      const data = await res.json()
      const reply =
        typeof data.result === "object"
          ? JSON.stringify(data.result, null, 2)
          : String(data.error || data.result || data.status || "No response")
      setLines((prev) => [
        ...prev,
        { role: res.ok ? "agent" : "system", text: reply.slice(0, 4000) },
      ])
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          role: "system",
          text: error instanceof Error ? error.message : "Relay failed",
        },
      ])
    } finally {
      setBusy(false)
      setInput("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Edge Agent (OpenClaw relay)
        </CardTitle>
        <CardDescription>
          Tasks route through MAS to NemoClaw on the field host — not direct LAN access from the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={busy}
              onClick={() => send(p.message, p.task_type)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3 font-mono text-xs">
          {lines.map((line, i) => (
            <div key={i} className="mb-2 whitespace-pre-wrap">
              <span className="text-muted-foreground">
                [{line.role}]
              </span>{" "}
              {line.text}
            </div>
          ))}
        </ScrollArea>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the edge agent…"
            className="text-base min-h-[44px]"
            disabled={busy}
          />
          <Button type="submit" className="min-h-[44px] min-w-[44px]" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
