"use client"

/**
 * NatureOS — public marketing gateway for Mycosoft's nature operating system.
 * Standalone product copy: science, sensing, simulation, and environmental
 * intelligence. Real in-app routes only. No mock metrics.
 *
 * Hero media (swap later):
 *   MP4   — /assets/homepage/tiles/earth-simulator-tile-1080-2026.mp4
 *   Poster — /assets/homepage/tiles/earth-simulator-tile-1080-2026-poster.jpg
 *   Env    — NEXT_PUBLIC_NATUREOS_HERO_MP4 / NEXT_PUBLIC_NATUREOS_HERO_POSTER
 */

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Binary,
  Boxes,
  Braces,
  Brain,
  Cloud,
  Code,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  Layers,
  Leaf,
  Microscope,
  Network,
  Pipette,
  Server,
  Settings,
  Terminal,
  TreeDeciduous,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import {
  NATUREOS_GLASS_CYCLE_FRAMES,
  ProductGlassIconCycle,
} from "@/components/brand/product-glass-icon-cycle"
import { ProductIcon } from "@/components/brand/product-icon"
import { deviceHeroVideoSources } from "@/lib/asset-video-sources"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"

// ---------------------------------------------------------------------------
// Hero — NAS / AutoplayVideo / lp-media-band contract.
// Morgan can replace the hero clip later; paths are centralized here.
// ---------------------------------------------------------------------------
const NATUREOS_HERO_MP4 =
  "/assets/homepage/tiles/earth-simulator-tile-1080-2026.mp4"
const NATUREOS_HERO_POSTER =
  process.env.NEXT_PUBLIC_NATUREOS_HERO_POSTER?.trim() ||
  "/assets/homepage/tiles/earth-simulator-tile-1080-2026-poster.jpg"
const natureosHeroSources = deviceHeroVideoSources(NATUREOS_HERO_MP4, {
  envUrl: process.env.NEXT_PUBLIC_NATUREOS_HERO_MP4,
  aliases: [
    "/assets/homepage/tiles/earth-simulator-tile-2026.mp4",
    "/assets/earth-simulator/earth-simulator-defense-preview.mp4",
  ],
})

const EARTH_SIM_BAND_MP4 = "/assets/fusarium/earth simulator background.mp4"
const EARTH_SIM_BAND_POSTER =
  process.env.NEXT_PUBLIC_NATUREOS_EARTHSIM_POSTER?.trim() ||
  "/assets/fusarium/earth simulator background-poster.jpg"
const earthSimBandSources = deviceHeroVideoSources(EARTH_SIM_BAND_MP4, {
  envUrl: process.env.NEXT_PUBLIC_NATUREOS_EARTHSIM_MP4,
})

interface FeatureCard {
  name: string
  tagline: string
  description: string
  href: string
  icon: LucideIcon
  product?: "earth-simulator" | "nlm" | "natureos" | "mycobrain"
}

const corePlatform: FeatureCard[] = [
  {
    name: "Nature Statistics",
    tagline: "Living environmental baselines",
    description:
      "Aggregate observations across devices, sensors, and MINDEX so researchers can read nature as continuous, queryable context — not one-off snapshots.",
    href: "/natureos/nature-statistics",
    icon: Leaf,
  },
  {
    name: "Fungi Compute",
    tagline: "Mycelial neural networks & bio-compute",
    description:
      "Explore fungal and bio-inspired compute surfaces for modeling growth, signal pathways, and experimental workloads inside NatureOS.",
    href: "/natureos/fungi-compute",
    icon: Brain,
  },
  {
    name: "Earth Simulator",
    tagline: "The spatial and temporal world model",
    description:
      "Live planetary intelligence: globe, environmental layers, device positions, historical playback, and forecast context fed by MINDEX and field systems.",
    href: "/natureos/earth-simulator",
    icon: Globe,
    product: "earth-simulator",
  },
  {
    name: "Virtual Petri Dish",
    tagline: "Virtual culture growth simulation",
    description:
      "Simulate culture growth and lab scenarios in a virtual dish — a scientific twin of wet-lab workflows inside NatureOS.",
    href: "/natureos/virtual-petri-dish",
    icon: Pipette,
  },
  {
    name: "Nature Learning Model",
    tagline: "Intelligence grounded in the physical world",
    description:
      "NLM learns from wavelengths, waveforms, voltages, gases, heat, and biological response — estimating state, anomaly, confidence, and evidence.",
    href: "/myca/nlm",
    icon: Brain,
    product: "nlm",
  },
  {
    name: "DirtNet",
    tagline: "Device network, MDP & Mycorrhizae",
    description:
      "The Mycosoft device network: sensor modules and field hardware across the devices portal, MycoBrain edge nodes, Mycosoft Device Protocol (MDP) transport, and the Mycorrhizae protocol for mesh-native environmental messaging.",
    href: "/dirtnet",
    icon: Network,
    product: "mycobrain",
  },
]

