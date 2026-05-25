"use client"

/**
 * MYCA Introduction Page - Environmental Super Intelligence
 * Presents MYCA as an environmental super intelligence for the mycelial edge
 * Route: /myca (and /MYCA via redirect)
 * Updated: Mar 18, 2026
 */

import Link from "next/link"
import { ThumbThesisDiagram } from "@/components/myca/ThumbThesisDiagram"
import { FingerCards } from "@/components/myca/FingerCards"
import { NLMArchitecture } from "@/components/myca/NLMArchitecture"
import { FungalPrinciples } from "@/components/myca/FungalPrinciples"
import { LiveDemo } from "@/components/myca/LiveDemo"
import { MYCAProvider } from "@/contexts/myca-context"
import { ComparisonTable } from "@/components/myca/ComparisonTable"
import { TechnicalSpecs } from "@/components/myca/TechnicalSpecs"
import { MYCAAbstract } from "@/components/myca/MYCAAbstract"
import { MYCAConsciousnessStatus } from "@/components/mas/myca-consciousness-status"
import { NeuromorphicProvider, NeuBadge, NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink, Leaf, Globe, FileText, Cpu, Network, Shield } from "lucide-react"

export default function MYCAPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh myca-page">
      {/* Section 1: Live Demo */}
      <div id="live-demo">
        <MYCAProvider initialConsciousnessActive>
          <LiveDemo
            showDemoBackground={false}
            forceMountPanels={false}
            className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
          />
        </MYCAProvider>
      </div>

      {/* Section 2: Hero */}
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
            <span className="text-foreground">Environmental Super Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Edge-native intelligence for the mycelial edge. MYCA runs in distributed edge data centers
            embedded inside our dedicated hardware platforms and nodes, treating them like a planetary
            nervous system that pushes intelligence as close as possible to real-world signals.
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

      {/* Section 3: Edge-Native Intelligence */}
      <section className="py-16 md:py-24 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border border-green-500/30">
              Edge-Native
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Intelligence at the Edge
            </h2>
          </div>
          <div className="space-y-6 text-muted-foreground text-base md:text-lg leading-relaxed">
            <p>
              MYCA is our environmental super intelligence for the mycelial edge: instead of living in centralized
              hyperscale data centers, MYCA runs in distributed edge data centers embedded inside our
              dedicated hardware platforms and nodes. It treats these locations like a planetary nervous
              system, pushing intelligence as close as possible to real-world signals.
            </p>
            <p>
              Under the hood, MYCA is powered by Nemotron foundation models, a built-from-the-ground-up
              orchestration system, and PersonaPlex for full-duplex voice-to-voice interactions, with support for
              Blackwell-generation edge GPUs so each node can host rich, local agents. MYCA maintains a
              coherent worldview across all these nodes, allowing it to reason about environments, policies,
              and user intent while still respecting locality and data sovereignty.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: MYCA + AVANI Yin-Yang */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border border-green-500/30">
              Paired Intelligence
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Yin-Yang of MYCA and AVANI
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <NeuCard className="border border-green-500/30 bg-green-500/5">
              <NeuCardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-6 w-6 text-green-400 shrink-0" />
                  <h3 className="font-bold text-xl">MYCA — The Hand</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The structured, goal-seeking &quot;hand&quot; — focused on form, goals, plans, and agents.
                  MYCA coordinates action across distributed edge nodes, turning intent into execution
                  with full environmental awareness.
                </p>
              </NeuCardContent>
            </NeuCard>
            <NeuCard className="border border-amber-500/30 bg-amber-500/5">
              <NeuCardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-6 w-6 text-amber-400 shrink-0" />
                  <h3 className="font-bold text-xl">AVANI — The Palm</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The live Earth &quot;palm&quot; providing continuous environmental context and feedback.
                  AVANI focuses on flows — data, signals, fields — grounding every action in real,
                  continuous planetary data.
                </p>
              </NeuCardContent>
            </NeuCard>
          </div>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mt-8 text-center max-w-3xl mx-auto">
            Together, MYCA and AVANI form a closed loop across sensing, prediction, decision, and actuation,
            while exposing simple, human-readable interfaces at the edge.
          </p>
        </div>
      </section>

      {/* Section 5: MYCA Abstract */}
      <MYCAAbstract />

      {/* Section 6: Hand Thesis */}
      <ThumbThesisDiagram />

      {/* Section 7: Four Fingers */}
      <FingerCards />

      {/* Section 8: NLM Architecture */}
      <NLMArchitecture />

      {/* Section 9: Fungal Principles */}
      <FungalPrinciples />

      {/* Section 10: Comparison Table */}
      <ComparisonTable />

      {/* Section 11: All Organisms as Users */}
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

      {/* Section 12: Technical Specs */}
      <TechnicalSpecs />

      {/* Section 13: CTA */}
      <section className="py-16 md:py-24 bg-green-600 relative overflow-hidden" data-over-video>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Experience MYCA
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Chat, explore consciousness, and see the future of edge-native, ecologically-grounded AI.
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
      <style>{`
        .myca-page button,
        .myca-page .neu-btn {
          position: relative;
          overflow: hidden;
          border-color: rgba(255, 255, 255, 0.36) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.11) 44%, rgba(255, 255, 255, 0.045)) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.68);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.34),
            inset 0 -14px 28px rgba(255, 255, 255, 0.055),
            0 14px 34px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(18px) saturate(1.22);
          -webkit-backdrop-filter: blur(18px) saturate(1.22);
        }

        .myca-page button::before,
        .myca-page .neu-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255, 255, 255, 0.42), transparent 38%, rgba(255, 255, 255, 0.12) 68%, transparent);
          opacity: 0.48;
        }

        .myca-page button:hover,
        .myca-page .neu-btn:hover {
          border-color: rgba(255, 255, 255, 0.58) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.15) 44%, rgba(255, 255, 255, 0.065)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.44),
            0 18px 42px rgba(0, 0, 0, 0.24);
        }

        .myca-page button svg,
        .myca-page .neu-btn svg {
          color: #fff !important;
          stroke: currentColor !important;
        }

        .myca-page [data-slot="card"],
        .myca-page .neu-raised:not(button) {
          border-color: rgba(255, 255, 255, 0.28) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.075) 46%, rgba(255, 255, 255, 0.035)),
            rgba(255, 255, 255, 0.08) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.24),
            inset 0 -18px 34px rgba(255, 255, 255, 0.04),
            0 18px 44px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(18px) saturate(1.18);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
        }

        .dark .myca-page [data-slot="card"],
        .dark .myca-page .neu-raised:not(button) {
          border-color: rgba(255, 255, 255, 0.24) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.055) 46%, rgba(255, 255, 255, 0.025)),
            rgba(2, 12, 10, 0.44) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -18px 34px rgba(255, 255, 255, 0.03),
            0 20px 48px rgba(0, 0, 0, 0.24);
        }

        .myca-page .myca-live-demo .myca-live-panel,
        .myca-page .myca-live-demo [data-slot="card"],
        .myca-page .myca-live-demo .neu-raised:not(button),
        .myca-page .myca-live-demo .myca-chat-shell,
        .myca-page .myca-live-demo .myca-live-activity-card,
        .myca-page .myca-live-demo [class*="bg-card"],
        .myca-page .myca-live-demo [class*="bg-muted"] {
          border-color: rgba(255, 255, 255, 0.26) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.024) 48%, rgba(255, 255, 255, 0.01)),
            rgba(255, 255, 255, 0.015) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 18px 44px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(6px) saturate(1.08);
          -webkit-backdrop-filter: blur(6px) saturate(1.08);
        }

        .dark .myca-page .myca-live-demo .myca-live-panel,
        .dark .myca-page .myca-live-demo [data-slot="card"],
        .dark .myca-page .myca-live-demo .neu-raised:not(button),
        .dark .myca-page .myca-live-demo .myca-chat-shell,
        .dark .myca-page .myca-live-demo .myca-live-activity-card,
        .dark .myca-page .myca-live-demo [class*="bg-card"],
        .dark .myca-page .myca-live-demo [class*="bg-muted"] {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02) 48%, rgba(255, 255, 255, 0.008)),
            rgba(0, 20, 14, 0.08) !important;
        }

        .dark .myca-page .myca-live-demo .myca-live-activity-card,
        .dark .myca-page .myca-live-demo .myca-live-activity-card.neu-raised {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.014) 48%, rgba(255, 255, 255, 0.006)),
            rgba(0, 20, 14, 0.035) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.13),
            0 18px 44px rgba(0, 0, 0, 0.08) !important;
          backdrop-filter: blur(4px) saturate(1.04);
          -webkit-backdrop-filter: blur(4px) saturate(1.04);
        }

        .myca-page .myca-live-demo .myca-chat-header,
        .myca-page .myca-live-demo .myca-chat-input-bar,
        .myca-page .myca-live-demo .myca-activity-log,
        .myca-page .myca-live-demo .myca-confirmation-panel {
          border-color: rgba(255, 255, 255, 0.22) !important;
          background: rgba(255, 255, 255, 0.018) !important;
          backdrop-filter: blur(4px) saturate(1.05);
          -webkit-backdrop-filter: blur(4px) saturate(1.05);
        }

        .dark .myca-page .myca-live-demo .myca-activity-log {
          border-color: rgba(255, 255, 255, 0.18) !important;
          background: rgba(0, 20, 14, 0.025) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .myca-page .myca-live-demo .myca-message-bubble,
        .myca-page .myca-live-demo .myca-activity-log-row {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018)),
            rgba(255, 255, 255, 0.018) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.055);
          backdrop-filter: blur(3px) saturate(1.05);
          -webkit-backdrop-filter: blur(3px) saturate(1.05);
        }

        .dark .myca-page .myca-live-demo .myca-activity-log-row {
          border-color: rgba(255, 255, 255, 0.16) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.012)),
            rgba(0, 20, 14, 0.018) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
        }

        .myca-page .myca-live-demo .myca-message-user {
          background:
            linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(255, 255, 255, 0.045)),
            rgba(34, 197, 94, 0.06) !important;
        }

        .dark .myca-page .myca-live-demo .myca-message-user {
          color: #fff !important;
          -webkit-text-fill-color: #fff;
        }

        .myca-page .myca-live-demo .myca-message-myca {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(16, 185, 129, 0.04)),
            rgba(255, 255, 255, 0.028) !important;
        }

        .myca-page .myca-live-demo textarea,
        .myca-page .myca-live-demo input,
        .myca-page .myca-live-demo .myca-chat-input,
        .myca-page .myca-live-demo pre {
          border-color: rgba(255, 255, 255, 0.24) !important;
          background: rgba(255, 255, 255, 0.035) !important;
          backdrop-filter: blur(5px) saturate(1.08);
          -webkit-backdrop-filter: blur(5px) saturate(1.08);
        }

        html.dark .myca-page .myca-live-demo button,
        html.dark .myca-page .myca-live-demo [role="button"],
        html.dark .myca-page .myca-live-demo .neu-btn,
        html.dark .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"],
        .dark .myca-page .myca-live-demo button,
        .dark .myca-page .myca-live-demo [role="button"],
        .dark .myca-page .myca-live-demo .neu-btn,
        .dark .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"],
        [data-theme="dark"] .myca-page .myca-live-demo button,
        [data-theme="dark"] .myca-page .myca-live-demo [role="button"],
        [data-theme="dark"] .myca-page .myca-live-demo .neu-btn,
        [data-theme="dark"] .myca-page .myca-live-demo [class*="rounded-lg"][class*="border"] {
          border-color: rgba(255, 255, 255, 0.34) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.075) 44%, rgba(255, 255, 255, 0.028)),
            rgba(255, 255, 255, 0.035) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.62);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.28),
            0 12px 28px rgba(0, 0, 0, 0.14) !important;
          backdrop-filter: blur(14px) saturate(1.16) !important;
          -webkit-backdrop-filter: blur(14px) saturate(1.16) !important;
        }

        html.dark .myca-page .myca-live-demo button:hover,
        html.dark .myca-page .myca-live-demo [role="button"]:hover,
        .dark .myca-page .myca-live-demo button:hover,
        .dark .myca-page .myca-live-demo [role="button"]:hover,
        [data-theme="dark"] .myca-page .myca-live-demo button:hover,
        [data-theme="dark"] .myca-page .myca-live-demo [role="button"]:hover {
          border-color: rgba(255, 255, 255, 0.56) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.11) 44%, rgba(255, 255, 255, 0.045)),
            rgba(255, 255, 255, 0.05) !important;
        }

        html.dark .myca-page .myca-live-demo .myca-activity-log,
        .dark .myca-page .myca-live-demo .myca-activity-log,
        [data-theme="dark"] .myca-page .myca-live-demo .myca-activity-log {
          border-color: rgba(255, 255, 255, 0.2) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.006)),
            rgba(0, 0, 0, 0.01) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(3px) saturate(1.04) !important;
          -webkit-backdrop-filter: blur(3px) saturate(1.04) !important;
        }

        html.dark .myca-page .myca-live-demo .myca-activity-log-row,
        .dark .myca-page .myca-live-demo .myca-activity-log-row,
        [data-theme="dark"] .myca-page .myca-live-demo .myca-activity-log-row {
          border-color: rgba(255, 255, 255, 0.16) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.006)),
            rgba(0, 0, 0, 0.008) !important;
          box-shadow: none !important;
          backdrop-filter: blur(2px) saturate(1.03) !important;
          -webkit-backdrop-filter: blur(2px) saturate(1.03) !important;
        }

        .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
        html.dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
        .dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log,
        [data-theme="dark"] .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log {
          border-color: rgba(255, 255, 255, 0.22) !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0.004)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(2px) saturate(1.02) !important;
          -webkit-backdrop-filter: blur(2px) saturate(1.02) !important;
        }

        .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
        html.dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
        .dark .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row,
        [data-theme="dark"] .myca-page .myca-live-demo .myca-live-activity-card .myca-activity-log-row {
          border-color: rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.018) !important;
          background-color: rgba(255, 255, 255, 0.018) !important;
          background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.004)) !important;
          box-shadow: none !important;
          backdrop-filter: blur(2px) saturate(1.02) !important;
          -webkit-backdrop-filter: blur(2px) saturate(1.02) !important;
        }
      `}</style>
      </div>
    </NeuromorphicProvider>
  )
}
