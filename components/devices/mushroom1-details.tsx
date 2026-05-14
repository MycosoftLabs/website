// @ts-nocheck
"use client"

import { useState, useRef, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Antenna, Radio, Wifi, Network, Shield, Zap, Sun, Eye, Radar, Thermometer,
  Droplets, Wind, Activity, MapPin, Globe, Trees, Microscope, Database,
  Cpu, Battery, Signal, Lock, Cloud, Leaf, AlertTriangle, Check,
  ExternalLink, Youtube, Home, Flashlight, CircuitBoard, Cable, FileText
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { assetMp4Sources, mergeWithNasFallbacks } from "@/lib/asset-video-sources"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { SensorNeuralWeb } from "@/components/effects/neural-web"
import { MyceliumCanvas } from "@/components/effects/mycelium-canvas"
import { NetworkCanvas } from "@/components/effects/network-canvas"
interface SelectedVideo {
  kind: "youtube" | "mp4"
  src: string
  title: string
}

// ============================================================================
// MUSHROOM 1 MEDIA ASSETS
// Place media files in: public/assets/mushroom1/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\mushroom1\
// Public URL: /assets/mushroom1/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const MUSHROOM1_ASSETS = {
  images: [
    { src: "/assets/mushroom1/1.jpg", alt: "Mushroom 1 Field Deployment 1", location: "Field Deployment" },
    { src: "/assets/mushroom1/2.jpg", alt: "Mushroom 1 Field Deployment 2", location: "Environmental Sensing" },
    { src: "/assets/mushroom1/3.jpg", alt: "Mushroom 1 Field Deployment 3", location: "Research Station" },
    { src: "/assets/mushroom1/4.jpg", alt: "Mushroom 1 Field Deployment 4", location: "Forest Monitoring" },
    { src: "/assets/mushroom1/6.jpg", alt: "Mushroom 1 Field Deployment 5", location: "Ecosystem Study" },
  ],
  mainImage: "/assets/mushroom1/Main A.jpg",
  blueprintImage: "/assets/mushroom1/mushroom1-blueprint-large.png",
  systemsBackground: "/assets/mushroom1/systems-background.jpg",
  videos: {
    hero: "/assets/mushroom1/mushroom1-hero-2026-fast-web.mp4",
    background: "/assets/mushroom1/PXL_20250404_210633484.VB-02.MAIN.mp4",
    walking: "/assets/mushroom1/mushroom-1-walking-fast-web.mp4",
    waterfall: "/assets/mushroom1/waterfall-1-fast-web.mp4",
  demo: "/assets/mushroom1/mushroom-1-walking-fast-web.mp4",
  promo: "/assets/mushroom1/waterfall-1-fast-web.mp4",
  },
  useCaseVideos: [
    "/assets/mushroom1/a.mp4",
    "/assets/mushroom1/b.mp4",
    "/assets/mushroom1/c.mp4",
    "/assets/mushroom1/d.mp4",
  ],
  youtubeVideos: [
    {
      id: "SgihKV7EaMI",
      title: "Mushroom 1 - Hero Film",
      thumbnail: "/assets/mushroom1/watch-hero-film.jpg",
    },
    {
      id: "F7txuDmpSa4",
      title: "Mushroom 1 - Product Overview",
      thumbnail: "/assets/mushroom1/watch-product-overview.jpg",
    },
    {
      id: "Z5pC9lEceKM",
      title: "Mushroom 1 - Technology Deep Dive",
      thumbnail: "/assets/mushroom1/watch-technology-deep-dive.jpg",
    },
  ]
}

const MUSHROOM1_HERO_YOUTUBE_URL = `https://www.youtube.com/watch?v=${MUSHROOM1_ASSETS.youtubeVideos[0].id}`

// Component architecture data for blueprint
interface DeviceComponent {
  id: string
  name: string
  icon: LucideIcon
  position: { top: string; left: string }
  description: string
  details: string
}

