/**
 * AVANI Public Page — Live Earth Data & Planetary Sensing
 * The complement to MYCA: real-time environmental awareness
 * Route: /ai/avani
 * Major refresh: Mar 17, 2026
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
import {
  Shield,
  CheckCircle2,
  ArrowRight,
  Scale,
  Globe,
  Eye,
  Waves,
  Wind,
  Thermometer,
  Activity,
  TreePine,
  Leaf,
  Radio,
  Zap,
} from "lucide-react"

export const metadata: Metadata = {
  title: "AVANI | Live Earth Data & Planetary Sensing | Mycosoft",
  description:
    "AVANI is Mycosoft's live Earth data and planetary sensing system. The real-time environmental awareness layer that complements MYCA — sensing what is happening so intelligence can respond to what is real.",
}

export default function AVANIPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero — yin-yang visual concept */}
      <section className="relative py-20 md:py-32 overflow-hidden border-b">
        {/* Yin-yang background treatment */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-background to-green-950/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] opacity-[0.06]">
            {/* Stylized yin-yang circle */}
            <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
              <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber-500/40" />
              <path
                d="M100,2 A98,98 0 0,1 100,198 A49,49 0 0,0 100,100 A49,49 0 0,1 100,2"
                fill="currentColor"
                className="text-amber-500/15"
              />
              <path
                d="M100,2 A98,98 0 0,0 100,198 A49,49 0 0,1 100,100 A49,49 0 0,0 100,2"
                fill="currentColor"
                className="text-green-500/15"
              />
              <circle cx="100" cy="51" r="8" className="text-green-500/20" fill="currentColor" />
              <circle cx="100" cy="149" r="8" className="text-amber-500/20" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-amber-500/30 bg-amber-500/10 mb-6">
            <Globe className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent">
              AVANI
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-foreground mb-3">
            Live Earth Data &amp; Planetary Sensing
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            AVANI is the real-time environmental awareness layer that complements MYCA.
            Where MYCA orchestrates and reasons, AVANI senses and grounds —
            providing the live planetary data that makes intelligence accountable to reality.
          </p>
          <p className="text-sm text-muted-foreground/80 max-w-xl mx-auto mb-8">
            Together, MYCA and AVANI form a paired system: cognition and sensing,
            action and awareness, intelligence and environmental truth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/myca">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                Meet MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[160px] px-6 touch-manipulation">
                AI Overview
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

      {/* Yin-Yang relationship visual */}
      <section className="py-16 md:py-20 border-b bg-muted/20">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Two Systems, One Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              MYCA and AVANI are complementary halves of a unified system — each incomplete
              without the other.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
            <Card className="border-green-500/30 bg-green-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">MYCA</CardTitle>
                    <CardDescription>Orchestration &amp; Cognition</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Coordinates agents, models, and workflows</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Maintains living worldview from sensor data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Runs on Mycosoft edge hardware</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Turns questions into coordinated action</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AVANI</CardTitle>
                    <CardDescription>Sensing &amp; Environmental Truth</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Provides real-time planetary data streams</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Grounds intelligence in environmental reality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Evaluates safety, sustainability, and legitimacy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Runs as its own adjacent system with independent governance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Connecting statement */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border bg-muted/50">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Cognition meets awareness — action meets accountability
              </span>
              <div className="w-3 h-3 rounded-full bg-amber-500" />
            </div>
          </div>
        </div>
      </section>

      {/* What AVANI Is */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What AVANI Is</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI is Mycosoft&apos;s live Earth data and planetary sensing system. It continuously
            collects, processes, and delivers real-time environmental signals — weather patterns,
            soil conditions, atmospheric data, biological indicators, and climate projections —
            so that intelligence operates on what is actually happening, not what a model was
            last trained on.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI also serves as the stewardship and governance layer. It evaluates what should happen
            before intelligence acts at full power — providing policy, restraint, auditability,
            reversibility, and environmental safeguards.
          </p>
          <p className="text-base font-medium">
            AVANI is not a filter bolted on at the end. It is the foundation that keeps the
            entire system honest — ensuring that powerful AI remains grounded, reviewable, and
            bounded by reality.
          </p>
        </div>
      </section>

      {/* AVANI Architecture (high-level, no sensitive internals) */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">AVANI Architecture</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            A multi-layered system for real-time environmental awareness and governance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Eye,
                title: "Sensing Layer",
                desc: "Continuous ingestion of environmental data from field hardware, satellite feeds, weather services, and climate models. Raw signals are processed at the edge before reaching the platform.",
                color: "amber",
              },
              {
                icon: Activity,
                title: "Signal Processing",
                desc: "Real-time normalization, anomaly detection, and quality validation. AVANI separates signal from noise across thousands of concurrent data streams.",
                color: "amber",
              },
              {
                icon: Globe,
                title: "Environmental Model",
                desc: "A continuously updated representation of current planetary conditions — integrating weather, soil, atmospheric, biological, and climate data into a unified environmental picture.",
                color: "amber",
              },
              {
                icon: Shield,
                title: "Governance & Constitution",
                desc: "Constitutional constraints, policy evaluation, risk-tiered authorization, and stewardship rules that ensure intelligence operates within safe, accountable boundaries.",
                color: "amber",
              },
              {
                icon: Scale,
                title: "Grounding & Approval",
                desc: "Before high-impact actions execute, AVANI evaluates sustainability, safety, and legitimacy. Audit trails and reversibility are built into every decision path.",
                color: "amber",
              },
              {
                icon: Radio,
                title: "Data Delivery",
                desc: "Processed environmental signals are delivered to MYCA and other platform consumers via real-time streams, enabling the living worldview that grounds all coordination.",
                color: "amber",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Card key={i} className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-amber-500" />
                      </div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* AVANI Capabilities */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">What AVANI Provides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Globe, title: "Live Earth Data", desc: "Continuous real-time environmental signals from sensors, satellites, and climate models" },
              { icon: Eye, title: "Planetary Sensing", desc: "Awareness of current conditions — weather, soil, atmosphere, biological indicators" },
              { icon: Shield, title: "Constitutional Governance", desc: "Policy constraints and stewardship rules that bound intelligence before it acts" },
              { icon: Scale, title: "Risk-Tiered Authorization", desc: "Escalation and approval logic proportional to action impact and uncertainty" },
              { icon: CheckCircle2, title: "Audit & Traceability", desc: "Every decision path is recorded, reversible, and reviewable" },
              { icon: Leaf, title: "Ecological Stewardship", desc: "Biosphere-aware governance that considers environmental impact alongside human goals" },
              { icon: Wind, title: "Climate Integration", desc: "Planetary-scale environmental modeling and prediction via NVIDIA Earth-2" },
              { icon: Thermometer, title: "Condition Monitoring", desc: "Real-time environmental baselines with anomaly detection and early warning" },
              { icon: TreePine, title: "Seasonal Awareness", desc: "Understanding of degraded states, seasonal patterns, and recovery cycles" },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Icon className="h-5 w-5 text-amber-500 mb-2" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* AVANI Constitution (public-facing) */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">The AVANI Constitution</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
            AVANI operates under a set of constitutional principles that define how it
            evaluates, governs, and constrains the system. These are not aspirational — they
            are enforced at the architecture level.
          </p>
          <div className="space-y-4">
            {[
              {
                principle: "Reality Primacy",
                description: "Environmental truth takes precedence over model predictions. When sensor data contradicts inference, sensor data wins.",
              },
              {
                principle: "Bounded Authority",
                description: "No single agent or model can execute high-impact actions without governance review. Authority is proportional to assessed risk.",
              },
              {
                principle: "Reversibility by Default",
                description: "Actions should be reversible where possible. Irreversible operations require explicit human authorization.",
              },
              {
                principle: "Ecological Consideration",
                description: "Environmental impact is evaluated alongside operational goals. The biosphere is a stakeholder, not an externality.",
              },
              {
                principle: "Transparency & Auditability",
                description: "Every decision path, data source, and governance evaluation is recorded and reviewable. No black boxes in high-impact paths.",
              },
              {
                principle: "Graceful Degradation",
                description: "When data is missing, connectivity is limited, or uncertainty is high, the system fails safely rather than guessing dangerously.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 md:p-5"
              >
                <h3 className="font-semibold text-base mb-1">{item.principle}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How AVANI works with MYCA */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">How AVANI Works With MYCA</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            In Mycosoft&apos;s architecture, MYCA handles orchestration, reasoning, and coordination.
            AVANI provides the environmental ground truth and governance constraints that keep
            that intelligence honest and accountable.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            AVANI runs as its own system adjacent to MYCA — with independent data pipelines,
            its own constitutional constraints, and separate governance logic. This separation
            is intentional: the system that evaluates safety should not be the same system
            that executes actions.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            MYCA moves work forward. AVANI ensures it remains grounded, reviewable, and bounded.
            Together, they create a system that can move quickly without becoming reckless —
            useful for real organizations where accountability matters.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/myca">
              <Button variant="outline" className="gap-2 min-h-[44px] touch-manipulation">
                Explore MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai">
              <Button variant="ghost" className="gap-2 min-h-[44px] touch-manipulation">
                AI Overview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Request Access</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Deploy governed AI with real-time environmental awareness.
            Talk to us about human seats, agent seats, and infrastructure tiers.
          </p>
          <Link href="/contact">
            <Button size="lg" className="min-h-[44px] px-8 touch-manipulation">
              Talk to us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
