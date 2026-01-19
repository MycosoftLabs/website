import type { Metadata } from "next"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Fusarium - Defense System | Mycosoft",
  description: "Fusarium is Mycosoft's integrated defense system combining CREP dashboard, specialized devices, and AI-driven environmental intelligence for military applications.",
}

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
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
        <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-background" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 border-destructive/50 text-destructive">
              DEFENSE SYSTEM
            </Badge>
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
              <Button size="lg" asChild>
                <Link href="/defense/request-briefing">
                  Request Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard/crep">
                  Access CREP Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Fusarium */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-destructive/10 text-destructive">The Name</Badge>
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
              <div className="aspect-square bg-gradient-to-br from-destructive/10 via-muted to-orange-500/10 rounded-3xl p-8">
                <div className="h-full w-full border border-destructive/20 rounded-2xl bg-background/50 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="h-20 w-20 text-destructive/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-destructive/70">
                      Embed. Adapt. Persist.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Components */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">System Components</Badge>
            <h2 className="text-4xl font-bold mb-4">The Fusarium Stack</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              An integrated suite of hardware, software, and AI designed for defense applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {fusariumComponents.map((component) => (
              <Card key={component.name} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <component.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{component.name}</CardTitle>
                      <CardDescription className="mt-1">{component.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {component.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hyphae One */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-green-500/10 text-green-500">NEW HARDWARE</Badge>
              <h2 className="text-4xl font-bold mb-6">Hyphae One</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Named after the branching filaments that form the structure of fungi - 
                Hyphae One boxes are the neural network connecting all field sensors to command.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {hyphaOneSpecs.map((spec) => (
                  <div key={spec.label} className="bg-background p-4 rounded-lg border">
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
              <div className="aspect-square bg-gradient-to-br from-green-500/10 via-muted to-primary/10 rounded-3xl p-8">
                <div className="h-full w-full border border-green-500/20 rounded-2xl bg-background/50 flex items-center justify-center">
                  <div className="text-center">
                    <Server className="h-20 w-20 text-green-500/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold">Edge Computing + Sensing</p>
                    <p className="text-sm text-muted-foreground">The network backbone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CREP Dashboard */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Command Interface</Badge>
            <h2 className="text-4xl font-bold mb-4">CREP Dashboard</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Common Relevant Environmental Picture - the tactical interface for environmental intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {crepFeatures.map((feature) => (
              <Card key={feature.title} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link href="/dashboard/crep">
                Access CREP Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Protocols */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Protocols</Badge>
            <h2 className="text-4xl font-bold mb-4">Mycorrhizae Protocol & Hyphae Language</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Purpose-built protocols for biological computing and environmental data exchange.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Mycorrhizae Protocol</CardTitle>
                <CardDescription>
                  Standardized data format for multi-modal environmental sensing - 
                  optimized for low-bandwidth tactical networks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Efficient compression for tactical links</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Multi-modal sensor fusion</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Cryptographic integrity built-in</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Compatible with DoD data standards</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 rounded-xl bg-purple-500/10 w-fit mb-2">
                  <Cpu className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Hyphae Language</CardTitle>
                <CardDescription>
                  Domain-specific programming language for biological computing interfaces 
                  and fungal network communication.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span>Biological signal processing primitives</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span>Temporal pattern matching</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span>Environmental state machines</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span>Integration with NLM AI</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Deploy Fusarium</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Request a classified briefing to learn how Fusarium can enhance your 
              environmental intelligence capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/defense/request-briefing">
                  Request Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/defense/technical-docs">
                  Technical Documentation
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
