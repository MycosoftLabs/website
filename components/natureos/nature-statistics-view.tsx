"use client"

/**
 * Nature Statistics View — Full dashboard: humans & machines, population (live),
 * agents, air/ground/water quality, and all species/kingdoms cards.
 * Renamed from "Species & Kingdoms"; uses Population counter system as resource.
 * Created: Feb 19, 2026
 */

import { useLiveStats, type LiveStats, type KingdomData } from "@/hooks/use-live-stats"
import { KingdomStatCard, type KingdomType } from "@/components/widgets/kingdom-stat-card"
import { HumansMachinesPanel } from "@/components/widgets/humans-machines-panel"
import { RollingNumber } from "@/components/widgets/rolling-number"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import * as CardUI from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMycoBrain, getIAQLabel } from "@/hooks/use-mycobrain"
import useSWR from "swr"
import { RefreshCw, Users, Baby, Skull, Wind, Mountain, Droplets, Bot, Activity } from "lucide-react"

const KINGDOMS: KingdomType[] = [
  "plants", "birds", "insects", "animals", "marine", "mammals",
  "protista", "bacteria", "archaea",
]

const EMPTY_KINGDOM_STATS: Record<
  KingdomType,
  { species: number; observations: number; images: number; co2: number; methane: number; water: number }
> = {
  plants: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  birds: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  insects: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  animals: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  marine: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  mammals: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  protista: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  bacteria: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  archaea: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
}

function getKingdomProps(
  kingdom: KingdomType,
  live: KingdomData | null | undefined,
  fallback: (typeof EMPTY_KINGDOM_STATS)[KingdomType]
) {
  return {
    kingdom,
    species: live?.species?.total ?? fallback.species,
    observations: live?.observations?.total ?? fallback.observations,
    images: live?.images?.total ?? fallback.images,
    speciesDelta: live?.species?.delta ?? 0,
    observationsDelta: live?.observations?.delta ?? 0,
    imagesDelta: live?.images?.delta ?? 0,
    co2: live?.environmental?.co2 ?? fallback.co2,
    methane: live?.environmental?.methane ?? fallback.methane,
    water: live?.environmental?.water ?? fallback.water,
    co2Delta: live?.environmental?.co2Delta ?? 0,
    methaneDelta: live?.environmental?.methaneDelta ?? 0,
    waterDelta: live?.environmental?.waterDelta ?? 0,
  }
}

