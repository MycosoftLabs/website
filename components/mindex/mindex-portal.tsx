"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Database,
  Shield,
  Lock,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Fingerprint,
  Globe,
  Microscope,
  Code,
  Terminal,
  Server,
  Layers,
  Zap,
  Clock,
  FileText,
  Search,
  Activity,
  Cpu,
  Link as LinkIcon,
  GitBranch,
  HardDrive,
  Cloud,
  Network,
  Eye,
  Radio,
  Wind,
  AlertTriangle,
  RefreshCw,
  Key,
  Hash,
  Binary,
  TreeDeciduous,
  BookOpen,
  Wallet,
  Dna,
  Waves,
  Container
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ParticleTrails } from "@/components/ui/particle-trails"
import { ColorDiffusion } from "@/components/ui/color-diffusion"
import { ParticleConstellation } from "@/components/ui/particle-constellation"

// Data Integrity Features
const integrityFeatures = [
  {
    id: "hash-chain",
    title: "Hash Chain Verification",
    icon: Hash,
    description: "Every data record is cryptographically hashed and chained to previous records, creating an immutable audit trail.",
    details: "MINDEX uses SHA-256 hash chains to ensure data integrity. Any modification to historical records would break the chain, immediately exposing tampering attempts.",
    color: "purple"
  },
  {
    id: "timestamping",
    title: "Trusted Timestamping",
    icon: Clock,
    description: "All observations and samples receive cryptographic timestamps from distributed timestamp authorities.",
    details: "Timestamps are anchored to blockchain networks, providing independent verification of when data was recorded. Critical for chain-of-custody requirements.",
    color: "blue"
  },
  {
    id: "merkle-tree",
    title: "Merkle Tree Structure",
    icon: TreeDeciduous,
    description: "Data is organized in Merkle trees, allowing efficient verification of any subset without revealing the entire dataset.",
    details: "Enables selective disclosure for privacy-sensitive applications while maintaining provable completeness and authenticity.",
    color: "green"
  },
  {
    id: "digital-signatures",
    title: "Digital Signatures",
    icon: Fingerprint,
    description: "Device and user signatures authenticate the origin of every data point in the system.",
    details: "Each MycoBrain device has a unique cryptographic identity. All telemetry is signed at the source, creating non-repudiable records.",
    color: "orange"
  }
]

// Protocol Features
const protocolFeatures = [
  {
    title: "Mycorrhizae Protocol",
    icon: Network,
    description: "Secure, efficient data transmission standard for environmental sensor networks",
    specs: ["End-to-end encryption", "Low-bandwidth optimized", "Mesh network resilient", "Device authentication"]
  },
  {
    title: "Hyphae Language",
    icon: Code,
    description: "Domain-specific language for environmental data transformation and analysis",
    specs: ["Type-safe queries", "Temporal operators", "Geospatial functions", "Schema evolution"]
  },
  {
    title: "MINDEX API",
    icon: Terminal,
    description: "RESTful and gRPC interfaces for seamless integration with existing systems",
    specs: ["GraphQL support", "Rate limiting", "OAuth 2.0", "Batch operations"]
  }
]

// Use Case Data
const useCases = [
  {
    title: "Environmental Research",
    icon: Microscope,
    description: "Track fungal observations with guaranteed authenticity for academic publications.",
    example: "A researcher studying climate impact on mycelium networks can prove their data hasn't been altered since collection, meeting journal data integrity requirements."
  },
  {
    title: "Regulatory Compliance",
    icon: Shield,
    description: "Maintain auditable records for environmental monitoring and biosurveillance.",
    example: "DoD installations use MINDEX to create tamper-evident logs of environmental conditions, meeting chain-of-custody requirements for legal proceedings."
  },
  {
    title: "Supply Chain Verification",
    icon: CheckCircle2,
    description: "Verify authenticity and origin of biological samples and products.",
    example: "Mushroom cultivators can prove provenance of their products, from spore source through harvest, with cryptographically verifiable records."
  },
  {
    title: "Citizen Science",
    icon: Globe,
    description: "Contribute to global fungal databases with verifiable, timestamped observations.",
    example: "Amateur mycologists submit observations that are automatically verified and integrated into the global MINDEX network for research use."
  }
]

