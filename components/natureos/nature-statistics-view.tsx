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

const FALLBACKS: Record<
  KingdomType,
  { species: number; observations: number; images: number; co2: number; methane: number; water: number }
> = {
  plants: { species: 341000, observations: 54000000, images: 12000000, co2: -458000000, methane: 650000, water: 62000000 },
  birds: { species: 11000, observations: 89000000, images: 24000000, co2: 890000, methane: 1200, water: 150 },
  insects: { species: 1000000, observations: 42000000, images: 8500000, co2: 480000, methane: 12500, water: 82 },
  animals: { species: 72000, observations: 31000000, images: 18000000, co2: 2150000, methane: 8800, water: 45000 },
  marine: { species: 240000, observations: 68000000, images: 22000000, co2: -9500000, methane: 38000, water: 0 },
  mammals: { species: 6500, observations: 19000000, images: 11000000, co2: 5200000, methane: 329000, water: 95800 },
  protista: { species: 60000, observations: 8200000, images: 1200000, co2: -15000000, methane: 45000, water: 12000 },
  bacteria: { species: 12000, observations: 4500000, images: 980000, co2: 85000000, methane: 580000, water: 0 },
  archaea: { species: 400, observations: 120000, images: 45000, co2: 12000000, methane: 420000, water: 0 },
}

function getKingdomProps(
  kingdom: KingdomType,
  live: KingdomData | null | undefined,
  fallback: (typeof FALLBACKS)[KingdomType]
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
              {statsError && <p className="text-sm text-amber-600">Live species stats unavailable; showing catalog defaults.</p>}
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
            <CardUI.Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardUI.CardHeader className="p-3 pb-2">
                <CardUI.CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-400" />
                  MYCA Agents
                </CardUI.CardTitle>
                <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 w-fit">
                  Live
                </Badge>
              </CardUI.CardHeader>
              <CardUI.CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-purple-400 tabular-nums">
                  {totalAgents > 0 ? totalAgents.toLocaleString() : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Registered</p>
                {activeAgents > 0 && (
                  <p className="text-xs text-green-400 mt-1">{activeAgents} active</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">MAS registry</p>
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
                  FALLBACKS[kingdom]
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
