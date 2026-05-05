"use client"

import Image from "next/image"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"
import {
  NeuCard,
  NeuCardContent,
  NeuButton,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { YoutubeHeroBackground } from "@/components/ui/youtube-hero-background"
import { assetMp4Sources, mergeWithNasFallbacks } from "@/lib/asset-video-sources"
import { aboutHeroYoutubeId } from "@/lib/hero-youtube"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { ParticleCanvas } from "@/components/effects/particle-canvas"
import { NeuralNetworkCanvas } from "@/components/effects/neural-network-canvas"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"
import { DEVICES } from "@/lib/devices"
import { COMPANY_TAGLINE_LINES } from "@/lib/company-tagline"
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

/** @Mycosoft About hero — https://www.youtube.com/watch?v=Z5pC9lEceKM */
const ABOUT_HERO_YOUTUBE_ID = aboutHeroYoutubeId()

const ABOUT_HERO_VIDEO_SRC = "/assets/about us/Mycosoft Commercial 1.mp4"
const ABOUT_HERO_VIDEO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(ABOUT_HERO_VIDEO_SRC))

// NAS closing section video — mounted at /assets/ in the production Docker container
const CLOSING_VIDEO_SRC = "/assets/about us/10343918-hd_1920_1080_24fps.mp4"
const CLOSING_VIDEO_SOURCES = mergeWithNasFallbacks(assetMp4Sources(CLOSING_VIDEO_SRC))

// Full-stack architecture — aligned with Data Sensor Network Strategy (2026)
const architectureLayers = [
  {
    id: "hardware",
    icon: Cpu,
    title: "Hardware",
    subtitle: "Data sensors",
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
    subtitle: "Mycorrhizae Protocol",
    description:
      "Mesh networking and radio protocol inspired by biological networks, engineered for resilience and decentralisation — LoRa, LTE, and device-to-device paths for environmental data routing and real-time intelligence flow.",
    links: [{ label: "Mycorrhizae", href: "/protocols/mycorrhizae" }],
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
    summary:
      "Governance, holding, and cross-cutting strategy — capital allocation, board-level programs, and initiatives that span defense, research, and commercial rails under one mission.",
  },
  {
    id: "llc",
    icon: Briefcase,
    name: "Mycosoft LLC",
    summary:
      "Operating company for engineering, contracts, sales, and delivery — where hardware programs, software releases, and customer engagements are executed day to day.",
  },
  {
    id: "dao",
    icon: Coins,
    name: "MycoDAO",
    summary:
      "Ecological and community-aligned layer — participatory funding, restoration and science-adjacent programs, and mission work that extends beyond classic corporate boundaries.",
    href: "https://mycodao.com",
    external: true,
  },
  {
    id: "affiliated",
    icon: Network,
    name: "Subsidiaries & partners",
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
    description:
      "Classified-adjacent discipline, FUSARIUM-grade workflows, OEI and CREP integrations — governed intelligence from sensor to admissible artifact.",
    href: "/defense/fusarium",
  },
  {
    id: "science",
    icon: FlaskConical,
    title: "Scientists & institutions",
    description:
      "Ground-truth field biology, climate and biodiversity programs, and reproducible pipelines — MINDEX-backed context and sensor-native datasets.",
    href: "/science",
  },
  {
    id: "agents",
    icon: Bot,
    title: "Builders & autonomous agents",
    description:
      "Developers and always-on MYCA workloads — skills, APIs, MAS agents, and automated loops that ship code, run checks, and operate infrastructure without waiting on manual queues.",
    href: "/myca",
  },
  {
    id: "civil",
    icon: Globe,
    title: "Civil & enterprise platforms",
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
      { name: "MINDEX", description: "Global fungal species intelligence database", href: "/search" },
      { name: "AI Studio", description: "MYCA agent orchestration & model training", href: "/natureos/ai-studio" },
    ],
  },
  {
    title: "Intelligence",
    icon: Activity,
    apps: [
      { name: "OEI Dashboard", description: "Operational environmental threat intelligence", href: "/defense/oei" },
      { name: "CREP", description: "Continuous real-time environmental perception", href: "/crep" },
      { name: "FUSARIUM", description: "Integrated defense & biosecurity system", href: "/defense/fusarium" },
    ],
  },
  {
    title: "Science",
    icon: FileCode,
    apps: [
      { name: "Fungi Compute", description: "Biological computing visualization", href: "/natureos/fungi-compute" },
      { name: "Mycorrhizae Protocol", description: "Device telemetry & sensor mesh standard", href: "/protocols/mycorrhizae" },
      { name: "Earth Simulator", description: "Climate and ecosystem simulation", href: PUBLIC_TOOL_HREFS.earthSimulator },
    ],
  },
]

