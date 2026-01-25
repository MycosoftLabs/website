"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TronCircuitAnimation } from "@/components/ui/tron-circuit-animation"
import { DataBlockViz, MiniBlockRow, TransactionBlockStrip } from "@/components/ui/data-block-viz"
import { PixelGridViz, MerklePixelTree, HashCompareViz, HashStreamViz } from "@/components/ui/pixel-grid-viz"
import { GlassCard, GlowingBorder, TravelingBorder, CornerAccents, NeonText, GlowingStatus } from "@/components/ui/glowing-border"
import { MINDEXSearchInput } from "@/components/mindex/search-input"
import { MINDEXVerificationPanel } from "@/components/mindex/verification-panel"
import { MINDEXIntegrityBadge } from "@/components/mindex/integrity-badge"
import { HashChainVisualizer } from "@/components/mindex/hash-chain-visualizer"
import { MerkleTreeViz } from "@/components/mindex/merkle-tree-viz"
import { SignaturePanel } from "@/components/mindex/signature-panel"
import { CryptoMonitor } from "@/components/mindex/crypto-monitor"
import { DataFlow } from "@/components/mindex/data-flow"
import { QueryMonitor } from "@/components/mindex/query-monitor"
import { AgentActivity } from "@/components/mindex/agent-activity"
import { LedgerPanel } from "@/components/mindex/ledger-panel"
import { OrdinalsViewer } from "@/components/mindex/ordinals-viewer"
import { MycorrhizalNetworkViz } from "@/components/mindex/mycorrhizal-network-viz"
import { FCIDeviceMonitor } from "@/components/mindex/fci-device-monitor"
import { MWaveDashboard } from "@/components/mindex/mwave-dashboard"
import { PhylogeneticTree } from "@/components/ancestry/phylogenetic-tree"
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Search, 
  Globe, 
  MapPin,
  BookOpen,
  Dna,
  Server,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Zap,
  Layers,
  Network,
  ExternalLink,
  Filter,
  X,
  Shield,
  Lock,
  FileText,
  Radio,
  Cpu,
  Box,
  Eye,
  ChevronRight,
  LayoutDashboard,
  Binary,
  Hexagon,
  GitBranch,
  Wallet,
  Waves,
  Container
} from "lucide-react"

// ==================== Types ====================
interface MINDEXHealth {
  status: "healthy" | "unhealthy" | "degraded"
  api: boolean
  database: boolean
  etl: string
  version?: string
  uptime?: number
}

interface MINDEXStats {
  total_taxa: number
  total_observations: number
  total_external_ids: number
  taxa_by_source: Record<string, number>
  observations_by_source: Record<string, number>
  observations_with_location: number
  observations_with_images: number
  taxa_with_observations: number
  observation_date_range: { earliest: string | null; latest: string | null }
  etl_status: "running" | "idle" | "unknown"
  genome_records: number
  trait_records: number
  synonym_records: number
}

interface Taxon {
  id: string
  canonical_name: string
  rank: string
  common_name?: string
  authority?: string
  description?: string
  source: string
  metadata?: any
  created_at: string
  updated_at: string
}

interface Observation {
  id: string
  taxon_id: string
  observed_at: string
  location?: { type: string; coordinates: number[] }
  media?: any[]
  source: string
  metadata?: any
}

interface DockerContainer {
  id: string
  name: string
  status: string
  image: string
  ports: string[]
  health?: string
}

interface ETLStatus {
  status: string
  sync_interval_hours: number
  max_records_per_source: number
  recent_syncs: Array<{
    source: string
    data_type: string
    records_count: number
    errors_count: number
    completed_at: string
    status: string
  }>
  available_sources: string[]
}

// ==================== Widget Sections ====================
type WidgetSection = 
  | "overview"
  | "encyclopedia"
  | "data"
  | "integrity"
  | "cryptography"
  | "ledger"
  | "network"
  | "phylogeny"
  | "devices"
  | "mwave"
  | "containers"

