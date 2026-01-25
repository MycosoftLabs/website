"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  PipetteIcon as PetriDish, 
  Microscope, 
  FlaskRoundIcon as Flask, 
  Globe, 
  Database, 
  LineChart,
  Shield,
  Radar,
  Eye,
  Terminal,
  Cpu,
  Network,
  BarChart3,
  Map,
  Zap,
  ArrowRight,
  Layers,
  Activity,
  Box
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const defenseApps = [
  {
    title: "NatureOS Command",
    description: "Unified environmental intelligence dashboard with real-time sensor networks and threat visualization",
    icon: Eye,
    href: "/natureos",
    status: "operational",
    category: "command"
  },
  {
    title: "Fusarium",
    description: "Integrated defense system with CREP dashboard, specialized devices, and AI-driven environmental intelligence",
    icon: Shield,
    href: "/defense/fusarium",
    status: "operational",
    category: "command"
  },
  {
    title: "MINDEX Console",
    description: "Cryptographic data integrity layer with tamper-evident logging and audit trails",
    icon: Database,
    href: "/natureos/mindex",
    status: "operational",
    category: "data"
  },
  {
    title: "CREP Dashboard",
    description: "Common Relevant Environmental Picture - situational awareness and threat monitoring",
    icon: BarChart3,
    href: "/dashboard/crep",
    status: "operational",
    category: "analytics"
  }
]

const researchApps = [
  {
    title: "Petri Dish Simulator",
    description: "Simulate and analyze fungal growth patterns in controlled virtual environments",
    icon: PetriDish,
    href: "/apps/petri-dish-sim",
    status: "active",
    category: "simulation",
    theme: "petri" // Laboratory glass, sterile cyan
  },
  {
    title: "Mushroom Simulator",
    description: "3D visualization of mushroom development stages and environmental response",
    icon: Microscope,
    href: "/apps/mushroom-sim",
    status: "active",
    category: "simulation",
    theme: "mushroom" // Spore brown, organic earth
  },
  {
    title: "Compound Analyzer",
    description: "Analyze fungal compounds, bioactive molecules, and chemical interactions",
    icon: Flask,
    href: "/apps/compound-sim",
    status: "active",
    category: "analysis",
    theme: "compound" // Chemical molecular blue
  },
  {
    title: "Spore Tracker",
    description: "Track global spore distribution patterns with satellite and ground-truth integration",
    icon: Globe,
    href: "/apps/spore-tracker",
    status: "active",
    category: "monitoring",
    theme: "spore" // Atmospheric blue-green
  },
  {
    title: "Ancestry Database",
    description: "Explore fungal genealogy, phylogenetic relationships, and species evolution",
    icon: Database,
    href: "/ancestry",
    status: "active",
    category: "database",
    theme: "ancestry" // Heritage brown/sepia
  },
  {
    title: "Growth Analytics",
    description: "Advanced metrics and ML models for fungal development prediction",
    icon: LineChart,
    href: "/apps/growth-analytics",
    status: "active",
    category: "analytics",
    theme: "analytics" // Data teal
  }
]

