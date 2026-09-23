"use client"

/**
 * SI landing content — layered superintelligence ecosystem.
 * Route: /si
 */

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowRight,
  Bot,
  Cpu,
  Shield,
  Users,
  Database,
  LayoutDashboard,
} from "lucide-react"
import { ProductIcon } from "@/components/brand/product-icon"
import { FadeIn, Stagger, StaggerItem } from "@/components/si/si-motion"
import { LayeredEcosystemDiagram } from "@/components/si/layered-ecosystem-diagram"
import { ConnectionFlowDiagram } from "@/components/si/connection-flow-diagram"
import { PlatformArchitectureDiagram } from "@/components/si/platform-architecture-diagram"
import { NovelSolutionsGrid } from "@/components/si/novel-solutions-grid"

const STACK_PRODUCTS = [
  {
    title: "MYCA",
    href: "/myca",
    label: "Stochastic SI",
    description: "Agentic operating intelligence",
    body: "Mycosoft's multi-agent system (MAS)—custom-built over the last three years—with an orchestrator that coordinates agents, memory, task routing, and conversational control (including PersonaPlex voice). Edge-native environmental superintelligence that keeps work close to real-world signals while respecting locality.",
    icon: "myca" as const,
    cardClass: "ai-stack-card ai-stack-card-myca border-white/30 bg-black/60 text-white",
    descClass: "text-white/75",
    bodyClass: "text-white/78",
  },
  {
    title: "AVANI",
    href: "/ai/avani",
    label: "Deterministic SI",
    description: "Live Earth substrate",
    body: "Continuous environmental and infrastructure context. AVANI ingests, harmonizes, and serves planetary-scale signals — climate, sensor networks, device telemetry, remote sensing, and MINDEX-backed worldview — so MYCA and other agents always act with shared, governed awareness.",
    icon: "avani" as const,
    cardClass:
      "ai-stack-card ai-stack-card-avani border-rose-300/45 bg-rose-50/35 dark:bg-rose-950/20",
    descClass: "text-rose-950/70 dark:text-rose-50/75",
    bodyClass: "text-rose-950/78 dark:text-rose-50/78",
  },
  {
    title: "NLM",
    href: "/myca/nlm",
    label: "Models",
    description: "Nature Learning Model",
    body: "Robust, structured inference grounded in nature and multi-modal evidence. NLM connects signals across time and modality, explains what is happening and what might follow, and surfaces uncertainty instead of hiding it — the reasoning backbone of the stack.",
    icon: "nlm" as const,
    cardClass: "ai-stack-card ai-stack-card-nlm border-emerald-500/35 bg-emerald-500/10",
    descClass: "text-emerald-950/70 dark:text-emerald-50/75",
    bodyClass: "text-emerald-950/78 dark:text-emerald-50/78",
  },
  {
    title: "FormSpace",
    href: "/ai/formspace",
    label: "Map",
    description: "Environmental Platonic Map",
    body: "A spatial-semantic layer for environmental structure. FormSpace gives agents and humans a navigable map of relationships in the living world — complementary to AVANI’s live feeds and MINDEX’s species knowledge.",
    icon: "formspace" as const,
    cardClass:
      "ai-stack-card border-sky-300/40 bg-sky-500/10 dark:bg-sky-950/30",
    descClass: "text-sky-950/70 dark:text-sky-50/75",
    bodyClass: "text-sky-950/78 dark:text-sky-50/78",
  },
  {
    title: "MINDEX",
    href: "/mindex",
    label: "Memory",
    description: "Living-world database",
    body: "The all-species living-world store that backs search, science tools, and agent context. MINDEX is where taxonomy, compounds, and curated knowledge live so SI layers share one factual substrate — not ad-hoc scrapes.",
    icon: "mindex" as const,
    cardClass:
      "ai-stack-card border-amber-300/40 bg-amber-500/10 dark:bg-amber-950/25",
    descClass: "text-amber-950/70 dark:text-amber-50/75",
    bodyClass: "text-amber-950/78 dark:text-amber-50/78",
  },
  {
    title: "NatureOS",
    href: "/natureos",
    label: "Interface",
    description: "Apps, tools, and consoles",
    body: "The human- and agent-facing operating surface: dashboards, scientific apps, simulators, and device tools. NatureOS is how organizations actually run day-to-day work on top of MYCA, AVANI, NLM, FormSpace, and MINDEX.",
    icon: "natureos" as const,
    cardClass:
      "ai-stack-card border-teal-300/40 bg-teal-500/10 dark:bg-teal-950/25",
    descClass: "text-teal-950/70 dark:text-teal-50/75",
    bodyClass: "text-teal-950/78 dark:text-teal-50/78",
  },
]

