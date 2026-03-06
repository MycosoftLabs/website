"use client"

/**
 * Morgan Oversight Panel — March 7, 2026
 *
 * Single control/visibility surface for Morgan: MYCA state, tasks, confirmations,
 * grounding summary, workflow visibility. Super-admin only.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Crown,
  Home,
  Loader2,
  Package,
  RefreshCw,
  Activity,
  Zap,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSupabaseUser, useProfile } from "@/hooks/use-supabase-user"
import { MYCAStateWidget } from "@/components/myca/MYCAStateWidget"
import { MYCAFloatingButton } from "@/components/myca/MYCAFloatingButton"

interface GroundingSummary {
  status?: { enabled: boolean; thought_count: number; last_ep_id: string | null }
  experiencePackets?: unknown[]
  thoughtObjects?: unknown[]
  error?: string
}

export default function MorganOversightPage() {
  const { user, loading: authLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const [grounding, setGrounding] = useState<GroundingSummary | null>(null)
  const [loadingGrounding, setLoadingGrounding] = useState(true)

  const role = profile?.role || "user"
  const isSuperAdmin = role === "super_admin" && user?.email === "morgan@mycosoft.org"

  useEffect(() => {
    if (!isSuperAdmin) return
    const fetchGrounding = async () => {
      try {
        const res = await fetch("/api/grounding?limit=10")
        const json = await res.json()
        setGrounding(json)
      } catch {
        setGrounding({ error: "Failed to load" })
      } finally {
        setLoadingGrounding(false)
      }
    }
    fetchGrounding()
    const interval = setInterval(fetchGrounding, 60000)
    return () => clearInterval(interval)
  }, [isSuperAdmin])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
        <Crown className="h-16 w-16 text-amber-500/50 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Morgan Oversight</h1>
        <p className="text-slate-400 text-center max-w-md">
          This panel is for Morgan (super_admin) only. You do not have access.
        </p>
        <Link href="/dashboard" className="mt-6 text-emerald-400 hover:text-emerald-300">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const epCount = grounding?.experiencePackets?.length ?? 0
  const thoughtCount = grounding?.status?.thought_count ?? 0

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">Morgan Oversight</span>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Morgan Oversight
          </h1>
          <p className="text-slate-400 mt-1">
            Control and visibility surface for MYCA state, grounding, and autonomous work.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <MYCAStateWidget />

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                Grounding Summary
              </CardTitle>
              <Link href="/dashboard/grounding">
                <Button variant="ghost" size="sm" className="text-emerald-400">
                  Full dashboard
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingGrounding ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : grounding?.error ? (
                <p className="text-sm text-amber-500">{grounding.error}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-2xl font-bold text-white">{epCount}</div>
                    <div className="text-xs text-slate-500">Recent EPs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{thoughtCount}</div>
                    <div className="text-xs text-slate-500">Thought objects</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/myca">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <Brain className="w-8 h-8 text-emerald-400" />
                <div>
                  <CardTitle className="text-white">MYCA Chat</CardTitle>
                  <CardDescription className="text-slate-400">
                    Talk to MYCA, approve actions
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/grounding">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <Activity className="w-8 h-8 text-blue-400" />
                <div>
                  <CardTitle className="text-white">Grounding</CardTitle>
                  <CardDescription className="text-slate-400">
                    EP stream, ThoughtObjects
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/devices">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <Zap className="w-8 h-8 text-purple-400" />
                <div>
                  <CardTitle className="text-white">Devices</CardTitle>
                  <CardDescription className="text-slate-400">
                    MycoBrain, network status
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-amber-400" />
                <div>
                  <CardTitle className="text-white">Admin</CardTitle>
                  <CardDescription className="text-slate-400">
                    Control center
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">
              Direct links to MYCA surfaces
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors"
            >
              Fluid Search <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/natureos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors"
            >
              NatureOS <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/crep"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors"
            >
              CREP <ExternalLink className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </main>
      <MYCAFloatingButton title="MYCA" className="right-20" />
    </div>
  )
}
