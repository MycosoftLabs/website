"use client"

/**
 * NLM² — Nature-native explainer for the Nature Learning Model.
 * Route: /myca/nlm2
 * Visual system: subterranean / mycelial palette; content aligned with /myca/nlm.
 * Live training metrics: /natureos/model-training (no fabricated dashboard numbers here).
 * Created: Mar 30, 2026
 */

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NLMTechnicalArchitecture } from "@/components/myca/NLMTechnicalArchitecture"
import { LiveTranslationDemo } from "@/components/myca/LiveTranslationDemo"
import { Nlm2MycelialBackdrop } from "@/components/myca/nlm2/Nlm2MycelialBackdrop"
import { Nlm2OrganicHeroScene } from "@/components/myca/nlm2/Nlm2OrganicHeroScene"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { cn } from "@/lib/utils"
import {
  Brain,
  Shield,
  Sparkles,
  Cpu,
  Layers,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Activity,
  Network,
  Database,
  Microscope,
  TreeDeciduous,
  Globe,
  LineChart,
  Beaker,
  Upload,
  BookMarked,
  Wind,
  Scale,
  GitBranch,
  FlaskConical,
} from "lucide-react"

/** Program stages — qualitative only; numeric progress lives on the training lab. */
const PROGRAM_STAGES = [
  {
    name: "Mycospeak Foundation",
    status: "complete" as const,
    description: "Base fungal communication patterns",
  },
  {
    name: "Chemical Signal Mapping",
    status: "complete" as const,
    description: "VOC and enzyme signal translation",
  },
  {
    name: "Mycelial Network Topology",
    status: "active" as const,
    description: "Network structure and behavior patterns",
  },
  {
    name: "Interspecies Communication",
    status: "active" as const,
    description: "Cross-kingdom signal interpretation",
  },
  {
    name: "Environmental Response",
    status: "planned" as const,
    description: "Stress and adaptation signals",
  },
  {
    name: "Symbiotic Relationships",
    status: "planned" as const,
    description: "Mycorrhizal communication patterns",
  },
]

const NLM_PHASES = [
  {
    phase: "Phase 0",
    name: "Foundations",
    timeline: "0-6 months",
    status: "active",
    items: [
      "NMF v0.2 + ingestion pipeline (operational)",
      "Lab rigs for 5 fungal species (active)",
      "Growing sample corpus + calibration logs",
      "NLM-Funga v0.3: denoiser + event detector + early translator",
      "Benchmark harness (v1 operational)",
    ],
  },
  {
    phase: "Phase 1",
    name: "Funga Decoding",
    timeline: "6-18 months",
    status: "upcoming",
    items: [
      "Scale to 10-20 species",
      "FungaLex v0.5 probabilistic lexicon",
      "NatureOS dashboards integration",
      "Closed-loop stimulation-response protocols",
    ],
  },
  {
    phase: "Phase 2",
    name: "Cross-Species Translation",
    timeline: "18-36 months",
    status: "planned",
    items: [
      "Plant root-zone + VOC/hormone sensing",
      "Interaction graph learning",
      "Causal hypothesis generation",
      "Regional pilots",
    ],
  },
  {
    phase: "Phase 3",
    name: "Nature Intelligence at Scale",
    timeline: "36+ months",
    status: "vision",
    items: [
      "Earth observation integration",
      "Data-assimilating world model",
      "Open benchmarks ecosystem",
      "Global nature translation network",
    ],
  },
]

const RESEARCH_PAPERS = [
  {
    title: "Fungal Electrical Signaling Patterns",
    authors: "Adamatzky et al.",
    year: 2022,
    citations: 156,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10157304/",
  },
  {
    title: "Inter-plant Communication via Mycorrhizal Networks",
    authors: "Gorzelak et al.",
    year: 2015,
    citations: 892,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4497361/",
  },
  {
    title: "Mycelial Intelligence: A New Paradigm",
    authors: "Stamets & Trappe",
    year: 2023,
    citations: 342,
    url: "#",
  },
  {
    title: "Chemical Signaling in Fungal Networks",
    authors: "Boddy et al.",
    year: 2024,
    citations: 89,
    url: "#",
  },
  {
    title: "Multi-Modal Biosignal Fusion for Ecosystem State Inference",
    authors: "Mycosoft Research",
    year: 2026,
    citations: 12,
    url: "#",
  },
]