const scienceLabTools: FeatureCard[] = [
  {
    name: "Biology Simulator",
    tagline: "3D fungal growth modeling",
    description: "Mushroom / biology simulation for growth and morphology experiments.",
    href: PUBLIC_TOOL_HREFS.mushroomSim,
    icon: Microscope,
  },
  {
    name: "Compound Analyser",
    tagline: "Chemical compound analysis",
    description: "Analyze compound structures and properties inside NatureOS tooling.",
    href: PUBLIC_TOOL_HREFS.compoundSim,
    icon: FlaskConical,
  },
  {
    name: "Ancestry Database",
    tagline: "Fungal genealogy & genomics",
    description: "Explore taxonomy, phylogeny, and species records linked to MINDEX.",
    href: "/natureos/ancestry",
    icon: TreeDeciduous,
  },
  {
    name: "Growth Analytics",
    tagline: "Performance metrics & insights",
    description: "Track growth experiments and lab performance with real dashboards.",
    href: PUBLIC_TOOL_HREFS.growthAnalytics,
    icon: BarChart3,
  },
  {
    name: "Physics Simulator",
    tagline: "Physical process modeling",
    description: "Lab physics simulation tools for scientific workflows.",
    href: PUBLIC_TOOL_HREFS.physicsSim,
    icon: Layers,
  },
  {
    name: "Digital Twin",
    tagline: "System twin experiments",
    description: "Digital-twin tooling for organisms, devices, and lab systems.",
    href: PUBLIC_TOOL_HREFS.digitalTwin,
    icon: Network,
  },
  {
    name: "Lifecycle Simulator",
    tagline: "Lifecycle scenario runs",
    description: "Model organism and culture lifecycles under controlled parameters.",
    href: PUBLIC_TOOL_HREFS.lifecycleSim,
    icon: Leaf,
  },
  {
    name: "Aerosol / Spore Tracker",
    tagline: "Bioaerosol & dispersal mapping",
    description: "Track aerosol and spore distribution with sensing and field workflows.",
    href: PUBLIC_TOOL_HREFS.sporeTracker,
    icon: Globe,
  },
  {
    name: "Genetic Circuit Designer",
    tagline: "Gene regulatory networks",
    description: "Gene circuit and metabolic pathway modeling inside NatureOS tools.",
    href: PUBLIC_TOOL_HREFS.geneticCircuit,
    icon: Cpu,
  },
  {
    name: "Symbiosis Mapper",
    tagline: "Inter-species relationships",
    description: "Map symbiotic and ecosystem relationships across species.",
    href: PUBLIC_TOOL_HREFS.symbiosis,
    icon: Network,
  },
  {
    name: "Retrosynthesis Viewer",
    tagline: "Biosynthetic pathway analysis",
    description: "Enzyme and pathway mapping for compound production planning.",
    href: PUBLIC_TOOL_HREFS.retrosynthesis,
    icon: FlaskConical,
  },
  {
    name: "Alchemy Lab",
    tagline: "Virtual compound design",
    description: "Compound design sandbox with property prediction tooling.",
    href: PUBLIC_TOOL_HREFS.alchemyLab,
    icon: FlaskConical,
  },
  {
    name: "Lab Tools",
    tagline: "Samples & registration",
    description: "Operational lab tooling for samples and experiment registration.",
    href: "/natureos/lab-tools",
    icon: FlaskConical,
  },
  {
    name: "Tools Hub",
    tagline: "All science tool categories",
    description: "Full catalog of NatureOS science and lab tools in one place.",
    href: "/natureos/tools",
    icon: Wrench,
  },
]

