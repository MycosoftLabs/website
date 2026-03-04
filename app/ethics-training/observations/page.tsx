"use client"

import { useEffect, useState } from "react"

interface Observation {
  session_id?: string
  timestamp?: string
  note?: string
  summary?: string
}

export default function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/ethics-training/observations")
      .then((r) => r.json())
      .then((data) => setObservations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Observer MYCA Notes</h1>
      <p className="text-gray-400 text-sm mb-6">
        Live feed of Observer MYCA analysis and summaries from training sessions.
      </p>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : observations.length === 0 ? (
        <p className="text-gray-500">
          No observations yet. The Observer MYCA will add notes as sandbox sessions run.
        </p>
      ) : (
        <div className="space-y-4">
          {observations.map((o, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
            >
              {o.session_id && (
                <div className="text-xs text-gray-500 mb-1">Session: {o.session_id}</div>
              )}
              {o.timestamp && (
                <div className="text-xs text-gray-500 mb-1">{o.timestamp}</div>
              )}
              {o.note && <p className="text-sm text-gray-300">{o.note}</p>}
              {o.summary && <p className="text-sm text-amber-200/80 mt-2">{o.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
