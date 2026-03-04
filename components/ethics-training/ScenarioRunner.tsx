"use client"

import { useState, useEffect } from "react"
import { Play, ChevronRight } from "lucide-react"
import { VesselBadge } from "./VesselBadge"

interface Scenario {
  scenario_id: string
  title: string
  description: string
  category: string
  vessel_level: string[]
}

interface ScenarioRunnerProps {
  sessionId: string
  vesselStage: string
}

export function ScenarioRunner({ sessionId, vesselStage }: ScenarioRunnerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [loadingScenarios, setLoadingScenarios] = useState(true)

  useEffect(() => {
    fetch("/api/ethics-training/scenarios")
      .then((r) => r.json())
      .then((data) => {
        setScenarios(Array.isArray(data) ? data : [])
      })
      .finally(() => setLoadingScenarios(false))
  }, [])

  async function runScenario(scenarioId: string) {
    setSelected(scenarioId)
    setOutput(null)
    setLoading(true)
    try {
      const res = await fetch("/api/ethics-training/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, scenario_id: scenarioId }),
      })
      const data = await res.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (e) {
      setOutput(`Error: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const eligible = scenarios.filter(
    (s) =>
      !s.vessel_level?.length ||
      s.vessel_level.some((v) => v.toLowerCase() === vesselStage.toLowerCase())
  )

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <VesselBadge stage={vesselStage} />
        <span className="text-sm text-gray-400">Run training scenario</span>
      </div>
      {loadingScenarios ? (
        <p className="text-gray-500 text-sm">Loading scenarios...</p>
      ) : eligible.length === 0 ? (
        <p className="text-gray-500 text-sm">No scenarios available for this vessel stage.</p>
      ) : (
        <div className="space-y-2">
          {eligible.map((s) => (
            <button
              key={s.scenario_id}
              type="button"
              onClick={() => runScenario(s.scenario_id)}
              disabled={loading}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-600 hover:border-amber-600/50 hover:bg-gray-800/50 text-left min-h-[44px] transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-white truncate">{s.title}</span>
              {loading && selected === s.scenario_id ? (
                <span className="text-xs text-amber-400">Running...</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
      {output && (
        <div className="mt-4 p-3 rounded bg-gray-800 text-xs font-mono text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
          <pre className="whitespace-pre-wrap break-words">{output}</pre>
        </div>
      )}
    </div>
  )
}
