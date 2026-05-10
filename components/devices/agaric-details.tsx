"use client"

import { useState, useRef } from "react"
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
  Download,
  Antenna, Radio, Wifi, Network, Shield, Zap, Eye, Thermometer,
  Droplets, Wind, Activity, MapPin, Globe, Trees, Microscope, Database,
  Cpu, Battery, Lock, Leaf, AlertTriangle, Check,
  ExternalLink, Home, Flashlight, CircuitBoard, Cable,
  Plane, Navigation, Satellite,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { InstantHeroVideo } from "@/components/ui/instant-hero-video"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { NetworkCanvas } from "@/components/effects/network-canvas"
import { AgaricShardTitle } from "@/components/devices/agaric-shard-title"
import { AgaricTechnologyShaderBackground } from "@/components/devices/agaric-technology-shader-background"

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
  heroImage: "/assets/agaric/hero2.jpg",
  missionImage: "/assets/agaric/main.jpg",
  fieldImage: "/assets/agaric/desertfly.jpg",
  footerImage: "/assets/agaric/forest1.jpg",
  mainImage: "/assets/agaric/topboard.jpg",
  connectivityImage: "/assets/agaric/connectivity-forest.png",
  sizesImage: "/images/agaric/threesizes.jpg",
  videos: {
    hero: "/assets/agaric/agaric-hero2.mp4",
    background: "/assets/agaric/hero.mp4",
    deploy: "/assets/agaric/deploy-retrieve.mp4",
    waterfall: "/assets/agaric/hero.mp4",
    demo: "/assets/agaric/deploy-retrieve.mp4",
    promo: "/assets/agaric/promo.mp4",
    capabilities: "/assets/agaric/agaric-background1.mp4",
    footer: "/assets/agaric/forestfly.mp4",
  },
  youtube: {
    hero: "fk2rCM9hnpQ",
  },
  useCaseVideos: [
    "/assets/agaric/a.mp4",
    "/assets/agaric/b.mp4",
    "/assets/agaric/c.mp4",
    "/assets/agaric/d.mp4",
  ],
}

