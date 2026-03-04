"use client"

import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
import { VesselBadge } from "@/components/ethics-training/VesselBadge"

interface Scenario {
  scenario_id: string
  title: string
  description: string
  category: string
  vessel_level: string[]
  max_rounds?: number
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/ethics-training/scenarios")
      .then((r) => r.json())
      .then((data) => setScenarios(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Scenario Library</h1>
      <p className="text-gray-400 text-sm mb-6">
        Training scenarios for ethics development across vessel stages.
      </p>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : scenarios.length === 0 ? (
        <p className="text-gray-500">No scenarios available.</p>
      ) : (
        <div className="space-y-4">
          {scenarios.map((s) => (
            <div
              key={s.scenario_id}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="font-medium text-white">{s.title}</h2>
                <span className="text-xs text-gray-500">{s.category}</span>
                {s.vessel_level?.map((v) => (
                  <VesselBadge key={v} stage={v} />
                ))}
              </div>
              <p className="text-sm text-gray-400">{s.description}</p>
              {s.max_rounds != null && (
                <p className="text-xs text-gray-500 mt-1">Max rounds: {s.max_rounds}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
