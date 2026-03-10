/**
 * AI Overview Page — Paired Intelligence System
 * Route: /ai
 * Public entry point for MYCA + AVANI + NLM.
 * Per CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md
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
import { ArrowRight, Shield, Sparkles, Brain, Users, Bot, Cpu } from "lucide-react"
export const metadata: Metadata = {
  title: "AI | Grounded Intelligence for Humans, Agents, and Real-World Operations",
  description:
    "Mycosoft pairs MYCA, an active operating intelligence, with AVANI, a stewardship layer, for grounded AI across tools, data, devices, and real-world systems.",
}

export default function AIOverviewPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Grounded AI for Humans, Agents, and Real-World Operations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Mycosoft pairs <strong>MYCA</strong>, an active operating intelligence, with{" "}
            <strong>AVANI</strong>, a stewardship and governance layer, to help humans, agents,
            and frontier models work together across tools, data, devices, and real-world systems.
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
            We build a paired AI system for real operations: one layer to think, coordinate, and
            execute, and another to ground, govern, and protect. That makes Mycosoft useful not
            only for chat, but for research, workflows, devices, teams, and AI-native infrastructure.
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
                <CardDescription>Active operating intelligence</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  MYCA helps users and systems understand requests, coordinate tools, work across
                  context, and turn questions into action. Built for multimodal interaction, agent
                  orchestration, research support, simulation workflows, and operational execution.
                </p>
                <p className="text-sm font-medium">
                  MYCA is not just a chatbot. It is an operating intelligence layer.
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
                  <Shield className="h-5 w-5 text-amber-500 shrink-0" />
                  <CardTitle className="text-xl">AVANI</CardTitle>
                </div>
                <CardDescription>Stewardship and governance layer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  AVANI provides grounding, policy, approvals, auditability, and risk-aware control.
                  She exists so powerful AI can be deployed in the real world without losing
                  accountability, safety, or human trust.
                </p>
                <p className="text-sm font-medium">
                  AVANI is not a filter bolted on at the end. She is part of how the system
                  thinks safely in the first place.
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

      {/* Why they were built together */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Why They Were Built Together</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Most AI systems collapse intelligence and authority into one layer. That makes them
            useful for demos, but risky, brittle, and hard to trust in real operations.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Mycosoft separates reasoning from governance, capability from restraint, action from
            authorization, intelligence from stewardship. MYCA expands capability. AVANI protects
            integrity. Together, they create a system that can move quickly without becoming reckless.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Mycosoft was built on the belief that real AI systems should not be trapped in a
            single-model, single-vendor wall. They should operate as grounded, governed ecosystems.
          </p>
        </div>
      </section>

      {/* For Humans, Agents, Models */}
      <section className="py-16 md:py-20 border-b">
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
                  memory, and task routing. AVANI gives them boundaries, policy, and approval logic.
                  Organizations can run many agents without losing coherence, traceability, or control.
                  Mycosoft is built for AI-native operations, not just AI-assisted user interfaces.
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
                  Mycosoft is model-flexible. Claude, GPT, Gemini, Grok, and other models can be
                  used as specialized reasoning engines. MYCA coordinates them; AVANI governs their
                  use. Users are not trapped in one vendor&apos;s context window or policy model.
                  Mycosoft does not ask you to bet your future on one model.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why companies choose */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Why Companies Choose Mycosoft</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
            Companies choose Mycosoft when they need more than a chatbot. They need AI that can
            operate across teams, workflows, tools, data, and devices — and still remain explainable,
            auditable, and governable.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>More than a model: orchestration, memory, tools, devices, workflows, governance</li>
            <li>Grounding: real data, real systems, real state</li>
            <li>Governance: approvals, audit trails, safety, reversibility, accountability</li>
            <li>Model flexibility: not locked into one vendor</li>
            <li>Human + agent usability: designed for both people and autonomous systems</li>
            <li>Trustworthy deployment: safer for real organizations than raw model access alone</li>
          </ul>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            If you want AI that can actually operate in the real world — across people, agents,
            tools, data, and devices — Mycosoft gives you the missing operating layer.
          </p>
        </div>
      </section>

      {/* Value / Cost — no pricing, Talk to us */}
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

      {/* Trust, safety, stewardship */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Trust, Safety, and Stewardship</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            AVANI provides constitutional constraints, ecological awareness, human-centered stewardship,
            and multi-stakeholder governance. The system is designed for real organizations where
            accountability, auditability, and reversibility matter. Mycosoft does not ship governance
            as an afterthought — it is built into the architecture from the start.
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
                MYCA is the active intelligence layer that thinks, coordinates, and executes. AVANI
                is the stewardship layer that grounds, governs, approves, and protects. MYCA expands
                capability; AVANI protects integrity. They work together so the system can move
                quickly without becoming reckless.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="models">
              <AccordionTrigger className="text-base text-left">Can Mycosoft work with other frontier models?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. Mycosoft is model-flexible. Claude, GPT, Gemini, Grok, and other models can be
                used as specialized reasoning engines. MYCA coordinates them; AVANI governs their use.
                You are not locked into one vendor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="agents">
              <AccordionTrigger className="text-base text-left">Is this only for humans, or can agents use it too?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Both. Mycosoft is built for AI-native operations. Agents use MYCA for context, memory,
                and task routing, and AVANI for policy and approval logic. Humans and agents can
                collaborate through the same operating layer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="single-model">
              <AccordionTrigger className="text-base text-left">How is Mycosoft different from a single-model AI product?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Single-model products collapse intelligence and governance into one layer. Mycosoft
                separates them: MYCA for capability and action, AVANI for grounding and restraint.
                You get orchestration, memory, tools, devices, and governance — not just a chat interface.
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