const infraDevTools: Array<{
  name: string
  description: string
  href: string
  icon: LucideIcon
}> = [
  {
    name: "API Gateway",
    description: "NatureOS API surface for apps, devices, and integrations.",
    href: "/natureos/api",
    icon: Code,
  },
  {
    name: "SDK",
    description: "Developer SDK for building on NatureOS services.",
    href: "/natureos/sdk",
    icon: Braces,
  },
  {
    name: "Functions",
    description: "Serverless / function workbench for NatureOS workloads.",
    href: "/natureos/functions",
    icon: Binary,
  },
  {
    name: "Cloud Shell",
    description: "In-browser shell for infrastructure and operator tasks.",
    href: "/natureos/shell",
    icon: Terminal,
  },
  {
    name: "Workflow Builder",
    description: "Visual automation builder for environmental monitoring workflows.",
    href: "/natureos/workflows",
    icon: Layers,
  },
  {
    name: "Containers",
    description: "Container management panel for NatureOS services.",
    href: "/natureos/containers",
    icon: Boxes,
  },
  {
    name: "Cloud",
    description: "Cloud resources and service configuration.",
    href: "/natureos/cloud",
    icon: Cloud,
  },
  {
    name: "Storage",
    description: "Blob and dataset storage for experiments and evidence.",
    href: "/natureos/storage",
    icon: Server,
  },
  {
    name: "Monitoring",
    description: "Service health and monitoring for NatureOS infrastructure.",
    href: "/natureos/monitoring",
    icon: BarChart3,
  },
  {
    name: "Device Network",
    description: "Fleet, telemetry, and registry for Mycosoft devices.",
    href: "/natureos/devices",
    icon: Network,
  },
  {
    name: "MINDEX",
    description: "Evidence and knowledge index feeding search and Earth Simulator.",
    href: "/natureos/mindex",
    icon: Database,
  },
  {
    name: "NLM Training",
    description: "Nature Learning Model training dashboard.",
    href: "/natureos/model-training",
    icon: Cpu,
  },
  {
    name: "Settings",
    description: "Workspace and platform configuration.",
    href: "/natureos/settings",
    icon: Settings,
  },
]

function FeatureIcon({
  card,
}: {
  card: {
    icon: LucideIcon
    product?: "earth-simulator" | "nlm" | "natureos" | "mycobrain"
    name: string
  }
}) {
  if (card.product) {
    return (
      <ProductIcon
        product={card.product}
        variant="current"
        className="h-6 w-6 text-primary"
        title={card.name}
      />
    )
  }
  const Icon = card.icon
  return <Icon className="h-6 w-6 text-primary" />
}

