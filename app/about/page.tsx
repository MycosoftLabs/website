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
import { ParticleCanvas } from "@/components/effects/particle-canvas"
import { NeuralNetworkCanvas } from "@/components/effects/neural-network-canvas"
import { teamMembers } from "@/lib/team-data"
import { DEVICES } from "@/lib/devices"
import {
  ArrowRight,
  Brain,
  Shield,
  ChevronRight,
  ExternalLink,
  CircuitBoard,
  Server,
  Activity,
  FileCode,
  Leaf,
  Cpu,
  Globe,
  Zap,
} from "lucide-react"

// NAS video — mounted at /assets/ in the production Docker container
const HERO_VIDEO_SRC = "/assets/about us/Mycosoft Commercial 1.mp4"
// Fallback poster shown in local dev (NAS not mounted) or while video buffers
const HERO_POSTER = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rs=w_1160,h_663-ESVi80C1sa4fkioBNtFcVtPlY1TkSq.webp"

// Technology Pillars - AI, Defense, Biological Compute
const technologyPillars = [
  {
    id: "ai",
    icon: Brain,
    title: "Enviornmental Intelligence",
    subtitle: "MYCA & NLM",
    description: "MYCA is our multi-agent cognitive system — 117+ specialized agents managing research, analysis, infrastructure, and scientific discovery. The Nature Learning Model (NLM) processes environmental and ecological data to predict biological events with machine precision.",
    links: [
      { label: "AI Studio", href: "/natureos/ai-studio" },
      { label: "MYCA Chat", href: "/myca-ai" },
    ],
  },
  {
    id: "defense",
    icon: Shield,
    title: "Defense & Intelligence",
    subtitle: "OEI & FUSARIUM",
    description: "Operational Environmental Intelligence (OEI) provides persistent, real-time biological threat assessment from soil to airspace. FUSARIUM unifies CREP data streams, edge sensors, and AI inference into a defense-grade situational awareness platform.",
    links: [
      { label: "OEI", href: "/defense/oei" },
      { label: "FUSARIUM", href: "/defense/fusarium" },
    ],
  },
  {
    id: "biocompute",
    icon: CircuitBoard,
    title: "Biological Computing",
    subtitle: "FCI, HPL & Fungi Compute",
    description: "The Fungal Computer Interface (FCI) bridges living mycelial networks to digital systems via the MycoBrain edge module. Hyphae Programming Language (HPL) enables direct instruction of fungal processes. Fungi Compute visualizes biological computation in real time.",
    links: [
      { label: "FCI", href: "/devices/mycobrain/integration/fci" },
      { label: "Fungi Compute", href: "/natureos/fungi-compute" },
    ],
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
      { name: "Earth Simulator", description: "Climate and ecosystem simulation", href: "/apps/earth-simulator" },
    ],
  },
]

