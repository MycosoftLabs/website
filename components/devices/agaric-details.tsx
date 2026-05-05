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
  Antenna, Radio, Wifi, Network, Shield, Zap, Eye, Thermometer,
  Droplets, Wind, Activity, MapPin, Globe, Trees, Microscope, Database,
  Cpu, Battery, Lock, Leaf, AlertTriangle, Check,
  ExternalLink, Youtube, Home, Flashlight, CircuitBoard, Cable,
  Plane, Navigation, Satellite,
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(max-width: 768px)").matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)")

    function handleChange() {
      setIsMobile(mediaQuery.matches)
    }

    handleChange()

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    // Safari < 14 fallback
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return isMobile
}

// ============================================================================
// AGARIC MEDIA ASSETS
// Place media files in: public/assets/agaric/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\agaric\
// Public URL: /assets/agaric/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const AGARIC_ASSETS = {
  images: [
    { src: "/assets/agaric/1.jpg", alt: "Agaric — field deploy", location: "Field Deployment" },
    { src: "/assets/agaric/2.jpg", alt: "Agaric — aerial mesh", location: "Mesh Relay" },
    { src: "/assets/agaric/3.jpg", alt: "Agaric — payload retrieval", location: "Payload Ops" },
    { src: "/assets/agaric/4.jpg", alt: "Agaric — research", location: "Research" },
    { src: "/assets/agaric/5.jpg", alt: "Agaric — heavy lift", location: "Heavy-Lift" },
  ],
  mainImage: "/assets/agaric/Main A.jpg",
  videos: {
    background: "/assets/agaric/hero.mp4",
    deploy: "/assets/agaric/deploy-retrieve.mp4",
    waterfall: "/assets/agaric/hero.mp4",
    demo: "/assets/agaric/deploy-retrieve.mp4",
    promo: "/assets/agaric/promo.mp4",
  },
  useCaseVideos: [
    "/assets/agaric/a.mp4",
    "/assets/agaric/b.mp4",
    "/assets/agaric/c.mp4",
    "/assets/agaric/d.mp4",
  ],
  youtubeVideos: [] as { id: string; title: string }[],
}

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
    id: "arms",
    name: "Carbon-fibre arms",
    icon: Activity,
    position: { top: "12%", left: "22%" },
    description: "Foldable quad / hex frame",
    details: "Lightweight carbon-fibre tubes with a 600–650 mm wheelbase (per MycoDRONE spec). Foldable arms for transport; high stiffness for stable hover and payload ops.",
  },
  {
    id: "motors",
    name: "Brushless motors",
    icon: Zap,
    position: { top: "18%", left: "72%" },
    description: "620–700 W class (variant)",
    details: "Four or six high-thrust motors with 15–17 inch props target thrust-to-weight ≥2 for heavy-lift missions and safe margin under payload.",
  },
  {
    id: "pixhawk",
    name: "Pixhawk autopilot",
    icon: Navigation,
    position: { top: "28%", left: "48%" },
    description: "ArduPilot / PX4 + MAVLink",
    details: "Pixhawk 6X or Cube Orange class FC runs low-level stabilization, GPS/RTK waypoints, precision landing, and autonomous route execution through a MAVLink bridge.",
  },
  {
    id: "avionics",
    name: "Central avionics board",
    icon: Cpu,
    position: { top: "42%", left: "38%" },
    description: "LoRa · Wi‑Fi · BLE · payload IO",
    details: "The onboard control board coordinates mesh telemetry, payload control, environmental sensing, and mission logic while publishing telemetry to MINDEX when connected.",
  },
  {
    id: "battery",
    name: "Swappable Li pack",
    icon: Battery,
    position: { top: "52%", left: "68%" },
    description: "6S 15–20 Ah (variant)",
    details: "High-capacity Li-ion or LiPo pack in a weather-sealed bay; hot-swappable. DC-DC feeds avionics, sensors, and payloads. Targets 34–55 min flight depending on variant.",
  },
  {
    id: "micolatch",
    name: "MicoLatch payload",
    icon: Lock,
    position: { top: "68%", left: "28%" },
    description: "Deploy / retrieve Mycosoft devices",
    details: "Underside MicoLatch rated for safe deploy/retrieve of MycoNode, ALARM, SporeBase, Mushroom 1, and Hyphae-class payloads. Heavy-Lift adds winch for canopy and water retrieval.",
  },
  {
    id: "gnss",
    name: "GNSS + RTK option",
    icon: MapPin,
    position: { top: "35%", left: "18%" },
    description: "GPS / Galileo / BeiDou",
    details: "RTK-capable navigation for centimetre-class positioning when mission requires precision landing and fiducial alignment.",
  },
  {
    id: "vision",
    name: "360° sensing",
    icon: Eye,
    position: { top: "58%", left: "52%" },
    description: "Stereo + lidar obstacle avoidance",
    details: "Forward 4K gimbal camera, downward camera for precision landing and fiducial detection; optional thermal for SAR and night ops.",
  },
  {
    id: "comms",
    name: "Mesh antennas",
    icon: Antenna,
    position: { top: "22%", left: "58%" },
    description: "LoRa · Wi‑Fi · BLE · sat",
    details: "Separate LoRa whip, Wi‑Fi/BLE patches on arms, optional Iridium/Swarm puck. Flying gateway extends Mycorrhizae mesh to field and coastal nodes.",
  },
  {
    id: "bme690",
    name: "BME690 air sensing",
    icon: Thermometer,
    position: { top: "75%", left: "58%" },
    description: "Gas + weather telemetry",
    details: "Temperature, humidity, pressure, and VOC index / gas resistance for air-quality sampling in flight — aligned with the Agaric environmental sensor plan.",
  },
  {
    id: "shell",
    name: "IP55 fuselage",
    icon: Shield,
    position: { top: "82%", left: "42%" },
    description: "PA‑CF + sealed electronics",
    details: "3D-printed PA‑CF housings with conformal-coated PCBs; −20 °C to 45 °C operating band for rain, dust, and marine-adjacent missions.",
  },
  {
    id: "sat",
    name: "Optional satellite",
    icon: Satellite,
    position: { top: "8%", left: "78%" },
    description: "Beyond-line-of-sight link",
    details: "Optional Iridium/Swarm for telemetry and command when cellular and Wi‑Fi are unavailable — critical for remote deployments.",
  },
]

