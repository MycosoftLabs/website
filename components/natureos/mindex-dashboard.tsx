"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TronCircuitAnimation } from "@/components/ui/tron-circuit-animation"
import { NeonText, GlowingStatus } from "@/components/ui/glowing-border"
import { Database, Mic, MicOff, RefreshCw, ChevronRight } from "lucide-react"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"

import type {
  ETLStatus,
  MindexConsole,
  MindexFieldDeviceSummary,
  MindexHealthAll,
  MINDEXHealth,
  MINDEXStats,
  Observation,
  Taxon,
  WidgetSection,
} from "@/components/mindex/tabs/mindex-dashboard-types"
import { MINDEX_NAV_ITEMS } from "@/components/mindex/tabs/mindex-nav-items"
import { MindexNavButton } from "@/components/mindex/tabs/mindex-nav-button"
import { OverviewSection } from "@/components/mindex/tabs/overview-tab"
import { DataSection } from "@/components/mindex/tabs/data-tab"
import { LibrarySection } from "@/components/mindex/tabs/library-tab"
import { EncyclopediaSection } from "@/components/mindex/tabs/encyclopedia-tab"
import { DataPipelineSection } from "@/components/mindex/tabs/data-pipeline-tab"
import { IntegritySection } from "@/components/mindex/tabs/integrity-tab"
import { LedgerSection } from "@/components/mindex/tabs/ledger-tab"
import { NetworkSection } from "@/components/mindex/tabs/network-tab"
import { BioSection } from "@/components/mindex/tabs/bio-tab"
import { ChemistrySection } from "@/components/mindex/tabs/chemistry-tab"
import { MWaveSection } from "@/components/mindex/tabs/mwave-tab"
import { AgentsSection } from "@/components/mindex/tabs/agents-tab"

