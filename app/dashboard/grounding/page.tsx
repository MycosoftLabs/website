"use client"

/**
 * Grounding Dashboard — March 5, 2026
 *
 * Live EP stream, grounding metrics, and ThoughtObject evidence chains
 * for MYCA's Grounded Cognition stack. No mock data — fetches from /api/grounding.
 */

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Brain,
  RefreshCw,
  Package,
  Lightbulb,
  ArrowLeft,
  ChevronRight,
  Activity,
  CheckCircle,
  XCircle,
  Home,
} from "lucide-react"

interface GroundingStatus {
  enabled: boolean
  timestamp: string
  thought_count: number
  last_ep_id: string | null
}

interface ExperiencePacket {
  id: string
  session_id: string | null
  user_id: string | null
  ground_truth: Record<string, unknown>
  self_state: Record<string, unknown> | null
  world_state: Record<string, unknown> | null
  observation: Record<string, unknown> | null
  uncertainty: Record<string, unknown> | null
  provenance: Record<string, unknown> | null
  created_at: string | null
}

interface ThoughtObject {
  id: string
  ep_id: string | null
  session_id: string | null
  claim: string
  type: string
  evidence_links: unknown[] | null
  confidence: number | null
  predicted_outcomes: Record<string, unknown> | null
  risks: Record<string, unknown> | null
  created_at: string | null
}

interface GroundingResponse {
  status: GroundingStatus
  experiencePackets: ExperiencePacket[]
  thoughtObjects: ThoughtObject[]
  error?: string
}

export default function GroundingDashboardPage() {
  const [data, setData] = useState<GroundingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/grounding?limit=50")
      const json = (await res.json()) as GroundingResponse
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000)
      return () => clearInterval(interval)
    }
  }, [fetchData, autoRefresh])

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-slate-400">Loading grounding dashboard...</p>
        </div>
      </div>
    )
  }

  const status = data?.status ?? {
    enabled: false,
    timestamp: new Date().toISOString(),
    thought_count: 0,
    last_ep_id: null,
  }
  const eps = data?.experiencePackets ?? []
  const thoughts = data?.thoughtObjects ?? []

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] items-center"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <Brain className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Grounding Dashboard</h1>
                  <p className="text-xs text-slate-400">Grounded Cognition — EPs & ThoughtObjects</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm min-h-[44px] ${
                  autoRefresh
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-700 bg-slate-800 text-slate-400"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{autoRefresh ? "Live" : "Paused"}</span>
              </button>
              <button
                onClick={fetchData}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {data?.error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-400">{data.error}</span>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {status.enabled ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-500" />
              )}
              <span className="text-sm font-medium text-slate-400">Grounding</span>
            </div>
            <p className="text-xl font-bold">{status.enabled ? "Enabled" : "Disabled"}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-slate-400">Thoughts (in-memory)</span>
            </div>
            <p className="text-xl font-bold">{status.thought_count}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-slate-400">Experience Packets</span>
            </div>
            <p className="text-xl font-bold">{eps.length}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-slate-400">ThoughtObjects (MINDEX)</span>
            </div>
            <p className="text-xl font-bold">{thoughts.length}</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* EP Stream */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                Experience Packet Stream
              </h2>
              <span className="text-sm text-slate-400">{eps.length} EPs</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {eps.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p>No experience packets yet</p>
                  <p className="text-xs mt-1">Enable MYCA_GROUNDED_COGNITION=1 in MAS to start logging</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {eps.map((ep) => (
                    <div key={ep.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start gap-2">
                        <code className="text-xs text-blue-400 font-mono shrink-0 truncate max-w-[120px] sm:max-w-[180px]">
                          {ep.id}
                        </code>
                        {ep.session_id && (
                          <span className="text-xs text-slate-500 truncate">{ep.session_id}</span>
                        )}
                      </div>
                      {ep.created_at && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(ep.created_at).toLocaleString()}
                        </p>
                      )}
                      {ep.ground_truth && Object.keys(ep.ground_truth).length > 0 && (
                        <pre className="text-xs text-slate-400 mt-2 overflow-x-auto max-h-20 truncate">
                          {JSON.stringify(ep.ground_truth)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ThoughtObjects */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                ThoughtObjects & Evidence
              </h2>
              <span className="text-sm text-slate-400">{thoughts.length} thoughts</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {thoughts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p>No thought objects yet</p>
                  <p className="text-xs mt-1">ThoughtObjects are stored in MINDEX when grounding is active</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {thoughts.map((t) => (
                    <div key={t.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">
                          {t.type}
                        </span>
                        {t.confidence != null && (
                          <span className="text-xs text-slate-500">
                            {(t.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 mt-1">{t.claim}</p>
                      {t.ep_id && (
                        <p className="text-xs text-slate-500 mt-1 font-mono">EP: {t.ep_id}</p>
                      )}
                      {t.evidence_links && t.evidence_links.length > 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          Evidence: {t.evidence_links.length} link(s)
                        </div>
                      )}
                      {t.created_at && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
