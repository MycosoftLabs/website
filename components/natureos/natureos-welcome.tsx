"use client"

import Link from "next/link"
import useSWR from "swr"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Camera,
  Cpu,
  Gauge,
  Globe2,
  Layers,
  MapIcon,
  Radar,
  Radio,
  Satellite,
  Sparkles,
  Waves,
  Wind,
  Wrench,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FleetHealthResponse {
  total_devices: number
  online_devices: number
  stale_devices: number
  offline_devices: number
  uptime_pct: number
  timestamp: string
}

interface RegistryDevice {
  device_id: string
  status?: string
}

interface MINDEXStatsResponse {
  total_taxa?: number
  total_observations?: number
  genome_records?: number
  trait_records?: number
  observations_with_images?: number
  observations_with_location?: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load data")
  return response.json()
}

// Static counters that reflect the current CREP data pipeline — updated
// manually when the pipeline grows. The dynamic values (fleet/MINDEX)
// still come from live APIs below.
const CREP_COUNTERS = {
  entities: "865K+",
  projects: 11,
  deploymentSites: 5,
  cameras: 120,
  liveFeeds: 28,
} as const

export function NatureOSWelcome() {
  const { data: fleetHealth } = useSWR<FleetHealthResponse>(
    "/api/iot/insights/fleet-health",
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  const { data: networkData } = useSWR<{ devices?: RegistryDevice[] }>(
    "/api/devices/network?include_offline=true",
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  const { data: mindexStats } = useSWR<MINDEXStatsResponse>(
    "/api/natureos/mindex/stats",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  )

  const devices: RegistryDevice[] = Array.isArray(networkData?.devices)
    ? Array.from(networkData.devices)
    : []
  const onlineCount = devices.filter((d) => d?.status === "online").length

  const formatNumber = (n: number | undefined | null) =>
    typeof n === "number" ? n.toLocaleString() : "—"

  return (
    <div className="space-y-8">
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Hero: the world seen through devices, sensors and AI             */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#050a1a] via-[#0a1628] to-[#0a0f1e] p-6 text-white sm:p-8">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-300/80">
            <Sparkles className="h-3.5 w-3.5" />
            NatureOS · Earth Simulator · MINDEX · Fleet
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">
            The world seen through{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
              devices, sensors &amp; AI.
            </span>
          </h1>
          <p className="max-w-2xl text-sm text-cyan-100/70 sm:text-base">
            One pipeline, one planet. Live aircraft, vessels, satellites,
            wildlife, air quality, fires, cameras and Mycosoft's own fungal
            compute fabric — streamed from MINDEX, rendered in the Earth
            Simulator, and stitched into every NatureOS tool.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              asChild
              className="h-11 bg-gradient-to-r from-cyan-500 to-emerald-500 text-[#050a1a] hover:from-cyan-400 hover:to-emerald-400"
            >
              <Link href="/natureos/tools/earth-simulator">
                <Globe2 className="mr-2 h-4 w-4" />
                Open Earth Simulator
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 border-cyan-500/40 bg-white/5 text-cyan-100 hover:bg-cyan-500/10 hover:text-white"
            >
              <Link href="/natureos/mindex">
                <Layers className="mr-2 h-4 w-4" />
                Explore MINDEX
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 border-emerald-500/40 bg-white/5 text-emerald-100 hover:bg-emerald-500/10 hover:text-white"
            >
              <Link href="/natureos/devices/telemetry">
                <Activity className="mr-2 h-4 w-4" />
                Live Telemetry
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Earth Simulator (CREP) at-a-glance                               */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe2 className="h-4 w-4" /> Earth Simulator — live index
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos/tools/earth-simulator">Open globe →</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<Satellite className="h-4 w-4 text-cyan-400" />}
            label="Live entities"
            value={CREP_COUNTERS.entities}
            hint="aircraft · vessels · sats · nature"
          />
          <StatCard
            icon={<MapIcon className="h-4 w-4 text-amber-400" />}
            label="Active projects"
            value={CREP_COUNTERS.projects}
            hint="Oyster · Goffs · DC · NYC · Vegas · +5 deployment"
          />
          <StatCard
            icon={<Radio className="h-4 w-4 text-emerald-400" />}
            label="Deployment sites"
            value={CREP_COUNTERS.deploymentSites}
            hint="Yosemite · Zion · Yellowstone · Mendo · Starbase"
          />
          <StatCard
            icon={<Camera className="h-4 w-4 text-rose-400" />}
            label="Mapped cameras"
            value={CREP_COUNTERS.cameras}
            hint="NPS · EarthCam · YouTube Live · AlertWildfire · NDOT"
          />
          <StatCard
            icon={<Wind className="h-4 w-4 text-sky-400" />}
            label="Live data streams"
            value={CREP_COUNTERS.liveFeeds}
            hint="AQI · iNat SSE · transit · ADS-B · AIS · FIRMS"
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Devices & Fleet                                                  */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Cpu className="h-4 w-4" /> Mycosoft devices &amp; fleet
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos/devices/fleet">Manage fleet →</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Cpu className="h-4 w-4 text-cyan-400" />}
            label="Total Devices"
            value={formatNumber(fleetHealth?.total_devices)}
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-emerald-400" />}
            label="Online Now"
            value={formatNumber(onlineCount)}
            accentClass="text-emerald-400"
          />
          <StatCard
            icon={<Gauge className="h-4 w-4 text-amber-400" />}
            label="Fleet Uptime"
            value={
              fleetHealth?.uptime_pct != null
                ? `${fleetHealth.uptime_pct}%`
                : "—"
            }
          />
          <StatCard
            icon={<Waves className="h-4 w-4 text-sky-400" />}
            label="Last Update"
            value={
              fleetHealth?.timestamp
                ? new Date(fleetHealth.timestamp).toLocaleTimeString()
                : "—"
            }
            hint={
              fleetHealth?.timestamp
                ? new Date(fleetHealth.timestamp).toLocaleDateString()
                : undefined
            }
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Nature & Species (MINDEX)                                        */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Layers className="h-4 w-4" /> Nature &amp; species (MINDEX)
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos/mindex">View MINDEX</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Layers className="h-4 w-4 text-cyan-400" />}
            label="Total species"
            value={formatNumber(mindexStats?.total_taxa)}
            accentClass="text-cyan-400"
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4 text-emerald-400" />}
            label="Observations"
            value={formatNumber(mindexStats?.total_observations)}
          />
          <StatCard
            icon={<Radar className="h-4 w-4 text-violet-400" />}
            label="Genomes"
            value={formatNumber(mindexStats?.genome_records)}
          />
          <StatCard
            icon={<Camera className="h-4 w-4 text-rose-400" />}
            label="With images"
            value={formatNumber(mindexStats?.observations_with_images)}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Quick Actions                                                    */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/natureos/tools/earth-simulator"
            title="Earth Simulator"
            subtitle="865K+ live entities on one globe"
            icon={<Globe2 className="h-4 w-4 text-cyan-400" />}
          />
          <QuickAction
            href="/natureos/devices/registry"
            title="Device registry"
            subtitle="All MQTT / LoRa / Meshtastic nodes"
            icon={<Cpu className="h-4 w-4 text-cyan-400" />}
          />
          <QuickAction
            href="/natureos/devices/telemetry"
            title="Telemetry dashboard"
            subtitle="Live BME688 · VOC · CO₂e · RH"
            icon={<Activity className="h-4 w-4 text-emerald-400" />}
          />
          <QuickAction
            href="/natureos/devices/alerts"
            title="Alert center"
            subtitle="Offline nodes · sensor drift · anomalies"
            icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          />
          <QuickAction
            href="/natureos/devices/map"
            title="Device map"
            subtitle="Geospatial view · deployment sites · home lab"
            icon={<MapIcon className="h-4 w-4 text-rose-400" />}
          />
          <QuickAction
            href="/natureos/devices/fleet"
            title="Fleet management"
            subtitle="Groups · firmware · OTA rollouts"
            icon={<Radio className="h-4 w-4 text-violet-400" />}
          />
          <QuickAction
            href="/natureos/devices/insights"
            title="Insights"
            subtitle="AI summaries · trends · anomaly search"
            icon={<Brain className="h-4 w-4 text-fuchsia-400" />}
          />
          <QuickAction
            href="/natureos/mindex"
            title="MINDEX explorer"
            subtitle="Species · biodiversity · genomics"
            icon={<Layers className="h-4 w-4 text-cyan-400" />}
          />
          <QuickAction
            href="/natureos/sporebase"
            title="SporeBase"
            subtitle="Airborne spore detection network"
            icon={<Waves className="h-4 w-4 text-emerald-400" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Small helpers
// ──────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
  accentClass,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint?: string
  accentClass?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div
          className={`text-2xl font-semibold ${accentClass ?? "text-foreground"}`}
        >
          {value}
        </div>
        {hint ? (
          <div className="text-[11px] leading-snug text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function QuickAction({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto min-h-[68px] justify-start px-4 py-3 text-left"
    >
      <Link href={href} className="flex w-full items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <span className="flex flex-col">
          <span className="text-sm font-medium leading-snug">{title}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">
            {subtitle}
          </span>
        </span>
      </Link>
    </Button>
  )
}