export function MINDEXDashboard() {
  const [health, setHealth] = useState<MINDEXHealth | null>(null)
  const [healthAll, setHealthAll] = useState<MindexHealthAll | null>(null)
  const [stats, setStats] = useState<MINDEXStats | null>(null)
  const [taxa, setTaxa] = useState<Taxon[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [etlStatus, setEtlStatus] = useState<ETLStatus | null>(null)
  const [consolePayload, setConsolePayload] = useState<MindexConsole | null>(null)
  const [fieldDevices, setFieldDevices] = useState<MindexFieldDeviceSummary | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [taxaError, setTaxaError] = useState<string | null>(null)
  const [selectedTaxon, setSelectedTaxon] = useState<Taxon | null>(null)
  const [activeSection, setActiveSection] = useState<WidgetSection>("overview")
  const [integrityRecordId, setIntegrityRecordId] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState<string | null>(null)

  const personaplex = usePersonaPlexContext()
  const { isListening, lastTranscript, startListening, stopListening, isConnected, connectionState } = personaplex || {
    isListening: false,
    lastTranscript: "",
    startListening: () => {},
    stopListening: () => {},
    isConnected: false,
    connectionState: "disconnected",
  }

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/health")
      if (res.ok) {
        const data = await res.json()
        const isApiOk = data?.status === "ok" || data?.api === true || data?.status === "healthy"
        const isDbOk = data?.db === "ok" || data?.database === true
        setHealth({
          status: isApiOk && isDbOk ? "healthy" : "degraded",
          api: Boolean(isApiOk),
          database: Boolean(isDbOk),
          etl: data?.etl_status || data?.etl || "unknown",
          version: data?.version,
          uptime: data?.uptime,
        })
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX health:", error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX stats:", error)
    }
  }, [])

  const fetchHealthAll = useCallback(async () => {
    try {
      const res = await fetch("/api/mindex/health/all", { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()) as MindexHealthAll
        setHealthAll(data)
      } else {
        setHealthAll(null)
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX health/all:", error)
      setHealthAll(null)
    }
  }, [])

  const fetchTaxa = useCallback(async (query?: string) => {
    try {
      const url = query
        ? `/api/natureos/mindex/taxa?q=${encodeURIComponent(query)}&limit=50`
        : `/api/natureos/mindex/taxa?limit=50`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setTaxa(data.data || [])
        setTaxaError(null)
      } else {
        setTaxa([])
        setTaxaError(
          data.message ||
            data.error ||
            `MINDEX all-life taxa endpoint returned HTTP ${res.status}`,
        )
      }
    } catch (error) {
      console.error("Failed to fetch taxa:", error)
      setTaxa([])
      setTaxaError(error instanceof Error ? error.message : "Failed to fetch MINDEX taxa")
    }
  }, [])

  const fetchFieldDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/earth-simulator/devices", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success !== false) {
        setFieldDevices({
          devices: Array.isArray(data.devices) ? data.devices : [],
          count: typeof data.count === "number" ? data.count : Array.isArray(data.devices) ? data.devices.length : 0,
          sources: data.sources,
          mas_url: data.mas_url,
          timestamp: data.timestamp,
          success: data.success,
        })
      } else {
        setFieldDevices({
          devices: [],
          count: 0,
          error: data?.error || `Device route returned HTTP ${res.status}`,
        })
      }
    } catch (error) {
      console.error("Failed to fetch Mycosoft field devices:", error)
      setFieldDevices({
        devices: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to fetch Mycosoft devices",
      })
    }
  }, [])

  const fetchObservations = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/observations?limit=100", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setObservations(
          Array.isArray(data.observations)
            ? data.observations
            : Array.isArray(data.data)
              ? data.data
              : [],
        )
      } else {
        setObservations([])
      }
    } catch (error) {
      console.error("Failed to fetch observations:", error)
      setObservations([])
    }
  }, [])

  const fetchETLStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/sync", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setEtlStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch ETL status:", error)
    }
  }, [])

  const fetchConsole = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/console", { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()) as MindexConsole
        setConsolePayload(data)
        if (data.etl) setEtlStatus(data.etl as ETLStatus)
        if (data.stats) {
          setStats((prev) => ({
            ...(prev ?? {
              total_taxa: 0,
              total_observations: 0,
              total_external_ids: 0,
              taxa_by_source: {},
              observations_by_source: {},
              observations_with_location: 0,
              observations_with_images: 0,
              taxa_with_observations: 0,
              observation_date_range: { earliest: null, latest: null },
              etl_status: "unknown",
              genome_records: 0,
              trait_records: 0,
              synonym_records: 0,
            }),
            ...data.stats,
            etl_status: (data.stats.etl_status as MINDEXStats["etl_status"]) ?? prev?.etl_status ?? "unknown",
          }))
        }
      } else {
        const err = await res.json().catch(() => ({}))
        setConsolePayload({ error: (err as { error?: string }).error ?? `HTTP ${res.status}` })
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX console:", error)
      setConsolePayload({
        error: error instanceof Error ? error.message : "console_fetch_failed",
      })
    }
  }, [])

  const runEtlJob = useCallback(
    async (job: string): Promise<{ ok: boolean; message: string }> => {
      setIsSyncing(true)
      try {
        const res = await fetch("/api/natureos/mindex/etl/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job, max_pages: 20 }),
        })
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
        if (res.ok) {
          await Promise.all([fetchConsole(), fetchETLStatus(), fetchStats()])
          return {
            ok: true,
            message: body.message || `${job} queued`,
          }
        }
        return {
          ok: false,
          message: body.error || body.message || `Could not queue ${job}`,
        }
      } catch (error) {
        console.error("Failed to run ETL job:", error)
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Could not queue job",
        }
      } finally {
        setIsSyncing(false)
      }
    },
    [fetchConsole, fetchETLStatus, fetchStats],
  )

  const triggerSync = useCallback(
    async (sources?: string[]) => {
      setIsSyncing(true)
      try {
        const res = await fetch("/api/natureos/mindex/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sources, limit: 10000 }),
        })
        if (res.ok) {
          setTimeout(() => {
            void Promise.all([fetchStats(), fetchETLStatus(), fetchConsole()])
            setIsSyncing(false)
          }, 2000)
        } else {
          setIsSyncing(false)
        }
      } catch (error) {
        console.error("Failed to trigger sync:", error)
        setIsSyncing(false)
      }
    },
    [fetchStats, fetchETLStatus, fetchConsole],
  )

  useEffect(() => {
    if (!lastTranscript) return

    const command = lastTranscript.toLowerCase()
    setVoiceCommand(lastTranscript)

    const timeout = setTimeout(() => setVoiceCommand(null), 3000)

    if (command.includes("overview") || command.includes("show overview")) {
      setActiveSection("overview")
    } else if (command.includes("encyclopedia") || command.includes("species")) {
      setActiveSection("encyclopedia")
    } else if (command.includes("pipeline")) {
      setActiveSection("pipeline")
    } else if (command.includes("data") || command.includes("database")) {
      setActiveSection("data")
    } else if (command.includes("integrity") || command.includes("verify")) {
      setActiveSection("integrity")
    } else if (command.includes("crypto") || command.includes("cryptography")) {
      setActiveSection("integrity")
    } else if (command.includes("ledger")) {
      setActiveSection("ledger")
    } else if (command.includes("network") || command.includes("mycorrhizal")) {
      setActiveSection("network")
    } else if (command.includes("bio") || command.includes("phylogeny") || command.includes("tree of life")) {
      setActiveSection("bio")
    } else if (command.includes("genomics") || command.includes("genome")) {
      setActiveSection("bio")
    } else if (command.includes("chemistry") || command.includes("compound")) {
      setActiveSection("chemistry")
    } else if (command.includes("devices")) {
      setActiveSection("devices")
    } else if (command.includes("mwave") || command.includes("m-wave")) {
      setActiveSection("mwave")
    } else if (command.includes("agents") || command.includes("topology")) {
      setActiveSection("agents")
    } else if (command.includes("containers") || command.includes("docker")) {
      setActiveSection("pipeline")
    } else if (command.includes("sync") || command.includes("synchronize")) {
      triggerSync()
    } else if (command.includes("refresh") || command.includes("update")) {
      fetchHealth()
      fetchHealthAll()
      fetchStats()
    } else if (command.includes("search")) {
      const searchMatch = command.match(/search(?:\s+for)?\s+(.+)/i)
      if (searchMatch) {
        setSearchQuery(searchMatch[1].trim())
        setActiveSection("encyclopedia")
      }
    }

    return () => clearTimeout(timeout)
  }, [lastTranscript, fetchHealth, fetchHealthAll, fetchStats, triggerSync])

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchHealth(),
        fetchHealthAll(),
        fetchStats(),
        fetchConsole(),
        fetchFieldDevices(),
        fetchTaxa(),
        fetchObservations(),
        fetchETLStatus(),
      ])
      setIsLoading(false)
    }
    loadAll()

    const interval = setInterval(() => {
      fetchHealth()
      fetchHealthAll()
      fetchStats()
      fetchConsole()
      fetchFieldDevices()
    }, 30000)

    return () => clearInterval(interval)
  }, [
    fetchHealth,
    fetchHealthAll,
    fetchStats,
    fetchConsole,
    fetchFieldDevices,
    fetchTaxa,
    fetchObservations,
    fetchETLStatus,
  ])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTaxa(searchQuery || undefined)
    }, 500)
    return () => clearTimeout(timeout)
  }, [searchQuery, fetchTaxa])

  const getHealthStatus = () => {
    if (!health) return { status: "unknown", color: "#6B7280" }
    if (health.status === "healthy" && health.api && health.database) {
      return { status: "online", color: "#22C55E" }
    }
    if (health.status === "degraded") {
      return { status: "warning", color: "#F59E0B" }
    }
    return { status: "offline", color: "#EF4444" }
  }

  const healthStatus = getHealthStatus()
  const headerStatus =
    healthStatus.status === "online" ||
    healthStatus.status === "offline" ||
    healthStatus.status === "warning"
      ? healthStatus.status
      : "offline"

  return (
    <div className="relative min-h-dvh bg-[#0A0A0F] overflow-hidden">
      <TronCircuitAnimation
        opacity={0.08}
        lineColor="#8B5CF6"
        glowColor="#A855F7"
        particleColor="#22D3EE"
        particleCount={18}
        gridSize={96}
      />

      <div className="relative z-10 flex h-screen">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
              <motion.header className="mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
                          boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
                        }}
                      >
                        <Database className="h-6 w-6 text-white" />
                      </div>
                      <GlowingStatus status={headerStatus} size={14} animated />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <NeonText color="purple" size="xl">
                          MINDEX
                        </NeonText>
                        <span className="text-gray-400 font-normal text-lg">Infrastructure</span>
                      </h1>
                      <p className="text-sm text-gray-500">
                        Cryptographic intelligence database - v{health?.version || "2.0"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (isListening ? stopListening() : startListening())}
                      disabled={!isConnected && connectionState !== "connecting"}
                      className={`border-purple-500/30 ${
                        isListening
                          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2 animate-pulse" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Voice
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchHealth()
                        fetchHealthAll()
                        fetchStats()
                        fetchConsole()
                      }}
                      disabled={isLoading}
                      className="border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>

                  {voiceCommand ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-6 top-20 z-50"
                    >
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1">
                        <Mic className="h-3 w-3 mr-2" />
                        {voiceCommand}
                      </Badge>
                    </motion.div>
                  ) : null}
                </div>
              </motion.header>

              <div>
                {activeSection === "overview" ? (
                  <OverviewSection
                    health={health}
                    healthAll={healthAll}
                    stats={stats}
                    console={consolePayload}
                    fieldDevices={fieldDevices}
                    observations={observations}
                    isLoading={isLoading}
                  />
                ) : null}

                {activeSection === "data" ? (
                  <DataSection
                    stats={stats}
                    console={consolePayload}
                    healthAll={healthAll}
                    etlStatus={etlStatus}
                    fieldDevices={fieldDevices}
                    taxa={taxa}
                    observations={observations}
                  />
                ) : null}

                {activeSection === "library" ? (
                  <LibrarySection fieldDevices={fieldDevices} />
                ) : null}

                {activeSection === "encyclopedia" ? (
                  <EncyclopediaSection
                    taxa={taxa}
                    observations={observations}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedTaxon={selectedTaxon}
                    setSelectedTaxon={setSelectedTaxon}
                    taxaError={taxaError}
                    stats={stats}
                    isLoading={isLoading}
                  />
                ) : null}

                {activeSection === "pipeline" ? (
                  <DataPipelineSection
                    stats={stats}
                    etlStatus={etlStatus}
                    console={consolePayload}
                    isSyncing={isSyncing}
                    triggerSync={triggerSync}
                    runEtlJob={runEtlJob}
                  />
                ) : null}

                {activeSection === "integrity" ? (
                  <IntegritySection
                    integrityRecordId={integrityRecordId}
                    setIntegrityRecordId={setIntegrityRecordId}
                    setSelectedTaxon={setSelectedTaxon}
                  />
                ) : null}

                {activeSection === "ledger" ? <LedgerSection /> : null}

                {activeSection === "network" ? <NetworkSection /> : null}

                {activeSection === "bio" ? <BioSection stats={stats} /> : null}

                {activeSection === "chemistry" ? <ChemistrySection /> : null}


                {activeSection === "mwave" ? <MWaveSection /> : null}

                {activeSection === "agents" ? <AgentsSection /> : null}
              </div>
            </div>
          </ScrollArea>
        </div>

        <motion.aside
          className={`h-full border-l border-purple-500/20 bg-black/60 backdrop-blur-xl ${
            sidebarCollapsed ? "w-16" : "w-56"
          }`}
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 224 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-purple-500/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full justify-center text-gray-400 hover:text-purple-400"
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`} />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {MINDEX_NAV_ITEMS.map((item) => (
                  <MindexNavButton
                    key={item.id}
                    item={item}
                    isActive={activeSection === item.id}
                    isCollapsed={sidebarCollapsed}
                    onClick={() => setActiveSection(item.id)}
                  />
                ))}
              </div>
            </ScrollArea>

            {!sidebarCollapsed ? (
              <div className="p-4 border-t border-purple-500/20">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Taxa</span>
                    <span className="font-mono text-purple-400">{stats?.total_taxa?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Observations</span>
                    <span className="font-mono text-cyan-400">{stats?.total_observations?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Mycosoft devices</span>
                    <span className="font-mono text-green-400">
                      {(fieldDevices?.count ?? healthAll?.counts?.telemetry_devices)?.toLocaleString() ?? "--"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
