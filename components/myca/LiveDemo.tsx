"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MYCAConsciousnessStatus } from "@/components/mas/myca-consciousness-status"
import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget"
import { MYCALiveActivityPanel } from "@/components/myca/MYCALiveActivityPanel"
import { MYCADataBridge } from "@/components/myca/MYCADataBridge"
import { useMYCA } from "@/contexts/myca-context"

const MYCALiveDemoBackground = dynamic(
  () => import("@/components/myca/MYCALiveDemoBackground").then((m) => m.MYCALiveDemoBackground),
  { ssr: false }
)
import { Brain, Globe2, MessageSquare, Users, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const CHAT_PANEL_HEIGHT = 400

interface AgentInfo {
  agent_id: string
  name: string
  shortName: string
  status: string
  category: string
  description: string
}

function LiveDemoAgentsTab() {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/mas/agents", {
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        setAgents(data.agents || [])
      } catch {
        if (!cancelled) setAgents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = Array.from(
    new Set(agents.map((a) => a.category).filter(Boolean))
  ).sort()

  const filtered =
    categoryFilter === null
      ? agents
      : agents.filter((a) => a.category === categoryFilter)

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agents...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-bold mb-2">Agent Coordination</h3>
        <p className="text-sm text-muted-foreground mb-4">
          MYCA coordinates {agents.length}+ specialized agents across 14 categories.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] touch-manipulation",
              categoryFilter === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            All
          </button>
          {categories.slice(0, 12).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize min-h-[44px] touch-manipulation",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
          {filtered.slice(0, 80).map((a) => (
            <div
              key={a.agent_id}
              className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
            >
              <div className="font-medium truncate">{a.name}</div>
              <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
                {a.category}
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {a.description}
                </p>
              )}
              <Badge
                variant={a.status === "active" ? "default" : "secondary"}
                className="mt-1.5 text-[9px] h-4"
              >
                {a.status}
              </Badge>
            </div>
          ))}
        </div>
        {filtered.length > 80 && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing 80 of {filtered.length} agents. Use category filters.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface WorldState {
  sensors?: Record<string, unknown>
  crep?: Record<string, unknown>
  earth2?: Record<string, unknown>
  mindex?: Record<string, unknown>
  error?: string
}

const SUGGESTED_PROMPTS = [
  "What is your world state right now?",
  "How do you differ from ChatGPT?",
  "Explain your consciousness architecture",
]

type FlowDirection = "user-to-myca" | "myca-to-user" | "idle"

export function LiveDemo({ className }: { className?: string }) {
  const [world, setWorld] = useState<WorldState | null>(null)
  const [worldLoading, setWorldLoading] = useState(true)
  const [activityOpen, setActivityOpen] = useState(false)
  const [flowDirection, setFlowDirection] = useState<FlowDirection>("idle")
  const { isLoading, lastResponseMetadata } = useMYCA()

  // Derive flow direction: user→MYCA when sending/thinking, MYCA→user when responding
  useEffect(() => {
    if (isLoading) {
      setFlowDirection("user-to-myca")
    } else if (lastResponseMetadata) {
      setFlowDirection("myca-to-user")
      const t = setTimeout(() => setFlowDirection("idle"), 3000)
      return () => clearTimeout(t)
    } else {
      setFlowDirection("idle")
    }
  }, [isLoading, lastResponseMetadata])

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const res = await fetch("/api/myca/consciousness/world", {
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (res.ok) {
          const data = await res.json()
          setWorld(data)
        } else {
          setWorld({ error: "Unable to load world state" })
        }
      } catch (e) {
        setWorld({
          error:
            e instanceof Error && e.name === "AbortError"
              ? "Request timed out — MAS may be offline"
              : "Failed to connect to consciousness API",
        })
      } finally {
        setWorldLoading(false)
      }
    }
    fetchWorld()
    const interval = setInterval(fetchWorld, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className={cn("relative py-16 md:py-24 overflow-hidden", className)}>
      <MYCALiveDemoBackground />
      <div className="container relative z-10 max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-500 mb-2">Live Demo</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience MYCA</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time consciousness, world perception, and conversation.
          </p>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 p-2 touch-manipulation">
            <TabsTrigger value="chat" className="min-h-[44px] gap-2 text-sm touch-manipulation">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="consciousness" className="min-h-[44px] gap-2 text-sm touch-manipulation">
              <Brain className="h-4 w-4" />
              Consciousness
            </TabsTrigger>
            <TabsTrigger value="world" className="min-h-[44px] gap-2 text-sm touch-manipulation">
              <Globe2 className="h-4 w-4" />
              World
            </TabsTrigger>
            <TabsTrigger value="agents" className="min-h-[44px] gap-2 text-sm touch-manipulation">
              <Users className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-stretch">
              {/* LEFT: User stream (single) — typing, speaking, receiving */}
              <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">User</span>
                  <span className="text-[10px] text-muted-foreground">— single stream</span>
                </div>
                <p className="text-sm text-muted-foreground">Suggested prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <span key={p} className="text-xs px-3 py-1.5 rounded-lg bg-muted">
                      {p}
                    </span>
                  ))}
                </div>
                <div
                  className="overflow-hidden shrink-0 border border-border rounded-xl"
                  style={{ height: CHAT_PANEL_HEIGHT, minHeight: 320 }}
                >
                  <MYCAChatWidget showHeader title="Chat with MYCA" className="h-full min-h-0" />
                </div>
              </div>

              {/* Data bridge — flow: user→MYCA when typing/sending, MYCA→user when responding */}
              <div className="hidden lg:flex items-stretch">
                <MYCADataBridge
                  height={CHAT_PANEL_HEIGHT}
                  flowDirection={flowDirection}
                />
              </div>

              {/* RIGHT: MYCA stream (large) — orchestrator, agents, consciousness */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-green-500">MYCA</span>
                  <span className="text-[10px] text-muted-foreground">— multiple streams, all interactions</span>
                </div>
                <div className="hidden lg:block min-h-0 overflow-hidden" style={{ height: CHAT_PANEL_HEIGHT, minHeight: 320 }}>
                  <MYCALiveActivityPanel className="h-full min-h-0" />
                </div>
                <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="lg:hidden">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation">
                    {activityOpen ? "Hide" : "Show"} MYCA streams
                    {activityOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3" style={{ minHeight: 280 }}>
                      <MYCALiveActivityPanel className="h-full min-h-[200px]" />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="consciousness" className="mt-6">
            <MYCAConsciousnessStatus variant="full" refreshInterval={30000} />
          </TabsContent>

          <TabsContent value="world" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-4">World Perception</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  What MYCA perceives from sensors and data sources:
                </p>
                {worldLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading world state...
                  </div>
                ) : world?.error ? (
                  <p className="text-amber-600 dark:text-amber-400">
                    {world.error} — Ensure MAS is running at 192.168.0.188:8001
                  </p>
                ) : world ? (
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                    {JSON.stringify(world, null, 2)}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="mt-6">
            <LiveDemoAgentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
