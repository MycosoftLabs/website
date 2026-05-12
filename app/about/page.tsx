"use client"

import Image from "next/image"
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
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { ParticleCanvas } from "@/components/effects/particle-canvas"
import { NeuralNetworkCanvas } from "@/components/effects/neural-network-canvas"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"
import { DEVICES } from "@/lib/devices"
import { COMPANY_TAGLINE_LINES } from "@/lib/company-tagline"
import { DataGlobe } from "@/components/about/data-globe"
import {
  ArrowRight,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Coins,
  Cpu,
  Factory,
  FlaskConical,
  GitBranch,
  Shield,
  ChevronRight,
  ExternalLink,
  Landmark,
  Leaf,
  Server,
  Activity,
  FileCode,
  Globe,
  Zap,
  Network,
  Database,
} from "lucide-react"

const ABOUT_HERO_VIDEO_SRC = "/assets/about us/mycosoft-commercial-hero-2026.mp4"
const ABOUT_HERO_VIDEO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(ABOUT_HERO_VIDEO_SRC))

// NAS closing section video — mounted at /assets/ in the production Docker container
const CLOSING_VIDEO_SRC = "/assets/about us/10343918-hd_1920_1080_24fps.mp4"
const CLOSING_VIDEO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(CLOSING_VIDEO_SRC))

const SENSING_VIDEO_SRC = "/assets/about/sensing-mycelium-lipids.mp4"
const SENSING_VIDEO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(SENSING_VIDEO_SRC))