const SIX_LAYERS = [
  {
    layer: "1",
    title: "Sensing & Acquisition",
    icon: Activity,
    cardClass: "border-emerald-900/50 bg-emerald-950/20",
    iconClass: "text-emerald-400",
    items: ["Fungal electrophysiology (FCI)", "Chemical & environmental sensors", "Time-lapse imaging"],
  },
  {
    layer: "2",
    title: "Edge Processing",
    icon: Cpu,
    cardClass: "border-teal-900/50 bg-teal-950/20",
    iconClass: "text-teal-400",
    items: ["Denoising & artifact removal", "Spike/event detection", "On-device compression"],
  },
  {
    layer: "3",
    title: "Transport",
    icon: Network,
    cardClass: "border-cyan-900/40 bg-cyan-950/15",
    iconClass: "text-cyan-400",
    items: ["Mesh/gateway architecture", "Store-and-forward", "Mycorrhizae Protocol alignment"],
  },
  {
    layer: "4",
    title: "Data Integrity & Indexing",
    icon: Database,
    cardClass: "border-stone-700/60 bg-stone-950/30",
    iconClass: "text-stone-300",
    items: ["MINDEX provenance layer", "Dataset lakehouse", "Feature derivation"],
  },
  {
    layer: "5",
    title: "Model Layer (NLM)",
    icon: Brain,
    cardClass: "border-amber-900/50 bg-amber-950/20",
    iconClass: "text-amber-300",
    items: ["NLM-Funga foundation model", "Translation services", "Forecasting & anomaly detection"],
  },
  {
    layer: "6",
    title: "Application (NatureOS)",
    icon: Layers,
    cardClass: "border-lime-900/40 bg-lime-950/10",
    iconClass: "text-lime-300",
    items: ["Dashboards & APIs", "Experiment orchestration", "Stimulation loops"],
  },
]

function stageBadge(status: (typeof PROGRAM_STAGES)[number]["status"]) {
  if (status === "complete")
    return (
      <Badge className="border-emerald-700/60 bg-emerald-950/60 text-emerald-200">Complete</Badge>
    )
  if (status === "active")
    return (
      <Badge className="border-cyan-700/50 bg-cyan-950/50 text-cyan-200">Active</Badge>
    )
  return (
    <Badge variant="outline" className="border-stone-600 text-stone-400">
      Planned
    </Badge>
  )
}

/** Material-style elevation: layered shadow, top highlight, hover lift (static when reduced motion). */
const NLM2_CARD_DEPTH =
  "backdrop-blur-sm shadow-[0_12px_48px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,box-shadow] duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_-14px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.06)]"

const NLM2_PANEL_DEPTH =
  "shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm"

