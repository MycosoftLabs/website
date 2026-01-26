"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Shield, 
  Radio, 
  Microscope, 
  AlertTriangle, 
  Globe, 
  Radar,
  Cpu,
  Network,
  Database,
  Eye,
  Target,
  Lock,
  Zap,
  ChevronRight,
  ArrowRight,
  Activity,
  Waves,
  Thermometer,
  Wind,
  Droplets,
  Bug,
  Factory,
  Building2,
  Anchor,
  Plane,
  MapPin,
  BarChart3,
  LineChart,
  Users,
  FileText,
  CheckCircle2,
  X,
  Code,
  Terminal,
  Layers,
  Wifi,
  Server,
  Bot,
  Satellite,
  Map,
  Bell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mission Critical Application Modal
interface MissionModalData {
  title: string
  icon: React.ElementType
  problem: string
  scenario: string
  outcome: string
  impact: string
  solutions: {
    category: string
    items: { name: string; description: string; link?: string }[]
  }[]
}

const missionCriticalData: MissionModalData[] = [
  {
    title: "Installation Threat Detection",
    icon: Building2,
    problem: "DoD installations face invisible environmental threats - contamination, infrastructure degradation, and biological hazards that current systems cannot detect until significant damage has occurred.",
    scenario: "A CONUS base with legacy fuel storage sees a small but persistent OEI anomaly—elevated microbial stress and VOC signature near a buried pipe.",
    outcome: "OEI detects the anomaly before surface staining. Early detection prevents groundwater contamination and major cleanup costs.",
    impact: "72 hours earlier detection | $2.3M remediation avoided",
    solutions: [
      {
        category: "Hardware Platforms",
        items: [
          { name: "Mushroom 1", description: "Autonomous deployment for perimeter and installation monitoring", link: "/devices/mushroom-1" },
          { name: "MycoNode", description: "Subsurface bioelectric probes for detecting contamination signatures", link: "/devices/myconode" },
          { name: "ALARM", description: "Interior sensors for facility environmental monitoring", link: "/devices/alarm" }
        ]
      },
      {
        category: "Software & Analytics",
        items: [
          { name: "NatureOS", description: "Unified command center for real-time visualization and alerts", link: "/natureos" },
          { name: "CREP Dashboard", description: "Common Relevant Environmental Picture for situational awareness", link: "/dashboard/crep" },
          { name: "Nature Learning Model", description: "AI-powered anomaly detection and pattern recognition" }
        ]
      },
      {
        category: "Protocols & Data",
        items: [
          { name: "MINDEX Database", description: "Cryptographic chain-of-custody for environmental evidence" },
          { name: "ETA Packets", description: "Environmental Threat Assessment formatted for immediate action" },
          { name: "ESI Monitoring", description: "Environmental Stability Index for continuous baseline tracking" }
        ]
      }
    ]
  },
  {
    title: "Range Management & UXO Zones",
    icon: Target,
    problem: "Training ranges accumulate legacy contamination and UXO that restrict usage, while current detection methods are slow and incomplete.",
    scenario: "An impact area with legacy UXO and heavy metal deposition shows spatially correlated patterns of suppressed microbial activity.",
    outcome: "Range managers adjust use patterns and plan targeted remediation. Long-term availability preserved.",
    impact: "40% reduction in restricted zones | Maintained training capacity",
    solutions: [
      {
        category: "Hardware Platforms",
        items: [
          { name: "Mushroom 1", description: "Autonomous mapping of contaminated zones and UXO-affected areas", link: "/devices/mushroom-1" },
          { name: "MycoNode Grid", description: "Distributed sensing network for wide-area coverage", link: "/devices/myconode" },
          { name: "SporeBase", description: "Atmospheric sampling for airborne hazard monitoring", link: "/devices/sporebase" }
        ]
      },
      {
        category: "Software & Analytics",
        items: [
          { name: "NatureOS Mapping", description: "GIS-integrated visualization of environmental anomalies", link: "/natureos" },
          { name: "Trend Analytics", description: "Historical pattern analysis for remediation planning" },
          { name: "Fusarium Defense", description: "Defense-specific dashboard with tactical overlays", link: "/defense/fusarium" }
        ]
      },
      {
        category: "Intelligence Products",
        items: [
          { name: "BAR Reports", description: "Biological Anomaly Reports for deviation detection" },
          { name: "RER Monitoring", description: "Remediation Effectiveness Reports to track cleanup progress" },
          { name: "MINDEX Logs", description: "Auditable records for compliance and accountability" }
        ]
      }
    ]
  },
  {
    title: "Littoral Base Operations",
    icon: Anchor,
    problem: "Coastal installations face complex environmental challenges including water quality concerns, storm impacts, and marine-terrestrial interaction zones.",
    scenario: "A coastal naval base experiences public concern over water quality with unknown source.",
    outcome: "OEI nodes detect specific microbial patterns associated with upstream civilian infrastructure failure. Evidence enables interagency coordination.",
    impact: "Source identified in 4 hours | Mitigated reputational damage",
    solutions: [
      {
        category: "Hardware Platforms",
        items: [
          { name: "Mushroom 1 Maritime", description: "Corrosion-resistant variant for coastal deployment", link: "/devices/mushroom-1" },
          { name: "MycoNode Aquatic", description: "Submersible probes for marine environment monitoring", link: "/devices/myconode" },
          { name: "SporeBase Coastal", description: "Salt-spray resistant atmospheric sampling", link: "/devices/sporebase" }
        ]
      },
      {
        category: "Software & Analytics",
        items: [
          { name: "NatureOS Marine Module", description: "Specialized visualization for coastal operations", link: "/natureos" },
          { name: "Source Tracking AI", description: "ML-powered contamination source identification" },
          { name: "CREP Maritime", description: "Coastal environmental picture integration", link: "/dashboard/crep" }
        ]
      },
      {
        category: "Integration & Compliance",
        items: [
          { name: "EPA Data Exchange", description: "Automated compliance reporting and data sharing" },
          { name: "Interagency Protocols", description: "Standardized formats for multi-agency coordination" },
          { name: "Evidence Chain", description: "MINDEX integrity for legal and regulatory actions" }
        ]
      }
    ]
  },
  {
    title: "Biothreat Early Warning",
    icon: Bug,
    problem: "Biological threats - whether natural, accidental, or adversarial - require persistent baseline monitoring to enable rapid detection of anomalies.",
    scenario: "Intelligence suggests adversary experimentation with environmental dissemination of biological agents.",
    outcome: "OEI networks provide baseline microbial dynamics. Deviations trigger focused sampling and high-end lab analysis.",
    impact: "Continuous monitoring | Prioritized biosurveillance",
    solutions: [
      {
        category: "Hardware Platforms",
        items: [
          { name: "SporeBase Network", description: "Time-indexed bioaerosol collection for atmospheric biosurveillance", link: "/devices/sporebase" },
          { name: "MycoNode Sentinels", description: "Soil microbiome baseline monitoring", link: "/devices/myconode" },
          { name: "ALARM Indoor", description: "Facility-level biological environment monitoring", link: "/devices/alarm" }
        ]
      },
      {
        category: "Software & AI",
        items: [
          { name: "Nature Learning Model", description: "AI trained on normal microbial dynamics to detect anomalies" },
          { name: "Fusarium Biodefense", description: "Specialized dashboard for biothreat monitoring", link: "/defense/fusarium" },
          { name: "EEW System", description: "Environmental Early Warning automated alerting" }
        ]
      },
      {
        category: "Response Integration",
        items: [
          { name: "Lab Integration", description: "Direct sample chain to high-end analysis facilities" },
          { name: "CBRN Coordination", description: "Integration with existing CBRN detection networks" },
          { name: "Alert Protocols", description: "Tiered escalation based on threat classification" }
        ]
      }
    ]
  }
]