// Use cases - now with video backgrounds
const USE_CASES = [
  {
    title: "Scientific Research",
    icon: Microscope,
    color: "from-blue-500 to-cyan-500",
    colorDark: "dark:from-blue-800 dark:to-cyan-800",
    description: "Agaric carries MycoNode and Hyphae-class payloads to remote plots, hovers for air sampling with BME690, and relays mesh telemetry back to MINDEX.",
    applications: ["Aerial spore & air sampling", "Rapid field instrument placement", "Mesh extension over canopy", "Multi-site data mule flights"],
    video: "/assets/agaric/a.mp4"
  },
  {
    title: "Agriculture & Forestry",
    icon: Trees,
    color: "from-green-500 to-violet-500",
    colorDark: "dark:from-green-800 dark:to-violet-800",
    description: "Deploy and retrieve SporeBase and MycoNode across rows and stands; extend LoRa coverage where ground nodes cannot reach.",
    applications: ["Bioaerosol collector placement", "Canopy-edge mesh relay", "Irrigation / stress scouting", "Post-storm rapid redeploy"],
    video: "/assets/agaric/b.mp4"
  },
  {
    title: "Defense & SAR",
    icon: Shield,
    color: "from-slate-600 to-slate-800",
    colorDark: "dark:from-slate-700 dark:to-slate-900",
    description: "Heavy-Lift variant supports larger sensors, thermal imaging, public-sector field programs, and rugged long-duration missions.",
    applications: ["Search patterns with thermal", "Perimeter mesh extension", "Rapid kit delivery", "Contamination corridor mapping"],
    video: "/assets/agaric/c.mp4"
  },
  {
    title: "Ocean & Coastal Relay",
    icon: Globe,
    color: "from-sky-500 to-indigo-500",
    colorDark: "dark:from-sky-800 dark:to-indigo-800",
    description: "Hover over Psathyrella-class buoys and shore nodes to bridge LoRa and Wi‑Fi backhaul across water and littoral mesh gaps.",
    applications: ["Maritime sensor relay", "Harbor and estuary coverage", "Storm-window data mule", "Cross-domain CREP handoff"],
    video: "/assets/agaric/d.mp4"
  },
]

// Sensor specifications
const SENSORS = [
  { name: "BME690 environmental", icon: Thermometer, specs: ["Temperature / humidity / pressure", "VOC index and gas trends", "Air-column sampling in flight", "MINDEX-logged telemetry when online"] },
  { name: "360° LiDAR + radar", icon: Activity, specs: ["Obstacle detection and mapping", "Radar altitude hold over terrain/water", "SLAM-assisted route awareness", "Precision hover support"] },
  { name: "GNSS + optional RTK", icon: MapPin, specs: ["GPS / Galileo / BeiDou", "RTK for precision landing", "Waypoint + RTL", "Mission handoff to Pixhawk"] },
  { name: "Vision + thermal", icon: Eye, specs: ["20 MP 1-inch CMOS target", "4K/60 recording and 1080p/60 live feed", "Downward fiducial landing camera", "Optional thermal on Heavy-Lift"] },
  { name: "Radiation + RF", icon: Radio, specs: ["Geiger-Muller radiation monitoring", "HackRF / Flipper-class SDR module", "Spectrum analysis and mesh diagnostics", "Field anomaly capture"] },
  { name: "Mesh radios", icon: Antenna, specs: ["LoRa SX1262 / Meshtastic mesh", "Wi‑Fi 6 / Bluetooth 5 offload", "Optional Swarm / Iridium satellite", "Optional 4G/5G telemetry"] },
]