function StackIcon({ icon }: { icon: (typeof STACK_PRODUCTS)[number]["icon"] }) {
  if (icon === "avani") {
    return <Shield className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" />
  }
  if (icon === "mindex") {
    return <Database className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
  }
  return (
    <ProductIcon product={icon} variant="current" className="h-8 w-8 shrink-0" title={icon} />
  )
}

export function SIPageContent() {
  return (
    <div className="ai-glass-page min-h-dvh">
      {/* Hero */}
      <section className="relative flex min-h-[58vh] items-center overflow-hidden border-b bg-slate-950 py-14 md:min-h-[68vh] md:py-20">
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
        <div className="container relative z-10 mx-auto max-w-4xl px-4 text-center md:px-6">
          <FadeIn>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-white/70">
              Mycosoft Super Intelligence
            </p>
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] sm:text-4xl md:text-5xl">
              A Layered Superintelligence Ecosystem
            </h1>
            <p className="mx-auto mb-4 max-w-3xl text-base text-white/86 drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)] sm:text-lg">
              Not a single monolith. Mycosoft SI is a stack of cooperating layers:{" "}
              <strong className="font-semibold text-white">MYCA</strong> for operating agents,{" "}
              <strong className="font-semibold text-white">AVANI</strong> for live Earth context and
              governance, <strong className="font-semibold text-white">NLM</strong> for nature-grounded
              reasoning, <strong className="font-semibold text-white">FormSpace</strong> for
              environmental structure, <strong className="font-semibold text-white">MINDEX</strong> for
              living-world memory, and <strong className="font-semibold text-white">NatureOS</strong>{" "}
              for the interfaces people and agents use every day — powered by nature and computers.
            </p>
            <p className="mx-auto mb-8 max-w-2xl text-sm text-white/70 sm:text-base">
              Planet-scale sensing, edge-native agents, robust reasoning, and human-readable
              explanations — designed so each layer is independently valuable and purpose-built to
              amplify the others.
            </p>
          </FadeIn>
          <Stagger className="flex flex-col flex-wrap justify-center gap-3 sm:flex-row sm:gap-4">
            <StaggerItem>
              <Link href="/myca">
                <Button
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 px-6 touch-manipulation"
                >
                  Explore MYCA
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/ai/avani">
                <Button
                  variant="outline"
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 px-6 touch-manipulation"
                >
                  See AVANI
                </Button>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/myca/nlm">
                <Button
                  variant="outline"
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 px-6 touch-manipulation"
                >
                  <ProductIcon product="nlm" variant="current" className="h-4 w-4" />
                  NLM
                </Button>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/ai/formspace">
                <Button
                  variant="outline"
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 px-6 touch-manipulation"
                >
                  <ProductIcon product="formspace" variant="current" className="h-4 w-4" />
                  FormSpace
                </Button>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/contact">
                <Button
                  variant="secondary"
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 px-6 touch-manipulation"
                >
                  Talk to Mycosoft
                </Button>
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Layered ecosystem diagram */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">
              The Layered Superintelligence Ecosystem
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg">
              Six cooperating surfaces — from edge operating intelligence down to the apps
              organizations already open. Tap any layer for the product page.
            </p>
          </FadeIn>
          <LayeredEcosystemDiagram />
        </div>
      </section>

      {/* Product stack cards */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <FadeIn className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">The Stack, Product by Product</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Real Mycosoft products — linked to live routes on this site. No stand-in metrics; each
              card describes what that layer actually does.
            </p>
          </FadeIn>
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {STACK_PRODUCTS.map((product) => (
              <StaggerItem key={product.title}>
                <article
                  className={`flex h-full flex-col rounded-2xl border p-5 backdrop-blur-xl ${product.cardClass}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <StackIcon icon={product.icon} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold tracking-tight">{product.title}</h3>
                        <span className="ai-stack-label">{product.label}</span>
                      </div>
                      <p className={`text-sm ${product.descClass}`}>{product.description}</p>
                    </div>
                  </div>
                  <p className={`mb-4 flex-1 text-sm leading-relaxed ${product.bodyClass}`}>
                    {product.body}
                  </p>
                  <Link href={product.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ai-glass-button min-h-[44px] touch-manipulation"
                    >
                      Learn about {product.title}
                    </Button>
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Novel solutions */}
      <section className="border-b bg-muted/20 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Novel Solutions in This Stack</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg">
              What makes Mycosoft SI different is architecture: paired intelligence, nature-trained
              reasoning, an environmental map, and a living-world memory — not a single chat box.
            </p>
          </FadeIn>
          <NovelSolutionsGrid />
        </div>
      </section>

      {/* Platform */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          <FadeIn>
            <div className="mb-6 flex items-center gap-3">
              <Cpu className="h-6 w-6 shrink-0 text-green-500" />
              <h2 className="text-2xl font-bold md:text-3xl">Our Platform</h2>
            </div>
            <p className="mb-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Under MYCA, AVANI, and NLM we build on the NVIDIA platform: Nemotron foundation models,
              a built-from-the-ground-up orchestration system, Earth-2-style environmental simulation,
              and PersonaPlex for full-duplex voice-to-voice control. That stack lets domain-specific
              agents run on Blackwell-generation edge GPUs while keeping data close to the field.
            </p>
            <p className="mb-8 text-base leading-relaxed text-muted-foreground md:text-lg">
              Public materials emphasize what the system does — sensing, agents, reasoning, and
              explanations — without exposing proprietary implementation detail. The diagram below
              shows how interfaces, orchestration, models, and compute sit relative to each other.
            </p>
          </FadeIn>
          <PlatformArchitectureDiagram />
        </div>
      </section>

      {/* How they work together */}
      <section className="border-b bg-muted/20 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn className="mb-8">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">How They Work Together</h2>
            <p className="mb-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              MYCA and AVANI form a yin-yang pair: MYCA is the structured, goal-seeking &quot;hand&quot;
              (plans, agents, actuation); AVANI is the live Earth &quot;palm&quot; (flows, signals,
              fields, policy). NLM is the reasoning backbone between them — turning signals into
              structured inferences. FormSpace maps environmental structure; MINDEX remembers species
              and living-world facts; NatureOS is where humans and agents operate.
            </p>
            <p className="mb-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Together they close the loop across sensing, prediction, decision, and actuation. Each
              layer can stand alone for its job, but the stack is designed so accountability stays
              intact: MYCA expands capability, AVANI grounds and governs, NLM keeps reasoning honest
              under uncertainty.
            </p>
            <p className="mb-8 text-base leading-relaxed text-muted-foreground md:text-lg">
              Edge hardware and devices feed the loop; scientific and defense apps in NatureOS
              consume it. Follow the links in the diagram to the real product routes.
            </p>
          </FadeIn>
          <ConnectionFlowDiagram />
        </div>
      </section>

      {/* Multiple participants */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Built for Multiple Participants</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              The same SI stack serves humans, agent fleets, and frontier models — with shared
              worldview and governance instead of siloed tools.
            </p>
          </FadeIn>
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            <StaggerItem>
              <article className="h-full rounded-3xl border border-white/25 bg-white/5 p-5 backdrop-blur-xl md:p-6">
                <Users className="mb-3 h-6 w-6 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">For Humans</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ask questions that reach into the living world: live events and locations, species
                  detail via MINDEX, correlation between environmental events and local biomass or
                  natural signaling. Work through NatureOS apps and MYCA conversation — with AVANI
                  keeping context continuous and legible.
                </p>
              </article>
            </StaggerItem>
            <StaggerItem>
              <article className="h-full rounded-3xl border border-white/25 bg-white/5 p-5 backdrop-blur-xl md:p-6">
                <Bot className="mb-3 h-6 w-6 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">For Agents</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Agents use Mycosoft as live worldview coordination plus nature learning. MYCA
                  supplies context, memory, and task routing; AVANI supplies boundaries, policy, and
                  approval logic; NLM supplies structured, ground-truth-oriented inference agents can
                  act on without inventing facts.
                </p>
              </article>
            </StaggerItem>
            <StaggerItem>
              <article className="h-full rounded-3xl border border-white/25 bg-white/5 p-5 backdrop-blur-xl md:p-6">
                <Cpu className="mb-3 h-6 w-6 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">For Frontier Models</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Mycosoft is model-flexible. Multiple frontier models can specialize as reasoning
                  engines. MYCA coordinates them; AVANI governs their use; NLM structures outputs
                  against living-world evidence. You are not locked to one vendor.
                </p>
              </article>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Cost / govern */}
      <section className="border-b bg-muted/20 py-16 md:py-20">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          <FadeIn>
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">
              Cost Less. Do More. Govern Better.
            </h2>
            <p className="mb-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Fragmented superintelligence is expensive in hidden ways: disconnected tools, duplicated
              orchestration, context loss between teams and agents, and oversight bolted on after the
              fact. Mycosoft reduces that surface by putting governance (AVANI), operating agents
              (MYCA), nature reasoning (NLM), memory (MINDEX), structure (FormSpace), and interfaces
              (NatureOS) in one coherent stack.
            </p>
            <ul className="mb-6 space-y-3 text-base text-muted-foreground md:text-lg">
              <li className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 backdrop-blur-md">
                <strong className="text-foreground dark:text-white">Cost less</strong> — fewer
                parallel stacks and less manual glue between sensing, models, and ops consoles.
              </li>
              <li className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 backdrop-blur-md">
                <strong className="text-foreground dark:text-white">Do more</strong> — humans, agents,
                and models share the same Earth-grounded picture instead of re-deriving it per app.
              </li>
              <li className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 backdrop-blur-md">
                <strong className="text-foreground dark:text-white">Govern better</strong> — policy,
                sovereignty, and uncertainty are first-class (AVANI + NLM), not an afterthought
                dashboard.
              </li>
            </ul>
            <p className="mb-8 text-base leading-relaxed text-muted-foreground md:text-lg">
              Deployment-based pricing. Human seats, agent seats, and infrastructure tiers — talk to
              us for access; we do not publish invented list prices here.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/contact">
                <Button size="lg" className="ai-glass-button min-h-[44px] px-8 touch-manipulation">
                  Talk to us
                </Button>
              </Link>
              <Link href="/natureos">
                <Button
                  variant="outline"
                  size="lg"
                  className="ai-glass-button min-h-[44px] gap-2 px-6 touch-manipulation"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Open NatureOS
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Explore links */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Explore the SI Stack</h2>
            <p className="text-muted-foreground">Direct routes to every public SI surface on this site.</p>
          </FadeIn>
          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/myca", title: "MYCA", desc: "Operating intelligence" },
              { href: "/ai/avani", title: "AVANI", desc: "Live Earth substrate" },
              { href: "/myca/nlm", title: "NLM", desc: "Nature Learning Model" },
              { href: "/ai/formspace", title: "FormSpace", desc: "Environmental map" },
              { href: "/mindex", title: "MINDEX", desc: "Living-world database" },
              { href: "/natureos", title: "NatureOS", desc: "Apps & consoles" },
            ].map((item) => (
              <StaggerItem key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-white/25 bg-white/5 px-4 py-3 backdrop-blur-xl transition hover:border-white/45 touch-manipulation"
                >
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">{item.desc}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b py-16 md:py-20">
        <div className="container mx-auto max-w-4xl px-4 text-center md:px-6">
          <FadeIn>
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">Request Access</h2>
            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground md:text-lg">
              Deploy with Mycosoft. Human seats, agent seats, and infrastructure tiers — we will
              scope the right layers for your organization.
            </p>
            <div className="flex flex-col flex-wrap justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[160px] gap-2 touch-manipulation"
                >
                  Request access
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="ai-glass-button min-h-[44px] min-w-[140px] gap-2 touch-manipulation"
                >
                  Talk to us
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <FadeIn>
            <h2 className="mb-8 text-2xl font-bold md:text-3xl">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="stack">
                <AccordionTrigger className="text-left text-base">
                  What are the layers of Mycosoft&apos;s superintelligence stack?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Core intelligence layers: MYCA (operating / environmental SI at the edge), AVANI
                  (live Earth substrate and governance), and NLM (Nature Learning Model). Supporting
                  layers on this site include FormSpace (environmental map), MINDEX (living-world
                  database), and NatureOS (apps and consoles). We build on the NVIDIA platform —
                  Nemotron models, custom orchestration, and Blackwell-generation edge GPUs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="myca-avani">
                <AccordionTrigger className="text-left text-base">
                  What is the relationship between MYCA and AVANI?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  MYCA and AVANI form a yin-yang pair. MYCA focuses on form — goals, plans, and
                  agents. AVANI focuses on flows — data, signals, and fields — plus governance over
                  how that live Earth picture is used. Together they close the loop across sensing,
                  prediction, decision, and actuation.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="nlm">
                <AccordionTrigger className="text-left text-base">What does NLM do?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The Nature Learning Model gives the stack robust, structured, ground-truth-oriented
                  inference. It connects evidence across time and modality, explains not only what is
                  happening but why and what might follow — while surfacing its own uncertainty.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="formspace-mindex">
                <AccordionTrigger className="text-left text-base">
                  Where do FormSpace and MINDEX fit?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  FormSpace provides an Environmental Platonic Map — structured environmental
                  relationships agents and humans can navigate. MINDEX is the living-world species and
                  knowledge store. Both feed NatureOS apps and MYCA/AVANI context so the SI stack
                  shares one factual and spatial substrate.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="nvidia">
                <AccordionTrigger className="text-left text-base">
                  What platform do you build on?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The NVIDIA platform: Nemotron foundation models, ground-up orchestration,
                  Earth-2-style environmental simulation, and PersonaPlex for full-duplex voice —
                  running on Blackwell-generation edge GPUs across Mycosoft hardware platforms.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="models">
                <AccordionTrigger className="text-left text-base">
                  Can Mycosoft work with other frontier models?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. Mycosoft is model-flexible. Multiple frontier models can act as specialized
                  reasoning engines. MYCA coordinates them; AVANI governs their use. You are not
                  locked into one vendor.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pricing">
                <AccordionTrigger className="text-left text-base">How does pricing work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Deployment-based pricing. Human seats, agent seats, and infrastructure tiers —
                  contact Mycosoft for access. We do not invent published price figures on this page.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </FadeIn>
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

        .ai-glass-page .ai-stack-card-myca { --ai-card-light-speed: 7.6s; }
        .ai-glass-page .ai-stack-card-avani { --ai-card-light-speed: 10.4s; }
        .ai-glass-page .ai-stack-card-nlm { --ai-card-light-speed: 12.8s; }

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
          0% { --ai-card-light-angle: 0deg; }
          100% { --ai-card-light-angle: 360deg; }
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