// Intelligence Packet Data
const intelligencePackets = [
  {
    acronym: "ETA",
    name: "Environmental Threat Assessment",
    icon: AlertTriangle,
    description: "Standardized format for communicating environmental hazard intelligence to decision-makers.",
    importance: "Enables commanders to understand environmental risks in their operational area and make informed decisions about force protection and mission planning.",
    baseCount: 500, // Base value - live count generated client-side
    maxVariance: 1000,
    jsonExample: `{
  "packet_type": "ETA",
  "version": "1.2.0",
  "timestamp": "2026-01-19T14:32:00Z",
  "location": {
    "lat": 38.8719,
    "lon": -77.0563,
    "alt_m": 45
  },
  "threat_level": "MODERATE",
  "threat_type": "CONTAMINATION",
  "confidence": 0.87,
  "source_devices": ["M1-0042", "MN-1138"],
  "summary": "Elevated VOC signature detected",
  "recommended_action": "INVESTIGATE"
}`
  },
  {
    acronym: "ESI",
    name: "Environmental Stability Index",
    icon: Activity,
    description: "Quantitative measure of environmental condition and risk level, providing continuous situational awareness.",
    importance: "Establishes baselines and tracks deviations over time. Rising ESI values indicate degrading conditions that may require intervention.",
    baseCount: 2000, // Base value - live count generated client-side
    maxVariance: 5000,
    jsonExample: `{
  "packet_type": "ESI",
  "version": "2.0.1",
  "timestamp": "2026-01-19T14:32:15Z",
  "zone_id": "ZONE-ALPHA-7",
  "index_value": 78.4,
  "trend": "STABLE",
  "components": {
    "microbial_activity": 82.1,
    "chemical_baseline": 75.6,
    "soil_health": 77.5
  },
  "comparison_24h": +1.2,
  "comparison_7d": -0.8,
  "alert_threshold": 65.0
}`
  },
  {
    acronym: "BAR",
    name: "Biological Anomaly Report",
    icon: Bug,
    description: "Alert format for detected biological deviations from established baseline conditions.",
    importance: "Critical for early detection of biological threats, contamination events, or ecosystem disruptions that require immediate attention.",
    baseCount: 50, // Base value - live count generated client-side
    maxVariance: 200,
    jsonExample: `{
  "packet_type": "BAR",
  "version": "1.1.0",
  "timestamp": "2026-01-19T14:33:00Z",
  "anomaly_id": "BAR-20260119-0847",
  "severity": "HIGH",
  "detection_source": "SporeBase-12",
  "anomaly_type": "MICROBIAL_SPIKE",
  "deviation_sigma": 3.7,
  "baseline_period": "30d",
  "affected_area_m2": 2500,
  "confidence": 0.92,
  "requires_sampling": true,
  "escalation": "G2_NOTIFY"
}`
  },
  {
    acronym: "RER",
    name: "Remediation Effectiveness Report",
    icon: BarChart3,
    description: "Assessment of cleanup and mitigation operation success, tracking progress toward environmental restoration.",
    importance: "Enables data-driven decisions about remediation strategies and provides accountability for cleanup efforts.",
    baseCount: 20, // Base value - live count generated client-side
    maxVariance: 100,
    jsonExample: `{
  "packet_type": "RER",
  "version": "1.0.0",
  "timestamp": "2026-01-19T14:34:00Z",
  "project_id": "REM-2025-1847",
  "site_name": "Tank Farm Alpha",
  "period": "WEEKLY",
  "metrics": {
    "contaminant_reduction": 34.7,
    "area_cleared_pct": 28.5,
    "microbial_recovery": 45.2
  },
  "trend": "IMPROVING",
  "projected_completion": "2026-08-15",
  "cost_to_date_usd": 847000,
  "next_milestone": "Phase 2 excavation"
}`
  },
  {
    acronym: "EEW",
    name: "Environmental Early Warning",
    icon: Zap,
    description: "Predictive alert for emerging environmental threats based on pattern analysis and trend detection.",
    importance: "Provides advance warning of environmental conditions that may impact operations, enabling proactive rather than reactive response.",
    baseCount: 10, // Base value - live count generated client-side
    maxVariance: 50,
    jsonExample: `{
  "packet_type": "EEW",
  "version": "1.3.0",
  "timestamp": "2026-01-19T14:35:00Z",
  "warning_id": "EEW-20260119-0023",
  "priority": "URGENT",
  "threat_type": "INFRASTRUCTURE_RISK",
  "prediction_window_hrs": 72,
  "confidence": 0.78,
  "affected_assets": ["Bldg-142", "Pipeline-7"],
  "predicted_impact": "Pipe corrosion failure",
  "recommended_actions": [
    "Immediate inspection",
    "Activate monitoring",
    "Prepare containment"
  ],
  "model_version": "NLM-2.1.0"
}`
  }
]