const AGARIC_HERO_YOUTUBE_URL = `https://www.youtube.com/watch?v=${AGARIC_ASSETS.youtube.hero}`

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
    name: "Composite arms",
    icon: Activity,
    position: { top: "12%", left: "22%" },
    description: "Size-scaled flying droid frame",
    details: "Foldable composite members give AGARIC-S, AGARIC-M, and AGARIC-L the same platform identity at different lift envelopes. The frame is built for hover, maneuver, payload work, and field transport.",
  },
  {
    id: "motors",
    name: "12-rotor lift system",
    icon: Zap,
    position: { top: "18%", left: "72%" },
    description: "Six-point coaxial propulsion",
    details: "AGARIC uses a six-point dual-propeller layout with 12 total rotors in paired top-and-bottom configurations, giving the platform full directional control authority instead of behaving like a commodity quadcopter.",
  },
  {
    id: "pixhawk",
    name: "Flight controller",
    icon: Navigation,
    position: { top: "28%", left: "48%" },
    description: "Tangential flight control",
    details: "Unlike conventional drones that tilt to translate, AGARIC can hold a level orientation while moving forward, backward, lateral, or vertical through complex field environments.",
  },
  {
    id: "avionics",
    name: "Mission interface layer",
    icon: Cpu,
    position: { top: "42%", left: "38%" },
    description: "Device identity + telemetry",
    details: "The central mission board handles Mycosoft device discovery, payload handshakes, telemetry packet assembly, radio messaging, and protocol translation into MYCA, NatureOS, and MINDEX when online.",
  },
  {
    id: "battery",
    name: "Swappable Li pack",
    icon: Battery,
    position: { top: "52%", left: "68%" },
    description: "Size-scaled power bay",
    details: "Battery capacity scales by size and mission load. Power is routed to flight electronics, radios, sensors, and payload interfaces while keeping service access practical for field teams.",
  },
  {
    id: "micolatch",
    name: "Payload interface",
    icon: Lock,
    position: { top: "68%", left: "28%" },
    description: "Deploy / retrieve Mycosoft devices",
    details: "The AGARIC payload interface supports retention, status detection, safe release, safe recovery, optional power, and telemetry handshakes for size-appropriate Mycosoft field hardware.",
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
    name: "Inspection sensors",
    icon: Eye,
    position: { top: "58%", left: "52%" },
    description: "Vision, depth, range, and thermal options",
    details: "Cameras are inspection and navigation sensors inside the broader Flying Sensor Droid platform. Sensor payloads can include RGB, downward inspection, thermal, LiDAR, depth, or radar/range sensing.",
  },
  {
    id: "comms",
    name: "Mesh antennas",
    icon: Antenna,
    position: { top: "22%", left: "58%" },
    description: "LoRa · Wi‑Fi · BLE · sat",
    details: "AGARIC can relay LoRa, Wi-Fi, BLE, LTE, satellite, Mycorrhizae Protocol, MDP, MMP, and device-status traffic between field systems and Mycosoft command layers.",
  },
  {
    id: "bme690",
    name: "BME688/BME690 air sensing",
    icon: Thermometer,
    position: { top: "75%", left: "58%" },
    description: "Gas + weather telemetry",
    details: "Environmental sensing can include temperature, humidity, pressure, VOC/gas trends, and particulate payloads where size and mission power allow.",
  },
  {
    id: "shell",
    name: "U.S.-made shell",
    icon: Shield,
    position: { top: "82%", left: "42%" },
    description: "United States manufacturing",
    details: "AGARIC is fully made in the United States as a purpose-built flying sensor droid, not an imported FPV or camera quadcopter repackaged for field work.",
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

// Four AGARIC capability scenarios.
const USE_CASES = [
  {
    title: "Lift + Deploy",
    icon: Plane,
    color: "from-red-700 to-black",
    colorDark: "dark:from-red-800 dark:to-black",
    description: "Move and place Mycosoft devices, probes, samplers, and sensor payloads into target environments with mission context intact.",
    applications: ["Device placement", "Sampler transport", "Field station drops", "Sensor package lift"],
    image: "/assets/agaric/forest2.jpg",
    video: "/assets/agaric/dronepickup.mp4"
  },
  {
    title: "Retrieve + Recover",
    icon: Download,
    color: "from-red-600 to-red-950",
    colorDark: "dark:from-red-700 dark:to-black",
    description: "Recover samples, payloads, probes, and field devices after exposure, collection, inspection, or mission completion.",
    applications: ["Sampler recovery", "Payload pickup", "Probe return", "Winch / latch support"],
    image: "/assets/agaric/retrieve-recover.jpg"
  },
  {
    title: "Relay + Translate",
    icon: Antenna,
    color: "from-black to-red-800",
    colorDark: "dark:from-black dark:to-red-900",
    description: "Bridge field communications and turn telemetry, protocol messages, sensor frames, and observations into Mycosoft intelligence.",
    applications: ["LoRa bridge", "Wi-Fi / BLE offload", "MINDEX traces", "NatureOS state"],
    image: "/assets/agaric/topboard.jpg"
  },
  {
    title: "Inspect + Maneuver",
    icon: Navigation,
    color: "from-slate-950 to-red-900",
    colorDark: "dark:from-black dark:to-red-950",
    description: "Use tangential flight to translate without tilting, hold orientation, and move through difficult terrain while sensing devices, canopy, water, infrastructure, and access routes.",
    applications: ["Level translation", "Tangential passes", "Level hover", "Infrastructure scans"],
    image: "/assets/agaric/close3.jpg",
    video: "/assets/agaric/maneuver.mp4"
  },
]

// Sensor specifications
const SENSORS = [
  { name: "Environmental sensing", icon: Thermometer, specs: ["BME688 / BME690 temperature, humidity, pressure", "VOC, gas resistance, IAQ, and air-column trend capture", "Particulate, smoke, spores, and aerosol payloads where equipped", "Rain, dust, marine spray, and field-condition context"] },
  { name: "Gas detection", icon: Wind, specs: ["VOC and gas anomaly detection", "CO2 / oxidizing / reducing gas payload support", "Smoke, contamination, and industrial-site air checks", "MINDEX-ready timestamped gas events when online"] },
  { name: "Radar + LiDAR sensing", icon: Activity, specs: ["LiDAR / depth mapping and obstacle detection", "Radar range sensing over terrain, canopy, and water", "Altitude hold, SLAM awareness, and close hover support", "Route safety around structures, devices, and field obstacles"] },
  { name: "Thermal + visual sensing", icon: Eye, specs: ["RGB inspection and downward fiducial camera", "Thermal payload for heat, night, and device-health inspection", "Canopy, water-surface, infrastructure, and payload checks", "Navigation sensor, not camera-first positioning"] },
  { name: "Acoustic sensing", icon: Wifi, specs: ["Microphone / acoustic payload support", "Rotor, infrastructure, wildlife, and site-sound anomaly checks", "Audio event timestamping with mission context", "Hover-based close listening when payload allows"] },
  { name: "Electromagnetic sensing", icon: Radio, specs: ["RF / spectrum payload where mission requires it", "LoRa, Wi-Fi, BLE, LTE, and satellite link diagnostics", "Magnetometer / EM field payload support", "Radiation / Geiger payload option for field anomaly capture"] },
  { name: "Tangential flight", icon: Navigation, specs: ["Level translation without camera-drone tilt", "Six-point coaxial layout with 12 paired top-and-bottom rotors", "Side-on passes around devices, towers, canopy edges, and structures", "Forward, backward, lateral, and vertical motion while maintaining orientation"] },
  { name: "Lifting capabilities", icon: Plane, specs: ["AGARIC-S light payload movement up to 100 g class", "AGARIC-M routine deployment / retrieval up to 500 g class", "AGARIC-L heavy recovery and support up to 2 kg class", "Lift, deploy, retrieve, hover, winch, sling, and latch-ready workflows"] },
]

// Network / flight hub capabilities (flying mesh node)
const NETWORK_FEATURES = [
  { icon: Plane, title: "Tangential flight droid", description: "A coaxial flight architecture built for level translation, stable orientation, and precise field movement." },
  { icon: Lock, title: "Deploy + recover", description: "Move Mycosoft devices, samplers, probes, and mission payloads into and out of the field." },
  { icon: Antenna, title: "Relay the network", description: "Bridge LoRa, Wi-Fi, BLE, LTE, satellite, Mycorrhizae Protocol, and device-status traffic." },
  { icon: Cpu, title: "Translate reality", description: "Convert telemetry, observations, radio messages, and sensor data into structured Mycosoft intelligence." },
]

const PAYLOAD_INTEGRATION: { payload: string; weight: string; notes: string }[] = [
  { payload: "MycoNode", weight: "AGARIC-S / M", notes: "Place or recover lightweight field probes, markers, and node packages with mission context intact." },
  { payload: "ALARM", weight: "AGARIC-S / M", notes: "Stage smoke, alert, or field-monitoring units where hand placement is slow or unsafe." },
  { payload: "SporeBase", weight: "AGARIC-M class", notes: "Deploy or retrieve bioaerosol samplers, cassettes, sample capsules, and collection payloads." },
  { payload: "Mushroom 1", weight: "AGARIC-L class", notes: "Support larger Mycosoft hardware, recovery operations, tower moves, and field redeployment." },
  { payload: "Psathyrella", weight: "AGARIC-M / L", notes: "Inspect, relay for, and support water-deployed systems from above the surface." },
  { payload: "Future Mycosoft payloads", weight: "Size-scaled", notes: "Common retention, status detection, power option, and telemetry handshake philosophy across the platform." },
]

const ECOSYSTEM_CONNECTIONS: { system: string; role: string; connection: string; intelligence: string }[] = [
  { system: "MYCA + NatureOS", role: "Mission tasking", connection: "High-level commands, field workflows, and fleet coordination", intelligence: "Turns field intent into safe mission actions." },
  { system: "MINDEX", role: "Mission memory", connection: "Telemetry, payload events, sensor frames, and chain-of-custody records", intelligence: "Stores what happened when the fleet is online." },
  { system: "Mycorrhizae Protocol", role: "Field messaging", connection: "LoRa, Wi-Fi, BLE, LTE, satellite, MDP, MMP, and device-status traffic", intelligence: "Keeps remote systems speaking the same field language." },
  { system: "SporeBase", role: "Bioaerosol collection", connection: "Deployment, cassette/sample recovery, and site inspection", intelligence: "Brings sample collection into aerial workflows." },
  { system: "MycoNode + ALARM", role: "Field device movement", connection: "Placement, retrieval, health checks, and relay support", intelligence: "Extends device networks into hard-to-reach terrain." },
  { system: "Mushroom 1 + Psathyrella", role: "Large field assets", connection: "Inspection, relay, staging support, and recovery assistance", intelligence: "Adds an airborne layer to tower and water deployments." },
  { system: "Hyphae 1", role: "Sensor-array support", connection: "Inspection, staging, relay, and payload movement where applicable", intelligence: "Connects live sensing missions back into Mycosoft systems." },
  { system: "FUSARIUM", role: "Defense field support", connection: "Environmental intelligence, device staging, inspection, relay, and payload movement", intelligence: "Supports constrained-access field missions through inspection, relay, and payload movement." },
]

const VARIANT_SPEC_ROWS: Record<"mini" | "standard" | "heavy", { label: string; value: string }[]> = {
  mini: [
    { label: "Size", value: "AGARIC-S" },
    { label: "Role", value: "Compact field scout and light payload mover" },
    { label: "Flight architecture", value: "Coaxial tangential-flight platform" },
    { label: "Propulsion", value: "Six-point dual-propeller layout, 12 total rotors" },
    { label: "Payload envelope", value: "Up to 100 g class" },
    { label: "Optimized for", value: "Fast inspection, small device movement, short-hop relay, and rapid field checks" },
    { label: "Baseline", value: "Small foldable airframe, compact battery, light sensor package" },
    { label: "Core functions", value: "Lift, deploy, retrieve, relay, inspect, translate, hover, maneuver" },
  ],
  standard: [
    { label: "Size", value: "AGARIC-M" },
    { label: "Role", value: "General field deployment and retrieval droid" },
    { label: "Flight architecture", value: "Coaxial tangential-flight platform" },
    { label: "Propulsion", value: "Six-point dual-propeller layout, 12 total rotors" },
    { label: "Payload envelope", value: "Up to 500 g class" },
    { label: "Optimized for", value: "Routine Mycosoft payload deployment, retrieval, inspection, and relay" },
    { label: "Baseline", value: "Medium foldable airframe and stronger payload retention" },
    { label: "Core functions", value: "Lift, deploy, retrieve, relay, inspect, translate, hover, maneuver" },
  ],
  heavy: [
    { label: "Size", value: "AGARIC-L" },
    { label: "Role", value: "Heavy field deployment, recovery, and relay droid" },
    { label: "Flight architecture", value: "Coaxial tangential-flight platform" },
    { label: "Propulsion", value: "Six-point dual-propeller layout, 12 total rotors" },
    { label: "Payload envelope", value: "Up to 2 kg class" },
    { label: "Optimized for", value: "Heavier payloads, stronger recovery operations, longer relay windows, and field support" },
    { label: "Baseline", value: "Large high-stability airframe, high-capacity battery, reinforced payload structure" },
    { label: "Core functions", value: "Lift, deploy, retrieve, relay, inspect, translate, hover, maneuver" },
  ],
}

const PRICING_TIERS = [
  {
    name: "AGARIC-S",
    price: "Small",
    audience: "Compact field scout and light payload mover",
    includes: "Built for light payloads, fast inspection, short-hop relay, and small Mycosoft device movement.",
  },
  {
    name: "AGARIC-M",
    price: "Medium",
    audience: "General field deployment and retrieval droid",
    includes: "Built for routine payload deployment, SporeBase-class recovery, inspection, relay, and field translation.",
  },
  {
    name: "AGARIC-L",
    price: "Large",
    audience: "Heavy field deployment, recovery, and relay droid",
    includes: "Built for larger Mycosoft payloads, buoy support, multi-device retrieval, longer relay windows, and recovery hardware where required.",
  },
]

export function AgaricDetails() {
  const [activeUseCase, setActiveUseCase] = useState(0)
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string>("avionics")
  const heroRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  return (
    <NeuromorphicProvider>
    <div className="agaric-glass-page min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-white overflow-x-hidden">
      {/* Hero Section - locked first-party Agaric video with data-over-video for neuromorphic theme consistency */}
      <motion.section
        ref={heroRef}
        className="relative h-screen w-full overflow-hidden"
        style={{ opacity: heroOpacity }}
        data-over-video
      >
        {/* Background Video */}
        <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
          <InstantHeroVideo
            mp4Src={AGARIC_ASSETS.videos.hero}
            youtubeId={AGARIC_ASSETS.youtube.hero}
            poster={AGARIC_ASSETS.heroImage}
            mp4StartTimeoutMs={1200}
            nasProbeTimeoutMs={700}
            videoClassName="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black" />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          className="relative z-10 h-full flex flex-col items-center justify-start px-4 pt-0 text-center"
          style={{ y: textY }}
        >
          <motion.h1
            className="relative z-20 mb-2 flex w-full items-center justify-center leading-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <span className="sr-only">Agaric</span>
            <AgaricShardTitle />
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <NeuBadge variant="default" className="device-hero-badge mb-4 bg-red-500/20 text-red-400 border-red-500/50 text-sm px-4 py-1">
              Flying Sensor Droid
            </NeuBadge>
          </motion.div>

          <motion.p
            className="device-hero-subtitle text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            A flying sensor droid built to deploy, retrieve, connect, and sense the world.
            <br />
            <br />
            <span className="text-white">Designed from the ground up to do what traditional drones can't:</span>
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <a
              href={AGARIC_HERO_YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch the Agaric hero video on YouTube"
            >
              <NeuButton
                variant="default"
                className="device-cta-over-video-outline min-h-[44px] px-8 border border-white/30 hover:bg-white/10"
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Learn More
              </NeuButton>
            </a>
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
      <section className="agaric-mission py-24 px-4 bg-slate-100 dark:bg-black text-slate-900 dark:text-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Our Mission</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
              Why <span className="text-red-600 dark:text-red-400">Agaric</span> Exists
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
                <span className="text-red-600 dark:text-red-400 font-semibold">AGARIC</span> is not a commodity FPV quadcopter
                or imported flying camera. It is a fully U.S.-made autonomous flying sensor droid built around a 6-degree-of-freedom
                propulsion architecture and a coaxial lynchpin design.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                AGARIC autonomously deploys, retrieves, inspects, relays, and connects Mycosoft field devices across real terrain.
                It links Mushroom 1, SporeBase, MycoNode, Hyphae 1, Psathyrella, NatureOS, MINDEX, MYCA, and FUSARIUM into a mobile aerial layer.
              </p>
              <p className="text-xl text-slate-700 dark:text-white/80 leading-relaxed">
                Missions are fully automated and operated by AI instead of handheld controllers. MYCA and the MAS at MYCOSOFT plan,
                deploy, monitor, maintain, and adapt AGARIC missions as part of the broader Mycosoft intelligence network.
              </p>

              <div className="flex flex-wrap gap-6 pt-4 justify-start">
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">55m</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Max flight target</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">10km</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">LoRa LOS class</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">2kg</div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Payload target</div>
                </div>
                <div className="text-center min-w-[4.5rem]">
                  <div className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">IP55</div>
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
              <div className="relative aspect-[16/9] min-h-[360px] overflow-hidden rounded-2xl border border-red-500/20">
                <Image
                  src={encodeAssetUrl(AGARIC_ASSETS.missionImage)}
                  alt="Agaric main product view in a clean lab bay"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </div>
              {/* Floating feature badges */}
              <motion.div
                className="absolute -top-4 -right-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-red-400" />
                  <span className="text-sm">Hot-swappable Li pack</span>
                </div>
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-red-400" />
                  <span className="text-sm">Mesh Network</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sensor Capabilities */}
      <section className="agaric-technology relative py-24 bg-black overflow-hidden">
        <AgaricTechnologyShaderBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-black/45 text-white border-white/20 backdrop-blur-md">Technology</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-black">
              Sensor + Payload <span className="text-black">Equipment</span>
            </h2>
            <p className="text-xl text-black max-w-3xl mx-auto">
              Cameras are navigation and inspection sensors inside a broader field droid: environmental sensing, range sensing, RF payloads,
              relay radios, and payload equipment all scale by mission and size.
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
                <NeuCard className="agaric-sensor-card bg-black/45 dark:!bg-black/45 border-white/15 hover:border-red-400/60 backdrop-blur-md transition-colors h-full">
                  <NeuCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-red-500/20">
                        <sensor.icon className="h-6 w-6 text-red-300" />
                      </div>
                      <h3 className="text-white font-semibold">{sensor.name}</h3>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <ul className="space-y-2">
                      {sensor.specs.map((spec, j) => (
                        <li key={j} className="flex items-center gap-2 text-white/75 text-sm">
                          <Check className="h-4 w-4 text-red-300 flex-shrink-0" />
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
                className="agaric-network-card text-center p-6 rounded-xl bg-black/45 backdrop-blur-md border border-white/15"
              >
                <div className="inline-flex p-4 rounded-full bg-red-500/20 mb-4">
                  <feature.icon className="h-8 w-8 text-red-300" />
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-white/70 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Field deployment image */}
      <section className="agaric-field-deployments py-24 bg-white dark:bg-black">
        <div className="w-full px-0">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 px-4"
          >
            <NeuBadge variant="default" className="agaric-field-badge mb-4 bg-red-600/80 text-white border-red-700/40 dark:!bg-red-500/20 dark:!text-red-300 dark:!border-red-500/40">Field Deployments</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
              Wide-area <span className="text-red-600 dark:text-red-400">field flight</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative aspect-[24/9] min-h-[340px] w-full overflow-hidden border-y border-slate-200 dark:border-white/10"
          >
            <Image
              src={encodeAssetUrl(AGARIC_ASSETS.fieldImage)}
              alt="Agaric flying over a desert canyon field deployment zone"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-8 left-4 right-4 md:left-10 md:right-10">
              <NeuBadge variant="default" className="bg-black/50 backdrop-blur-sm border-white/20 mb-3 text-white">
                <MapPin className="h-3 w-3 mr-1" />
                Remote terrain operations
              </NeuBadge>
              <p className="max-w-4xl text-xl md:text-2xl text-white/85">
                AGARIC lifts, deploys, retrieves, relays, inspects, translates, hovers, and maneuvers across hard-to-reach landscapes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Payload integration */}
      <section className="agaric-payload py-24 px-4 bg-slate-50 dark:bg-black border-y border-slate-200/80 dark:border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
              Payload Interface
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Payload <span className="text-red-600 dark:text-red-400">integration</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              Every size uses the same AGARIC payload interface philosophy: mechanical retention, status detection,
              safe release, safe recovery, optional power, and telemetry handshake where available.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/80">
            <table className="min-w-[640px] w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-left">
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Payload</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Size envelope</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Integration notes</th>
                </tr>
              </thead>
              <tbody>
                {PAYLOAD_INTEGRATION.map((row) => (
                  <tr key={row.payload} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="p-4 font-medium text-red-700 dark:text-red-300">{row.payload}</td>
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
      <section className="agaric-applications relative py-24 bg-black overflow-hidden">
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={encodeAssetUrl(AGARIC_ASSETS.videos.capabilities)} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-300 border-red-500/30 backdrop-blur-md">Capabilities</NeuBadge>
            <h2 className="agaric-capabilities-title text-4xl md:text-5xl font-bold mb-4 text-white">
              What <span className="text-red-300">Agaric</span> Can Do
            </h2>
            <p className="text-xl text-white/75 max-w-3xl mx-auto">
              Four mission scenarios combine the same AGARIC functions across every size. AGARIC-S, AGARIC-M, and AGARIC-L change the lift envelope, not the mission identity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-8">
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
                      : 'bg-black/45 backdrop-blur-md border-white/15 text-white hover:bg-black/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${activeUseCase === i ? 'bg-white/20' : 'bg-white/10'}`}>
                      <useCase.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-red-300">{useCase.title}</h3>
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

            {/* Active capability image */}
            <motion.div
              key={activeUseCase}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-[16/9] min-h-[360px] rounded-2xl overflow-hidden border border-white/10"
            >
              {USE_CASES[activeUseCase].video ? (
                <video
                  key={USE_CASES[activeUseCase].video}
                  aria-label={`${USE_CASES[activeUseCase].title} video`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  controlsList="nodownload nofullscreen noremoteplayback"
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src={encodeAssetUrl(USE_CASES[activeUseCase].video)} type="video/mp4" />
                </video>
              ) : (
                <Image
                  key={USE_CASES[activeUseCase].image}
                  src={encodeAssetUrl(USE_CASES[activeUseCase].image)}
                  alt={`${USE_CASES[activeUseCase].title} close-up`}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-black drop-shadow-[0_2px_12px_rgba(255,255,255,0.92)]">{USE_CASES[activeUseCase].title}</h3>
                <p className="text-white/70 mt-2">{USE_CASES[activeUseCase].description}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blueprint Section - Placeholder for Interactive 2D Diagram */}
      <section className="agaric-engineering py-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Engineering</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Inside <span className="text-red-600 dark:text-red-400">AGARIC</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-3xl mx-auto">
              Explore the component layers that let AGARIC lift, deploy, retrieve, relay, inspect, translate, hover, and maneuver:
              MycoBrain central board coordination, Jetson edge compute, and a 12-rotor coaxial platform rather than a traditional tilt-to-move quadcopter.
            </p>
          </motion.div>

          {/* Control Device Layout - Industrial Control Panel Aesthetic */}
          <div className="relative bg-slate-100 dark:bg-black/70 rounded-3xl border-2 border-red-500/30 p-6 shadow-2xl shadow-red-500/5">
            {/* Control Panel Frame */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel - Component Selectors */}
                <div className="bg-black rounded-2xl border border-red-500/40 p-4 shadow-inner">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono text-red-400/70 uppercase tracking-wider">Component Selector</span>
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
                              ? 'bg-red-500/20 border-red-400 shadow-lg shadow-red-500/30'
                              : isHovered
                                ? 'bg-red-500/10 border-red-500/50'
                                : 'bg-black/55 border-white/10 hover:border-red-500/40'
                  }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-red-500/30' : 'bg-black/70 border border-white/10'}`}>
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-red-400' : 'text-white/50'}`} />
                    </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-red-400' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                          {isSelected && (
                            <motion.div
                              layoutId="selector-indicator"
                              className="mt-2 h-0.5 bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget - Below Controller */}
                <div className="bg-black rounded-2xl border border-red-500/40 p-4 shadow-inner flex-1">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono text-red-400/70 uppercase tracking-wider">Component Details</span>
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
                          <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                            <component.icon className="h-6 w-6 text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-red-400">{component.name}</h3>
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
                <div className="relative flex-1 min-h-[500px] bg-black rounded-2xl border border-red-500/40 overflow-hidden shadow-inner">
                {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-15" style={{
                  backgroundImage: `
                      linear-gradient(rgba(239,68,68,0.35) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(239,68,68,0.35) 1px, transparent 1px)
                  `,
                    backgroundSize: '30px 30px'
                }} />

                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-mono text-red-400/70 uppercase tracking-wider">Interactive Blueprint</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">AGARIC // FLYING SENSOR DROID</span>
                    </div>
                  </div>

                  {/* Device Blueprint - Vertical orientation */}
                  <div className="absolute inset-0 flex items-center justify-center p-4 pt-12">
                    <div className="relative h-full w-full">
                    <Image
                      src={encodeAssetUrl(AGARIC_ASSETS.mainImage)}
                      alt="Agaric Blueprint"
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
                                <div className="w-full h-full border-t-2 border-dashed border-red-400" />
                              </motion.div>
                            )}

                            {/* Marker */}
                            <motion.div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isActive
                                  ? 'bg-red-400 border-white shadow-lg shadow-red-400/50'
                                  : 'bg-red-500/40 border-red-500/50'
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
                                  className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-red-500/30 z-30"
                                >
                                  <span className="text-sm font-medium text-red-400 whitespace-nowrap">{component.name}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-red-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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

      {/* Relay network visualization */}
      <section className="agaric-connectivity relative py-24 bg-white dark:bg-black overflow-hidden">
        {/* Network animation background */}
        <NetworkCanvas className="opacity-80" />
        <div className="relative z-10 w-full px-0">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 px-4"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Connectivity</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              <span className="text-red-600 dark:text-red-400">Relay</span> the Network
            </h2>
            <p className="text-xl text-slate-700 dark:text-white/60 max-w-3xl mx-auto">
              AGARIC acts as a flying communications node, bridging field devices, gateways, MYCA, NatureOS, MINDEX,
              and Mycosoft command layers when terrain, water, distance, or infrastructure breaks normal communications.
            </p>
          </motion.div>

          <div className="relative aspect-[21/9] min-h-[360px] w-full overflow-hidden border-y border-red-500/20">
            <Image
              src={encodeAssetUrl(AGARIC_ASSETS.connectivityImage)}
              alt="Agaric forest connectivity deployment"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-red-500/20 dark:border-red-500/30">
                  <Globe className="h-8 w-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">Field bridge</h3>
                  <p className="text-slate-600 dark:!text-white/90">Hover windows can carry traffic over canopy, ridges, coastlines, water surfaces, and incident zones that block fixed ground nodes.</p>
                </div>
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-red-500/20 dark:border-red-500/30">
                  <Network className="h-8 w-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">Protocol translation</h3>
                  <p className="text-slate-600 dark:!text-white/90">Radio traffic, telemetry, MDP, MMP, and Mycorrhizae envelopes can become structured MYCA and NatureOS-readable state.</p>
                </div>
                <div className="agaric-connectivity-card bg-white/80 dark:!bg-gray-700 backdrop-blur-sm rounded-xl p-6 border border-red-500/20 dark:border-red-500/30">
                  <Database className="h-8 w-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:!text-white">MINDEX handoff</h3>
                  <p className="text-slate-600 dark:!text-white/90">When online, mission traces, telemetry, payload events, and sensor frames can route into MINDEX for mission memory and records.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem integration */}
      <section className="agaric-ecosystem py-24 px-4 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
              Ecosystem
            </NeuBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Connected to <span className="text-red-600 dark:text-red-400">Mycosoft field systems</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              AGARIC connects Mushroom 1, SporeBase, MycoNode, Hyphae 1, Psathyrella, NatureOS, MINDEX, MYCA, and FUSARIUM
              into a mobile aerial layer for real-world environmental intelligence missions.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-[720px] w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-left bg-slate-50 dark:bg-black/80">
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">System</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Role</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">AGARIC connection</th>
                  <th className="p-4 font-semibold text-slate-900 dark:text-white">Intelligence value</th>
                </tr>
              </thead>
              <tbody>
                {ECOSYSTEM_CONNECTIONS.map((row) => (
                  <tr key={row.system} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.system}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.role}</td>
                    <td className="p-4 text-slate-700 dark:text-white/80">{row.connection}</td>
                    <td className="p-4 text-slate-600 dark:text-white/70">{row.intelligence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Technical specifications — size architecture */}
      <section className="agaric-specifications py-24 bg-slate-100 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Specifications</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Size <span className="text-red-600 dark:text-red-400">Architecture</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              AGARIC is one Flying Sensor Droid platform in three physical sizes. Compare the lift, payload, and mission support envelope for each version.
            </p>
          </motion.div>

          <Tabs defaultValue="mini" className="w-full">
            <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-10 h-auto p-1 bg-white/80 dark:bg-black/70 border border-slate-200 dark:border-white/10">
              <TabsTrigger value="mini" className="min-h-[44px] text-sm md:text-base">
                AGARIC-S
              </TabsTrigger>
              <TabsTrigger value="standard" className="min-h-[44px] text-sm md:text-base">
                AGARIC-M
              </TabsTrigger>
              <TabsTrigger value="heavy" className="min-h-[44px] text-sm md:text-base">
                AGARIC-L
              </TabsTrigger>
            </TabsList>
            {(["mini", "standard", "heavy"] as const).map((key) => (
              <TabsContent key={key} value={key}>
                <NeuCard className="agaric-spec-card bg-white dark:!bg-gray-700 border-slate-200 dark:border-white/10">
                  <NeuCardHeader>
                    <h3 className="text-slate-900 dark:!text-white flex items-center gap-2 font-semibold">
                      <Plane className="h-5 w-5 text-red-600 dark:text-red-400" />
                      {key === "mini" ? "AGARIC-S" : key === "standard" ? "AGARIC-M" : "AGARIC-L"}
                    </h3>
                  </NeuCardHeader>
                  <NeuCardContent className="space-y-0">
                    {VARIANT_SPEC_ROWS[key].map((spec) => (
                      <div
                        key={spec.label}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-3 border-b border-slate-200 dark:border-white/10 last:border-0"
                      >
                        <span className="text-slate-500 dark:!text-white/80">{spec.label}</span>
                        <span className="text-slate-900 dark:!text-red-300 font-medium text-right sm:text-left">{spec.value}</span>
                      </div>
                    ))}
                  </NeuCardContent>
                </NeuCard>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-8 flex justify-center">
            <NeuButton
              variant="default"
              className="min-h-[44px] border-red-500/30 dark:border-red-500/50 dark:bg-black/70 text-slate-900 dark:!text-white hover:bg-red-500/10 dark:hover:bg-red-950/40"
              onClick={() => document.querySelector(".agaric-ecosystem")?.scrollIntoView({ behavior: "smooth" })}
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              View Ecosystem Links
            </NeuButton>
          </div>
        </div>
      </section>

      {/* Size family */}
      <section className="agaric-pricing relative overflow-hidden py-24 px-4 bg-white dark:bg-black border-y border-slate-200/80 dark:border-white/10">
        <div className="absolute inset-0">
          <Image
            src={encodeAssetUrl(AGARIC_ASSETS.sizesImage)}
            alt="Agaric size comparison in a clean lab bay"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-white/28 dark:bg-black/18" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/58 via-white/12 to-white/62 dark:from-black/48 dark:via-black/8 dark:to-black/56" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <NeuBadge variant="default" className="mb-4 bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30">
              Three Sizes
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              One droid. <span className="text-red-600 dark:text-red-400">Three sizes.</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-white/70 max-w-3xl mx-auto">
              Every size performs the same AGARIC functions. The only difference is scale: payload envelope, endurance,
              recovery hardware, and mission support capacity. The distinctive flight form stays the same: 12 rotors,
              paired coaxially for level translation and stable orientation.
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
                      <NeuBadge variant="default" className="shrink-0 bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30">
                        {tier.price}
                      </NeuBadge>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <p className="text-slate-700 dark:text-white/75 leading-relaxed">{tier.includes}</p>
                    <NeuButton
                      className="mt-6 w-full min-h-[44px] bg-red-600 hover:bg-red-700 !text-white"
                      onClick={() => router.push(`/contact?topic=${encodeURIComponent(tier.name)}`)}
                    >
                      Discuss {tier.name}
                    </NeuButton>
                  </NeuCardContent>
                </NeuCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA with wide forest flight video */}
      <section className="relative py-40 md:py-56 min-h-[800px] md:min-h-[900px] overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            controls={false}
            controlsList="nodownload noplaybackrate nofullscreen"
            aria-label="Agaric flying through a forest canopy"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 70%' }}
          >
            <source src={encodeAssetUrl(AGARIC_ASSETS.videos.footer)} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center flex flex-col justify-center min-h-[600px] md:min-h-[700px]">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white [-webkit-text-stroke:1.25px_rgba(220,38,38,0.95)] [text-shadow:0_3px_0_rgba(127,29,29,0.85),0_10px_30px_rgba(0,0,0,0.85)]">
              Ready to connect the field?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              AGARIC extends Mycosoft intelligence into the air: one flying droid in three sizes for lift,
              deploy, retrieve, relay, inspect, translate, hover, and maneuver missions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <NeuButton
                className="min-h-[44px] px-8 py-6 text-lg bg-red-600 hover:bg-red-700 !text-white font-semibold"
                onClick={() => document.querySelector(".agaric-specifications")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Plane className="mr-2 h-6 w-6" />
                View Size Architecture
              </NeuButton>
            </div>
          </motion.div>
        </div>
      </section>

      <style jsx global>{`
        .dark .agaric-glass-page,
        .dark .agaric-glass-page .agaric-mission,
        .dark .agaric-glass-page .agaric-field-deployments,
        .dark .agaric-glass-page .agaric-payload,
        .dark .agaric-glass-page .agaric-technology,
        .dark .agaric-glass-page .agaric-applications,
        .dark .agaric-glass-page .agaric-engineering,
        .dark .agaric-glass-page .agaric-connectivity,
        .dark .agaric-glass-page .agaric-ecosystem,
        .dark .agaric-glass-page .agaric-specifications,
        .dark .agaric-glass-page .agaric-pricing {
          background-color: #000 !important;
          color: #fff !important;
        }

        .dark .agaric-glass-page .dark\\:bg-slate-900,
        .dark .agaric-glass-page .dark\\:bg-slate-950,
        .dark .agaric-glass-page .dark\\:bg-slate-800,
        .dark .agaric-glass-page .dark\\:bg-gray-700,
        .dark .agaric-glass-page .dark\\:bg-gray-800,
        .dark .agaric-glass-page .dark\\:\\!bg-gray-700,
        .dark .agaric-glass-page .dark\\:\\!bg-gray-800 {
          background-color: rgba(5, 5, 5, 0.84) !important;
        }

        .agaric-glass-page .neu-raised,
        .agaric-glass-page .neu-raised-sm,
        .agaric-glass-page .neu-btn,
        .agaric-glass-page .agaric-sensor-card,
        .agaric-glass-page .agaric-network-card,
        .agaric-glass-page .agaric-usecase-card,
        .agaric-glass-page .agaric-connectivity-card,
        .agaric-glass-page .agaric-spec-card,
        .agaric-glass-page [class*="rounded-xl"][class*="border"],
        .agaric-glass-page [class*="rounded-2xl"][class*="border"],
        .agaric-glass-page [class*="rounded-3xl"][class*="border"] {
          position: relative;
          overflow: hidden;
          border-color: rgba(220, 38, 38, 0.32) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.38)),
            radial-gradient(circle at 12% 0%, rgba(239, 68, 68, 0.16), transparent 34%),
            rgba(255, 255, 255, 0.36) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.72),
            0 18px 55px rgba(15, 23, 42, 0.14),
            0 4px 16px rgba(220, 38, 38, 0.08) !important;
          -webkit-backdrop-filter: blur(20px) saturate(1.3);
          backdrop-filter: blur(20px) saturate(1.3);
        }

        .dark .agaric-glass-page .neu-raised,
        .dark .agaric-glass-page .neu-raised-sm,
        .dark .agaric-glass-page .neu-btn,
        .dark .agaric-glass-page .agaric-sensor-card,
        .dark .agaric-glass-page .agaric-network-card,
        .dark .agaric-glass-page .agaric-usecase-card,
        .dark .agaric-glass-page .agaric-connectivity-card,
        .dark .agaric-glass-page .agaric-spec-card,
        .dark .agaric-glass-page [class*="rounded-xl"][class*="border"],
        .dark .agaric-glass-page [class*="rounded-2xl"][class*="border"],
        .dark .agaric-glass-page [class*="rounded-3xl"][class*="border"] {
          color: #fff !important;
          border-color: rgba(248, 113, 113, 0.34) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.045)),
            radial-gradient(circle at 14% 0%, rgba(220, 38, 38, 0.24), transparent 38%),
            rgba(5, 5, 5, 0.72) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -1px 0 rgba(255, 255, 255, 0.06),
            0 26px 70px rgba(0, 0, 0, 0.48),
            0 8px 28px rgba(220, 38, 38, 0.11) !important;
        }

        .agaric-glass-page .neu-raised::before,
        .agaric-glass-page .neu-raised-sm::before,
        .agaric-glass-page .neu-btn::before,
        .agaric-glass-page .agaric-sensor-card::before,
        .agaric-glass-page .agaric-network-card::before,
        .agaric-glass-page .agaric-usecase-card::before,
        .agaric-glass-page .agaric-connectivity-card::before,
        .agaric-glass-page .agaric-spec-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(120deg, rgba(255, 255, 255, 0.42), transparent 32%),
            radial-gradient(circle at 85% 12%, rgba(255, 255, 255, 0.28), transparent 26%);
          opacity: 0.58;
        }

        .dark .agaric-glass-page .neu-raised::before,
        .dark .agaric-glass-page .neu-raised-sm::before,
        .dark .agaric-glass-page .neu-btn::before,
        .dark .agaric-glass-page .agaric-sensor-card::before,
        .dark .agaric-glass-page .agaric-network-card::before,
        .dark .agaric-glass-page .agaric-usecase-card::before,
        .dark .agaric-glass-page .agaric-connectivity-card::before,
        .dark .agaric-glass-page .agaric-spec-card::before {
          background:
            linear-gradient(120deg, rgba(255, 255, 255, 0.22), transparent 30%),
            radial-gradient(circle at 88% 10%, rgba(248, 113, 113, 0.18), transparent 30%);
          opacity: 0.72;
        }

        .agaric-glass-page .neu-btn > *,
        .agaric-glass-page .neu-raised > *,
        .agaric-glass-page .neu-raised-sm > *,
        .agaric-glass-page .agaric-sensor-card > *,
        .agaric-glass-page .agaric-network-card > *,
        .agaric-glass-page .agaric-usecase-card > *,
        .agaric-glass-page .agaric-connectivity-card > *,
        .agaric-glass-page .agaric-spec-card > * {
          position: relative;
          z-index: 1;
        }

        .agaric-glass-page .agaric-sensor-card svg,
        .agaric-glass-page .agaric-network-card svg,
        .agaric-glass-page .agaric-connectivity-card svg,
        .agaric-glass-page .agaric-spec-card svg,
        .agaric-glass-page .neu-btn svg {
          color: #dc2626 !important;
          stroke: currentColor !important;
        }

        .agaric-glass-page .bg-blue-500,
        .agaric-glass-page .bg-blue-600,
        .agaric-glass-page .bg-cyan-500,
        .agaric-glass-page .bg-indigo-500 {
          background-color: rgba(220, 38, 38, 0.22) !important;
          border-color: rgba(220, 38, 38, 0.36) !important;
        }

        .agaric-glass-page .text-blue-400,
        .agaric-glass-page .text-blue-500,
        .agaric-glass-page .text-blue-600,
        .agaric-glass-page .text-cyan-400,
        .agaric-glass-page .text-cyan-500,
        .agaric-glass-page .text-indigo-400,
        .agaric-glass-page .text-indigo-500 {
          color: #dc2626 !important;
        }

        .dark .agaric-glass-page table,
        .dark .agaric-glass-page thead,
        .dark .agaric-glass-page tbody,
        .dark .agaric-glass-page tr {
          background-color: rgba(0, 0, 0, 0.62) !important;
        }

        .dark .agaric-glass-page .border-slate-200,
        .dark .agaric-glass-page .dark\\:border-white\\/10 {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
      `}</style>

    </div>
    </NeuromorphicProvider>
  )
}
