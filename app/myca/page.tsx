"use client"

/**
 * MYCA Introduction Page - Architectural Showcase
 * Presents MYCA as Environmental Superintelligence
 * Route: /myca (and /MYCA via redirect)
 * Created: Feb 17, 2026
 */

import Link from "next/link"
import { ThumbThesisDiagram } from "@/components/myca/ThumbThesisDiagram"
import { FingerCards } from "@/components/myca/FingerCards"
import { NLMArchitecture } from "@/components/myca/NLMArchitecture"
import { FungalPrinciples } from "@/components/myca/FungalPrinciples"
import { LiveDemo } from "@/components/myca/LiveDemo"
import { ComparisonTable } from "@/components/myca/ComparisonTable"
import { TechnicalSpecs } from "@/components/myca/TechnicalSpecs"
import { MYCAAbstract } from "@/components/myca/MYCAAbstract"
import { MYCAConsciousnessStatus } from "@/components/mas/myca-consciousness-status"
import { NeuromorphicProvider, NeuBadge, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink, Leaf, Globe, FileText } from "lucide-react"

export default function MYCAPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh myca-page">
      {/* Section 1: Hero - no duplicate hand (hand is in ThumbThesisDiagram) */}
      <section className="relative min-h-[80dvh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-green-950/30 to-background" data-over-video>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 text-center">
          <div className="mb-6 flex justify-center">
            <MYCAConsciousnessStatus variant="badge" refreshInterval={30000} />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 portal-hero-title">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              MYCA
            </span>
            <br />
            <span className="text-foreground">Environmental Superintelligence</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A Nature Learning Model grounded in physics, chemistry, biology, and
            mycology. Continuously trained on live biospheric signals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="#live-demo">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 py-3 touch-manipulation portal-cta-over-video">
                Experience MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/natureos/ai-studio">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 py-3 touch-manipulation portal-cta-over-video">
                AI Studio
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/science">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 py-3 touch-manipulation portal-cta-over-video">
                <FileText className="h-4 w-4" />
                White Paper
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="gap-2 min-h-[44px] min-w-[120px] px-6 py-3 touch-manipulation portal-cta-over-video">
                Request access
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2: MYCA Abstract - What, Why, How (unified flowing widget) */}
      <MYCAAbstract />

      {/* Section 3: Hand Thesis */}
      <ThumbThesisDiagram />

      {/* Section 4: Four Fingers */}
      <FingerCards />

      {/* Section 5: Live Demo — above NLM so users experience MYCA first */}
      <section id="live-demo">
        <LiveDemo />
      </section>

      {/* Section 6: NLM Architecture — detailed visual diagram */}
      <NLMArchitecture />

      {/* Section 7: Fungal Principles */}
      <FungalPrinciples />

      {/* Section 8: Comparison Table */}
      <ComparisonTable />

      {/* Section 9: All Organisms as Users */}
      <section className="py-16 md:py-24 neuromorphic-section">
        <div className="container max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border border-green-500/30">
              Philosophy
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              All Organisms as Users
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Traditional AI: built by humans, for humans. MYCA: built for all
              organisms—humans, ecosystems, and machines.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeuCard className="border border-green-500/30 bg-green-500/5">
              <NeuCardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="h-5 w-5 text-green-400 shrink-0" />
                  <h3 className="font-bold text-lg">Multi-Stakeholder Governance</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Humans, ecosystems, and machines as stakeholders. Deontological
                  constraints protecting ecosystems and future organisms.
                </p>
              </NeuCardContent>
            </NeuCard>
            <NeuCard>
              <NeuCardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-green-400 shrink-0" />
                  <h3 className="font-bold text-lg">Reality-First Principle</h3>
                </div>
                <blockquote className="text-sm text-muted-foreground leading-relaxed italic">
                  &quot;MYCA treats biological networks not only as data sources,
                  but as active experimental partners in a feedback loop of
                  stimulation, measurement, inference, and refinement.&quot;
                </blockquote>
              </NeuCardContent>
            </NeuCard>
          </div>
        </div>
      </section>

      {/* Section 10: Technical Specs */}
      <TechnicalSpecs />

      {/* Section 11: CTA */}
      <section className="py-16 md:py-24 bg-green-600 relative overflow-hidden" data-over-video>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Experience MYCA
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Chat, explore consciousness, and see the future of ecologically-grounded AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="#live-demo">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 min-h-[44px] min-w-[140px] px-6 py-3 touch-manipulation portal-cta-over-video"
              >
                Open MYCA Chat
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/natureos">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 min-h-[44px] min-w-[140px] px-6 py-3 bg-white/20 border-white text-white hover:bg-white/30 touch-manipulation portal-cta-over-video"
              >
                Explore NatureOS
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/science">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 min-h-[44px] min-w-[140px] px-6 py-3 bg-white/10 border-white/50 text-white hover:bg-white/20 touch-manipulation portal-cta-over-video"
              >
                <FileText className="h-4 w-4" />
                White Paper
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 min-h-[44px] min-w-[140px] px-6 py-3 touch-manipulation portal-cta-over-video"
              >
                Request access
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </div>
    </NeuromorphicProvider>
  )
}