// DoD Integration Data
const dodIntegrationItems = [
  {
    code: "G-2/J-2",
    desc: "Intelligence feed for environmental threats",
    details: {
      title: "Intelligence Integration (G-2/J-2)",
      description: "OEI provides a new intelligence discipline that complements existing collection capabilities. Environmental data feeds directly into intelligence analysis workflows.",
      capabilities: [
        "ETA packets formatted for intelligence reporting",
        "Pattern-of-life analysis for environmental threats",
        "Adversary activity indicators in environment",
        "Cross-domain intelligence correlation"
      ],
      tools: [
        { name: "MINDEX Intel Export", description: "Classified intelligence product generation" },
        { name: "NLM Analysis", description: "AI-powered pattern recognition" },
        { name: "CREP Dashboard", description: "Situational awareness display" }
      ],
      compliance: ["ICD 503", "NIST 800-53", "DoD 8140"]
    }
  },
  {
    code: "G-3/J-3",
    desc: "Operational planning in degraded environments",
    details: {
      title: "Operations Integration (G-3/J-3)",
      description: "OEI enables operational planning that accounts for environmental factors, ensuring forces can operate effectively in all conditions.",
      capabilities: [
        "Real-time environmental condition overlays",
        "Mission planning with environmental constraints",
        "Route analysis for contaminated zones",
        "Force protection environmental awareness"
      ],
      tools: [
        { name: "NatureOS Ops Module", description: "Tactical planning interface" },
        { name: "ESI Zone Mapping", description: "Environmental stability visualization" },
        { name: "Mushroom 1 Recon", description: "Autonomous environmental reconnaissance" }
      ],
      compliance: ["JP 3-0", "CJCSM 3130.03", "MIL-STD-2525"]
    }
  },
  {
    code: "G-4/J-4",
    desc: "Logistics siting and hazmat operations",
    details: {
      title: "Logistics Integration (G-4/J-4)",
      description: "OEI supports logistics operations by identifying contamination risks, monitoring storage conditions, and ensuring safe materiel handling.",
      capabilities: [
        "Hazmat storage condition monitoring",
        "Fuel storage leak detection",
        "Supply chain environmental compliance",
        "Warehouse climate control verification"
      ],
      tools: [
        { name: "ALARM Network", description: "Facility environmental monitoring" },
        { name: "RER Tracking", description: "Remediation progress monitoring" },
        { name: "MINDEX Chain", description: "Compliance documentation" }
      ],
      compliance: ["DLA 4145.26", "OSHA 1910.120", "40 CFR 264"]
    }
  },
  {
    code: "G-6/J-6",
    desc: "Comms and cyber hardening of OEI networks",
    details: {
      title: "Communications & Cyber (G-6/J-6)",
      description: "OEI networks are designed with defense-grade cybersecurity, ensuring data integrity and availability across tactical and strategic communications.",
      capabilities: [
        "Encrypted mesh network communications",
        "Zero-trust architecture implementation",
        "Resilient tactical data links",
        "Cyber threat detection on OEI networks"
      ],
      tools: [
        { name: "Mycorrhizae Protocol", description: "Secure data transmission standard" },
        { name: "MINDEX Integrity", description: "Cryptographic data verification" },
        { name: "Hyphae Language", description: "Secure device programming" }
      ],
      compliance: ["NIST CSF", "CMMC Level 2", "RMF"]
    }
  },
  {
    code: "JADC2",
    desc: "Joint All-Domain Command and Control integration",
    details: {
      title: "JADC2 Integration",
      description: "OEI provides the environmental sensing layer for Joint All-Domain Command and Control, enabling commanders to understand the operational environment across all domains.",
      capabilities: [
        "Multi-domain environmental data fusion",
        "Machine-to-machine data exchange",
        "Automated decision support",
        "Cross-service environmental awareness"
      ],
      tools: [
        { name: "NatureOS API", description: "RESTful and gRPC integration" },
        { name: "Standard Formats", description: "MIL-STD compliant data exchange" },
        { name: "NLM AI", description: "Automated environmental assessment" }
      ],
      compliance: ["CJADC2 Strategy", "DoD Data Strategy", "ABMS Compatible"]
    }
  }
]

