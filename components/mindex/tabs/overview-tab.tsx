"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Activity, BookOpen, Cpu, Database, MapPin, Server, Wifi } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GlassCard } from "@/components/ui/glowing-border"

import type {
  MINDEXHealth,
  MINDEXStats,
  MindexConsole,
  MindexFieldDeviceSummary,
  MindexHealthAll,
  Observation,
} from "./mindex-dashboard-types"
import { MindexStatCard } from "./mindex-stat-card"

const EARTH_FEED_KEYS = [
  "aircraft",
  "vessels",
  "satellites",
  "fungalObservations",
  "globalEvents",
  "devices",
  "weather",
  "emissions",
  "infrastructure",
  "spaceWeather",
] as const

const EARTH_FEED_META: Record<(typeof EARTH_FEED_KEYS)[number], { label: string; source: string }> = {
  aircraft: { label: "Aircraft", source: "OEI FlightRadar24" },
  vessels: { label: "Vessels", source: "OEI AISstream" },
  satellites: { label: "Satellites", source: "OEI orbital catalog" },
  fungalObservations: { label: "Fungal observations", source: "CREP fungal atlas" },
  globalEvents: { label: "Global events", source: "NatureOS event layer" },
  devices: { label: "CREP devices", source: "CREP MycoBrain feed" },
  weather: { label: "Weather alerts", source: "MINDEX weather domain" },
  emissions: { label: "Emission sources", source: "MINDEX emissions domain" },
  infrastructure: { label: "Infrastructure", source: "MINDEX infrastructure domain" },
  spaceWeather: { label: "Space weather", source: "OEI space-weather feed" },
}

const MINDEX_SOURCE_PROFILES = [
  {
    label: "iNaturalist",
    aliases: ["iNaturalist", "inat"],
    jobs: ["inat_taxa", "inat_obs", "taxon_photos"],
    domain: "All-life taxonomy, observations, images",
  },
  {
    label: "GBIF",
    aliases: ["GBIF", "gbif"],
    jobs: ["gbif"],
    domain: "Occurrence records and biodiversity joins",
  },
  {
    label: "MycoBank",
    aliases: ["MycoBank", "mycobank"],
    jobs: ["mycobank"],
    domain: "Fungal names and synonyms",
  },
  {
    label: "GenBank",
    aliases: ["GenBank", "genbank"],
    jobs: ["genetics"],
    domain: "Genetic sequences",
  },
  {
    label: "FungiDB",
    aliases: ["FungiDB", "fungidb"],
    jobs: ["fungidb"],
    domain: "Genome metadata",
  },
  {
    label: "PubChem",
    aliases: ["PubChem", "pubchem"],
    jobs: ["pubchem"],
    domain: "Compounds and molecular metadata",
  },
  {
    label: "ChemSpider",
    aliases: ["ChemSpider", "chemspider"],
    jobs: ["chemspider"],
    domain: "Compound cross-references",
  },
  {
    label: "Mushroom.World + Wikipedia",
    aliases: ["Mushroom.World + Wikipedia", "traits"],
    jobs: ["traits"],
    domain: "Trait backfill",
  },
  {
    label: "iNat/GBIF/Wikipedia media",
    aliases: ["iNat/GBIF/Wikipedia", "hq_media"],
    jobs: ["hq_media"],
    domain: "High-quality media derivatives",
  },
  {
    label: "PubMed / Semantic Scholar",
    aliases: ["PubMed/GBIF/SemanticScholar", "publications"],
    jobs: ["publications"],
    domain: "Research publications",
  },
  {
    label: "TheYeasts.org",
    aliases: ["TheYeasts.org", "theyeasts"],
    jobs: ["theyeasts"],
    domain: "Yeast species",
  },
  {
    label: "Fusarium.org",
    aliases: ["Fusarium.org", "fusarium"],
    jobs: ["fusarium"],
    domain: "Fusarium species",
  },
  {
    label: "Mushroom.World",
    aliases: ["Mushroom.World", "mushroom_world"],
    jobs: ["mushroom_world"],
    domain: "Mushroom species",
  },
  {
    label: "Ancestry enrichment",
    aliases: ["MINDEX", "ancestry"],
    jobs: ["ancestry"],
    domain: "Species completeness, images, descriptions",
  },
] as const

