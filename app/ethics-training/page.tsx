"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Box, BarChart3, BookOpen } from "lucide-react"

interface SandboxSession {
  session_id: string
  vessel_stage: string
  creator: string
  state: string
  created_at: string
  name?: string
}

interface Scenario {
  scenario_id: string
  title: string
  category: string
  vessel_level: string[]
}

export default function EthicsTrainingDashboard() {
  const [sessions, setSessions] = useState<SandboxSession[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, scenRes] = await Promise.all([
          fetch("/api/ethics-training/sandbox"),
          fetch("/api/ethics-training/scenarios"),
        ])
        if (sessRes.ok) {
          const data = await sessRes.json()
          setSessions(Array.isArray(data) ? data : [])
        }
        if (scenRes.ok) {
          const data = await scenRes.json()
          setScenarios(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        console.error("Failed to load dashboard:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeSessions = sessions.filter((s) => s.state === "active")

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
        Ethics Training Dashboard
      </h1>
      <p className="text-gray-400 text-sm md:text-base mb-6">
        Sandbox MYCA instances for ethics training across developmental stages.
      </p>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/ethics-training/sandbox/new"
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium min-h-[44px] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Sandbox
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Box className="h-5 w-5" />
                <span className="font-medium">Active Sessions</span>
              </div>
              <p className="text-2xl font-bold text-white">{activeSessions.length}</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Scenarios</span>
              </div>
              <p className="text-2xl font-bold text-white">{scenarios.length}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Recent Sessions</h2>
            {sessions.length === 0 ? (
              <p className="text-gray-500">No sessions yet. Create a sandbox to get started.</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 10).map((s) => (
                  <Link
                    key={s.session_id}
                    href={`/ethics-training/sandbox/${s.session_id}`}
                    className="block rounded-lg border border-gray-700 bg-gray-800/50 p-4 hover:border-amber-600/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-white">
                        {s.name || `${s.vessel_stage}-${s.session_id.slice(0, 8)}`}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          s.state === "active"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {s.state}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {s.vessel_stage} • {s.creator}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
