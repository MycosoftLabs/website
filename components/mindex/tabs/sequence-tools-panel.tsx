"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glowing-border"

export function SequenceToolsPanel() {
  const [kingdom, setKingdom] = useState("Fungi")
  const [tool, setTool] = useState("blast")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const res = await fetch("/api/mas/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `MINDEX sequence tool request: ${tool} (${kingdom})`,
          task_type: "scientific",
          target_agent: "sequence-tools-agent",
          priority: "normal",
          payload: { kingdom, tool },
          source: "mindex-dashboard",
        }),
      })
      const text = await res.text()
      setResult(`HTTP ${res.status}\n${text.slice(0, 4000)}`)
      if (!res.ok) setErr(`upstream_${res.status}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "submit_failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard color="purple">
      <p className="text-sm text-gray-400 mb-4">
        Routes kingdom + tool choice to MAS task intake targeting <span className="font-mono">sequence-tools-agent</span>.
        Executor wiring lives on MAS; UI never fabricates alignments.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="st-kingdom" className="text-base text-gray-300">
            Kingdom
          </Label>
          <Input
            id="st-kingdom"
            value={kingdom}
            onChange={(e) => setKingdom(e.target.value)}
            className="text-base min-h-[44px] bg-black/40 border-purple-500/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-tool" className="text-base text-gray-300">
            Tool (blast, mafft, primer, …)
          </Label>
          <Input
            id="st-tool"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="text-base min-h-[44px] bg-black/40 border-purple-500/30"
          />
        </div>
      </div>
      <Button type="button" className="mt-4 min-h-[44px] w-full sm:w-auto" onClick={() => void submit()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        Submit to MAS
      </Button>
      {err ? <p className="text-sm text-amber-300 mt-2">{err}</p> : null}
      {result ? (
        <pre className="mt-4 text-xs font-mono text-gray-300 whitespace-pre-wrap break-all max-h-[40vh] overflow-auto border border-white/10 rounded-md p-3">
          {result}
        </pre>
      ) : null}
    </GlassCard>
  )
}
