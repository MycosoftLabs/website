/**
 * AVANI Public Page — Live Earth Substrate
 * Route: /ai/avani
 * Updated: Mar 18, 2026 — Full update with yin-yang framing, constitution, architecture
 */

import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shield, CheckCircle2, ArrowRight, Scale, Globe, Layers, Database, Radio, Eye, Heart, Lock, AlertTriangle, Handshake } from "lucide-react"

export const metadata: Metadata = {
  title: "AVANI | Live Earth Substrate | Mycosoft",
  description:
    "AVANI is the live Earth substrate for MYCA: planetary-scale sensing, environmental data, and continuous context so agents always act with environmental and societal awareness.",
}

export default function AVANIPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border bg-amber-500/10 mb-6">
            <Globe className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            AVANI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Live Earth Substrate
          </p>
          <p className="text-base text-muted-foreground max-w-3xl mx-auto mb-8">
            AVANI is the live Earth substrate for MYCA: if MYCA is a hand with four fingers and a thumb,
            AVANI is the palm that feels the world and grounds every action in real, continuous data.
            AVANI ingests, harmonizes, and serves planetary-scale signals — climate, sensor networks,
            infrastructure telemetry, and remote sensing — so agents powered by MYCA always act with
            environmental and societal awareness.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/ai">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[160px] px-6 touch-manipulation">
                AI Overview
              </Button>
            </Link>
            <Link href="/myca">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 touch-manipulation">
                Meet MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                Talk to us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Yin-Yang: MYCA + AVANI */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">The Yin-Yang of MYCA and AVANI</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-3xl mx-auto text-center">
            AVANI and MYCA form a yin-yang pair: AVANI focuses on flows (data, signals, fields) and
            MYCA focuses on form (goals, plans, agents). AVANI&apos;s live feeds are accessible to MYCA
            through simple, privacy-respecting APIs at the edge, enabling local decisions that still
            understand global context such as weather, grid stress, and ecosystem health.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-500 shrink-0" />
                  <CardTitle className="text-xl">AVANI — Flows</CardTitle>
                </div>
                <CardDescription>Data, signals, fields</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The organic &quot;palm&quot; of live Earth signals. AVANI continuously ingests and
                  harmonizes planetary-scale data, providing the sensory substrate that grounds
                  all agent actions in real-world context.
                </p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-green-500 shrink-0" />
                  <CardTitle className="text-xl">MYCA — Form</CardTitle>
                </div>
                <CardDescription>Goals, plans, agents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The structured, geometric &quot;hand/fingers.&quot; MYCA takes AVANI&apos;s continuous
                  data and translates it into structured goals, coordinated plans, and
                  actionable agent behaviors at the edge.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What AVANI Is */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What AVANI Is</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI runs on its own dedicated backend next to the MYCA master VM, exposing a stable public
            interface for live earth queries while keeping its internal data pipelines and optimizations
            private. It is designed to be the planetary memory and sensory cortex for all other systems
            we build.
          </p>
          <p className="text-base font-medium">
            AVANI is not just a data layer. It is the living substrate that gives every agent
            environmental and societal awareness.
          </p>
        </div>
      </section>

      {/* Constitution */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">AVANI Constitution</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
            AVANI operates under a clear constitution that governs how it treats data and serves outputs:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Heart className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Primacy of Earth Systems</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Optimize for long-term planetary health within the constraints set by human stakeholders.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Eye className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Human Legibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Provide explanations in language humans can understand, not just raw numbers and maps.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Lock className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Privacy and Sovereignty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Respect data ownership, jurisdictional rules, and local communities; minimize retention
                  of personally identifiable or sensitive operational data.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Safety and Resilience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Degrade gracefully under partial data, never overstate confidence, and surface
                  uncertainty explicitly.
                </p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <Handshake className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Alignment with MYCA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Maintain compatible ontologies and time scales so MYCA can safely act on AVANI&apos;s outputs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Architecture</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Radio className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Input Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Connectors for environmental, infrastructure, and remote sensing feeds.</li>
                  <li>Pluggable adapters for partner data sources, with quality and provenance scoring.</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Layers className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Processing Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Normalization, gap-filling, and uncertainty estimation pipelines.</li>
                  <li>Spatiotemporal indexing supporting queries from local edge nodes as well as regional/global views.</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Database className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Model Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Earth-scale simulation and prediction models inspired by systems like NVIDIA Earth-2.</li>
                  <li>Smaller local models for nowcasting and anomaly detection.</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Shield className="h-5 w-5 text-amber-500 mb-2" />
                <CardTitle className="text-base">Serving Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>Read-focused APIs for MYCA agents and other internal consumers.</li>
                  <li>Rate-limited, pre-aggregated public APIs for selected, non-sensitive indicators.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Request Access</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Deploy governed AI with Mycosoft. Talk to us about human seats, agent seats, and
            infrastructure tiers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/contact">
              <Button size="lg" className="min-h-[44px] px-8 touch-manipulation">
                Talk to us
              </Button>
            </Link>
            <Link href="/myca">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] px-6 touch-manipulation">
                Explore MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
