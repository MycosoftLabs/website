"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

const EXAMPLE = `signal:\n- bioelectric_mV: [12, 18, 22, 15]\n- humidity: 71\n- voc_ppm: 0.9\n- substrate_temp_c: 23.4\ncontext:\n- species: Ganoderma lucidum\n- phase: colonization\n- timestamp: 2025-12-26T01:02:03Z\n`

export function NlmDemo() {
  const [input, setInput] = useState(EXAMPLE)
  const [output, setOutput] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const run = async () => {
    setIsLoading(true)
    setOutput("")
    try {
      // Uses the AI fallback endpoint if configured; otherwise returns guidance.
      const res = await fetch(`/api/search/ai?q=${encodeURIComponent("Interpret this mycospeak signal:\\n\\n" + input)}`)
      const json = await res.json()
      const answer = json?.result?.answer ?? json?.result?.output ?? JSON.stringify(json?.result ?? json, null, 2)
      setOutput(String(answer))
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">Signal input</div>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[260px] font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Interpretation</div>
          <Card className="min-h-[260px] p-3">
            <pre className="whitespace-pre-wrap break-words text-xs">{output || "Run to generate an interpretation."}</pre>
          </Card>
        </div>
      </div>
      <Button onClick={run} disabled={isLoading}>
        {isLoading ? "Interpreting..." : "Interpret"}
      </Button>
    </div>
  )
}

