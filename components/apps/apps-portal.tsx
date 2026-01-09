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
    title: "OEI Monitor",
    description: "Operational Environmental Intelligence monitoring with bioelectric and chemical sensing",
    icon: Activity,
    href: "/natureos/monitoring",
    status: "operational",
    category: "command"
  },
  {
    title: "MINDEX Console",
    description: "Cryptographic data integrity layer with tamper-evident logging and audit trails",
    icon: Database,
    href: "/natureos/storage",
    status: "operational",
    category: "data"
  },
  {
    title: "Threat Analytics",
    description: "ML-powered environmental threat detection and predictive risk assessment",
    icon: BarChart3,
    href: "/natureos/ai-studio",
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
    category: "simulation"
  },
  {
    title: "Mushroom Simulator",
    description: "3D visualization of mushroom development stages and environmental response",
    icon: Microscope,
    href: "/apps/mushroom-sim",
    status: "active",
    category: "simulation"
  },
  {
    title: "Compound Analyzer",
    description: "Analyze fungal compounds, bioactive molecules, and chemical interactions",
    icon: Flask,
    href: "/apps/compound-sim",
    status: "active",
    category: "analysis"
  },
  {
    title: "Spore Tracker",
    description: "Track global spore distribution patterns with satellite and ground-truth integration",
    icon: Globe,
    href: "/apps/spore-tracker",
    status: "active",
    category: "monitoring"
  },
  {
    title: "Ancestry Database",
    description: "Explore fungal genealogy, phylogenetic relationships, and species evolution",
    icon: Database,
    href: "/ancestry",
    status: "active",
    category: "database"
  },
  {
    title: "Growth Analytics",
    description: "Advanced metrics and ML models for fungal development prediction",
    icon: LineChart,
    href: "/apps/growth-analytics",
    status: "active",
    category: "analytics"
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

function AppCard({ app, index }: { app: typeof defenseApps[0], index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={app.href}>
        <Card className="h-full hover:border-primary/50 hover:bg-muted/30 transition-all group cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <app.icon className="h-6 w-6 text-primary" />
              </div>
              <Badge 
                variant={app.status === "operational" ? "default" : "secondary"}
                className={app.status === "operational" ? "bg-green-500/10 text-green-500 border-green-500/30" : ""}
              >
                {app.status}
              </Badge>
            </div>
            <CardTitle className="mt-4 group-hover:text-primary transition-colors">
              {app.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {app.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
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
                Mission-Critical
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-500">
                Applications
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Purpose-built software for environmental intelligence, research operations, 
              and defense applications.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              {[
                { value: "14+", label: "Applications" },
                { value: "99.9%", label: "Uptime" },
                { value: "Real-time", label: "Processing" },
                { value: "DoD", label: "Ready" }
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
          <Tabs defaultValue="defense" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid grid-cols-3 w-full max-w-lg">
                <TabsTrigger value="defense" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Defense
                </TabsTrigger>
                <TabsTrigger value="research" className="gap-2">
                  <Microscope className="h-4 w-4" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="developer" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Developer
                </TabsTrigger>
              </TabsList>
            </div>

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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="h-20 w-20 text-primary/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">NatureOS Dashboard</p>
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

      {/* Integration Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Platform</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built on Nature Compute
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              All applications run on our unified Nature Compute platform, ensuring 
              seamless data integration and consistent security.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Defense-Grade Security",
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
              <Card key={feature.title} className="text-center">
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


