const innovationApps = [
  {
    title: "Physics Simulator",
    description: "Quantum-inspired molecular simulations with QISE engine and field physics",
    icon: Zap,
    href: "/apps/physics-sim",
    status: "active",
    category: "simulation",
    theme: "physics" // Electric blue, quantum effects
  },
  {
    title: "Digital Twin Mycelium",
    description: "Real-time mycelial network modeling with MycoBrain sensor integration",
    icon: Network,
    href: "/apps/digital-twin",
    status: "active",
    category: "simulation",
    theme: "mycelium" // Organic green, neural network aesthetic
  },
  {
    title: "Lifecycle Simulator",
    description: "Complete fungal lifecycle modeling from spore to fruiting body",
    icon: Activity,
    href: "/apps/lifecycle-sim",
    status: "active",
    category: "simulation",
    theme: "lifecycle" // Earth tones, growth gradient
  },
  {
    title: "Genetic Circuit Designer",
    description: "Gene regulatory network simulation and metabolic pathway modeling",
    icon: Cpu,
    href: "/apps/genetic-circuit",
    status: "active",
    category: "simulation",
    theme: "genetic" // DNA purple/cyan, bioluminescent
  },
  {
    title: "Symbiosis Mapper",
    description: "Inter-species relationship mapping and ecosystem dynamics analysis",
    icon: Network,
    href: "/apps/symbiosis",
    status: "active",
    category: "analysis",
    theme: "symbiosis" // Forest/ecosystem greens
  },
  {
    title: "Retrosynthesis Viewer",
    description: "Biosynthetic pathway analysis and enzyme mapping for compound production",
    icon: Flask,
    href: "/apps/retrosynthesis",
    status: "active",
    category: "analysis",
    theme: "retrosynthesis" // Chemical orange/amber
  },
  {
    title: "Alchemy Lab",
    description: "Virtual compound design with AI-powered property predictions",
    icon: Flask,
    href: "/apps/alchemy-lab",
    status: "active",
    category: "design",
    theme: "alchemy" // Mystical purple/gold
  }
]

const developerApps = [
  {
    title: "Shell",
    description: "Command-line interface for NatureOS with full system access",
    icon: Terminal,
    href: "/natureos/shell",
    status: "active",
    category: "tools"
  },
  {
    title: "API Gateway",
    description: "REST and gRPC API access for external integrations",
    icon: Network,
    href: "/natureos/api",
    status: "active",
    category: "tools"
  },
  {
    title: "Workflow Builder",
    description: "Visual automation builder for environmental monitoring workflows",
    icon: Layers,
    href: "/natureos/workflows",
    status: "active",
    category: "tools"
  },
  {
    title: "Functions",
    description: "Serverless compute for custom environmental processing logic",
    icon: Box,
    href: "/natureos/functions",
    status: "active",
    category: "tools"
  }
]

// Theme styling configuration for unique app appearances
const THEME_STYLES: Record<string, { 
  iconBg: string; 
  iconColor: string; 
  hoverBorder: string;
  gradient: string;
  accentColor: string;
}> = {
  // Research themes
  petri: {
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
    hoverBorder: "hover:border-cyan-500/50",
    gradient: "from-cyan-500/5 to-transparent",
    accentColor: "text-cyan-500"
  },
  mushroom: {
    iconBg: "bg-amber-600/10",
    iconColor: "text-amber-600",
    hoverBorder: "hover:border-amber-600/50",
    gradient: "from-amber-600/5 to-transparent",
    accentColor: "text-amber-600"
  },
  compound: {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    hoverBorder: "hover:border-blue-500/50",
    gradient: "from-blue-500/5 to-transparent",
    accentColor: "text-blue-500"
  },
  spore: {
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-500",
    hoverBorder: "hover:border-teal-500/50",
    gradient: "from-teal-500/5 to-transparent",
    accentColor: "text-teal-500"
  },
  ancestry: {
    iconBg: "bg-orange-700/10",
    iconColor: "text-orange-700",
    hoverBorder: "hover:border-orange-700/50",
    gradient: "from-orange-700/5 to-transparent",
    accentColor: "text-orange-700"
  },
  analytics: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    hoverBorder: "hover:border-emerald-500/50",
    gradient: "from-emerald-500/5 to-transparent",
    accentColor: "text-emerald-500"
  },
  // Innovation themes
  physics: {
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    hoverBorder: "hover:border-indigo-500/50",
    gradient: "from-indigo-500/5 via-purple-500/5 to-transparent",
    accentColor: "text-indigo-500"
  },
  mycelium: {
    iconBg: "bg-lime-500/10",
    iconColor: "text-lime-500",
    hoverBorder: "hover:border-lime-500/50",
    gradient: "from-lime-500/5 to-transparent",
    accentColor: "text-lime-500"
  },
  lifecycle: {
    iconBg: "bg-green-600/10",
    iconColor: "text-green-600",
    hoverBorder: "hover:border-green-600/50",
    gradient: "from-green-600/5 via-amber-500/5 to-transparent",
    accentColor: "text-green-600"
  },
  genetic: {
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    hoverBorder: "hover:border-purple-500/50",
    gradient: "from-purple-500/5 via-cyan-500/5 to-transparent",
    accentColor: "text-purple-500"
  },
  symbiosis: {
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
    hoverBorder: "hover:border-green-500/50",
    gradient: "from-green-500/5 to-transparent",
    accentColor: "text-green-500"
  },
  retrosynthesis: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    hoverBorder: "hover:border-amber-500/50",
    gradient: "from-amber-500/5 to-transparent",
    accentColor: "text-amber-500"
  },
  alchemy: {
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    hoverBorder: "hover:border-violet-500/50",
    gradient: "from-violet-500/5 via-yellow-500/5 to-transparent",
    accentColor: "text-violet-500"
  },
  // Default theme
  default: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    hoverBorder: "hover:border-primary/50",
    gradient: "from-primary/5 to-transparent",
    accentColor: "text-primary"
  }
}

