/**
 * AI Overview Page — Stack View: MYCA + AVANI + NLM + NVIDIA
 * Route: /ai
 * Public entry point for the layered AI ecosystem.
 * Updated: Mar 18, 2026
 */

import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ArrowRight, Shield, Sparkles, Brain, Users, Bot, Cpu, Globe, Layers } from "lucide-react"
export const metadata: Metadata = {
  title: "AI | Layered Intelligence Stack | Mycosoft",
  description:
    "Mycosoft's AI stack is built as a layered ecosystem: MYCA (environmental super intelligence), AVANI (live Earth substrate), and NLM (Nature Learning Model) — powered by nature and computers.",
}

export default function AIOverviewPage() {
  return (
    <div className="ai-glass-page min-h-dvh">
      {/* Hero */}
      <section className="relative min-h-[76vh] overflow-hidden border-b bg-slate-950 py-20 md:py-28 flex items-center">
        <Image
          src="/assets/ai/ai-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[1.22] contrast-[1.06] saturate-[1.08]"
        />
        <div className="absolute inset-0 bg-slate-950/24" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/28 via-slate-950/10 to-background/82" />
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
            A Layered AI Ecosystem
          </h1>
          <p className="text-lg text-white/86 max-w-3xl mx-auto mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)]">
            Our AI stack is built as a layered ecosystem, not a single monolith. Planet-scale sensing,
            edge-native agents, robust reasoning, and human-readable explanations — powered by nature
            and computers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/myca">
              <Button size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                Explore MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai/avani">
              <Button variant="outline" size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[160px] px-6 touch-manipulation">
                See AVANI
              </Button>
            </Link>
            <Link href="/myca/nlm">
              <Button variant="outline" size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                <Brain className="h-4 w-4" />
                NLM
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                Talk to Mycosoft
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stack Overview */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">The Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="ai-stack-card ai-stack-card-myca border-white/30 bg-black/60 text-white">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-white shrink-0" />
                  <CardTitle className="text-xl text-white">MYCA</CardTitle>
                  <span className="ai-stack-label ml-auto">Stochastic AI</span>
                </div>
                <CardDescription className="text-white/75">
                  Environmental super intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/78 leading-relaxed mb-4">
                  Edge-native environmental super intelligence running on distributed hardware platforms and nodes.
                  MYCA pushes intelligence as close as possible to real-world signals, maintaining
                  a coherent worldview across all edge nodes while respecting locality and data sovereignty.
                </p>
                <Link href="/myca">
                  <Button variant="outline" size="sm" className="ai-glass-button mt-2 min-h-[44px] touch-manipulation">
                    Learn about MYCA
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="ai-stack-card ai-stack-card-avani border-rose-300/45 bg-rose-50/35 dark:bg-rose-950/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-rose-500 dark:text-rose-300 shrink-0" />
                  <CardTitle className="text-xl text-rose-950 dark:text-white">AVANI</CardTitle>
                  <span className="ai-stack-label ml-auto">Deterministic AI</span>
                </div>
                <CardDescription className="text-rose-950/70 dark:text-rose-50/75">
                  Live Earth substrate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-rose-950/78 dark:text-rose-50/78 leading-relaxed mb-4">
                  Continuous environmental and infrastructure context. AVANI ingests, harmonizes,
                  and serves planetary-scale signals — climate, sensor networks, infrastructure
                  telemetry, and remote sensing — so agents always act with awareness.
                </p>
                <Link href="/ai/avani">
                  <Button variant="outline" size="sm" className="ai-glass-button mt-2 min-h-[44px] touch-manipulation">
                    Learn about AVANI
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="ai-stack-card ai-stack-card-nlm border-emerald-500/35 bg-emerald-500/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <CardTitle className="text-xl text-emerald-950 dark:text-white">NLM</CardTitle>
                  <span className="ai-stack-label ml-auto">Models</span>
                </div>
                <CardDescription className="text-emerald-950/70 dark:text-emerald-50/75">
                  Nature Learning Model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-emerald-950/78 dark:text-emerald-50/78 leading-relaxed mb-4">
                  The Nature Learning Model gives the entire system robust reasoning and structured
                  ground-truth-based inference. It operates under partial data,
                  conflicting signals, and noisy environments while surfacing uncertainty.
                </p>
                <Link href="/myca/nlm">
                  <Button variant="outline" size="sm" className="ai-glass-button mt-2 min-h-[44px] touch-manipulation">
                    Learn about NLM
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* NVIDIA Platform */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="h-6 w-6 text-green-500 shrink-0" />
            <h2 className="text-2xl md:text-3xl font-bold">Our Platform</h2>
          </div>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Underneath MYCA, AVANI, and NLM, we build on the NVIDIA platform: Nemotron foundation
            models, a built-from-the-ground-up orchestration system, Earth-2-style simulation models, and
            PersonaPlex for full-duplex voice-to-voice and conversational control.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            This allows us to deploy sophisticated, domain-specific agents on Blackwell-generation
            edge GPUs while keeping data close to the real world.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Public materials emphasize what the system does — planet-scale sensing, edge-native agents,
            robust reasoning, and human-readable explanations — without exposing the proprietary details
            of how each component is implemented.
          </p>
        </div>
      </section>

      {/* How they work together */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">How They Work Together</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            MYCA and AVANI form a yin-yang pair: MYCA is the structured, goal-seeking &quot;hand&quot;
            and AVANI is the live Earth &quot;palm&quot; providing continuous context. NLM serves as the
            reasoning backbone connecting them, turning signals and data into structured inferences and plans.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Together, they create a closed loop across sensing, prediction, decision, and actuation.
            Each layer is independently valuable but purpose-built to amplify the others.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            The system is designed for real organizations where accountability matters: MYCA expands
            capability, AVANI grounds it in planetary data, and NLM ensures robust reasoning with
            full uncertainty awareness.
          </p>
        </div>
      </section>

      {/* Built for Multiple Participants */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Built for Multiple Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Users className="h-6 w-6 mb-2 text-muted-foreground" />
                <CardTitle className="text-lg">For Humans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Humans use MYCA + AVANI to ask complex questions that interact with the world,
                  the environment, and nature. The system can be used to see live events, locations,
                  and details of all species on the planet and coordinate correlation between
                  environmental events, local biomass &amp; natural signaling data.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Bot className="h-6 w-6 mb-2 text-muted-foreground" />
                <CardTitle className="text-lg">For Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Agents use Microsoft as a live worldview coordination and nature learning model.
                  MYCA gives them context, memory, and task routing. AVANI gives MYCA boundaries,
                  policy, and approval logic. NLM gives the entire system robust reasoning and
                  structured ground-truth-based inference.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Cpu className="h-6 w-6 mb-2 text-muted-foreground" />
                <CardTitle className="text-lg">For Frontier Models</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mycosoft is model-flexible. Multiple frontier models can be used as specialized
                  reasoning engines. MYCA coordinates them; AVANI governs their use; NLM structures
                  their outputs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Cost Less. Do More. Govern Better.</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
            Mycosoft reduces the hidden costs of fragmented AI: fewer disconnected tools, less
            duplicated work, less vendor lock-in, less manual orchestration, lower oversight burden
            because governance is built in, and fewer mistakes from context loss and unsafe automation.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
            Deployment-based pricing. Human seats, agent seats, and infrastructure tiers coming soon.
          </p>
          <Link href="/contact">
            <Button size="lg" className="ai-glass-button min-h-[44px] px-8 touch-manipulation">
              Talk to us
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Request Access</h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Deploy with Mycosoft. Human seats, agent seats, and infrastructure tiers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/contact">
              <Button size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[160px] touch-manipulation">
                Request access
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="ai-glass-button gap-2 min-h-[44px] min-w-[140px] touch-manipulation">
                Talk to us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 border-t">
        <div className="container max-w-3xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="stack">
              <AccordionTrigger className="text-base text-left">What are the layers of Mycosoft&apos;s AI stack?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Three core layers: MYCA (environmental super intelligence at the edge), AVANI (live Earth substrate
                for continuous environmental context), and NLM (Nature Learning Model for structured
                ground-truth-based inference). We build on the NVIDIA platform including Nemotron models,
                a built-from-the-ground-up orchestration system, and Blackwell-generation edge GPUs.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="myca-avani">
              <AccordionTrigger className="text-base text-left">What is the relationship between MYCA and AVANI?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                MYCA and AVANI form a yin-yang pair. MYCA is the structured, goal-seeking
                &quot;hand&quot; focused on form, goals, plans, and agents. AVANI is the live Earth
                &quot;palm&quot; focused on flows, data, signals, and fields. Together they create a closed
                loop across sensing, prediction, decision, and actuation.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nlm">
              <AccordionTrigger className="text-base text-left">What does NLM do?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The Nature Learning Model (NLM) gives the entire system robust reasoning and structured
                ground-truth-based inference. It specializes in connecting dots over
                time and across modalities, explaining not just what is happening but why and what might
                happen next — while surfacing its own uncertainty.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nvidia">
              <AccordionTrigger className="text-base text-left">What platform do you build on?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We build on the NVIDIA platform: Nemotron foundation models for
                language and multimodal reasoning, a built-from-the-ground-up orchestration system, Earth-2-style
                simulation models for environmental tasks, and PersonaPlex for full-duplex voice-to-voice
                and conversational control. This runs on Blackwell-generation edge GPUs across our hardware platforms.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="models">
              <AccordionTrigger className="text-base text-left">Can Mycosoft work with other frontier models?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. Mycosoft is model-flexible. Multiple frontier models can be used as specialized
                reasoning engines. MYCA coordinates them; AVANI governs their use. You are not locked
                into one vendor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pricing">
              <AccordionTrigger className="text-base text-left">How does pricing work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Deployment-based pricing. Human seats, agent seats, and infrastructure tiers coming
                soon. Talk to us for access.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
      <style>{`
        @property --ai-card-light-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .ai-glass-page .ai-glass-button {
          position: relative;
          overflow: hidden;
          border-color: rgba(255, 255, 255, 0.36) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.1) 44%, rgba(255, 255, 255, 0.04)) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.32),
            inset 0 -14px 28px rgba(255, 255, 255, 0.05),
            0 14px 34px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(18px) saturate(1.22);
          -webkit-backdrop-filter: blur(18px) saturate(1.22);
        }

        .ai-glass-page .ai-glass-button::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255, 255, 255, 0.42), transparent 38%, rgba(255, 255, 255, 0.12) 68%, transparent);
          opacity: 0.54;
        }

        .ai-glass-page .ai-glass-button:hover {
          border-color: rgba(255, 255, 255, 0.58) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.14) 44%, rgba(255, 255, 255, 0.06)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.42),
            0 18px 42px rgba(0, 0, 0, 0.24);
        }

        .ai-glass-page .ai-glass-button svg {
          color: #fff !important;
          stroke: currentColor !important;
        }

        .ai-glass-page .ai-stack-card {
          position: relative;
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            0 18px 44px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(14px) saturate(1.16);
          -webkit-backdrop-filter: blur(14px) saturate(1.16);
        }

        .ai-glass-page .ai-stack-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.95;
        }

        .ai-glass-page .ai-stack-card::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          padding: 1px;
          border-radius: inherit;
          background:
            conic-gradient(from var(--ai-card-light-angle), transparent 0deg, transparent 38deg, rgba(255, 255, 255, 0.82) 54deg, rgba(255, 255, 255, 0.24) 78deg, transparent 116deg, transparent 360deg);
          opacity: 0.86;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          animation: ai-card-edge-light var(--ai-card-light-speed, 8s) linear infinite;
        }

        .ai-glass-page .ai-stack-card-myca {
          --ai-card-light-speed: 7.6s;
        }

        .ai-glass-page .ai-stack-card-avani {
          --ai-card-light-speed: 10.4s;
        }

        .ai-glass-page .ai-stack-card-nlm {
          --ai-card-light-speed: 12.8s;
        }

        .ai-glass-page .ai-stack-card > * {
          position: relative;
          z-index: 1;
        }

        .ai-glass-page .ai-stack-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          max-width: 148px;
          padding: 0 0.65rem;
          border: 1px solid rgba(255, 255, 255, 0.34);
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08));
          color: #fff;
          -webkit-text-fill-color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.62);
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 10px 24px rgba(0, 0, 0, 0.16);
          backdrop-filter: blur(14px) saturate(1.18);
          -webkit-backdrop-filter: blur(14px) saturate(1.18);
        }

        .ai-glass-page .ai-stack-card-myca {
          background:
            linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(10, 10, 10, 0.86) 34%, rgba(255, 255, 255, 0.08)),
            #050505 !important;
        }

        .ai-glass-page .ai-stack-card-myca::before {
          background:
            linear-gradient(115deg, rgba(255, 255, 255, 0.28), transparent 30%, rgba(255, 255, 255, 0.08) 64%, transparent),
            radial-gradient(circle at 75% 20%, rgba(255, 255, 255, 0.22), transparent 26%);
        }

        .ai-glass-page .ai-stack-card-avani {
          background:
            radial-gradient(circle at 18% 14%, rgba(251, 113, 133, 0.28), transparent 28%),
            radial-gradient(circle at 82% 26%, rgba(244, 114, 182, 0.24), transparent 28%),
            radial-gradient(circle at 22% 82%, rgba(34, 197, 94, 0.18), transparent 30%),
            linear-gradient(135deg, rgba(255, 241, 242, 0.78), rgba(255, 255, 255, 0.42)) !important;
        }

        .dark .ai-glass-page .ai-stack-card-avani {
          background:
            radial-gradient(circle at 18% 14%, rgba(251, 113, 133, 0.3), transparent 28%),
            radial-gradient(circle at 82% 26%, rgba(244, 114, 182, 0.22), transparent 28%),
            radial-gradient(circle at 22% 82%, rgba(34, 197, 94, 0.16), transparent 30%),
            linear-gradient(135deg, rgba(76, 5, 25, 0.8), rgba(15, 23, 42, 0.88)) !important;
        }

        .ai-glass-page .ai-stack-card-nlm {
          background:
            linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(34, 197, 94, 0.18) 42%, rgba(120, 73, 35, 0.2)),
            linear-gradient(90deg, rgba(92, 54, 25, 0.16) 0 12%, transparent 12% 22%),
            rgba(240, 253, 244, 0.66) !important;
        }

        .dark .ai-glass-page .ai-stack-card-nlm {
          background:
            linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(34, 197, 94, 0.2) 42%, rgba(120, 73, 35, 0.28)),
            linear-gradient(90deg, rgba(92, 54, 25, 0.18) 0 12%, transparent 12% 22%),
            rgba(6, 29, 24, 0.86) !important;
        }

        @keyframes ai-card-edge-light {
          0% {
            --ai-card-light-angle: 0deg;
          }
          100% {
            --ai-card-light-angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-glass-page .ai-stack-card::after {
            animation: none;
            --ai-card-light-angle: 35deg;
          }
        }
      `}</style>
    </div>
  )
}
