"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Bot, Brain, Loader2, RefreshCw, Zap, Activity, MessageSquare, Crown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface AgentConfig {
  id: string
  name: string
  type: "ai" | "service" | "automation"
  provider: string
  status: "active" | "inactive" | "error"
  enabled: boolean
  description: string
  lastActivity: string | null
  metrics?: { requests?: number; tokens?: number; errors?: number }
}

export function AgentsModule() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/agents")
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents || [])
      }
    } catch {
      toast.error("Failed to load agents")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])

  const toggleAgent = async (agentId: string, enabled: boolean) => {
    setActionLoading(agentId)
    try {
      const res = await fetch("/api/dashboard/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, enabled }),
      })
      if (res.ok) {
        setAgents((prev) => prev.map((a) =>
          a.id === agentId ? { ...a, enabled, status: enabled ? "active" : "inactive" } : a
        ))
        toast.success(`${enabled ? "Enabled" : "Disabled"} agent`)
      } else {
        toast.error("Failed to toggle agent")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400"
      case "inactive": return "bg-slate-700 text-slate-400"
      case "error": return "bg-red-500/20 text-red-400"
      default: return "bg-slate-700 text-slate-400"
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "ai": return Brain
      case "service": return Zap
      case "automation": return Activity
      default: return Bot
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  const aiAgents = agents.filter((a) => a.type === "ai")
  const serviceAgents = agents.filter((a) => a.type === "service")
  const automationAgents = agents.filter((a) => a.type === "automation")

  const renderGroup = (title: string, items: AgentConfig[]) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">{title}</h3>
        {items.map((agent) => {
          const Icon = typeIcon(agent.type)
          return (
            <Card key={agent.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    agent.status === "active" ? "bg-emerald-500/20" : "bg-slate-800"
                  )}>
                    <Icon className={cn("w-5 h-5", agent.status === "active" ? "text-emerald-400" : "text-slate-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{agent.name}</span>
                      <Badge className={cn("text-xs", statusColor(agent.status))}>{agent.status.toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {agent.provider} · {agent.description}
                    </div>
                    {agent.metrics && (
                      <div className="flex gap-3 mt-1 text-xs text-slate-500">
                        {agent.metrics.requests !== undefined && <span>{agent.metrics.requests} requests</span>}
                        {agent.metrics.tokens !== undefined && <span>{agent.metrics.tokens.toLocaleString()} tokens</span>}
                        {agent.metrics.errors !== undefined && agent.metrics.errors > 0 && (
                          <span className="text-red-400">{agent.metrics.errors} errors</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={agent.enabled}
                    onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                    disabled={actionLoading === agent.id}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Management</h2>
          <p className="text-slate-400 text-sm">{agents.filter(a => a.enabled).length} of {agents.length} agents enabled</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/morgan"
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
          >
            <Crown className="w-4 h-4" />
            MYCA Oversight
          </Link>
          <button
            onClick={fetchAgents}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {renderGroup("AI Agents", aiAgents)}
      {renderGroup("Service Agents", serviceAgents)}
      {renderGroup("Automation", automationAgents)}
    </div>
  )
}
