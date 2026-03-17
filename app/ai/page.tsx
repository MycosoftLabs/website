/**
 * AI Overview Page — Paired Intelligence System
 * Route: /ai
 * Public entry point for MYCA + AVANI + NLM + NVIDIA stack.
 * Updated: Mar 17, 2026
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
import { ArrowRight, Shield, Sparkles, Brain, Users, Bot, Cpu, Globe, Zap, Server } from "lucide-react"
export const metadata: Metadata = {
  title: "AI | Orchestration, Sensing, and Governed Intelligence | Mycosoft",
  description:
    "Mycosoft pairs MYCA, an orchestration and cognition layer running on edge hardware, with AVANI, a live Earth data and governance system — for grounded AI across tools, data, devices, and real-world systems.",
}

export default function AIOverviewPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Orchestration, Sensing, and Governed Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Mycosoft pairs <strong>MYCA</strong>, an orchestration and cognition layer
            running on edge hardware, with <strong>AVANI</strong>, a live Earth data and
            governance system — to help humans, agents, and frontier models work together
            across tools, data, devices, and real-world systems.
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
                See How AVANI Works
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

      {/* What Mycosoft is */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">What Mycosoft Is</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Most AI products give you a single model and ask you to build the rest yourself.
            Mycosoft takes a different approach.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            We build a paired AI system for real operations: one layer to orchestrate, coordinate,
            and reason — running on purpose-built edge hardware — and another to sense, govern,
            and protect. That makes Mycosoft useful not only for chat, but for research,
            workflows, devices, teams, and AI-native infrastructure.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            The intelligence runs at the edge, close to the data. Not in a distant data center
            disconnected from the real world.
          </p>
        </div>
      </section>

      {/* Meet MYCA and AVANI */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Meet MYCA and AVANI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-500 shrink-0" />
                  <CardTitle className="text-xl">MYCA</CardTitle>
                </div>
                <CardDescription>Orchestration &amp; Cognition Layer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  MYCA is the intelligence that coordinates agents, models, and real-world systems.
                  It maintains a living worldview from continuous sensor data, runs on Mycosoft
                  edge hardware (Mushroom 1, Hyphae 1, SporeBase, Alarm, Myconode), and
                  orchestrates frontier AI models for multimodal interaction, research, and
                  operational execution.
                </p>
                <p className="text-sm font-medium">
                  MYCA is not just a chatbot. It is the orchestration and cognition layer for
                  an entire platform.
                </p>
                <Link href="/myca">
                  <Button variant="outline" size="sm" className="mt-4 min-h-[44px] touch-manipulation">
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
                <CardDescription>Live Earth Data &amp; Planetary Sensing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  AVANI provides real-time environmental data, governance, and stewardship.
                  It runs as its own system adjacent to MYCA — with independent data pipelines,
                  its own constitutional constraints, and the live planetary sensing that keeps
                  intelligence grounded in environmental reality.
                </p>
                <p className="text-sm font-medium">
                  AVANI is not a filter bolted on at the end. It is the foundation that
                  keeps the entire system accountable to reality.
                </p>
                <Link href="/ai/avani">
                  <Button variant="outline" size="sm" className="mt-4 min-h-[44px] touch-manipulation">
                    Learn about AVANI
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <Link href="/myca/nlm">
              <Button variant="ghost" size="sm" className="gap-2 min-h-[44px] touch-manipulation">
                <Brain className="h-4 w-4" />
                Nature Learning Model (NLM) — the ecological intelligence foundation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Hardware + NVIDIA Stack */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            Edge Hardware &amp; NVIDIA-Aligned Stack
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed text-center max-w-2xl mx-auto mb-8">
            Mycosoft intelligence runs on purpose-built edge hardware, powered by an
            NVIDIA-aligned runtime stack for accelerated inference and planetary-scale simulation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Server className="h-6 w-6 mb-2 text-green-500" />
                <CardTitle className="text-lg">Mycosoft Edge Hardware</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  MYCA operates across Mycosoft&apos;s purpose-built hardware systems —
                  not in generic cloud data centers.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Mushroom 1</strong> — Edge compute ground station</li>
                  <li>• <strong>Hyphae 1</strong> — Mesh networking backbone</li>
                  <li>• <strong>SporeBase</strong> — Environmental collection platform</li>
                  <li>• <strong>Alarm</strong> — Monitoring &amp; alert system</li>
                  <li>• <strong>Myconode</strong> — Compact edge sensing node</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="h-6 w-6 mb-2 text-green-500" />
                <CardTitle className="text-lg">NVIDIA Runtime Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Accelerated inference, model orchestration, and planetary-scale
                  environmental modeling.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>NemoClaw</strong> — Runtime orchestration for edge inference</li>
                  <li>• <strong>Nemotron</strong> — Specialized reasoning models</li>
                  <li>• <strong>Earth-2</strong> — Planetary climate simulation</li>
                  <li>• <strong>PersonaPlex</strong> — Identity-aware interaction</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why they were built together */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Why They Were Built Together</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Most AI systems collapse intelligence and authority into one layer. That makes them
            useful for demos, but risky, brittle, and hard to trust in real operations.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Mycosoft separates orchestration from sensing, cognition from governance, action from
            environmental truth. MYCA expands capability. AVANI grounds it in reality and protects
            integrity. Together, they create a system that can move quickly without becoming reckless.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            By running intelligence at the edge — on Mycosoft&apos;s own hardware — the system stays
            connected to the real world instead of being trapped in a centralized cloud.
          </p>
        </div>
      </section>

      {/* For Humans, Agents, Models */}
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
                  Humans use MYCA + AVANI to ask complex questions, coordinate teams and workflows,
                  delegate multi-step tasks, and operate research and infrastructure systems while
                  maintaining visibility and control. Mycosoft makes AI usable without surrendering
                  judgment, accountability, or control.
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
                  Agents use Mycosoft as a coordination and trust layer. MYCA gives them context,
                  memory, and task routing. AVANI gives them environmental data, policy boundaries,
                  and approval logic. Organizations can run many agents without losing coherence,
                  traceability, or control.
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
                  Mycosoft is model-flexible. Claude, GPT, Gemini, Grok, Nemotron, and other models
                  can be used as specialized reasoning engines. MYCA coordinates them; AVANI governs
                  their use. Users are not locked into one vendor&apos;s context window or policy model.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why companies choose */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Why Companies Choose Mycosoft</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Companies choose Mycosoft when they need more than a chatbot. They need AI that can
            operate across teams, workflows, tools, data, and devices — grounded in real-world
            environmental data and governed by constitutional constraints.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>More than a model: orchestration, memory, tools, devices, workflows, governance</li>
            <li>Edge intelligence: hardware-integrated compute, not cloud-only dependence</li>
            <li>Environmental grounding: real data, real systems, real state via AVANI</li>
            <li>Constitutional governance: approvals, audit trails, safety, reversibility</li>
            <li>NVIDIA-aligned stack: NemoClaw, Nemotron, Earth-2 for accelerated inference</li>
            <li>Model flexibility: not locked into one vendor — Claude, GPT, Gemini, Grok, and more</li>
            <li>Human + agent usability: designed for both people and autonomous systems</li>
          </ul>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            If you want AI that can actually operate in the real world — across people, agents,
            tools, data, and devices — Mycosoft gives you the missing operating layer.
          </p>
        </div>
      </section>

      {/* Value / Cost */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
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

      {/* Trust, safety, stewardship */}
      <section className="py-16 md:py-20 border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Trust, Safety, and Stewardship</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            AVANI provides constitutional constraints, ecological awareness, human-centered stewardship,
            and multi-stakeholder governance. The system is designed for real organizations where
            accountability, auditability, and reversibility matter. Mycosoft does not ship governance
            as an afterthought — it is built into the architecture from the start, enforced by a
            system that runs independently from the intelligence it governs.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
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
            <AccordionItem value="myca-avani">
              <AccordionTrigger className="text-base text-left">What is the difference between MYCA and AVANI?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                MYCA is the orchestration and cognition layer — it coordinates agents, models, and
                hardware systems, maintaining a living worldview from continuous sensor data.
                AVANI is the live Earth data and governance layer — it provides real-time environmental
                signals, constitutional constraints, and stewardship. MYCA acts; AVANI senses and
                governs. They are complementary halves of a unified system.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="edge">
              <AccordionTrigger className="text-base text-left">Where does the intelligence run?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                MYCA runs on Mycosoft&apos;s purpose-built edge hardware — Mushroom 1, Hyphae 1,
                SporeBase, Alarm, and Myconode. The intelligence operates at the edge, close
                to the sensors and data, rather than in centralized cloud data centers. This reduces
                latency, keeps sensitive data local, and ensures the system stays connected to
                environmental reality.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nvidia">
              <AccordionTrigger className="text-base text-left">What is the NVIDIA stack integration?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Mycosoft leverages an NVIDIA-aligned runtime stack including NemoClaw for inference
                orchestration, Nemotron for specialized reasoning models, Earth-2 for planetary-scale
                climate simulation, and PersonaPlex for identity-aware interaction. This accelerates
                AI inference at the edge and enables environmental modeling at global scale.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="models">
              <AccordionTrigger className="text-base text-left">Can Mycosoft work with other frontier models?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. Mycosoft is model-flexible. Claude, GPT, Gemini, Grok, Nemotron, and other
                models can be used as specialized reasoning engines. MYCA coordinates them; AVANI
                governs their use. You are not locked into one vendor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="agents">
              <AccordionTrigger className="text-base text-left">Is this only for humans, or can agents use it too?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Both. Mycosoft is built for AI-native operations. Agents use MYCA for context, memory,
                and task routing, and AVANI for environmental data, policy, and approval logic.
                Humans and agents can collaborate through the same operating layer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="single-model">
              <AccordionTrigger className="text-base text-left">How is Mycosoft different from a single-model AI product?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Single-model products collapse intelligence and governance into one layer. Mycosoft
                separates them: MYCA for orchestration and cognition, AVANI for sensing and governance.
                You get agentic coordination, edge hardware, environmental grounding, memory, tools,
                devices, and constitutional governance — not just a chat interface.
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