const DEVICE_COMPONENTS: DeviceComponent[] = [
  {
    id: "solar",
    name: "Solar Panels",
    icon: Sun,
    position: { top: "8%", left: "30%" },
    description: "4x High-efficiency monocrystalline cells",
    details: "Provides continuous power through high-efficiency monocrystalline solar cells arranged in a 2x2 configuration. Each panel delivers up to 5W peak power, ensuring the device operates independently for months without external power. The panels are positioned at an optimal angle to maximize sun exposure throughout the day."
  },
  {
    id: "cap",
    name: "Cap Housing",
    icon: Home,
    position: { top: "15%", left: "50%" },
    description: "UV-resistant polycarbonate dome",
    details: "The protective cap housing is constructed from UV-resistant polycarbonate that withstands years of exposure to harsh environmental conditions. It protects internal sensors while allowing light and air to reach the BME688 environmental sensors. The dome shape channels water away from critical components."
  },
  {
    id: "leds",
    name: "Status LEDs",
    icon: Flashlight,
    position: { top: "25%", left: "70%" },
    description: "RGB status indicators (power, network, alert)",
    details: "RGB status LEDs provide at-a-glance system health information. Green indicates normal operation, blue signals network connectivity, red indicates alerts or warnings, and amber shows charging status. The LEDs are visible from over 50 meters for easy field monitoring."
  },
  {
    id: "antenna",
    name: "LoRa Antenna",
    icon: Antenna,
    position: { top: "30%", left: "25%" },
    description: "Long-range 915MHz mesh network antenna",
    details: "The 915MHz LoRa antenna enables mesh networking with a range of up to 5km line-of-sight. It operates in the ISM band for license-free operation worldwide. The antenna supports bidirectional communication, allowing the device to both transmit sensor data and receive commands or firmware updates."
  },
  {
    id: "bme688",
    name: "BME688 Sensors",
    icon: Thermometer,
    position: { top: "40%", left: "60%" },
    description: "Dual environmental sensors (AMB + ENV)",
    details: "Two Bosch BME688 sensors provide comprehensive environmental monitoring. One sensor measures ambient conditions (temperature, humidity, pressure, gas), while the second monitors environmental air quality, detecting VOCs, CO2 equivalents, and pathogen indicators. Combined, they create a complete atmospheric picture."
  },
  {
    id: "esp32",
    name: "ESP32-S3 Brain",
    icon: Cpu,
    position: { top: "50%", left: "40%" },
    description: "Main processing unit with 16MB flash",
    details: "The ESP32-S3 dual-core processor runs at 240MHz, providing ample computing power for real-time sensor processing, mesh networking protocols, and local data analytics. With 16MB of flash storage and 8MB of PSRAM, it can store weeks of sensor data locally before syncing to the cloud."
  },
  {
    id: "battery",
    name: "Li-Po Battery",
    icon: Battery,
    position: { top: "55%", left: "70%" },
    description: "3.7V 6600mAh rechargeable",
    details: "The 6600mAh lithium-polymer battery provides up to 6 months of operation on a single charge when combined with solar recharging. The battery management system includes overcharge protection, temperature monitoring, and efficient power delivery to all subsystems. Solar panels continuously top off the battery during daylight hours."
  },
  {
    id: "stem",
    name: "Stem Housing",
    icon: CircuitBoard,
    position: { top: "65%", left: "50%" },
    description: "IP67 weatherproof enclosure",
    details: "The stem housing is an IP67-rated weatherproof enclosure that protects all internal electronics from moisture, dust, and extreme temperatures. It's constructed from corrosion-resistant materials and sealed with industrial-grade gaskets. The design allows for easy maintenance access while maintaining environmental protection."
  },
  {
    id: "legs",
    name: "Quadruped Legs",
    icon: Activity,
    position: { top: "80%", left: "35%" },
    description: "4 articulated walking legs",
    details: "Four articulated legs enable autonomous locomotion and stable positioning on any terrain. Each leg features independent servo motors for walking, climbing, and self-repositioning. The quadruped design provides exceptional stability and mobility, allowing Mushroom 1 to navigate uneven ground, reposition itself for optimal sun exposure, and even relocate to better sensing locations. Made from lightweight carbon fiber composite."
  },
  {
    id: "probe",
    name: "Soil Probe",
    icon: Cable,
    position: { top: "90%", left: "55%" },
    description: "2m depth sensor array",
    details: "The 2-meter soil probe contains multiple sensor nodes that measure soil moisture, temperature, pH, and electrical conductivity at various depths. This multi-depth sensing provides a comprehensive profile of soil conditions, enabling detection of mycelial networks and understanding of subsurface environmental dynamics."
  },
]

// Use cases - now with video backgrounds
const USE_CASES = [
  {
    title: "Scientific Research",
    icon: Microscope,
    color: "from-blue-500 to-blue-600",
    colorDark: "dark:from-blue-700 dark:to-blue-900",
    buttonClass: "bg-blue-500 hover:bg-blue-600 !text-white",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.88))",
    description: "Universities and research institutions use Mushroom 1 to study mycelial network communication, forest health, and ecosystem dynamics.",
    applications: ["Mycology research", "Forest ecology studies", "Climate change monitoring", "Biodiversity assessment"],
    video: "/assets/mushroom1/scientific-research-fast-web.mp4"
  },
  {
    title: "Conservation & Wildlife",
    icon: Trees,
    color: "from-emerald-500 to-emerald-600",
    colorDark: "dark:from-emerald-700 dark:to-emerald-900",
    buttonClass: "bg-emerald-500 hover:bg-emerald-600 !text-white",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.88))",
    description: "National parks and conservation areas deploy Mushroom 1 networks to monitor ecosystem health and detect environmental threats early.",
    applications: ["Park ecosystem monitoring", "Wildlife habitat tracking", "Fire risk assessment", "Pollution detection"],
    video: "/assets/mushroom1/conservation-wildlife.mp4"
  },
  {
    title: "Agriculture & Farming",
    icon: Leaf,
    color: "from-orange-500 to-yellow-500",
    colorDark: "dark:from-orange-700 dark:to-yellow-700",
    buttonClass: "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 !text-white",
    gradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.92), rgba(234, 179, 8, 0.88))",
    description: "Farmers and agricultural operations use Mushroom 1 to monitor soil health, predict crop conditions, and optimize growing environments.",
    applications: ["Soil health monitoring", "Irrigation optimization", "Pest early warning", "Organic certification"],
    video: "/assets/mushroom1/c.mp4"
  },
  {
    title: "Defense & Security",
    icon: Shield,
    color: "from-red-500 to-red-600",
    colorDark: "dark:from-red-700 dark:to-red-900",
    buttonClass: "bg-red-500 hover:bg-red-600 !text-white",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.94), rgba(185, 28, 28, 0.9))",
    description: "Military and security operations leverage Mushroom 1 for persistent environmental awareness and operational intelligence.",
    applications: ["Base perimeter monitoring", "Contamination detection", "Early warning systems", "Threat assessment"],
    video: "/assets/mushroom1/defense-security.mp4"
  },
]

// Sensor specifications
const SENSORS = [
  { name: "4K Vision + Mapping", icon: Eye, specs: ["4K vision systems", "Radar and LiDAR mapping", "Infrared scene sensing", "Terrain and obstacle awareness"] },
  { name: "Autonomous Navigation", icon: Radar, specs: ["Walking gait control", "Pressure and tactile sensing", "Material contact detection", "Terrain adaptation"] },
  { name: "Acoustic Intelligence", icon: Activity, specs: ["Bird, drone, and human sound detection", "Biological activity classification", "Multi-channel microphones", "Acoustic communication and signaling"] },
  { name: "Chemical + Climate", icon: Wind, specs: ["BME690 VOC and VSC gas sensing", "Humidity and temperature", "Pressure and air quality", "Environmental telemetry arrays"] },
  { name: "FCI Bioelectric Probe", icon: Cable, specs: ["Ground-actuated Fungal Computer Interface", "Soil and mycelium network contact", "Bioelectric signal capture", "Subsurface interaction layer"] },
  { name: "Signal Intelligence", icon: Radio, specs: ["Software-defined radio", "Mesh spectrum awareness", "Field telemetry relay", "Remote environmental signals"] },
  { name: "Edge AI + Onsite Inference", icon: Cpu, specs: ["MycoBrain controller platform", "NVIDIA Blackwell edge compute", "M5Stack LLM8850 accelerator", "Future PCIe TPU/GPU/SSD expansion", "Nature Learning Model host"] },
  { name: "Indefinite Field Power", icon: Battery, specs: ["Solar charging skin", "Battery-backed operation", "Low-power duty cycling", "Designed for indefinite outdoor use"] },
]