type EarthUnifiedPayload = {
  success?: boolean
  counts?: Record<string, unknown>
  data?: Record<string, unknown>
  timestamp?: string
  error?: string
}

type EarthFeedState = {
  loading: boolean
  counts: Record<string, number>
  timestamp?: string
  error?: string
}

type EarthDetailRow = {
  key: string
  label: string
  source: string
  count: number | null
  note?: string
  emptyLabel?: string
}

type SourceRow = {
  key: string
  label: string
  domain: string
  loadedCount: number
  registered: boolean
  jobNames: string[]
}

type BiologyRow = {
  label: string
  value: number | null
  source: string
  note?: string
  emptyLabel?: string
}

function countValue(value: unknown): number {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

function nullableCount(value: unknown): number | null {
  const count = Number(value)
  return Number.isFinite(count) ? count : null
}

function formatCount(value: number | null | undefined): string {
  return value == null ? "--" : value.toLocaleString()
}

function countFromPayload(payload: EarthUnifiedPayload, key: (typeof EARTH_FEED_KEYS)[number]): number {
  if (payload.counts && key in payload.counts) {
    return countValue(payload.counts[key])
  }

  const dataValue = payload.data?.[key]
  if (Array.isArray(dataValue)) {
    return dataValue.length
  }

  return countValue(dataValue)
}

function normalizeEarthCounts(payload: EarthUnifiedPayload): Record<string, number> {
  return Object.fromEntries(EARTH_FEED_KEYS.map((key) => [key, countFromPayload(payload, key)]))
}

function normalizedKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s._/-]+/g, "")
}

