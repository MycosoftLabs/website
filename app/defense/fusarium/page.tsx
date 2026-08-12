"use client"

// FUSARIUM — public gateway to Mycosoft's operational environmental-intelligence
// platform. Rebuilt Aug 2026 around one hierarchy: NLM is the intelligence,
// Earth Simulator models the world, MINDEX remembers the evidence, sensing
// applications perceive, droids collect, CREP/FUSARIUM operationalizes, MYCA
// coordinates, AVANI governs, Launchpad grows the ecosystem.
//
// Rules honored here:
//  - Hero video asset/crop/behavior preserved exactly; only copy/CTAs changed.
//  - Exactly five droids marketed, once each, grouped by operating domain.
//  - Canonical sensing names: BlueSight, Eagle Eye, SINE, GANDHA, FCI.
//  - Every system carries a maturity label from the controlled vocabulary.
//  - No absolute claims ("cannot detect or evade" is gone), no unbounded
//    compliance claims, honest availability caveats preserved.
//  - All repeated content is configuration-driven (arrays below), not
//    hand-duplicated cards.

import Link from "next/link"
import {
  ArrowRight,
  Shield,
  Radar,
  Wind,
  Eye,
  Network,
  Cpu,
  Server,
  Radio,
  Zap,
  Globe,
  Activity,
  CheckCircle2,
  Plane,
  Waves,
  Database,
  Rocket,
  Ear,
  FlaskConical,
  Thermometer,
  Layers,
  GitBranch,
  Lock,
  FileText,
  Building2,
  Handshake,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"

// ---------------------------------------------------------------------------
// Controlled maturity vocabulary — every card must use one of these.
// ---------------------------------------------------------------------------
type Maturity =
  | "OPERATIONAL"
  | "DEPLOYED PILOT"
  | "VALIDATED PROTOTYPE"
  | "ACTIVE DEVELOPMENT"
  | "WORKBENCH"
  | "RESEARCH"
  | "PLANNED"
  | "PUBLIC DEMO"

const maturityColor: Record<Maturity, string> = {
  OPERATIONAL: "text-emerald-400 border-emerald-500/40",
  "DEPLOYED PILOT": "text-cyan-400 border-cyan-500/40",
  "VALIDATED PROTOTYPE": "text-sky-400 border-sky-500/40",
  "ACTIVE DEVELOPMENT": "text-amber-400 border-amber-500/40",
  WORKBENCH: "text-amber-400 border-amber-500/40",
  RESEARCH: "text-purple-400 border-purple-500/40",
  PLANNED: "text-slate-400 border-slate-500/40",
  "PUBLIC DEMO": "text-slate-300 border-slate-400/40",
}

function MaturityChip({ level }: { level: Maturity }) {
  return (
    <span
      className={`inline-block text-[10px] font-semibold tracking-widest px-2 py-0.5 rounded border ${maturityColor[level]}`}
    >
      {level}
    </span>
  )
}

// ---------------------------------------------------------------------------
// NLM six senses
// ---------------------------------------------------------------------------
const nlmSenses = [
  { name: "Spectral", domain: "Wavelengths and light", examples: "Cameras, multispectral, infrared, LiDAR", icon: Eye },
  { name: "Acoustic", domain: "Pressure waves", examples: "Microphones, hydrophones, vibration", icon: Ear },
  { name: "Bioelectric", domain: "Biological voltage", examples: "FCI electrodes, mycelial networks", icon: Zap },
  { name: "Thermal", domain: "Heat and gradients", examples: "Temperature arrays, thermal imaging", icon: Thermometer },
  { name: "Chemical", domain: "Gases and compounds", examples: "VOCs, aerosols, gas sensors, assays", icon: FlaskConical },
  { name: "Mechanical", domain: "Pressure and deformation", examples: "IMUs, strain, seismic, tactile inputs", icon: Activity },
]

const nlmOutputs = ["Current state", "Anomaly", "Confidence", "Prediction", "Evidence", "Recommended observation"]

// ---------------------------------------------------------------------------
// Droids by operating domain — exactly five, marketed once.
// ---------------------------------------------------------------------------
interface DroidCard {
  id: string
  name: string
  descriptor: string
  capabilities: string[]
  status: Maturity
  href: string
  icon: LucideIcon
}

const operatingDomains: Array<{
  domain: string
  accent: string
  note?: string
  droids: DroidCard[]
}> = [
  {
    domain: "Air & Atmosphere",
    accent: "text-sky-300",
    droids: [
      {
        id: "agaric",
        name: "Agaric",
        descriptor: "Flying environmental-intelligence droid for aerial survey, sensing, relay, and payload deployment.",
        capabilities: ["BlueSight", "Aerial relay", "Payload deployment", "Wide-area sensing", "Mesh extension"],
        status: "DEPLOYED PILOT",
        href: "/devices/agaric",
        icon: Plane,
      },
      {
        id: "sporebase",
        name: "SporeBase",
        descriptor:
          "Ground-deployed atmospheric node: time-indexed bioaerosol and particulate sampling for physical evidence and environmental baselines.",
        capabilities: ["Bioaerosols", "GANDHA", "Physical samples", "Atmospheric context", "Lab handoff"],
        status: "DEPLOYED PILOT",
        href: "/devices/sporebase",
        icon: Wind,
      },
    ],
  },
  {
    domain: "Water & Hydrosphere",
    accent: "text-cyan-300",
    droids: [
      {
        id: "psathyrella",
        name: "Psathyrella",
        descriptor:
          "Autonomous maritime sensing buoy for passive acoustics, water state, and persistent coastal or inland-water observation.",
        capabilities: ["SINE", "Hydrophones", "Water state", "Coastal mesh", "Edge inference"],
        status: "VALIDATED PROTOTYPE",
        href: "/devices/psathyrella",
        icon: Waves,
      },
    ],
  },
  {
    domain: "Land & Infrastructure",
    accent: "text-emerald-300",
    droids: [
      {
        id: "mushroom-1",
        name: "Mushroom 1",
        descriptor: "Walking ground-intelligence droid for mobile field sensing, inspection, mapping, and FCI deployment.",
        capabilities: ["Mobile sensing", "FCI", "Terrain mapping", "Sensor placement", "DIRTNet node"],
        status: "VALIDATED PROTOTYPE",
        href: "/devices/mushroom-1",
        icon: Radar,
      },
      {
        id: "hyphae-1",
        name: "Hyphae 1",
        descriptor:
          "Modular edge data center and field gateway: sensor fusion, local inference, mesh aggregation, and mission communications.",
        capabilities: ["Edge AI", "Mesh gateway", "Local storage", "Sensor fusion", "Backhaul"],
        status: "VALIDATED PROTOTYPE",
        href: "/devices/hyphae-1",
        icon: Server,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Sensing applications — canonical names, honest maturity.
// ---------------------------------------------------------------------------
interface SensingApplication {
  id: string
  name: string
  tagline: string
  inputs: string[]
  outputs: string[]
  nlmSenses: string[]
  status: Maturity
  statusNote?: string
  href: string
  icon: LucideIcon
}

const sensingSystems: SensingApplication[] = [
  {
    id: "bluesight",
    name: "BlueSight",
    tagline: "Visual and spatial intelligence",
    inputs: ["Cameras", "Multispectral", "LiDAR", "Radar", "WiFiSense"],
    outputs: ["Scene state", "Detection and change", "Geometry", "Evidence frames"],
    nlmSenses: ["Spectral", "Mechanical"],
    status: "VALIDATED PROTOTYPE",
    href: "/sensing/bluesight",
    icon: Eye,
  },
  {
    id: "eagle-eye",
    name: "Eagle Eye",
    tagline: "Live visual-source intelligence",
    inputs: ["Registry-backed cameras", "Connector-sourced feeds", "Recorded video"],
    outputs: ["Map-linked visual evidence", "Source registry", "Availability state"],
    nlmSenses: ["Spectral"],
    status: "OPERATIONAL",
    statusNote: "Stream availability varies by source — not every map marker guarantees a playable live feed.",
    href: "/dashboard/crep",
    icon: Globe,
  },
  {
    id: "sine",
    name: "SINE",
    tagline: "Acoustic workbench and model-validation environment",
    inputs: ["Hydrophones", "Microphones", "Vibration", "Air, land, underwater recordings"],
    outputs: ["Waveforms", "Spectrograms", "Events", "Model-gated interpretations"],
    nlmSenses: ["Acoustic"],
    status: "WORKBENCH",
    statusNote: "Semantic interpretation is model-gated: claims unlock only when a validated model artifact supports them.",
    href: "/sensing/sine",
    icon: Ear,
  },
  {
    id: "gandha",
    name: "GANDHA",
    tagline: "Chemical and particle intelligence",
    inputs: ["VOCs", "Gas channels", "Particulates", "Humidity, temperature, pressure"],
    outputs: ["Chemical fingerprints", "Drift-aware readings", "Alerts", "Environmental signatures"],
    nlmSenses: ["Chemical"],
    status: "ACTIVE DEVELOPMENT",
    href: "/sensing/gandha",
    icon: FlaskConical,
  },
  {
    id: "fci",
    name: "FCI",
    tagline: "Bioelectric perception",
    inputs: ["Living fungal tissue", "Electrode arrays", "Controlled stimuli", "Environmental context"],
    outputs: ["Filtered biological signals", "Response profiles", "Anomalies", "NLM-ready evidence"],
    nlmSenses: ["Bioelectric"],
    status: "RESEARCH",
    statusNote: "FCI measures bioelectric activity and response patterns for controlled interpretation by NLM.",
    href: "/natureos/fci",
    icon: Zap,
  },
]

// ---------------------------------------------------------------------------
// Dashboard — the four official operational views.
// ---------------------------------------------------------------------------
const dashboardViews = [
  {
    name: "Situational Awareness",
    icon: Globe,
    items: ["CREP globe", "Active sensors", "Environmental overlays", "Alerts", "Mission area", "Device health"],
  },
  {
    name: "Threat Assessment",
    icon: Shield,
    items: ["Ranked anomalies", "Cross-source correlation", "Entity detail", "Confidence and evidence", "AVANI gate state"],
  },
  {
    name: "Data Fusion",
    icon: Layers,
    items: ["Modality coverage", "Source registry", "Model readiness", "MINDEX provenance", "Cross-domain correlation"],
  },
  {
    name: "Command & Control",
    icon: Radio,
    items: ["Mission creation", "Device tasking", "Alert routing", "Intelligence products", "Compliance and audit state"],
  },
]

const appChips = ["Earth Simulator", "BlueSight", "Eagle Eye", "SINE", "GANDHA", "FCI"]

// ---------------------------------------------------------------------------
// Launchpad — four stages (the ten modules live on the dedicated route).
// ---------------------------------------------------------------------------
const launchpadStages = [
  {
    name: "Establish",
    icon: Building2,
    items: ["Corporate prerequisites", "SAM.gov, UEI, CAGE", "Portal registrations", "Opportunity profiles"],
  },
  {
    name: "Prepare",
    icon: FileText,
    items: ["ASA Workspace", "Readiness workflows", "Policy drafting", "Evidence Index", "POA&M organization"],
  },
  {
    name: "Compete",
    icon: Radar,
    items: ["Contract Radar", "Eligibility screening", "Proposal Workspace", "Submission checklists", "Operating calendar"],
  },
  {
    name: "Integrate",
    icon: Network,
    items: ["Origin Graph", "Domestic sourcing", "Local Assurance Agent", "Enclave Bridge", "Optional Partner Mesh"],
  },
]

// ---------------------------------------------------------------------------
// Orchestration / governance layer
// ---------------------------------------------------------------------------
const operatingLayer = [
  { name: "MYCA", role: "Coordinates agents, tools, workflows, analysis, device tasks, and human interaction.", icon: Cpu },
  { name: "MAS", role: "Executes specialized workflows and connects the platform to models, services, devices, and external systems.", icon: Network },
  { name: "AVANI", role: "Applies governance, policy, restraint, auditability, and reversibility to system actions.", icon: Shield },
  { name: "DIRTNet", role: "Connects autonomous sensing and compute nodes across intermittent or degraded networks.", icon: GitBranch },
  { name: "Mycorrhizae Protocol", role: "Routes normalized environmental and biological information between devices, edge compute, MINDEX, NLM, and applications.", icon: Radio },
  { name: "MycoBrain Device Protocol", role: "Handles deterministic communication between device controllers, sensors, edge processors, and gateways.", icon: Server },
  { name: "HPL", role: "Provides a programming abstraction for fungal and biological computing experiments.", icon: FlaskConical },
]

export default function FusariumPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        {/* ================= 02 · HERO — video preserved exactly ================= */}
        <section className="relative min-h-[82vh] overflow-hidden py-24 flex items-center" data-over-video>
          <AutoplayVideo
            src="/assets/fusarium/fusarium-hero-2026-web.mp4"
            sources={["/assets/fusarium/fusarium-hero-2026-web.mp4"]}
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "brightness(0.72) contrast(1.08) saturate(1.06)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/20 to-background/82" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff2_1px,transparent_1px),linear-gradient(to_bottom,#fff2_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.06] pointer-events-none" />

          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                OPERATIONAL ENVIRONMENTAL INTELLIGENCE
              </NeuBadge>
              <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-white">FUSARIUM</h1>
              <p className="text-2xl md:text-3xl font-semibold text-white mb-4">
                Intelligence grounded in the physical world.
              </p>
              <p className="text-lg text-white/75 max-w-3xl mx-auto mb-8">
                FUSARIUM combines the Nature Learning Model, Earth Simulator, MINDEX, sensing applications, and
                autonomous droids to produce a unified understanding of air, water, land, living systems, and
                infrastructure.
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                <a href="#nlm" data-analytics="fusarium_hero_explore_click">
                  <NeuButton variant="primary" className="text-base px-6 py-3">
                    Explore the Platform
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </NeuButton>
                </a>
                <Link href="/defense/request-briefing" data-analytics="fusarium_hero_briefing_click">
                  <NeuButton variant="default" className="text-base px-6 py-3">
                    Request a Briefing
                  </NeuButton>
                </Link>
              </div>

              {/* Launchpad gateway pill — conspicuous, subordinate, separate audience */}
              <Link
                href="/fusarium/launchpad"
                data-analytics="fusarium_hero_launchpad_click"
                className="group inline-flex flex-col items-center gap-1 mt-8 px-5 py-3 rounded-full border border-emerald-500/40 bg-black/40 backdrop-blur-sm hover:bg-emerald-500/10 transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <Rocket className="h-4 w-4" />
                  Building technology for the DoD? Enter FUSARIUM Launchpad
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[11px] text-white/55">
                  Readiness, opportunity discovery, evidence organization, and contractor operations for technical startups.
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 03 · AUDIENCE PATH BAR ================= */}
        <section className="py-12 border-b border-border/40">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  audience: "Mission Customers",
                  head: "Deploy environmental intelligence",
                  copy: "For defense, government, critical infrastructure, and mission operators.",
                  cta: "Request a Briefing",
                  href: "/defense/request-briefing",
                  icon: Shield,
                },
                {
                  audience: "Defense Startups",
                  head: "Become contractor-ready",
                  copy: "For founders building robotics, AI, hardware, sensing, software, and dual-use technologies.",
                  cta: "Enter Launchpad",
                  href: "/fusarium/launchpad",
                  icon: Rocket,
                },
                {
                  audience: "Technology Partners",
                  head: "Connect to the platform",
                  copy: "For companies whose devices, models, data, or applications should interoperate with FUSARIUM.",
                  cta: "Join Partner Mesh",
                  href: "#partner-mesh",
                  icon: Handshake,
                },
              ].map((p) => (
                <NeuCard key={p.audience} className="transition-all hover:scale-[1.01]">
                  <NeuCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                        <p.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{p.audience}</div>
                        <h3 className="font-semibold mb-1">{p.head}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{p.copy}</p>
                        <Link href={p.href} className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                          {p.cta} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 04 · NATURE LEARNING MODEL ================= */}
        <section id="nlm" className="py-24 bg-slate-950 text-white scroll-mt-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                THE INTELLIGENCE CORE
              </NeuBadge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Nature Learning Model</h2>
              <p className="text-2xl text-white/85 font-medium mb-4 max-w-3xl mx-auto">
                Large Language Models begin with words. The Nature Learning Model begins with the world.
              </p>
              <p className="text-lg text-white/65 max-w-3xl mx-auto">
                The physical world does not communicate in paragraphs. It communicates through wavelengths, waveforms,
                voltages, gases, heat, pressure, vibration, movement, and biological response. NLM learns from those
                signals directly — estimating environmental state, identifying anomalies, predicting what may happen
                next, and exposing the evidence and uncertainty behind each conclusion.
              </p>
              <p className="text-base font-semibold text-emerald-400 mt-4 tracking-wide">
                Language is optional. Grounding is mandatory.
              </p>
              <div className="mt-3 flex justify-center">
                <MaturityChip level="VALIDATED PROTOTYPE" />
              </div>
            </div>

            {/* Six senses feeding the model */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {nlmSenses.map((s) => (
                <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <s.icon className="h-5 w-5 text-emerald-400" />
                    <span className="font-semibold text-white">{s.name}</span>
                  </div>
                  <div className="text-sm text-white/70">{s.domain}</div>
                  <div className="text-xs text-white/45 mt-1">{s.examples}</div>
                </div>
              ))}
            </div>

            {/* Signal → state outputs */}
            <div className="text-center mb-10">
              <div className="text-xs uppercase tracking-widest text-white/45 mb-3">Every signal path resolves into</div>
              <div className="flex flex-wrap justify-center gap-2">
                {nlmOutputs.map((o) => (
                  <span key={o} className="text-sm px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/80">
                    {o}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link href="/myca/nlm" data-analytics="fusarium_nlm_detail_click">
                <NeuButton variant="primary" className="text-base px-6 py-3">
                  Explore the Nature Learning Model
                  <ArrowRight className="ml-2 h-5 w-5" />
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 05 · EARTH SIMULATOR + MINDEX ================= */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-4xl font-bold mb-3">A world model and an evidence memory</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                NLM reasons inside a representation of the world and on top of durable, traceable evidence.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <NeuCard className="transition-all hover:scale-[1.005]">
                <NeuCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-cyan-500/10">
                        <Globe className="h-6 w-6 text-cyan-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Earth Simulator</h3>
                        <p className="text-sm text-muted-foreground">The spatial and temporal world model</p>
                      </div>
                    </div>
                    <MaturityChip level="OPERATIONAL" />
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Combines live observations, environmental history, forecasts, device state, and simulated scenarios
                    into a continuously evolving representation of the operational environment.
                  </p>
                  <p className="text-sm font-medium mb-4">
                    What is happening, where is it happening, and what may happen next?
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {["3D globe", "Environmental layers", "Device positions", "Historical playback", "Forecast context", "Mission areas"].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/natureos/earth-simulator" data-analytics="fusarium_earth_simulator_open">
                    <NeuButton variant="default" className="text-sm px-4 py-2">
                      Open Earth Simulator <ArrowRight className="ml-2 h-4 w-4" />
                    </NeuButton>
                  </Link>
                </NeuCardContent>
              </NeuCard>

              <NeuCard className="transition-all hover:scale-[1.005]">
                <NeuCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-amber-500/10">
                        <Database className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">MINDEX</h3>
                        <p className="text-sm text-muted-foreground">The evidence and provenance layer</p>
                      </div>
                    </div>
                    <MaturityChip level="OPERATIONAL" />
                  </div>
                </NeuCardHeader>
                <NeuCardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Stores observations, model outputs, device state, calibration history, and provenance so an
                    operational conclusion can be traced back to the physical evidence that produced it.
                  </p>
                  <p className="text-sm font-medium mb-4">What do we know, where did it come from, and can it be trusted?</p>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 mb-5 overflow-x-auto">
                    <pre className="text-xs leading-relaxed text-muted-foreground">
{`Sensor observation
  → Calibration and context
  → NLM state estimate
  → Cross-sensor correlation
  → FUSARIUM alert / intelligence product
  → Cryptographic evidence reference`}
                    </pre>
                  </div>
                  <Link href="/mindex" data-analytics="fusarium_mindex_explore">
                    <NeuButton variant="default" className="text-sm px-4 py-2">
                      Explore MINDEX <ArrowRight className="ml-2 h-4 w-4" />
                    </NeuButton>
                  </Link>
                </NeuCardContent>
              </NeuCard>
            </div>
          </div>
        </section>

        {/* ================= 06 · DROIDS BY OPERATING DOMAIN ================= */}
        <section className="py-24 bg-slate-950 text-white">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                THE PHYSICAL NETWORK
              </NeuBadge>
              <h2 className="text-4xl font-bold mb-3 text-white">A body in every domain</h2>
              <p className="text-lg text-white/65 max-w-3xl mx-auto">
                FUSARIUM does not rely on a single sensor or platform. Mycosoft droids operate across the atmosphere,
                hydrosphere, and terrestrial environment — collecting the physical signals that train and ground the NLM.
              </p>
            </div>

            <div className="space-y-10">
              {operatingDomains.map((d) => (
                <div key={d.domain}>
                  <h3 className={`text-sm font-semibold uppercase tracking-widest mb-4 ${d.accent}`}>{d.domain}</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {d.droids.map((droid) => (
                      <div
                        key={droid.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-6 hover:border-white/25 transition-colors"
                        data-analytics="fusarium_device_select"
                        data-device={droid.id}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/10">
                              <droid.icon className={`h-5 w-5 ${d.accent}`} />
                            </div>
                            <h4 className="text-lg font-semibold text-white">{droid.name}</h4>
                          </div>
                          <MaturityChip level={droid.status} />
                        </div>
                        <p className="text-sm text-white/65 mb-4">{droid.descriptor}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {droid.capabilities.map((c) => (
                            <span key={c} className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/70">{c}</span>
                          ))}
                        </div>
                        <Link href={droid.href} className="text-sm font-medium text-emerald-400 inline-flex items-center gap-1 hover:gap-2 transition-all">
                          View device <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Shared architecture strip */}
            <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-white/45 mb-2">Powered by MycoBrain</div>
              <div className="overflow-x-auto">
                <pre className="text-xs md:text-sm text-white/70 inline-block text-left leading-relaxed">
{`Sensors → MycoBrain → Edge Compute → DIRTNet / Mycorrhizae → NLM → MINDEX → FUSARIUM`}
                </pre>
              </div>
              <div className="mt-3">
                <Link href="/devices" className="text-sm text-white/55 hover:text-white/85 underline underline-offset-4">
                  View the complete hardware portfolio
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 07 · THE SENSES OF FUSARIUM ================= */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4">Sensing Applications</NeuBadge>
              <h2 className="text-4xl font-bold mb-3">The senses of FUSARIUM</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Each sensing application converts a different class of physical evidence into structured observations
                the NLM can fuse and the operational picture can display.
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sensingSystems.map((s) => (
                <NeuCard key={s.id} className="transition-all hover:scale-[1.01]" data-analytics="fusarium_sensing_app_select" data-sensing-system={s.id}>
                  <NeuCardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <s.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{s.name}</h3>
                          <p className="text-xs text-muted-foreground">{s.tagline}</p>
                        </div>
                      </div>
                      <MaturityChip level={s.status} />
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Input</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.inputs.map((i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{i}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Output</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.outputs.map((o) => (
                        <span key={o} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{o}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      NLM senses: <span className="text-foreground font-medium">{s.nlmSenses.join(" + ")}</span>
                    </div>
                    {s.statusNote && <p className="text-xs text-muted-foreground italic mb-3">{s.statusNote}</p>}
                    <Link href={s.href} className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                      View workbench <ArrowRight className="h-4 w-4" />
                    </Link>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 08 · ONE OPERATIONAL PICTURE ================= */}
        <section className="py-24 bg-slate-950 text-white">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                One Operational Picture
              </NeuBadge>
              <h2 className="text-4xl font-bold mb-3 text-white">From physical signals to mission context</h2>
              <p className="text-lg text-white/65 max-w-3xl mx-auto mb-3">
                FUSARIUM turns device observations, external sources, model outputs, historical evidence, and operator
                input into a unified Common Relevant Environmental Picture.
              </p>
              <MaturityChip level="PUBLIC DEMO" />
              <p className="text-xs text-white/45 mt-2">
                The public workspace shows sanitized demonstration data — never a live operational picture.
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              {dashboardViews.map((v) => (
                <div key={v.name} className="rounded-xl border border-white/10 bg-white/5 p-5" data-analytics="fusarium_dashboard_app_open" data-app={v.name}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <v.icon className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold text-white text-sm">{v.name}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {v.items.map((i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-widest text-white/45 mb-3">Application layers inside the picture</div>
              <div className="flex flex-wrap justify-center gap-2">
                {appChips.map((c) => (
                  <span key={c} className="text-sm px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/80">{c}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard/crep" data-analytics="fusarium_demo_open">
                <NeuButton variant="primary" className="text-base px-6 py-3">
                  Open Demo Workspace <ArrowRight className="ml-2 h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/defense/request-briefing">
                <NeuButton variant="default" className="text-base px-6 py-3">Request Operational Access</NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 09 · LAUNCHPAD GATEWAY ================= */}
        <section id="launchpad" className="py-24 scroll-mt-16">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                BUILD FOR DEFENSE · UNCLASSIFIED COMMERCIAL WORKSPACE
              </NeuBadge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">From technical startup to defense-ready operator</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                FUSARIUM Launchpad guides emerging technology companies through the administrative, readiness,
                opportunity, proposal, and supply-chain work required to compete in the U.S. defense market.
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              {launchpadStages.map((s, n) => (
                <NeuCard key={s.name} data-analytics="fusarium_launchpad_stage_open" data-stage={s.name.toLowerCase()}>
                  <NeuCardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl font-bold text-primary/30">{n + 1}</div>
                      <s.icon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{s.name}</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {s.items.map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary/70 shrink-0" /> {i}
                        </li>
                      ))}
                    </ul>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>

            <div className="text-center mb-8">
              <div className="flex flex-wrap gap-4 justify-center mb-3">
                <Link href="/fusarium/launchpad" data-analytics="fusarium_launchpad_start">
                  <NeuButton variant="primary" className="text-base px-6 py-3">
                    Start Defense Launchpad <ArrowRight className="ml-2 h-5 w-5" />
                  </NeuButton>
                </Link>
                <Link href="/fusarium/launchpad/pricing" data-analytics="fusarium_launchpad_pricing">
                  <NeuButton variant="default" className="text-base px-6 py-3">View Launchpad Plans</NeuButton>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Founding access and recurring plans available ·{" "}
                <Link href="/fusarium/launchpad/trust" className="underline underline-offset-4 hover:text-foreground">
                  Data-handling and non-CUI policy
                </Link>
              </p>
            </div>

            <div className="max-w-3xl mx-auto rounded-lg border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground space-y-3">
              <p>
                <Lock className="inline h-4 w-4 mr-1.5 text-primary" />
                <strong className="text-foreground">Launchpad provides software, automation, drafting, evidence
                organization, and guidance.</strong>{" "}
                It does not certify companies, sign submissions, make legal representations on their behalf, or
                guarantee awards. Customers remain responsible for their representations, signatures, assessments,
                submissions, and security decisions.
              </p>
              <p>
                Standard Launchpad is a commercial, <strong className="text-foreground">non-CUI workspace</strong>. Do
                not upload CUI, classified material, credentials, private keys, clearance records, export-controlled
                technical data, or protected government information.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 10 · PARTNER MESH ================= */}
        <section id="partner-mesh" className="py-20 border-t border-border/40 scroll-mt-16">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <NeuBadge variant="default" className="mb-4">Connect Your Technology</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Bring your system into the FUSARIUM ecosystem</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-3">
              Companies using Launchpad may optionally connect compatible robots, sensors, software, models, data
              products, or mission applications to FUSARIUM.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto mb-8">
              Integration is separate, affirmative, permissioned, and opt-in. Launchpad customer data never enters the
              operational intelligence environment merely because a company uses the readiness product.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {["Robotics and autonomy", "Environmental sensors", "AI and analytical models", "Data sources and APIs", "Edge compute", "Mission software", "Domestic manufacturing"].map((c) => (
                <span key={c} className="text-sm px-3 py-1.5 rounded-full border border-border bg-muted/40 text-muted-foreground">{c}</span>
              ))}
            </div>
            <Link href="/defense/request-briefing" data-analytics="fusarium_partner_mesh_apply">
              <NeuButton variant="primary" className="text-base px-6 py-3">
                Apply to Partner Mesh <ArrowRight className="ml-2 h-5 w-5" />
              </NeuButton>
            </Link>
          </div>
        </section>

        {/* ================= 11 · ORCHESTRATION, GOVERNANCE, NETWORKING ================= */}
        <section className="py-24 bg-slate-950 text-white">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4 border-amber-500/40 text-amber-400">
                ORCHESTRATION, GOVERNANCE, AND NETWORKING
              </NeuBadge>
              <h2 className="text-4xl font-bold mb-3 text-white">
                How the system coordinates, remembers, and stays accountable
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-12">
              {operatingLayer.map((o) => (
                <div key={o.name} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <o.icon className="h-5 w-5 text-amber-400" />
                    <h3 className="font-semibold text-white">{o.name}</h3>
                  </div>
                  <p className="text-sm text-white/60">{o.role}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 overflow-x-auto">
              <pre className="text-xs md:text-sm text-white/70 leading-relaxed text-center">
{`AIR · WATER · LAND · LIVING SYSTEMS
            ↓ ↑
       MycoBrain / Edge
            ↓ ↑
  MDP · Mycorrhizae · DIRTNet
            ↓ ↑
          MINDEX
            ↓ ↑
            NLM
            ↓ ↑
   MYCA / MAS orchestration
            ↓ ↑
      AVANI governance
            ↓ ↑
FUSARIUM · CREP · Intelligence Products`}
              </pre>
              <p className="text-center text-xs text-white/40 mt-3">
                Observations flow up; commands and configuration flow down; evidence and provenance attach throughout.
              </p>
            </div>

            <div className="text-center mt-8">
              <Link href="/defense/technical-docs" data-analytics="fusarium_docs_open">
                <NeuButton variant="default" className="text-base px-6 py-3">
                  <FileText className="mr-2 h-5 w-5" /> Technical Documentation
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= 12 · ABOUT THE NAME (demoted accordion) ================= */}
        <section className="py-14">
          <div className="container max-w-3xl mx-auto px-4">
            <details className="group rounded-lg border border-border/60 bg-muted/20 p-5">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors list-none flex items-center justify-between">
                Why the name FUSARIUM?
                <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 text-sm text-muted-foreground space-y-3">
                <p>
                  Fusarium is a highly adaptive fungal genus capable of embedding in complex environments and persisting
                  under pressure. The name reflects the platform&apos;s design philosophy: distributed intelligence
                  designed to remain present, learn from local conditions, and maintain awareness across complex
                  environments.
                </p>
                <p className="font-semibold text-foreground">Embed. Adapt. Persist.</p>
              </div>
            </details>
          </div>
        </section>

        {/* ================= 13 · FINAL THREE-PATH CTA ================= */}
        <section className="py-24 border-t border-border/40">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  head: "Deploy FUSARIUM",
                  copy: "For government, defense, infrastructure, and mission customers.",
                  cta: "Request a Briefing",
                  href: "/defense/request-briefing",
                  icon: Shield,
                },
                {
                  head: "Enter Launchpad",
                  copy: "For technical startups becoming defense-ready.",
                  cta: "Start Defense Launchpad",
                  href: "/fusarium/launchpad",
                  icon: Rocket,
                },
                {
                  head: "Join Partner Mesh",
                  copy: "For companies integrating technology or data.",
                  cta: "Apply to Integrate",
                  href: "/defense/request-briefing",
                  icon: Handshake,
                },
              ].map((c) => (
                <NeuCard key={c.head} className="text-center transition-all hover:scale-[1.01]">
                  <NeuCardContent className="pt-8 pb-8">
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
                      <c.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{c.head}</h3>
                    <p className="text-sm text-muted-foreground mb-5">{c.copy}</p>
                    <Link href={c.href}>
                      <NeuButton variant="primary" className="px-5 py-2.5">
                        {c.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </NeuButton>
                    </Link>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