// Ledger status types
interface LedgerStatus {
  bitcoin: { connected: boolean; lastAnchor: string; inscriptions: number }
  solana: { connected: boolean; lastTx: string; records: number }
  hypergraph: { connected: boolean; dagHeight: number; nodes: number }
}

// Stats data (would be fetched from API in production)
const defaultStats = {
  totalTaxa: 5529,
  totalObservations: 2491,
  devicesConnected: 42,
  verifiedRecords: 2491,
  dataSources: 3,
  hashesGenerated: 12847
}

const defaultLedgerStatus: LedgerStatus = {
  bitcoin: { connected: true, lastAnchor: "2026-01-24T08:32:00Z", inscriptions: 847 },
  solana: { connected: true, lastTx: "2026-01-24T10:15:00Z", records: 12453 },
  hypergraph: { connected: true, dagHeight: 847291, nodes: 35892 }
}

export function MINDEXPortal() {
  const [selectedFeature, setSelectedFeature] = useState(integrityFeatures[0])
  const [hoveredUseCase, setHoveredUseCase] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [liveStats, setLiveStats] = useState(defaultStats)
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus>(defaultLedgerStatus)
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch live stats from API
  useEffect(() => {
    setMounted(true)
    
    async function fetchStats() {
      try {
        const res = await fetch("/api/natureos/mindex/stats")
        if (res.ok) {
          const data = await res.json()
          setLiveStats({
            totalTaxa: data.total_taxa || defaultStats.totalTaxa,
            totalObservations: data.total_observations || defaultStats.totalObservations,
            devicesConnected: data.devices_connected || defaultStats.devicesConnected,
            verifiedRecords: data.verified_records || data.total_observations || defaultStats.verifiedRecords,
            dataSources: Object.keys(data.taxa_by_source || {}).length || defaultStats.dataSources,
            hashesGenerated: data.hashes_generated || defaultStats.hashesGenerated
          })
        }
      } catch (error) {
        console.error("Failed to fetch MINDEX stats:", error)
      }
    }

    async function fetchLedgerStatus() {
      try {
        const res = await fetch("/api/natureos/mindex/ledger")
        if (res.ok) {
          const data = await res.json()
          // Transform API response to LedgerStatus format
          setLedgerStatus({
            bitcoin: {
              connected: data.bitcoin?.connected ?? false,
              lastAnchor: data.bitcoin?.block_height ? `Block ${data.bitcoin.block_height}` : "N/A",
              inscriptions: data.bitcoin?.mempool_size ?? 0
            },
            solana: {
              connected: data.solana?.connected ?? false,
              lastTx: data.solana?.slot ? `Slot ${data.solana.slot}` : "N/A",
              records: data.solana?.block_height ?? 0
            },
            hypergraph: {
              connected: data.hypergraph?.connected ?? false,
              dagHeight: data.hypergraph?.dag_height ?? 0,
              nodes: data.hypergraph?.dag_height ?? 0
            }
          })
        }
      } catch (error) {
        // Use defaults if ledger endpoint not available
        console.log("Ledger status endpoint not available, using defaults")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    fetchLedgerStatus()

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchLedgerStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
          
          {/* Gradient orbs */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          
          {/* Data visualization background */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            {mounted && [...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-xs font-mono text-purple-500/50"
                initial={{ 
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                  y: -50 
                }}
                animate={{ 
                  y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000
                }}
                transition={{ 
                  duration: 10 + Math.random() * 10, 
                  repeat: Infinity, 
                  delay: Math.random() * 5 
                }}
              >
                {`0x${Math.random().toString(16).slice(2, 10)}`}
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="container max-w-7xl mx-auto relative z-10 text-center px-4">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-xs tracking-widest font-mono px-4 py-1">
              CRYPTOGRAPHIC DATA INTEGRITY
            </Badge>
          </motion.div>

          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
              <div className="relative p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl border border-purple-500/30">
                <Database className="h-16 w-16 text-purple-400" />
              </div>
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400">
              MINDEX
            </span>
          </motion.h1>

          {/* Full Name */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl md:text-3xl text-muted-foreground mb-4 font-light"
          >
            Mycosoft Data Integrity Index
          </motion.p>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12"
          >
            The world&apos;s first cryptographically-secured mycological database.
            <br className="hidden md:block" />
            Tamper-evident records. Provable chain-of-custody. Trusted environmental intelligence.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-lg px-8 bg-purple-600 hover:bg-purple-700" asChild>
              <Link href="/natureos/mindex">
                Open MINDEX Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-cyan-500/30 hover:bg-cyan-500/10" asChild>
              <Link href="/natureos/mindex/explorer">
                Species Explorer
                <Globe className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-purple-500/30 hover:bg-purple-500/10" asChild>
              <Link href="#documentation">
                View Documentation
                <FileText className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Live Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto"
          >
            {[
              { label: "Taxa Indexed", value: liveStats.totalTaxa.toLocaleString(), icon: Microscope },
              { label: "Observations", value: liveStats.totalObservations.toLocaleString(), icon: Eye },
              { label: "Devices", value: liveStats.devicesConnected, icon: Radio },
              { label: "Verified", value: "100%", icon: CheckCircle2 },
              { label: "Data Sources", value: liveStats.dataSources, icon: Database },
              { label: "Hashes", value: `${(liveStats.hashesGenerated / 1000).toFixed(1)}k`, icon: Hash }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.05 }}
                className="bg-background/50 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4"
              >
                <stat.icon className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-400">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-purple-500/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-purple-500/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Why MINDEX Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Why MINDEX?</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Environmental Data Demands Trust
            </h2>
            <p className="text-xl text-muted-foreground">
              In an era of misinformation, environmental data must be verifiable, immutable, and traceable. 
              MINDEX ensures every observation, every sample, and every measurement can be trusted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: "Tamper-Evident",
                description: "Cryptographic hashes detect any unauthorized modifications instantly",
                stat: "0",
                statLabel: "Data breaches"
              },
              {
                icon: Clock,
                title: "Timestamped",
                description: "Every record has a verifiable timestamp anchored to distributed systems",
                stat: "1ms",
                statLabel: "Timestamp precision"
              },
              {
                icon: Fingerprint,
                title: "Authenticated",
                description: "Device and user signatures prove the origin of every data point",
                stat: "100%",
                statLabel: "Signed records"
              },
              {
                icon: Globe,
                title: "Interoperable",
                description: "Standard protocols enable integration with existing research systems",
                stat: "3+",
                statLabel: "Data sources"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-purple-500/20 hover:border-purple-500/40 transition-colors bg-background/50">
                  <CardHeader>
                    <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-4">
                      <feature.icon className="h-8 w-8 text-purple-400" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-400">{feature.stat}</div>
                    <div className="text-sm text-muted-foreground">{feature.statLabel}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Cryptographic Integrity */}
      <section className="py-24 relative overflow-hidden">
        {/* Particle Trails Background Animation */}
        <div className="absolute inset-0 pointer-events-none">
          <ParticleTrails opacity={0.5} particleCount={600} hue={280} />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/60" />
        </div>
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Feature Selection */}
            <div>
              <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Technical Architecture</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Cryptographic Integrity
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                MINDEX uses multiple layers of cryptographic verification to ensure data integrity 
                from the moment of collection through long-term storage and retrieval.
              </p>

              <div className="space-y-3">
                {integrityFeatures.map((feature) => (
                  <motion.div
                    key={feature.id}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                      selectedFeature.id === feature.id 
                        ? "bg-purple-500/10 border border-purple-500/30" 
                        : "bg-muted/50 hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => setSelectedFeature(feature)}
                    whileHover={{ x: 4 }}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedFeature.id === feature.id ? "bg-purple-500/20" : "bg-background"
                    }`}>
                      <feature.icon className={`h-5 w-5 ${
                        selectedFeature.id === feature.id ? "text-purple-400" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        selectedFeature.id === feature.id ? "text-foreground" : ""
                      }`}>
                        {feature.title}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {feature.description}
                      </div>
                    </div>
                    {selectedFeature.id === feature.id && (
                      <ChevronRight className="h-4 w-4 text-purple-400" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Feature Details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedFeature.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 rounded-3xl p-8 border border-purple-500/20"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 bg-purple-500/20 rounded-2xl">
                    <selectedFeature.icon className="h-10 w-10 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedFeature.title}</h3>
                    <p className="text-muted-foreground">{selectedFeature.description}</p>
                  </div>
                </div>

                <div className="bg-background/50 rounded-xl p-6 mb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedFeature.details}
                  </p>
                </div>

                {/* Visual representation */}
                <div className="bg-muted/30 rounded-xl p-6">
                  <div className="text-xs font-mono text-muted-foreground mb-3">Example Structure:</div>
                  <pre className="text-sm font-mono text-purple-400 overflow-x-auto">
{selectedFeature.id === "hash-chain" ? `{
  "record_id": "obs_2024_00847",
  "data_hash": "sha256:e3b0c44298fc...",
  "prev_hash": "sha256:a7ffc6f8bf1a...",
  "signature": "ed25519:b5bb9d8014a0..."
}` : selectedFeature.id === "timestamping" ? `{
  "timestamp": "2024-01-22T14:32:00Z",
  "tsa_signature": "rfc3161:...",
  "anchor_block": 847291,
  "anchor_chain": "ethereum"
}` : selectedFeature.id === "merkle-tree" ? `{
  "root_hash": "sha256:c4ca4238a0b9...",
  "proof_path": [
    "sha256:eccbc87e4b5c...",
    "sha256:a87ff679a2f3..."
  ],
  "leaf_index": 42
}` : `{
  "device_id": "mycobrain_0042",
  "public_key": "ed25519:MC4CA...",
  "signature": "base64:...",
  "signed_at": "2024-01-22T14:32:00Z"
}`}
                  </pre>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* MINDEX Capabilities Section */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-500/10 text-green-400 border-green-500/30">Capabilities</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Comprehensive Data Intelligence
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              MINDEX provides 12 major sections of functionality, from species encyclopedia to genomics visualization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: "Species Encyclopedia", 
                href: "/natureos/mindex", 
                icon: BookOpen, 
                description: "Search 5,500+ fungal taxa with real-time data from GBIF, iNaturalist, and MushroomObserver" 
              },
              { 
                title: "Data Pipeline", 
                href: "/natureos/mindex", 
                icon: Activity, 
                description: "ETL sync from 3 major sources with automated quality metrics" 
              },
              { 
                title: "Integrity Verification", 
                href: "/natureos/mindex", 
                icon: Shield, 
                description: "Cryptographic hash chains, timestamps, and tamper-evident records" 
              },
              { 
                title: "Cryptography", 
                href: "/natureos/mindex", 
                icon: Lock, 
                description: "SHA-256 hashing, Merkle trees, and digital signatures" 
              },
              { 
                title: "Ledger Anchoring", 
                href: "/natureos/mindex", 
                icon: Wallet, 
                description: "Bitcoin Ordinals, Solana, and Constellation Hypergraph" 
              },
              { 
                title: "Mycorrhizal Network", 
                href: "/natureos/mindex", 
                icon: Network, 
                description: "Protocol-based device mesh communication" 
              },
              { 
                title: "Phylogenetic Trees", 
                href: "/natureos/mindex", 
                icon: GitBranch, 
                description: "Evolutionary relationships and ancestry visualization" 
              },
              { 
                title: "Genomics Browser", 
                href: "/natureos/mindex", 
                icon: Dna, 
                description: "JBrowse, Gosling, and Circos genome visualization" 
              },
              { 
                title: "FCI Devices", 
                href: "/natureos/mindex", 
                icon: Cpu, 
                description: "Real-time MycoBrain device monitoring and telemetry" 
              },
              { 
                title: "M-Wave Analysis", 
                href: "/natureos/mindex", 
                icon: Waves, 
                description: "Seismic data correlation with fungal networks" 
              },
              { 
                title: "Docker Containers", 
                href: "/natureos/mindex", 
                icon: Container, 
                description: "Infrastructure monitoring on VM 192.168.0.189" 
              },
              { 
                title: "Species Explorer", 
                href: "/natureos/mindex/explorer", 
                icon: Globe, 
                description: "Interactive map of 2,400+ geolocated observations" 
              }
            ].map((capability, index) => (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <CardHeader>
                    <Link href={capability.href} className="group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                          <capability.icon className="h-6 w-6 text-purple-400" />
                        </div>
                        <CardTitle className="text-base group-hover:text-purple-400 transition-colors">
                          {capability.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {capability.description}
                      </CardDescription>
                    </Link>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Protocols Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Integration</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for Developers
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              MINDEX provides comprehensive APIs and protocols for seamless integration 
              with NatureOS, MycoBrain devices, and external research systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {protocolFeatures.map((protocol, index) => (
              <motion.div
                key={protocol.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-purple-500/20 hover:border-purple-500/40 transition-colors">
                  <CardHeader>
                    <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-4">
                      <protocol.icon className="h-8 w-8 text-purple-400" />
                    </div>
                    <CardTitle>{protocol.title}</CardTitle>
                    <CardDescription>{protocol.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {protocol.specs.map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Code Example */}
          <div className="bg-background rounded-2xl border border-purple-500/20 overflow-hidden" id="documentation">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-purple-500/20">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium">Quick Start</span>
            </div>
            <div className="p-6">
              <Tabs defaultValue="typescript" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="typescript">TypeScript SDK</TabsTrigger>
                  <TabsTrigger value="rest">REST API</TabsTrigger>
                  <TabsTrigger value="shell">Cloud Shell</TabsTrigger>
                </TabsList>

                <TabsContent value="typescript">
                  <pre className="text-sm font-mono text-purple-400 overflow-x-auto bg-muted/30 p-4 rounded-lg">
{`import { createMINDEXClient } from "@/lib/sdk/mindex"

const mindex = createMINDEXClient()

// Get database statistics
const stats = await mindex.getStats()
console.log(\`Total taxa: \${stats.total_taxa}\`)

// Search for species
const results = await mindex.search({
  query: "Pleurotus ostreatus",
  type: "taxa",
  limit: 10
})

// Get observations with verified integrity
const observations = await mindex.getObservations({
  taxonId: 123,
  hasLocation: true,
  verified: true
})`}
                  </pre>
                </TabsContent>

                <TabsContent value="rest">
                  <pre className="text-sm font-mono text-purple-400 overflow-x-auto bg-muted/30 p-4 rounded-lg">
{`# Get MINDEX statistics
curl https://api.mycosoft.com/mindex/stats

# Search for taxa
curl "https://api.mycosoft.com/mindex/search?q=Agaricus&type=taxa&limit=20"

# Get verified observations
curl "https://api.mycosoft.com/mindex/observations?verified=true&limit=100"

# Verify record integrity
curl "https://api.mycosoft.com/mindex/verify/obs_2024_00847"`}
                  </pre>
                </TabsContent>

                <TabsContent value="shell">
                  <pre className="text-sm font-mono text-purple-400 overflow-x-auto bg-muted/30 p-4 rounded-lg">
{`# NatureOS Cloud Shell Commands

> mindex stats
Total Taxa: 5,529 | Observations: 2,491 | Verified: 100%

> mindex search Pleurotus
Found 15 taxa matching "Pleurotus"

> mindex taxa get 123
Pleurotus ostreatus (Oyster Mushroom)
Hash: sha256:e3b0c44298fc...
Verified: ✓

> mindex verify obs_2024_00847
Record integrity verified ✓
Timestamp: 2024-01-22T14:32:00Z
Signer: mycobrain_0042`}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Color Diffusion Background Animation - Rainbow grid that diffuses */}
        <div className="absolute inset-0">
          <ColorDiffusion opacity={0.4} step={10} cellSize={9} exchangesPerFrame={800} />
          {/* Light gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/40 pointer-events-none" />
        </div>
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Applications</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted Data for Every Use Case
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From academic research to regulatory compliance, MINDEX provides the foundation 
              for verifiable environmental data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredUseCase(useCase.title)}
                onMouseLeave={() => setHoveredUseCase(null)}
              >
                <Card className={`h-full transition-all cursor-pointer ${
                  hoveredUseCase === useCase.title 
                    ? "border-purple-500/50 shadow-lg shadow-purple-500/10" 
                    : "border-purple-500/20"
                }`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        hoveredUseCase === useCase.title ? "bg-purple-500/20" : "bg-muted"
                      }`}>
                        <useCase.icon className={`h-6 w-6 transition-colors ${
                          hoveredUseCase === useCase.title ? "text-purple-400" : "text-muted-foreground"
                        }`} />
                      </div>
                      <CardTitle className={`transition-colors ${
                        hoveredUseCase === useCase.title ? "text-purple-400" : ""
                      }`}>
                        {useCase.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {useCase.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Example</div>
                      <p className="text-sm">{useCase.example}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Flow Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Data Flow</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              From Device to Database
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every data point flows through a verified pipeline, ensuring integrity at every step.
            </p>
          </div>

          {/* Flow diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-5xl mx-auto">
            {[
              { icon: Radio, label: "Device", desc: "MycoBrain sensors collect data and sign at source" },
              { icon: Network, label: "Mesh", desc: "Encrypted transmission via Mycorrhizae Protocol" },
              { icon: Server, label: "Gateway", desc: "Validation, timestamping, and hash generation" },
              { icon: Database, label: "MINDEX", desc: "Merkle tree storage with chain anchoring" },
              { icon: Cloud, label: "NatureOS", desc: "Visualization and API access" }
            ].map((step, index, arr) => (
              <div key={step.label} className="flex items-center gap-4 md:gap-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center"
                >
                  <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30 mb-3">
                    <step.icon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="text-sm font-bold">{step.label}</div>
                  <div className="text-xs text-muted-foreground text-center max-w-[120px]">{step.desc}</div>
                </motion.div>
                {index < arr.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    viewport={{ once: true }}
                    className="hidden md:block"
                  >
                    <ArrowRight className="h-6 w-6 text-purple-500/50" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Particle Constellation Background Animation */}
        <div className="absolute inset-0">
          <ParticleConstellation opacity={0.6} particleCount={120} sphereRadius={400} />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/40 pointer-events-none" />
        </div>
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
              <div className="relative p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl border border-purple-500/30">
                <Database className="h-16 w-16 text-purple-400" />
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Explore MINDEX?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Access the world&apos;s most trusted mycological database through NatureOS, 
              or integrate directly with your research systems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/natureos/mindex">
                  Open MINDEX Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-cyan-500/30 hover:bg-cyan-500/20" asChild>
                <Link href="/natureos/mindex/explorer">
                  Species Explorer
                  <Globe className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-purple-500/30" asChild>
                <Link href="#documentation">
                  API Documentation
                  <Code className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Ledger Status */}
            <div className="mt-12 pt-12 border-t border-purple-500/20">
              <div className="text-sm text-muted-foreground mb-4">Ledger Anchoring Status</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                {/* Bitcoin */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-background/50 backdrop-blur-xl border border-orange-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-400 font-medium text-sm">Bitcoin</span>
                    <div className={`h-2 w-2 rounded-full ${ledgerStatus.bitcoin.connected ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                  <div className="text-2xl font-bold text-orange-400">{ledgerStatus.bitcoin.inscriptions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Ordinals inscriptions</div>
                </motion.div>

                {/* Solana */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-background/50 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 font-medium text-sm">Solana</span>
                    <div className={`h-2 w-2 rounded-full ${ledgerStatus.solana.connected ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{ledgerStatus.solana.records.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Anchored records</div>
                </motion.div>

                {/* Hypergraph */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-background/50 backdrop-blur-xl border border-blue-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 font-medium text-sm">Hypergraph</span>
                    <div className={`h-2 w-2 rounded-full ${ledgerStatus.hypergraph.connected ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{ledgerStatus.hypergraph.nodes.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">DAG nodes</div>
                </motion.div>
              </div>

              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>Cryptographically Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-400" />
                  <span>Global Data Network</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-400" />
                  <span>Tamper-Evident Records</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