interface NavItem {
  id: WidgetSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "#8B5CF6" },
  { id: "encyclopedia", label: "Encyclopedia", icon: BookOpen, color: "#22D3EE" },
  { id: "data", label: "Data Pipeline", icon: Activity, color: "#10B981" },
  { id: "integrity", label: "Integrity", icon: Shield, color: "#F59E0B" },
  { id: "cryptography", label: "Cryptography", icon: Lock, color: "#A855F7" },
  { id: "ledger", label: "Ledger", icon: Wallet, color: "#3B82F6" },
  { id: "network", label: "Network", icon: Network, color: "#06B6D4" },
  { id: "phylogeny", label: "Phylogeny", icon: GitBranch, color: "#EC4899" },
  { id: "devices", label: "Devices", icon: Cpu, color: "#8B5CF6" },
  { id: "mwave", label: "M-Wave", icon: Waves, color: "#F97316" },
  { id: "containers", label: "Containers", icon: Container, color: "#6366F1" }
]

// ==================== Main Dashboard Component ====================
export function MINDEXDashboard() {
  const [health, setHealth] = useState<MINDEXHealth | null>(null)
  const [stats, setStats] = useState<MINDEXStats | null>(null)
  const [taxa, setTaxa] = useState<Taxon[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [etlStatus, setEtlStatus] = useState<ETLStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTaxon, setSelectedTaxon] = useState<Taxon | null>(null)
  const [activeSection, setActiveSection] = useState<WidgetSection>("overview")
  const [integrityRecordId, setIntegrityRecordId] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ==================== Data Fetching ====================
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
          uptime: data?.uptime
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

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/containers")
      if (res.ok) {
        const data = await res.json()
        const mindexContainers = (data.containers || []).filter((c: any) => 
          c.name?.toLowerCase().includes("mindex")
        )
        setContainers(mindexContainers)
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error)
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

  const triggerSync = useCallback(async (sources?: string[]) => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/natureos/mindex/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, limit: 10000 })
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
  }, [fetchStats, fetchETLStatus])

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchHealth(),
        fetchStats(),
        fetchTaxa(),
        fetchObservations(),
        fetchContainers(),
        fetchETLStatus()
      ])
      setIsLoading(false)
    }
    loadAll()

    const interval = setInterval(() => {
      fetchHealth()
      fetchStats()
      fetchContainers()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchHealth, fetchStats, fetchTaxa, fetchObservations, fetchContainers, fetchETLStatus])

  // Search taxa
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

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] overflow-hidden">
      {/* Background Circuit Animation - 20% opacity for subtle effect */}
      <TronCircuitAnimation 
        opacity={0.2}
        lineColor="#8B5CF6"
        glowColor="#A855F7"
        particleColor="#22D3EE"
        particleCount={40}
        gridSize={80}
      />

      {/* Main Layout: Content + Sidebar */}
      <div className="relative z-10 flex h-screen">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
              {/* Header */}
              <motion.header 
                className="mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
                          boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)"
                        }}
                        animate={{
                          boxShadow: [
                            "0 0 30px rgba(139, 92, 246, 0.5)",
                            "0 0 50px rgba(139, 92, 246, 0.8)",
                            "0 0 30px rgba(139, 92, 246, 0.5)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Database className="h-6 w-6 text-white" />
                      </motion.div>
                      <GlowingStatus 
                        status={healthStatus.status as any}
                        size={14}
                        animated
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <NeonText color="purple" size="xl">MINDEX</NeonText>
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
                      onClick={() => {
                        fetchHealth()
                        fetchStats()
                        fetchContainers()
                      }}
                      disabled={isLoading}
                      className="border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </motion.header>

              {/* Section Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === "overview" && (
                    <OverviewSection 
                      health={health}
                      stats={stats}
                      observations={observations}
                      isLoading={isLoading}
                    />
                  )}

                  {activeSection === "encyclopedia" && (
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
                  )}

                  {activeSection === "data" && (
                    <DataPipelineSection
                      stats={stats}
                      etlStatus={etlStatus}
                      isSyncing={isSyncing}
                      triggerSync={triggerSync}
                    />
                  )}

                  {activeSection === "integrity" && (
                    <IntegritySection
                      integrityRecordId={integrityRecordId}
                      setIntegrityRecordId={setIntegrityRecordId}
                      setSelectedTaxon={setSelectedTaxon}
                    />
                  )}

                  {activeSection === "cryptography" && <CryptographySection />}
                  
                  {activeSection === "ledger" && <LedgerSection />}
                  
                  {activeSection === "network" && <NetworkSection />}
                  
                  {activeSection === "phylogeny" && <PhylogenySection />}
                  
                  {activeSection === "devices" && <DevicesSection />}
                  
                  {activeSection === "mwave" && <MWaveSection />}
                  
                  {activeSection === "containers" && (
                    <ContainersSection
                      containers={containers}
                      fetchContainers={fetchContainers}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar Navigation */}
        <motion.aside
          className={`h-full border-l border-purple-500/20 bg-black/60 backdrop-blur-xl ${
            sidebarCollapsed ? "w-16" : "w-56"
          }`}
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 224 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
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

            {/* Navigation Items */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeSection === item.id}
                    isCollapsed={sidebarCollapsed}
                    onClick={() => setActiveSection(item.id)}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Sidebar Footer - Quick Stats */}
            {!sidebarCollapsed && (
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
                    <span>Containers</span>
                    <span className="font-mono text-green-400">{containers.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}

// ==================== Navigation Button ====================
function NavButton({ 
  item, 
  isActive, 
  isCollapsed, 
  onClick 
}: { 
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void 
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive 
          ? "bg-purple-500/20 text-white" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
      style={{
        boxShadow: isActive ? `0 0 20px ${item.color}40` : undefined,
        borderLeft: isActive ? `2px solid ${item.color}` : "2px solid transparent"
      }}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <item.icon 
        className="h-5 w-5 flex-shrink-0" 
        style={{ color: isActive ? item.color : undefined }}
      />
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {isActive && !isCollapsed && (
        <motion.div
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: item.color }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}

// ==================== Overview Section ====================
function OverviewSection({ 
  health, 
  stats, 
  observations,
  isLoading 
}: { 
  health: MINDEXHealth | null
  stats: MINDEXStats | null
  observations: Observation[]
  isLoading: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="API Status"
          value={health?.api ? "Online" : "Offline"}
          icon={Server}
          color="purple"
          status={health?.api ? "online" : "offline"}
          subtitle={`Version ${health?.version || "unknown"}`}
        />
        <StatCard
          title="Database"
          value={health?.database ? "Connected" : "Disconnected"}
          icon={Database}
          color="cyan"
          status={health?.database ? "online" : "offline"}
          subtitle="PostGIS"
        />
        <StatCard
          title="ETL Status"
          value={stats?.etl_status === "running" ? "Running" : "Idle"}
          icon={Activity}
          color="green"
          status={stats?.etl_status === "running" ? "processing" : "warning"}
          subtitle="Data sync"
        />
        <StatCard
          title="Total Taxa"
          value={stats?.total_taxa?.toLocaleString() || "0"}
          icon={BookOpen}
          color="orange"
          subtitle="Species cataloged"
        />
      </div>

      {/* Live Data Blocks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="purple">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Hexagon className="h-5 w-5 text-purple-400" />
              Live Data Blocks
            </h3>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              Real-time
            </Badge>
          </div>
          <DataBlockViz 
            maxBlocks={6}
            blockSize={45}
            colorScheme="purple"
            animated
            showLabels
          />
        </GlassCard>

        <GlassCard color="cyan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Binary className="h-5 w-5 text-cyan-400" />
              Hash Stream
            </h3>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              Live
            </Badge>
          </div>
          <HashStreamViz 
            colorScheme="cyan"
            height={120}
            streamSpeed={1.5}
          />
        </GlassCard>
      </div>

      {/* Statistics & Metrics */}
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
          <MiniBlockRow count={8} colorScheme="purple" className="mt-4" />
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Data Sources</h3>
          <div className="space-y-2">
            {stats?.taxa_by_source && Object.entries(stats.taxa_by_source).slice(0, 5).map(([source, count]) => (
              <div key={source} className="flex justify-between text-sm">
                <span className="text-gray-400 capitalize">{source}</span>
                <span className="font-mono text-cyan-300">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <MiniBlockRow count={6} colorScheme="cyan" className="mt-4" />
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
          <MiniBlockRow count={5} colorScheme="green" className="mt-4" />
        </GlassCard>
      </div>

      {/* Recent Activity */}
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
                <Badge className="bg-purple-500/20 text-purple-300 border-none text-xs">
                  {obs.source}
                </Badge>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  )
}

// ==================== Stat Card Component ====================
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  status,
  subtitle
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: "purple" | "cyan" | "green" | "orange"
  status?: "online" | "offline" | "warning" | "processing"
  subtitle?: string
}) {
  const colors = {
    purple: { bg: "rgba(139, 92, 246, 0.1)", border: "#8B5CF6", text: "#A855F7" },
    cyan: { bg: "rgba(6, 182, 212, 0.1)", border: "#06B6D4", text: "#22D3EE" },
    green: { bg: "rgba(34, 197, 94, 0.1)", border: "#22C55E", text: "#4ADE80" },
    orange: { bg: "rgba(249, 115, 22, 0.1)", border: "#F97316", text: "#FB923C" }
  }

  const scheme = colors[color]

  return (
    <motion.div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        background: scheme.bg,
        border: `1px solid ${scheme.border}30`,
        boxShadow: `0 0 20px ${scheme.border}20`
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {status && <GlowingStatus status={status} size={10} />}
          <Icon className="h-5 w-5" style={{ color: scheme.text }} />
        </div>
      </div>
    </motion.div>
  )
}

// ==================== Encyclopedia Section ====================
function EncyclopediaSection({
  taxa,
  observations,
  searchQuery,
  setSearchQuery,
  selectedTaxon,
  setSelectedTaxon,
  stats,
  isLoading
}: {
  taxa: Taxon[]
  observations: Observation[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTaxon: Taxon | null
  setSelectedTaxon: (t: Taxon | null) => void
  stats: MINDEXStats | null
  isLoading: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-400" />
          Fungi Encyclopedia
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search species, common names, or taxonomy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500"
            />
          </div>
          <Button variant="outline" className="border-purple-500/30 text-purple-300">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </GlassCard>

      {/* Selected Taxon Detail */}
      {selectedTaxon && (
        <TravelingBorder color="cyan">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedTaxon.canonical_name}</h3>
                {selectedTaxon.common_name && (
                  <p className="text-cyan-400">{selectedTaxon.common_name}</p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedTaxon(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rank:</span>
                  <span className="text-white capitalize">{selectedTaxon.rank}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Source:</span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-none">
                    {selectedTaxon.source}
                  </Badge>
                </div>
              </div>
              <div>
                <PixelGridViz
                  rows={4}
                  cols={8}
                  pixelSize={8}
                  colorScheme="cyan"
                  showHash={false}
                  animated={false}
                />
              </div>
            </div>
          </div>
        </TravelingBorder>
      )}

      {/* Taxa Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {taxa.slice(0, 9).map((taxon, i) => (
          <motion.div
            key={taxon.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard 
              color="purple" 
              className="cursor-pointer hover:scale-[1.02] transition-transform"
              padding="p-4"
            >
              <div onClick={() => setSelectedTaxon(taxon)}>
                <h4 className="font-semibold text-white mb-1">{taxon.canonical_name}</h4>
                {taxon.common_name && (
                  <p className="text-sm text-gray-400 mb-2">{taxon.common_name}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/20 text-purple-300 border-none text-xs">
                    {taxon.rank}
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-xs">
                    {taxon.source}
                  </Badge>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {taxa.length > 9 && (
        <p className="text-center text-sm text-gray-500">
          Showing 9 of {taxa.length} species
        </p>
      )}
    </div>
  )
}

// ==================== Data Pipeline Section ====================
function DataPipelineSection({
  stats,
  etlStatus,
  isSyncing,
  triggerSync
}: {
  stats: MINDEXStats | null
  etlStatus: ETLStatus | null
  isSyncing: boolean
  triggerSync: (sources?: string[]) => void
}) {
  return (
    <div className="space-y-6">
      {/* Sync Control */}
      <TravelingBorder color="green">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Data Sync Control
              </h3>
              <p className="text-sm text-gray-400">Trigger manual sync from external databases</p>
            </div>
            <Button 
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {etlStatus?.available_sources?.map((source) => (
              <Button
                key={source}
                variant="outline"
                size="sm"
                onClick={() => triggerSync([source])}
                disabled={isSyncing}
                className="border-green-500/30 text-green-300 hover:bg-green-500/20"
              >
                <Globe className="h-3 w-3 mr-1" />
                {source}
              </Button>
            ))}
          </div>
        </div>
      </TravelingBorder>

      {/* Data Flow Visualization */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="green">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Blocks</h3>
          <TransactionBlockStrip height={80} />
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>Low fee</span>
            <span>Medium fee</span>
            <span>High fee</span>
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-4">Data Quality</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Location Data</span>
                <span className="text-cyan-300">
                  {stats && stats.total_observations > 0
                    ? Math.round((stats.observations_with_location / stats.total_observations) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={stats && stats.total_observations > 0
                  ? (stats.observations_with_location / stats.total_observations) * 100
                  : 0} 
                className="h-2 bg-gray-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Image Enrichment</span>
                <span className="text-cyan-300">
                  {stats && stats.total_observations > 0
                    ? Math.round((stats.observations_with_images / stats.total_observations) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={stats && stats.total_observations > 0
                  ? (stats.observations_with_images / stats.total_observations) * 100
                  : 0} 
                className="h-2 bg-gray-800"
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* V2 Components */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DataFlow />
        <QueryMonitor />
      </div>
      <AgentActivity />
    </div>
  )
}

// ==================== Integrity Section ====================
function IntegritySection({
  integrityRecordId,
  setIntegrityRecordId,
  setSelectedTaxon
}: {
  integrityRecordId: string
  setIntegrityRecordId: (id: string) => void
  setSelectedTaxon: (t: Taxon | null) => void
}) {
  return (
    <div className="space-y-6">
      <GlassCard color="orange">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-400" />
          Integrity Verification
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Search Taxa</label>
            <MINDEXSearchInput
              onSelectTaxonId={async (taxonId) => {
                try {
                  const res = await fetch(`/api/natureos/mindex/taxa/${encodeURIComponent(taxonId)}`)
                  if (res.ok) {
                    const data = await res.json()
                    setSelectedTaxon(data)
                  }
                } catch {}
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Verify Record ID</label>
            <Input
              value={integrityRecordId}
              onChange={(e) => setIntegrityRecordId(e.target.value)}
              placeholder="Enter record ID..."
              className="bg-black/40 border-orange-500/30 text-white"
            />
            {integrityRecordId.trim() && (
              <MINDEXIntegrityBadge recordId={integrityRecordId.trim()} />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Hash Comparison */}
      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4">Hash Verification</h3>
        <HashCompareViz />
      </GlassCard>

      {integrityRecordId.trim() && (
        <MINDEXVerificationPanel recordId={integrityRecordId.trim()} />
      )}
    </div>
  )
}

// ==================== Cryptography Section ====================
function CryptographySection() {
  return (
    <div className="space-y-6">
      {/* Visual Hash/Merkle Displays */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="purple">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-400" />
            Hash Visualization
          </h3>
          <div className="flex justify-center">
            <PixelGridViz
              rows={8}
              cols={16}
              pixelSize={10}
              colorScheme="purple"
              animated
            />
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-cyan-400" />
            Merkle Tree
          </h3>
          <MerklePixelTree depth={3} />
        </GlassCard>
      </div>

      {/* Cryptographic Data Blocks */}
      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4">Cryptographic Blocks</h3>
        <DataBlockViz 
          maxBlocks={8}
          blockSize={55}
          colorScheme="purple"
          orientation="horizontal"
          animated
          showLabels
        />
      </GlassCard>

      {/* V2 Crypto Components */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HashChainVisualizer />
        <MerkleTreeViz />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SignaturePanel />
        <CryptoMonitor />
      </div>
    </div>
  )
}

// ==================== Ledger Section ====================
function LedgerSection() {
  return (
    <div className="space-y-6">
      {/* Mempool-style Block Display */}
      <GlassCard color="cyan">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-cyan-400" />
          Ledger Blocks
        </h3>
        <DataBlockViz 
          maxBlocks={10}
          blockSize={50}
          colorScheme="cyan"
          animated
          showLabels
        />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <LedgerPanel />
        <OrdinalsViewer />
      </div>
    </div>
  )
}

// ==================== Network Section ====================
function NetworkSection() {
  return (
    <div className="space-y-6">
      <MycorrhizalNetworkViz />
    </div>
  )
}

// ==================== Phylogeny Section ====================
function PhylogenySection() {
  return (
    <div className="space-y-6">
      <GlassCard color="purple" padding="p-2">
        <PhylogeneticTree 
          height={550}
          showControls={true}
          showLegend={true}
          treeType="radial"
        />
      </GlassCard>

      <GlassCard color="purple">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Dna className="h-5 w-5 text-purple-400" />
              Ancestry Integration
            </h3>
            <p className="text-sm text-gray-400">
              DNA ancestry trees, genetic database, sequence alignment
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="border-purple-500/30 text-purple-300">
            <a href="/ancestry/phylogeny">
              Open Ancestry
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

// ==================== Devices Section ====================
function DevicesSection() {
  return (
    <div className="space-y-6">
      <FCIDeviceMonitor />
    </div>
  )
}

// ==================== M-Wave Section ====================
function MWaveSection() {
  return (
    <div className="space-y-6">
      <MWaveDashboard />
    </div>
  )
}

// ==================== Containers Section ====================
function ContainersSection({
  containers,
  fetchContainers
}: {
  containers: DockerContainer[]
  fetchContainers: () => void
}) {
  return (
    <div className="space-y-6">
      <GlassCard color="cyan">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Container className="h-5 w-5 text-cyan-400" />
            MINDEX Docker Containers
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchContainers}
            className="border-cyan-500/30 text-cyan-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {containers.map((container, i) => (
            <motion.div
              key={container.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <GlowingStatus 
                  status={container.status === "running" ? "online" : "offline"}
                  size={10}
                />
                <div>
                  <div className="font-medium text-white">{container.name}</div>
                  <div className="text-sm text-gray-500">{container.image}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${
                  container.status === "running" 
                    ? "bg-green-500/20 text-green-300" 
                    : "bg-gray-500/20 text-gray-300"
                } border-none`}>
                  {container.status}
                </Badge>
                {container.ports.length > 0 && (
                  <span className="text-xs text-gray-500 font-mono">
                    {container.ports.join(", ")}
                  </span>
                )}
              </div>
            </motion.div>
          ))}

          {containers.length === 0 && (
            <div className="text-center py-12">
              <Container className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-2">No MINDEX containers found</p>
              <code className="text-xs text-gray-500 bg-black/40 px-3 py-2 rounded block max-w-md mx-auto">
                docker-compose -f docker-compose.mindex.yml up -d
              </code>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