export function DefensePortal() {
  const [activeCapability, setActiveCapability] = useState("oei")
  const [isMounted, setIsMounted] = useState(false)
  const [selectedMission, setSelectedMission] = useState<MissionModalData | null>(null)
  const [hoveredPacket, setHoveredPacket] = useState<string | null>(null)
  const [selectedDodItem, setSelectedDodItem] = useState<typeof dodIntegrationItems[0] | null>(dodIntegrationItems[0])
  
  // Live counts state - generated client-side to avoid hydration mismatch
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({})

  // Generate initial live counts on mount and update periodically
  useEffect(() => {
    setIsMounted(true)
    
    // Generate initial random counts
    const generateCounts = () => {
      const counts: Record<string, number> = {}
      intelligencePackets.forEach(packet => {
        counts[packet.acronym] = packet.baseCount + Math.floor(Math.random() * packet.maxVariance)
      })
      return counts
    }
    
    setLiveCounts(generateCounts())
    
    // Update counts every 5 seconds to simulate live data
    const interval = setInterval(() => {
      setLiveCounts(prev => {
        const newCounts = { ...prev }
        // Randomly adjust counts slightly
        intelligencePackets.forEach(packet => {
          const current = newCounts[packet.acronym] || packet.baseCount
          const variance = Math.floor(Math.random() * 20) - 10 // -10 to +10
          newCounts[packet.acronym] = Math.max(packet.baseCount, current + variance)
        })
        return newCounts
      })
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Helper to get live count for a packet
  const getLiveCount = (acronym: string, baseCount: number) => {
    return liveCounts[acronym] ?? baseCount
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mission Critical Application Modal */}
      <AnimatePresence>
        {selectedMission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMission(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <selectedMission.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedMission.title}</h2>
                    <p className="text-sm text-muted-foreground">Mission Critical Application</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMission(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Problem & Scenario */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <h3 className="font-semibold text-lg">The Problem</h3>
                    </div>
                    <p className="text-muted-foreground">{selectedMission.problem}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-500" />
                      <h3 className="font-semibold text-lg">Scenario</h3>
                    </div>
                    <p className="text-muted-foreground">{selectedMission.scenario}</p>
                  </div>
                </div>

                {/* Outcome */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Outcome</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">{selectedMission.outcome}</p>
                  <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold">
                    {selectedMission.impact}
                  </div>
                </div>

                {/* Solutions */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Mycosoft Solutions</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    {selectedMission.solutions.map((category) => (
                      <div key={category.category} className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                          {category.category}
                        </h4>
                        <div className="space-y-3">
                          {category.items.map((item) => (
                            <div key={item.name} className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors">
                              {item.link ? (
                                <Link href={item.link} className="block group">
                                  <div className="font-medium group-hover:text-primary transition-colors flex items-center gap-1">
                                    {item.name}
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </Link>
                              ) : (
                                <>
                                  <div className="font-medium">{item.name}</div>
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setSelectedMission(null)}>
                    Close
                  </Button>
                  <Button asChild>
                    <Link href="/defense/request-briefing">
                      Request Briefing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section - Palantir/Anduril Style with Full-Screen Video */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Full-screen Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.3)" }}
        >
          <source src="/assets/backgrounds/defense-hero.mp4" type="video/mp4" />
          {/* Fallback gradient if video doesn't load */}
        </video>
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />
        
        {/* Floating Elements */}
        <motion.div 
          className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container max-w-7xl mx-auto relative z-10 text-center px-4">
          {/* Classification Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 text-xs tracking-widest font-mono">
              UNCLASS // FOR OFFICIAL USE ONLY
            </Badge>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/70">
              OPERATIONAL
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-green-500 to-emerald-500">
              ENVIRONMENTAL
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground/70 via-foreground to-foreground">
              INTELLIGENCE
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-12"
          >
            A new intelligence discipline for the Department of Defense.
            <br className="hidden md:block" />
            Persistent biological sensing. Real-time environmental awareness.
            <br className="hidden md:block" />
            Mission-critical infrastructure protection.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-lg px-8 bg-primary hover:bg-primary/90" asChild>
              <Link href="/defense/request-briefing">
                Request Briefing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link href="/defense/capabilities">
                View Capabilities
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex flex-wrap justify-center gap-8 text-muted-foreground text-sm"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>DoD Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <span>NIST Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>FedRAMP Aligned</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Problem Statement Section - Environmental Threats */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Image with Opacity */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/assets/backgrounds/environmental-threats.jpg')",
            opacity: 0.15
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge className="mb-4">The Challenge</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Environmental Threats Are Invisible Until They&apos;re Not
            </h2>
            <p className="text-xl text-muted-foreground">
              DoD installations face contamination, infrastructure degradation, and biological hazards 
              that current intelligence architectures cannot detect in time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Factory,
                title: "Infrastructure Degradation",
                description: "Microbial influenced corrosion, soil weakening under critical facilities",
                stat: "40%",
                statLabel: "of DoD infrastructure at risk"
              },
              {
                icon: Droplets,
                title: "Contamination Dynamics",
                description: "PFAS, fuels, solvents spreading through groundwater undetected",
                stat: "$2.1B",
                statLabel: "annual remediation costs"
              },
              {
                icon: Bug,
                title: "Biological Hazards",
                description: "Soil-borne pathogens, opportunistic fungi in facilities",
                stat: "72h",
                statLabel: "typical detection delay"
              },
              {
                icon: Waves,
                title: "Climate Forcing",
                description: "Coastal erosion, inundation, altered microbial communities",
                stat: "128",
                statLabel: "at-risk coastal installations"
              }
            ].map((threat, index) => (
              <motion.div
                key={threat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-destructive/20 hover:border-destructive/40 transition-colors">
                  <CardHeader>
                    <threat.icon className="h-10 w-10 text-destructive mb-2" />
                    <CardTitle className="text-lg">{threat.title}</CardTitle>
                    <CardDescription>{threat.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-destructive">{threat.stat}</div>
                    <div className="text-sm text-muted-foreground">{threat.statLabel}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OEI Solution Section */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary">The Solution</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Operational Environmental Intelligence
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                OEI is a continuous, instrumented, and analytically rich intelligence layer that measures, 
                models, and interprets biological, chemical, and physical processes to inform defense decisions, 
                protect forces, and secure infrastructure.
              </p>
              
              <div className="space-y-4">
                {[
                  "Persistent biological and microbial sensing networks",
                  "Real-time environmental threat detection",
                  "Predictive infrastructure risk assessment",
                  "Bioremediation effectiveness monitoring",
                  "Integration with JADC2 and C2 systems"
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg">
                  Download White Paper
                  <FileText className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/defense/oei">
                    Learn More
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* OEI Diagram - Military Hierarchy with Data Flow */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 via-muted to-blue-500/10 rounded-3xl p-6">
                <div className="h-full w-full border border-primary/20 rounded-2xl relative overflow-hidden bg-background/50 p-4">
                  {/* Top Level: Decision Makers */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
                    <div className="w-20 h-14 rounded-lg bg-primary/20 border border-primary/50 flex flex-col items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-[7px] font-bold mt-0.5">COMMAND</span>
                    </div>
                    <div className="w-20 h-14 rounded-lg bg-blue-500/20 border border-blue-500/50 flex flex-col items-center justify-center">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-[7px] font-bold mt-0.5">WARFIGHTER</span>
                    </div>
                  </div>
                  
                  {/* AI Processing Layer */}
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 w-28 h-12 rounded-lg bg-purple-500/20 border border-purple-500/50 flex flex-col items-center justify-center">
                    <Cpu className="h-4 w-4 text-purple-500" />
                    <span className="text-[7px] font-bold mt-0.5">NLM / AI</span>
                  </div>

                  {/* Central Node - NatureOS */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <div className="text-center">
                        <Eye className="h-6 w-6 mx-auto text-primary" />
                        <span className="text-[9px] font-bold mt-1 block">NatureOS</span>
                      </div>
                    </div>
                  </div>

                  {/* Gateway/Mesh Layer */}
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-3">
                    <div className="w-16 h-12 rounded-lg bg-green-500/20 border border-green-500/50 flex flex-col items-center justify-center">
                      <Network className="h-4 w-4 text-green-500" />
                      <span className="text-[6px] font-medium mt-0.5">GATEWAY</span>
                    </div>
                    <div className="w-16 h-12 rounded-lg bg-green-500/20 border border-green-500/50 flex flex-col items-center justify-center">
                      <Radio className="h-4 w-4 text-green-500" />
                      <span className="text-[6px] font-medium mt-0.5">MESH</span>
                    </div>
                  </div>

                  {/* Device Layer - Bottom */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    <div className="w-14 h-12 rounded-lg bg-orange-500/20 border border-orange-500/50 flex flex-col items-center justify-center">
                      <Radar className="h-3 w-3 text-orange-500" />
                      <span className="text-[5px] font-medium mt-0.5">M1</span>
                    </div>
                    <div className="w-14 h-12 rounded-lg bg-primary/20 border border-primary/50 flex flex-col items-center justify-center">
                      <Microscope className="h-3 w-3 text-primary" />
                      <span className="text-[5px] font-medium mt-0.5">NODE</span>
                    </div>
                    <div className="w-14 h-12 rounded-lg bg-blue-500/20 border border-blue-500/50 flex flex-col items-center justify-center">
                      <Wind className="h-3 w-3 text-blue-500" />
                      <span className="text-[5px] font-medium mt-0.5">SPORE</span>
                    </div>
                    <div className="w-14 h-12 rounded-lg bg-destructive/20 border border-destructive/50 flex flex-col items-center justify-center">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="text-[5px] font-medium mt-0.5">ALARM</span>
                    </div>
                  </div>

                  {/* Data Flow Arrows */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Command to AI */}
                    <line x1="50%" y1="18%" x2="50%" y2="26%" stroke="currentColor" strokeWidth="2" className="text-primary/40" markerEnd="url(#arrowhead)" />
                    {/* AI to NatureOS */}
                    <line x1="50%" y1="34%" x2="50%" y2="42%" stroke="currentColor" strokeWidth="2" className="text-purple-500/40" markerEnd="url(#arrowhead)" />
                    {/* NatureOS to Gateway */}
                    <line x1="50%" y1="58%" x2="50%" y2="66%" stroke="currentColor" strokeWidth="2" className="text-primary/40" markerEnd="url(#arrowhead)" />
                    {/* Gateway to Devices */}
                    <line x1="50%" y1="76%" x2="50%" y2="84%" stroke="currentColor" strokeWidth="2" className="text-green-500/40" markerEnd="url(#arrowhead)" />
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary/60" />
                      </marker>
                    </defs>
                  </svg>

                  {/* MINDEX Database - Side */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-4 w-14 h-14 rounded-lg bg-purple-500/20 border border-purple-500/50 flex flex-col items-center justify-center">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-[6px] font-medium mt-0.5">MINDEX</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products/Capabilities Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Nature Compute System</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Defense-Grade Environmental Sensing
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Purpose-built hardware and software for persistent environmental intelligence operations.
            </p>
          </div>

          <Tabs defaultValue="mushroom1" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl mx-auto mb-12">
              <TabsTrigger value="mushroom1">Mushroom1</TabsTrigger>
              <TabsTrigger value="myconode">MycoNode</TabsTrigger>
              <TabsTrigger value="sporebase">SporeBase</TabsTrigger>
              <TabsTrigger value="alarm">ALARM</TabsTrigger>
              <TabsTrigger value="natureos">NatureOS</TabsTrigger>
            </TabsList>

            <TabsContent value="mushroom1">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-orange-500">
                    <Radar className="h-6 w-6" />
                    <span className="font-semibold">Autonomous Deployment Platform</span>
                  </div>
                  <h3 className="text-3xl font-bold">Mushroom1-D Defense Platform</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-orange-500">$10,000</span>
                    <span className="text-sm text-muted-foreground">Defense-grade configuration</span>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Military-grade autonomous platform for deploying MycoNodes, mapping environmental anomalies, 
                    and conducting reconnaissance in contaminated zones. Features encrypted C2, SATCOM capability, and tactical mesh integration.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Payload", value: "20kg capacity" },
                      { label: "Terrain", value: "All-terrain capable" },
                      { label: "Endurance", value: "8+ hours" },
                      { label: "Autonomy", value: "GPS denied capable" }
                    ].map((spec) => (
                      <div key={spec.label} className="bg-background p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">{spec.label}</div>
                        <div className="font-semibold">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/devices/mushroom-1">
                      View Mushroom 1 Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-muted rounded-xl flex items-center justify-center border">
                  <Radar className="h-32 w-32 text-orange-500/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="myconode">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-primary">
                    <Microscope className="h-6 w-6" />
                    <span className="font-semibold">Subsurface Sensing Probe</span>
                  </div>
                  <h3 className="text-3xl font-bold">MycoNode Environmental Probes</h3>
                  <p className="text-muted-foreground text-lg">
                    Buried bioelectric sensors that monitor soil microbiome activity, contamination signatures, 
                    and infrastructure risk factors in real-time.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Bioelectric Sensing", value: "0.1μV resolution" },
                      { label: "Deployment Depth", value: "10-50 cm" },
                      { label: "Sampling Rate", value: "Multi-Hz" },
                      { label: "Battery Life", value: "5+ years" }
                    ].map((spec) => (
                      <div key={spec.label} className="bg-background p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">{spec.label}</div>
                        <div className="font-semibold">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/devices/myconode">
                      View MycoNode Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-muted rounded-xl flex items-center justify-center border">
                  <Microscope className="h-32 w-32 text-primary/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sporebase">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-blue-500">
                    <Wind className="h-6 w-6" />
                    <span className="font-semibold">Bioaerosol Collection</span>
                  </div>
                  <h3 className="text-3xl font-bold">SporeBase Collectors</h3>
                  <p className="text-muted-foreground text-lg">
                    Time-indexed bioaerosol capture systems for atmospheric biological sampling 
                    with integrated lab-analysis integration.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Collection Method", value: "Active/Passive" },
                      { label: "Time Resolution", value: "15-60 min segments" },
                      { label: "Analysis Ready", value: "PCR/Microscopy" },
                      { label: "Coverage", value: "100m radius" }
                    ].map((spec) => (
                      <div key={spec.label} className="bg-background p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">{spec.label}</div>
                        <div className="font-semibold">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/devices/sporebase">
                      View SporeBase Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-muted rounded-xl flex items-center justify-center border">
                  <Wind className="h-32 w-32 text-blue-500/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alarm">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="font-semibold">Interior Environmental Monitoring</span>
                  </div>
                  <h3 className="text-3xl font-bold">ALARM Indoor Sensors</h3>
                  <p className="text-muted-foreground text-lg">
                    Advanced interior sensing for humidity, temperature, CO₂, and microbial growth detection 
                    in critical facilities and ship compartments.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Environmental", value: "Temp/Humidity/CO₂" },
                      { label: "Detection", value: "Moisture events" },
                      { label: "Alert Latency", value: "< 60 seconds" },
                      { label: "Integration", value: "BMS compatible" }
                    ].map((spec) => (
                      <div key={spec.label} className="bg-background p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">{spec.label}</div>
                        <div className="font-semibold">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/devices/alarm">
                      View ALARM Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="aspect-video bg-gradient-to-br from-destructive/20 to-muted rounded-xl flex items-center justify-center border">
                  <AlertTriangle className="h-32 w-32 text-destructive/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="natureos">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-green-500">
                    <Eye className="h-6 w-6" />
                    <span className="font-semibold">Command & Control Platform</span>
                  </div>
                  <h3 className="text-3xl font-bold">NatureOS Operating System</h3>
                  <p className="text-muted-foreground text-lg">
                    Unified dashboard for OEI network visualization, alerting, analytics, and integration 
                    with DoD C2 systems and JADC2 frameworks.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Visualization", value: "Map-based UI" },
                      { label: "Analytics", value: "ML-powered" },
                      { label: "Integration", value: "REST/gRPC APIs" },
                      { label: "Security", value: "Zero-trust arch" }
                    ].map((spec) => (
                      <div key={spec.label} className="bg-background p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">{spec.label}</div>
                        <div className="font-semibold">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/natureos">
                      Explore NatureOS
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="aspect-video bg-gradient-to-br from-green-500/20 to-muted rounded-xl flex items-center justify-center border">
                  <Eye className="h-32 w-32 text-green-500/50" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Use Cases / Vignettes Section - Now with Clickable Modals */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Operational Vignettes</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Mission-Critical Applications
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Real-world scenarios where OEI provides decisive advantage. Click to explore solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {missionCriticalData.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card 
                  className="h-full hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5"
                  onClick={() => setSelectedMission(useCase)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <useCase.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">{useCase.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">SCENARIO</div>
                      <p className="text-sm">{useCase.scenario}</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">OUTCOME</div>
                      <p className="text-sm">{useCase.outcome}</p>
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between">
                      <div className="text-sm font-semibold text-primary">{useCase.impact}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        <span>View Solutions</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence Products Section - Now with Hover Tooltips */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Intelligence Products</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Actionable Environmental Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Standardized packet formats for environmental data exchange. Hover over each to see the data structure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {intelligencePackets.map((product) => (
              <div 
                key={product.acronym} 
                className="relative"
                onMouseEnter={() => setHoveredPacket(product.acronym)}
                onMouseLeave={() => setHoveredPacket(null)}
              >
                <Card className="text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <product.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <div className="text-2xl font-bold mb-1">{product.acronym}</div>
                    <div className="text-sm text-muted-foreground">{product.name}</div>
                    <div className="mt-3 text-xs text-primary/80">
                      {getLiveCount(product.acronym, product.baseCount).toLocaleString()} packets/24h
                    </div>
                  </CardContent>
                </Card>

                {/* Hover Tooltip */}
                <AnimatePresence>
                  {hoveredPacket === product.acronym && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-[400px] bg-background border rounded-xl shadow-2xl p-4"
                      style={{ top: "100%" }}
                    >
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <product.icon className="h-5 w-5 text-primary" />
                            <h4 className="font-bold">{product.acronym} Packet Format</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase">JSON Structure</span>
                          </div>
                          <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto max-h-48">
                            <code className="text-primary/80">{product.jsonExample}</code>
                          </pre>
                        </div>

                        <div className="pt-3 border-t">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium">Why It Matters</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{product.importance}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            <Activity className="h-3 w-3 mr-1" />
                            {getLiveCount(product.acronym, product.baseCount).toLocaleString()} active
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Terminal className="h-3 w-3 mr-1" />
                            v{product.jsonExample.match(/"version": "([^"]+)"/)?.[1] || "1.0.0"}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Arrow pointer */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border-l border-t rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section - Now Interactive */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Badge className="mb-4">Integration</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Seamless DoD Integration
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                OEI capabilities integrate directly into existing command structures and decision cycles. 
                Click on each to see integration details.
              </p>

              <div className="space-y-4">
                {dodIntegrationItems.map((item) => (
                  <motion.div 
                    key={item.code} 
                    className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                      selectedDodItem?.code === item.code 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedDodItem(item)}
                    whileHover={{ x: 4 }}
                    animate={{ 
                      scale: selectedDodItem?.code === item.code ? 1.02 : 1,
                    }}
                  >
                    <Badge 
                      variant={selectedDodItem?.code === item.code ? "default" : "outline"} 
                      className="font-mono min-w-[80px] justify-center"
                    >
                      {item.code}
                    </Badge>
                    <span className={`text-sm ${selectedDodItem?.code === item.code ? "text-foreground font-medium" : ""}`}>
                      {item.desc}
                    </span>
                    {selectedDodItem?.code === item.code && (
                      <ChevronRight className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Dynamic Right Panel */}
            <AnimatePresence mode="wait">
              {selectedDodItem && (
                <motion.div
                  key={selectedDodItem.code}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card className="border-primary/20">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Badge className="text-lg px-3 py-1">{selectedDodItem.code}</Badge>
                        <CardTitle>{selectedDodItem.details.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {selectedDodItem.details.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Capabilities */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Integration Capabilities
                        </h4>
                        <ul className="space-y-2">
                          {selectedDodItem.details.capabilities.map((cap, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-2 text-sm"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                              {cap}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      {/* Tools */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          Mycosoft Tools
                        </h4>
                        <div className="space-y-2">
                          {selectedDodItem.details.tools.map((tool, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-muted/50 rounded-lg p-3"
                            >
                              <div className="font-medium text-sm">{tool.name}</div>
                              <div className="text-xs text-muted-foreground">{tool.description}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Compliance */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Compliance Standards
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedDodItem.details.compliance.map((standard, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <Badge variant="secondary">{standard}</Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">Get Started</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Deploy OEI?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Contact our defense team for a classified briefing, pilot program discussion, 
              or technical evaluation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href="/defense/request-briefing">
                  Request Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link href="/defense/technical-docs">
                  Technical Documentation
                  <FileText className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 pt-12 border-t">
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Cleared Personnel Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>CONUS & OCONUS Deployment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>IL4/IL5 Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Classification */}
      <div className="py-4 bg-muted/50 text-center">
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 text-xs tracking-widest font-mono">
          UNCLASS // FOR OFFICIAL USE ONLY
        </Badge>
      </div>
    </div>
  )
}