// Network / flight hub capabilities (flying mesh node)
const NETWORK_FEATURES = [
  { icon: Plane, title: "Flying gateway", description: "Bridges canopy, littoral, and incident gaps where fixed towers cannot reach." },
  { icon: Satellite, title: "Beyond-LOS option", description: "Optional Swarm or Iridium messaging keeps mission telemetry moving outside cellular range." },
  { icon: Lock, title: "MicoLatch ops", description: "Deploy and retrieve MycoNode, ALARM, SporeBase, Mushroom 1, Hyphae-class payloads." },
  { icon: Cpu, title: "MAVLink + MDP", description: "Flight control, payload actions, and mesh behavior stay coordinated through command-level mission automation." },
]

const PAYLOAD_INTEGRATION: { payload: string; weight: string; notes: string }[] = [
  { payload: "MycoNode", weight: "Mini payload class", notes: "Mini can carry a small node; Standard can place multiple nodes per sortie." },
  { payload: "ALARM", weight: "<100 g class", notes: "Fast site delivery or airborne smoke-sensing placement." },
  { payload: "SporeBase", weight: "~500 g class", notes: "Standard payload target for sampler deployment and retrieval." },
  { payload: "Mushroom One", weight: "Heavy-Lift mission", notes: "Heavy-Lift + winch for tower moves, recovery, and redeployment." },
  { payload: "Hyphae 1 sensor array", weight: "Top harness", notes: "Top-mounted harness carries additional live-scanning or lab-class payloads." },
]

const COMPETITIVE_DRONES: { model: string; weight: string; flight: string; payload: string; notes: string }[] = [
  { model: "DJI Mavic 3 Pro", weight: "~958 g", flight: "43 min", payload: "Triple-camera focus", notes: "Agaric shifts the story from camera drone to sensor hub" },
  { model: "DJI Mini 4 Pro", weight: "<249 g", flight: "34–45 min", payload: "~consumer cam", notes: "No LoRa mesh / payload deployment system" },
  { model: "DJI Air 3", weight: "~720 g", flight: "~46 min", payload: "~100–200 g class", notes: "No MicoLatch / multi-sensor field stack" },
  { model: "DJI Matrice 350 RTK", weight: "Enterprise", flight: "~55 min", payload: "~2.7 kg", notes: ">$10k; closed ecosystem" },
]

const VARIANT_SPEC_ROWS: Record<"mini" | "standard" | "heavy", { label: string; value: string }[]> = {
  mini: [
    { label: "Target mission", value: "Consumer / research" },
    { label: "Frame", value: "Foldable quad; ~300 mm wheelbase" },
    { label: "Take-off weight", value: "<249 g (FAA registration-exempt target)" },
    { label: "Payload", value: "Small MycoNode or ALARM (<100 g)" },
    { label: "Battery / props", value: "4S 3,200 mAh Li-ion; 5-inch folding props" },
    { label: "Flight time", value: "30–40 min" },
    { label: "Sensors", value: "LiDAR, BME690, SDR, LoRa mesh" },
    { label: "Environmental rating", value: "IP43; -10 °C to 40 °C" },
    { label: "Indicative price", value: "~USD $799" },
  ],
  standard: [
    { label: "Target mission", value: "Prosumer / enterprise" },
    { label: "Frame", value: "Foldable quad; 600 mm wheelbase" },
    { label: "Take-off weight", value: "~800–900 g" },
    { label: "Payload", value: "Up to 500 g — SporeBase or multiple MycoNodes" },
    { label: "Battery / props", value: "6S 6,000 mAh Li-ion; 12-inch folding props" },
    { label: "Flight time", value: "~46 min" },
    { label: "Comms", value: "LoRa + Wi‑Fi 6 + Bluetooth 5; optional 4G/5G or satellite" },
    { label: "Deploy / retrieve", value: "MicoLatch missions for field devices" },
    { label: "Indicative price", value: "~USD $1,299" },
  ],
  heavy: [
    { label: "Target mission", value: "Industrial / SAR / defense programs" },
    { label: "Frame", value: "Foldable hex; 650–700 mm wheelbase" },
    { label: "Take-off weight", value: "~4.5 kg including battery" },
    { label: "Payload", value: "Up to 2 kg — Mushroom One or multiple payloads" },
    { label: "Battery / props", value: "6S 20,000 mAh hot-swappable Li-ion; 17-inch folding props" },
    { label: "Flight time", value: "~50 min (config dependent)" },
    { label: "Weather", value: "IP55 sealing; -20 °C to 45 °C target" },
    { label: "Winch", value: "Precision retrieve under canopy / littoral" },
    { label: "Indicative price", value: "From ~USD $2,999" },
  ],
}

