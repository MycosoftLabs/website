/**
 * AI Overview Page — Stack View: MYCA + AVANI + NLM + NVIDIA
 * Route: /ai
 * Public entry point for the layered AI ecosystem.
 * Updated: Mar 18, 2026
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
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            A Layered AI Ecosystem
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Our AI stack is built as a layered ecosystem, not a single monolith. Planet-scale sensing,
            edge-native agents, robust reasoning, and human-readable explanations — powered by nature
            and computers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/myca">
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                Explore MYCA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai/avani">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[160px] px-6 touch-manipulation">
                See AVANI
              </Button>
            </Link>
            <Link href="/myca/nlm">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
                <Brain className="h-4 w-4" />
                NLM
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="gap-2 min-h-[44px] min-w-[140px] px-6 touch-manipulation">
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
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-500 shrink-0" />
                  <CardTitle className="text-xl">MYCA</CardTitle>
                </div>
                <CardDescription>Environmental super intelligence at the edge</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Edge-native environmental super intelligence running on distributed hardware platforms and nodes.
                  MYCA pushes intelligence as close as possible to real-world signals, maintaining
                  a coherent worldview across all edge nodes while respecting locality and data sovereignty.
                </p>
                <Link href="/myca">
                  <Button variant="outline" size="sm" className="mt-2 min-h-[44px] touch-manipulation">
                    Learn about MYCA
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-500 shrink-0" />
                  <CardTitle className="text-xl">AVANI</CardTitle>
                </div>
                <CardDescription>Live Earth substrate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Continuous environmental and infrastructure context. AVANI ingests, harmonizes,
                  and serves planetary-scale signals — climate, sensor networks, infrastructure
                  telemetry, and remote sensing — so agents always act with awareness.
                </p>
                <Link href="/ai/avani">
                  <Button variant="outline" size="sm" className="mt-2 min-h-[44px] touch-manipulation">
                    Learn about AVANI
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500 shrink-0" />
                  <CardTitle className="text-xl">NLM</CardTitle>
                </div>
                <CardDescription>Nature Learning Model</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  The Nature Learning Model gives the entire system robust reasoning and structured
                  ground-truth-based inference. It operates under partial data,
                  conflicting signals, and noisy environments while surfacing uncertainty.
                </p>
                <Link href="/myca/nlm">
                  <Button variant="outline" size="sm" className="mt-2 min-h-[44px] touch-manipulation">
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
            <Button size="lg" className="min-h-[44px] px-8 touch-manipulation">
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
              <Button size="lg" className="gap-2 min-h-[44px] min-w-[160px] touch-manipulation">
                Request access
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px] min-w-[140px] touch-manipulation">
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
    </div>
  )
}