// Full-stack architecture — aligned with Data Sensor Network Strategy (2026)
const architectureLayers = [
  {
    id: "hardware",
    icon: Cpu,
    title: "Sensing",
    subtitle: "Data sensors + Fungi Compute",
    description:
      "Mushroom 1, SporeBase, MycoNode, Hyphae 1, and Psathyrella. Each device is an edge data-center node, a sensor platform, and an AI execution environment — autonomous intelligence nodes, not IoT gadgets.",
    links: [
      { label: "Devices", href: "/devices" },
      { label: "MycoBrain", href: "/devices/mycobrain" },
    ],
  },
  {
    id: "networking",
    icon: Network,
    title: "Networking",
    subtitle: "DirtNet / MDP / Mycorrhizae",
    description:
      "Mesh networking and radio protocol inspired by biological networks, engineered for resilience and decentralisation — LoRa, LTE, and device-to-device paths for environmental data routing and real-time intelligence flow.",
    links: [
      { label: "DirtNet", href: "/dirtnet" },
      { label: "Mycorrhizae", href: "/protocols/mycorrhizae" },
    ],
  },
  {
    id: "data",
    icon: Database,
    title: "Data",
    subtitle: "MINDEX",
    description:
      "Cryptographic integrity across environmental and biological datasets — mapping signals to context and building a global knowledge graph. MINDEX is the memory of Earth-scale sensing.",
    links: [
      { label: "MINDEX", href: "/natureos/mindex" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    id: "intelligence",
    icon: Brain,
    title: "Intelligence",
    subtitle: "NLM · MYCA · AVANI",
    description:
      "NLM learns from real-world signals and builds predictive world models. MYCA orchestrates agents, tools, and decisions across operations and research. AVANI is governance — admissibility, safety, and system integrity.",
    links: [
      { label: "NLM", href: "/myca/nlm" },
      { label: "MYCA", href: "/myca" },
      { label: "AVANI", href: "/ai/avani" },
    ],
  },
  {
    id: "platform",
    icon: Server,
    title: "Platform",
    subtitle: "NatureOS & FUSARIUM",
    description:
      "NatureOS delivers civilian environmental intelligence — real-time global monitoring and sensor plus AI orchestration. FUSARIUM is defense-grade environmental intelligence for multi-domain sensing and classified operational deployment.",
    links: [
      { label: "NatureOS", href: "/natureos" },
      { label: "FUSARIUM", href: "/defense/fusarium" },
    ],
  },
]

/** Legal / commercial rails — how entities divide responsibility while MYCA orchestrates across them */
const organizationEntities = [
  {
    id: "inc",
    icon: Building2,
    name: "Mycosoft Inc.",
    backgroundImage: "/assets/about/mycosoft-logo-black-bg.png",
    summary:
      "Governance, holding, and cross-cutting strategy — capital allocation, board-level programs, and initiatives that span defense, research, and commercial rails under one mission.",
  },
  {
    id: "llc",
    icon: Briefcase,
    name: "Mycosoft LLC",
    backgroundImage: "/assets/about/mycosoft-logo-white-bg.png",
    summary:
      "Operating company for engineering, contracts, sales, and delivery — where hardware programs, software releases, and customer engagements are executed day to day.",
  },
  {
    id: "dao",
    icon: Coins,
    name: "MycoDAO",
    backgroundImage: "/assets/about/mycodao-red-cap-logo.png",
    summary:
      "Ecological and community-aligned layer — participatory funding, restoration and science-adjacent programs, and mission work that extends beyond classic corporate boundaries.",
    href: "https://mycodao.com",
    external: true,
  },
  {
    id: "affiliated",
    icon: Network,
    name: "Subsidiaries & partners",
    backgroundImage: "/assets/about/myca-green-m-logo.jpg",
    summary:
      "Joint ventures, affiliated labs, and specialist entities plug into the same orchestration fabric — shared telemetry, governance (AVANI), and MYCA tasking across organizational lines.",
  },
]

/** Customer and mission surfaces — same stack, different admission and posture */
const organizationAudiences = [
  {
    id: "defense",
    icon: Shield,
    title: "Defense & security partners",
    backgroundImage: "/assets/about/serve-defense.png",
    description:
      "Classified-adjacent discipline, FUSARIUM-grade workflows, OEI and CREP integrations — governed intelligence from sensor to admissible artifact.",
    href: "/defense/fusarium",
  },
  {
    id: "science",
    icon: FlaskConical,
    title: "Scientists & institutions",
    backgroundImage: "/assets/about/serve-science.jpg",
    description:
      "Ground-truth field biology, climate and biodiversity programs, and reproducible pipelines — MINDEX-backed context and sensor-native datasets.",
    href: "/science",
  },
  {
    id: "agents",
    icon: Bot,
    title: "Builders & autonomous agents",
    backgroundImage: "/assets/about/serve-agent.webp",
    description:
      "Developers and always-on MYCA workloads — skills, APIs, MAS agents, and automated loops that ship code, run checks, and operate infrastructure without waiting on manual queues.",
    href: "/myca",
  },
  {
    id: "civil",
    icon: Globe,
    title: "Civil & enterprise platforms",
    backgroundImage: "/assets/about/serve-society.jpg",
    description:
      "NatureOS operators, fleets, NGOs, and enterprise environmental programs — dashboards, APIs, and governed automation at civilian scale.",
    href: "/natureos",
  },
]

/** Operating streams MYCA coordinates end-to-end across Inc, LLC, DAO, and affiliates */
const organizationMycaStreams = [
  {
    id: "corp",
    icon: Landmark,
    title: "Autonomous corporate operations",
    description:
      "Executive and corporate rhythm automated where appropriate — scheduling, reporting packs, cross-entity coordination, policy-aware tasking, and continuous alignment with AVANI governance.",
  },
  {
    id: "mfg",
    icon: Factory,
    title: "Manufacturing & hardware programs",
    description:
      "Build planning, supplier and BOM signals, QA gates, and production milestones tied to device roadmaps and field telemetry — manufacturing treated as a live program, not a spreadsheet silo.",
  },
  {
    id: "software",
    icon: GitBranch,
    title: "Software development & deployment",
    description:
      "Multi-repo engineering, CI/CD, sandbox → production promotion, and release governance across platform and web surfaces — agents assist review, testing, and deployment orchestration.",
  },
  {
    id: "devices",
    icon: Cpu,
    title: "Device rollout & field operations",
    description:
      "Firmware trains, provisioning, fleet health, registry heartbeats, and customer rollout sequences — MycoBrain-aware logistics so what ships matches what runs in the field.",
  },
]

// Applications by category
const applicationCategories = [
  {
    title: "Platforms",
    icon: Server,
    apps: [
      { name: "NatureOS", description: "Cloud OS for environmental intelligence", href: "/natureos" },
      { name: "FUSARIUM", description: "Defense-grade environmental intelligence platform", href: "/defense/fusarium" },
      { name: "MINDEX", description: "Nature data memory and sensing catalog", href: "/natureos/mindex" },
    ],
  },
  {
    title: "Intelligence",
    icon: Activity,
    apps: [
      { name: "Nature Learning Models", description: "NLMs trained from real-world environmental signals", href: "/myca/nlm" },
      { name: "Multi Agent System", description: "MYCA agent orchestration across tools and missions", href: "/myca" },
      { name: "Operating Environmental Intelligence", description: "OEI workflows for governed field intelligence", href: "/defense/oei" },
    ],
  },
  {
    title: "Science",
    icon: FileCode,
    apps: [
      { name: "Earth Simulator", description: "Climate and ecosystem simulation", href: PUBLIC_TOOL_HREFS.earthSimulator },
      { name: "Fungi Compute", description: "Biological computing and FCI systems", href: "/sensing/fungi-compute-fci" },
      { name: "Aerosol", description: "Bioaerosol, particle, and atmospheric sensing workflows", href: "/natureos/aerosol" },
    ],
  },
]

const sensingPackages = [
  {
    name: "Fungi Compute + FCI",
    href: "/sensing/fungi-compute-fci",
    description:
      "Fungal Computer Interface probes and fungi compute systems bring bioelectric, biological, soil-contact, and mycelium-network signals into the same edge sensing fabric as conventional sensors.",
  },
  {
    name: "MINDEX",
    href: "/natureos/mindex",
    description:
      "The Mycosoft Nature Index catalogs accumulated nature data so sensing becomes defined, searchable, reusable, and operational across devices, NatureOS, MYCA, and field missions.",
  },
  {
    name: "BlueSight",
    href: "/sensing/bluesight",
    description:
      "Blue-light fungal sensing and spatial intelligence combine fungal optical response, LiDAR, radar, WiFiSense, 8K 360 cameras, and 4K directional cameras for biological and field perception.",
  },
  {
    name: "SINE",
    href: "/sensing/sine",
    description:
      "Acoustic sensing with hydrophones, transducers, MEMS microphones, and acoustic communication protocols for marine life, birds, propellers, explosions, human sounds, and audio intelligence trained against vast libraries of recorded sounds.",
  },
  {
    name: "GANDHA",
    href: "/sensing/gandha",
    description:
      "Smell and gas detection for VOCs, VSCs, BME690, BME688, BME680, Bosch smell-blob training workflows, and BMV080 particle counters for air chemistry and particulate intelligence.",
  },
]

export default function AboutPage() {
  return (
    <NeuromorphicProvider>
    <div className="about-glass-page min-h-dvh">
      {/* Hero — locked NAS MP4 background */}
      <section className="relative min-h-[80dvh] flex items-center justify-center overflow-hidden" data-over-video>
        {ABOUT_HERO_VIDEO_SOURCES[0] ? (
          <AutoplayVideo
            src={ABOUT_HERO_VIDEO_SOURCES[0]}
            sources={ABOUT_HERO_VIDEO_SOURCES}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            encodeSrc
          />
        ) : null}
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-black/60" />
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />

        {/* Content */}
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 text-center">
          <NeuBadge
            variant="default"
            className="relative mb-6 overflow-hidden border border-white/35 bg-white/10 px-4 py-1.5 text-white shadow-[0_18px_50px_rgba(255,255,255,0.20),inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-18px_35px_rgba(255,255,255,0.08)] backdrop-blur-xl before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-white/80 after:absolute after:left-2 after:right-2 after:top-1 after:h-1/2 after:rounded-full after:bg-gradient-to-b after:from-white/35 after:to-transparent"
          >
            Est. 2021 · San Diego, CA
          </NeuBadge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-white/70 to-black bg-clip-text text-transparent">
              {COMPANY_TAGLINE_LINES[0]}
            </span>
            <br />
            <span className="text-white">
              {COMPANY_TAGLINE_LINES[1]}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
            We deploy a global network of intelligent data sensors — compute, sensing, AI inference, and mesh networking in one deployable node. Together they form a distributed, living data center outside.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/devices">
              <NeuButton variant="default" className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 bg-white/10 !text-white backdrop-blur-xl hover:bg-white/20 dark:border-emerald-200/20 dark:bg-emerald-200/10 dark:text-emerald-50 dark:hover:bg-emerald-200/15">
                Explore Devices
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
            <Link href="#about">
              <NeuButton variant="default" className="gap-2 min-h-[44px] px-6 py-3 border border-white/30 !text-white bg-white/5 hover:bg-white/15 about-hero-learn-more">
                Learn More
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      {/* The data sensor replaces the data center */}
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-border/60">
        <div className="absolute inset-0 z-0 bg-[url('/assets/about/mycobrainjetson-white.jpg')] bg-cover bg-center opacity-60 dark:bg-[url('/assets/about/mycobrainjetson-black.jpg')] dark:opacity-80" aria-hidden="true" />
        <div className="absolute inset-0 z-0 bg-white/58 backdrop-blur-[1px] dark:bg-black/58" aria-hidden="true" />
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <NeuBadge variant="default" className="mb-4">Strategy</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Data Sensor Replaces the Data Center</h2>
          </div>
          <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-white/35 bg-white/14 p-6 text-base leading-relaxed text-foreground/82 shadow-2xl shadow-black/20 backdrop-blur-xl dark:bg-black/22 dark:text-white/84 sm:text-lg md:p-8">
            <p>
              Data centers were built to store and process information; they are centralized, power-intensive facilities optimized to refine what already exists. They do not generate new truth — they refine old information.
            </p>
            <p>
              Mycosoft is building systems that <span className="text-foreground font-medium">discover</span> information. Instead of a centralized data center, we deploy a global network of intelligent data sensors embedded in the real world. Each node is compute, sensing, AI inference, and network participation in one — with embedded GPUs, CPUs, TPUs, biological interfaces (including fungal signal systems), environmental sensing, and mesh networking. Collectively they form a <span className="text-foreground font-medium">distributed, living data center outside</span>.
            </p>
            <p>
              Mobile, deployable edge nodes replace warehouse-scale infrastructure; solar-powered compute replaces centralized power; mesh-connected intelligence replaces cloud-only platforms. We do not only move compute closer to data — we place compute <span className="text-foreground font-medium">into the environment itself</span>, creating a resilient and sustainable data fabric.
            </p>
          </div>
        </div>
      </section>

      {/* About Mycosoft — Nature Compute Manifesto (theme-aware) */}
      <section
        id="about"
        className="relative py-16 md:py-24 overflow-hidden bg-black border-y border-white/10"
        data-over-video
      >
        <DataGlobe className="absolute inset-0 z-0 h-full w-full opacity-100" />
        {/* Particle animation — tuned for dark bg; subtle on light */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,255,190,0.10),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.22))]" />
        </div>

        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border-white/20 bg-black/45 text-white shadow-2xl shadow-cyan-400/10 about-mycosoft-badge">
              About Mycosoft
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 !text-white">Building the Earth Computer</h2>
            <p className="!text-cyan-100/90 font-medium text-lg">
              Turn reality into data — then data into intelligence
            </p>
          </div>

          {/* Opening */}
          <div className="max-w-3xl mx-auto mb-16 text-center space-y-5">
            <p className="text-lg !text-white/86 leading-relaxed">
              Mycosoft is building systems that discover information in the world, not only refine what already exists on the internet. Our data sensors observe reality independently; when networked, they produce new ground truth for science, infrastructure, and defense.
            </p>
            <p className="text-lg !text-white/86 leading-relaxed">
              We integrate physical sensing, edge compute, mesh protocols, cryptographic data layers, and governed AI so that environmental and biological signals become durable intelligence — not one-off telemetry, but a living data fabric.
            </p>
          </div>

        </div>
      </section>

      {/* What We Build */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-emerald-950/[0.06] via-background to-emerald-950/[0.04] dark:from-[#020806] dark:via-[#06110d] dark:to-[#020806] border-b border-border/60 dark:border-transparent">
        <div className="absolute inset-0 pointer-events-none">
          <ParticleCanvas variant="auto" className="absolute inset-0 w-full h-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/10 dark:from-[#020806]/70 dark:via-transparent dark:to-[#020806]/70 pointer-events-none" />

        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
          {/* What We Build */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-center">

            {/* Glass card wrapping the whole "What We Build" column */}
            <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <h3 className="text-2xl font-bold mb-3 text-foreground">What We Build</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Mycosoft develops a fully integrated system spanning physical sensing hardware, edge compute infrastructure, distributed networking protocols, environmental and biological AI, and autonomous multi-agent orchestration — designed to turn reality into data, then that data into intelligence.
              </p>
              <div className="space-y-2">
                {[
                  { icon: Cpu, label: "Physical sensing hardware", desc: "Data sensors: Mushroom 1, SporeBase, MycoNode, Hyphae 1, Psathyrella" },
                  { icon: Zap, label: "Edge compute infrastructure", desc: "On-node inference, resilient power, deployable where data is born" },
                  { icon: Network, label: "Distributed networking", desc: "Mycorrhizae Protocol — LoRa, LTE, device-to-device mesh" },
                  { icon: Brain, label: "Environmental & biological AI", desc: "NLM world models plus domain models trained on live signals" },
                  { icon: Bot, label: "Autonomous orchestration", desc: "MYCA — agents, tools, APIs, and continuous operation" },
                  { icon: Shield, label: "Governance & integrity", desc: "AVANI — admissibility, safety, auditability, system policy" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex gap-3 p-3 rounded-xl border border-border bg-muted/60 backdrop-blur-sm hover:bg-muted hover:border-emerald-950/20 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60 dark:hover:border-emerald-200/18 transition-all"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-emerald-950/[0.07] dark:bg-emerald-200/10">
                      <Icon className="h-4 w-4 text-emerald-950/80 dark:text-emerald-200/85" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border dark:border-white/10">
                Platforms surface this stack to operators and researchers —{" "}
                <span className="text-emerald-950/80 dark:text-emerald-200/85 font-medium">NatureOS</span> for civilian environmental intelligence and{" "}
                <span className="text-emerald-950/80 dark:text-emerald-200/85 font-medium">FUSARIUM</span> for defense-grade deployment, alongside{" "}
                <span className="text-emerald-950/80 dark:text-emerald-200/85 font-medium">OEI</span> where live CREP and edge sensing meet mission workflows.
              </p>
            </div>

            {/* Glass card wrapping the whole "Why It Matters" column */}
            <div className="p-6 rounded-2xl border border-border bg-card/90 backdrop-blur-md dark:border-white/10 dark:bg-black/45">
              <h3 className="text-2xl font-bold mb-3 text-foreground">Why It Matters</h3>

              {/* Description block */}
              <div className="p-4 rounded-xl border border-border bg-muted/50 backdrop-blur-sm mb-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-foreground/90 mb-4 text-sm leading-relaxed">
                  Today&apos;s AI systems are trained on internet data, human-generated content, and synthetic datasets — leading to feedback loops, stagnation, and loss of ground truth. Mycosoft builds AI trained on live, real, continuously generated environmental data from the field.
                </p>
                <p className="text-foreground/90 text-sm leading-relaxed">
                  That creates new datasets, new intelligence, and new models of reality. The next AI will not only be trained on the internet — it will learn from the Earth itself.
                </p>
              </div>

              {/* Bullet widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Ground truth from sensors, not only scraped corpora",
                  "Resilience when cloud links fail — intelligence stays local",
                  "Earlier signal in soil, air, water, and built environments",
                  "Defense and biosecurity with admissible, governed pipelines",
                  "Science and land management on continuous real-world streams",
                  "A new data modality: biological signalling alongside physics",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/40 backdrop-blur-sm hover:bg-muted/70 hover:border-emerald-950/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-emerald-200/18 transition-all"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-950/70 dark:bg-emerald-200/80 mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Philosophy + Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-emerald-950/15 bg-emerald-950/[0.04] backdrop-blur-xl dark:border-emerald-200/15 dark:bg-emerald-200/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="h-5 w-5 text-emerald-950/80 dark:text-emerald-200/85" />
                <h3 className="font-bold text-lg text-foreground">Our Philosophy</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Fungi are not our only focus — they are the missing layer in how the world senses. Mycelium responds to environmental stimuli and carries signals across ecosystems; we pair that with hydrophones, radar, VOC sensing, particle counters, Geiger detection, Wi‑Fi sense, vibration, temperature and humidity, and other physical channels — so biology augments a full sensor stack, not a niche.</p>
                <p>Technology should not dominate nature. It should read it honestly, with governance and restraint.</p>
                <p className="text-foreground font-medium">Distributed intelligence belongs in the environment — not only in warehouse-scale silos.</p>
              </div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-5 w-5 text-emerald-950/80 dark:text-emerald-200/85" />
                <h3 className="font-bold text-lg text-foreground">Our Mission</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>To build the Earth computer by deploying a global network of data sensors that replace outdated center-only thinking. We generate new ground truth, train AI on live environmental data, and unlock a new paradigm of distributed intelligence.</p>
                <p>This is not only environmental monitoring — it is infrastructure for truth in the biosphere.</p>
                <p className="text-emerald-950/80 dark:text-emerald-200/85 font-bold text-base">
                  Nature Compute — where the planet is the dataset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-stack architecture */}
      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4">Architecture</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Full-Stack Architecture</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From hardware in the field to platforms in the browser — one coherent stack for Earth-scale sensing and intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            {architectureLayers.map((layer) => (
              <NeuCard key={layer.id} className="p-6 transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-950/[0.06] dark:bg-emerald-200/10">
                    <layer.icon className="h-6 w-6 text-emerald-950/70 dark:text-emerald-200/80" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{layer.title}</h3>
                    <p className="text-sm text-muted-foreground">{layer.subtitle}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm flex-grow mb-4">
                  {layer.id === "hardware"
                    ? "Mushroom 1, SporeBase, MycoNode, Hyphae 1, and Psathyrella. Each device is an edge data-center node, a sensor platform, and an AI execution environment - autonomous intelligence nodes, not IoT gadgets."
                    : layer.id === "networking"
                      ? "MDP, the Mycosoft Device Protocol, gives MycoBrain devices a field language. DirtNet links MDP, Mycorrhizae Protocol, MycoSpeak, LoRa, LoRaWAN, Meshtastic, LTE, and device-to-device paths for decentralized edge data, inference, and AI."
                      : layer.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {layer.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <NeuButton variant="default" className="p-0 h-auto text-emerald-950/70 dark:text-emerald-200/80 hover:text-emerald-950 dark:hover:text-emerald-100 bg-transparent shadow-none">
                        {link.label}
                      </NeuButton>
                    </Link>
                  ))}
                </div>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Biological integration */}
      <section className="about-sensing-section relative overflow-hidden py-16 md:py-24 border-y border-border/60" data-over-video>
        <AutoplayVideo
          src={SENSING_VIDEO_SOURCES[0]}
          sources={SENSING_VIDEO_SOURCES}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          encodeSrc
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/42" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.46))]" aria-hidden="true" />
        <div className="relative z-10 container max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <NeuBadge variant="default" className="mb-4 border-white/25 bg-white/12 text-white backdrop-blur-xl">Sensing</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Biological Integration</h2>
          </div>
          <NeuCard className="about-sensing-card border border-white/20 bg-black/34 p-6 text-white shadow-2xl shadow-black/35 backdrop-blur-md md:p-8 [&_*]:!text-white">
            <p className="leading-relaxed text-white mb-4">
              Fungi are not our only focus; they are the <span className="text-foreground font-semibold">missing layer</span>. Mycelium acts as a distributed sensing and signalling network — responding to environmental stimuli and transmitting electrical and chemical signals across ecosystems.
            </p>
            <p className="leading-relaxed text-white">
              The same nodes fuse conventional modalities: <span className="text-foreground font-medium">hydrophones</span>,{" "}
              <span className="text-foreground font-medium">radar</span>, <span className="text-foreground font-medium">VOC</span>{" "}
              (volatile organic compound) sensing, <span className="text-foreground font-medium">particle counters</span>,{" "}
              <span className="text-foreground font-medium">Geiger</span> radiation detection,{" "}
              <span className="text-foreground font-medium">Wi‑Fi sense</span>, <span className="text-foreground font-medium">vibration</span>,{" "}
              <span className="text-foreground font-medium">temperature and humidity</span>, plus acoustic, optical, thermal, and mechanical channels — and{" "}
              <span className="text-foreground font-semibold">fungal biological interfaces (FCI)</span> as an extra layer. Fungi are not the product or limitation; they expand what sensing can be.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {sensingPackages.map((item) => (
                <Link key={item.name} href={item.href}>
                  <NeuButton variant="default" className="min-h-[44px] border border-white/25 bg-white/12 !text-white backdrop-blur-xl hover:bg-white/18 dark:border-white/25 dark:bg-white/12 dark:!text-white dark:hover:bg-white/18">
                    {item.name}
                  </NeuButton>
                </Link>
              ))}
            </div>
          </NeuCard>
        </div>
      </section>

      {/* Devices Grid — data-over-video: sharper outline in light mode */}
      <section className="relative overflow-hidden bg-white py-16 text-black dark:bg-black dark:text-white md:py-24">
        {/* Neural network background — lazy starts on scroll */}
        <NeuralNetworkCanvas className="absolute inset-0 w-full h-full" />
        {/* Vignette to keep device cards readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/28 via-transparent to-white/32 dark:from-black/58 dark:via-transparent dark:to-black/58" />

        <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border-black/20 !text-black dark:border-white/20 dark:!text-white about-hardware-badge">Hardware</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 !text-black dark:!text-white">Our Devices</h2>
            <p className="max-w-2xl mx-auto text-black/75 dark:text-white/80">
              Edge data-center nodes in the field — Mushroom 1, SporeBase, MycoNode, Hyphae 1, and Psathyrella as those programs ship. Each bridges biological and digital worlds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DEVICES.filter((device) => device.id !== "alarm").map((device) => (
              <Link key={device.id} href={`/devices/${device.id}`}>
                <NeuCard className="about-device-card group transition-all cursor-pointer h-full bg-white/45 backdrop-blur-sm dark:bg-black/50">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={device.image.startsWith("/") ? encodeAssetUrl(device.image) : device.image}
                      alt={device.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <NeuCardContent className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{device.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-white/60 line-clamp-2">{device.tagline}</p>
                  </NeuCardContent>
                </NeuCard>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/devices">
              <NeuButton variant="default" className="gap-2 min-h-[44px] border-white/20 about-devices-view-all">
                View All Devices
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Applications by Category */}
      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4">Software</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Applications</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Where the stack meets operators: platforms, live intelligence, and scientific tooling on one website — wired to real sensors and governed agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {applicationCategories.map((category) => (
              <NeuCard key={category.title} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-950/10 dark:bg-emerald-200/10">
                    <category.icon className="h-5 w-5 text-emerald-950/70 dark:text-emerald-200/80" />
                  </div>
                  <h3 className="font-bold text-lg">{category.title}</h3>
                </div>
                <div className="space-y-3">
                  {category.apps.map((app) => (
                    <Link key={app.href} href={app.href} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-sm group-hover:text-emerald-950 dark:group-hover:text-emerald-100 transition-colors">{app.name}</p>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-950 dark:group-hover:text-emerald-100 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Organization — Inc, LLC, MycoDAO, audiences, MYCA orchestration (above The Future) */}
      <section className="py-16 md:py-24 bg-muted/25 border-y border-border/60" aria-labelledby="about-organization-heading">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-14">
            <NeuBadge variant="default" className="mb-4">Organization</NeuBadge>
            <h2 id="about-organization-heading" className="text-3xl md:text-4xl font-bold mb-4">
              One Mission, Multiple Rails
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
              <span className="text-foreground font-medium">Mycosoft Inc.</span>,{" "}
              <span className="text-foreground font-medium">Mycosoft LLC</span>,{" "}
              <span className="text-foreground font-medium">MycoDAO</span>, and affiliated entities split governance, operations, and community programs — while{" "}
              <span className="text-foreground font-medium">MYCA</span> orchestrates work across all of them: corporate rhythm, manufacturing signals, software lifecycles, and device rollout, under{" "}
              <span className="text-foreground font-medium">AVANI</span> governance so automation stays admissible and auditable.
            </p>
          </div>

          <div className="about-serve-section mb-14 md:mb-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Legal &amp; commercial structure</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Different rails for capital, contracts, and community — one shared sensor stack, memory layer, and agent fabric.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
              {organizationEntities.map((entity) => {
                const card = (
                  <NeuCard
                    className={`relative overflow-hidden p-6 h-full flex flex-col transition-all ${entity.href ? "hover:border-emerald-950/20 dark:hover:border-emerald-200/20" : ""}`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.16] mix-blend-multiply dark:opacity-[0.24] dark:mix-blend-screen"
                      style={{ backgroundImage: `url('${entity.backgroundImage}')` }}
                      aria-hidden="true"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-white/10 dark:bg-black/10" aria-hidden="true" />
                    <div className="relative z-10 flex items-start gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-950/[0.06] dark:bg-emerald-200/10 shrink-0">
                        <entity.icon className="h-6 w-6 text-emerald-950/70 dark:text-emerald-200/85" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-lg leading-tight">{entity.name}</h4>
                          {entity.external ? (
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <p className="relative z-10 text-sm text-muted-foreground leading-relaxed flex-grow">{entity.summary}</p>
                  </NeuCard>
                )
                if (entity.href && entity.external) {
                  return (
                    <a
                      key={entity.id}
                      href={entity.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950/35 dark:focus-visible:ring-emerald-200/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {card}
                    </a>
                  )
                }
                return (
                  <div key={entity.id} className="h-full">
                    {card}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="about-serve-section mb-14 md:mb-16">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">Who we serve</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Same platforms and agents — different admission, compliance posture, and operator workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {organizationAudiences.map((audience) => (
                <Link key={audience.id} href={audience.href} className="block h-full group">
                  <NeuCard className="about-serve-card relative min-h-[260px] overflow-hidden p-6 h-full flex flex-col justify-end !text-white transition-all hover:border-emerald-950/20 dark:hover:border-emerald-200/20 [&_*]:!text-white">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url('${audience.backgroundImage}')` }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/42 to-black/18 dark:from-black/88 dark:via-black/50 dark:to-black/18" aria-hidden="true" />
                    <div className="absolute inset-0 bg-white/8 backdrop-blur-[1px] dark:bg-black/6" aria-hidden="true" />
                    <div className="relative z-10 flex items-start gap-3 mb-3">
                      <div className="p-3 rounded-xl border border-white/25 bg-white/16 backdrop-blur-md shrink-0">
                        <audience.icon className="h-6 w-6 !text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-lg !text-white transition-colors">
                          {audience.title}
                        </h4>
                      </div>
                      <ChevronRight className="h-5 w-5 !text-white shrink-0 mt-1 transition-colors group-hover:!text-white" />
                    </div>
                    <p className="relative z-10 text-sm !text-white leading-relaxed">{audience.description}</p>
                  </NeuCard>
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">What MYCA orchestrates</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                Autonomous corporate operations and continuous delivery — manufacturing readiness, multi-repo software, production deploys, and field devices — coordinated as programs, not disconnected tickets.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {organizationMycaStreams.map((stream) => (
                <NeuCard key={stream.id} className="p-6 h-full flex flex-col border-emerald-950/10 dark:border-emerald-200/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-950/[0.06] dark:bg-emerald-200/10">
                      <stream.icon className="h-6 w-6 text-emerald-950/70 dark:text-emerald-200/85" />
                    </div>
                    <h4 className="font-bold text-base leading-tight">{stream.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{stream.description}</p>
                </NeuCard>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
            <Link href="/myca">
              <NeuButton variant="default" className="gap-2 min-h-[44px] w-full sm:w-auto border border-emerald-950/20 bg-emerald-950/10 text-emerald-950 backdrop-blur-xl hover:bg-emerald-950/15 dark:border-emerald-200/20 dark:bg-emerald-200/10 dark:text-emerald-50 dark:hover:bg-emerald-200/15">
                Explore MYCA orchestration
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
            <Link href="/ai/avani">
              <NeuButton variant="default" className="gap-2 min-h-[44px] w-full sm:w-auto">
                AVANI governance
                <ChevronRight className="h-4 w-4" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Mycosoft - Closing Statement — data-over-video */}
      <section className="relative py-16 md:py-24 overflow-hidden min-h-[60vh] flex items-center" data-over-video>
        <AutoplayVideo
          src={CLOSING_VIDEO_SOURCES[0]}
          sources={CLOSING_VIDEO_SOURCES}
          className="absolute inset-0 w-full h-full object-cover"
          encodeSrc
        />

        {/* Dark overlay so text is legible */}
        <div className="absolute inset-0 bg-black/65" />
        {/* Subtle dark glass tint layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/45 via-transparent to-black/40" />

        <div className="container max-w-4xl mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center">
            <NeuBadge variant="default" className="mb-4 border-white/20 text-white">The Future</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 !text-white">
              The Data Center
              <br />
              <span className="text-emerald-200/85">Dissolves Into the World</span>
            </h2>

            <div className="space-y-6 text-lg text-white/90 leading-relaxed">
              <p>
                The data center will not disappear — it will dissolve into forests, oceans, cities, and infrastructure. Mycosoft is building a distributed intelligence system that lives where reality happens, not only in synthetic datasets.
              </p>
              <p>
                Data sensors replace the old assumption that truth must be centralized to be trusted. Cryptography, mesh resilience, and governed AI let intelligence stay honest at the edge.
              </p>
              <p className="text-white font-medium">
                The next paradigm is environmental: live ground truth, continuous models, and platforms that respect admissibility from sensor to decision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — data-over-video for widget outline */}
      <>
        <div className="hidden" aria-hidden="true">
          <div>
          <p>
            Researchers, developers, defense operators, and builders — deploy sensors, open the stack, and train on the planet, not only the crawl.
          </p>
          <div>
            <Link href="/devices">
              <NeuButton variant="default" className="gap-2 min-h-[44px] px-6 py-3 border border-emerald-200/20 bg-emerald-200/10 text-emerald-50 backdrop-blur-xl hover:bg-emerald-200/15">
                Get a Device
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
            <Link href="/science">
              <NeuButton variant="default" className="gap-2 min-h-[44px] px-6 py-3 bg-white/20 dark:bg-transparent border-gray-900 dark:border-white about-cta-read-research">
                Read Research
                <ExternalLink className="h-4 w-4" />
              </NeuButton>
            </Link>
          </div>
        </div>
        </div></>
      <style jsx global>{`
        .about-glass-page .neu-raised,
        .about-glass-page .neu-raised-sm,
        .about-glass-page .neu-btn,
        .about-glass-page [class*="rounded-xl"][class*="border"],
        .about-glass-page [class*="rounded-2xl"][class*="border"],
        .about-glass-page [class*="rounded-3xl"][class*="border"] {
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

        .about-glass-page .neu-raised::before,
        .about-glass-page .neu-raised-sm::before,
        .about-glass-page .neu-btn::before,
        .about-glass-page [class*="rounded-xl"][class*="border"]::before,
        .about-glass-page [class*="rounded-2xl"][class*="border"]::before,
        .about-glass-page [class*="rounded-3xl"][class*="border"]::before {
          content: "";
          position: absolute;
          inset: 1px 2px auto;
          height: 42%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
          pointer-events: none;
        }

        .about-glass-page .neu-btn:hover,
        .about-glass-page .neu-raised:hover,
        .about-glass-page .neu-raised-sm:hover,
        .about-glass-page [class*="rounded-xl"][class*="border"]:hover,
        .about-glass-page [class*="rounded-2xl"][class*="border"]:hover,
        .about-glass-page [class*="rounded-3xl"][class*="border"]:hover {
          border-color: rgba(255, 255, 255, 0.52) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.105) 42%, rgba(255, 255, 255, 0.045)) !important;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.34),
            0 9px 24px rgba(255, 255, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.75),
            inset 0 -22px 38px rgba(255, 255, 255, 0.09) !important;
        }

        .about-sensing-section,
        .about-sensing-section *,
        .about-sensing-section .neu-btn,
        .about-sensing-section .neu-btn *,
        .about-sensing-section .neu-raised,
        .about-sensing-section .neu-raised *,
        .about-sensing-section .neu-raised-sm,
        .about-sensing-section .neu-raised-sm * {
          color: #ffffff !important;
        }

        .about-sensing-section .neu-btn,
        .about-sensing-section .neu-raised,
        .about-sensing-section .neu-raised-sm {
          border-color: rgba(255, 255, 255, 0.28) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.07) 44%, rgba(255, 255, 255, 0.035)) !important;
        }

        .about-serve-section .neu-raised,
        .about-serve-section .neu-raised *,
        .about-serve-section .neu-raised-sm,
        .about-serve-section .neu-raised-sm *,
        .about-serve-section h4,
        .about-serve-section p,
        .about-serve-section svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
      `}</style>
    </div>
    </NeuromorphicProvider>
  )
}
