"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Shield, ShieldAlert, ShieldX, Lock, Power, AlertTriangle,
  Loader2, RefreshCw, AlertOctagon, CheckCircle, Eye
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface SecurityState {
  lockdown: { active: boolean; activatedAt: string | null; activatedBy: string | null }
  killSwitch: { active: boolean; activatedAt: string | null }
  threatLevel: string
  eventsToday: number
  criticalEvents: number
  failedLogins24h: number
  blockedIps: number
  activeSessions: number
}

export function SecurityModule() {
  const [state, setState] = useState<SecurityState | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<"lockdown" | "kill-switch" | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const fetchState = async () => {
    try {
      const res = await fetch("/api/dashboard/security/lockdown")
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleLockdown = async () => {
    if (!state) return
    const newState = !state.lockdown.active

    if (newState && confirmDialog !== "lockdown") {
      setConfirmDialog("lockdown")
      setConfirmText("")
      return
    }

    if (newState && confirmText !== "LOCKDOWN") {
      toast.error('Type "LOCKDOWN" to confirm')
      return
    }

    setActionLoading("lockdown")
    try {
      const res = await fetch("/api/dashboard/security/lockdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newState }),
      })
      if (res.ok) {
        const data = await res.json()
        setState((prev) => prev ? { ...prev, lockdown: data.lockdown } : prev)
        toast.success(newState ? "Lockdown activated" : "Lockdown deactivated")
      } else {
        toast.error("Failed to toggle lockdown")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
      setConfirmDialog(null)
      setConfirmText("")
    }
  }

  const handleKillSwitch = async () => {
    if (!state) return
    const newState = !state.killSwitch.active

    if (newState && confirmDialog !== "kill-switch") {
      setConfirmDialog("kill-switch")
      setConfirmText("")
      return
    }

    if (newState && confirmText !== "KILL") {
      toast.error('Type "KILL" to confirm')
      return
    }

    setActionLoading("kill-switch")
    try {
      const res = await fetch("/api/dashboard/security/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newState }),
      })
      if (res.ok) {
        const data = await res.json()
        setState((prev) => prev ? { ...prev, killSwitch: data.killSwitch } : prev)
        toast.success(newState ? "Kill switch activated — site in maintenance mode" : "Kill switch deactivated — site restored")
      } else {
        toast.error("Failed to toggle kill switch")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
      setConfirmDialog(null)
      setConfirmText("")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  const threatColor = state?.threatLevel === "critical" ? "text-red-400 bg-red-500/20" :
    state?.threatLevel === "high" ? "text-orange-400 bg-orange-500/20" :
    state?.threatLevel === "elevated" ? "text-amber-400 bg-amber-500/20" :
    "text-green-400 bg-green-500/20"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Security Controls</h2>
          <p className="text-slate-400 text-sm">Emergency controls and threat monitoring</p>
        </div>
        <Link
          href="/dashboard/soc"
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <Eye className="w-4 h-4" />
          Full SOC
        </Link>
      </div>

      {/* Threat Level Banner */}
      <Card className={cn("border",
        state?.threatLevel === "critical" ? "bg-red-500/10 border-red-500/30" :
        state?.threatLevel === "high" ? "bg-orange-500/10 border-orange-500/30" :
        state?.threatLevel === "elevated" ? "bg-amber-500/10 border-amber-500/30" :
        "bg-green-500/10 border-green-500/30"
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={cn("w-8 h-8", threatColor.split(" ")[0])} />
              <div>
                <div className="text-lg font-bold text-white">
                  Threat Level: <span className={threatColor.split(" ")[0]}>{state?.threatLevel?.toUpperCase()}</span>
                </div>
                <div className="text-sm text-slate-400">{state?.eventsToday ?? 0} events today, {state?.criticalEvents ?? 0} critical</div>
              </div>
            </div>
            <Badge className={cn("text-sm px-3 py-1", threatColor)}>{state?.threatLevel?.toUpperCase()}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Lockdown Control */}
        <Card className={cn("border", state?.lockdown.active ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-800/50 border-slate-700")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className={cn("w-5 h-5", state?.lockdown.active ? "text-amber-400" : "text-slate-400")} />
              Site Lockdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              Restrict all routes to SUPER_ADMIN access only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-medium", state?.lockdown.active ? "text-amber-400" : "text-slate-300")}>
                {state?.lockdown.active ? "ACTIVE" : "Inactive"}
              </span>
              <Switch
                checked={state?.lockdown.active ?? false}
                onCheckedChange={() => handleLockdown()}
                disabled={actionLoading === "lockdown"}
              />
            </div>
            {state?.lockdown.active && state.lockdown.activatedAt && (
              <div className="text-xs text-slate-500">
                Activated: {new Date(state.lockdown.activatedAt).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kill Switch Control */}
        <Card className={cn("border", state?.killSwitch.active ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/50 border-slate-700")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Power className={cn("w-5 h-5", state?.killSwitch.active ? "text-red-400" : "text-slate-400")} />
              Kill Switch
            </CardTitle>
            <CardDescription className="text-slate-400">
              Put entire site in maintenance mode (503 for all non-admin)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-medium", state?.killSwitch.active ? "text-red-400" : "text-slate-300")}>
                {state?.killSwitch.active ? "ACTIVE — SITE DOWN" : "Inactive"}
              </span>
              <Switch
                checked={state?.killSwitch.active ?? false}
                onCheckedChange={() => handleKillSwitch()}
                disabled={actionLoading === "kill-switch"}
              />
            </div>
            {state?.killSwitch.active && state.killSwitch.activatedAt && (
              <div className="text-xs text-slate-500">
                Activated: {new Date(state.killSwitch.activatedAt).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertOctagon className="w-5 h-5" />
                <span className="font-bold">
                  {confirmDialog === "lockdown" ? "Confirm Lockdown Activation" : "Confirm Kill Switch Activation"}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                {confirmDialog === "lockdown"
                  ? 'This will restrict ALL routes to SUPER_ADMIN access. Type "LOCKDOWN" to confirm.'
                  : 'This will take the ENTIRE site offline (503). Type "KILL" to confirm.'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmDialog === "lockdown" ? "LOCKDOWN" : "KILL"}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-red-500"
                  autoFocus
                />
                <button
                  onClick={confirmDialog === "lockdown" ? handleLockdown : handleKillSwitch}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </button>
                <button
                  onClick={() => { setConfirmDialog(null); setConfirmText("") }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-white">{state?.failedLogins24h ?? 0}</div>
            <div className="text-xs text-slate-500">Failed Logins (24h)</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-white">{state?.blockedIps ?? 0}</div>
            <div className="text-xs text-slate-500">Blocked IPs</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-white">{state?.activeSessions ?? 0}</div>
            <div className="text-xs text-slate-500">Active Sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-white">{state?.eventsToday ?? 0}</div>
            <div className="text-xs text-slate-500">Events Today</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
