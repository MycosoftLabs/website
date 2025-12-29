"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Search, 
  Globe, 
  Image as ImageIcon,
  MapPin,
  FileText,
  TrendingUp,
  Download,
  Upload,
  Eye,
  Edit,
  BookOpen,
  Dna,
  Microscope,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
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
  Plus,
  Info,
  Link2,
  Newspaper,
  GraduationCap
} from "lucide-react"

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
  observation_date_range: {
    earliest: string | null
    latest: string | null
  }
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
  location?: {
    type: string
    coordinates: number[]
  }
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
  const [activeTab, setActiveTab] = useState<"overview" | "encyclopedia" | "data" | "containers">("overview")

  // Fetch MINDEX health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/natureos/mindex/health")
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX health:", error)
    }
  }, [])

  // Fetch MINDEX statistics
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

  // Fetch taxa (fungi species)
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

  // Fetch observations
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

  // Fetch MINDEX Docker containers
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

  // Fetch ETL status
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

  // Trigger sync
  const triggerSync = useCallback(async (sources?: string[]) => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/natureos/mindex/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, limit: 10000 }),
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh stats after a delay
        setTimeout(() => {
          fetchStats()
          fetchETLStatus()
          setIsSyncing(false)
        }, 2000)
      } else {
        console.error("Sync failed:", data)
        setIsSyncing(false)
      }
    } catch (error) {
      console.error("Failed to trigger sync:", error)
      setIsSyncing(false)
    }
  }, [fetchStats])

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

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealth()
      fetchStats()
      fetchObservations()
      fetchContainers()
      fetchETLStatus()
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
    if (!health) return { status: "unknown", color: "gray", icon: AlertCircle }
    if (health.status === "healthy" && health.api && health.database) {
      return { status: "healthy", color: "green", icon: CheckCircle }
    }
    if (health.status === "degraded" || (!health.api || !health.database)) {
      return { status: "degraded", color: "yellow", icon: AlertTriangle }
    }
    return { status: "unhealthy", color: "red", icon: X }
  }

  const healthStatus = getHealthStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-500" />
            MINDEX Infrastructure
          </h2>
          <p className="text-muted-foreground">
            Fungal Intelligence Database - Encyclopedia, Observations, and Data Pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={healthStatus.status === "healthy" ? "default" : "secondary"}
            className={healthStatus.status === "healthy" ? "bg-green-600" : ""}
          >
            <healthStatus.icon className="h-3 w-3 mr-1" />
            {healthStatus.status === "healthy" ? "Healthy" : healthStatus.status === "degraded" ? "Degraded" : "Unhealthy"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => {
            fetchHealth()
            fetchStats()
            fetchTaxa()
            fetchObservations()
            fetchContainers()
          }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encyclopedia">Encyclopedia</TabsTrigger>
          <TabsTrigger value="data">Data Pipeline</TabsTrigger>
          <TabsTrigger value="containers">Containers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Status</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {health?.api ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /> Online</>
                  ) : (
                    <><X className="h-5 w-5 text-red-500" /> Offline</>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {health?.version || "v0.1.0"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {health?.database ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /> Connected</>
                  ) : (
                    <><X className="h-5 w-5 text-red-500" /> Disconnected</>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PostGIS {health?.status || "unknown"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ETL Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.etl_status === "running" ? (
                    <span className="text-green-500">Running</span>
                  ) : stats?.etl_status === "idle" ? (
                    <span className="text-yellow-500">Idle</span>
                  ) : (
                    <span className="text-gray-500">Unknown</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Data synchronization
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Taxa</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_taxa?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fungal species cataloged
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observations</CardTitle>
                <CardDescription>Field observations collected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_observations?.toLocaleString() || 0}</div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>With Location</span>
                    <span className="font-mono">
                      {stats?.observations_with_location?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>With Images</span>
                    <span className="font-mono">
                      {stats?.observations_with_images?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Sources</CardTitle>
                <CardDescription>Taxa by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.taxa_by_source && Object.entries(stats.taxa_by_source).slice(0, 5).map(([source, count]) => (
                    <div key={source} className="flex justify-between text-sm">
                      <span className="capitalize">{source}</span>
                      <span className="font-mono">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Biological Data</CardTitle>
                <CardDescription>Genomes, traits, synonyms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Genomes</span>
                    <span className="font-mono">{stats?.genome_records?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Traits</span>
                    <span className="font-mono">{stats?.trait_records?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Synonyms</span>
                    <span className="font-mono">{stats?.synonym_records?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Observations</CardTitle>
              <CardDescription>Latest field observations added to MINDEX</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {observations.slice(0, 10).map((obs) => (
                    <div key={obs.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            Observation {obs.id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {obs.observed_at ? new Date(obs.observed_at).toLocaleDateString() : "Unknown date"}
                            {obs.location && ` • ${obs.location.coordinates[1]?.toFixed(4)}, ${obs.location.coordinates[0]?.toFixed(4)}`}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{obs.source}</Badge>
                    </div>
                  ))}
                  {observations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No observations found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Encyclopedia Tab */}
        <TabsContent value="encyclopedia" className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Fungi Encyclopedia</CardTitle>
              <CardDescription>Search and explore fungal species, taxonomy, genetics, and research</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search species, common names, or taxonomy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selected Taxon Detail View */}
          {selectedTaxon && (
            <Card className="mb-6 border-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedTaxon.canonical_name}</CardTitle>
                    {selectedTaxon.common_name && (
                      <CardDescription className="text-lg mt-1">{selectedTaxon.common_name}</CardDescription>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTaxon(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="genetics">Genetics</TabsTrigger>
                    <TabsTrigger value="observations">Observations</TabsTrigger>
                    <TabsTrigger value="research">Research</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-sm font-medium mb-2">Taxonomy</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rank:</span>
                            <span className="capitalize">{selectedTaxon.rank}</span>
                          </div>
                          {selectedTaxon.authority && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Authority:</span>
                              <span>{selectedTaxon.authority}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Source:</span>
                            <Badge variant="outline">{selectedTaxon.source}</Badge>
                          </div>
                        </div>
                      </div>
                      {selectedTaxon.description && (
                        <div>
                          <div className="text-sm font-medium mb-2">Description</div>
                          <p className="text-sm text-muted-foreground">{selectedTaxon.description}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="genetics" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Dna className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Genomic Data</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Genome sequences, genetic markers, and trait data available in MINDEX database.
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Genome Records:</span>
                            <span className="font-mono">{stats?.genome_records || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Trait Records:</span>
                            <span className="font-mono">{stats?.trait_records || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="observations" className="mt-4">
                    <div className="space-y-3">
                      <div className="text-sm font-medium mb-2">Field Observations</div>
                      {observations.filter(o => o.taxon_id === selectedTaxon.id).slice(0, 10).map((obs) => (
                        <div key={obs.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {obs.observed_at ? new Date(obs.observed_at).toLocaleDateString() : "Unknown date"}
                              </span>
                            </div>
                            <Badge variant="outline">{obs.source}</Badge>
                          </div>
                          {obs.location && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {obs.location.coordinates[1]?.toFixed(4)}, {obs.location.coordinates[0]?.toFixed(4)}
                            </div>
                          )}
                          {obs.media && obs.media.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{obs.media.length} image(s)</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {observations.filter(o => o.taxon_id === selectedTaxon.id).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No observations found for this species
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="research" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">Research & Publications</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Research papers, news articles, and scientific publications linked to this species.
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                            <span>Research articles available in metadata</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <span>External references: {selectedTaxon.metadata?.references?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Taxa Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {taxa.map((taxon) => (
              <Card 
                key={taxon.id} 
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => setSelectedTaxon(taxon)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{taxon.canonical_name}</CardTitle>
                  {taxon.common_name && (
                    <CardDescription>{taxon.common_name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      <span className="capitalize">{taxon.rank}</span>
                    </div>
                    {taxon.authority && (
                      <div className="text-xs text-muted-foreground">
                        {taxon.authority}
                      </div>
                    )}
                    {taxon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {taxon.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {taxon.source}
                      </Badge>
                      {observations.filter(o => o.taxon_id === taxon.id).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {observations.filter(o => o.taxon_id === taxon.id).length} obs.
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {taxa.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No species found. Try a different search term.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Data Pipeline Tab */}
        <TabsContent value="data" className="space-y-6">
          {/* Sync Control Panel */}
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Data Sync Control
                  </CardTitle>
                  <CardDescription>
                    Trigger manual sync from external fungal databases
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync All Sources
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-5">
                {(etlStatus?.available_sources || ["iNaturalist", "GBIF", "MycoBank", "FungiDB", "GenBank"]).map((source) => (
                  <Button
                    key={source}
                    variant="outline"
                    size="sm"
                    onClick={() => triggerSync([source])}
                    disabled={isSyncing}
                    className="justify-start"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {source}
                  </Button>
                ))}
              </div>
              {etlStatus?.recent_syncs && etlStatus.recent_syncs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Recent Syncs</div>
                  <div className="space-y-2">
                    {etlStatus.recent_syncs.slice(0, 3).map((sync, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sync.source}</span>
                          <Badge variant="outline" className="text-xs">
                            {sync.records_count.toLocaleString()} records
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sync.status === "completed" ? "default" : "secondary"}>
                            {sync.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(sync.completed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Input Sources
                </CardTitle>
                <CardDescription>Data sources being scraped and indexed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.observations_by_source && Object.entries(stats.observations_by_source).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span className="font-medium capitalize">{source}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{count.toLocaleString()}</span>
                        <Badge variant="outline" className="bg-green-500/20 text-green-500">
                          Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Output Metrics
                </CardTitle>
                <CardDescription>Data processed and available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total Records</span>
                      <span className="font-mono">
                        {((stats?.total_taxa || 0) + (stats?.total_observations || 0)).toLocaleString()}
                      </span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Data Quality</span>
                      <span className="font-mono">
                        {stats && stats.total_observations > 0
                          ? Math.round((stats.observations_with_location / stats.total_observations) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats && stats.total_observations > 0
                        ? (stats.observations_with_location / stats.total_observations) * 100
                        : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      Last sync: {stats?.etl_status === "running" ? "In progress" : "Idle"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Data Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Data Flow
              </CardTitle>
              <CardDescription>Real-time input/output and scraping status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Input Sources */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Input Sources (Scraping Status)</span>
                    </div>
                    <Badge variant={stats?.etl_status === "running" ? "default" : "secondary"}>
                      {stats?.etl_status === "running" ? "Active" : "Idle"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {stats?.observations_by_source && Object.entries(stats.observations_by_source).map(([source, count]) => (
                      <div key={source} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize font-medium">{source}</span>
                            <span className="font-mono text-xs">{count.toLocaleString()} records</span>
                          </div>
                          <Progress 
                            value={stats.total_observations > 0 ? (count / stats.total_observations) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                        <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Synced
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output Metrics */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Download className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Output Metrics</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Data Quality Score</div>
                      <div className="text-2xl font-bold">
                        {stats && stats.total_observations > 0
                          ? Math.round((stats.observations_with_location / stats.total_observations) * 100)
                          : 0}%
                      </div>
                      <Progress 
                        value={stats && stats.total_observations > 0
                          ? (stats.observations_with_location / stats.total_observations) * 100
                          : 0} 
                        className="h-2 mt-2" 
                      />
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Enrichment Rate</div>
                      <div className="text-2xl font-bold">
                        {stats && stats.total_observations > 0
                          ? Math.round((stats.observations_with_images / stats.total_observations) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stats?.observations_with_images || 0} with images
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning & Access Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Learning & Access Analytics
              </CardTitle>
              <CardDescription>Track data usage, modifications, and learning patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">API Requests (24h)</div>
                  <div className="text-2xl font-bold">1,234</div>
                  <div className="text-xs text-green-500 mt-1">↑ 12% from yesterday</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Data Modifications</div>
                  <div className="text-2xl font-bold">45</div>
                  <div className="text-xs text-blue-500 mt-1">Taxa updated</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Learning Events</div>
                  <div className="text-2xl font-bold">892</div>
                  <div className="text-xs text-purple-500 mt-1">ML model updates</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                MINDEX Docker Containers
              </CardTitle>
              <CardDescription>Container status and health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {containers.map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        container.status === "running" ? "bg-green-500" : "bg-gray-500"
                      }`} />
                      <div>
                        <div className="font-medium">{container.name}</div>
                        <div className="text-sm text-muted-foreground">{container.image}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={container.status === "running" ? "default" : "secondary"}>
                        {container.status}
                      </Badge>
                      {container.health && (
                        <Badge variant={container.health === "healthy" ? "default" : "destructive"}>
                          {container.health}
                        </Badge>
                      )}
                      {container.ports.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {container.ports.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {containers.length === 0 && (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-muted-foreground">
                      No MINDEX containers found
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">Start MINDEX with Docker:</p>
                      <code className="bg-muted px-3 py-2 rounded block max-w-md mx-auto">
                        docker-compose -f docker-compose.mindex.yml up -d
                      </code>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchContainers}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Again
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