interface AppWithTheme {
  title: string
  description: string
  icon: React.ElementType
  href: string
  status: string
  category: string
  theme?: string
}

function AppCard({ app, index }: { app: AppWithTheme, index: number }) {
  const theme = THEME_STYLES[app.theme || "default"] || THEME_STYLES.default
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={app.href}>
        <Card className={`h-full ${theme.hoverBorder} hover:bg-muted/30 transition-all group cursor-pointer relative overflow-hidden`}>
          {/* Subtle gradient overlay based on theme */}
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
          
          <CardHeader className="relative z-10">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${theme.iconBg} group-hover:scale-110 transition-transform`}>
                <app.icon className={`h-6 w-6 ${theme.iconColor}`} />
              </div>
              <Badge 
                variant={app.status === "operational" ? "default" : "secondary"}
                className={app.status === "operational" ? "bg-green-500/10 text-green-500 border-green-500/30" : ""}
              >
                {app.status}
              </Badge>
            </div>
            <CardTitle className={`mt-4 group-hover:${theme.accentColor} transition-colors`}>
              {app.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {app.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`flex items-center text-sm ${theme.accentColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
              Launch Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

export function AppsPortal() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Background Video */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.25)" }}
        >
          <source src="/assets/backgrounds/apps-hero.mp4" type="video/mp4" />
        </video>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container max-w-7xl mx-auto relative z-10 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge className="mb-4">Application Suite</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Biological Computing
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-500">
                Applications
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Purpose-built software for environmental intelligence research operations. 
              Dual-use applications for science and beyond.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              {[
                { value: "14+", label: "Applications" },
                { value: "<50ms", label: "Latency" },
                { value: "Real-time", label: "Processing" },
                { value: "Open", label: "Platform" }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4 max-w-7xl mx-auto">
          <Tabs defaultValue="research" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="research" className="gap-2">
                  <Microscope className="h-4 w-4" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="innovation" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Innovation
                </TabsTrigger>
                <TabsTrigger value="defense" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Defense
                </TabsTrigger>
                <TabsTrigger value="developer" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Developer
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="research">
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Research & Analysis</h2>
                <p className="text-muted-foreground">
                  Scientific applications for mycology research and environmental analysis.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {researchApps.map((app, index) => (
                  <AppCard key={app.title} app={app} index={index} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="innovation">
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Innovation Suite</h2>
                <p className="text-muted-foreground">
                  Cutting-edge NLM-powered simulations for physics, biology, and chemistry computations.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {innovationApps.map((app, index) => (
                  <AppCard key={app.title} app={app} index={index} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="defense">
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Defense & Intelligence</h2>
                <p className="text-muted-foreground">
                  Command and control applications for operational environmental intelligence.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {defenseApps.map((app, index) => (
                  <AppCard key={app.title} app={app} index={index} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="developer">
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Developer Tools</h2>
                <p className="text-muted-foreground">
                  APIs, SDKs, and tools for building on the Nature Compute platform.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {developerApps.map((app, index) => (
                  <AppCard key={app.title} app={app} index={index} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Featured Application */}
      <section className="py-24">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary">Featured</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                NatureOS Command Center
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                The unified operating environment for all Mycosoft applications. 
                Real-time visualization, alerting, and control of your entire environmental sensing network.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Map, label: "Map Visualization" },
                  { icon: Activity, label: "Live Telemetry" },
                  { icon: Zap, label: "Instant Alerts" },
                  { icon: Network, label: "API Access" }
                ].map((feature) => (
                  <div key={feature.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" asChild>
                <Link href="/natureos">
                  Launch NatureOS
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary/10 via-muted to-green-500/10 rounded-2xl border overflow-hidden">
                {/* Video Placeholder */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  style={{ filter: "brightness(0.8)" }}
                >
                  <source src="/assets/backgrounds/natureos-demo.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                    <p className="text-lg font-semibold">NatureOS Dashboard</p>
                    <p className="text-sm text-muted-foreground">Real-time environmental monitoring</p>
                  </div>
                </div>
                {/* Simulated Dashboard Elements */}
                <div className="absolute top-4 left-4 right-4 h-8 bg-background/50 backdrop-blur rounded-lg" />
                <div className="absolute bottom-4 left-4 w-32 h-24 bg-background/50 backdrop-blur rounded-lg" />
                <div className="absolute bottom-4 right-4 w-48 h-24 bg-background/50 backdrop-blur rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section with Topology Diagram */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        >
          <source src="/assets/backgrounds/nature-compute.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-muted/90 to-muted/95" />
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4">Platform</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built on Nature Compute
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              All applications run on our unified Nature Compute platform - 
              a complete stack from hardware to AI.
            </p>
          </div>

          {/* Topology Diagram */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="p-8">
              <div className="grid grid-cols-6 gap-4 items-center text-center">
                {/* Layer 1: Hardware */}
                <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Radar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Hardware</p>
                  <p className="text-[10px] text-muted-foreground">Sensors</p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                </div>
                
                {/* Layer 2: Software */}
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Layers className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Software</p>
                  <p className="text-[10px] text-muted-foreground">NatureOS</p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                </div>
                
                {/* Layer 3: Data */}
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Database className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Data</p>
                  <p className="text-[10px] text-muted-foreground">MINDEX</p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </div>
              
              {/* Second Row */}
              <div className="grid grid-cols-6 gap-4 items-center text-center mt-4">
                {/* Layer 4: Protocols */}
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <Network className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Protocols</p>
                  <p className="text-[10px] text-muted-foreground">Mycorrhizae</p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                </div>
                
                {/* Layer 5: AI */}
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <Cpu className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold">AI</p>
                  <p className="text-[10px] text-muted-foreground">NLM</p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                </div>
                
                {/* Layer 6: Users */}
                <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                  <Eye className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-xs font-semibold">Users</p>
                  <p className="text-[10px] text-muted-foreground">Dashboard</p>
                </div>
                
                {/* Final */}
                <div className="flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Zero-trust architecture with end-to-end encryption"
              },
              {
                icon: Cpu,
                title: "Edge Computing",
                description: "Process data at the source for real-time response"
              },
              {
                icon: Database,
                title: "Unified Data Layer",
                description: "MINDEX integrity with cross-application access"
              }
            ].map((feature) => (
              <Card key={feature.title} className="text-center bg-background/80 backdrop-blur">
                <CardContent className="pt-8">
                  <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


