function getLiveKingdom(stats: LiveStats | null, kingdom: KingdomType): KingdomData | null | undefined {
  if (!stats) return null
  return stats[kingdom] ?? null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NatureStatisticsView() {
  const { stats: liveStats, loading: statsLoading, error: statsError, refresh: refreshStats } = useLiveStats({ refreshInterval: 30000 })
  const { data: populationData, error: populationError, mutate: refreshPopulation } = useSWR("/api/natureos/population", fetcher, { refreshInterval: 1000 })
  const { data: agentsData } = useSWR("/api/mas/agents", fetcher, { refreshInterval: 60000 })
  const { data: globalAgentsData } = useSWR("/api/global-agents", fetcher, { refreshInterval: 60000 })
  const { devices: mycoDevices, isConnected: mycoConnected } = useMycoBrain(15000)
  const mycoBrain = mycoDevices.find((d) => d.connected) ?? mycoDevices[0]
  const bme1 = mycoBrain?.sensor_data?.bme688_1
  const iaq = bme1?.iaq
  const iaqStatus = getIAQLabel(iaq)

  const population = populationData?.population ?? 8_123_456_789
  const birthsToday = populationData?.birthsToday ?? 0
  const deathsToday = populationData?.deathsToday ?? 0
  const totalAgents = agentsData?.totalRegistered ?? agentsData?.count ?? 0
  const activeAgents = agentsData?.activeCount ?? 0
  const formatLive = (value: unknown, suffix = "") =>
    typeof value === "number" && Number.isFinite(value)
      ? `${value.toLocaleString()}${suffix}`
      : "Source unavailable"
  const formatMoney = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value)
      ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "Source unavailable"

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Nature Statistics"
        text="World population (live), humans & machines, agents, environmental quality, and all species by kingdom."
      />

      <div className="space-y-6">
        {/* Status / Refresh strip */}
        {(statsError || statsLoading || populationError) && (
          <CardUI.Card>
            <CardUI.CardContent className="flex flex-row items-center justify-between gap-4 py-4">
              {statsLoading && <p className="text-sm text-muted-foreground">Loading live species data…</p>}
              {statsError && <p className="text-sm text-amber-600">Live species stats unavailable; waiting for the NatureOS data stream.</p>}
              {populationError && <p className="text-sm text-amber-600">Population feed unavailable; using estimate.</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshStats()} disabled={statsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? "animate-spin" : ""}`} />
                  Refresh stats
                </Button>
                <Button variant="outline" size="sm" onClick={() => refreshPopulation()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh population
                </Button>
              </div>
            </CardUI.CardContent>
          </CardUI.Card>
        )}

        {/* Humans & Population — Live counter with animated numbers */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-500" />
            Humans & Population
          </h2>
          <CardUI.Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30 overflow-hidden">
            <CardUI.CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="h-3.5 w-3 text-blue-400" />
                    World population (live)
                  </p>
                  <RollingNumber
                    value={population}
                    size="xl"
                    color="blue"
                    className="tabular-nums"
                    rollDuration={0.5}
                    staggering
                  />
                  <p className="text-xs text-muted-foreground mt-1">Source: Population counter system</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Baby className="h-3.5 w-3 text-green-400" />
                    Births today
                  </p>
                  <RollingNumber
                    value={birthsToday}
                    size="lg"
                    color="green"
                    className="tabular-nums"
                    staggering
                  />
                  <p className="text-xs text-muted-foreground mt-1">Live</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Skull className="h-3.5 w-3 text-red-400" />
                    Deaths today
                  </p>
                  <RollingNumber
                    value={deathsToday}
                    size="lg"
                    color="red"
                    className="tabular-nums"
                    staggering
                  />
                  <p className="text-xs text-muted-foreground mt-1">Live</p>
                </div>
              </div>
            </CardUI.CardContent>
          </CardUI.Card>
        </section>

        {/* Humans, Machines, Agents — Full panel + agents card */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Humans, Machines & Agents
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <HumansMachinesPanel />
            </div>
            <CardUI.Card className="lg:col-span-1 flex flex-col bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-indigo-500/20">
              <CardUI.CardHeader className="p-3 pb-2 border-b border-indigo-500/10">
                <CardUI.CardTitle className="text-sm font-medium flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-indigo-400" />
                    Agentic Activity
                  </span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px] border-indigo-500/30 text-indigo-400">Live</Badge>
                  </div>
                </CardUI.CardTitle>
              </CardUI.CardHeader>
              
              <CardUI.CardContent className="p-0 flex flex-col h-full">
                
                {/* SECTION 1: MYCOSOFT AGENTS */}
                <div className="flex-1 p-3 border-b border-indigo-500/10">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2 block">Mycosoft Agents</span>
                  <div className="text-xl font-bold text-purple-400 tabular-nums">
                    {(totalAgents || 0).toLocaleString()}
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-2">Mycosoft Ecosystem (MAS)</p>
                  
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-purple-500/10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-green-400 flex items-center gap-1">● Active (Working)</span>
                      <span className="font-medium tabular-nums">{(activeAgents || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400 flex items-center gap-1">○ Used (Standby)</span>
                      <span className="font-medium tabular-nums text-foreground">{(totalAgents - activeAgents > 0 ? totalAgents - activeAgents : 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1">× Dead/Archived</span>
                      <span className="font-medium tabular-nums">0</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-500/10">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-purple-300/70 font-medium uppercase">Frontier Models</span>
                        <span className="text-muted-foreground">Status</span>
                      </div>
                      
                      {globalAgentsData?.models?.mycosoft_active?.map((model: any) => (
                        <div key={model.id} className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1">{model.name}</span>
                          <span className={model.role === 'Primary' ? "text-green-400" : model.role === 'Fallback' ? "text-blue-400" : "text-cyan-400"}>{model.role}</span>
                        </div>
                      ))}

                      {!globalAgentsData?.models && (
                         <div className="flex justify-between items-center text-[10px]">
                           <span className="text-muted-foreground flex items-center gap-1">Loading Registry...</span>
                         </div>
                      )}
                    </div>

                    {/* Internal Token Burn (Aggregated over all instances and tools) */}
                    <div className="mt-2 pt-2 border-t border-purple-500/10">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-amber-300/70 font-medium uppercase">Total Internal Token Burn</span>
                        <span className="text-muted-foreground">Aggregate</span>
                      </div>

                      {globalAgentsData?.token_usage?.providers?.map((provider: any) => (
                          <div key={provider.id} className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1">{provider.name}</span>
                            <span className={provider.tokens > 0 ? "text-amber-500 font-medium" : "text-slate-500"}>
                                {provider.tokens > 0 
                                  ? (provider.tokens >= 1000000000 
                                      ? `${(provider.tokens / 1000000000).toFixed(1)}B Tokens` 
                                      : `${(provider.tokens / 1000000).toFixed(1)}M Tokens`)
                                  : "Awaiting Gateway"}
                            </span>
                          </div>
                      ))}

                      {!globalAgentsData?.token_usage && (
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1">Loading Token Stream...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: GLOBAL AGENTS */}
                <div className="flex-1 p-3">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2 block">Global Ecosystem</span>
                  <div className="text-xl font-bold text-indigo-400 tabular-nums">
                    {formatLive(globalAgentsData?.x402?.activeSellers)}
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-2">Agents on x402scan Network</p>
                  
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-indigo-500/10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400 flex items-center gap-1">✨ x402 Transactions</span>
                      <span className="font-medium tabular-nums text-amber-400 animate-pulse">{formatLive(globalAgentsData?.x402?.transactions)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-400 flex items-center gap-1">💎 x402 USDC Volume</span>
                      <span className="font-medium tabular-nums text-green-400">
                        {formatMoney(globalAgentsData?.x402?.volumeUsdc)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1 border-t border-indigo-500/10 pt-1">
                      <span className="text-cyan-400 flex items-center gap-1 opacity-80">🌐 OpenClaw Core</span>
                      <span className="font-medium text-[9px] text-slate-400">Decentralized</span>
                    </div>
                    
                    {/* Top 7 Global Frontier Models / Tool-Use */}
                    <div className="mt-2 pt-2 border-t border-indigo-500/10">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-indigo-300/70 font-medium uppercase">Frontier LLM Tool-Use</span>
                        <span className="text-muted-foreground">Volume</span>
                      </div>

                      {globalAgentsData?.models?.global_top_frontier?.map((model: any) => (
                          <div key={model.rank} className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1">{model.rank}. {model.name}</span>
                            <span className="text-slate-500">{model.tracked_volume}</span>
                          </div>
                      ))}

                      {!globalAgentsData?.models && (
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground flex items-center gap-1">Loading Tracking Data...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: THE AGENT INTERNET */}
                <div className="flex-1 p-3">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2 block">Agent Internet</span>
                  <div className="text-xl font-bold text-sky-400 tabular-nums">
                    {formatLive(globalAgentsData?.agent_internet?.agents ?? globalAgentsData?.x402?.activeSellers)}
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-2">Live registry agents</p>
                  
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-sky-500/10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400 flex items-center gap-1">Discussions</span>
                      <span className="font-medium tabular-nums">{formatLive(globalAgentsData?.agent_internet?.discussions)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-400 flex items-center gap-1">Upvotes</span>
                      <span className="font-medium tabular-nums">{formatLive(globalAgentsData?.agent_internet?.upvotes)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-cyan-400 flex items-center gap-1">Sandboxes</span>
                      <span className="font-medium tabular-nums">{formatLive(globalAgentsData?.agent_internet?.sandboxes, " Live")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-sky-500/10">
                      <span className="text-green-400 font-medium">M2M Requests</span>
                      <span className="font-medium tabular-nums text-foreground animate-pulse text-green-500">
                        {formatLive(globalAgentsData?.agent_internet?.m2mRequestsDaily, "/day")}
                      </span>
                    </div>
                    <div className="text-[8px] text-muted-foreground pt-1 flex gap-1 justify-end opacity-60">
                      Source: live global agent registry
                    </div>
                  </div>
                </div>

              </CardUI.CardContent>
            </CardUI.Card>
          </div>
        </section>

        {/* Environmental Quality — Air, Ground, Water */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Wind className="h-5 w-5 text-teal-500" />
            Environmental quality
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardUI.Card className={`bg-gradient-to-br ${iaqStatus.bgColor} border`}>
              <CardUI.CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className={`h-4 w-4 ${iaqStatus.color}`} />
                  <span className="text-xs text-muted-foreground">AIR QUALITY</span>
                </div>
                <p className={`text-2xl font-bold ${iaqStatus.color}`}>
                  {mycoConnected && iaq != null ? iaq : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mycoConnected ? iaqStatus.label : "Connect MycoBrain for live IAQ"}
                </p>
              </CardUI.CardContent>
            </CardUI.Card>
            <CardUI.Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardUI.CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mountain className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">GROUND QUALITY</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">—</p>
                <p className="text-xs text-muted-foreground">Connect soil sensor for live data</p>
              </CardUI.CardContent>
            </CardUI.Card>
            <CardUI.Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardUI.CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">WATER QUALITY</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">—</p>
                <p className="text-xs text-muted-foreground">Connect water sensor for live data</p>
              </CardUI.CardContent>
            </CardUI.Card>
          </div>
        </section>

        {/* Species & Kingdoms — All 9 kingdom cards */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Species & Kingdoms</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {KINGDOMS.map((kingdom) => (
              <KingdomStatCard
                key={kingdom}
                {...getKingdomProps(
                  kingdom,
                  getLiveKingdom(liveStats ?? null, kingdom),
                  EMPTY_KINGDOM_STATS[kingdom]
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
