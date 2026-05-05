"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TronCircuitAnimation } from "@/components/ui/tron-circuit-animation"
import { NeonText, GlowingStatus } from "@/components/ui/glowing-border"
import { Database, Mic, MicOff, RefreshCw, ChevronRight } from "lucide-react"
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"

import type {
  ETLStatus,
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
import { EncyclopediaSection } from "@/components/mindex/tabs/encyclopedia-tab"
import { DataPipelineSection } from "@/components/mindex/tabs/data-pipeline-tab"
import { IntegritySection } from "@/components/mindex/tabs/integrity-tab"
import { LedgerSection } from "@/components/mindex/tabs/ledger-tab"
import { NetworkSection } from "@/components/mindex/tabs/network-tab"
import { BioSection } from "@/components/mindex/tabs/bio-tab"
import { ChemistrySection } from "@/components/mindex/tabs/chemistry-tab"
import { DevicesSection } from "@/components/mindex/tabs/devices-tab"
import { MWaveSection } from "@/components/mindex/tabs/mwave-tab"
import { AgentsSection } from "@/components/mindex/tabs/agents-tab"

export function MINDEXDashboard() {
  const [health, setHealth] = useState<MINDEXHealth | null>(null)
  const [healthAll, setHealthAll] = useState<MindexHealthAll | null>(null)
  const [stats, setStats] = useState<MINDEXStats | null>(null)
  const [taxa, setTaxa] = useState<Taxon[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [etlStatus, setEtlStatus] = useState<ETLStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
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
      if (res.ok) {
        const data = await res.json()
        setTaxa(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch taxa:", error)
    }
  }, [])

  const fetchObservations = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/observations?limit=100")
      if (res.ok) {
        const data = await res.json()
        setObservations(data.observations || [])
      }
    } catch (error) {
      console.error("Failed to fetch observations:", error)
    }
  }, [])

  const fetchETLStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/sync")
      if (res.ok) {
        const data = await res.json()
        setEtlStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch ETL status:", error)
    }
  }, [])

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
            fetchStats()
            fetchETLStatus()
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
    [fetchStats, fetchETLStatus],
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
    } else if (command.includes("data") || command.includes("pipeline")) {
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
      setActiveSection("data")
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
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchHealth, fetchHealthAll, fetchStats, fetchTaxa, fetchObservations, fetchETLStatus])

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
        opacity={0.2}
        lineColor="#8B5CF6"
        glowColor="#A855F7"
        particleColor="#22D3EE"
        particleCount={40}
        gridSize={80}
      />

      <div className="relative z-10 flex h-screen">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
              <motion.header className="mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
                          boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
                        }}
                        animate={{
                          boxShadow: [
                            "0 0 30px rgba(139, 92, 246, 0.5)",
                            "0 0 50px rgba(139, 92, 246, 0.8)",
                            "0 0 30px rgba(139, 92, 246, 0.5)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Database className="h-6 w-6 text-white" />
                      </motion.div>
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
                        Cryptographic Intelligence Database • v{health?.version || "2.0"}
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

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === "overview" ? (
                    <OverviewSection
                      health={health}
                      healthAll={healthAll}
                      stats={stats}
                      observations={observations}
                      isLoading={isLoading}
                    />
                  ) : null}

                  {activeSection === "encyclopedia" ? (
                    <EncyclopediaSection
                      taxa={taxa}
                      observations={observations}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      selectedTaxon={selectedTaxon}
                      setSelectedTaxon={setSelectedTaxon}
                      stats={stats}
                      isLoading={isLoading}
                    />
                  ) : null}

                  {activeSection === "data" ? (
                    <DataPipelineSection
                      stats={stats}
                      etlStatus={etlStatus}
                      isSyncing={isSyncing}
                      triggerSync={triggerSync}
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

                  {activeSection === "devices" ? <DevicesSection /> : null}

                  {activeSection === "mwave" ? <MWaveSection /> : null}

                  {activeSection === "agents" ? <AgentsSection /> : null}
                </motion.div>
              </AnimatePresence>
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
                    <span>Telemetry devices</span>
                    <span className="font-mono text-green-400">
                      {healthAll?.counts?.telemetry_devices != null
                        ? healthAll.counts.telemetry_devices.toLocaleString()
                        : "—"}
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