export default function AboutPage() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh">
      {/* Hero — NAS MP4 base + optional YouTube overlay (@Mycosoft) */}
      <section className="relative min-h-[80dvh] flex items-center justify-center overflow-hidden" data-over-video>
        {ABOUT_HERO_VIDEO_SOURCES[0] ? (
          <AutoplayVideo
            src={ABOUT_HERO_VIDEO_SOURCES[0]}
            sources={ABOUT_HERO_VIDEO_SOURCES}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            encodeSrc
          />
        ) : null}
        {!prefersReducedMotion ? (
          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            <YoutubeHeroBackground videoId={ABOUT_HERO_YOUTUBE_ID} />
          </div>
        ) : null}

        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-black/60" />
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />

        {/* Content */}
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 text-center">
          <NeuBadge variant="success" className="mb-6">
            Est. 2021 · San Diego, CA
          </NeuBadge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
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
              <NeuButton variant="success" className="gap-2 min-h-[44px] px-6 py-3">
                Explore Devices
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
            <Link href="#about">
              <NeuButton variant="default" className="gap-2 min-h-[44px] px-6 py-3 border-gray-900/30 dark:border-white/30 about-hero-learn-more">
                Learn More
                <ArrowRight className="h-4 w-4" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      {/* The data sensor replaces the data center */}
      <section className="py-16 md:py-24 border-b border-border/60">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <NeuBadge variant="default" className="mb-4">Strategy</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Data Sensor Replaces the Data Center</h2>
          </div>
          <div className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
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
        className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-emerald-50/70 via-background to-muted/50 dark:from-[#031927] dark:via-[#031927] dark:to-[#020f14] border-y border-border/60 dark:border-transparent"
      >
        {/* Particle animation — tuned for dark bg; subtle on light */}
        <div className="absolute inset-0 pointer-events-none">
          <ParticleCanvas variant="auto" className="absolute inset-0 w-full h-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/30 dark:from-[#031927]/55 dark:via-transparent dark:to-[#031927]/55 pointer-events-none" />

        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border-border dark:border-white/20 about-mycosoft-badge">
              About Mycosoft
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">Building the Earth Computer</h2>
            <p className="text-green-700 dark:text-green-400 font-medium text-lg">
              Turn reality into data — then data into intelligence
            </p>
          </div>

          {/* Opening */}
          <div className="max-w-3xl mx-auto mb-16 text-center space-y-5">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Mycosoft is building systems that discover information in the world, not only refine what already exists on the internet. Our data sensors observe reality independently; when networked, they produce new ground truth for science, infrastructure, and defense.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We integrate physical sensing, edge compute, mesh protocols, cryptographic data layers, and governed AI so that environmental and biological signals become durable intelligence — not one-off telemetry, but a living data fabric.
            </p>
          </div>

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
                    className="flex gap-3 p-3 rounded-xl border border-border bg-muted/60 backdrop-blur-sm hover:bg-muted hover:border-green-600/35 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60 dark:hover:border-green-500/30 transition-all"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-green-600/15 dark:bg-green-500/15">
                      <Icon className="h-4 w-4 text-green-700 dark:text-green-400" />
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
                <span className="text-green-700 dark:text-green-400 font-medium">NatureOS</span> for civilian environmental intelligence and{" "}
                <span className="text-green-700 dark:text-green-400 font-medium">FUSARIUM</span> for defense-grade deployment, alongside{" "}
                <span className="text-green-700 dark:text-green-400 font-medium">OEI</span> where live CREP and edge sensing meet mission workflows.
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
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/40 backdrop-blur-sm hover:bg-muted/70 hover:border-green-600/35 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-green-500/30 transition-all"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Philosophy + Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-green-600/25 bg-green-600/5 backdrop-blur-sm dark:border-green-500/30 dark:bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="h-5 w-5 text-green-700 dark:text-green-400" />
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
                <Globe className="h-5 w-5 text-green-700 dark:text-green-400" />
                <h3 className="font-bold text-lg text-foreground">Our Mission</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>To build the Earth computer by deploying a global network of data sensors that replace outdated center-only thinking. We generate new ground truth, train AI on live environmental data, and unlock a new paradigm of distributed intelligence.</p>
                <p>This is not only environmental monitoring — it is infrastructure for truth in the biosphere.</p>
                <p className="text-green-700 dark:text-green-400 font-bold text-base">
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
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <layer.icon className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{layer.title}</h3>
                    <p className="text-sm text-muted-foreground">{layer.subtitle}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm flex-grow mb-4">{layer.description}</p>
                <div className="flex flex-wrap gap-2">
                  {layer.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <NeuButton variant="default" className="p-0 h-auto text-green-500 hover:text-green-400 bg-transparent shadow-none">
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
      <section className="py-16 md:py-24 bg-muted/30 border-y border-border/60">
        <div className="container max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <NeuBadge variant="default" className="mb-4">Sensing</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Biological Integration</h2>
          </div>
          <NeuCard className="p-6 md:p-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Fungi are not our only focus; they are the <span className="text-foreground font-semibold">missing layer</span>. Mycelium acts as a distributed sensing and signalling network — responding to environmental stimuli and transmitting electrical and chemical signals across ecosystems.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The same nodes fuse conventional modalities: <span className="text-foreground font-medium">hydrophones</span>,{" "}
              <span className="text-foreground font-medium">radar</span>, <span className="text-foreground font-medium">VOC</span>{" "}
              (volatile organic compound) sensing, <span className="text-foreground font-medium">particle counters</span>,{" "}
              <span className="text-foreground font-medium">Geiger</span> radiation detection,{" "}
              <span className="text-foreground font-medium">Wi‑Fi sense</span>, <span className="text-foreground font-medium">vibration</span>,{" "}
              <span className="text-foreground font-medium">temperature and humidity</span>, plus acoustic, optical, thermal, and mechanical channels — and{" "}
              <span className="text-foreground font-semibold">fungal biological interfaces (FCI)</span> as an extra layer. Fungi are not the product or limitation; they expand what sensing can be.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/natureos/fungi-compute">
                <NeuButton variant="success" className="min-h-[44px]">
                  Fungi Compute
                </NeuButton>
              </Link>
              <Link href="/devices/mycobrain/integration/fci">
                <NeuButton variant="default" className="min-h-[44px]">
                  FCI
                </NeuButton>
              </Link>
            </div>
          </NeuCard>
        </div>
      </section>

      {/* Devices Grid — data-over-video: sharper outline in light mode */}
      <section className="relative py-16 md:py-24 overflow-hidden" style={{ backgroundColor: "#020c06" }} data-over-video>
        {/* Neural network background — lazy starts on scroll */}
        <NeuralNetworkCanvas className="absolute inset-0 w-full h-full" />
        {/* Vignette to keep device cards readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020c06]/50 via-transparent to-[#020c06]/50 pointer-events-none" />

        <div className="relative z-10 container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border-white/20 about-hardware-badge">Hardware</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 !text-white">Our Devices</h2>
            <p className="!text-white/80 max-w-2xl mx-auto">
              Edge data-center nodes in the field — Mushroom 1, SporeBase, MycoNode, Hyphae 1, ALARM, plus Psathyrella as those programs ship. Each bridges biological and digital worlds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DEVICES.map((device) => (
              <Link key={device.id} href={`/devices/${device.id}`}>
                <NeuCard className="about-device-card group transition-all cursor-pointer h-full bg-black/50 backdrop-blur-sm">
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
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <category.icon className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="font-bold text-lg">{category.title}</h3>
                </div>
                <div className="space-y-3">
                  {category.apps.map((app) => (
                    <Link key={app.href} href={app.href} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-sm group-hover:text-green-500 transition-colors">{app.name}</p>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
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

          <div className="mb-14 md:mb-16">
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
                    className={`p-6 h-full flex flex-col transition-all ${entity.href ? "hover:border-green-500/35" : ""}`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-green-500/10 shrink-0">
                        <entity.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{entity.summary}</p>
                  </NeuCard>
                )
                if (entity.href && entity.external) {
                  return (
                    <a
                      key={entity.id}
                      href={entity.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

          <div className="mb-14 md:mb-16">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">Who we serve</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Same platforms and agents — different admission, compliance posture, and operator workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {organizationAudiences.map((audience) => (
                <Link key={audience.id} href={audience.href} className="block h-full group">
                  <NeuCard className="p-6 h-full flex flex-col transition-all hover:border-green-500/35">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-3 rounded-xl bg-green-500/10 shrink-0">
                        <audience.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-lg group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {audience.title}
                        </h4>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:text-green-500 transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{audience.description}</p>
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
                <NeuCard key={stream.id} className="p-6 h-full flex flex-col border-green-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <stream.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
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
              <NeuButton variant="success" className="gap-2 min-h-[44px] w-full sm:w-auto">
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
        {/* Subtle green tint layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/40 via-transparent to-black/40" />

        <div className="container max-w-4xl mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center">
            <NeuBadge variant="default" className="mb-4 border-white/20 text-white">The Future</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 !text-white">
              The Data Center
              <br />
              <span className="text-green-400">Dissolves Into the World</span>
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
      <section className="py-16 md:py-24 bg-green-600 relative overflow-hidden" data-over-video>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Join the Earth Computer
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Researchers, developers, defense operators, and builders — deploy sensors, open the stack, and train on the planet, not only the crawl.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/devices">
              <NeuButton variant="success" className="gap-2 min-h-[44px] px-6 py-3">
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
      </section>
    </div>
    </NeuromorphicProvider>
  )
}