export default function NLM2Page() {
  return (
    <NeuromorphicProvider>
      <div className="relative min-h-dvh bg-[#070c0a] text-[#e8eadf]">
        <Nlm2MycelialBackdrop />

        <div className="relative z-10">
          {/* 1 — Hero: living substrate */}
          <header className="relative overflow-hidden border-b border-emerald-950/60 [perspective:1400px]">
            <div className="container mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
              <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,400px)] lg:gap-12 xl:gap-14">
                <div className="flex min-w-0 flex-col justify-center space-y-4 [transform-style:preserve-3d]">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-600/40 bg-amber-950/30 text-amber-200 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.2)]"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Foundation model
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-teal-600/40 bg-teal-950/30 text-teal-200 shadow-[0_4px_20px_-4px_rgba(20,184,166,0.18)]"
                    >
                      <FlaskConical className="mr-1 h-3 w-3" />
                      NLM-Funga
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-stone-600 bg-stone-950/40 text-stone-300"
                    >
                      Scientific instrument
                    </Badge>
                  </div>
                  <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#f2f5ec] sm:text-5xl md:text-6xl md:drop-shadow-[0_2px_24px_rgba(45,212,191,0.08)]">
                    Nature Learning Model
                  </h1>
                  <p className="text-lg leading-relaxed text-stone-400 md:text-xl">
                    The reasoning backbone inside our ecosystem—turning synchronized Earth telemetry into structured
                    state, calibrated uncertainty, and operational decisions. Not a language mimic: a{" "}
                    <span className="text-cyan-300/90">substrate-native</span> model trained on how living systems
                    actually behave.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link href="/natureos/model-training">
                      <Button
                        size="lg"
                        className="min-h-[48px] w-full gap-2 bg-teal-800 text-white shadow-[0_8px_28px_-6px_rgba(15,118,110,0.55)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-[0_14px_36px_-8px_rgba(15,118,110,0.6)] sm:w-auto"
                      >
                        Open training lab
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/myca/nlm">
                      <Button
                        size="lg"
                        variant="outline"
                        className="min-h-[48px] w-full border-stone-600 bg-stone-950/50 text-stone-200 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-stone-900 sm:w-auto"
                      >
                        Original NLM page
                      </Button>
                    </Link>
                  </div>
                  <p className="max-w-xl pt-2 text-sm leading-relaxed text-stone-500">
                    Hyphal metaphors, honest uncertainty, provenance by design. This page is the narrative home; the
                    NatureOS lab holds controls, streams, and experiment state.
                  </p>
                </div>
                <div className="flex min-h-[260px] flex-col justify-center lg:min-h-[320px] lg:[transform:translateZ(12px)]">
                  <Nlm2OrganicHeroScene />
                </div>
              </div>
            </div>
          </header>

          {/* 2 — What the forest senses */}
          <section
            id="substrate"
            className="border-b border-emerald-950/50 py-16 md:py-24"
            aria-labelledby="substrate-heading"
          >
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <h2
                id="substrate-heading"
                className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl"
              >
                What the substrate senses
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-stone-400">
                NLM learns from synchronized observations across biology and geophysics: bioelectric activity,
                chemical gradients, volatile compounds, growth dynamics, genomics, microbiome profiles, imagery,
                acoustics, and physical environmental telemetry. The program starts with{" "}
                <strong className="font-medium text-stone-200">fungi (&ldquo;funga&rdquo;)</strong>—dense networks,
                measurable electrical dynamics—then expands through plants and multi-species contexts.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: Microscope, title: "FCI electrophysiology", body: "Multi-channel fungal signals → NMF frames." },
                  { icon: Wind, title: "Chemistry & VOCs", body: "Volatile and enzyme cues fused with electrical motifs." },
                  { icon: TreeDeciduous, title: "Growth & imaging", body: "Time-lapse and environmental coupling." },
                  { icon: Globe, title: "CREP context", body: "Aviation, maritime, weather—world state alongside biosignals." },
                  { icon: Database, title: "MINDEX provenance", body: "Taxonomy, compounds, vectors—trust layer for training data." },
                  { icon: Cpu, title: "Edge → cloud", body: "MDP/MMP transport with integrity for model-ready pipelines." },
                ].map(({ icon: Icon, title, body }) => (
                  <Card
                    key={title}
                    className={cn(
                      "border-emerald-950/60 bg-[#0c1410]/90 backdrop-blur-sm",
                      NLM2_CARD_DEPTH,
                    )}
                  >
                    <CardHeader className="pb-2">
                      <Icon className="mb-2 h-8 w-8 text-cyan-400/90" aria-hidden />
                      <CardTitle className="text-lg text-stone-100">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-stone-400">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* 3 — Training lab portal (no fake live metrics) */}
          <section
            id="lab"
            className="border-b border-amber-950/30 bg-gradient-to-b from-amber-950/10 to-transparent py-16 md:py-24"
            aria-labelledby="lab-heading"
          >
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 id="lab-heading" className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl">
                    Training lab
                  </h2>
                  <p className="mt-4 text-lg text-stone-400">
                    The operational surface for NLM-Funga lives on NatureOS: experiment controls, translation
                    streams, exports, and integration with real backends when connected.{" "}
                    <strong className="font-medium text-stone-200">
                      This marketing view does not show live training percentages
                    </strong>
                    —those belong in the lab, driven by your stack—not fabricated hero metrics.
                  </p>
                  <ul className="mt-6 space-y-2 text-stone-400">
                    <li className="flex gap-2">
                      <span className="text-amber-400">→</span>
                      Model status, accuracy, and dataset counts when APIs are wired
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">→</span>
                      Pause / resume / export controls (NLM API when available)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">→</span>
                      Tabs: overview, architecture detail, training, roadmap
                    </li>
                  </ul>
                  <Link href="/natureos/model-training" className="mt-8 inline-block">
                    <Button
                      size="lg"
                      className="min-h-[48px] gap-2 bg-amber-700 text-amber-50 hover:bg-amber-600"
                    >
                      Enter NLM training dashboard
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <Card className={cn("border-stone-700/60 bg-[#0a100d]/95", NLM2_CARD_DEPTH)}>
                  <CardHeader>
                    <CardTitle className="text-stone-100">Program stages</CardTitle>
                    <CardDescription className="text-stone-500">
                      Qualitative roadmap alignment—verify current state in the lab.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {PROGRAM_STAGES.map((s) => (
                      <div
                        key={s.name}
                        className="flex flex-col gap-2 border-b border-stone-800/80 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-stone-200">{s.name}</p>
                          <p className="text-sm text-stone-500">{s.description}</p>
                        </div>
                        {stageBadge(s.status)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* 4 — Frontier position */}
          <section className="border-b border-emerald-950/50 py-16 md:py-24" aria-labelledby="frontier-heading">
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <h2 id="frontier-heading" className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl">
                Frontier position
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-stone-400">
                NLM specializes in connecting dots over time and across modalities—explaining not only what is
                happening but why and what might happen next. It integrates with MYCA&apos;s worldview and
                AVANI&apos;s live Earth feeds so every agent shares an evolving logical substrate.
              </p>
              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <Card className={cn("border-stone-700/60 bg-[#0c1410]/90", NLM2_CARD_DEPTH)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-stone-100">
                      <LineChart className="h-5 w-5 text-stone-400" />
                      Large Language Models (LLM)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-stone-400">
                    <p>
                      <strong className="text-stone-300">Primary signal:</strong> human text (plus images/audio)
                    </p>
                    <p>
                      <strong className="text-stone-300">Core objective:</strong> predict / produce language tokens
                    </p>
                    <p>
                      <strong className="text-stone-300">Ground truth:</strong> human-written corpora and supervised
                      labels
                    </p>
                  </CardContent>
                </Card>
                <Card className={cn("border-teal-900/50 bg-teal-950/20", NLM2_CARD_DEPTH)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-100">
                      <Brain className="h-5 w-5 text-cyan-400" />
                      Nature Learning Model (NLM)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-stone-400">
                    <p>
                      <strong className="text-stone-200">Primary signal:</strong> synchronized nature telemetry
                      (time series + chemistry + imagery)
                    </p>
                    <p>
                      <strong className="text-stone-200">Core objective:</strong> learn latent state + interaction
                      dynamics of ecosystems
                    </p>
                    <p>
                      <strong className="text-stone-200">Ground truth:</strong> causal experiments, field
                      observations, physical/biological assays
                    </p>
                    <p className="pt-2 text-xs text-teal-200/80">
                      Key constraint: scientifically falsifiable outputs with explicit uncertainty—not story-like
                      translation as ground truth.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className={cn("mt-8 border-emerald-900/40 bg-emerald-950/15", NLM2_CARD_DEPTH)}>
                <CardHeader>
                  <CardTitle className="text-stone-100">Abstract</CardTitle>
                </CardHeader>
                <CardContent className="text-stone-400">
                  <p className="italic leading-relaxed">
                    The <strong className="font-medium text-stone-200">Nature Learning Model (NLM)</strong> is a
                    proposed class of multi-modal foundation models that learn the information-bearing signals of
                    living and non-living Earth systems and translate them into operational representations usable by
                    humans, machines, and scientific workflows. The initial deliverable is{" "}
                    <strong className="text-stone-200">NLM-Funga</strong>, trained on standardized fungal datasets
                    captured with Mycosoft&apos;s FCI, producing a compact bio-token vocabulary aligned to scientific
                    ontologies.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 5 — Translation demo + NMF */}
          <section className="border-b border-emerald-950/50 py-16 md:py-24" aria-labelledby="pipeline-heading">
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <h2 id="pipeline-heading" className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl">
                From signal to structured state
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-stone-400">
                Raw streams are denoised, tokenized into motifs, and emitted as JSON-style operational state. Human
                language is a <em>view</em> of that state—not the ground truth.
              </p>
              <div className="mt-10 space-y-10">
                <div
                  className={cn(
                    "rounded-xl border border-stone-800 bg-[#0a100d]/80 p-4 md:p-6",
                    NLM2_PANEL_DEPTH,
                  )}
                >
                  <LiveTranslationDemo />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-stone-100">Nature Message Frame (NMF) v0.2</h3>
                  <p className="mt-2 text-stone-400">
                    Versioned record format: timestamp + lab context, sensor identity + calibration, taxonomy / growth
                    stage, raw waveforms + derived features, environmental streams, experiment protocol metadata,
                    quality flags, provenance, permissions, consent chain, model version tag, multi-species linkage,
                    stimulation-response safety envelope.
                  </p>
                  <pre className="mt-4 overflow-x-auto rounded-lg border border-stone-800 bg-black/40 p-4 text-left text-xs text-cyan-200/90 md:text-sm">
                    {`NMF v0.2 Record Format:
├── timestamp + location/lab context
├── sensor_identity + calibration_hash
├── taxonomy/strain + growth_stage + substrate
├── raw_waveform_blocks + derived_features
├── environmental_context_streams
├── experiment_protocol_metadata
├── data_quality_flags
├── provenance + permissions
├── consent_chain[]
├── model_version_tag
├── multi_species_linkage_id
└── stimulation_response_envelope`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* 6 — Architecture */}
          <section className="border-b border-emerald-950/50 py-16 md:py-24" aria-labelledby="architecture-heading">
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <h2 id="architecture-heading" className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl">
                Technical architecture
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-stone-400">
                MDP, MMP, HPL, FCI, CREP, and MINDEX form the pipeline from device to model—with traceability at every
                hop.
              </p>
              <div
                className={cn(
                  "mt-10 rounded-xl border border-stone-800 bg-[#080d0b]/90 p-4 md:p-6",
                  NLM2_PANEL_DEPTH,
                )}
              >
                <NLMTechnicalArchitecture />
              </div>
              <h3 className="mt-14 text-2xl font-semibold text-stone-100">Six-layer reference</h3>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SIX_LAYERS.map(({ layer, title, icon: Icon, cardClass, iconClass, items }) => (
                  <Card key={layer} className={cn(cardClass, NLM2_CARD_DEPTH)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-stone-600 text-stone-400">
                          {layer}
                        </Badge>
                        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden />
                      </div>
                      <CardTitle className="text-base text-stone-100">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-stone-400">
                        {items.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* 7 — Ethics, roadmap, research, smell tools */}
          <section className="py-16 md:py-24" aria-labelledby="ethics-heading">
            <div className="container mx-auto max-w-6xl px-4 md:px-6">
              <h2 id="ethics-heading" className="font-serif text-3xl font-semibold text-[#f2f5ec] md:text-4xl">
                Integrity, deployment, roadmap
              </h2>
              <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <Card className={cn("border-stone-700/60 bg-[#0c1410]/90", NLM2_CARD_DEPTH)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-stone-100">
                      <Scale className="h-5 w-5 text-amber-400" />
                      Scientific integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-stone-400">
                    <p>
                      NLM is built to be <strong className="text-stone-200">falsifiable</strong>—benchmarked against
                      controlled perturbations. We do not anthropomorphize fungal signals; we learn motifs and state
                      transitions with explicit confidence bounds.
                    </p>
                    <ul className="list-inside list-disc text-sm">
                      <li>Calibrated uncertainty on every output</li>
                      <li>Open benchmarks and cross-lab validation</li>
                      <li>Stimulation protocols bounded by safety envelopes</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className={cn("border-stone-700/60 bg-[#0c1410]/90", NLM2_CARD_DEPTH)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-stone-100">
                      <Shield className="h-5 w-5 text-teal-400" />
                      Responsible deployment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-stone-400">
                    <p>
                      Intended for research, agriculture, and environmental monitoring. We avoid dual-use applications
                      that could harm ecosystems or enable surveillance of sensitive biological systems. Data
                      provenance, permissions, and consent are built into NMF from the start.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="mt-14 text-2xl font-semibold text-stone-100">Development roadmap</h3>
              <div className="mt-8 space-y-6">
                {NLM_PHASES.map((p) => (
                  <Card
                    key={p.phase}
                    className={cn("border-stone-800 bg-[#0a100d]/90", NLM2_CARD_DEPTH)}
                  >
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-stone-100">
                          {p.phase}: {p.name}
                        </CardTitle>
                        <CardDescription className="text-stone-500">{p.timeline}</CardDescription>
                      </div>
                      <Badge variant="outline" className="w-fit border-stone-600 text-stone-400">
                        {p.status}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {p.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-stone-400">
                            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/80" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h3 className="mt-14 text-2xl font-semibold text-stone-100">Smell training (MINDEX)</h3>
              <p className="mt-2 text-stone-400">
                BME688/690 gas sensor training for fungal smell detection—linked from the canonical NLM page and lab.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Link href="/natureos/smell-training">
                  <Card
                    className={cn(
                      "h-full border-emerald-900/50 bg-emerald-950/20 transition-colors hover:border-emerald-700/60",
                      NLM2_CARD_DEPTH,
                    )}
                  >
                    <CardHeader>
                      <Beaker className="h-8 w-8 text-emerald-400" />
                      <CardTitle className="text-base text-stone-100">Smell Training Wizard</CardTitle>
                      <CardDescription className="text-stone-500">Record specimens & export data</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <Link href="/natureos/smell-training?tab=blobs">
                  <Card
                    className={cn(
                      "h-full border-emerald-900/50 bg-emerald-950/20 transition-colors hover:border-emerald-700/60",
                      NLM2_CARD_DEPTH,
                    )}
                  >
                    <CardHeader>
                      <Upload className="h-8 w-8 text-emerald-400" />
                      <CardTitle className="text-base text-stone-100">Blob Manager</CardTitle>
                      <CardDescription className="text-stone-500">BSEC selectivity blobs</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <Link href="/natureos/mindex?tab=smells">
                  <Card
                    className={cn(
                      "h-full border-emerald-900/50 bg-emerald-950/20 transition-colors hover:border-emerald-700/60",
                      NLM2_CARD_DEPTH,
                    )}
                  >
                    <CardHeader>
                      <BookMarked className="h-8 w-8 text-emerald-400" />
                      <CardTitle className="text-base text-stone-100">Smell Encyclopedia</CardTitle>
                      <CardDescription className="text-stone-500">MINDEX smell signatures</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>

              <h3 className="mt-14 text-2xl font-semibold text-stone-100">Research foundation</h3>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {RESEARCH_PAPERS.map((paper) => (
                  <a
                    key={paper.title}
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-stone-800 bg-[#0c1410]/80 p-4 transition-colors hover:border-stone-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-stone-100">{paper.title}</p>
                        <p className="text-sm text-stone-500">
                          {paper.authors} · {paper.year}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 bg-stone-800 text-stone-300">
                        {paper.citations} cites
                      </Badge>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-14 flex flex-col gap-4 border-t border-stone-800 pt-10 sm:flex-row sm:flex-wrap">
                <Link href="/natureos/model-training">
                  <Button className="min-h-[48px] w-full gap-2 bg-teal-800 hover:bg-teal-700 sm:w-auto">
                    NLM training dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/science">
                  <Button variant="outline" className="min-h-[48px] w-full border-stone-600 bg-transparent sm:w-auto">
                    <BookOpen className="mr-2 h-4 w-4" />
                    White paper
                  </Button>
                </Link>
                <Link href="/contact?subject=NLM%20Access">
                  <Button variant="outline" className="min-h-[48px] w-full border-stone-600 bg-transparent sm:w-auto">
                    Request access
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </NeuromorphicProvider>
  )
}
