"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
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
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DefensePortal() {
  const [activeCapability, setActiveCapability] = useState("oei")
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch by only rendering diagram on client
  useState(() => {
    setIsMounted(true)
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Palantir/Anduril Style */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
        
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
            Persistent biological sensing. Real-time environmental awareness. Mission-critical infrastructure protection.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-lg px-8 bg-primary hover:bg-primary/90">
              Request Briefing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Capabilities
              <ChevronRight className="ml-2 h-5 w-5" />
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

      {/* Problem Statement Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
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

              <div className="mt-8">
                <Button size="lg">
                  Download White Paper
                  <FileText className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* OEI Diagram - Client-only to prevent hydration mismatch */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 via-muted to-blue-500/10 rounded-3xl p-8">
                <div className="h-full w-full border border-primary/20 rounded-2xl relative overflow-hidden">
                  {/* Central Node */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <div className="text-center">
                        <Eye className="h-8 w-8 mx-auto text-primary" />
                        <span className="text-xs font-bold mt-1 block">NatureOS</span>
                      </div>
                    </div>
                  </div>

                  {/* Orbital Nodes - Simplified grid layout */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-background border-2 border-primary/50 flex flex-col items-center justify-center text-center">
                    <Microscope className="h-5 w-5 text-primary" />
                    <span className="text-[8px] font-medium mt-1">MycoNode</span>
                  </div>
                  
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 w-16 h-16 rounded-full bg-background border-2 border-blue-500/50 flex flex-col items-center justify-center text-center">
                    <Wind className="h-5 w-5 text-blue-500" />
                    <span className="text-[8px] font-medium mt-1">SporeBase</span>
                  </div>
                  
                  <div className="absolute bottom-4 right-1/4 -translate-x-1/2 w-16 h-16 rounded-full bg-background border-2 border-destructive/50 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-[8px] font-medium mt-1">ALARM</span>
                  </div>
                  
                  <div className="absolute bottom-4 left-1/4 -translate-x-1/2 w-16 h-16 rounded-full bg-background border-2 border-orange-500/50 flex flex-col items-center justify-center text-center">
                    <Radar className="h-5 w-5 text-orange-500" />
                    <span className="text-[8px] font-medium mt-1">Mushroom1</span>
                  </div>
                  
                  <div className="absolute top-1/2 -translate-y-1/2 left-4 w-16 h-16 rounded-full bg-background border-2 border-purple-500/50 flex flex-col items-center justify-center text-center">
                    <Database className="h-5 w-5 text-purple-500" />
                    <span className="text-[8px] font-medium mt-1">MINDEX</span>
                  </div>

                  {/* Connection Lines - Static positions */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="90%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="75%" y2="90%" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="25%" y2="90%" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="10%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 4" />
                  </svg>
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

          <Tabs defaultValue="myconode" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl mx-auto mb-12">
              <TabsTrigger value="myconode">MycoNode</TabsTrigger>
              <TabsTrigger value="sporebase">SporeBase</TabsTrigger>
              <TabsTrigger value="alarm">ALARM</TabsTrigger>
              <TabsTrigger value="mushroom1">Mushroom1</TabsTrigger>
              <TabsTrigger value="natureos">NatureOS</TabsTrigger>
            </TabsList>

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
                </div>
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-muted rounded-xl flex items-center justify-center border">
                  <Microscope className="h-32 w-32 text-primary/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sporebase">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-primary">
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
                </div>
                <div className="aspect-video bg-gradient-to-br from-destructive/20 to-muted rounded-xl flex items-center justify-center border">
                  <AlertTriangle className="h-32 w-32 text-destructive/50" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mushroom1">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 text-orange-500">
                    <Radar className="h-6 w-6" />
                    <span className="font-semibold">Autonomous Deployment Platform</span>
                  </div>
                  <h3 className="text-3xl font-bold">Mushroom1 Quadruped Robot</h3>
                  <p className="text-muted-foreground text-lg">
                    Autonomous quadruped for deploying MycoNodes, mapping environmental anomalies, 
                    and conducting reconnaissance in contaminated zones.
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
                </div>
                <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-muted rounded-xl flex items-center justify-center border">
                  <Radar className="h-32 w-32 text-orange-500/50" />
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

      {/* Use Cases / Vignettes Section */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Operational Vignettes</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Mission-Critical Applications
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Real-world scenarios where OEI provides decisive advantage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Building2,
                title: "Installation Threat Detection",
                scenario: "A CONUS base with legacy fuel storage sees a small but persistent OEI anomaly—elevated microbial stress and VOC signature near a buried pipe.",
                outcome: "OEI detects the anomaly before surface staining. Early detection prevents groundwater contamination and major cleanup costs.",
                impact: "72 hours earlier detection | $2.3M remediation avoided"
              },
              {
                icon: Target,
                title: "Range Management & UXO Zones",
                scenario: "An impact area with legacy UXO and heavy metal deposition shows spatially correlated patterns of suppressed microbial activity.",
                outcome: "Range managers adjust use patterns and plan targeted remediation. Long-term availability preserved.",
                impact: "40% reduction in restricted zones | Maintained training capacity"
              },
              {
                icon: Anchor,
                title: "Littoral Base Operations",
                scenario: "A coastal naval base experiences public concern over water quality with unknown source.",
                outcome: "OEI nodes detect specific microbial patterns associated with upstream civilian infrastructure failure. Evidence enables interagency coordination.",
                impact: "Source identified in 4 hours | Mitigated reputational damage"
              },
              {
                icon: Bug,
                title: "Biothreat Early Warning",
                scenario: "Intelligence suggests adversary experimentation with environmental dissemination of biological agents.",
                outcome: "OEI networks provide baseline microbial dynamics. Deviations trigger focused sampling and high-end lab analysis.",
                impact: "Continuous monitoring | Prioritized biosurveillance"
              }
            ].map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <useCase.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{useCase.title}</CardTitle>
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
                    <div className="pt-4 border-t">
                      <div className="text-sm font-semibold text-primary">{useCase.impact}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence Products Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Intelligence Products</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Actionable Environmental Intelligence
            </h2>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { acronym: "ETA", name: "Environmental Threat Assessment", icon: AlertTriangle },
              { acronym: "ESI", name: "Environmental Stability Index", icon: Activity },
              { acronym: "BAR", name: "Biological Anomaly Report", icon: Bug },
              { acronym: "RER", name: "Remediation Effectiveness Report", icon: BarChart3 },
              { acronym: "EEW", name: "Environmental Early Warning", icon: Zap }
            ].map((product) => (
              <Card key={product.acronym} className="text-center hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <product.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <div className="text-2xl font-bold mb-1">{product.acronym}</div>
                  <div className="text-sm text-muted-foreground">{product.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4">Integration</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Seamless DoD Integration
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                OEI capabilities integrate directly into existing command structures and decision cycles.
              </p>

              <div className="space-y-6">
                {[
                  { code: "G-2/J-2", desc: "Intelligence feed for environmental threats" },
                  { code: "G-3/J-3", desc: "Operational planning in degraded environments" },
                  { code: "G-4/J-4", desc: "Logistics siting and hazmat operations" },
                  { code: "G-6/J-6", desc: "Comms and cyber hardening of OEI networks" },
                  { code: "JADC2", desc: "Joint All-Domain Command and Control integration" }
                ].map((item) => (
                  <div key={item.code} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="font-mono">{item.code}</Badge>
                    <span className="text-sm">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    MINDEX Data Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Cryptographic integrity layer providing tamper-evident logs for investigations, 
                    compliance, and accountability.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Hash-chained</Badge>
                    <Badge variant="secondary">Timestamped</Badge>
                    <Badge variant="secondary">Auditable</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    Mycorrhizae Protocol
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Standardized schemas, compression, and feature extraction for consistent 
                    multi-modal OEI data representation.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">LoRa/Sub-GHz</Badge>
                    <Badge variant="secondary">WiFi/Ethernet</Badge>
                    <Badge variant="secondary">Tactical Radio</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
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
              <Button size="lg" className="text-lg px-8">
                Request Briefing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Technical Documentation
                <FileText className="ml-2 h-5 w-5" />
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










