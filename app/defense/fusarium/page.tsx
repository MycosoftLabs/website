"use client"

import Link from "next/link"
import Image from "next/image"
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
  Plane,
  Waves
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"

const fusariumComponents = [
  {
    name: "Earth Simulator",
    description: "Live 3D environmental context for assets, observations, forecast layers, and risk review.",
    icon: Globe,
    features: ["3D globe", "Device overlays", "Forecast context", "Risk layers"]
  },
  {
    name: "Agaric",
    description: "Flying Sensor Droid for aerial deployment, retrieval, relay, inspection, and sensor passes.",
    icon: Plane,
    features: ["Aerial relay", "Payload movement", "Level hover", "Multi-sensor flight"]
  },
  {
    name: "Psathyrella",
    description: "Autonomous buoy layer for passive acoustics, water context, and littoral environmental intelligence.",
    icon: Waves,
    features: ["Passive acoustics", "Water context", "Mesh handoff", "Coastal awareness"]
  },
  {
    name: "SporeBase",
    description: "Time-indexed bioaerosol collection for atmospheric sampling, baseline building, and lab-ready analysis.",
    icon: Wind,
    features: ["15-min cadence", "Sealed cassette", "Lab-ready samples", "Bioaerosol baselines"]
  },
  {
    name: "FUSARIUM + CREP",
    description: "Defense command surface for Operational Environmental Intelligence, alerts, layers, and field-device context.",
    icon: Shield,
    features: ["Threat picture", "Eagle Eye layers", "Mission review", "Decision support"]
  },
  {
    name: "Eagle Eye",
    description:
      "Dual-plane video intelligence inside CREP: registry-backed cameras plus connector-sourced feeds. Enable Eagle Eye in the CREP layer panel. Coverage depends on MINDEX seeding and public connectors—not every map marker guarantees a playable live stream.",
    icon: Eye,
    features: ["MINDEX-backed sources when seeded", "Live connector fan-out when cache is cold", "Honest UX: stream availability varies by source"]
  },
  {
    name: "Mushroom 1",
    description: "Ground mobility for field deployment, mapping, local inspection, and sensor placement.",
    icon: Radar,
    features: ["Field mobility", "Sensor deployment", "Terrain mapping", "Tactical mesh"]
  },
  {
    name: "Hyphae 1",
    description: "Exterior edge datacenter that fuses sensing, compute, backhaul, and local command at the mission edge.",
    icon: Server,
    features: ["Edge AI", "Sensor fusion", "Mesh gateway", "Rugged deployment"]
  },
  {
    name: "MYCA + MINDEX",
    description: "AI orchestration and tamper-evident mission memory for device events, sensor frames, and intelligence products.",
    icon: Cpu,
    features: ["Mission planning", "Anomaly detection", "Chain of custody", "Automated reporting"]
  },
]

const crepFeatures = [
  { title: "Threat Visualization", description: "3D globe with environmental threat overlay" },
  { title: "Sensor Network Status", description: "Real-time health of all deployed sensors" },
  { title: "Intelligence Products", description: "ETA, ESI, BAR, RER, EEW in standardized formats" },
  { title: "Alert Management", description: "Prioritized alerts with acknowledgment tracking" },
  { title: "Mission Integration", description: "Overlay environmental data on operational plans" },
  { title: "Historical Analysis", description: "Trend analysis and pattern detection over time" },
]

const fieldHardware = [
  {
    name: "Agaric",
    role: "Aerial deployment, retrieval, relay, and inspection",
    href: "/devices/agaric",
    icon: Plane,
    points: ["Flying Sensor Droid", "Multi-sensor payloads", "Hard-to-reach terrain", "Mycosoft device support"]
  },
  {
    name: "SporeBase",
    role: "Time-indexed bioaerosol collection",
    href: "/devices/sporebase",
    icon: Wind,
    points: ["Sealed cassette", "15-minute cadence", "Physical samples", "Bioaerosol baselines"]
  },
  {
    name: "Hyphae 1",
    role: "Exterior edge datacenter and sensor fusion node",
    href: "/devices/hyphae-1",
    icon: Server,
    points: ["MycoBrain + Jetson", "Radar / LiDAR / RF", "Mesh gateway", "Local AI"]
  },
  {
    name: "Psathyrella",
    role: "Autonomous maritime and littoral sensing buoy",
    href: "/devices/psathyrella",
    icon: Waves,
    points: ["Passive acoustics", "Water context", "Coastal mesh", "CREP integration"]
  },
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
      <section className="relative min-h-[82vh] overflow-hidden py-24 flex items-center" data-over-video>
        <AutoplayVideo
          src="/assets/fusarium/fusarium-hero-2026-web.mp4"
          sources={["/assets/fusarium/fusarium-hero-2026-web.mp4"]}
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(0.72) contrast(1.08) saturate(1.06)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/20 to-background/82" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff2_1px,transparent_1px),linear-gradient(to_bottom,#fff2_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.06] pointer-events-none" />
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <NeuBadge variant="default" className="mb-4 border-destructive/30 text-destructive">
              DEFENSE SYSTEM
            </NeuBadge>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-white">
              FUSARIUM
            </h1>
            <p className="text-xl text-white/82 max-w-3xl mx-auto mb-4">
              Named after one of Earth&apos;s most dangerous fungal organisms - a pathogen that embeds 
              itself in hosts and adapts to any environment.
            </p>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
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
              <NeuCard className="overflow-hidden p-0">
                <div className="relative aspect-[16/10] min-h-[320px]">
                  <Image
                    src="/assets/fusarium/mold-fusarium-mycotoxin-amphotericin-scaled.jpg"
                    alt="Fusarium mold growth macro image"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-lg font-semibold text-white">
                      Embed. Adapt. Persist.
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      The biological namesake behind the defense system.
                    </p>
                  </div>
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

      {/* Field Hardware */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4 text-green-500">Field Hardware</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">Current Mycosoft Defense Devices</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fusarium is the defense layer that brings aerial, atmospheric, terrestrial, and maritime devices into one operational picture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {fieldHardware.map((device) => (
              <NeuCard key={device.name} className="transition-all hover:scale-[1.01]">
                <NeuCardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <device.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{device.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{device.role}</p>
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {device.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={device.href}>
                    <NeuButton variant="default" className="text-sm px-4 py-2">
                      View Device
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </NeuButton>
                  </Link>
                </NeuCardContent>
              </NeuCard>
            ))}
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
              Common Relevant Environmental Picture - the tactical interface for environmental intelligence, Earth Simulator context, and device-layer operations.
            </p>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mt-4">
              Eagle Eye video layers run in the same CREP dashboard: open CREP and use the layer panel to toggle Eagle Eye. Feeds are sourced from the Eagle registry and public connectors where available—availability is data-dependent, not universal live video everywhere.
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
