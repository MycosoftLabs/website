"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Database,
  Dna,
  FlaskConical,
  ImageIcon,
  Link2,
  Microscope,
  Network,
  Search,
  TreePine,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glowing-border"

import type { LucideIcon } from "lucide-react"
import type { MINDEXStats, MindexConsole } from "./mindex-dashboard-types"

type Probe = {
  ok: boolean
  status: number
  body: Record<string, unknown>
}

type BiologyMetric = {
  label: string
  value: number | null
  detail: string
  icon: LucideIcon
  accent: "green" | "cyan" | "purple" | "amber"
}

type BiologyMetricGroup = {
  title: string
  icon: LucideIcon
  metrics: BiologyMetric[]
}

type ServiceStatus = "live" | "pending" | "empty" | "checking"

const probeFetcher = async (url: string): Promise<Probe> => {
  const response = await fetch(url, { cache: "no-store" })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: response.ok, status: response.status, body }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function arrayFrom(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : []
}

function rowsFromBody(body: unknown, keys: string[]): Array<Record<string, unknown>> {
  const record = asRecord(body)

  for (const key of keys) {
    const rows = arrayFrom(record[key])
    if (rows.length > 0) return rows
  }

  for (const key of keys) {
    const nested = asRecord(record.data)
    const rows = arrayFrom(nested[key])
    if (rows.length > 0) return rows
  }

  return []
}

function countFrom(value: unknown): number | null {
  const count = Number(value)
  return Number.isFinite(count) ? count : null
}

function positiveCount(value: unknown): number {
  const count = countFrom(value)
  return count && count > 0 ? count : 0
}

function formatCount(value: number | null | undefined): string {
  return value == null ? "--" : value.toLocaleString()
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function mediaRows(row: Record<string, unknown>): Array<Record<string, unknown>> {
  return arrayFrom(row.media)
}

function mediaUrl(row: Record<string, unknown>): string | null {
  const first = mediaRows(row)[0]
  return firstString(first?.url, first?.medium_url, first?.thumbnail_url)
}

function locationLabel(row: Record<string, unknown>, metadata: Record<string, unknown>): string {
  const location = asRecord(row.location)
  const coords = Array.isArray(location.coordinates) ? location.coordinates : []
  const fallback =
    coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number"
      ? `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`
      : null

  return firstString(metadata.place_guess, row.location_label, fallback, "Location pending") ?? "Location pending"
}

function observationTitle(row: Record<string, unknown>, metadata: Record<string, unknown>): string {
  return (
    firstString(
      row.canonical_name,
      row.scientific_name,
      row.taxon_name,
      metadata.canonical_name,
      metadata.scientific_name,
      metadata.taxon_name,
      row.source_id ? `Observation ${row.source_id}` : null,
      row.id,
    ) ?? "Observation"
  )
}

function sourceRows(sources: Record<string, number> | undefined, label: string): BiologyMetric[] {
  return Object.entries(sources ?? {})
    .sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))
    .slice(0, 4)
    .map(([source, value]) => ({
      label: `${source} ${label}`,
      value: countFrom(value),
      detail: "loaded source count",
      icon: Database,
      accent: "cyan" as const,
    }))
}

function statusBadge(status: ServiceStatus) {
  if (status === "live") {
    return { label: "live", className: "border-green-500/40 text-green-200" }
  }

  if (status === "empty") {
    return { label: "empty", className: "border-amber-500/40 text-amber-200" }
  }

  if (status === "checking") {
    return { label: "checking", className: "border-cyan-500/40 text-cyan-200" }
  }

  return { label: "pending", className: "border-orange-500/40 text-orange-200" }
}

function statusIcon(status: ServiceStatus) {
  if (status === "live") return CheckCircle2
  if (status === "checking") return Activity
  return AlertTriangle
}

