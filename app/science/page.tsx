"use client"

import Link from "next/link"
import {
  NeuCard,
  NeuCardContent,
  NeuButton,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { assetMp4Sources, mergeWithNasFallbacks } from "@/lib/asset-video-sources"
import { ParticleCanvas } from "@/components/effects/particle-canvas"
import { NeuralNetworkCanvas } from "@/components/effects/neural-network-canvas"
import { ResearchRibbon } from "@/components/science/research-ribbon"
import {
  SCIENCE_PUBLICATIONS,
  STATUS_PILL_CLASSES,
  type ResearchStatus,
} from "@/lib/science-publications"
import {
  Activity,
  ArrowRight,
  Atom,
  AudioLines,
  Beaker,
  Brain,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FlaskConical,
  Globe,
  Layers,
  Leaf,
  Microscope,
  Network,
  Radar,
  Radio,
  Satellite,
  Server,
  Signal,
  Sparkles,
  Sprout,
  Wifi,
  Wind,
  Zap,
} from "lucide-react"

// Placeholder asset path; resolves at request time. If absent we fall back
// to a gradient rather than render a broken <video>.
const SCIENCE_HERO_SRC = "/assets/science/science-hero.mp4"
const SCIENCE_HERO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(SCIENCE_HERO_SRC))

// ─────────────────────────────────────────────────────────────────────────────
// Status pill helper
// ─────────────────────────────────────────────────────────────────────────────

interface StatusPillProps {
  status: ResearchStatus
  className?: string
}

