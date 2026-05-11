"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import {
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuButton,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import {
  Download, Play,
  Antenna, Radio, Wifi, Network, Shield, Zap, Eye, Thermometer,
  Droplets, Wind, Activity, Globe, Trees, Microscope, Database,
  Cpu, Battery, Signal, Lock, Cloud, Leaf, AlertTriangle, Check,
  ExternalLink, Youtube, Cable, FileText,
  Waves, Ship, Radar,
} from "lucide-react"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { InstantHeroVideo } from "@/components/ui/instant-hero-video"
import { assetMp4Sources, mergeWithNasFallbacks, deviceHeroVideoSources } from "@/lib/asset-video-sources"
import { DEVICES } from "@/lib/devices"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { TechnologyMeshCanvas } from "@/components/effects/technology-mesh-canvas"
import { PsathyrellaSonarCanvas } from "@/components/effects/psathyrella-sonar-canvas"
const PsathyrellaMaritimeDeploymentMap = dynamic(
  () =>
    import("@/components/devices/psathyrella-maritime-deployment-map").then((m) => ({
      default: m.PsathyrellaMaritimeDeploymentMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[320px] items-center justify-center rounded-2xl border border-sky-500/25 bg-slate-950/40 sm:min-h-[400px]"
        aria-hidden
      >
        <div className="flex gap-1">
          <span className="size-1.5 animate-pulse rounded-full bg-sky-400/70" />
          <span className="size-1.5 animate-pulse rounded-full bg-sky-400/70 [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-sky-400/70 [animation-delay:300ms]" />
        </div>
      </div>
    ),
  },
)
import { NetworkCanvas } from "@/components/effects/network-canvas"
import { PsathyrellaWaveTitle } from "@/components/devices/psathyrella-wave-title"
interface SelectedVideo {
  kind: "youtube" | "mp4"
  src: string
  title: string
}

// ============================================================================
// Psathyrella — cloned layout from Mushroom 1; media under public/assets/psathyrella/
// Canonical copy in lib/devices (id: psathyrella). Edit there to tune specs/features.
// ============================================================================
const PSATHYRELLA_DEVICE = DEVICES.find((d) => d.id === "psathyrella")!
const PSATHYRELLA_HERO =
  "/assets/psathyrella/psathyrella-hero-2026.mp4"
const PSATHYRELLA_HERO_FALLBACK =
  PSATHYRELLA_DEVICE.video ?? "/assets/psathyrella/psathyrella-hero.mp4"
const PSATHYRELLA_HERO_YOUTUBE = "RYelhYjPNts"
const PSATHYRELLA_HERO_YOUTUBE_URL = `https://www.youtube.com/watch?v=${PSATHYRELLA_HERO_YOUTUBE}`

const PSATHYRELLA_ASSETS = {
  images: [
    {
      src: PSATHYRELLA_DEVICE.image,
      alt: `${PSATHYRELLA_DEVICE.name} product render`,
      location: "Product",
    },
    ...PSATHYRELLA_DEVICE.detailedFeatures.map((df, i) => ({
      src: df.image,
      alt: df.title,
      location: `Detail ${i + 1}`,
    })),
  ],
  videos: {
    background: PSATHYRELLA_HERO,
    walking: PSATHYRELLA_HERO,
    waterfall: PSATHYRELLA_HERO,
    demo: PSATHYRELLA_HERO,
    promo: PSATHYRELLA_HERO,
  },
  youtubeVideos: [] as { id: string; title: string }[],
}

const USE_CASE_COLORS = [
  { color: "from-sky-500 to-cyan-500", colorDark: "dark:from-sky-800 dark:to-cyan-800" },
  { color: "from-indigo-500 to-sky-700", colorDark: "dark:from-indigo-800 dark:to-sky-900" },
  { color: "from-slate-600 to-slate-900", colorDark: "dark:from-slate-700 dark:to-slate-900" },
] as const

const USE_CASE_ICONS = [Waves, Network, Microscope] as const

/** Applications panel imagery — one per detailed-feature row (deployment → stack → integrity). */
const PSATHYRELLA_APPLICATION_IMAGES = [
  {
    src: "/assets/psathyrella/applications-wide-deployment.png",
    alt:
      "Psathyrella-M split-level deployment — buoy with solar ring and submerged hydrophone in clear ocean water",
  },
  {
    src: "/assets/psathyrella/applications-acoustic-sphere.png",
    alt:
      "Psathyrella acoustic sphere — exposed internals with PCB, cooling fan, sensor ports, and acoustic transducers",
  },
  {
    src: "/assets/psathyrella/applications-internals-ring.png",
    alt:
      "Psathyrella-M circular hull interior — compute assembly, thermal management, power module, and ruggedized ring chassis",
  },
] as const

const USE_CASES = PSATHYRELLA_DEVICE.detailedFeatures.map((df, i) => {
  const img =
    PSATHYRELLA_APPLICATION_IMAGES[
      Math.min(i, PSATHYRELLA_APPLICATION_IMAGES.length - 1)
    ]
  return {
    title: df.title,
    icon: USE_CASE_ICONS[Math.min(i, USE_CASE_ICONS.length - 1)],
    ...USE_CASE_COLORS[Math.min(i, USE_CASE_COLORS.length - 1)],
    description: df.description,
    applications: df.bulletPoints,
    image: img.src,
    imageAlt: img.alt,
    video:
      i === 0
        ? assetMp4Sources("/assets/psathyrella/psathyrellatower.mp4")[0]
        : i === 1
          ? "/assets/psathyrella/psathyrellaclose.mp4"
          : null,
  }
})

const SENSORS = PSATHYRELLA_DEVICE.features.map((f) => ({
  name: f.title,
  icon: f.icon,
  specs: [f.description],
}))

/** Program positioning under Technology — not duplicated in lib/devices features list */
const TECHNOLOGY_PROGRAM_BOXES: {
  name: string
  icon: LucideIcon
  specs: string[]
}[] = [
  {
    name: "U.S. Navy integration",
    icon: Ship,
    specs: [
      "Architecture aligned with maritime domain awareness and littoral operational workflows.",
      "Contacts and telemetry lift into CREP, FUSARIUM, and MINDEX-backed provenance for coalition-style COP and audit.",
    ],
  },
  {
    name: "Weapons, propellers & sea life",
    icon: Radar,
    specs: [
      "Passive acoustic discrimination for weapons-related transients and broadband events where mission libraries apply.",
      "Propeller and machinery-line cues for surface and subsurface vessel contacts.",
      "Biologic and ambient signatures to separate marine mammals and natural chorus from target-class contacts.",
    ],
  },
]

const NETWORK_FEATURES = [
  {
    icon: Radio,
    title: "Multi-path mesh",
    description: PSATHYRELLA_DEVICE.specifications["Mesh & backhaul"] ?? "LoRa, satellite, acoustic modem",
  },
  {
    icon: Cpu,
    title: "Edge AI",
    description: PSATHYRELLA_DEVICE.specifications["Edge AI"] ?? "Jetson-class inference at the buoy",
  },
  {
    icon: Waves,
    title: "Hydrophone stack",
    description: PSATHYRELLA_DEVICE.specifications.Hydrophone ?? "Broadband passive acoustics",
  },
  {
    icon: Shield,
    title: "AVANI + integrity",
    description: "Governance and cryptographic provenance on inference outputs",
  },
]

const MISSION_STATS = [
  { value: "200 m", label: "Depth target" },
  { value: "Orin Nano", label: "Edge AI" },
  { value: "Mesh", label: "Mycorrhizae" },
  { value: "NLM", label: "Acoustic core" },
] as const

/** Split-view Psathyrella-M surface / subsurface — Connectivity hero */
const CONNECTIVITY_HERO_IMAGE = "/assets/psathyrella/connectivity-hero-wide2.png"

const PSATHYRELLA_MISSION_IMAGE = {
  src: "/assets/psathyrella/mission-psathyrella-m.png",
  alt:
    "Psathyrella-M marine buoy — solar ring, mast sensors, and subsurface hydrophone in clear blue water",
}

export function PsathyrellaDetails() {
  const [activeUseCase, setActiveUseCase] = useState(0)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const heroSources = mergeWithNasFallbacks([
    ...deviceHeroVideoSources(PSATHYRELLA_HERO),
    ...deviceHeroVideoSources(PSATHYRELLA_HERO_FALLBACK),
  ])

  const missionParagraphs = PSATHYRELLA_DEVICE.description
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  const specEntries = Object.entries(PSATHYRELLA_DEVICE.specifications)
  const specHalf = Math.ceil(specEntries.length / 2)
  const specificationColumns = [
    specEntries.slice(0, specHalf),
    specEntries.slice(specHalf),
  ]

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  const openVideoModal = (videoId: string) => {
    setSelectedVideo({ kind: "youtube", src: videoId, title: "Psathyrella Video" })
    setIsVideoModalOpen(true)
  }

  const openMp4Modal = (videoSrc: string, title: string) => {
    setSelectedVideo({ kind: "mp4", src: videoSrc, title })
    setIsVideoModalOpen(true)
  }

  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      {/* Hero Section - Fullscreen Video — data-over-video for neuromorphic theme consistency */}
      <motion.section 
        ref={heroRef}
        className="psathyrella-hero relative h-screen w-full overflow-hidden"
        style={{ opacity: heroOpacity }}
        data-over-video
      >
        {/* Background Video — keep the full exported frame visible without scroll zoom/crop */}
        <motion.div className="absolute inset-0 overflow-hidden">
          <InstantHeroVideo
            mp4Src={heroSources[0] ?? PSATHYRELLA_HERO}
            youtubeId={PSATHYRELLA_HERO_YOUTUBE}
            poster={PSATHYRELLA_DEVICE.image}
            className="absolute inset-0"
            videoClassName="!inset-0 !h-full !w-full !object-cover"
            posterClassName="!inset-0 !h-full !w-full !object-cover"
            mp4StartTimeoutMs={8000}
            nasProbeTimeoutMs={700}
          />
          <div className="psathyrella-hero-overlay absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
        </motion.div>

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center"
          style={{ y: textY }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <NeuBadge
              variant="default"
              className="device-hero-badge mb-4 border-sky-500/50 bg-sky-500/15 text-sm px-4 py-1 text-sky-900 dark:bg-sky-500/20 dark:text-sky-400"
            >
              Marine Drone
            </NeuBadge>
          </motion.div>
          
          <motion.h1
            className="device-hero-title mb-4 w-full flex justify-center px-2"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <PsathyrellaWaveTitle
              title={PSATHYRELLA_DEVICE.name}
              className="scale-[1.35] sm:scale-150 md:scale-[1.65] lg:scale-[1.85] origin-center"
            />
          </motion.h1>
          
          <motion.p 
            className="device-hero-subtitle text-xl md:text-2xl lg:text-3xl text-slate-900 dark:text-white/80 mb-8 max-w-4xl mx-auto px-2 font-light leading-snug"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            <span className="text-sky-800 dark:text-sky-400">{PSATHYRELLA_DEVICE.videoTitle}</span>
          </motion.p>

          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <a
              href={PSATHYRELLA_HERO_YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch the Psathyrella hero video on YouTube"
            >
            <NeuButton 
              className="device-cta-over-video min-h-[44px] px-8 bg-sky-500 hover:bg-sky-600 !text-black font-semibold"
            >
              <Youtube className="mr-2 h-5 w-5" />
              Watch Film
            </NeuButton>
            </a>
            <NeuButton
              variant="default"
              className="device-cta-over-video-outline min-h-[44px] px-8 border border-slate-900/35 hover:bg-slate-900/10 dark:border-white/30 dark:hover:bg-white/10"
              onClick={() => router.push("/devices/specifications")}
            >
              <FileText className="mr-2 h-5 w-5" />
              Specifications
            </NeuButton>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="psathyrella-hero-scroll-hint flex h-10 w-6 items-start justify-center rounded-full border-2 border-slate-900/35 p-2 dark:border-white/30">
              <motion.div 
                className="psathyrella-hero-scroll-dot h-2 w-1 rounded-full bg-slate-900/55 dark:bg-white/60"
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Mission — copy sources from lib/devices (Psathyrella) */}
      <section className="psathyrella-mission py-24 px-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30">Our Mission</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              Why <span className="text-sky-600 dark:text-sky-400">{PSATHYRELLA_DEVICE.name}</span> Exists
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {missionParagraphs.map((para, i) => (
                <p key={i} className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                  {para}
                </p>
              ))}
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                <span className="text-sky-600 dark:text-sky-400 font-semibold">{PSATHYRELLA_DEVICE.videoTitle}</span>
                {" — "}
                {PSATHYRELLA_DEVICE.videoDescription}
              </p>

              <div className="flex flex-wrap gap-6 pt-4 justify-between sm:justify-start">
                {MISSION_STATS.map((s) => (
                  <div key={s.label} className="text-center min-w-[4.5rem]">
                    <div className="text-3xl sm:text-4xl font-bold text-sky-600 dark:text-sky-400">{s.value}</div>
                    <div className="text-sm text-slate-500 dark:text-white/60">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-sky-500/20">
                <Image
                  src={encodeAssetUrl(PSATHYRELLA_MISSION_IMAGE.src)}
                  alt={PSATHYRELLA_MISSION_IMAGE.alt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
              {/* Floating feature badges */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-sky-500/20 backdrop-blur-sm border border-sky-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-sky-400" />
                  <span className="text-sm">Passive acoustics</span>
                </div>
              </motion.div>
              <motion.div 
                className="absolute -bottom-4 -left-4 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">Mesh Network</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sensor Capabilities */}
      <section className="psathyrella-technology relative py-24 overflow-hidden bg-slate-100 text-slate-900 dark:bg-black dark:text-white">
        <TechnologyMeshCanvas className="opacity-[0.85] dark:opacity-90" />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge
              variant="default"
              className="mb-4 bg-cyan-500/15 text-cyan-800 border-cyan-600/25 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40"
            >
              Technology
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Autonomous AI{" "}
              <span className="text-cyan-700 dark:text-cyan-400">Buoy</span>
            </h2>
            <p className="text-xl text-slate-900 dark:text-white/70 max-w-3xl mx-auto leading-relaxed">
              {PSATHYRELLA_DEVICE.tagline}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...SENSORS, ...TECHNOLOGY_PROGRAM_BOXES].map((sensor, i) => (
              <motion.div
                key={sensor.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <NeuCard className="psathyrella-sensor-card bg-white/85 backdrop-blur-md border-slate-200 hover:border-cyan-500/40 dark:bg-gray-950/70 dark:border-white/10 dark:hover:border-cyan-500/50 transition-colors h-full">
                  <NeuCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/15">
                        <sensor.icon className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
                      </div>
                      <h3 className="text-slate-900 dark:text-white font-semibold">{sensor.name}</h3>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <ul className="space-y-2">
                      {sensor.specs.map((spec, j) => (
                        <li
                          key={j}
                          className="flex items-center gap-2 text-slate-600 dark:text-white/75 text-sm"
                        >
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                          {spec}
                        </li>
                      ))}
                    </ul>
                  </NeuCardContent>
                </NeuCard>
              </motion.div>
            ))}
          </div>

          {/* Network Features */}
          <div className="mt-16 grid md:grid-cols-4 gap-6">
            {NETWORK_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="psathyrella-network-card text-center p-6 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200 dark:bg-gray-950/60 dark:border-white/10"
              >
                <div className="inline-flex p-4 rounded-full bg-sky-500/15 dark:bg-sky-500/15 mb-4">
                  <feature.icon className="h-8 w-8 text-sky-700 dark:text-sky-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-white/65 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="psathyrella-applications relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        <PsathyrellaSonarCanvas className="opacity-[0.92] dark:opacity-95" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30">
              Deployment
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Deployed in all waters
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              {PSATHYRELLA_DEVICE.name} is aimed at contested littorals and heavy traffic lanes — passive acoustics,
              mesh handoff, and edge inference where fleet presence, merchant traffic, and seabed infrastructure meet.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Use case selector */}
            <div className="space-y-4">
              {USE_CASES.map((useCase, i) => (
                <motion.div
                  key={useCase.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveUseCase(i)}
                  className={`psathyrella-usecase-card cursor-pointer p-6 rounded-xl border transition-all ${
                    activeUseCase === i 
                      ? 'bg-gradient-to-r ' + useCase.color + ' ' + useCase.colorDark + ' border-white/20 text-white' 
                      : 'bg-white/80 dark:!bg-gray-800 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-gray-700/90'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${activeUseCase === i ? 'bg-white/20' : 'bg-slate-100 dark:bg-gray-600'}`}>
                      <useCase.icon className={`h-6 w-6 ${activeUseCase === i ? 'text-white' : 'text-slate-900 dark:text-white'}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${activeUseCase === i ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{useCase.title}</h3>
                      {activeUseCase === i && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-white/80 mt-2"
                        >
                          {useCase.description}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  {activeUseCase === i && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 flex flex-wrap gap-2"
                    >
                      {useCase.applications.map((app) => (
                        <NeuBadge
                          key={app}
                          variant="default"
                          className="bg-gray-900/80 border-white/20 text-white dark:bg-black/60 dark:border-white/20"
                        >
                          {app}
                        </NeuBadge>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Active use case imagery */}
            <motion.div
              key={activeUseCase}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10"
            >
              {USE_CASES[activeUseCase].video ? (
                <AutoplayVideo
                  src={USE_CASES[activeUseCase].video ?? undefined}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  preload="metadata"
                  encodeSrc
                />
              ) : (
                <Image
                  src={encodeAssetUrl(USE_CASES[activeUseCase].image)}
                  alt={USE_CASES[activeUseCase].imageAlt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white drop-shadow-sm">{USE_CASES[activeUseCase].title}</h3>
                <p className="mt-2 text-white/85 drop-shadow-sm">{USE_CASES[activeUseCase].description}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {PSATHYRELLA_ASSETS.youtubeVideos.length > 0 ? (
        <section className="psathyrella-watch py-24 bg-[#C5CFC6] dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <NeuBadge variant="default" className="mb-4 bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30">
                <Youtube className="h-4 w-4 mr-1" />
                Watch
              </NeuBadge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
                Official <span className="text-sky-600 dark:text-sky-400">Videos</span>
              </h2>
              <p className="text-xl text-slate-600 dark:text-white/60">
                See {PSATHYRELLA_DEVICE.name} in action through hosted demos and field reels.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PSATHYRELLA_ASSETS.youtubeVideos.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                  onClick={() => openVideoModal(video.id)}
                >
                  <Image
                    src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gray-700/90 dark:bg-gray-700 rounded-full p-4 group-hover:scale-110 transition-transform border border-sky-500/30">
                      <Play className="h-8 w-8 fill-white text-sky-400" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-semibold">{video.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Global Monitor & Overwatch — FUSARIUM / Earth Simulator narrative */}
      <section className="psathyrella-engineering py-24 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center md:mb-12"
          >
            <NeuBadge variant="default" className="mb-4 border-sky-500/30 bg-sky-500/20 text-sky-600 dark:text-sky-400">
              Maritime picture
            </NeuBadge>
            <h2 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
              Global Monitor <span className="text-sky-600 dark:text-sky-400">& Overwatch</span>
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600 dark:text-white/60">
              FUSARIUM is Mycosoft&apos;s JADC2 defense operating picture for U.S. Navy–grade situational awareness—
              fused maritime context, environmental intelligence, and fielded sensors in one command-ready workspace—
              anchored by Earth Simulator&apos;s live global picture of environments and deployed assets. The interactive
              map below demonstrates how Psathyrella fits that stack; it is not a full operational deployment.
            </p>
          </motion.div>

          <PsathyrellaMaritimeDeploymentMap />
        </div>
      </section>

      {/* Mesh Network Visualization */}
      <section className="psathyrella-connectivity relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Network animation background */}
        <NetworkCanvas className="opacity-80" accent="sky" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30">Connectivity</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              <span className="text-sky-600 dark:text-sky-400">Mesh Network</span> Intelligence
            </h2>
            <p className="text-xl text-slate-700 dark:text-white/60 max-w-3xl mx-auto">
              Arrays relay through Mycorrhizae — LoRa, satellite, and acoustic modem paths — so littoral coverage survives node loss.
            </p>
          </motion.div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-sky-500/20">
            <Image
              src={encodeAssetUrl(CONNECTIVITY_HERO_IMAGE)}
              alt={`${PSATHYRELLA_DEVICE.name} — Psathyrella-M buoy above and below the waterline with antennas and subsurface tether`}
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            
            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="psathyrella-connectivity-card rounded-xl border border-white/20 bg-black/55 p-6 backdrop-blur-md dark:border-sky-500/30 dark:!bg-gray-800/85">
                  <Globe className="mb-4 h-8 w-8 text-sky-300 dark:text-sky-400" />
                  <h3 className="mb-2 text-xl font-bold text-white">Area Coverage</h3>
                  <p className="text-white/85">Spacing and depth ratings follow mission profile; CREP ingests psathyrella-class nodes for COP overlays.</p>
                </div>
                <div className="psathyrella-connectivity-card rounded-xl border border-white/20 bg-black/55 p-6 backdrop-blur-md dark:border-sky-500/30 dark:!bg-gray-800/85">
                  <Network className="mb-4 h-8 w-8 text-sky-300 dark:text-sky-400" />
                  <h3 className="mb-2 text-xl font-bold text-white">Self-Healing</h3>
                  <p className="text-white/85">Mesh priorities re-route contacts and health telemetry when relays or surface gates drop.</p>
                </div>
                <div className="psathyrella-connectivity-card rounded-xl border border-white/20 bg-black/55 p-6 backdrop-blur-md dark:border-sky-500/30 dark:!bg-gray-800/85">
                  <Database className="mb-4 h-8 w-8 text-sky-300 dark:text-sky-400" />
                  <h3 className="mb-2 text-xl font-bold text-white">Cloud Sync</h3>
                  <p className="text-white/85">Observations lift into NatureOS, MINDEX-backed provenance, and FUSARIUM when operators require it.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="psathyrella-specifications py-24 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30">Specifications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Technical <span className="text-sky-600 dark:text-sky-400">Details</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(
              [
                {
                  title: "Platform & sensing",
                  icon: Cpu,
                  iconClass: "text-cyan-600 dark:text-cyan-400",
                  rows: specificationColumns[0],
                },
                {
                  title: "Mesh & integration",
                  icon: Shield,
                  iconClass: "text-sky-600 dark:text-sky-400",
                  rows: specificationColumns[1],
                },
              ] as const
            ).map((card) => {
              const SpecIcon = card.icon
              return (
                <NeuCard
                  key={card.title}
                  className="psathyrella-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10"
                >
                  <NeuCardHeader>
                    <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                      <SpecIcon className={`h-5 w-5 ${card.iconClass}`} />
                      {card.title}
                    </h3>
                  </NeuCardHeader>
                  <NeuCardContent className="space-y-4">
                    {card.rows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-2 border-b border-slate-200 dark:border-white/10 last:border-0"
                      >
                        <span className="text-slate-500 dark:!text-white shrink-0 sm:max-w-[40%]">{label}</span>
                        <span className="text-slate-900 dark:!text-sky-400 font-medium text-right sm:text-left">
                          {value}
                        </span>
                      </div>
                    ))}
                  </NeuCardContent>
                </NeuCard>
              )
            })}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <NeuButton 
              variant="outline" 
              className="min-h-[44px] border-sky-500/30 dark:border-sky-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-sky-500/10 dark:hover:bg-gray-600"
              onClick={() => {
                alert("Full specifications document will be available soon.")
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Download Full Specifications
            </NeuButton>
            <NeuButton 
              variant="outline" 
              className="min-h-[44px] border-sky-500/30 dark:border-sky-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-sky-500/10 dark:hover:bg-gray-600"
              onClick={() => {
                alert("3D CAD model viewer will be available soon. CAD files pending upload.")
              }}
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              View CAD Models
            </NeuButton>
          </div>
        </div>
      </section>

      {/* CTA Section with Walking Video Background - Much taller to show more video (square-ish) */}
      <section className="relative py-40 md:py-56 min-h-[800px] md:min-h-[900px] overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <AutoplayVideo
            src={heroSources[0]}
            sources={heroSources}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ objectPosition: 'center 70%' }}
            preload="metadata"
            encodeSrc
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center flex flex-col justify-center min-h-[600px] md:min-h-[700px]">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Ready to explore passive acoustics at the edge?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              {PSATHYRELLA_DEVICE.name} is a program platform — edge inference, mesh handoff, and MYCA orchestration for coastal and research workflows. Not offered for retail sale.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <NeuButton 
                className="min-h-[44px] px-8 py-6 text-lg bg-sky-600 hover:bg-sky-700 !text-white font-semibold"
                onClick={() =>
                  openMp4Modal(PSATHYRELLA_ASSETS.videos.promo, `${PSATHYRELLA_DEVICE.name} — Hero`)
                }
              >
                <Play className="mr-2 h-6 w-6" />
                Watch Film
              </NeuButton>
              <NeuButton variant="outline" className="min-h-[44px] px-8 py-6 text-lg border-white/30 !text-white hover:!text-white hover:bg-white/10">
                <Download className="mr-2 h-6 w-6" />
                Download Brochure
              </NeuButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoModalOpen && selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-5xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedVideo.kind === "youtube" ? (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.src}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-xl"
                />
              ) : (
                <video autoPlay muted controls playsInline className="w-full h-full rounded-xl bg-black">
                  <source src={encodeAssetUrl(selectedVideo.src)} type="video/mp4" />
                </video>
              )}
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute -top-12 right-0 text-white/60 hover:text-white"
              >
                Press ESC or click outside to close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </NeuromorphicProvider>
  )
}