export default function AboutPage() {
  // Filter team members: Morgan first, then the rest
  const morgan = teamMembers.find(m => m.slug === "morgan-rockwell")
  const coreTeam = teamMembers.filter(m => m.slug !== "morgan-rockwell")

  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh">
      {/* Hero Section — data-over-video: sharper outline in light mode */}
      <section className="relative min-h-[80dvh] flex items-center justify-center overflow-hidden" data-over-video>
        {/* Background video — silent loop, no controls */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={HERO_POSTER}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>

        {/* Fallback image (local dev / while buffering) */}
        <Image
          src={HERO_POSTER}
          alt="Mycelium network visualization"
          fill
          className="object-cover opacity-40 -z-10"
          priority
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />

        {/* Content */}
        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6 text-center">
          <NeuBadge variant="success" className="mb-6">
            Est. 2021 · San Diego, CA
          </NeuBadge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Mycelium
            </span>
            <br />
            <span className="text-white">
              Is The New Silicon
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Building the world&apos;s first biological computer by integrating fungal intelligence with modern technology.
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

      {/* Technology Pillars */}
      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4">Technology</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Pillars of Innovation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AI, Defense, and Biological Computing converging to create technology that grows rather than manufactures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {technologyPillars.map((pillar) => (
              <NeuCard key={pillar.id} className="p-6 transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <pillar.icon className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{pillar.title}</h3>
                    <p className="text-sm text-muted-foreground">{pillar.subtitle}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm flex-grow mb-4">{pillar.description}</p>
                <div className="flex flex-wrap gap-2">
                  {pillar.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <NeuButton variant="default" className="gap-1 p-0 h-auto text-green-500 hover:text-green-400 bg-transparent shadow-none">
                        {link.label} <ChevronRight className="h-3 w-3" />
                      </NeuButton>
                    </Link>
                  ))}
                </div>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* About Mycosoft — Nature Compute Manifesto */}
      <section
        id="about"
        className="relative py-16 md:py-24 overflow-hidden"
        style={{ backgroundColor: "#031927" }}
      >
        {/* Particle animation background */}
        <ParticleCanvas className="absolute inset-0 w-full h-full" />
        {/* Subtle dark vignette so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#031927]/60 via-transparent to-[#031927]/60 pointer-events-none" />

        <div className="relative z-10 container max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 border-white/20 about-mycosoft-badge">About Mycosoft</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">Building the Earth Computer</h2>
            <p className="text-green-400 font-medium text-lg">Nature Compute — where biological intelligence meets modern systems</p>
          </div>

          {/* Opening */}
          <div className="max-w-3xl mx-auto mb-16 text-center space-y-5">
            <p className="text-lg text-white/70 leading-relaxed">
              Beneath our feet exists the largest distributed network on Earth: mycelium. These fungal networks sense, communicate, adapt, and respond to environmental change in real time — processing information across thousands of kilometers through chemical and bioelectric signals that predate silicon by 700 million years.
            </p>
            <p className="text-lg text-white/70 leading-relaxed">
              Mycosoft designs the hardware, software, and AI systems that interface directly with these living networks — transforming biological signals into actionable intelligence. We are not replacing nature. We are learning to communicate with it.
            </p>
          </div>

          {/* What We Build */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16 items-center">

            {/* Glass card wrapping the whole "What We Build" column */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <h3 className="text-2xl font-bold mb-3 text-white">What We Build</h3>
              <p className="text-white/75 mb-6 text-sm leading-relaxed">
                Mycosoft develops an integrated stack that spans physical hardware, edge computing, cloud platforms, and autonomous AI — purpose-built for environmental sensing and biological intelligence.
              </p>
              <div className="space-y-2">
                {[
                  { icon: Cpu, label: "Biological sensing hardware", desc: "Mushroom 1, MycoNode, SporeBase, ALARM, Hyphae 1" },
                  { icon: Zap, label: "Edge AI & mesh networks", desc: "MycoBrain compute module, Mycorrhizae Protocol, LoRa mesh" },
                  { icon: Globe, label: "NatureOS", desc: "Cloud environmental intelligence platform with AI orchestration" },
                  { icon: CircuitBoard, label: "Fungal Computer Interface (FCI)", desc: "Translates mycelial bioelectric signals into digital data streams" },
                  { icon: Brain, label: "MYCA", desc: "Autonomous multi-agent AI system — 117+ agents, 200+ API endpoints" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex gap-3 p-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm hover:bg-black/60 hover:border-green-500/30 transition-all"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-green-500/15">
                      <Icon className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{label}</p>
                      <p className="text-xs text-white/65">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/65 mt-4 pt-4 border-t border-white/10">
                Together, these systems create a persistent sensing layer across soil, air, and built environments — what we call <span className="text-green-400 font-medium">Operational Environmental Intelligence (OEI)</span>.
              </p>
            </div>

            {/* Glass card wrapping the whole "Why It Matters" column */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md">
              <h3 className="text-2xl font-bold mb-3 text-white">Why It Matters</h3>

              {/* Description block */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm mb-3">
                <p className="text-white/80 mb-4 text-sm leading-relaxed">
                  Modern sensing infrastructure monitors the sky and the surface. Almost no one monitors the biological layer below ground. Environmental degradation, contamination, biological threats, and infrastructure stress all manifest first in microbial and fungal ecosystems.
                </p>
                <p className="text-white/80 text-sm leading-relaxed">
                  Mycosoft provides the missing layer — continuous, in-situ biological telemetry — integrating with enterprise dashboards, defense systems, and scientific research platforms.
                </p>
              </div>

              {/* Bullet widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Early detection of environmental anomalies",
                  "Infrastructure resilience monitoring",
                  "Force protection & installation readiness",
                  "Agricultural & ecological intelligence",
                  "Climate-adaptive land management",
                  "Biosecurity & contamination response",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-green-500/30 transition-all"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-white/80 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Philosophy + Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-green-500/30 bg-green-500/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-lg text-white">Our Philosophy</h3>
              </div>
              <div className="space-y-3 text-sm text-white/60">
                <p>Technology should not dominate nature. It should understand it.</p>
                <p>Mycosoft is built on biological respect, decentralized intelligence, and ethical machine autonomy. Our systems are sustainable, low-power, biodegradable where possible, and aligned with environmental stewardship.</p>
                <p className="text-white font-medium">The future of computing is not purely silicon. It is hybrid — biological and digital.</p>
              </div>
            </div>
            <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-lg text-white">Our Mission</h3>
              </div>
              <div className="space-y-3 text-sm text-white/60">
                <p>To unlock Earth&apos;s computational layer and transform environmental signals into intelligence that protects ecosystems, strengthens infrastructure, and advances scientific discovery.</p>
                <p>This is not just environmental monitoring.</p>
                <p>This is a new intelligence domain.</p>
                <p className="text-green-400 font-bold text-base">This is Nature Compute.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4">Our Team</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Leadership & Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Human expertise and artificial intelligence working together.
            </p>
          </div>

          {/* Morgan + MYCA Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Morgan Rockwell */}
            {morgan && (
              <Link href={`/about/team/${morgan.slug}`}>
                <NeuCard className="group transition-all cursor-pointer overflow-hidden h-full">
                  <div className="grid md:grid-cols-2 h-full">
                    <div className="relative aspect-square md:aspect-auto min-h-[250px] bg-slate-100 overflow-hidden">
                      <Image
                        src={morgan.image}
                        alt={morgan.name}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <NeuCardContent className="p-6 flex flex-col justify-center">
                      <NeuBadge variant="success" className="mb-2 w-fit">
                        Founder & CEO
                      </NeuBadge>
                      <h3 className="text-2xl font-bold mb-2">{morgan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Pioneer in fungal-computer integration. Founded Mycosoft in 2021 in San Diego to connect living mycelium to digital systems. Architect of NatureOS, MYCA, OEI, and the FUSARIUM defense platform.
                      </p>
                    </NeuCardContent>
                  </div>
                </NeuCard>
              </Link>
            )}

            {/* MYCA AI */}
            <Link href="/natureos/ai-studio">
              <NeuCard className="group transition-all cursor-pointer overflow-hidden h-full bg-gradient-to-br from-purple-950/20 to-background">
                <div className="grid md:grid-cols-2 h-full">
                  <div className="relative aspect-square md:aspect-auto min-h-[250px] flex items-center justify-center bg-black overflow-hidden">
                    <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                      <Image
                        src="/assets/logos/myca-logo-square.png"
                        alt="MYCA Logo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <NeuCardContent className="p-6 flex flex-col justify-center">
                    <NeuBadge variant="primary" className="mb-2 w-fit">
                      AI System
                    </NeuBadge>
                    <h3 className="text-2xl font-bold mb-2">MYCA</h3>
                    <p className="text-sm text-muted-foreground">
                      Mycosoft Cognitive Assistant. 117+ specialized agents, 200+ API endpoints — operating 24/7 across research, analysis, infrastructure, and autonomous science.
                    </p>
                  </NeuCardContent>
                </div>
              </NeuCard>
            </Link>
          </div>

          {/* Core Team — badge and name below image, not over it */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreTeam.map((member) => (
              <Link key={member.slug} href={`/about/team/${member.slug}`}>
                <NeuCard className="group transition-all cursor-pointer overflow-hidden h-full">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-slate-100">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <NeuCardContent className="p-4">
                    <NeuBadge variant="success" className="mb-2 text-xs">
                      {member.role}
                    </NeuBadge>
                    <h3 className="text-lg font-bold">{member.name}</h3>
                  </NeuCardContent>
                </NeuCard>
              </Link>
            ))}
          </div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Our Devices</h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Five devices bridging biological and digital worlds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DEVICES.map((device) => (
              <Link key={device.id} href={`/devices/${device.id}`}>
                <NeuCard className="about-device-card group transition-all cursor-pointer h-full bg-black/50 backdrop-blur-sm">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={device.image}
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
              Platforms, intelligence systems, and scientific tools.
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

      {/* Why Mycosoft - Closing Statement — data-over-video */}
      <section className="relative py-16 md:py-24 overflow-hidden min-h-[60vh] flex items-center" data-over-video>
        {/* Background video — silent loop */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/assets/about us/10343918-hd_1920_1080_24fps.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay so text is legible */}
        <div className="absolute inset-0 bg-black/65" />
        {/* Subtle green tint layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/40 via-transparent to-black/40" />

        <div className="container max-w-4xl mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center">
            <NeuBadge variant="default" className="mb-4 border-white/20 text-white">Why Mycosoft</NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              The Only Company Building
              <br />
              <span className="text-green-400">Biological Computers</span>
            </h2>

            <div className="space-y-6 text-lg text-white/90 leading-relaxed">
              <p>
                No other company has built hardware that interfaces directly with living fungal networks. No other company has deployed a persistent mycelial sensor mesh at scale. No other company has a decade of original research connecting biological signaling to digital computation.
              </p>
              <p>
                Mycosoft exists because the future of computing must grow rather than manufacture. Silicon requires rare earth mining, toxic fabrication, and massive energy consumption. Mycelium requires substrate, patience, and respect for living systems.
              </p>
              <p className="text-white font-medium">
                We are foundational to sustainable computing, environmental defense, and the emerging field of biological intelligence. The next century of technology will be built on what we are growing today.
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
            Join the Nature Compute Revolution
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Whether you're a researcher, developer, defense professional, or enthusiast — the biological intelligence era has begun.
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