function StatusPill({ status, className = "" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_PILL_CLASSES[status]} ${className}`}
    >
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Research domains atlas
// ─────────────────────────────────────────────────────────────────────────────

const ATLAS_DOMAINS: Array<{
  id: string
  icon: typeof Brain
  title: string
  status: ResearchStatus
  description: string
  bullets: string[]
  href: string
  external?: boolean
}> = [
  {
    id: "fci",
    icon: Sprout,
    title: "Fungal Interface Lab (FCI)",
    status: "In Lab",
    description:
      "Electrically active, stimulus-responsive fungal substrates instrumented with electrode arrays. We measure nonlinear signal behaviour and stimulation responses — not language.",
    bullets: [
      "Electrode arrays on mycelium-bearing substrates",
      "Spike-train analysis and stimulation protocols",
      "On-device firmware via mycobrain",
    ],
    href: "/science/fci",
  },
  {
    id: "nlm",
    icon: Brain,
    title: "Nature Learning Models (NLM)",
    status: "Prototype",
    description:
      "Signal-first foundation models. Environmental, spatial, and temporal streams feed the trunk; language is a reporting layer on top.",
    bullets: [
      "Acoustic, atmospheric, geospatial, bioelectric heads",
      "Trained against curated MINDEX corpora",
      "Operated through MYCA, governed under AVANI",
    ],
    href: "/science/nlm",
  },
  {
    id: "environmental",
    icon: Wind,
    title: "Environmental Sensing",
    status: "Deployed",
    description:
      "Twelve sensing modalities from VOC and particulate to LiDAR and Wi-Fi CSI. Each card in §Signal modalities states what that channel sees that the others miss.",
    bullets: [
      "Edge inference on Mushroom 1 / Hyphae 1 / MycoNode",
      "Cross-modal fusion across acoustic, optical, RF",
      "Maturity labelled honestly per modality",
    ],
    href: "#modalities",
  },
  {
    id: "materials",
    icon: Layers,
    title: "Materials & Biotech",
    status: "Research",
    description:
      "Mycelium-based composites and bio-derived materials with disciplined coverage of what evidence supports — and what the open questions still are.",
    bullets: [
      "96+ species surveyed across published reviews",
      "Acoustic and thermal performance benchmarks",
      "Hydrophilicity and standardization gaps tracked",
    ],
    href: "/science/materials",
  },
  {
    id: "signal-intelligence",
    icon: Signal,
    title: "Signal Intelligence",
    status: "Research",
    description:
      "The NLM thesis end-to-end: representation learning over raw environmental signals, with language used to query and summarise — not to drive perception.",
    bullets: [
      "Self-supervised pretraining on sensor corpora",
      "Multimodal alignment without forced narration",
      "Open evaluations against BirdNET and CSI baselines",
    ],
    href: "#nlm",
  },
  {
    id: "frontier",
    icon: Satellite,
    title: "Frontier Infrastructure",
    status: "Frontier Hypothesis",
    description:
      "Subsea, orbital, and lunar compute as future deployment surfaces for environmental intelligence. Tracked as hypotheses with named prior art, not as Mycosoft deployments today.",
    bullets: [
      "Subsea: Project Natick Phase 2 reliability data",
      "Orbital: Axiom Station edge inference briefs",
      "Lunar: Lonestar Data Holdings frontier work",
    ],
    href: "/science/deployments",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Signal modalities (12)
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_MODALITIES: Array<{
  name: string
  icon: typeof Eye
  signal: string
  maturity: ResearchStatus
}> = [
  {
    name: "Vision",
    icon: Eye,
    signal: "High-resolution stills resolve scene structure that motion video blurs out.",
    maturity: "Deployed",
  },
  {
    name: "Macro Video",
    icon: Activity,
    signal: "Temporal context: growth, dispersal, movement that single frames cannot show.",
    maturity: "Deployed",
  },
  {
    name: "Microscopy",
    icon: Microscope,
    signal: "Sub-millimetre structure for species ID, mycelial morphology, and material QA.",
    maturity: "In Lab",
  },
  {
    name: "LiDAR",
    icon: Radar,
    signal: "True 3D geometry of canopy and terrain that 2D imagery cannot reconstruct.",
    maturity: "Deployed",
  },
  {
    name: "Radar",
    icon: Radar,
    signal: "Penetrates foliage and weather; sees motion under cover that optical sensors miss.",
    maturity: "Prototype",
  },
  {
    name: "Hydrophones",
    icon: AudioLines,
    signal: "Underwater bioacoustics and vessel signatures that air microphones cannot reach.",
    maturity: "In Lab",
  },
  {
    name: "Microphones",
    icon: AudioLines,
    signal: "Airborne acoustics — birds, weather, mechanical signatures — at low marginal cost.",
    maturity: "Deployed",
  },
  {
    name: "Wi-Fi Sense",
    icon: Wifi,
    signal: "Local channel-state perturbation reveals motion and presence; useful indoors, not planetary.",
    maturity: "Research",
  },
  {
    name: "Particulate",
    icon: Sparkles,
    signal: "PM1/PM2.5/PM10 counts surface combustion, dust, and bioaerosol events.",
    maturity: "Deployed",
  },
  {
    name: "Gas / VOC",
    icon: Beaker,
    signal: "Chemical signatures — smoke, decay, plant stress — that optical channels never see.",
    maturity: "Deployed",
  },
  {
    name: "Weather",
    icon: Wind,
    signal: "Pressure, humidity, temperature ground every other modality in a physical context.",
    maturity: "Deployed",
  },
  {
    name: "Fungal Bioelectrics",
    icon: Zap,
    signal:
      "Stimulus-responsive voltage traces from living substrates — measurable, not yet legible as language.",
    maturity: "In Lab",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — NLM subsystems
// ─────────────────────────────────────────────────────────────────────────────

const NLM_SUBSYSTEMS: Array<{
  name: string
  icon: typeof AudioLines
  trainingSource: string
  status: ResearchStatus
  description: string
}> = [
  {
    name: "NLM-Acoustic",
    icon: AudioLines,
    trainingSource: "Curated bioacoustic corpora + on-device microphone arrays",
    status: "Prototype",
    description:
      "Species, mechanical, and environmental acoustic events. Benchmarked against BirdNET and Cornell baselines.",
  },
  {
    name: "NLM-Atmospheric",
    icon: Wind,
    trainingSource: "VOC, particulate, and weather telemetry across deployed nodes",
    status: "Prototype",
    description:
      "Multi-channel atmospheric state: composition, particulate load, weather. Designed to feed forecasting and anomaly detection without language priors.",
  },
  {
    name: "NLM-Geospatial",
    icon: Globe,
    trainingSource: "LiDAR canopy retrievals, radar swaths, sensor-mesh registries",
    status: "Research",
    description:
      "3D scene understanding from spaceborne LiDAR, radar, and ground-truth sensors fused through MINDEX provenance.",
  },
  {
    name: "NLM-Bioelectric",
    icon: Zap,
    trainingSource: "FCI probe traces and stimulation logs",
    status: "Research",
    description:
      "Representation learning over fungal bioelectric traces. Outputs structured features, not natural-language transcripts.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Materials & Biotech evidence vs limits
// ─────────────────────────────────────────────────────────────────────────────

const MATERIALS_EVIDENCE = [
  {
    title: "Species breadth",
    detail:
      "Reviews report 96+ fungal species used across mycelium-material studies — broad biological tooling.",
  },
  {
    title: "Low-energy, low-carbon process",
    detail:
      "Growth-based fabrication at mild temperatures with agricultural waste substrates documented across multiple peer-reviewed reviews.",
  },
  {
    title: "Acoustic and thermal performance",
    detail:
      "Mycelium composites achieve competitive sound-absorption and insulation in published benchmarks against EPS and rockwool.",
  },
]

const MATERIALS_LIMITS = [
  {
    title: "Inconsistent mechanical performance",
    detail:
      "Compressive and flexural strength vary by species, substrate, and process — not yet a drop-in replacement for engineered composites.",
  },
  {
    title: "Hydrophilicity",
    detail:
      "Untreated mycelium absorbs water; durability in humid or wet environments remains an open materials-science problem.",
  },
  {
    title: "Standardization gaps",
    detail:
      "No widely-adopted ASTM/ISO standards for mycelium composites yet. Comparability between studies is limited.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — Earth Computer deployments
// ─────────────────────────────────────────────────────────────────────────────

const DEPLOYMENT_NODES: Array<{
  name: string
  icon: typeof Leaf
  status: ResearchStatus
  description: string
  reference: string
}> = [
  {
    name: "Forest edge nodes",
    icon: Leaf,
    status: "In Lab",
    description:
      "Hyphae 1 and Mushroom 1 instances at forest-edge test sites — solar-powered, mesh-networked, running edge inference under canopy.",
    reference: "Internal: 2026 H1 field trials",
  },
  {
    name: "Subsea compute",
    icon: Atom,
    status: "Frontier Hypothesis",
    description:
      "Cooled-seabed compute pods are a frontier hypothesis. Prior art: Microsoft Project Natick Phase 2 (Northern Isles) reliability findings.",
    reference: "Microsoft Project Natick — Northern Isles",
  },
  {
    name: "Orbital compute",
    icon: Satellite,
    status: "Frontier Hypothesis",
    description:
      "Edge inference payloads on commercial stations and lunar surface compute are tracked as references, not deployed Mycosoft nodes today.",
    reference: "Axiom Space · Lonestar Lunar",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 9 — Source repos for the collaboration footer
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_REPOS = [
  {
    name: "MycosoftLabs/website",
    href: "https://github.com/MycosoftLabs/website",
    note: "This atlas, the marketing site, and the Next.js app.",
  },
  {
    name: "MycosoftLabs/mycosoft-mas",
    href: "https://github.com/MycosoftLabs/mycosoft-mas",
    note: "Multi-agent system, NLM documentation, MYCA orchestration.",
  },
  {
    name: "MycosoftLabs/mindex",
    href: "https://github.com/MycosoftLabs/mindex",
    note: "Training-source registry and provenance for environmental data.",
  },
  {
    name: "MycosoftLabs/mycobrain",
    href: "https://github.com/MycosoftLabs/mycobrain",
    note: "ScienceComms, device firmware, FCI probe pipelines.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SciencePage() {
  return (
    <NeuromorphicProvider>
      <div className="science-glass-page min-h-dvh bg-black text-white">
        {/* ── Section 1: Hero ── */}
        <section
          className="relative min-h-[80dvh] flex items-center justify-center overflow-hidden border-b border-white/10"
          data-over-video
        >
          {SCIENCE_HERO_SOURCES[0] ? (
            <AutoplayVideo
              src={SCIENCE_HERO_SOURCES[0]}
              sources={SCIENCE_HERO_SOURCES}
              className="absolute inset-0 z-0 h-full w-full object-cover"
              encodeSrc
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950 via-black to-emerald-950/40"
            />
          )}
          {/* Dark overlay */}
          <div className="pointer-events-none absolute inset-0 z-[2] bg-black/60" />
          {/* Grid texture */}
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:100px_100px]" />

          <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 text-center">
            <NeuBadge
              variant="default"
              className="mb-6 border border-white/35 bg-white/10 px-4 py-1.5 !text-white backdrop-blur-xl"
            >
              Research Atlas · v1
            </NeuBadge>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                Science &amp; Research
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/85 max-w-3xl mx-auto mb-8">
              Mycology, signal intelligence, and distributed environmental compute for
              the Earth computer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#ribbon">
                <NeuButton
                  variant="default"
                  className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
                >
                  Read latest research
                  <ArrowRight className="h-4 w-4" />
                </NeuButton>
              </Link>
              <Link href="#atlas">
                <NeuButton
                  variant="default"
                  className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/5 !text-white hover:bg-white/15"
                >
                  Explore domains
                  <ArrowRight className="h-4 w-4" />
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 2: Live research ribbon ── */}
        <section
          id="ribbon"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-20"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/10 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <NeuBadge variant="default" className="mb-4 !text-white">
                  Live ribbon
                </NeuBadge>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  Latest research &amp; source repositories
                </h2>
                <p className="max-w-2xl text-sm md:text-base text-white/70">
                  A curated stream of peer-reviewed work, datasets, and MycosoftLabs
                  repos that inform the atlas. Cards link out to the canonical source.
                </p>
              </div>
              <Link
                href="https://github.com/MycosoftLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
              >
                MycosoftLabs on GitHub
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <ResearchRibbon publications={SCIENCE_PUBLICATIONS} limit={12} />
          </div>
        </section>

        {/* ── Section 3: Research domains atlas ── */}
        <section
          id="atlas"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <ParticleCanvas
            variant="auto"
            className="absolute inset-0 -z-10 opacity-50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-black/80 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Atlas
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Six domains, one Earth-scale stack
              </h2>
              <p className="mx-auto max-w-3xl text-base md:text-lg text-white/75">
                Each domain links into a sub-page or anchored section. Maturity is
                labelled honestly: Deployed, In Lab, Prototype, Research, or Frontier
                Hypothesis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ATLAS_DOMAINS.map((domain) => {
                const Icon = domain.icon
                const isAnchor = domain.href.startsWith("#")
                const Card = (
                  <NeuCard className="h-full">
                    <NeuCardContent className="flex h-full flex-col gap-4 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                          <Icon className="h-6 w-6 text-emerald-200" aria-hidden />
                        </div>
                        <StatusPill status={domain.status} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{domain.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/75">
                          {domain.description}
                        </p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-white/80">
                        {domain.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <ChevronRight
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                              aria-hidden
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                          {isAnchor ? "Jump to section" : "Open sub-page"}
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </NeuCardContent>
                  </NeuCard>
                )
                return (
                  <Link
                    key={domain.id}
                    href={domain.href}
                    className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 rounded-2xl"
                  >
                    {Card}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Section 4: Fungal Interface Lab ── */}
        <section
          id="fci"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/15 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 max-w-3xl">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Fungal Interface Lab
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Electrically active substrates, instrumented and stimulated
              </h2>
              <p className="text-base md:text-lg text-white/75">
                The honest framing: fungi are electrically active, stimulus-responsive,
                spatially organized biological substrates with measurable nonlinear
                signal behaviour. They are not language-capable computers, and we do
                not claim to translate them.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {/* Left: image slots */}
              <div className="space-y-6">
                {/* TODO: electrode array photo */}
                <div className="aspect-[4/3] rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-black/40 backdrop-blur-md grid place-items-center">
                  <span className="text-emerald-200/60 text-xs">
                    TODO: electrode array photo
                  </span>
                </div>
                {/* TODO: spike trace plot */}
                <div className="aspect-[4/3] rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-black/40 backdrop-blur-md grid place-items-center">
                  <span className="text-emerald-200/60 text-xs">
                    TODO: spike trace plot
                  </span>
                </div>
                {/* TODO: substrate macro shot */}
                <div className="aspect-[4/3] rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-black/40 backdrop-blur-md grid place-items-center">
                  <span className="text-emerald-200/60 text-xs">
                    TODO: substrate macro shot
                  </span>
                </div>
              </div>

              {/* Right: 4-paragraph framing + stats + CTA */}
              <div className="space-y-6">
                <div className="space-y-5 text-base leading-relaxed text-white/85">
                  <p>
                    Mycelium networks carry measurable voltage activity. Multi-electrode
                    arrays record nonlinear spiking behaviour with structure that
                    statistical methods can cluster — a useful signal-processing object
                    for representation learning.
                  </p>
                  <p>
                    Stimulation programs probe response: substrates react to chemical,
                    thermal, mechanical, and light cues. We characterise those responses
                    rather than narrate them.
                  </p>
                  <p>
                    The hypothesis we test is narrow: that fungal substrates form a
                    bioelectric sensing surface useful inside a broader environmental
                    fabric. The hypothesis we explicitly do not advance is that fungi
                    speak a language we can decode.
                  </p>
                  <p>
                    All FCI workflows are scoped under AVANI governance — admissibility,
                    safety, and provenance — and recorded through MINDEX so every probe
                    trace is auditable.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Probes deployed", value: "Coming H2 2026" },
                    { label: "Signals catalogued", value: "Coming H2 2026" },
                    { label: "Stimulation programs", value: "Coming H2 2026" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/15 bg-white/5 p-4"
                    >
                      <div className="text-xs uppercase tracking-wider text-emerald-200/80">
                        {stat.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link href="/science/fci">
                    <NeuButton
                      variant="default"
                      className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
                    >
                      Open Fungal Interface Lab
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </NeuButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Signal modalities ── */}
        <section
          id="modalities"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 max-w-3xl">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Signal modalities
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Twelve channels, each chosen for what others miss
              </h2>
              <p className="text-base md:text-lg text-white/75">
                Sensor fusion only beats single-modality baselines when each modality
                contributes signal the others cannot. Below: what each channel uniquely
                surfaces.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SIGNAL_MODALITIES.map((m) => {
                const Icon = m.icon
                return (
                  <NeuCard key={m.name} className="h-full">
                    <NeuCardContent className="flex h-full flex-col gap-3 p-5">
                      <div className="flex items-center justify-between">
                        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2">
                          <Icon className="h-5 w-5 text-emerald-200" aria-hidden />
                        </div>
                        <StatusPill status={m.maturity} />
                      </div>
                      <h3 className="text-base font-semibold text-white">{m.name}</h3>
                      <p className="text-sm leading-relaxed text-white/75">
                        {m.signal}
                      </p>
                    </NeuCardContent>
                  </NeuCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Section 6: Nature Learning Models (NLM) ── */}
        <section
          id="nlm"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <NeuralNetworkCanvas className="absolute inset-0 -z-10 opacity-60" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-emerald-950/20 to-black"
          />
          <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl md:p-10">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Nature Learning Models
              </NeuBadge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Signals first. Language second.
              </h2>
              <div className="grid gap-6 md:grid-cols-2 mb-8">
                <p className="text-base md:text-lg leading-relaxed text-white/85">
                  Environmental, spatial, and temporal data come first. NLMs learn
                  representations over acoustic, atmospheric, geospatial, and
                  bioelectric streams before any text is involved — closer to a sensor
                  foundation model than to a chat model.
                </p>
                <p className="text-base md:text-lg leading-relaxed text-white/85">
                  Language is the reporting layer. It is how operators query, summarise,
                  and audit what the signal models surface. It is not the perception
                  pathway, and it is not how the model learns to see.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {NLM_SUBSYSTEMS.map((s) => {
                  const Icon = s.icon
                  return (
                    <div
                      key={s.name}
                      className="rounded-2xl border border-white/15 bg-black/30 p-5"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2">
                            <Icon className="h-5 w-5 text-emerald-200" aria-hidden />
                          </div>
                          <h3 className="text-lg font-semibold">{s.name}</h3>
                        </div>
                        <StatusPill status={s.status} />
                      </div>
                      <p className="text-sm leading-relaxed text-white/75">
                        {s.description}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-wider text-emerald-200/80">
                        Training source
                      </p>
                      <p className="text-xs text-white/70">{s.trainingSource}</p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/science/nlm">
                  <NeuButton
                    variant="default"
                    className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
                  >
                    Open NLM sub-page
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </NeuButton>
                </Link>
                <Link
                  href="https://github.com/MycosoftLabs/mycosoft-mas"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NeuButton
                    variant="default"
                    className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/5 !text-white hover:bg-white/15"
                  >
                    mycosoft-mas on GitHub
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </NeuButton>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 7: Materials & Biotech ── */}
        <section
          id="materials"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 max-w-3xl">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Materials &amp; Biotech
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What the evidence supports — and what it does not
              </h2>
              <p className="text-base md:text-lg text-white/75">
                Mycelium materials have a real published evidence base and real
                open questions. Both are tracked here in the same disciplined tone.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.9fr] gap-6 items-start">
              {/* Evidence column */}
              <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/[0.04] p-6">
                <h3 className="text-lg font-semibold text-emerald-200 mb-4">
                  What evidence supports
                </h3>
                <ul className="space-y-4">
                  {MATERIALS_EVIDENCE.map((e) => (
                    <li key={e.title}>
                      <div className="flex items-start gap-2">
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                          aria-hidden
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {e.title}
                          </div>
                          <p className="text-sm leading-relaxed text-white/75">
                            {e.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limits column */}
              <div className="rounded-3xl border border-amber-400/25 bg-amber-500/[0.04] p-6">
                <h3 className="text-lg font-semibold text-amber-200 mb-4">
                  Honest limits
                </h3>
                <ul className="space-y-4">
                  {MATERIALS_LIMITS.map((e) => (
                    <li key={e.title}>
                      <div className="flex items-start gap-2">
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                          aria-hidden
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {e.title}
                          </div>
                          <p className="text-sm leading-relaxed text-white/75">
                            {e.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* TODO microscopy image slot + CTA */}
              <div className="space-y-4">
                {/* TODO: mycelium microscopy image */}
                <div className="aspect-[4/3] rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-black/40 backdrop-blur-md grid place-items-center">
                  <span className="text-emerald-200/60 text-xs">
                    TODO: mycelium microscopy
                  </span>
                </div>
                <Link href="/science/materials">
                  <NeuButton
                    variant="default"
                    className="w-full gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
                  >
                    Open Materials sub-page
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </NeuButton>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 8: Earth Computer deployments ── */}
        <section
          id="deployments"
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/10 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 max-w-3xl">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Earth Computer deployments
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Where the compute actually lives
              </h2>
              <p className="text-base md:text-lg text-white/75">
                Forest edge today; subsea and orbital as named frontier hypotheses
                with prior art. Status labels are deliberately conservative.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEPLOYMENT_NODES.map((node) => {
                const Icon = node.icon
                return (
                  <NeuCard key={node.name} className="h-full">
                    <NeuCardContent className="flex h-full flex-col gap-4 p-6">
                      {/* TODO: world-map deployment slot */}
                      <div className="aspect-[16/10] rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-black/40 backdrop-blur-md grid place-items-center">
                        <span className="text-emerald-200/60 text-xs">
                          TODO: world-map for {node.name}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2">
                            <Icon className="h-5 w-5 text-emerald-200" aria-hidden />
                          </div>
                          <h3 className="text-lg font-semibold">{node.name}</h3>
                        </div>
                        <StatusPill status={node.status} />
                      </div>
                      <p className="text-sm leading-relaxed text-white/75">
                        {node.description}
                      </p>
                      <p className="mt-auto text-xs uppercase tracking-wider text-emerald-200/80">
                        Reference: <span className="text-white/70 normal-case tracking-normal">{node.reference}</span>
                      </p>
                    </NeuCardContent>
                  </NeuCard>
                )
              })}
            </div>

            <div className="mt-10 flex justify-center">
              <Link href="/science/deployments">
                <NeuButton
                  variant="default"
                  className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20"
                >
                  Open Deployments sub-page
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 9: Publications, repos & collaboration footer ── */}
        <section
          id="publications"
          className="relative overflow-hidden py-16 md:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"
          />
          <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-12 max-w-3xl">
              <NeuBadge variant="default" className="mb-4 !text-white">
                Publications · Repos · Collaborate
              </NeuBadge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Read the work, fork the code, open a thread
              </h2>
              <p className="text-base md:text-lg text-white/75">
                Everything in the atlas points to a public artifact: a paper, a report,
                or a repo. If something is missing, file an issue or open a thread.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Publications column */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FlaskConical
                    className="h-5 w-5 text-emerald-200"
                    aria-hidden
                  />
                  <h3 className="text-lg font-semibold">Publications &amp; reports</h3>
                </div>
                <ul className="space-y-3">
                  {SCIENCE_PUBLICATIONS.map((p) => (
                    <li key={p.id}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-white group-hover:text-emerald-200">
                            {p.title}
                          </span>
                          <ExternalLink
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50"
                            aria-hidden
                          />
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {p.source} · {p.year} · {p.modality}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Source repos column */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Cpu className="h-5 w-5 text-emerald-200" aria-hidden />
                  <h3 className="text-lg font-semibold">Source repos</h3>
                </div>
                <ul className="space-y-3">
                  {SOURCE_REPOS.map((repo) => (
                    <li key={repo.href}>
                      <a
                        href={repo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-white group-hover:text-emerald-200">
                            {repo.name}
                          </span>
                          <ExternalLink
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50"
                            aria-hidden
                          />
                        </div>
                        <div className="mt-1 text-xs text-white/60">{repo.note}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Collaborate column */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Network className="h-5 w-5 text-emerald-200" aria-hidden />
                  <h3 className="text-lg font-semibold">Collaborate</h3>
                </div>
                <p className="text-sm leading-relaxed text-white/75 mb-5">
                  Researchers, operators, and field collaborators welcome. Open a
                  research thread, join MycoDAO, or reach out about a specific paper or
                  modality.
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:research@mycosoft.org"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">
                        Open a research thread
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-200" aria-hidden />
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      research@mycosoft.org
                    </div>
                  </a>
                  <a
                    href="https://mycodao.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">
                        Join MycoDAO
                      </span>
                      <ExternalLink className="h-4 w-4 text-white/50" aria-hidden />
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Decentralised research funding and community governance.
                    </div>
                  </a>
                  <Link
                    href="/about"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">
                        About Mycosoft
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-200" aria-hidden />
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Mission, organisation, and operating principles.
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Glass shell — copied from .about-glass-page, renamed. Scopes the
            liquid-glass look to this page only. */}
        <style jsx global>{`
          .science-glass-page .neu-raised,
          .science-glass-page .neu-raised-sm,
          .science-glass-page .neu-btn,
          .science-glass-page [class*="rounded-xl"][class*="border"],
          .science-glass-page [class*="rounded-2xl"][class*="border"],
          .science-glass-page [class*="rounded-3xl"][class*="border"] {
            position: relative;
            overflow: hidden;
            border-color: rgba(255, 255, 255, 0.34) !important;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.075) 42%, rgba(255, 255, 255, 0.03)) !important;
            box-shadow:
              0 18px 52px rgba(0, 0, 0, 0.28),
              0 7px 18px rgba(255, 255, 255, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.62),
              inset 0 -22px 38px rgba(255, 255, 255, 0.07) !important;
            backdrop-filter: blur(18px) saturate(1.22);
            -webkit-backdrop-filter: blur(18px) saturate(1.22);
          }

          .science-glass-page .neu-raised::before,
          .science-glass-page .neu-raised-sm::before,
          .science-glass-page .neu-btn::before,
          .science-glass-page [class*="rounded-xl"][class*="border"]::before,
          .science-glass-page [class*="rounded-2xl"][class*="border"]::before,
          .science-glass-page [class*="rounded-3xl"][class*="border"]::before {
            content: "";
            position: absolute;
            inset: 1px 2px auto;
            height: 42%;
            border-radius: inherit;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
            pointer-events: none;
          }

          .science-glass-page .neu-btn:hover,
          .science-glass-page .neu-raised:hover,
          .science-glass-page .neu-raised-sm:hover,
          .science-glass-page [class*="rounded-xl"][class*="border"]:hover,
          .science-glass-page [class*="rounded-2xl"][class*="border"]:hover,
          .science-glass-page [class*="rounded-3xl"][class*="border"]:hover {
            border-color: rgba(255, 255, 255, 0.52) !important;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.105) 42%, rgba(255, 255, 255, 0.045)) !important;
            box-shadow:
              0 24px 64px rgba(0, 0, 0, 0.34),
              0 9px 24px rgba(255, 255, 255, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.75),
              inset 0 -22px 38px rgba(255, 255, 255, 0.09) !important;
          }
        `}</style>
      </div>
    </NeuromorphicProvider>
  )
}