export function OverviewSection({
  health,
  healthAll,
  stats,
  console: consolePayload,
  fieldDevices,
  observations,
  isLoading,
}: {
  health: MINDEXHealth | null
  healthAll: MindexHealthAll | null
  stats: MINDEXStats | null
  console?: MindexConsole | null
  fieldDevices?: MindexFieldDeviceSummary | null
  observations: Observation[]
  isLoading: boolean
}) {
  const nas = consolePayload?.storage?.nas
  const nasMounted = nas?.available === true
  const statsSnapshot =
    stats || consolePayload?.stats
      ? ({ ...(stats ?? {}), ...(consolePayload?.stats ?? {}) } as MINDEXStats)
      : null
  const [earthFeed, setEarthFeed] = useState<EarthFeedState>({ loading: true, counts: {} })
  const etlJobs = consolePayload?.etl?.jobs ?? []
  const coreCounts = consolePayload?.etl?.core_counts ?? {}
  const availableSources = new Set((consolePayload?.etl?.available_sources ?? []).map(normalizedKey))
  const sourceCounts = new Map<string, number>()
  for (const [source, count] of Object.entries(statsSnapshot?.taxa_by_source ?? {})) {
    const key = normalizedKey(source)
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + Number(count ?? 0))
  }
  for (const [source, count] of Object.entries(statsSnapshot?.observations_by_source ?? {})) {
    const key = normalizedKey(source)
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + Number(count ?? 0))
  }
  const etlJobKeys = new Set(etlJobs.map((job) => normalizedKey(job.name)).filter(Boolean))
  const etlSourceKeys = new Set(etlJobs.map((job) => normalizedKey(job.source)).filter(Boolean))
  const sourceRows: SourceRow[] = MINDEX_SOURCE_PROFILES.map((profile) => {
    const aliasKeys = profile.aliases.map(normalizedKey)
    const profileJobKeys = profile.jobs.map(normalizedKey)
    const loadedCount = aliasKeys.reduce((sum, key) => sum + (sourceCounts.get(key) ?? 0), 0)
    const jobs = etlJobs.filter((job) => {
      const sourceKey = normalizedKey(job.source || "")
      const nameKey = normalizedKey(job.name || "")
      return aliasKeys.includes(sourceKey) || profileJobKeys.includes(nameKey)
    })
    return {
      key: profile.label,
      label: profile.label,
      domain: profile.domain,
      loadedCount,
      registered:
        jobs.length > 0 ||
        aliasKeys.some((key) => availableSources.has(key) || etlSourceKeys.has(key)) ||
        profileJobKeys.some((key) => etlJobKeys.has(key)),
      jobNames: jobs.map((job) => job.name),
    }
  })
  const extraSourceRows: SourceRow[] = etlJobs
    .filter((job) => {
      const sourceKey = normalizedKey(job.source || "")
      const nameKey = normalizedKey(job.name || "")
      return !sourceRows.some((row) => {
        const profile = MINDEX_SOURCE_PROFILES.find((item) => item.label === row.label)
        if (!profile) return false
        return profile.aliases.map(normalizedKey).includes(sourceKey) || profile.jobs.map(normalizedKey).includes(nameKey)
      })
    })
    .map((job) => ({
      key: `extra-${job.name}`,
      label: job.source || job.name,
      domain: job.description || "Registered ETL source",
      loadedCount: sourceCounts.get(normalizedKey(job.source || "")) ?? 0,
      registered: true,
      jobNames: [job.name],
    }))
  const allSourceRows = [...sourceRows, ...extraSourceRows]
  const loadedSourceCount = allSourceRows.filter((row) => row.loadedCount > 0).length
  const registeredSourceCount = allSourceRows.filter((row) => row.registered).length
  const totalObservations = statsSnapshot?.total_observations ?? 0
  const observationsWithImages = statsSnapshot?.observations_with_images ?? 0
  const observationsWithLocation = statsSnapshot?.observations_with_location ?? 0
  const observationImagePct = totalObservations > 0 ? (observationsWithImages / totalObservations) * 100 : 0
  const observationLocationPct = totalObservations > 0 ? (observationsWithLocation / totalObservations) * 100 : 0
  const observationSourceRows = Object.entries(statsSnapshot?.observations_by_source ?? {})
    .map(([source, count]) => ({ source, count: Number(count ?? 0) }))
    .sort((a, b) => b.count - a.count)
  const biologicalRows: BiologyRow[] = [
    {
      label: "Taxon rows",
      value: nullableCount(coreCounts.taxon ?? statsSnapshot?.total_taxa),
      source: "core.taxon",
      note: "loaded taxonomy rows",
    },
    {
      label: "External IDs",
      value: nullableCount(statsSnapshot?.total_external_ids),
      source: "core.taxon_external_id",
      note: "cross-source identifiers",
    },
    {
      label: "Taxa with images",
      value: nullableCount(consolePayload?.images?.taxa_with_images),
      source: "taxon metadata default photos",
      note: consolePayload?.images
        ? `${consolePayload.images.coverage_percent ?? "--"}% coverage; ${formatCount(consolePayload.images.taxa_without_images)} missing`
        : "waiting on console image coverage",
    },
    {
      label: "Observation media",
      value: nullableCount(observationsWithImages),
      source: "core.observation.media",
      note: `${observationImagePct.toFixed(1)}% of loaded observations`,
    },
    {
      label: "Taxa linked to observations",
      value: nullableCount(statsSnapshot?.taxa_with_observations),
      source: "observation taxon joins",
      note: "low join coverage means many observation rows are not linked to taxon rows yet",
    },
    {
      label: "Genome records",
      value: nullableCount(coreCounts.genome ?? statsSnapshot?.genome_records ?? healthAll?.counts?.genome),
      source: "FungiDB / GenBank ETL",
      emptyLabel: "registered, empty",
    },
    {
      label: "Genetic sequences",
      value: nullableCount(coreCounts.genetic_sequence),
      source: "GenBank bio.genetic_sequence",
      emptyLabel: "registered, empty",
    },
    {
      label: "Trait records",
      value: nullableCount(statsSnapshot?.trait_records),
      source: "Mushroom.World + Wikipedia ETL",
      emptyLabel: "registered, empty",
    },
    {
      label: "Synonyms",
      value: nullableCount(statsSnapshot?.synonym_records),
      source: "MycoBank ETL",
      emptyLabel: "registered, empty",
    },
    {
      label: "Taxon compounds",
      value: nullableCount(coreCounts.taxon_compound ?? healthAll?.counts?.taxon_compound),
      source: "PubChem / ChemSpider ETL",
      emptyLabel: "registered, empty",
    },
  ]
  const deviceRows = fieldDevices?.devices ?? []
  const liveDevices = deviceRows.filter((device) => {
    const status = String(device.status || "").toLowerCase()
    return status === "connected" || status === "online"
  })
  const offlineDevices = deviceRows.filter((device) => {
    const status = String(device.status || "").toLowerCase()
    return status === "offline" || status === "stale" || !status
  })
  const consoleEarthDomains = consolePayload?.earth?.domains ?? {}
  const consoleEarthTotal = countValue(consolePayload?.earth?.total_entities)
  const earthRows = useMemo<EarthDetailRow[]>(() => {
    const feedRows = EARTH_FEED_KEYS.map((key) => {
      const meta = EARTH_FEED_META[key]
      return {
        key,
        label: meta.label,
        source: meta.source,
        count: earthFeed.loading ? null : earthFeed.counts[key] ?? 0,
        emptyLabel: "acquiring",
      }
    })

    const mindexDomainRows = Object.entries(consoleEarthDomains)
      .filter(([, count]) => countValue(count) > 0)
      .map(([key, count]) => ({
        key: `mindex-${key}`,
        label: key.replace(/_/g, " "),
        source: "MINDEX earth table",
        count: countValue(count),
      }))

    return [
      ...feedRows,
      {
        key: "mycosoft-field-devices",
        label: "Mycosoft field devices",
        source: "Earth Simulator device registry",
        count: fieldDevices?.count ?? deviceRows.length,
        note: `${liveDevices.length} live / ${offlineDevices.length} offline`,
      },
      {
        key: "mindex-geospatial-observations",
        label: "Geolocated observations",
        source: "MINDEX observation table",
        count: statsSnapshot?.observations_with_location ?? null,
      },
      ...mindexDomainRows,
    ]
  }, [
    consoleEarthDomains,
    deviceRows.length,
    earthFeed.counts,
    earthFeed.loading,
    fieldDevices?.count,
    liveDevices.length,
    offlineDevices.length,
    statsSnapshot?.observations_with_location,
  ])
  const earthTotal = earthRows.reduce((total, row) => total + Math.max(row.count ?? 0, 0), 0)
  const activeEarthDomains = earthRows.filter((row) => (row.count ?? 0) > 0).length

  useEffect(() => {
    let active = true
    let timedOut = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 25_000)

    async function loadEarthFeed() {
      try {
        const response = await fetch("/api/crep/unified", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = (await response.json()) as EarthUnifiedPayload
        if (!active) return
        if (!response.ok || payload.success === false) {
          setEarthFeed({
            loading: false,
            counts: {},
            error: payload.error || `CREP unified returned ${response.status}`,
          })
          return
        }
        setEarthFeed({
          loading: false,
          counts: normalizeEarthCounts(payload),
          timestamp: payload.timestamp,
        })
      } catch (error) {
        if (!active) return
        setEarthFeed({
          loading: false,
          counts: {},
          error: timedOut
            ? "CREP unified summary timed out"
            : error instanceof Error
              ? error.message
              : "CREP unified summary failed",
        })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    loadEarthFeed()

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return (
    <div className={`space-y-6 ${isLoading ? "opacity-90" : ""}`}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MindexStatCard
          title="API Status"
          value={health?.api ? "Online" : "Offline"}
          icon={Server}
          color="purple"
          status={health?.api ? "online" : "offline"}
          subtitle={`Version ${health?.version || "unknown"}`}
        />
        <MindexStatCard
          title="Database"
          value={health?.database ? "Connected" : "Disconnected"}
          icon={Database}
          color="cyan"
          status={health?.database ? "online" : "offline"}
          subtitle="PostGIS"
        />
        <MindexStatCard
          title="ETL Status"
          value={stats?.etl_status === "running" ? "Running" : "Idle"}
          icon={Activity}
          color="green"
          status={stats?.etl_status === "running" ? "processing" : "warning"}
          subtitle="Data sync"
        />
        <MindexStatCard
          title="Loaded Taxon Rows"
          value={stats?.total_taxa?.toLocaleString() || "0"}
          icon={BookOpen}
          color="orange"
          subtitle="Loaded rows, not the all-life total"
        />
      </div>

      {consolePayload?.error ? (
        <p className="text-sm text-amber-300 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          MINDEX console is temporarily unavailable. Live counts will update when the service responds.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard color="green">
          <h3 className="text-lg font-semibold text-white mb-2">NAS cold storage</h3>
          <p className="text-sm text-gray-400 mb-3">
            Mounted archive share{" "}
            <span className="font-mono text-gray-300">{consolePayload?.storage?.nas_mount_path || "/mnt/nas/mindex"}</span>
          </p>
          {nasMounted ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-white/5 px-3 py-2">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-mono text-green-200">{nas?.total_gb ?? "--"} GB</dd>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <dt className="text-gray-500">Used</dt>
                <dd className="font-mono text-green-200">
                  {nas?.used_gb ?? "--"} GB ({nas?.usage_pct ?? 0}%)
                </dd>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <dt className="text-gray-500">Free</dt>
                <dd className="font-mono text-green-200">{nas?.free_gb ?? "--"} GB</dd>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <dt className="text-gray-500">Writable</dt>
                <dd className="font-mono text-green-200">
                  {consolePayload?.storage?.nas_writable ? "yes" : "no"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-amber-300">
              Cold storage is not mounted for this session. Hot data remains available in MINDEX.
            </p>
          )}
        </GlassCard>

        <GlassCard color="cyan">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Mycosoft field devices</h3>
              <p className="text-sm text-gray-400">Registered MycoBrain-powered hardware in the Earth Simulator fleet.</p>
            </div>
            <Cpu className="h-5 w-5 shrink-0 text-cyan-300" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Registered</dt>
              <dd className="font-mono text-cyan-200">{fieldDevices?.count ?? "--"}</dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Live</dt>
              <dd className="font-mono text-green-200">{liveDevices.length}</dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Offline</dt>
              <dd className="font-mono text-amber-200">{offlineDevices.length}</dd>
            </div>
          </div>
          {fieldDevices?.error ? (
            <p className="mt-3 text-sm text-amber-300">Device registry is temporarily unavailable.</p>
          ) : null}
          <ScrollArea className="mt-3 h-32">
            <div className="space-y-2">
              {deviceRows.length ? (
                deviceRows.map((device) => {
                  const status = String(device.status || "unknown").toLowerCase()
                  const isLive = status === "connected" || status === "online"
                  return (
                    <div key={device.id} className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{device.name || device.id}</p>
                        <p className="truncate text-xs text-gray-500">{device.location_label || device.host || device.registry_id || device.id}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isLive
                            ? "shrink-0 border-green-500/40 text-green-200"
                            : "shrink-0 border-amber-500/40 text-amber-200"
                        }
                      >
                        <Wifi className="mr-1 h-3 w-3" />
                        {isLive ? "live" : status}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-gray-500">No registered Mycosoft devices reported in this snapshot.</p>
              )}
            </div>
          </ScrollArea>
        </GlassCard>

        <GlassCard color="orange">
          <h3 className="text-lg font-semibold text-white mb-2">Earth intelligence</h3>
          <p className="text-sm text-gray-400 mb-3">Live Earth Simulator feeds plus MINDEX geospatial rows.</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Records</dt>
              <dd className="font-mono text-orange-200">
                {earthFeed.loading && earthTotal === 0 ? "loading" : earthTotal > 0 ? earthTotal.toLocaleString() : "--"}
              </dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Active domains</dt>
              <dd className="font-mono text-orange-200">{activeEarthDomains}</dd>
            </div>
          </div>
          <div className="mt-3 max-h-56 overflow-auto pr-1">
            <dl className="space-y-2 text-sm">
              {earthRows.map((row) => {
                const hasCount = (row.count ?? 0) > 0
                const value = row.count == null
                  ? "loading"
                  : hasCount
                    ? row.count.toLocaleString()
                    : row.emptyLabel || "--"
                return (
                  <div key={row.key} className="rounded-md bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="min-w-0 truncate text-gray-300">{row.label}</dt>
                      <dd className={hasCount ? "shrink-0 font-mono text-orange-200" : "shrink-0 font-mono text-amber-200"}>
                        {value}
                      </dd>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{row.source}</span>
                      {row.note ? <span>{row.note}</span> : null}
                    </div>
                  </div>
                )
              })}
            </dl>
          </div>
          {earthFeed.error ? (
            <p className="mt-3 text-xs text-amber-200">Live CREP summary failed: {earthFeed.error}</p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500">
            {consoleEarthTotal > 0
              ? `MINDEX earth table synced ${consoleEarthTotal.toLocaleString()} rows.`
              : "MINDEX earth table is not populated yet; this panel is using live Earth Simulator feeds and MINDEX observations."}
          </p>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard color="purple">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-400">Observations</h3>
            <Badge variant="outline" className="border-purple-500/30 text-purple-200">
              all-life rows
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Total rows</dt>
              <dd className="font-mono text-purple-200">{formatCount(totalObservations)}</dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">Taxa linked</dt>
              <dd className="font-mono text-amber-200">{formatCount(statsSnapshot?.taxa_with_observations)}</dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">With GPS</dt>
              <dd className="font-mono text-purple-200">
                {formatCount(observationsWithLocation)}
                <span className="ml-1 text-xs text-gray-500">{observationLocationPct.toFixed(1)}%</span>
              </dd>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <dt className="text-gray-500">With media</dt>
              <dd className="font-mono text-cyan-200">
                {formatCount(observationsWithImages)}
                <span className="ml-1 text-xs text-gray-500">{observationImagePct.toFixed(1)}%</span>
              </dd>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {observationSourceRows.length ? (
              observationSourceRows.map((row) => (
                <div key={row.source} className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-gray-300">{row.source === "inat" ? "iNaturalist" : row.source}</p>
                    <p className="text-xs text-gray-500">observation source</p>
                  </div>
                  <span className="shrink-0 font-mono text-purple-200">{row.count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-amber-200">No observation source breakdown in the current stats payload.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-400">Data Sources</h3>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
              {loadedSourceCount}/{registeredSourceCount} loaded
            </Badge>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Registered ETL sources are shown even when MINDEX has not loaded rows into their domain tables yet.
          </p>
          <ScrollArea className="h-64 pr-3">
            <div className="space-y-2">
              {allSourceRows.map((row) => {
                const loaded = row.loadedCount > 0
                return (
                  <div key={row.key} className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-gray-300">{row.label}</p>
                      <p className="truncate text-xs text-gray-500">
                        {row.domain}
                        {row.jobNames.length ? ` - ${row.jobNames.join(", ")}` : ""}
                      </p>
                    </div>
                    <span className={loaded ? "shrink-0 font-mono text-cyan-200" : "shrink-0 font-mono text-amber-200"}>
                      {loaded ? row.loadedCount.toLocaleString() : row.registered ? "registered" : "not wired"}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </GlassCard>

        <GlassCard color="green">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-400">Biological Data</h3>
            <Badge variant="outline" className="border-green-500/30 text-green-200">
              {formatCount(consolePayload?.images?.taxa_with_images)} imaged taxa
            </Badge>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {biologicalRows.map((row) => (
              <div key={row.label} className="rounded-md bg-white/5 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-gray-300">{row.label}</span>
                  <span className={row.value && row.value > 0 ? "shrink-0 font-mono text-green-300" : "shrink-0 font-mono text-amber-200"}>
                    {row.value && row.value > 0 ? row.value.toLocaleString() : row.emptyLabel || formatCount(row.value)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{row.source}</span>
                  {row.note ? <span>{row.note}</span> : null}
                </div>
              </div>
            ))}
            <p className="text-xs text-amber-200">
              GenBank, FungiDB, MycoBank, PubChem, and ChemSpider are registered sources here, but their MINDEX tables
              currently report zero rows. They will populate as source ingestion completes.
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard color="purple" padding="p-0">
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <Badge variant="outline" className="font-mono text-xs border-purple-500/30 text-purple-300">
              {observations.length} records
            </Badge>
          </div>
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-4 space-y-2">
            {observations.slice(0, 10).map((obs, i) => (
              <motion.div
                key={obs.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-sm text-white">Observation {String(obs.id).slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">
                      {obs.observed_at ? new Date(obs.observed_at).toLocaleDateString() : "Unknown"}
                    </div>
                  </div>
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 border-none text-xs">{obs.source}</Badge>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  )
}