function BiologyMetricCard({ metric }: { metric: BiologyMetric }) {
  const Icon = metric.icon
  const isEmpty = metric.value != null && metric.value <= 0
  const accentClass =
    metric.accent === "green"
      ? "text-green-300"
      : metric.accent === "cyan"
        ? "text-cyan-300"
        : metric.accent === "purple"
          ? "text-purple-300"
          : "text-amber-300"

  return (
    <div className="min-h-[118px] rounded-md border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.08em] text-gray-500">{metric.label}</p>
          <p className={isEmpty ? "mt-2 font-mono text-2xl text-amber-200" : "mt-2 font-mono text-2xl text-white"}>
            {formatCount(metric.value)}
          </p>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} />
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-400">{metric.detail}</p>
    </div>
  )
}

function BiologyServiceCard({
  title,
  icon: Icon,
  status,
  metric,
  detail,
}: {
  title: string
  icon: LucideIcon
  status: ServiceStatus
  metric: string
  detail: string
}) {
  const badge = statusBadge(status)
  const StatusIcon = statusIcon(status)

  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-white">
            <Icon className="h-4 w-4 text-green-300" />
            {title}
          </p>
          <p className="mt-1 font-mono text-sm text-white">{metric}</p>
        </div>
        <Badge variant="outline" className={badge.className}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {badge.label}
        </Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-400">{detail}</p>
    </div>
  )
}