// Network capabilities
const NETWORK_FEATURES = [
  { icon: Signal, title: "5km Range", description: "Line-of-sight mesh communication" },
  { icon: Network, title: "Auto-Discovery", description: "Self-healing network topology" },
  { icon: Lock, title: "AES-256", description: "Military-grade encryption" },
  { icon: Cloud, title: "Cloud Sync", description: "Real-time data upload" },
]

export function Mushroom1Details() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [activeUseCase, setActiveUseCase] = useState(0)
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string>("solar")
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const heroVideoSrc = MUSHROOM1_ASSETS.videos.hero
  const heroSources = mergeWithNasFallbacks(assetMp4Sources(heroVideoSrc))

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % MUSHROOM1_ASSETS.images.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % MUSHROOM1_ASSETS.images.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + MUSHROOM1_ASSETS.images.length) % MUSHROOM1_ASSETS.images.length)

  const openVideoModal = (videoId: string) => {
    setSelectedVideo({ kind: "youtube", src: videoId, title: "Mushroom 1 Video" })
    setIsVideoModalOpen(true)
  }

  const openMp4Modal = (videoSrc: string, title: string) => {
    setSelectedVideo({ kind: "mp4", src: videoSrc, title })
    setIsVideoModalOpen(true)
  }

  return (
    <NeuromorphicProvider>
    <div className="mushroom1-glass-page min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-white overflow-x-hidden">
      {/* Hero Section - Fullscreen Video — data-over-video for neuromorphic theme consistency */}
      <motion.section
        ref={heroRef}
        className="mushroom1-hero relative h-screen w-full overflow-hidden"
        style={{ opacity: heroOpacity }}
        data-over-video
      >
        {/* Background Video — AutoplayVideo for reliable autoplay (iOS/mobile) */}
        <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
          <AutoplayVideo
            src={heroSources[0]}
            sources={heroSources}
            encodeSrc
            poster="/assets/mushroom1/Mushroom 1.jpg"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
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
            <NeuBadge variant="default" className="device-hero-badge mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-sm px-4 py-1">
              Environmental drone
            </NeuBadge>
          </motion.div>

          <motion.h1
            className="device-hero-title mushroom1-hero-title-clean text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-200 to-emerald-400">
              Mushroom 1
            </span>
          </motion.h1>

          <motion.p
            className="device-hero-subtitle text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            The world&apos;s first real droid.
            <br />
            <span className="text-emerald-400">Giving nature its own computer.</span>
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <a
              href={MUSHROOM1_HERO_YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch the Mushroom 1 hero video on YouTube"
            >
            <NeuButton
              className="device-cta-over-video min-h-[44px] px-8 bg-emerald-500 hover:bg-emerald-600 !text-white font-semibold"
            >
              <Youtube className="mr-2 h-5 w-5 text-emerald-300" />
              Watch Film
            </NeuButton>
            </a>
            <NeuButton
              variant="default"
              className="device-cta-over-video-outline min-h-[44px] px-8 border border-white/30 hover:bg-white/10 !text-white"
              onClick={() => router.push("/devices/specifications")}
            >
              <FileText className="mr-2 h-5 w-5 text-emerald-300" />
              Specifications
            </NeuButton>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
              <motion.div
                className="w-1 h-2 bg-white/60 rounded-full"
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Why Mushroom 1 Exists */}
      <section className="mushroom1-mission py-24 px-4 bg-white text-slate-900 dark:bg-black dark:text-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Our Mission</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              Why <span className="text-emerald-600 dark:text-emerald-400">Mushroom 1</span> Exists
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
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                For billions of years, fungi have been the Earth&apos;s oldest and most sophisticated communication network.
                Beneath every forest floor, meadow, and ecosystem, mycelial networks exchange information, nutrients,
                and warnings at scales we&apos;re only beginning to understand.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Mushroom 1</span> is humanity&apos;s first attempt to listen.
                By deploying persistent, solar-powered sensor stations that tap into environmental signals from soil bioelectrics
                to atmospheric conditions, we can finally give nature a voice.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                This isn&apos;t just monitoring. It&apos;s <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Environmental Intelligence</span>.
                It is Mycosoft&apos;s first non-human computer made to interact with nature directly, including the mycelium networks
                of Earth through its ground-actuated Fungal Computer Interface probe. Mushroom 1 brings live biospheric,
                acoustic, thermal, chemical, mechanical, and bioelectric signals into the Mycosoft stack from the place where
                any signal is created in Nature.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Environmental Intelligence</span> is a new paradigm where the natural world
                becomes an active participant in our decision-making, warning us of fires before they ignite, detecting
                contamination before it spreads, and revealing the hidden health of ecosystems in real-time.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="mushroom1-mission-stat text-center rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-400/24 via-lime-300/12 to-teal-500/18 p-4 shadow-lg shadow-emerald-900/10 backdrop-blur-xl dark:from-emerald-400/18 dark:via-emerald-950/36 dark:to-teal-500/12">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">2m</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Sensing Depth</div>
                </div>
                <div className="mushroom1-mission-stat text-center rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-400/24 via-lime-300/12 to-teal-500/18 p-4 shadow-lg shadow-emerald-900/10 backdrop-blur-xl dark:from-emerald-400/18 dark:via-emerald-950/36 dark:to-teal-500/12">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">5km</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Mesh Range</div>
                </div>
                <div className="mushroom1-mission-stat text-center rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-400/24 via-lime-300/12 to-teal-500/18 p-4 shadow-lg shadow-emerald-900/10 backdrop-blur-xl dark:from-emerald-400/18 dark:via-emerald-950/36 dark:to-teal-500/12">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">6mo</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Battery Life</div>
                </div>
                <div className="mushroom1-mission-stat text-center rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-400/24 via-lime-300/12 to-teal-500/18 p-4 shadow-lg shadow-emerald-900/10 backdrop-blur-xl dark:from-emerald-400/18 dark:via-emerald-950/36 dark:to-teal-500/12">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">IP67</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Weatherproof</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative lg:scale-110 lg:origin-center"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-500/20">
                <AutoplayVideo
                  src={MUSHROOM1_ASSETS.videos.waterfall}
                  sources={assetMp4Sources(MUSHROOM1_ASSETS.videos.waterfall)}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  preload="metadata"
                  encodeSrc
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              {/* Floating feature badges */}
              <motion.div
                className="absolute -top-4 -right-4 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">Solar Powered</span>
                </div>
              </motion.div>
                <motion.div
                className="absolute -bottom-4 -left-4 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">Mesh Network</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sensor Capabilities */}
      <section className="mushroom1-technology relative py-24 bg-white dark:bg-black overflow-hidden">
        {/* Neural web sensor visualization background */}
        <SensorNeuralWeb className="opacity-60 dark:opacity-50" />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Technology</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Advanced <span className="text-emerald-700 dark:text-emerald-300">Sensor Suite</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              Military-grade environmental sensors packed into a compact, solar-powered package.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SENSORS.map((sensor, i) => (
              <motion.div
                key={sensor.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <NeuCard className="mushroom1-sensor-card bg-white/55 dark:!bg-black/28 border-slate-200 dark:border-white/10 hover:border-emerald-500/50 transition-colors h-full">
                  <NeuCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/10">
                        <sensor.icon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <h3 className="text-slate-900 dark:text-white font-semibold">{sensor.name}</h3>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <ul className="space-y-2">
                      {sensor.specs.map((spec, j) => (
                        <li key={j} className="flex items-center gap-2 text-slate-600 dark:text-white/70 text-sm">
                          <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-300 flex-shrink-0" />
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
                className="mushroom1-network-card text-center p-6 rounded-xl bg-white/55 dark:!bg-black/28 border border-slate-200 dark:border-white/10"
              >
                <div className="inline-flex p-4 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 mb-4">
                  <feature.icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-white/60 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mycosoft Systems Layer */}
      <section className="mushroom1-systems relative min-h-screen overflow-hidden py-24 md:py-32">
        <Image
          src={encodeAssetUrl(MUSHROOM1_ASSETS.systemsBackground)}
          alt=""
          aria-hidden="true"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/44 dark:bg-black/62" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/72 via-white/28 to-white/78 dark:from-black/80 dark:via-black/36 dark:to-black/88" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(6,182,212,0.10),transparent_34%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-12 max-w-3xl text-center"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              Mycosoft Systems
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 dark:text-white">
              Mushroom 1 is a walking host for environmental intelligence.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700 dark:text-white/70">
              It integrates with FCI, MYCA, NatureOS, MINDEX, and the Mycorrhizae Protocol so field hardware,
              biological interfaces, and autonomous AI operations work as one connected system.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-slate-900/10 bg-white/58 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              <div className="mb-5 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                FCI first
              </div>
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">
                The Fungal Computer Interface connects Mushroom 1 to living substrate.
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-700 dark:text-white/72">
                FCI is the deployable ground-actuated probe that gives Mushroom 1 a direct interface into soil,
                roots, fungal networks, moisture gradients, gas exchange, and bioelectric activity. It turns the
                droid from a camera robot into a physical bridge between Mycosoft systems and the mycelium networks
                of Earth.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700 dark:text-white/72">
                Data from FCI is structured through the Mycorrhizae Protocol, indexed by MINDEX, and surfaced inside
                NatureOS so each field interaction becomes governed environmental intelligence instead of isolated
                sensor output.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-slate-900/10 bg-white/58 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              <div className="mb-5 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                MYCA + NLM
              </div>
              <h3 className="text-2xl font-bold text-slate-950 dark:text-white">
                MYCA operates Mushroom 1 autonomously with a Nature Learning Model.
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-700 dark:text-white/72">
                MYCA monitors Mushroom 1, controls missions, deploys it into field tasks, maintains network links,
                and coordinates fleets through Mycosoft&apos;s mesh. The operator is no longer a joystick driver; MYCA
                is the system layer that plans, supervises, and adapts the droid&apos;s work.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700 dark:text-white/72">
                Mushroom 1 is the first Mycosoft device designed to host a Nature Learning Model, or NLM. Unlike an
                LLM trained primarily on human text, an NLM learns from environmental signals: bioelectric patterns,
                acoustic activity, thermal states, gases, movement, climate, soil, and FCI interactions with living
                systems.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Photo Gallery Carousel */}
      <section className="mushroom1-field-deployments py-24 bg-white text-slate-900 dark:bg-black dark:text-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <NeuBadge variant="default" className="mushroom1-field-badge mb-4 bg-emerald-600/80 text-white border-emerald-700/40 dark:!bg-emerald-500/20 dark:!text-emerald-300 dark:!border-emerald-500/40">Field Deployments</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              In the <span className="text-emerald-600 dark:text-emerald-400">Wild</span>
            </h2>
          </motion.div>

          {/* Main Carousel */}
          <div className="relative">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={encodeAssetUrl(MUSHROOM1_ASSETS.images[currentSlide].src)}
                    alt={MUSHROOM1_ASSETS.images[currentSlide].alt}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <NeuBadge variant="default" className="bg-black/50 backdrop-blur-sm border-white/20 mb-2 text-white">
                      <MapPin className="h-3 w-3 mr-1" />
                      {MUSHROOM1_ASSETS.images[currentSlide].location}
                    </NeuBadge>
                    <p className="text-white/80">{MUSHROOM1_ASSETS.images[currentSlide].alt}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/75 backdrop-blur-sm rounded-full p-3 transition-all text-white border border-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/75 backdrop-blur-sm rounded-full p-3 transition-all text-white border border-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mt-4 justify-center">
              {MUSHROOM1_ASSETS.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden transition-all ${
                    currentSlide === i ? 'ring-2 ring-emerald-500 scale-105' : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image src={encodeAssetUrl(img.src)} alt={img.alt} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="mushroom1-applications relative py-24 bg-black overflow-hidden">
        {/* Mycelium animation background */}
        <MyceliumCanvas className="opacity-95 dark:opacity-100" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Applications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Who Uses <span className="text-emerald-600 dark:text-emerald-400">Mushroom 1</span>?
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              From remote research stations to military bases, Mushroom 1 provides persistent environmental intelligence across every domain.
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
                  style={activeUseCase === i ? { background: useCase.gradient } : undefined}
                  className={`mushroom1-usecase-card ${activeUseCase === i ? 'mushroom1-usecase-card-active' : ''} cursor-pointer p-6 rounded-xl border transition-all ${
                    activeUseCase === i
                      ? 'bg-gradient-to-r ' + useCase.color + ' ' + useCase.colorDark + ' border-white/20 text-slate-950 dark:text-white'
                      : 'bg-white/16 dark:!bg-black/24 border-white/20 dark:border-white/10 hover:bg-white/22 dark:hover:bg-black/35'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${activeUseCase === i ? 'bg-white/30 dark:bg-white/20' : 'bg-black/25 border border-white/15'}`}>
                      <useCase.icon className={`h-6 w-6 ${activeUseCase === i ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-white'}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${activeUseCase === i ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{useCase.title}</h3>
                      {activeUseCase === i && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-slate-950/82 dark:text-white/80 mt-2"
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

            {/* Active use case video */}
            <motion.div
              key={activeUseCase}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10"
            >
              <AutoplayVideo
                key={USE_CASES[activeUseCase].video}
                src={USE_CASES[activeUseCase].video}
                sources={assetMp4Sources(USE_CASES[activeUseCase].video)}
                className="absolute inset-0 w-full h-full object-cover"
                preload="metadata"
                encodeSrc
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]">{USE_CASES[activeUseCase].title}</h3>
                <p className="text-white/70 mt-2">{USE_CASES[activeUseCase].description}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* YouTube Videos Section */}
      <section className="mushroom1-watch relative overflow-hidden py-24 bg-black text-white">
        <AutoplayVideo
          src="/assets/mushroom1/mycelium-lipids-watch.mp4"
          sources={["/assets/mushroom1/mycelium-lipids-watch.mp4", MUSHROOM1_ASSETS.videos.hero]}
          className="absolute inset-0 h-full w-full object-cover opacity-75"
          preload="metadata"
          encodeSrc
          hideUntilPlaying
        />
        <div className="absolute inset-0 bg-black/62" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.20),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.14),transparent_36%)]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <Youtube className="h-4 w-4 mr-1" />
              Watch
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Official <span className="text-emerald-600 dark:text-emerald-400">Videos</span>
            </h2>
            <p className="text-xl text-white/65">
              See Mushroom 1 in action through our official commercials and demos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MUSHROOM1_ASSETS.youtubeVideos.map((video, i) => (
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
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-700/90 dark:bg-gray-700 rounded-full p-4 group-hover:scale-110 transition-transform border border-emerald-500/30">
                    <Play className="h-8 w-8 fill-white text-emerald-400" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-semibold text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]">{video.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Blueprint Section - Placeholder for Interactive 2D Diagram */}
      <section className="mushroom1-engineering py-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Engineering</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Inside <span className="text-emerald-600 dark:text-emerald-400">Mushroom 1</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              Explore the internal components and signal pathways of our fungal intelligence station.
            </p>
          </motion.div>

          {/* Control Device Layout - Industrial Control Panel Aesthetic */}
          <div className="relative bg-slate-100 dark:bg-black/70 rounded-3xl border-2 border-emerald-500/30 p-6 shadow-2xl shadow-emerald-500/5">
            {/* Control Panel Frame */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel - Component Selectors */}
                <div className="bg-white/68 dark:bg-black rounded-2xl border border-emerald-500/40 p-4 shadow-inner backdrop-blur-xl">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-400/70 uppercase tracking-wider">Component Selector</span>
                  </div>

                  {/* Component Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_COMPONENTS.map((component) => {
                      const IconComponent = component.icon
                      const isSelected = selectedComponent === component.id
                      const isHovered = hoveredComponent === component.id
                      return (
                        <motion.button
                  key={component.id}
                          onClick={() => setSelectedComponent(component.id)}
                  onMouseEnter={() => setHoveredComponent(component.id)}
                  onMouseLeave={() => setHoveredComponent(null)}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/30'
                              : isHovered
                                ? 'bg-emerald-500/10 border-emerald-500/50'
                                : 'bg-white/50 dark:bg-black/55 border-slate-900/10 dark:border-white/10 hover:border-emerald-500/40'
                  }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/30' : 'bg-white/65 dark:bg-black/70 border border-slate-900/10 dark:border-white/10'}`}>
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-white/50'}`} />
                    </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                          {isSelected && (
                            <motion.div
                              layoutId="selector-indicator"
                              className="mt-2 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget - Below Controller */}
                <div className="bg-white/68 dark:bg-black rounded-2xl border border-emerald-500/40 p-4 shadow-inner flex-1 backdrop-blur-xl">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-400/70 uppercase tracking-wider">Component Details</span>
                  </div>

                  <AnimatePresence mode="wait">
                    {DEVICE_COMPONENTS.filter(c => c.id === selectedComponent).map((component) => (
                      <motion.div
                        key={component.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                            <component.icon className="h-6 w-6 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{component.name}</h3>
                            <p className="text-xs text-slate-600 dark:text-white/50 font-mono">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-white/80 leading-relaxed">{component.details}</p>
                </motion.div>
              ))}
                  </AnimatePresence>
                </div>
            </div>

              {/* RIGHT SIDE: Tall Vertical Blueprint */}
              <div className="flex-1 min-w-0 flex">
                <div className="relative flex-1 min-h-[500px] bg-white/68 dark:bg-black rounded-2xl border border-emerald-500/40 overflow-hidden shadow-inner backdrop-blur-xl">
                {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-15" style={{
                  backgroundImage: `
                      linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)
                  `,
                    backgroundSize: '30px 30px'
                }} />

                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-white/95 dark:from-black to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">Interactive Blueprint</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-slate-500 dark:text-white/30">MUSHROOM-1 // REV 2.0</span>
                    </div>
                  </div>

                  {/* Device Blueprint - Vertical orientation */}
                  <div className="absolute inset-0 flex items-center justify-center pt-10">
                    <div className="relative h-[90%] aspect-[3/5] max-w-full">
                    <Image
                      src={encodeAssetUrl(MUSHROOM1_ASSETS.blueprintImage)}
                      alt="Mushroom 1 Blueprint"
                        fill
                        className="opacity-75 object-contain"
                    />

                    {/* Interactive component markers */}
                      {DEVICE_COMPONENTS.map((component) => {
                        const isSelected = selectedComponent === component.id
                        const isHovered = hoveredComponent === component.id
                        const isActive = isSelected || isHovered

                        return (
                      <motion.div
                        key={component.id}
                            className="absolute cursor-pointer z-20"
                        style={{ top: component.position.top, left: component.position.left }}
                            onClick={() => setSelectedComponent(component.id)}
                        onMouseEnter={() => setHoveredComponent(component.id)}
                        onMouseLeave={() => setHoveredComponent(null)}
                      >
                            {/* Connection line */}
                            {isSelected && (
                        <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                className="absolute top-1/2 right-full -translate-y-1/2 w-16 h-px origin-right"
                                style={{ marginRight: '12px' }}
                              >
                                <div className="w-full h-full border-t-2 border-dashed border-emerald-400" />
                              </motion.div>
                            )}

                            {/* Marker */}
                            <motion.div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isActive
                                  ? 'bg-emerald-400 border-white shadow-lg shadow-emerald-400/50'
                                  : 'bg-emerald-500/40 border-emerald-500/50'
                          }`}
                          animate={{
                                scale: isActive ? 1.3 : 1,
                          }}
                              transition={{ duration: 0.2 }}
                            >
                              {isActive && (
                                <motion.div
                                  className="w-2 h-2 rounded-full bg-white"
                                  animate={{ scale: [1, 0.8, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                        />
                              )}
                      </motion.div>

                            {/* Label on hover */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 10 }}
                                  className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-emerald-500/30 z-30"
                                >
                                  <span className="text-sm font-medium text-emerald-400 whitespace-nowrap">{component.name}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white/95 dark:from-black to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-white/30">
                      <span>COMPONENT: <span className="text-emerald-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        SYSTEM READY
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mesh Network Visualization */}
      <section className="mushroom1-connectivity relative py-24 bg-black text-white overflow-hidden">
        {/* Network animation background */}
        <NetworkCanvas className="opacity-80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Connectivity</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              <span className="text-emerald-600 dark:text-emerald-400">Mesh Network</span> Intelligence
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Deploy multiple units to create an intelligent, self-healing network that spans entire ecosystems.
            </p>
          </motion.div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-500/20">
            <Image
              src={encodeAssetUrl("/assets/mushroom1/hill 1.jpg")}
              alt="Mushroom 1 Mesh Network Deployment"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="mushroom1-connectivity-card bg-black/42 backdrop-blur-sm rounded-xl p-6 border border-emerald-500/30">
                  <Globe className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-white">Area Coverage</h3>
                  <p className="text-white/90">A single network of 10 units can monitor up to 80 square kilometers of terrain.</p>
                </div>
                <div className="mushroom1-connectivity-card bg-black/42 backdrop-blur-sm rounded-xl p-6 border border-emerald-500/30">
                  <Network className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-white">Self-Healing</h3>
                  <p className="text-white/90">If one node fails, the network automatically reroutes data through alternate paths.</p>
                </div>
                <div className="mushroom1-connectivity-card bg-black/42 backdrop-blur-sm rounded-xl p-6 border border-emerald-500/30">
                  <Database className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-white">Cloud Sync</h3>
                  <p className="text-white/90">All data streams to NatureOS and MINDEX for real-time analysis and long-term storage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="mushroom1-specifications py-24 bg-slate-100 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Specifications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Technical <span className="text-emerald-600 dark:text-emerald-400">Details</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <NeuCard className="mushroom1-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
              <NeuCardHeader>
                <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                  <Cpu className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Hardware
                </h3>
              </NeuCardHeader>
              <NeuCardContent className="space-y-4">
                {[
                  { label: "Processor", value: "ESP32-S3 Dual-Core 240MHz" },
                  { label: "Memory", value: "16MB Flash + 8MB PSRAM" },
                  { label: "Connectivity", value: "WiFi, Bluetooth 5.0, LoRa 915MHz" },
                  { label: "Power", value: "4x Solar Panels + 6600mAh Li-Po" },
                  { label: "Battery Life", value: "6 months (solar rechargeable)" },
                  { label: "Dimensions", value: "30cm x 30cm x 100cm" },
                  { label: "Weight", value: "4.5kg" },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/10 last:border-0">
                    <span className="text-slate-500 dark:!text-white">{spec.label}</span>
                    <span className="text-slate-900 dark:!text-emerald-400 font-medium">{spec.value}</span>
                  </div>
                ))}
              </NeuCardContent>
            </NeuCard>

            <NeuCard className="mushroom1-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
              <NeuCardHeader>
                <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Environmental
                </h3>
              </NeuCardHeader>
              <NeuCardContent className="space-y-4">
                {[
                  { label: "IP Rating", value: "IP67 Waterproof" },
                  { label: "Operating Temp", value: "-20°C to 60°C" },
                  { label: "Humidity Range", value: "0-100% RH" },
                  { label: "Sensor Depth", value: "Up to 2 meters" },
                  { label: "Wireless Range", value: "5km line of sight" },
                  { label: "Data Storage", value: "32GB local + cloud sync" },
                  { label: "Certifications", value: "FCC, CE, ROHS" },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/10 last:border-0">
                    <span className="text-slate-500 dark:!text-white">{spec.label}</span>
                    <span className="text-slate-900 dark:!text-emerald-400 font-medium">{spec.value}</span>
                  </div>
                ))}
              </NeuCardContent>
            </NeuCard>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <NeuButton
              variant="outline"
              className="min-h-[44px] border-emerald-500/30 dark:border-emerald-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-emerald-500/10 dark:hover:bg-gray-600"
              onClick={() => {
                alert("Full specifications document will be available soon.")
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Download Full Specifications
            </NeuButton>
            <NeuButton
              variant="outline"
              className="min-h-[44px] border-emerald-500/30 dark:border-emerald-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-emerald-500/10 dark:hover:bg-gray-600"
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
            src={MUSHROOM1_ASSETS.videos.walking}
            sources={assetMp4Sources(MUSHROOM1_ASSETS.videos.walking)}
            className="absolute inset-0 w-full h-full object-cover"
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
            <h2 className="text-4xl md:text-6xl font-bold mb-6 !text-white">
              Ready to take a walk in nature?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Mushroom 1 connects field sensing to MYCA and NatureOS for research and environmental intelligence. This platform device is not offered for retail sale.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <NeuButton
                className="min-h-[44px] px-8 py-6 text-lg bg-emerald-600 hover:bg-emerald-700 !text-white font-semibold"
                onClick={() => openMp4Modal(MUSHROOM1_ASSETS.videos.promo, "Mushroom 1 — Watch Film")}
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

      <style jsx global>{`
        .dark .mushroom1-glass-page,
        .dark .mushroom1-glass-page .mushroom1-mission,
        .dark .mushroom1-glass-page .mushroom1-technology,
        .dark .mushroom1-glass-page .mushroom1-systems,
        .dark .mushroom1-glass-page .mushroom1-field-deployments,
        .dark .mushroom1-glass-page .mushroom1-applications,
        .dark .mushroom1-glass-page .mushroom1-engineering,
        .dark .mushroom1-glass-page .mushroom1-connectivity,
        .dark .mushroom1-glass-page .mushroom1-specifications {
          background-color: #000 !important;
          color: #fff !important;
        }

        .dark .mushroom1-glass-page section,
        .dark .mushroom1-glass-page .mushroom1-mission,
        .dark .mushroom1-glass-page .mushroom1-field-deployments,
        .dark .mushroom1-glass-page .mushroom1-connectivity,
        .dark .mushroom1-glass-page .mushroom1-specifications,
        .dark .mushroom1-glass-page .mushroom1-engineering {
          background: #000 !important;
          background-color: #000 !important;
        }

        .dark .mushroom1-glass-page .bg-slate-900,
        .dark .mushroom1-glass-page .bg-slate-950,
        .dark .mushroom1-glass-page .bg-slate-800,
        .dark .mushroom1-glass-page .bg-gray-700,
        .dark .mushroom1-glass-page .bg-gray-800,
        .dark .mushroom1-glass-page .bg-zinc-900,
        .dark .mushroom1-glass-page .bg-zinc-950,
        .dark .mushroom1-glass-page .dark\\:bg-slate-900,
        .dark .mushroom1-glass-page .dark\\:bg-slate-950,
        .dark .mushroom1-glass-page .dark\\:bg-slate-800,
        .dark .mushroom1-glass-page .dark\\:bg-gray-700,
        .dark .mushroom1-glass-page .dark\\:bg-gray-800,
        .dark .mushroom1-glass-page .dark\\:bg-zinc-900,
        .dark .mushroom1-glass-page .dark\\:bg-zinc-950,
        .dark .mushroom1-glass-page .dark\\:\\!bg-gray-700,
        .dark .mushroom1-glass-page .dark\\:\\!bg-gray-800,
        .dark .mushroom1-glass-page .dark\\:\\!bg-zinc-900,
        .dark .mushroom1-glass-page .dark\\:\\!bg-zinc-950 {
          background-color: rgba(0, 0, 0, 0.66) !important;
          background-image: none !important;
        }

        .dark .mushroom1-glass-page .from-slate-900,
        .dark .mushroom1-glass-page .from-slate-800,
        .dark .mushroom1-glass-page .from-slate-700,
        .dark .mushroom1-glass-page .to-slate-900,
        .dark .mushroom1-glass-page .to-slate-800,
        .dark .mushroom1-glass-page .to-slate-700,
        .dark .mushroom1-glass-page .dark\\:from-slate-900,
        .dark .mushroom1-glass-page .dark\\:from-slate-800,
        .dark .mushroom1-glass-page .dark\\:from-slate-700,
        .dark .mushroom1-glass-page .dark\\:to-slate-900,
        .dark .mushroom1-glass-page .dark\\:to-slate-800,
        .dark .mushroom1-glass-page .dark\\:to-slate-700 {
          --tw-gradient-from: #000 var(--tw-gradient-from-position) !important;
          --tw-gradient-to: rgb(0 0 0 / 0) var(--tw-gradient-to-position) !important;
          --tw-gradient-stops: var(--tw-gradient-from), rgba(0, 0, 0, 0.78), var(--tw-gradient-to) !important;
        }

        .dark .mushroom1-glass-page .mushroom1-usecase-card-active.from-slate-600,
        .dark .mushroom1-glass-page .mushroom1-usecase-card-active.from-slate-700 {
          --tw-gradient-from: #475569 var(--tw-gradient-from-position) !important;
          --tw-gradient-to: rgb(71 85 105 / 0) var(--tw-gradient-to-position) !important;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
        }

        .dark .mushroom1-glass-page .mushroom1-usecase-card-active.to-slate-800,
        .dark .mushroom1-glass-page .mushroom1-usecase-card-active.to-slate-900 {
          --tw-gradient-to: #0f172a var(--tw-gradient-to-position) !important;
        }

        .dark .mushroom1-glass-page .text-cyan-400,
        .dark .mushroom1-glass-page .text-cyan-500,
        .dark .mushroom1-glass-page .text-cyan-600,
        .dark .mushroom1-glass-page .dark\\:text-cyan-400,
        .dark .mushroom1-glass-page .dark\\:text-cyan-500 {
          color: #6ee7b7 !important;
          -webkit-text-fill-color: #6ee7b7 !important;
        }

        .dark .mushroom1-glass-page .border-cyan-500\\/30,
        .dark .mushroom1-glass-page .border-cyan-500\\/40,
        .dark .mushroom1-glass-page .border-cyan-500\\/50 {
          border-color: rgba(16, 185, 129, 0.42) !important;
        }

        .mushroom1-glass-page .neu-raised,
        .mushroom1-glass-page .neu-raised-sm,
        .mushroom1-glass-page .neu-btn,
        .mushroom1-glass-page .mushroom1-sensor-card,
        .mushroom1-glass-page .mushroom1-network-card,
        .mushroom1-glass-page .mushroom1-usecase-card,
        .mushroom1-glass-page .mushroom1-spec-card,
        .mushroom1-glass-page .mushroom1-connectivity-card,
        .mushroom1-glass-page [class*="rounded-xl"][class*="border"],
        .mushroom1-glass-page [class*="rounded-2xl"][class*="border"],
        .mushroom1-glass-page [class*="rounded-3xl"][class*="border"] {
          position: relative;
          overflow: hidden;
          border-color: rgba(255, 255, 255, 0.32) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06) 42%, rgba(255, 255, 255, 0.025)) !important;
          box-shadow:
            0 18px 52px rgba(0, 0, 0, 0.28),
            0 7px 18px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.58),
            inset 0 -22px 38px rgba(255, 255, 255, 0.07) !important;
          backdrop-filter: blur(12px) saturate(1.18);
          -webkit-backdrop-filter: blur(12px) saturate(1.18);
        }

        .dark .mushroom1-glass-page .neu-raised,
        .dark .mushroom1-glass-page .neu-raised-sm,
        .dark .mushroom1-glass-page .neu-btn,
        .dark .mushroom1-glass-page .mushroom1-sensor-card,
        .dark .mushroom1-glass-page .mushroom1-network-card,
        .dark .mushroom1-glass-page .mushroom1-usecase-card,
        .dark .mushroom1-glass-page .mushroom1-spec-card,
        .dark .mushroom1-glass-page .mushroom1-connectivity-card,
        .dark .mushroom1-glass-page [class*="rounded-xl"][class*="border"],
        .dark .mushroom1-glass-page [class*="rounded-2xl"][class*="border"],
        .dark .mushroom1-glass-page [class*="rounded-3xl"][class*="border"] {
          color: #fff !important;
          border-color: rgba(255, 255, 255, 0.28) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.036) 42%, rgba(255, 255, 255, 0.012)) !important;
          box-shadow:
            0 18px 56px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.28),
            inset 0 -22px 38px rgba(255, 255, 255, 0.045) !important;
        }

        .mushroom1-glass-page .neu-raised::before,
        .mushroom1-glass-page .neu-raised-sm::before,
        .mushroom1-glass-page .neu-btn::before,
        .mushroom1-glass-page .mushroom1-sensor-card::before,
        .mushroom1-glass-page .mushroom1-network-card::before,
        .mushroom1-glass-page .mushroom1-usecase-card::before,
        .mushroom1-glass-page .mushroom1-spec-card::before,
        .mushroom1-glass-page .mushroom1-connectivity-card::before {
          content: "";
          position: absolute;
          inset: 1px 2px auto;
          height: 42%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
          pointer-events: none;
        }

        .mushroom1-glass-page [data-over-video] .neu-btn::before,
        .mushroom1-glass-page [data-over-video] [class*="rounded-xl"][class*="border"]::before,
        .mushroom1-glass-page [data-over-video] [class*="rounded-2xl"][class*="border"]::before,
        .mushroom1-glass-page [data-over-video] [class*="rounded-3xl"][class*="border"]::before {
          display: none !important;
        }

        .dark .mushroom1-glass-page .mushroom1-technology canvas {
          background: #000 !important;
        }

        .mushroom1-glass-page .mushroom1-technology .mushroom1-sensor-card,
        .mushroom1-glass-page .mushroom1-technology .mushroom1-network-card {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.045)) !important;
          border-color: rgba(16, 185, 129, 0.34) !important;
          backdrop-filter: blur(9px) saturate(1.15);
          -webkit-backdrop-filter: blur(9px) saturate(1.15);
        }

        .dark .mushroom1-glass-page .mushroom1-technology .mushroom1-sensor-card,
        .dark .mushroom1-glass-page .mushroom1-technology .mushroom1-network-card,
        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card:not(.mushroom1-usecase-card-active) {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.022)) !important;
          border-color: rgba(52, 211, 153, 0.32) !important;
          box-shadow:
            0 20px 58px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.17) !important;
        }

        .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active,
        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active {
          background-image: none !important;
          border-color: rgba(255, 255, 255, 0.24) !important;
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.24) !important;
        }

        .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active,
        .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active h3,
        .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active p,
        .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active svg {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active,
        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active h3,
        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active p,
        .dark .mushroom1-glass-page .mushroom1-applications .mushroom1-usecase-card-active svg {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        .mushroom1-glass-page .mushroom1-applications,
        .dark .mushroom1-glass-page .mushroom1-applications {
          background: #000 !important;
        }

        .mushroom1-glass-page .mushroom1-applications canvas {
          opacity: 1 !important;
          filter: saturate(1.8) brightness(1.65) contrast(1.18);
        }

        .mushroom1-glass-page .mushroom1-connectivity,
        .dark .mushroom1-glass-page .mushroom1-connectivity {
          background: #000 !important;
          color: #fff !important;
        }

        .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card,
        .dark .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card {
          background:
            linear-gradient(135deg, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.28)),
            rgba(0, 0, 0, 0.36) !important;
          border-color: rgba(52, 211, 153, 0.42) !important;
          color: #fff !important;
        }

        .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card h3,
        .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card p,
        .dark .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card h3,
        .dark .mushroom1-glass-page .mushroom1-connectivity .mushroom1-connectivity-card p {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        .mushroom1-glass-page .mushroom1-applications .absolute.bottom-6 h3,
        .mushroom1-glass-page .mushroom1-watch .absolute.bottom-4 h3 {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.92);
        }

        .mushroom1-glass-page .mushroom1-watch,
        .dark .mushroom1-glass-page .mushroom1-watch {
          background-color: #000 !important;
          color: #fff !important;
        }

        .mushroom1-glass-page .mushroom1-watch h2,
        .mushroom1-glass-page .mushroom1-watch p,
        .dark .mushroom1-glass-page .mushroom1-watch h2,
        .dark .mushroom1-glass-page .mushroom1-watch p {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>

    </div>
    </NeuromorphicProvider>
  )
}
