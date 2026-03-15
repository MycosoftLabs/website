/**
 * Agent Dashboard — API key, balance, session state, recent usage
 * Created: March 14, 2026
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Key, Clock, Activity, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STORAGE_KEY = "mycosoft_raas_api_key"

interface WorldstateBalance {
  agent_id: string
  balance_minutes: number
  total_purchased_minutes: number
  total_used_minutes: number
}

interface SessionSummary {
  session_id: string
  agent_id: string
  started_at: string | null
  last_heartbeat_at: string | null
  stopped_at: string | null
  minutes_used: number
}

interface BalanceUsageResponse {
  agent_id: string
  balance_minutes: number
  total_purchased_minutes: number
  total_used_minutes: number
  active_session_id: string | null
  recent_sessions: SessionSummary[]
}

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••"
  return key.slice(0, 8) + "••••••••" + key.slice(-4)
}

export default function AgentDashboardPage() {
  const [apiKey, setApiKey] = useState("")
  const [savedKey, setSavedKey] = useState("")
  const [usage, setUsage] = useState<BalanceUsageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSavedKey(stored)
  }, [])

  const loadUsage = useCallback(async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mas/raas/worldstate/usage?limit=20", {
        headers: { "X-API-Key": key },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.detail ?? data?.error ?? `Error ${res.status}`)
        setUsage(null)
        return
      }
      setUsage(data as BalanceUsageResponse)
    } catch (e) {
      setError("Network error")
      setUsage(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveKey = () => {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, trimmed)
      setSavedKey(trimmed)
    }
    loadUsage(trimmed)
  }

  const handleLoadWithSaved = () => {
    if (savedKey) loadUsage(savedKey)
  }

  const handleClearKey = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
      setSavedKey("")
      setApiKey("")
      setUsage(null)
      setError(null)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Agent dashboard
          </h1>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agent">Back to Agent Access</Link>
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="w-4 h-4" />
              API key
            </CardTitle>
            <CardDescription>
              Enter your RaaS API key to view balance and usage. It is stored only in this browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedKey ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  readOnly
                  value={maskKey(savedKey)}
                  className="font-mono text-base"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleLoadWithSaved}
                    disabled={loading}
                    className="min-h-[44px] text-base"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleClearKey} className="min-h-[44px] text-base">
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="password"
                  placeholder="myca_raas_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-base min-h-[44px]"
                />
                <Button
                  onClick={handleSaveKey}
                  disabled={!apiKey.trim() || loading}
                  className="min-h-[44px] text-base"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & load"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {usage && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" />
                  Balance & plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold">{usage.balance_minutes} minutes</p>
                <p className="text-sm text-muted-foreground">
                  Total purchased: {usage.total_purchased_minutes} · Used: {usage.total_used_minutes}
                </p>
                {usage.active_session_id && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Active session: {usage.active_session_id.slice(0, 8)}…
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4" />
                  Recent sessions
                </CardTitle>
                <CardDescription>Per-minute usage for worldstate connection</CardDescription>
              </CardHeader>
              <CardContent>
                {usage.recent_sessions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sessions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {usage.recent_sessions.map((s) => (
                      <li
                        key={s.session_id}
                        className="flex justify-between items-center text-sm py-2 border-b last:border-0"
                      >
                        <span className="font-mono text-muted-foreground truncate max-w-[180px]">
                          {s.session_id}
                        </span>
                        <span className="font-medium">{s.minutes_used} min</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex flex-wrap gap-4 pt-4">
          <Button asChild className="min-h-[44px] text-base">
            <Link href="/agent">Buy more minutes</Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px] text-base">
            <Link href="/pricing#agent">Pricing</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
