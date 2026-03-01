"use client"

import Link from "next/link"
import { 
  ArrowLeft,
  ArrowRight,
  Shield,
  Radar,
  Microscope,
  Wind,
  AlertTriangle,
  Eye,
  Database,
  Network,
  Cpu,
  Server,
  Radio,
  Zap,
  Lock,
  Globe,
  Map,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"

const fusariumComponents = [
  {
    name: "CREP Dashboard",
    description: "Common Relevant Environmental Picture - tactical situational awareness for environmental threats.",
    icon: Map,
    features: ["Real-time threat map", "Alert prioritization", "Mission planning integration", "Multi-echelon access"]
  },
  {
    name: "Mushroom1-D",
    description: "Defense-variant platform with enhanced comms, encrypted telemetry, and tactical integration. $10,000",
    icon: Radar,
    features: ["SATCOM capable", "Encrypted C2", "Extended endurance", "Tactical mesh"]
  },
  {
    name: "Hyphae One",
    description: "Edge computing boxes with sensing capabilities - the neural network of field intelligence.",
    icon: Server,
    features: ["Edge AI processing", "Multi-sensor fusion", "Gateway functionality", "Ruggedized design"]
  },
  {
    name: "Defense AI",
    description: "Military-tuned NLM with threat prioritization and tactical reporting capabilities.",
    icon: Cpu,
    features: ["Threat classification", "Pattern of life", "Anomaly detection", "Automated reporting"]
  },
]

const hyphaOneSpecs = [
  { label: "Processing", value: "Edge AI with 8 TOPS" },
  { label: "Sensors", value: "Environmental suite" },
  { label: "Comms", value: "LoRa, WiFi, Cellular, SATCOM" },
  { label: "Power", value: "Solar + 72hr battery" },
  { label: "Enclosure", value: "IP67 / MIL-STD-810" },
  { label: "Networking", value: "Mesh gateway + 50 nodes" },
]

const crepFeatures = [
  { title: "Threat Visualization", description: "3D globe with environmental threat overlay" },
  { title: "Sensor Network Status", description: "Real-time health of all deployed sensors" },
  { title: "Intelligence Products", description: "ETA, ESI, BAR, RER, EEW in standardized formats" },
  { title: "Alert Management", description: "Prioritized alerts with acknowledgment tracking" },
  { title: "Mission Integration", description: "Overlay environmental data on operational plans" },
  { title: "Historical Analysis", description: "Trend analysis and pattern detection over time" },
]

export default function FusariumPage() {
  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/defense" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Defense Portal
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10 pointer-events-none" />
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <NeuBadge variant="default" className="mb-4 border-destructive/30 text-destructive">
              DEFENSE SYSTEM
            </NeuBadge>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight">
              FUSARIUM
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              Named after one of Earth&apos;s most dangerous fungal organisms - a pathogen that embeds 
              itself in hosts and adapts to any environment.
            </p>
            <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-8">
              Like its namesake, our defense system embeds into the operational environment, 
              providing persistent awareness that adversaries cannot detect or evade.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/defense/request-briefing">
                <NeuButton variant="primary" className="text-base px-6 py-3">
                  Request Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/dashboard/crep">
                <NeuButton variant="default" className="text-base px-6 py-3">
                  Access CREP Dashboard
                </NeuButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Fusarium */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeuBadge variant="default" className="mb-4 text-destructive">The Name</NeuBadge>
              <h2 className="text-4xl font-bold mb-6">Why Fusarium?</h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  <strong className="text-foreground">Fusarium</strong> is a genus of fungi that represents 
                  one of the most significant threats to agriculture, infrastructure, and even human health worldwide.
                </p>
                <p>
                  It&apos;s also a major concern for the United States military - capable of contaminating 
                  food supplies, degrading equipment, and creating biological hazards in operational environments.
                </p>
                <p>
                  We chose this name deliberately: <em>to defeat Fusarium, you must think like Fusarium.</em>
                </p>
                <p>
                  Our defense system embeds into the environment with the same persistence, 
                  providing the awareness needed to protect forces and infrastructure from all environmental threats - 
                  including Fusarium itself.
                </p>
              </div>
            </div>
            <div className="relative">
              <NeuCard className="aspect-square p-8 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-20 w-20 text-destructive/30 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-destructive/70">
                    Embed. Adapt. Persist.
                  </p>
                </div>
              </NeuCard>
            </div>
          </div>
        </div>
      </section>

      {/* System Components */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">System Components</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">The Fusarium Stack</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              An integrated suite of hardware, software, and AI designed for defense applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {fusariumComponents.map((component) => (
              <NeuCard key={component.name} className="transition-all hover:scale-[1.01]">
                <NeuCardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <component.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{component.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {component.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Hyphae One */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeuBadge variant="default" className="mb-4 text-green-500">NEW HARDWARE</NeuBadge>
              <h2 className="text-4xl font-bold mb-6">Hyphae One</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Named after the branching filaments that form the structure of fungi - 
                Hyphae One boxes are the neural network connecting all field sensors to command.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {hyphaOneSpecs.map((spec) => (
                  <div key={spec.label} className="neu-raised p-4 rounded-xl">
                    <div className="text-sm text-muted-foreground">{spec.label}</div>
                    <div className="font-semibold">{spec.value}</div>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground mb-6">
                Hyphae One serves triple duty: edge processing for local AI, gateway for mesh networks, 
                and environmental sensing with its own sensor suite. Deploy them as the backbone of your 
                OEI network.
              </p>
            </div>
            <div className="relative">
              <NeuCard className="aspect-square p-8 flex items-center justify-center">
                <div className="text-center">
                  <Server className="h-20 w-20 text-green-500/30 mx-auto mb-4" />
                  <p className="text-lg font-semibold">Edge Computing + Sensing</p>
                  <p className="text-sm text-muted-foreground">The network backbone</p>
                </div>
              </NeuCard>
            </div>
          </div>
        </div>
      </section>

      {/* CREP Dashboard */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Command Interface</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">CREP Dashboard</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Common Relevant Environmental Picture - the tactical interface for environmental intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {crepFeatures.map((feature) => (
              <NeuCard key={feature.title} className="transition-all hover:scale-[1.01]">
                <NeuCardHeader>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </NeuCardHeader>
              </NeuCard>
            ))}
          </div>

          <div className="text-center">
            <Link href="/dashboard/crep">
              <NeuButton variant="primary" className="text-base px-6 py-3">
                Access CREP Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Protocols */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Protocols</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">Mycorrhizae Protocol & Hyphae Language</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Purpose-built protocols for biological computing and environmental data exchange.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <NeuCard>
              <NeuCardHeader>
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Mycorrhizae Protocol</h3>
                <p className="text-sm text-muted-foreground">
                  Standardized data format for multi-modal environmental sensing - 
                  optimized for low-bandwidth tactical networks.
                </p>
              </NeuCardHeader>
              <NeuCardContent>
                <div className="space-y-2">
                  {["Efficient compression for tactical links", "Multi-modal sensor fusion", "Cryptographic integrity built-in", "Compatible with DoD data standards"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </NeuCardContent>
            </NeuCard>

            <NeuCard>
              <NeuCardHeader>
                <div className="p-3 rounded-xl bg-purple-500/10 w-fit mb-2">
                  <Cpu className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold">Hyphae Language</h3>
                <p className="text-sm text-muted-foreground">
                  Domain-specific programming language for biological computing interfaces 
                  and fungal network communication.
                </p>
              </NeuCardHeader>
              <NeuCardContent>
                <div className="space-y-2">
                  {["Biological signal processing primitives", "Temporal pattern matching", "Environmental state machines", "Integration with NLM AI"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </NeuCardContent>
            </NeuCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Deploy Fusarium</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Request a briefing to learn how Fusarium can enhance your 
              environmental intelligence capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/defense/request-briefing">
                <NeuButton variant="primary" className="text-base px-6 py-3">
                  Request Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/defense/technical-docs">
                <NeuButton variant="default" className="text-base px-6 py-3">
                  Technical Documentation
                </NeuButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
    </NeuromorphicProvider>
  )
}
