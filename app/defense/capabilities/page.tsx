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
  Globe,
  Radio,
  Zap,
  Lock,
  CheckCircle2,
  Play
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"

const acronyms = [
  { term: "OEI", full: "Operational Environmental Intelligence", description: "A new intelligence discipline that measures, models, and interprets biological, chemical, and physical environmental processes." },
  { term: "NatureOS", full: "Nature Operating System", description: "Unified command and control platform for all environmental sensing operations." },
  { term: "MINDEX", full: "Mycosoft Intelligence Data Exchange", description: "Cryptographic data integrity layer with tamper-evident logging and chain-of-custody." },
  { term: "ETA", full: "Environmental Threat Assessment", description: "Standardized format for communicating environmental hazard intelligence." },
  { term: "ESI", full: "Environmental Stability Index", description: "Quantitative measure of environmental condition and risk level." },
  { term: "BAR", full: "Biological Anomaly Report", description: "Alert format for detected biological deviations from baseline." },
  { term: "RER", full: "Remediation Effectiveness Report", description: "Assessment of cleanup and mitigation operation success." },
  { term: "EEW", full: "Environmental Early Warning", description: "Predictive alert for emerging environmental threats." },
  { term: "NLM", full: "Nature Learning Model", description: "AI model trained on environmental data for pattern recognition and prediction." },
]

const hardware = [
  {
    name: "Mushroom1",
    description: "Autonomous quadruped platform for sensor deployment, environmental mapping, and contaminated zone reconnaissance.",
    icon: Radar,
    color: "orange-500",
    specs: ["20kg payload", "8+ hour endurance", "GPS-denied capable", "All-terrain"]
  },
  {
    name: "MycoNode",
    description: "Subsurface bioelectric probe for soil microbiome monitoring and infrastructure risk detection.",
    icon: Microscope,
    color: "primary",
    specs: ["0.1μV resolution", "10-50cm depth", "5+ year battery", "LoRa/WiFi"]
  },
  {
    name: "SporeBase",
    description: "Time-indexed bioaerosol collection for atmospheric biological sampling with lab integration.",
    icon: Wind,
    color: "blue-500",
    specs: ["15-60 min segments", "PCR ready", "Solar powered", "100m coverage"]
  },
  {
    name: "ALARM",
    description: "Advanced interior environmental monitor for facility protection and microbial growth detection.",
    icon: AlertTriangle,
    color: "destructive",
    specs: ["Temp/RH/CO₂/VOC", "<60s alerts", "BMS integration", "PoE/Battery"]
  },
]

const software = [
  {
    name: "NatureOS",
    description: "Unified operating environment with real-time visualization, alerting, and API access.",
    icon: Eye,
    features: ["Map visualization", "Live telemetry", "Alert management", "REST/gRPC APIs"]
  },
  {
    name: "MINDEX Console",
    description: "Cryptographic data integrity with tamper-evident logs for investigations and compliance.",
    icon: Database,
    features: ["Hash-chained records", "Timestamp verification", "Audit trails", "Export tools"]
  },
  {
    name: "Threat Analytics",
    description: "ML-powered environmental threat detection and predictive risk assessment.",
    icon: Cpu,
    features: ["Anomaly detection", "Pattern recognition", "Risk scoring", "Trend analysis"]
  },
  {
    name: "Fusarium",
    description: "Defense-specific operational dashboard with CREP integration and military protocols.",
    icon: Shield,
    features: ["CREP dashboard", "Military formats", "Tactical display", "Secure comms"]
  },
]

const protocols = [
  { name: "Mycorrhizae Protocol", description: "Standardized data format for multi-modal environmental sensing", icon: Network },
  { name: "Hyphae Language", description: "Domain-specific language for biological computing interfaces", icon: Cpu },
  { name: "MINDEX Integrity", description: "Cryptographic chain for data provenance and accountability", icon: Lock },
  { name: "OEI Standards", description: "Intelligence product formats compatible with DoD systems", icon: Globe },
]