export function BioSection({ stats }: { stats: MINDEXStats | null }) {
  const [serviceGraceElapsed, setServiceGraceElapsed] = useState(false)
  const consoleProbe = useSWR<Probe>("/api/natureos/mindex/console", probeFetcher, { refreshInterval: 60_000 })
  const taxa = useSWR<Probe>("/api/natureos/mindex/taxa?limit=1", probeFetcher, { refreshInterval: 60_000 })
  const observations = useSWR<Probe>("/api/natureos/mindex/observations?limit=20", probeFetcher, { refreshInterval: 60_000 })
  const genomeTracks = useSWR<Probe>("/api/mindex/genome-tracks?speciesName=Agaricus", probeFetcher, { refreshInterval: 120_000 })
  const kingdoms = useSWR<Probe>("/api/ancestry/kingdoms", probeFetcher, { refreshInterval: 120_000 })

  const consoleBody = consoleProbe.data?.body as (MindexConsole & Record<string, unknown>) | undefined
  const statsSnapshot =
    stats || consoleBody?.stats ? ({ ...(stats ?? {}), ...(consoleBody?.stats ?? {}) } as MINDEXStats) : null
  const coreCounts = consoleBody?.etl?.core_counts ?? {}
  const imageCoverage = consoleBody?.images

  const observationRows = rowsFromBody(observations.data?.body, ["observations", "items", "results", "rows"]).slice(0, 20)
  const genomeTrackCount = rowsFromBody(genomeTracks.data?.body, ["tracks", "items", "results"]).length
  const kingdomRows = rowsFromBody(kingdoms.data?.body, ["kingdoms", "items", "results"])
  const taxonomyRows = rowsFromBody(taxa.data?.body, ["taxa", "items", "results"])

  const totalObservations = countFrom(statsSnapshot?.total_observations)
  const observationsWithImages = countFrom(statsSnapshot?.observations_with_images)
  const observationsWithLocation = countFrom(statsSnapshot?.observations_with_location)
  const taxaWithObservationLinks = countFrom(statsSnapshot?.taxa_with_observations)
  const showChecking = !serviceGraceElapsed

  useEffect(() => {
    const timer = window.setTimeout(() => setServiceGraceElapsed(true), 3_500)
    return () => window.clearTimeout(timer)
  }, [])

  const taxonJoinPct =
    totalObservations && taxaWithObservationLinks != null && totalObservations > 0
      ? `${((taxaWithObservationLinks / totalObservations) * 100).toFixed(3)}% of observation volume`
      : "species linkage coverage pending"
  const observationImagePct =
    totalObservations && observationsWithImages != null && totalObservations > 0
      ? `${((observationsWithImages / totalObservations) * 100).toFixed(1)}% with media`
      : "media coverage not reported"
  const observationLocationPct =
    totalObservations && observationsWithLocation != null && totalObservations > 0
      ? `${((observationsWithLocation / totalObservations) * 100).toFixed(1)}% geolocated`
      : "location coverage not reported"

  const rawMetricGroups: BiologyMetricGroup[] = [
    {
      title: "Taxonomy",
      icon: TreePine,
      metrics: [
        {
          label: "Loaded taxon rows",
          value: countFrom(coreCounts.taxon ?? statsSnapshot?.total_taxa),
          detail: "current core.taxon rows, not the final all-life target",
          icon: TreePine,
          accent: "green",
        },
        {
          label: "External IDs",
          value: countFrom(statsSnapshot?.total_external_ids),
          detail: "cross-source identifiers available for joining",
          icon: Link2,
          accent: "cyan",
        },
        {
          label: "Taxa with observation links",
          value: taxaWithObservationLinks,
          detail: taxonJoinPct,
          icon: Network,
          accent: "amber",
        },
        {
          label: "Synonyms",
          value: countFrom(statsSnapshot?.synonym_records),
          detail: "MycoBank synonym import currently loaded",
          icon: Search,
          accent: "purple",
        },
      ],
    },
    {
      title: "Observations and Media",
      icon: Camera,
      metrics: [
        {
          label: "Observations",
          value: totalObservations,
          detail: "live nature observation corpus",
          icon: Activity,
          accent: "green",
        },
        {
          label: "Located observations",
          value: observationsWithLocation,
          detail: observationLocationPct,
          icon: Network,
          accent: "cyan",
        },
        {
          label: "Observation media",
          value: observationsWithImages,
          detail: observationImagePct,
          icon: Camera,
          accent: "purple",
        },
        {
          label: "Taxa with images",
          value: countFrom(imageCoverage?.taxa_with_images),
          detail: imageCoverage
            ? `${formatCount(countFrom(imageCoverage.taxa_without_images))} loaded taxa still need default images`
            : "taxonomy image coverage waiting on console snapshot",
          icon: ImageIcon,
          accent: "green",
        },
      ],
    },
    {
      title: "Genetics, Traits, Chemistry",
      icon: Dna,
      metrics: [
        {
          label: "Genome records",
          value: countFrom(coreCounts.genome ?? statsSnapshot?.genome_records),
          detail: "FungiDB and GenBank genome metadata loaded",
          icon: Dna,
          accent: "amber",
        },
        {
          label: "Genetic sequences",
          value: countFrom(coreCounts.genetic_sequence),
          detail: "GenBank sequence table loaded",
          icon: Dna,
          accent: "amber",
        },
        {
          label: "Trait records",
          value: countFrom(statsSnapshot?.trait_records),
          detail: "Mushroom.World and Wikipedia trait rows loaded",
          icon: Microscope,
          accent: "amber",
        },
        {
          label: "Taxon compounds",
          value: countFrom(coreCounts.taxon_compound),
          detail: "PubChem and ChemSpider compound links loaded",
          icon: FlaskConical,
          accent: "amber",
        },
      ],
    },
    {
      title: "Loaded Sources",
      icon: Database,
      metrics: [
        ...sourceRows(statsSnapshot?.taxa_by_source, "taxa"),
        ...sourceRows(statsSnapshot?.observations_by_source, "observations"),
      ],
    },
  ]
  const metricGroups = rawMetricGroups.filter((group) => group.metrics.length > 0)

  const services = [
    {
      title: "Taxonomy profiles",
      icon: TreePine,
      status:
        taxa.isLoading && !taxa.data && showChecking
          ? ("checking" as const)
          : taxa.data?.ok && taxonomyRows.length > 0
            ? ("live" as const)
            : ("pending" as const),
      metric: taxonomyRows.length > 0 ? `${taxonomyRows.length} profile sample row` : "profile sample pending",
      detail: "Species pages will show fungi, plants, animals, bacteria, archaea, and other life domains when the catalog is loaded.",
    },
    {
      title: "Observation stream",
      icon: Activity,
      status:
        observations.isLoading && !observations.data && showChecking
          ? ("checking" as const)
          : observations.data?.ok && observationRows.length > 0
            ? ("live" as const)
            : ("pending" as const),
      metric: observationRows.length > 0 ? `${observationRows.length} live sample rows` : "waiting for observation sample",
      detail: "Recent nature observations with place, time, media, and source context.",
    },
    {
      title: "Genome tracks",
      icon: Dna,
      status:
        genomeTracks.isLoading && !genomeTracks.data && showChecking
          ? ("checking" as const)
          : genomeTrackCount > 0
            ? ("live" as const)
            : ("empty" as const),
      metric: genomeTrackCount > 0 ? `${genomeTrackCount} tracks` : "tracks not loaded",
      detail: "The genome browser needs GenBank/FungiDB tracks from MINDEX before it can draw sequence lanes.",
    },
    {
      title: "Ancestry kingdoms",
      icon: TreePine,
      status:
        kingdoms.isLoading && !kingdoms.data && showChecking
          ? ("checking" as const)
          : kingdomRows.length > 0
            ? ("live" as const)
            : ("pending" as const),
      metric: kingdomRows.length > 0 ? `${kingdomRows.length} kingdoms` : "kingdom rollups pending",
      detail: "The all-life kingdom summary needs repaired MINDEX rollups before Ancestry can populate life domains.",
    },
  ]

  return (
    <div className="space-y-6">
      <GlassCard color="green">
        <div className="mb-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Microscope className="h-5 w-5 text-green-300" />
              Biology data plane
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
              Live MINDEX biology coverage across taxonomy, observations, media, genetics, traits, chemistry, and
              source joins.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {services.map((service) => (
            <BiologyServiceCard key={service.title} {...service} />
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {metricGroups.map((group) => {
          const Icon = group.icon
          return (
            <GlassCard key={group.title} color="cyan">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <Icon className="h-5 w-5 text-cyan-300" />
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.metrics.map((metric) => (
                  <BiologyMetricCard key={`${group.title}-${metric.label}`} metric={metric} />
                ))}
              </div>
            </GlassCard>
          )
        })}
      </div>

      <GlassCard color="purple">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Live observation preview</h3>
            <p className="mt-1 text-sm text-gray-400">Recent nature-stream rows with media, place, GPS, and source IDs.</p>
          </div>
          <Badge variant="outline" className="w-fit border-purple-500/30 text-purple-200">
            {observationRows.length > 0 ? `${observationRows.length} rows` : "waiting for rows"}
          </Badge>
        </div>
        <div className="max-h-[480px] overflow-auto rounded-md border border-white/10">
          <div className="divide-y divide-white/10">
            {observationRows.map((row, index) => {
              const metadata = asRecord(row.metadata)
              const media = mediaRows(row)
              const image = mediaUrl(row)
              const taxonLinked = !!firstString(row.taxon_id)
              const sourceId = firstString(row.source_id, metadata.uri, row.id)

              return (
                <div key={firstString(row.id, row.source_id, index) ?? String(index)} className="grid gap-3 p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-md border border-white/10 bg-white/5">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-600"><ImageIcon className="h-5 w-5" /></div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-medium text-white">{observationTitle(row, metadata)}</p>
                      <Badge variant="outline" className={taxonLinked ? "border-green-500/30 text-green-200" : "border-amber-500/30 text-amber-200"}>
                        {taxonLinked ? "species linked" : "species link pending"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">{locationLabel(row, metadata)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="rounded bg-white/5 px-2 py-1">{firstString(row.source, "source")}</span>
                      <span className="rounded bg-white/5 px-2 py-1">{firstString(row.observed_at, "time pending")}</span>
                      <span className="rounded bg-white/5 px-2 py-1">{media.length.toLocaleString()} media</span>
                      {sourceId ? <span className="max-w-full truncate rounded bg-white/5 px-2 py-1">id {sourceId}</span> : null}
                    </div>
                  </div>
                </div>
              )
            })}
            {observationRows.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                Observation sample waiting on the MINDEX snapshot. The main observation counters above still show the
                loaded corpus when stats are available.
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <GlassCard color="orange">
        <h3 className="mb-3 text-lg font-semibold text-white">MINDEX biology worklist</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
            <p className="text-sm font-medium text-white">All-life profiles</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Restore species profile rows for fungi, plants, animals, bacteria, archaea, and other domains.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
            <p className="text-sm font-medium text-white">Observation species links</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Connect observation rows to species pages and all-life profiles.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
            <p className="text-sm font-medium text-white">Genetics and chemistry</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Load GenBank, FungiDB, PubChem, ChemSpider, traits, synonyms, and compound links into the biology plane.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