const PRICING_TIERS = [
  {
    name: "Agaric Mini",
    price: "~$799",
    audience: "Hobbyists, researchers, quick deployments",
    includes: "Lightweight drone with LiDAR, BME690, SDR, LoRa mesh, and 30–40 min flight.",
  },
  {
    name: "Agaric Standard",
    price: "~$1,299",
    audience: "Field teams and enterprise pilots",
    includes: "46 min class endurance, 500 g payload, advanced obstacle sensing, and optional 4K/60 camera.",
  },
  {
    name: "Agaric Heavy-Lift",
    price: "From ~$2,999",
    audience: "Industrial, SAR, defense, custom programs",
    includes: "Hex-copter platform with 2 kg payload, 50 min class flight, winch retrieval, thermal and satellite options.",
  },
]

export function AgaricDetails() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [activeUseCase, setActiveUseCase] = useState(0)
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string>("avionics")
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const router = useRouter()

  // Mobile reliability: avoid 8K hero playback on phones (can cause videos to stall/fail on iOS)
  const heroVideoSrc = isMobile ? AGARIC_ASSETS.videos.waterfall : AGARIC_ASSETS.videos.background
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
      setCurrentSlide((prev) => (prev + 1) % AGARIC_ASSETS.images.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % AGARIC_ASSETS.images.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + AGARIC_ASSETS.images.length) % AGARIC_ASSETS.images.length)

  const openVideoModal = (videoId: string) => {
    setSelectedVideo({ kind: "youtube", src: videoId, title: "Agaric Video" })
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
        className="relative h-screen w-full overflow-hidden"
        style={{ opacity: heroOpacity }}
        data-over-video
      >
        {/* Background Video — AutoplayVideo for reliable autoplay (iOS/mobile) */}
        <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
          <AutoplayVideo
            src={heroSources[0]}
            sources={heroSources}
            encodeSrc
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
            <NeuBadge variant="default" className="device-hero-badge mb-4 bg-violet-500/20 text-violet-400 border-violet-500/50 text-sm px-4 py-1">
              Flying Sensor Droid
            </NeuBadge>
          </motion.div>
          
          <motion.h1 
            className="device-hero-title text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-violet-400">
              Agaric
            </span>
          </motion.h1>
          
          <motion.p 
            className="device-hero-subtitle text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            The flying sensor hub — deploy, retrieve, connect, and sense.
            <br />
            <span className="text-violet-400">Autonomous environmental missions beyond the camera drone.</span>
          </motion.p>

          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <NeuButton 
              className="device-cta-over-video min-h-[44px] px-8 bg-violet-500 hover:bg-violet-600 !text-black font-semibold"
              onClick={() => openMp4Modal(AGARIC_ASSETS.videos.promo, "Agaric — Watch Film")}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Film
            </NeuButton>
            <NeuButton
              variant="default"
              className="device-cta-over-video-outline min-h-[44px] px-8 border border-white/30 hover:bg-white/10"
              onClick={() => router.push("/contact?topic=agaric-demo")}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Request Demo
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

      {/* Why Agaric Exists */}
      <section className="agaric-mission py-24 px-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">Our Mission</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              Why <span className="text-violet-600 dark:text-violet-400">Agaric</span> Exists
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
                <span className="text-violet-600 dark:text-violet-400 font-semibold">Agaric</span> turns the drone from a flying
                camera into a distributed sensor platform. It extends Mycosoft's environmental intelligence network into the air,
                bridging canopy gaps, coastal water, and incident zones with autonomous mission control and Pixhawk-class MAVLink flight handling.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                Three variants (Mini, Standard, Heavy-Lift) cover sub-249&nbsp;g research flights through 2&nbsp;kg payload
                deploy/retrieve for SporeBase, stacked MycoNodes, and enterprise sensors, while Heavy-Lift adds winch recovery for Mushroom One and coastal buoy operations.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                Missions run through <span className="text-violet-600 dark:text-violet-400 font-semibold">NatureOS + MAS</span> agents
                using MDP commands for start mission, deploy payload, and retrieve payload, then log sensor frames to MINDEX when the fleet is online.
              </p>

              <div className="flex flex-wrap gap-6 pt-4 justify-start">
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400">55m</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Max flight target</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400">10km</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">LoRa LOS class</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400">2kg</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Payload target</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400">IP55</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Airframe seal</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-violet-500/20">
                <AutoplayVideo
                  src={AGARIC_ASSETS.videos.waterfall}
                  sources={assetMp4Sources(AGARIC_ASSETS.videos.waterfall)}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  preload="metadata"
                  encodeSrc
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              {/* Floating feature badges */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-violet-500/20 backdrop-blur-sm border border-violet-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-violet-400" />
                  <span className="text-sm">Hot-swappable Li pack</span>
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
      <section className="agaric-technology relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Neural web sensor visualization background */}
        <SensorNeuralWeb className="opacity-60 dark:opacity-50" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">Technology</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Multi-Sensor <span className="text-cyan-600 dark:text-cyan-400">Array</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              LiDAR, radar, environmental gas sensing, radiation monitoring, SDR, vision, and mesh radios in one autonomous aircraft family.
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
                <NeuCard className="agaric-sensor-card bg-slate-50 dark:!bg-gray-700 border-slate-200 dark:border-white/10 hover:border-cyan-500/50 transition-colors h-full">
                  <NeuCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-cyan-500/20 dark:bg-cyan-500/10">
                        <sensor.icon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <h3 className="text-slate-900 dark:text-white font-semibold">{sensor.name}</h3>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <ul className="space-y-2">
                      {sensor.specs.map((spec, j) => (
                        <li key={j} className="flex items-center gap-2 text-slate-600 dark:text-white/70 text-sm">
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
                className="agaric-network-card text-center p-6 rounded-xl bg-slate-50 dark:!bg-gray-700 border border-slate-200 dark:border-white/10"
              >
                <div className="inline-flex p-4 rounded-full bg-violet-500/20 dark:bg-violet-500/10 mb-4">
                  <feature.icon className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-white/60 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Gallery Carousel */}
      <section className="agaric-field-deployments py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <NeuBadge variant="default" className="agaric-field-badge mb-4 bg-violet-600/80 text-white border-violet-700/40 dark:!bg-violet-500/20 dark:!text-violet-300 dark:!border-violet-500/40">Field Deployments</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              In the <span className="text-violet-600 dark:text-violet-400">Wild</span>
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
                    src={encodeAssetUrl(AGARIC_ASSETS.images[currentSlide].src)}
                    alt={AGARIC_ASSETS.images[currentSlide].alt}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <NeuBadge variant="default" className="bg-black/50 backdrop-blur-sm border-white/20 mb-2 text-white">
                      <MapPin className="h-3 w-3 mr-1" />
                      {AGARIC_ASSETS.images[currentSlide].location}
                    </NeuBadge>
                    <p className="text-white/80">{AGARIC_ASSETS.images[currentSlide].alt}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm rounded-full p-3 transition-all text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm rounded-full p-3 transition-all text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mt-4 justify-center">
              {AGARIC_ASSETS.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden transition-all ${
                    currentSlide === i ? 'ring-2 ring-violet-500 scale-105' : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image src={encodeAssetUrl(img.src)} alt={img.alt} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payload integration — real device classes from MycoDRONE / marketing spec */}
      <section className="agaric-payload py-24 px-4 bg-slate-50 dark:bg-slate-950 border-y border-slate-200/80 dark:border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">
              MicoLatch
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Payload <span className="text-violet-600 dark:text-violet-400">integration</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              Mass and latch compatibility follow the MycoDRONE capability spec. Actual flight envelopes depend on firmware,
              weather, and regulatory limits — data below is design intent, not a guarantee until units are certified.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <table className="min-w-[640px] w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-left">
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Payload</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Approx. weight</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Integration notes</th>
                </tr>
              </thead>
              <tbody>
                {PAYLOAD_INTEGRATION.map((row) => (
                  <tr key={row.payload} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="p-4 font-medium text-violet-700 dark:text-violet-300">{row.payload}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.weight}</td>
                    <td className="p-4 text-slate-600 dark:text-white/70">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="agaric-applications relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Mycelium animation background */}
        <MyceliumCanvas className="opacity-70 dark:opacity-60" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">Applications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Who Uses <span className="text-violet-600 dark:text-violet-400">Agaric</span>?
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              Research flights, precision agriculture, defense/SAR, and ocean relay — one airframe family with mesh connectivity and MINDEX-backed telemetry when online.
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
                  className={`agaric-usecase-card cursor-pointer p-6 rounded-xl border transition-all ${
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
                <h3 className="text-2xl font-bold">{USE_CASES[activeUseCase].title}</h3>
                <p className="text-white/70 mt-2">{USE_CASES[activeUseCase].description}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* YouTube Videos Section */}
      <section className="agaric-watch py-24 bg-[#C5CFC6] dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">
              <Youtube className="h-4 w-4 mr-1" />
              Watch
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Official <span className="text-violet-600 dark:text-violet-400">Videos</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60">
              See Agaric in action through our official commercials and demos.
            </p>
          </motion.div>

          {AGARIC_ASSETS.youtubeVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AGARIC_ASSETS.youtubeVideos.map((video, i) => (
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
                    <div className="bg-gray-700/90 dark:bg-gray-700 rounded-full p-4 group-hover:scale-110 transition-transform border border-violet-500/30">
                      <Play className="h-8 w-8 fill-white text-violet-400" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-semibold">{video.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <NeuCard className="max-w-2xl mx-auto border-violet-500/20 bg-white/90 dark:bg-slate-800/90">
              <NeuCardContent className="p-8 text-center text-slate-700 dark:text-white/80">
                <Youtube className="h-10 w-10 mx-auto mb-4 text-violet-600 dark:text-violet-400" />
                <p className="text-lg font-medium text-slate-900 dark:text-white">No public YouTube IDs wired yet</p>
                <p className="mt-2 text-sm">
                  Use the hero and use-case MP4s above, or add real video IDs in code when marketing publishes — no placeholder fake channels.
                </p>
              </NeuCardContent>
            </NeuCard>
          )}
        </div>
      </section>

      {/* Blueprint Section - Placeholder for Interactive 2D Diagram */}
      <section className="agaric-engineering py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">Engineering</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Inside <span className="text-violet-600 dark:text-violet-400">Agaric</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              Explore the internal components and signal pathways of our fungal intelligence station.
            </p>
          </motion.div>

          {/* Control Device Layout - Industrial Control Panel Aesthetic */}
          <div className="relative bg-slate-100 dark:bg-slate-900/50 rounded-3xl border-2 border-violet-500/30 p-6 shadow-2xl shadow-violet-500/5">
            {/* Control Panel Frame */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel - Component Selectors */}
                <div className="bg-slate-950 rounded-2xl border border-violet-500/40 p-4 shadow-inner">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-violet-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-violet-400/70 uppercase tracking-wider">Component Selector</span>
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
                              ? 'bg-violet-500/20 border-violet-400 shadow-lg shadow-violet-500/30' 
                              : isHovered
                                ? 'bg-violet-500/10 border-violet-500/50'
                                : 'bg-slate-900/50 border-slate-700 hover:border-violet-500/40'
                  }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-violet-500/30' : 'bg-slate-800'}`}>
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-violet-400' : 'text-white/50'}`} />
                    </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-violet-400' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                          {isSelected && (
                            <motion.div 
                              layoutId="selector-indicator"
                              className="mt-2 h-0.5 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full"
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget - Below Controller */}
                <div className="bg-slate-950 rounded-2xl border border-violet-500/40 p-4 shadow-inner flex-1">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-violet-500/20">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-xs font-mono text-violet-400/70 uppercase tracking-wider">Component Details</span>
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
                          <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                            <component.icon className="h-6 w-6 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-violet-400">{component.name}</h3>
                            <p className="text-xs text-white/50 font-mono">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{component.details}</p>
                </motion.div>
              ))}
                  </AnimatePresence>
                </div>
            </div>

              {/* RIGHT SIDE: Tall Vertical Blueprint */}
              <div className="flex-1 min-w-0 flex">
                <div className="relative flex-1 min-h-[500px] bg-slate-950 rounded-2xl border border-violet-500/40 overflow-hidden shadow-inner">
                {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-15" style={{
                  backgroundImage: `
                      linear-gradient(rgba(139,92,246,0.35) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(139,92,246,0.35) 1px, transparent 1px)
                  `,
                    backgroundSize: '30px 30px'
                }} />
                
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-900 to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">Interactive Blueprint</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">AGARIC // MYCO-DRONE</span>
                    </div>
                  </div>
                  
                  {/* Device Blueprint - Vertical orientation */}
                  <div className="absolute inset-0 flex items-center justify-center pt-10">
                    <div className="relative h-[90%] aspect-[3/5] max-w-full">
                    <Image
                      src={encodeAssetUrl(AGARIC_ASSETS.mainImage)}
                      alt="Agaric Blueprint"
                        fill
                        className="opacity-40 filter grayscale object-contain"
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
                                <div className="w-full h-full border-t-2 border-dashed border-violet-400" />
                              </motion.div>
                            )}
                            
                            {/* Marker */}
                            <motion.div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isActive 
                                  ? 'bg-violet-400 border-white shadow-lg shadow-violet-400/50' 
                                  : 'bg-violet-500/40 border-violet-500/50'
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
                                  className="absolute left-8 top-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-violet-500/30 z-30"
                                >
                                  <span className="text-sm font-medium text-violet-400 whitespace-nowrap">{component.name}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Bottom status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-violet-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
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
      <section className="agaric-connectivity relative py-24 bg-[#C5CFC6] dark:bg-slate-900 overflow-hidden">
        {/* Network animation background */}
        <NetworkCanvas className="opacity-80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">Connectivity</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              <span className="text-violet-600 dark:text-violet-400">Mesh Network</span> Intelligence
            </h2>
            <p className="text-xl text-slate-700 dark:text-white/60 max-w-3xl mx-auto">
              One Agaric can extend LoRa and Wi‑Fi coverage from Mushroom 1 towers, SporeBase transects, and Psathyrella buoys — bridging field telemetry into NatureOS and MAS when the fleet is connected.
            </p>
          </motion.div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-violet-500/20">
            <Image
              src={encodeAssetUrl("/assets/agaric/hill 1.jpg")}
              alt="Agaric Mesh Network Deployment"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            
            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-violet-500/20 dark:border-violet-500/30">
                  <Globe className="h-8 w-8 text-violet-600 dark:text-violet-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">Aerial coverage</h3>
                  <p className="text-slate-600 dark:!text-white/90">Hover patterns extend RF footprint over canopy, ridges, and littoral cells where ground-only mesh would need many more fixed nodes.</p>
                </div>
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-violet-500/20 dark:border-violet-500/30">
                  <Network className="h-8 w-8 text-violet-600 dark:text-violet-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">MAVLink + MDP</h3>
                  <p className="text-slate-600 dark:!text-white/90">Pixhawk handles flight laws while command automation coordinates payload actions, mesh behavior, and logged telemetry when gateways are up.</p>
                </div>
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-violet-500/20 dark:border-violet-500/30">
                  <Database className="h-8 w-8 text-violet-600 dark:text-violet-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">MINDEX handoff</h3>
                  <p className="text-slate-600 dark:!text-white/90">When online, mission traces and sensor frames route through NatureOS into MINDEX — empty dashboards mean the service path is down, not fabricated data.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive landscape — public OEM specs cited in marketing plan */}
      <section className="agaric-competitive py-24 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">
              Market context
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              How Agaric <span className="text-violet-600 dark:text-violet-400">stacks up</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              Reference drones for buyers comparing flight time and payload. Agaric differentiation is mesh connectivity, MicoLatch ops,
              open flight stack, and field-device integration — not a clone spec sheet.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-[720px] w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-left bg-slate-50 dark:bg-slate-800/80">
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Platform</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Weight class</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Flight (vendor)</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Payload notes</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Mycosoft angle</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITIVE_DRONES.map((row) => (
                  <tr key={row.model} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.model}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.weight}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.flight}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.payload}</td>
                    <td className="p-4 text-slate-600 dark:text-white/70">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Technical Specifications — per-variant tabs */}
      <section className="agaric-specifications py-24 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30">Specifications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Technical <span className="text-violet-600 dark:text-violet-400">Details</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              Three variants share the same flight, sensing, and connectivity spine. Numbers are design targets from the May 2026 product plan — verify against released BOM and flight logs.
            </p>
          </motion.div>

          <Tabs defaultValue="mini" className="w-full">
            <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-10 h-auto p-1 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
              <TabsTrigger value="mini" className="min-h-[44px] text-sm md:text-base">
                Mini
              </TabsTrigger>
              <TabsTrigger value="standard" className="min-h-[44px] text-sm md:text-base">
                Standard
              </TabsTrigger>
              <TabsTrigger value="heavy" className="min-h-[44px] text-sm md:text-base">
                Heavy-Lift
              </TabsTrigger>
            </TabsList>
            {(["mini", "standard", "heavy"] as const).map((key) => (
              <TabsContent key={key} value={key}>
                <NeuCard className="agaric-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
                  <NeuCardHeader>
                    <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                      <Plane className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      {key === "mini" ? "Agaric Mini" : key === "standard" ? "Agaric Standard" : "Agaric Heavy-Lift"}
                    </h3>
                  </NeuCardHeader>
                  <NeuCardContent className="space-y-0">
                    {VARIANT_SPEC_ROWS[key].map((spec) => (
                      <div
                        key={spec.label}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-3 border-b border-slate-200 dark:border-white/10 last:border-0"
                      >
                        <span className="text-slate-500 dark:!text-white/80">{spec.label}</span>
                        <span className="text-slate-900 dark:!text-violet-300 font-medium text-right sm:text-left">{spec.value}</span>
                      </div>
                    ))}
                  </NeuCardContent>
                </NeuCard>
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <NeuCard className="agaric-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
              <NeuCardHeader>
                <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                  <Cpu className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Avionics + autonomy
                </h3>
              </NeuCardHeader>
              <NeuCardContent className="space-y-4">
                {[
                  { label: "Flight controller", value: "Pixhawk 6X / Cube Orange class (ArduPilot or PX4)" },
                  { label: "Control board", value: "Central onboard board for LoRa, Wi‑Fi, BLE, sensors, and payload IO" },
                  { label: "Link to FC", value: "UART MAVLink bridge to the flight controller" },
                  { label: "Software path", value: "NatureOS + MAS agents + MINDEX when online" },
                ].map((spec, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-200 dark:border-white/10 last:border-0">
                    <span className="text-slate-500 dark:!text-white">{spec.label}</span>
                    <span className="text-slate-900 dark:!text-violet-400 font-medium">{spec.value}</span>
                  </div>
                ))}
              </NeuCardContent>
            </NeuCard>

            <NeuCard className="agaric-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
              <NeuCardHeader>
                <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                  <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  Environmental
                </h3>
              </NeuCardHeader>
              <NeuCardContent className="space-y-4">
                {[
                  { label: "IP rating (airframe)", value: "IP55 target (Heavy-Lift sealing)" },
                  { label: "Operating temp", value: "−20 °C to 45 °C target" },
                  { label: "Humidity", value: "Rain / dust / marine spray class (design)" },
                  { label: "Compliance path", value: "FAA Part 107 + Remote ID; NDAA-ready BOM review available for qualifying programs" },
                  { label: "Radio regions", value: "915 MHz LoRa (regulatory profile TBD)" },
                  { label: "Data policy", value: "No fabricated telemetry — live APIs only" },
                ].map((spec, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-200 dark:border-white/10 last:border-0">
                    <span className="text-slate-500 dark:!text-white">{spec.label}</span>
                    <span className="text-slate-900 dark:!text-violet-400 font-medium">{spec.value}</span>
                  </div>
                ))}
              </NeuCardContent>
            </NeuCard>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <NeuButton 
              variant="outline" 
              className="min-h-[44px] border-violet-500/30 dark:border-violet-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-violet-500/10 dark:hover:bg-gray-600"
              onClick={() => {
                window.location.href = "/assets/agaric/Agaric-development-plan2.docx"
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Download Full Specifications
            </NeuButton>
            <NeuButton 
              variant="outline" 
              className="min-h-[44px] border-violet-500/30 dark:border-violet-500/50 dark:bg-gray-700 text-slate-900 dark:!text-white hover:bg-violet-500/10 dark:hover:bg-gray-600"
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

      {/* Pricing & Versions */}
      <section className="agaric-pricing py-24 px-4 bg-white dark:bg-slate-950 border-y border-slate-200/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <NeuBadge variant="default" className="mb-4 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30">
              Versions
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Choose the <span className="text-violet-600 dark:text-violet-400">Agaric</span> for the mission
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              The product plan keeps the entry model approachable while reserving payload, winch, thermal, satellite,
              and custom integrations for programs that need heavier field work.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <NeuCard className="h-full bg-slate-50 dark:!bg-gray-800 border-slate-200 dark:border-white/10">
                  <NeuCardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:!text-white">{tier.name}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">{tier.audience}</p>
                      </div>
                      <NeuBadge variant="default" className="shrink-0 bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30">
                        {tier.price}
                      </NeuBadge>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <p className="text-slate-700 dark:text-white/75 leading-relaxed">{tier.includes}</p>
                    <NeuButton
                      className="mt-6 w-full min-h-[44px] bg-violet-600 hover:bg-violet-700 !text-white"
                      onClick={() => router.push(`/contact?topic=${encodeURIComponent(tier.name)}`)}
                    >
                      Request {tier.name.replace("Agaric ", "")}
                    </NeuButton>
                  </NeuCardContent>
                </NeuCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Walking Video Background - Much taller to show more video (square-ish) */}
      <section className="relative py-40 md:py-56 min-h-[800px] md:min-h-[900px] overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <AutoplayVideo
            src={AGARIC_ASSETS.videos.deploy}
            sources={assetMp4Sources(AGARIC_ASSETS.videos.deploy)}
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
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Ready to fly the mesh?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Agaric connects aerial mobility, sensing, and NatureOS mission workflows for real field operations — availability, pricing, and regulatory bundles ship with program gates, not mock checkout flows.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <NeuButton 
                className="min-h-[44px] px-8 py-6 text-lg bg-violet-600 hover:bg-violet-700 !text-white font-semibold"
                onClick={() => openMp4Modal(AGARIC_ASSETS.videos.promo, "Agaric — Watch Film")}
              >
                <Play className="mr-2 h-6 w-6" />
                Watch Film
              </NeuButton>
              <NeuButton
                variant="outline"
                className="min-h-[44px] px-8 py-6 text-lg border-white/30 !text-white hover:!text-white hover:bg-white/10"
                onClick={() => {
                  window.location.href = "/assets/agaric/Agaric-development-plan2.docx"
                }}
              >
                <Download className="mr-2 h-6 w-6" />
                Download Specs
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
