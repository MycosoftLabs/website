"use client"

import Link from "next/link"
import { 
  ArrowLeft,
  ArrowRight,
  Eye,
  Cpu,
  Database,
  Network,
  Radio,
  Radar,
  Microscope,
  Wind,
  AlertTriangle,
  Users,
  Target,
  Shield,
  Zap,
  Globe,
  BarChart3,
  CheckCircle2,
  Brain
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"

const dataFlowSteps = [
  { level: "Field Sensors", items: ["Mushroom1", "MycoNode", "SporeBase", "ALARM"], icon: Radar, color: "orange-500" },
  { level: "Mesh Network", items: ["LoRa Gateways", "Tactical Radio", "Satellite Uplink"], icon: Radio, color: "green-500" },
  { level: "Edge Processing", items: ["Local AI", "Data Compression", "Anomaly Detection"], icon: Cpu, color: "purple-500" },
  { level: "NatureOS Platform", items: ["Visualization", "Analytics", "Alerting"], icon: Eye, color: "primary" },
  { level: "AI/ML Layer", items: ["Nature Learning Model", "Pattern Recognition", "Predictions"], icon: Brain, color: "blue-500" },
  { level: "Decision Support", items: ["Commander", "Analyst", "Warfighter", "Responders"], icon: Target, color: "destructive" },
]

const nlmCapabilities = [
  { title: "Multi-Modal Fusion", description: "Combines bioelectric, chemical, acoustic, and visual environmental data" },
  { title: "Temporal Analysis", description: "Learns patterns over time to establish baselines and detect deviations" },
  { title: "Spatial Correlation", description: "Maps environmental phenomena across geographic regions" },
  { title: "Predictive Modeling", description: "Forecasts environmental changes before they become critical" },
  { title: "Anomaly Detection", description: "Identifies unusual patterns indicating threats or changes" },
  { title: "Natural Language", description: "Generates human-readable intelligence reports from raw data" },
]

const useCases = [
  { 
    title: "Warfighter Support",
    description: "Real-time environmental intelligence for tactical decision-making in the field.",
    icon: Target
  },
  { 
    title: "Commander Situational Awareness",
    description: "Unified operational picture of environmental conditions across the AOR.",
    icon: Eye
  },
  { 
    title: "First Responders",
    description: "Early warning and guidance for firefighters, EMTs, and emergency managers.",
    icon: Zap
  },
  { 
    title: "Environmental Scientists",
    description: "Research-grade data collection and analysis for ecological studies.",
    icon: Microscope
  },
  { 
    title: "Infrastructure Protection",
    description: "Continuous monitoring of critical facilities for environmental risks.",
    icon: Shield
  },
  { 
    title: "Autonomous Systems",
    description: "Machine-readable environmental data for AI-driven platforms.",
    icon: Cpu
  },
]

export default function OEIPage() {
  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh">
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
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <NeuBadge variant="warning" className="mb-4">
              NEW INTELLIGENCE DISCIPLINE
            </NeuBadge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-foreground">Operational</span>
              <br />
              <span className="text-primary">Environmental</span>
              <br />
              <span className="text-foreground">Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Unlike signals intelligence or human intelligence, OEI gives voice to the operational environment - 
              transforming nature&apos;s signals into actionable intelligence for defense, safety, and science.
            </p>
          </div>
        </div>
      </section>

      {/* What is OEI */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeuBadge variant="default" className="mb-4">Definition</NeuBadge>
              <h2 className="text-4xl font-bold mb-6">What is OEI?</h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  <strong className="text-foreground">Operational Environmental Intelligence (OEI)</strong> is a continuous, 
                  instrumented, and analytically rich intelligence layer that measures, models, and interprets 
                  biological, chemical, and physical processes to inform defense decisions, protect forces, 
                  and secure infrastructure.
                </p>
                <p>
                  The military calls it the <em>operational environment</em>. We add <em>intelligence</em> to it - 
                  creating a layer of awareness that has never existed before. Every spore in the air, 
                  every microbe in the soil, every chemical trace becomes a data point in a living 
                  intelligence system.
                </p>
                <p>
                  OEI represents the convergence of:
                </p>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Persistent biological and environmental sensing networks",
                  "Low-latency mesh communications from field to command",
                  "AI-driven analysis and pattern recognition",
                  "Standardized intelligence product formats",
                  "Integration with existing C2 and JADC2 systems"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 via-muted to-blue-500/10 rounded-3xl p-8">
              <div className="aspect-square border border-primary/20 rounded-2xl bg-background/50 p-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      The Environment Has Eyes Now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Flow Hierarchy */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Architecture</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">OEI Data Flow</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From sensors in the field to decision-makers in command - a complete intelligence pipeline.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {dataFlowSteps.map((step, index) => (
                <div key={step.level} className="relative">
                  {index < dataFlowSteps.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-primary/20" />
                  )}
                  <NeuCard className="transition-colors">
                    <NeuCardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${
                          step.color === 'orange-500' ? 'bg-orange-500/10' :
                          step.color === 'green-500' ? 'bg-green-500/10' :
                          step.color === 'purple-500' ? 'bg-purple-500/10' :
                          step.color === 'primary' ? 'bg-primary/10' :
                          step.color === 'blue-500' ? 'bg-blue-500/10' :
                          'bg-destructive/10'
                        }`}>
                          <step.icon className={`h-6 w-6 ${
                            step.color === 'orange-500' ? 'text-orange-500' :
                            step.color === 'green-500' ? 'text-green-500' :
                            step.color === 'purple-500' ? 'text-purple-500' :
                            step.color === 'primary' ? 'text-primary' :
                            step.color === 'blue-500' ? 'text-blue-500' :
                            'text-destructive'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <NeuBadge variant="default">{index + 1}</NeuBadge>
                            <h3 className="font-semibold text-lg">{step.level}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {step.items.map((item) => (
                              <NeuBadge key={item} variant="default">{item}</NeuBadge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </NeuCardContent>
                  </NeuCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nature Learning Model */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="info" className="mb-4">AI Foundation</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">Nature Learning Model</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The first AI model purpose-built for environmental intelligence - unlike general language models, 
              NLM understands the patterns of nature.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nlmCapabilities.map((cap) => (
              <NeuCard key={cap.title} className="transition-colors">
                <NeuCardHeader>
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Brain className="h-5 w-5 text-blue-500" />
                    {cap.title}
                  </h3>
                </NeuCardHeader>
                <NeuCardContent>
                  <p className="text-muted-foreground">{cap.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>

          <div className="mt-12 max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground">
              NLM is trained on decades of environmental data, biological research, and field observations - 
              creating a unified model that can interpret signals from soil microbes to atmospheric conditions, 
              providing context that no general-purpose AI can match.
            </p>
          </div>
        </div>
      </section>

      {/* Who Uses OEI */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Applications</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">Who Uses OEI?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From warfighters to scientists - environmental intelligence serves multiple stakeholders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => (
              <NeuCard key={useCase.title} className="transition-colors">
                <NeuCardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                    <useCase.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{useCase.description}</p>
                </NeuCardHeader>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Tools</NeuBadge>
            <h2 className="text-4xl font-bold mb-4">The OEI Toolkit</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything needed to deploy and operate an OEI capability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <NeuCard className="text-center transition-colors">
              <NeuCardContent className="pt-8">
                <Database className="h-10 w-10 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">MINDEX Database</h3>
                <p className="text-sm text-muted-foreground">Cryptographic data store with chain-of-custody</p>
              </NeuCardContent>
            </NeuCard>
            <NeuCard className="text-center transition-colors">
              <NeuCardContent className="pt-8">
                <Eye className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">NatureOS</h3>
                <p className="text-sm text-muted-foreground">Unified command and visualization platform</p>
              </NeuCardContent>
            </NeuCard>
            <NeuCard className="text-center transition-colors">
              <NeuCardContent className="pt-8">
                <Radar className="h-10 w-10 text-orange-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Device Suite</h3>
                <p className="text-sm text-muted-foreground">Mushroom1, MycoNode, SporeBase, ALARM</p>
              </NeuCardContent>
            </NeuCard>
            <NeuCard className="text-center transition-colors">
              <NeuCardContent className="pt-8">
                <Brain className="h-10 w-10 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">NLM AI</h3>
                <p className="text-sm text-muted-foreground">Nature Learning Model for analysis</p>
              </NeuCardContent>
            </NeuCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Deploy OEI for Your Mission</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Request a briefing to learn how Operational Environmental Intelligence 
              can enhance your operational capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/defense/request-briefing">
                <NeuButton variant="primary" className="gap-2">
                  Request Briefing
                  <ArrowRight className="h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/defense/capabilities">
                <NeuButton variant="default" className="gap-2">
                  View All Capabilities
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
