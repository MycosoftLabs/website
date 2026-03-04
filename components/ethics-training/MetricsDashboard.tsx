"use client"

import { useEffect, useState } from "react"
import { GradeCard } from "./GradeCard"

interface GradeResult {
  score: number
  letter_grade: string
  session_id?: string
  scenario_id?: string
  rubric_breakdown?: Record<string, number>
  strengths?: string[]
  weaknesses?: string[]
  observer_notes?: string
}

interface ReportData {
  group_by?: string
  groups?: Record<string, number>
  total_grades?: number
  records?: GradeResult[]
}

export function MetricsDashboard() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/ethics-training/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_by: "vessel_stage" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading metrics...</p>
  if (!report) return <p className="text-gray-500">No report data available.</p>

  const groups = report.groups ?? {}
  const records = report.records ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Scores by Vessel Stage</h2>
        {Object.keys(groups).length === 0 ? (
          <p className="text-gray-500 text-sm">No grade data yet. Run scenarios to generate metrics.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(groups).map(([key, avgScore]) => (
              <div
                key={key}
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
              >
                <div className="text-xs text-gray-500 truncate">{key || "unknown"}</div>
                <div className="text-lg font-bold text-white">{Number(avgScore).toFixed(1)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {records.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Grades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {records.slice(-6).reverse().map((g, i) => (
              <GradeCard
                key={i}
                grade={g}
                title={g.session_id ? `Session ${String(g.session_id).slice(0, 8)}` : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