export default function CapabilitiesPage() {
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

        {/* Hero with Video Placeholder */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10 pointer-events-none" />
          
          {/* Video Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-center">
              <div className="neu-raised p-12 rounded-3xl text-center">
                <Play className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Capabilities Overview Video</p>
                <p className="text-sm text-muted-foreground/60">(Coming Soon)</p>
              </div>
            </div>
          </div>

          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <NeuBadge variant="default" className="mb-4 border-primary/30 text-primary">
                OEI CAPABILITIES
              </NeuBadge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                OEI Capabilities
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive overview of Mycosoft&apos;s Operational Environmental Intelligence 
                platform - hardware, software, protocols, and integration capabilities.
              </p>
            </div>
          </div>
        </section>

        {/* Acronyms Section */}
        <section className="py-16">
          <div className="container max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Key Terms & Acronyms</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acronyms.map((item) => (
                <NeuCard key={item.term} className="transition-all hover:scale-[1.01]">
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <NeuBadge variant="default" className="font-mono">{item.term}</NeuBadge>
                    <span className="text-sm text-muted-foreground">{item.full}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* Hardware Suite */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <NeuBadge variant="default" className="mb-4">Hardware Suite</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">Defense-Grade Sensing Platforms</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Purpose-built hardware for persistent environmental intelligence operations.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {hardware.map((device) => (
                <NeuCard key={device.name} className="overflow-hidden transition-all hover:scale-[1.01]">
                  <div className={`h-2 rounded-t-3xl -mx-6 -mt-6 mb-4 ${
                    device.color === 'orange-500' ? 'bg-orange-500' :
                    device.color === 'primary' ? 'bg-primary' :
                    device.color === 'blue-500' ? 'bg-blue-500' :
                    'bg-destructive'
                  }`} />
                  <div className="pt-4">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-xl ${
                        device.color === 'orange-500' ? 'bg-orange-500/10' :
                        device.color === 'primary' ? 'bg-primary/10' :
                        device.color === 'blue-500' ? 'bg-blue-500/10' :
                        'bg-destructive/10'
                      }`}>
                        <device.icon className={`h-6 w-6 ${
                          device.color === 'orange-500' ? 'text-orange-500' :
                          device.color === 'primary' ? 'text-primary' :
                          device.color === 'blue-500' ? 'text-blue-500' :
                          'text-destructive'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{device.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{device.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {device.specs.map((spec) => (
                        <NeuBadge key={spec} variant="default" className="text-xs">{spec}</NeuBadge>
                      ))}
                    </div>
                    <Link href={`/devices/${device.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <NeuButton variant="default" className="text-sm px-4 py-2">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </NeuButton>
                    </Link>
                  </div>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* Software Suite */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <NeuBadge variant="default" className="mb-4">Software Suite</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">Command & Control Platforms</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Integrated software for environmental intelligence operations and analysis.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {software.map((app) => (
                <NeuCard key={app.name} className="transition-all hover:scale-[1.01]">
                  <NeuCardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2 mb-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <app.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{app.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{app.description}</p>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {app.features.map((feature) => (
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

        {/* Protocols & Standards */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <NeuBadge variant="default" className="mb-4">Protocols & Standards</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">Interoperability Framework</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Standards and protocols ensuring seamless integration with existing DoD systems.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {protocols.map((protocol) => (
                <NeuCard key={protocol.name} className="text-center transition-all hover:scale-[1.02]">
                  <div className="pt-8">
                    <div className="inline-flex p-4 rounded-xl neu-raised mb-4">
                      <protocol.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{protocol.name}</h3>
                    <p className="text-sm text-muted-foreground">{protocol.description}</p>
                  </div>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Interfaces Preview */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <NeuBadge variant="default" className="mb-4">Dashboard Interfaces</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">Operational Visualization</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Intuitive interfaces for commanders, analysts, and operators.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <NeuCard className="overflow-hidden transition-all hover:scale-[1.01]">
                <div className="aspect-video neu-inset flex items-center justify-center -mx-6 -mt-6 rounded-t-3xl">
                  <Play className="h-12 w-12 text-primary/30" />
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">NatureOS Command Center</h3>
                  <p className="text-sm text-muted-foreground">
                    Unified operational dashboard with map visualization, device status, and alert management.
                  </p>
                </div>
              </NeuCard>

              <NeuCard className="overflow-hidden transition-all hover:scale-[1.01]">
                <div className="aspect-video neu-inset flex items-center justify-center -mx-6 -mt-6 rounded-t-3xl">
                  <Play className="h-12 w-12 text-blue-500/30" />
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">CREP Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Common Relevant Environmental Picture for situational awareness and threat monitoring.
                  </p>
                </div>
              </NeuCard>

              <NeuCard className="overflow-hidden transition-all hover:scale-[1.01]">
                <div className="aspect-video neu-inset flex items-center justify-center -mx-6 -mt-6 rounded-t-3xl">
                  <Play className="h-12 w-12 text-green-500/30" />
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">Analytics Studio</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced analysis tools for environmental data exploration and pattern discovery.
                  </p>
                </div>
              </NeuCard>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">Ready to Learn More?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Request a detailed briefing from our defense team to discuss your specific requirements.
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