export default function NatureOSMarketingPage() {
  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        {/* ================= HERO ================= */}
        <section
          className="relative min-h-[82vh] overflow-hidden py-24 flex items-center lp-media-band"
          data-over-video
        >
          <div className="lp-media-bg">
            <AutoplayVideo
              sources={natureosHeroSources}
              poster={NATUREOS_HERO_POSTER}
              preload="auto"
              smoothLoop
              pointerEventsNone
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "brightness(0.72) contrast(1.08) saturate(1.06)" }}
            />
          </div>
          <div className="lp-media-scrim lp-media-scrim--strong" aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,transparent_78%,var(--background)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff2_1px,transparent_1px),linear-gradient(to_bottom,#fff2_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.06] pointer-events-none" />

          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <GlassChip className="mb-4">ENVIRONMENTAL INTELLIGENCE</GlassChip>
              <h1 className="mb-6 inline-flex w-full items-center justify-center gap-[0.18em] text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight text-white leading-none">
                <ProductGlassIconCycle
                  frames={NATUREOS_GLASS_CYCLE_FRAMES}
                  className="origin-center h-[1em] w-[1em] scale-90 translate-y-[5px]"
                  alt="NatureOS"
                  reducedMotionLightIndex={0}
                  reducedMotionDarkIndex={1}
                />
                <span className="leading-none">NatureOS</span>
              </h1>
              <p className="text-2xl md:text-3xl font-semibold text-white mb-4">
                The scientific operating system for living environments.
              </p>
              <p className="text-base sm:text-lg text-white/75 max-w-3xl mx-auto mb-8 px-1">
                NatureOS is Mycosoft&apos;s nature operating system — the platform for environmental
                intelligence, scientific sensing, and simulation. Operate device fleets, run Earth
                Simulator and nature statistics, explore MINDEX-backed search and evidence, and work
                across Fungi Compute, Virtual Petri Dish, lab tools, and the Nature Learning Model to
                observe, simulate, and understand living systems.
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/natureos/dashboard" data-analytics="natureos_hero_explore_click">
                  <NeuButton variant="primary" className="text-base px-6 py-3 min-h-[44px]">
                    Explore the Platform
                    <ArrowRight className="ml-2 h-5 w-5 text-current" />
                  </NeuButton>
                </Link>
                <a href="#earth-simulator" data-analytics="natureos_hero_learn_more_click">
                  <NeuButton variant="default" className="text-base px-6 py-3 min-h-[44px]">
                    Learn More
                  </NeuButton>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PATH BAR ================= */}
        <section className="py-12 border-b border-border/40">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  audience: "Researchers & Labs",
                  head: "Measure and model living systems",
                  copy: "Statistics, petri and biology sims, ancestry, compounds, and lab tooling on real NatureOS routes.",
                  cta: "Open science tools",
                  href: "#science-tools",
                  icon: Microscope,
                },
                {
                  audience: "Earth & Field Teams",
                  head: "See the world in context",
                  copy: "Earth Simulator, device networks, and MINDEX evidence for environmental intelligence.",
                  cta: "Open Earth Simulator",
                  href: "/natureos/earth-simulator",
                  icon: Globe,
                },
                {
                  audience: "Builders",
                  head: "Extend the platform",
                  copy: "SDKs, APIs, cloud shell, containers, functions, and storage for scientific applications.",
                  cta: "View developer tools",
                  href: "#infrastructure",
                  icon: Code,
                },
              ].map((p) => (
                <NeuCard key={p.audience} className="transition-all hover:scale-[1.01]">
                  <NeuCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="myco-glass-tile p-2.5 shrink-0">
                        <p.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                          {p.audience}
                        </div>
                        <h3 className="font-semibold mb-1">{p.head}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{p.copy}</p>
                        <Link
                          href={p.href}
                          className="text-sm font-medium text-primary inline-flex items-center gap-1 min-h-[44px] hover:gap-2 transition-all"
                        >
                          {p.cta} <ArrowRight className="h-4 w-4 text-current" />
                        </Link>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CORE PLATFORM ================= */}
        <section id="platform" className="py-24 lp-band scroll-mt-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <GlassChip className="mb-4">THE PLATFORM</GlassChip>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
                Core NatureOS surfaces
              </h2>
              <p className="text-base sm:text-lg text-white/65 max-w-3xl mx-auto">
                Statistics, bio-compute, Earth Simulator, virtual culture, DirtNet device networking, and the
                Nature Learning Model — each linked to a live route in the NatureOS application.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {corePlatform.map((card) => (
                <NeuCard
                  key={card.name}
                  className="transition-all hover:scale-[1.01]"
                >
                  <NeuCardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="myco-glass-tile p-3">
                        <FeatureIcon card={card} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{card.name}</h3>
                        <p className="text-sm text-white/60">{card.tagline}</p>
                      </div>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <p className="text-sm text-white/70 mb-4">{card.description}</p>
                    <GlassButton href={card.href} dataAnalytics={`natureos_${card.name.toLowerCase().replace(/\s+/g, "_")}_open`}>
                      Open {card.name.split(" ")[0]}
                      <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-current" />
                    </GlassButton>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EARTH SIMULATOR FOCUS BAND ================= */}
        <section id="earth-simulator" className="py-24 lp-media-band lp-media-band--motion scroll-mt-16">
          <div className="lp-media-bg">
            <AutoplayVideo
              sources={earthSimBandSources}
              poster={EARTH_SIM_BAND_POSTER}
              preload="none"
              lazyRootMargin="300px"
              pauseWhenOutsideViewport
              smoothLoop
              pointerEventsNone
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="lp-media-scrim lp-media-scrim--strong" aria-hidden="true" />

          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <GlassChip className="mb-4">FOCUS</GlassChip>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-white">
                Earth Simulator
              </h2>
              <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
                A continuously evolving representation of the environment — fed by devices, MINDEX
                evidence, and NatureOS applications for research, field sensing, and scientific
                simulation.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <NeuCard className="transition-all hover:scale-[1.005]">
                <NeuCardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="myco-glass-tile p-3">
                      <ProductIcon product="earth-simulator" variant="current" className="h-6 w-6 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Planetary context</h3>
                      <p className="text-sm text-white/60">Spatial and temporal world model</p>
                    </div>
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <p className="text-sm text-white/70 mb-4">
                    Combine live observations, environmental history, forecasts, device state, and
                    simulated scenarios into one scientific globe.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      "3D globe",
                      "Environmental layers",
                      "Device positions",
                      "Historical playback",
                      "Forecast context",
                      "MINDEX inputs",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-white/85">
                        <Leaf className="h-4 w-4 text-emerald-300 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <GlassButton href="/natureos/earth-simulator" dataAnalytics="natureos_earth_simulator_open">
                    Open Earth Simulator <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-current" />
                  </GlassButton>
                </NeuCardContent>
              </NeuCard>

              <NeuCard className="transition-all hover:scale-[1.005]">
                <NeuCardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="myco-glass-tile p-3">
                      <Database className="h-6 w-6 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">MINDEX</h3>
                      <p className="text-sm text-white/60">Evidence feeding search &amp; Earth Simulator</p>
                    </div>
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <p className="text-sm text-white/70 mb-4">
                    Species, compounds, observations, and provenance so scientific conclusions remain
                    traceable — and available to site search and the world model.
                  </p>
                  <div className="rounded-lg border border-white/15 p-4 mb-5 overflow-x-auto">
                    <pre className="text-xs leading-relaxed text-white/75 text-left">
{`Field / lab observation
  → Calibration & context
  → MINDEX evidence
  → Search + Earth Simulator
  → NatureOS tools & NLM`}
                    </pre>
                  </div>
                  <GlassButton href="/natureos/mindex" dataAnalytics="natureos_mindex_explore">
                    Explore MINDEX <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-current" />
                  </GlassButton>
                </NeuCardContent>
              </NeuCard>
            </div>
          </div>
        </section>

        {/* ================= SCIENCE & LAB TOOLS ================= */}
        {/* Match BUILDERS: NeuCard + theme tokens (dark: white/high-contrast; light: ink/glass). */}
        <section id="science-tools" className="py-24 border-t border-border/40 scroll-mt-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <GlassChip className="mb-4">SCIENCE &amp; LAB</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                Other science &amp; lab tools
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                Real NatureOS routes for biology, chemistry, ancestry, growth, physics, and the tools hub.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {scienceLabTools.map((tool) => (
                <NeuCard key={tool.href} className="transition-all hover:scale-[1.01]">
                  <NeuCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="myco-glass-tile p-2.5 shrink-0">
                        <tool.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold mb-1">{tool.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{tool.tagline}</p>
                        <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                        <Link
                          href={tool.href}
                          className="text-sm font-medium text-primary inline-flex items-center gap-1 min-h-[44px] hover:gap-2 transition-all"
                        >
                          Open <ArrowRight className="h-4 w-4 text-current" />
                        </Link>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= INFRASTRUCTURE & DEV ================= */}
        <section id="infrastructure" className="py-24 border-t border-border/40 scroll-mt-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <GlassChip className="mb-4">BUILDERS</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                Infrastructure &amp; development tools
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                APIs, SDKs, cloud shell, containers, storage, monitoring, and device network — only
                routes that already exist under NatureOS.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {infraDevTools.map((tool) => (
                <NeuCard key={tool.href} className="transition-all hover:scale-[1.01]">
                  <NeuCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="myco-glass-tile p-2.5 shrink-0">
                        <tool.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold mb-1">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                        <Link
                          href={tool.href}
                          className="text-sm font-medium text-primary inline-flex items-center gap-1 min-h-[44px] hover:gap-2 transition-all"
                        >
                          Open <ArrowRight className="h-4 w-4 text-current" />
                        </Link>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="py-24 lp-band">
          <div className="container max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              Enter NatureOS
            </h2>
            <p className="text-base sm:text-lg text-white/65 max-w-2xl mx-auto mb-8">
              Open the platform hub, Earth Simulator, or the Nature Learning Model and start operating
              NatureOS end to end.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <GlassButton href="/natureos/dashboard" dataAnalytics="natureos_footer_dashboard">
                Platform hub <ArrowRight className="ml-2 h-5 w-5 text-current" />
              </GlassButton>
              <GlassButton href="/natureos/earth-simulator" dataAnalytics="natureos_footer_earth">
                Earth Simulator <ArrowRight className="ml-2 h-5 w-5 text-current" />
              </GlassButton>
              <GlassButton href="/myca/nlm" dataAnalytics="natureos_footer_nlm">
                Nature Learning Model <ArrowRight className="ml-2 h-5 w-5 text-current" />
              </GlassButton>
            </div>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
