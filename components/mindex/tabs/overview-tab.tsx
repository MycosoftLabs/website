"use client"

import { motion } from "framer-motion"
import { Activity, BookOpen, Database, MapPin, Server } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GlassCard } from "@/components/ui/glowing-border"

import type { MINDEXHealth, MINDEXStats, MindexHealthAll, Observation } from "./mindex-dashboard-types"
import { MindexStatCard } from "./mindex-stat-card"
import { LiveAnchorStream } from "./live-anchor-stream"

export function OverviewSection({
  health,
  healthAll,
  stats,
  observations,
  isLoading,
}: {
  health: MINDEXHealth | null
  healthAll: MindexHealthAll | null
  stats: MINDEXStats | null
  observations: Observation[]
  isLoading: boolean
}) {
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
          title="Total Taxa"
          value={stats?.total_taxa?.toLocaleString() || "0"}
          icon={BookOpen}
          color="orange"
          subtitle="Species cataloged"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="purple">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-400" />
              Federation &amp; counts
            </h3>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">MINDEX</Badge>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Live row counts and dependency health from <span className="font-mono text-gray-300">/api/mindex/health/all</span>
            (proxied through this site). Empty values mean the table is missing on DB or migration 0031 is not applied yet.
          </p>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {healthAll?.counts
              ? Object.entries(healthAll.counts).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
                    <dt className="text-gray-400 capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-mono text-purple-200">{v == null ? "—" : v.toLocaleString()}</dd>
                  </div>
                ))
              : (
                  <div className="text-sm text-gray-500">No health-all payload yet — check BFF auth to MINDEX.</div>
                )}
          </dl>
          {healthAll?.components?.mas ? (
            <p className="text-xs text-gray-500 mt-3 font-mono truncate">
              MAS: {JSON.stringify(healthAll.components.mas).slice(0, 220)}
            </p>
          ) : null}
        </GlassCard>

        <GlassCard color="cyan">
          <LiveAnchorStream />
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard color="purple">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Observations</h3>
          <div className="text-3xl font-bold text-white mb-4">
            {stats?.total_observations?.toLocaleString() || 0}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">With Location</span>
              <span className="font-mono text-purple-300">
                {stats?.observations_with_location?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">With Images</span>
              <span className="font-mono text-cyan-300">
                {stats?.observations_with_images?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Data Sources</h3>
          <div className="space-y-2">
            {stats?.taxa_by_source
              ? Object.entries(stats.taxa_by_source)
                  .slice(0, 5)
                  .map(([source, count]) => (
                    <div key={source} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{source}</span>
                      <span className="font-mono text-cyan-300">{count.toLocaleString()}</span>
                    </div>
                  ))
              : null}
          </div>
        </GlassCard>

        <GlassCard color="green">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Biological Data</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Genomes</span>
              <span className="font-mono text-green-300">{stats?.genome_records?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Traits</span>
              <span className="font-mono text-green-300">{stats?.trait_records?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Synonyms</span>
              <span className="font-mono text-green-300">{stats?.synonym_records?.toLocaleString() || 0}</span>
            </div>
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
