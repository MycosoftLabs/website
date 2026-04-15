"use client"

import { useState, useRef, useMemo } from "react"
import Image from "next/image"
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
  Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Box, Network, Shield, Zap, Eye, Thermometer, HardDrive,
  Droplets, Activity, MapPin, Globe, Microscope, Package,
  Cpu, Battery, Signal, Cloud, Plug, Cable, Radio,
  ExternalLink, Check, CircuitBoard, Layers, Maximize,
  ArrowRight, Square, RectangleHorizontal, RectangleVertical,
  Radar, ScanSearch, Antenna,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { deviceHeroVideoSources } from "@/lib/asset-video-sources"
import { InfrastructureGrid } from "@/components/effects/scrolling-grid"
import { InfrastructureDotGrid } from "@/components/effects/dot-grid-pulse"
import { ProductShowcaseDots } from "@/components/effects/connected-dots"

// ============================================================================
// HYPHAE 1 MEDIA ASSETS
// Place media files in: public/assets/hyphae1/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\hyphae1\
// Public URL: /assets/hyphae1/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// After pasting an image in Cursor chat, run from website repo:
//   npm run assets:sync-cursor-image -- -Preset hyphae-why
//   (scripts/sync-cursor-chat-image-to-public.ps1 -ListPresets for all presets)
// ============================================================================
// Hero MP4 on NAS / repo: public/assets/hyphae1/hero.mp4 (must match filename on disk).
// Optional: set NEXT_PUBLIC_HYPHAE_HERO_VIDEO_URL to an absolute MP4 URL instead.

const HYPHAE1_ASSETS = {
  // Product stills used while the hero video is warming up.
  // These must point at files that actually exist locally/NAS so the hero never flashes
  // a broken-image icon before the MP4 starts playing.
  compact: "/assets/hyphae1/why-outdoor-install.png",
  standard: "/assets/hyphae1/hyphae1-lab-prototype.png",
  industrial: "/assets/hyphae1/why-outdoor-install.png",
  // Generic fallback
  mainImage: "/images/hyphae1-card.svg",
  // Gallery images
  gallery: [
    { src: "/assets/hyphae1/gallery-1.jpg", alt: "Hyphae 1 Compact", location: "Panel Mounted" },
    { src: "/assets/hyphae1/gallery-2.jpg", alt: "Hyphae 1 Standard", location: "DIN Rail" },
    { src: "/assets/hyphae1/gallery-3.jpg", alt: "Hyphae 1 Industrial", location: "Field Deploy" },
  ],
  // Hero background — same file as lib/devices.ts video slug (hero.mp4)
  heroVideo: "/assets/hyphae1/hero.mp4",
  // Why Hyphae 1 — outdoor product photo (add file: public/assets/hyphae1/why-outdoor-install.png)
  whyOutdoorInstall: "/assets/hyphae1/why-outdoor-install.png",
  /** Lab / workshop photo — prototype on bench (public/assets/hyphae1/hyphae1-lab-prototype.png) */
  labPrototype: "/assets/hyphae1/hyphae1-lab-prototype.png",
}

/** Hero still — Hyphae 1 product imagery per size (no cross-product fallbacks). */
const HYPHAE_VARIANT_HERO_STILL: Record<string, string> = {
  compact: HYPHAE1_ASSETS.compact,
  standard: HYPHAE1_ASSETS.standard,
  industrial: HYPHAE1_ASSETS.industrial,
}

interface HyphaeVariant {
  id: string
  name: string
  size: string
  dimensions: string
  icon: LucideIcon
  description: string
}

/** Same on every size card — edge stack */
const HYPHAE_COMPUTE = "MycoBrain + Jetson"

/** Same on every size card — sensing suite */
const HYPHAE_SENSORS =
  "Visual, acoustic, gas, electromagnetic, radiation, motion, and more"

/** Why-section capability tiles (icon + title only) */
const HYPHAE_WHY_CAPABILITIES: { icon: LucideIcon; title: string }[] = [
  { icon: Radar, title: "Radar & LiDAR fusion" },
  { icon: ScanSearch, title: "Full-stack sensing" },
  { icon: Radio, title: "Adaptive connectivity" },
  { icon: Antenna, title: "Virtual antenna mesh" },
]

// Hyphae 1 comes in 3 sizes — exterior dimensions from product specs
const HYPHAE_VARIANTS: HyphaeVariant[] = [
  {
    id: "compact",
    name: "Hyphae 1 Compact",
    size: "Small",
    dimensions: '6" D × 10" W × 12" H',
    icon: Square,
    description:
      "Purpose: minimum footprint and fastest path to a field-proven node—pilots, diligence, forward or vehicle-friendly sites, tight poles and cabinets, boutique labs, and specialty agriculture where a larger shell will not fit.",
  },
  {
    id: "standard",
    name: "Hyphae 1 Standard",
    size: "Medium",
    dimensions: '15.7" × 11.8" × 7.9"',
    icon: RectangleHorizontal,
    description:
      "Purpose: the balanced workhorse for recurring regional rollouts—bases, state and local programs, plants, scaled farms, field labs, and mid-market tech fleets that need full exterior capability at sustainable install and logistics cost.",
  },
  {
    id: "industrial",
    name: "Hyphae 1 Industrial",
    size: "Large",
    dimensions: '19.6" × 15.7" × 7.9"',
    icon: Maximize,
    description:
      "Purpose: maximum volume in one chassis when a single site must carry peak compute, storage, interconnect, and thermal headroom—strategic anchors for major bases, federal programs, flagship factories, national laboratories, and large estates.",
  },
]

// Device Components
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
    id: "housing",
    name: "Outdoor enclosure",
    icon: Box,
    position: { top: "10%", left: "45%" },
    description: "IP66-class shell, serviceable in the field",
    details:
      "UV-stabilized FRP construction with gasketed service access, gland-friendly cable entries, and a chassis ground bus so exterior installs do not become corrosion or lightning surprises. Finish and hardware grade are selected for years outside—not a repurposed indoor PLC box.",
  },
  {
    id: "terminal",
    name: "Sensor & field I/O",
    icon: Cable,
    position: { top: "25%", left: "30%" },
    description: "Industrial terminations, fused where required",
    details:
      "Channel count, wire gauge range, and protection (TVS, fusing) follow the BOM for your modality mix—analog 4–20 mA / 0–10 V, digital, and bus drops land on labeled blocks so field crews can trace circuits without opening schematics on a phone in the rain.",
  },
  {
    id: "controller",
    name: "Edge compute stack",
    icon: Cpu,
    position: { top: "40%", left: "55%" },
    description: "MycoBrain + Jetson-class GPU plane",
    details:
      "The MycoBrain side handles deterministic sensor ingest, bus timing, and MDP-style device behavior. The Jetson-class module carries fusion, tracking, and model inference so you are not forwarding raw radar frames to a distant cloud to learn it rained. Exact SoC memory and thermal solution are configuration-specific.",
  },
  {
    id: "power",
    name: "Power conditioning",
    icon: Plug,
    position: { top: "50%", left: "35%" },
    description: "Field power, surge budget, optional UPS tie-in",
    details:
      "Wide-range DC and/or AC front ends with transient budgeting appropriate to pole and yard environments. Battery or UPS integration is quoted when your program requires ride-through; we avoid promising a single universal hold-up time because load and climate change the math.",
  },
  {
    id: "io",
    name: "Acquisition & expansion",
    icon: CircuitBoard,
    position: { top: "60%", left: "50%" },
    description: "Modality cards and backplane headroom",
    details:
      "Analog front ends, digital isolators, and co-processor slots scale with Standard and Industrial variants. The architecture is built so new sensing slices (e.g., additional RF or particle paths) upgrade as cards—not as a forklift replacement of the whole node.",
  },
  {
    id: "comms",
    name: "Backhaul & mesh",
    icon: Radio,
    position: { top: "70%", left: "40%" },
    description: "Ethernet, Wi-Fi, LoRa, cellular, program RF",
    details:
      "Primary site integration is almost always gigabit Ethernet. LoRa and mesh radios extend coverage across yards and perimeters; cellular modules cover thin backhaul. Higher-tier RF (SDR-class, licensed bands) is integrated when your statement of work defines it—antenna and filter chain are never one-size-fits-all.",
  },
  {
    id: "din",
    name: "Mechanical mounting",
    icon: Layers,
    position: { top: "80%", left: "55%" },
    description: "DIN internal, pole & pad external",
    details:
      "Internal electronics mount on standard 35 mm DIN rail for serviceability. The same chassis ships with pole- and pad-mount hardware so the exterior datacenter sits where the worldview needs to be—not only where an IDF already exists.",
  },
  {
    id: "display",
    name: "Local status & service",
    icon: Eye,
    position: { top: "35%", left: "65%" },
    description: "LED ladder + optional service UI",
    details:
      "Power, link, sync, and alarm LEDs give technicians immediate state without logging in. Optional local display or service port supports commissioning, firmware policy checks, and safe recovery when orchestrator reachability is intermittent.",
  },
]

/** Applications grid — aligned with exterior datacenter + fused sensing value */
const USE_CASES = [
  {
    title: "Defense & sovereign programs",
    icon: Shield,
    color: "from-slate-500 to-slate-700",
    description:
      "Perimeters, flight lines, ports, and forward sites where fused exterior sensing and edge command must survive disconnected or contested links—without cloning another bespoke radar program for every gate.",
    applications: [
      "Fused radar / LiDAR / RF perimeter",
      "Edge command & policy at the pole",
      "Mesh growth per deployed node",
      "Contested spectrum & backup paths",
    ],
  },
  {
    title: "Labs & advanced technology",
    icon: Microscope,
    color: "from-slate-400 to-slate-600",
    description:
      "National, corporate, and university campuses that need instrumented ranges and exteriors treated as datacenter tiers—time-aligned telemetry with rack-grade analytics at the fence.",
    applications: [
      "Live environmental + EM baselines",
      "Range and corridor instrumentation",
      "Edge data residency for research",
      "Mycosoft-native integration surfaces",
    ],
  },
  {
    title: "Industrial & manufacturing estates",
    icon: HardDrive,
    color: "from-slate-500 to-slate-700",
    description:
      "Yards, tank farms, logistics aprons, and plant borders where safety, emissions, and operations need the same live worldview as security—processed at the edge before historians lag reality.",
    applications: [
      "Yard & gate-line situational awareness",
      "Emissions / leak-class sensing fusion",
      "Local OT–IT bridging on-node",
      "Fewer greenfield micro-datacenter builds",
    ],
  },
  {
    title: "Agriculture & critical environments",
    icon: Droplets,
    color: "from-slate-400 to-slate-500",
    description:
      "Field-scale production and watershed assets where live exterior intelligence beats quarterly snapshots—each node feeds a regional mesh common operating picture for food, water, and climate risk.",
    applications: [
      "Field-scale live sensing mesh",
      "Soil gas, water, and micro-weather fusion",
      "Edge agronomic & safety models",
      "Rural backhaul via SDR / LTE / mesh",
    ],
  },
]

/** Larger capabilities grid (detail cards) */
const HYPHAE_FEATURE_CAPABILITIES: {
  icon: LucideIcon
  title: string
  desc: string
}[] = [
  {
    icon: CircuitBoard,
    title: "Sense, process, command—one chassis",
    desc: "Ingest, analytics, alerting, and operator workflows ship together so decisions are not chained through separate sensor buses and remote NOC hops.",
  },
  {
    icon: Cpu,
    title: "Edge datacenter throughput",
    desc: "MycoBrain + Jetson with TPU/GPU paths for fast scoring, correlation, buffering, and continuity when fiber or cloud control planes slow down.",
  },
  {
    icon: Radar,
    title: "Radar economics on the mesh",
    desc: "Composite radar and LiDAR across nodes offsets dedicated targeted-radar CAPEX for many mobility and perimeter missions while staying upgradeable for emitters when doctrine demands them.",
  },
  {
    icon: Globe,
    title: "Live worldview from every modality",
    desc: "Visual, acoustic, chemical, particle, EM, radiation, motion, and RF streams align into one evolving picture per node and across your exterior tier.",
  },
  {
    icon: Antenna,
    title: "Virtual antenna fabric",
    desc: "Networked RF surfaces fuse radar, LiDAR, and WiFi-sense-class feeds—fewer redundant towers and more correlated tracks for command and infrastructure owners.",
  },
  {
    icon: Network,
    title: "Grow the mesh, not the closet count",
    desc: "Each Hyphae widens exterior compute and sensing instead of funding another micro-datacenter carve-out whenever a new yard, hangar row, or lab wing appears.",
  },
  {
    icon: Cloud,
    title: "Mycosoft fabric end-to-end",
    desc: "Common identity, provisioning, telemetry, and orchestration from pole to core—built for programs that cannot tolerate one-off integrators per site.",
  },
  {
    icon: Shield,
    title: "Built for weather, EMI, and vibration",
    desc: "IP66-class hardened shells with pole and pad mounting—this lives outside next to storms and dust, not only climate-controlled rows.",
  },
]

/** Representative technical rows — binding numbers ship on the configuration datasheet per SKU & region */
interface HyphaeSpecRow {
  label: string
  value: string
}

const HYPHAE_PHYSICAL_SPEC_ROWS: HyphaeSpecRow[] = [
  {
    label: "Enclosure rating",
    value: "IP66-class (IEC 60529); NEMA 4X–equivalent outdoor intent",
  },
  {
    label: "Operating temperature",
    value: "Electronics rated for wide industrial outdoor span; solar load & altitude derate per install guide",
  },
  {
    label: "Housing & finish",
    value: "UV-stabilized FRP shell, stainless / coated hardware, long-life gasket strategy",
  },
  {
    label: "Mounting",
    value: "Pole, pad, wall, and in-enclosure DIN rail; wind / seismic options by program",
  },
  {
    label: "Power input",
    value: "24 V DC and/or 100–240 V AC field power; surge-conditioned entry (class per BOM)",
  },
  {
    label: "Typical power draw",
    value: "Workload-dependent; Jetson-class inference drives peak—quoted TDP per configuration",
  },
  {
    label: "Dimensions & mass",
    value: "Variant matrix (Compact / Standard / Industrial); final mechanical in CAD release package",
  },
]

/** NAS JPG/PNG missing or 404 — show neutral shell (no fake product photos). */
function HyphaeFillImage({
  src,
  alt,
  sizes,
  className = "object-cover",
}: {
  src: string
  alt: string
  sizes: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <>
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950"
          aria-hidden
        />
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <Box className="h-20 w-20 text-slate-500/35 dark:text-slate-400/25" strokeWidth={0.35} />
        </div>
        <span className="sr-only">{alt}</span>
      </>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  )
}

const HYPHAE_SYSTEM_SPEC_ROWS: HyphaeSpecRow[] = [
  {
    label: "Edge compute stack",
    value:
      "MycoBrain plane for deterministic I/O & sensor buses + Jetson-class GPU module for fusion & models; optional accelerator paths by SKU",
  },
  {
    label: "Sensing front-end",
    value:
      "Multi-modal acquisition: imaging, acoustic, environmental, gas / VOC class, EM, radiation, motion, particulate—exact mix is BOM-defined",
  },
  {
    label: "Storage & continuity",
    value:
      "Local eMMC / NVMe tier for models, ring buffers, and offline queue when backhaul drops—capacity per SKU",
  },
  {
    label: "Connectivity",
    value:
      "Gigabit Ethernet; Wi-Fi; LoRa mesh; LTE or 5G cellular optional; PoE+ where the configuration supports it",
  },
  {
    label: "Time & correlation",
    value:
      "GNSS discipline optional; NTP/PTP over trusted links; hardware timestamping on supported sensor buses",
  },
  {
    label: "Integration surface",
    value:
      "Mycosoft-native telemetry & identity; HTTPS / MQTT; Modbus RTU/TCP; hooks into MAS device registry & orchestration",
  },
  {
    label: "Security posture",
    value:
      "Secure boot & signed update targets; TLS to control plane; keying aligned to your deployment policy (HSM optional)",
  },
  {
    label: "Compliance & warranty",
    value:
      "Marks (CE, FCC, UL, others) and warranty term are confirmed before manufacture—region and vertical drive the stack",
  },
]

export function Hyphae1Details() {
  const [selectedVariant, setSelectedVariant] = useState(HYPHAE_VARIANTS[1])
  const [selectedComponent, setSelectedComponent] = useState("housing")
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  const heroVideoSources = useMemo(() => {
    return deviceHeroVideoSources(HYPHAE1_ASSETS.heroVideo, {
      envUrl: process.env.NEXT_PUBLIC_HYPHAE_HERO_VIDEO_URL,
      aliases: ["/assets/hyphae1/Hyphae 1 Hero.mp4"],
    })
  }, [])

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <NeuromorphicProvider className="hyphae1-neu-root">
    <div className="relative min-h-dvh w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden">
      {/* Hero Section - Clean White Industrial */}
      <section ref={heroRef} className="relative min-h-dvh flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-slate-100 dark:bg-slate-900 pointer-events-none" />
        <AutoplayVideo
          sources={heroVideoSources}
          hideUntilPlaying
          encodeSrc
          className="absolute inset-0 z-[1] h-full w-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 z-[2] bg-slate-900/45 dark:bg-slate-950/55 pointer-events-none" />

        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <NeuBadge variant="default" className="mb-4 bg-slate-800 text-white border-0 text-sm px-4 py-1">
            Edge Datacenter
          </NeuBadge>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4 antialiased"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_3px_20px_rgba(0,0,0,0.75),0_0_48px_rgba(0,0,0,0.45)]">
              Hyphae 1
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl mb-8 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            <span className="text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_3px_20px_rgba(0,0,0,0.75),0_0_48px_rgba(0,0,0,0.45)]">
              The Outside Datacenter
            </span>
            <br />
            <span className="text-white font-medium [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
              Terrestrial Datacenters At The Edge Of Nature
            </span>
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
          >
            <NeuButton size="lg" variant="outline" className="border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Download className="mr-2 h-5 w-5" />
              Download Datasheet
            </NeuButton>
          </motion.div>
        </motion.div>
      </section>

      {/* Variant Showcase — light mode: white cards + dark text; dark mode: elevated slate cards */}
      <section className="hyphae1-product-line relative py-24 bg-white dark:bg-slate-950 overflow-hidden">
        {/* Connected dots background animation - light in both modes for contrast with dark widgets */}
        <ProductShowcaseDots className="opacity-100" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-product-badge mb-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600">
              Product Line
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              Choose Your Size
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Hyphae 1 is a family of mobile, exterior datacenter nodes on Mycosoft protocols—advanced TPU and GPU data systems, continuous sensing of the surroundings, and mesh-native growth so every unit enlarges your network. The proposition for investors, defense, government, and any organization that already buys cloud or colocation is simple: own live intelligence outside the building across military bases, agriculture, laboratories, factories, and technology campuses—without surrendering the field to blind infrastructure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HYPHAE_VARIANTS.map((variant, index) => (
              <motion.div
                key={variant.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedVariant(variant)}
                className={`hyphae1-product-card cursor-pointer rounded-2xl border-2 p-8 transition-all ${
                  selectedVariant.id === variant.id
                    ? "border-slate-900 dark:border-slate-300 bg-slate-50 dark:bg-slate-800 shadow-[8px_8px_20px_rgba(15,23,42,0.08),-4px_-4px_12px_rgba(255,255,255,0.9)] dark:shadow-xl dark:shadow-slate-950/50 ring-1 ring-slate-900/10 dark:ring-white/10 hyphae1-product-card-selected"
                    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-500 shadow-[4px_4px_12px_rgba(15,23,42,0.06),-2px_-2px_8px_rgba(255,255,255,0.85)] dark:shadow-none hover:shadow-md"
                }`}
              >
                <div
                  className={`p-4 rounded-2xl mb-6 w-fit ${
                    selectedVariant.id === variant.id
                      ? "bg-slate-900 dark:bg-slate-600"
                      : "bg-slate-100 dark:bg-slate-700"
                  }`}
                >
                  <variant.icon
                    className={`h-10 w-10 ${
                      selectedVariant.id === variant.id
                        ? "text-white"
                        : "text-slate-700 dark:text-slate-100"
                    }`}
                  />
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">{variant.name}</h3>
                <p className="text-slate-700 dark:text-slate-300 mb-4 text-sm sm:text-base leading-relaxed">
                  {variant.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 shrink-0">
                      Exterior dimensions
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                      {variant.dimensions}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 shrink-0">
                      Compute
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                      {HYPHAE_COMPUTE}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm items-start">
                    <span className="text-slate-600 dark:text-slate-400 shrink-0 pt-0.5">
                      Sensors
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-right max-w-[min(100%,14rem)] sm:max-w-[65%]">
                      {HYPHAE_SENSORS}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section — light: white + dark copy; images: soft neuromorphic elevation */}
      <section className="hyphae1-why py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeuBadge variant="default" className="mb-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600">
                Why Hyphae 1
              </NeuBadge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                Datacenter capacity, outside the building
              </h2>
              <div className="space-y-4 text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                <p>
                  Most consequential failures do not start in a climate-controlled rack—they start
                  where weather, chemistry, motion, and radio spectrum meet your mission, and where
                  leaders still decide on fragmentary pictures of what is actually happening outside.
                  Hyphae 1 exists to close that gap: mobile, exterior datacenter nodes on Mycosoft
                  protocols that unite MycoBrain and Jetson-class compute with TPU- and GPU-driven
                  analytics and continuous field sensing—visual, acoustic, gas, electromagnetic,
                  radiation, motion, and aligned modalities—so terrain, perimeters, and operations
                  beyond the fence become as legible as what sits behind it. For commanders and
                  civil authorities, factories and laboratories, agriculture and global technology
                  platforms, and the investors who underwrite durable infrastructure, it is the
                  difference between guessing at the outside world and owning the ground truth.
                </p>
                <p>
                  Unlike fixed racks alone, every Hyphae 1 widens the operational mesh: more
                  coverage, more correlated field truth, and more resilience for missions that
                  depend on what is happening outdoors—instrumented farms, base expansions,
                  industrial yards, research campuses, and forward technology programs.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">
                    What Hyphae 1 does in one enclosure
                  </p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-slate-500 dark:marker:text-slate-400 text-base text-slate-800 dark:text-slate-300">
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Targeted radar economics:
                      </span>{" "}
                      fused radar, LiDAR, and cooperative RF reduce the need to buy, site, and
                      sustain bespoke million-dollar radars for every corridor, gate line, or
                      yard—while staying upgradeable when doctrine requires a dedicated emitter.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Sense, process, and command together:
                      </span>{" "}
                      not a dumb sensor pack—ingest, TPU/GPU and MycoBrain–Jetson analytics,
                      policy, alerting, and operator workflows run locally so decisions do not
                      bounce through multiple silos before they matter.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        A real exterior datacenter:
                      </span>{" "}
                      rack-class throughput at the pole or pad—fast correlation, model scoring,
                      buffering, and state retention when backhaul degrades, not a Raspberry Pi
                      bolted to a camera.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Collective live worldview:
                      </span>{" "}
                      visual, acoustic, gas, particle, EM, radiation, motion, and RF modalities
                      time-align into a common operating picture around each node and across the
                      mesh so command sees one evolving story, not twenty stale charts.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Mesh instead of micro-datacenter sprawl:
                      </span>{" "}
                      add Hyphae nodes to grow exterior compute and sensing capacity instead of
                      lighting up another closet IDF or mini colo every time a new yard, flight
                      line, or field block comes online—each box widens the same Mycosoft fabric.
                    </li>
                  </ul>
                </div>
              </div>
              
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8"
                role="list"
                aria-label="Hyphae 1 field capabilities"
              >
                {HYPHAE_WHY_CAPABILITIES.map((cap) => {
                  const Icon = cap.icon
                  return (
                    <div
                      key={cap.title}
                      role="listitem"
                      className="flex flex-col items-center gap-2 text-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-[6px_8px_18px_rgba(15,23,42,0.08),-5px_-5px_14px_rgba(255,255,255,0.92)] dark:shadow-none"
                    >
                      <Icon
                        className="h-9 w-9 text-slate-900 dark:text-slate-100 shrink-0"
                        aria-hidden
                      />
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                        {cap.title}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="relative aspect-square rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 shadow-[12px_14px_32px_rgba(15,23,42,0.12),-8px_-8px_22px_rgba(255,255,255,0.95),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[14px_18px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <HyphaeFillImage
                  src={HYPHAE1_ASSETS.whyOutdoorInstall}
                  alt="Hyphae 1 white outdoor enclosure with mushroom logo and antenna on grass, hedge and palm trees in the background"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 592px"
                />
              </div>
              <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 shadow-[12px_14px_32px_rgba(15,23,42,0.12),-8px_-8px_22px_rgba(255,255,255,0.95),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[14px_18px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <HyphaeFillImage
                  src={HYPHAE1_ASSETS.labPrototype}
                  alt="Hyphae 1 physical unit on a stainless lab workbench: white chamfered enclosure with Mycosoft mushroom logo, top-mounted antennas, and side sensor housings"
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 592px"
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center lg:text-left leading-relaxed">
                Field form factor, lab proven—integrated antennas and sensor apertures on a single
                exterior-grade chassis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid — light gray page, white raised cards + dark type */}
      <section className="hyphae1-capabilities py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-capabilities-badge mb-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 shadow-sm dark:shadow-none">
              Capabilities
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              What Hyphae 1 replaces and enables
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              One exterior datacenter that ingests, fuses, decides, and commands—so you spend
              capital on outcomes, not on duplicating radar programs, closet IDFs, and siloed
              sensor contracts.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HYPHAE_FEATURE_CAPABILITIES.map((item) => (
              <NeuCard
                key={item.title}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 shadow-[8px_10px_22px_rgba(15,23,42,0.07),-4px_-4px_14px_rgba(255,255,255,0.85)] dark:shadow-none hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md transition-all"
              >
                <NeuCardContent className="pt-6">
                  <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-600 w-fit mb-4 shadow-[3px_3px_8px_rgba(15,23,42,0.2),-2px_-2px_6px_rgba(255,255,255,0.15)] dark:shadow-none">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{item.title}</h3>
                  <p className="text-slate-700 dark:text-slate-300 text-sm">{item.desc}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Applications — white field + dark scrolling grid in light mode */}
      <section className="hyphae1-applications relative py-24 bg-white dark:bg-slate-950 overflow-hidden">
        <InfrastructureGrid className="opacity-100" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-applications-badge mb-4 bg-white/95 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 shadow-sm backdrop-blur-sm">
              Applications
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              Where exterior datacenters win
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-2">
              Applications assume fused sensing, fast edge processing, and command on the pole—
              the same Hyphae stack whether you secure a base line, instrument a lab campus, run a
              factory yard, or cover critical agriculture.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedCase(index)}
                className={`cursor-pointer rounded-2xl border-2 p-6 transition-all ${
                  selectedCase === index
                    ? "border-slate-900 dark:border-slate-400 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-[8px_10px_24px_rgba(15,23,42,0.1),-4px_-4px_14px_rgba(255,255,255,0.9)] dark:shadow-none ring-1 ring-slate-900/10 dark:ring-0"
                    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 shadow-[4px_6px_16px_rgba(15,23,42,0.05),-2px_-2px_10px_rgba(255,255,255,0.85)] dark:shadow-none"
                }`}
              >
                <useCase.icon className="h-10 w-10 mb-4 text-slate-600 dark:text-white/90" />
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                  {useCase.title}
                </h3>
                <p className="text-sm mb-4 text-slate-700 dark:text-white/80">
                  {useCase.description}
                </p>
                <div className="space-y-1">
                  {useCase.applications.map((app) => (
                    <div key={app} className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 shrink-0 text-slate-500 dark:text-white/55" />
                      <span className="text-slate-600 dark:text-white/75">
                        {app}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inside Hyphae 1 — light: pale shell + dark type; dark: blueprint console */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge
              variant="default"
              className="mb-4 bg-white dark:bg-white/10 text-slate-800 dark:text-white border-slate-200 dark:border-white/20 shadow-sm dark:shadow-none"
            >
              Engineering
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Inside Hyphae 1
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-white/70 max-w-3xl mx-auto leading-relaxed">
              Layered like a small datacenter: conditioned power, deterministic sensor ingest, GPU-class
              fusion, and resilient backhaul—engineered for exterior installs where rack rows and climate
              control do not exist. Component grades, channel counts, and RF chains evolve with your program;
              the interactive breakdown below reflects the architecture customers buy into, not a frozen SKU
              list.
            </p>
          </div>

          {/* Control Device Layout */}
          <div className="relative bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-[8px_12px_32px_rgba(15,23,42,0.06)] dark:shadow-none">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel */}
                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-slate-600 dark:text-white/70 uppercase tracking-wider">
                      Component Selector
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_COMPONENTS.map((component) => {
                      const IconComponent = component.icon
                      const isSelected = selectedComponent === component.id
                      return (
                        <motion.button
                          key={component.id}
                          onClick={() => setSelectedComponent(component.id)}
                          className={`p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "bg-slate-900 border-slate-900 text-white dark:bg-white/10 dark:border-white/40"
                              : "bg-white border-slate-200 hover:border-slate-400 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:border-white/30"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent
                              className={`h-4 w-4 ${
                                isSelected
                                  ? "text-white"
                                  : "text-slate-500 dark:text-white/50"
                              }`}
                            />
                            <span
                              className={`text-xs font-medium ${
                                isSelected
                                  ? "text-white"
                                  : "text-slate-700 dark:text-white/70"
                              }`}
                            >
                              {component.name}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget */}
                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-inner flex-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-mono text-slate-600 dark:text-white/70 uppercase tracking-wider">
                      Component Details
                    </span>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {DEVICE_COMPONENTS.filter(c => c.id === selectedComponent).map((component) => (
                      <motion.div
                        key={component.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-slate-200 border border-slate-300 dark:bg-white/10 dark:border-white/20">
                            <component.icon className="h-6 w-6 text-slate-800 dark:text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{component.name}</h3>
                            <p className="text-xs text-slate-500 font-mono dark:text-white/50">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed">{component.details}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: Schematic */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative flex-1 min-h-[500px] bg-slate-200 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner">
                  {/* Grid pattern — dark lines on light; light lines on dark */}
                  <div
                    className="absolute inset-0 opacity-35 dark:hidden"
                    style={{
                      backgroundImage: `
                      linear-gradient(rgba(15,23,42,0.14) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(15,23,42,0.14) 1px, transparent 1px)
                    `,
                      backgroundSize: "30px 30px",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-20 hidden dark:block"
                    style={{
                      backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
                    `,
                      backgroundSize: "30px 30px",
                    }}
                  />
                  
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-100/95 to-transparent dark:from-slate-900 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-slate-500 uppercase tracking-wider dark:text-white/50">
                        Schematic View
                      </span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-slate-400 dark:text-white/30">
                        HYPHAE-1 // {selectedVariant.size.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Device Visual */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-3/4 h-3/4 border border-slate-400 rounded-lg bg-white/60 dark:border-slate-600 dark:bg-slate-800/50">
                      <Box className="absolute inset-0 w-full h-full text-slate-400/40 dark:text-slate-600/30" strokeWidth={0.3} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-mono text-slate-600 dark:text-slate-500">HYPHAE 1</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-100/95 to-transparent dark:from-slate-900">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-white/30">
                      <span>
                        COMPONENT:{" "}
                        <span className="text-slate-800 dark:text-white/70">
                          {DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}
                        </span>
                      </span>
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

          <p className="text-center text-sm text-slate-600 dark:text-white/45 max-w-3xl mx-auto mt-10 leading-relaxed">
            Schematic is illustrative. Connector pinouts, thermal images, and EMI plots ship with the
            engineering package for your revision—so evaluators see real hardware intent without treating a
            marketing render as a type certificate.
          </p>
        </div>
      </section>

      {/* Technical Specifications — light: white cards + dark type */}
      <section className="hyphae1-tech-specs py-24 bg-slate-50 dark:bg-slate-900" data-section="tech-specs">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              Specifications
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              Technical details
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              The table is a <span className="font-medium text-slate-800 dark:text-slate-200">representative</span>{" "}
              architecture brief—real engineering categories buyers care about, without pretending every
              number is final before your configuration is frozen. Thermal curves, exact TDP, RF masks,
              certifications, and warranty language are issued on the datasheet and drawing package for your
              SKU and region.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="hyphae1-spec-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 p-6 shadow-[8px_10px_26px_rgba(15,23,42,0.07)] dark:shadow-none">
              <div className="flex items-center gap-2 mb-6">
                <Box className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">Exterior &amp; mechanical</span>
              </div>
              <div className="space-y-3">
                {HYPHAE_PHYSICAL_SPEC_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-3 border-b border-slate-200 dark:border-slate-600 last:border-0"
                  >
                    <span className="text-slate-600 dark:text-slate-400 text-sm shrink-0 sm:max-w-[40%]">{row.label}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200 text-sm text-left sm:text-right sm:max-w-[58%]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="hyphae1-spec-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 p-6 shadow-[8px_10px_26px_rgba(15,23,42,0.07)] dark:shadow-none">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">Compute, sense &amp; integration</span>
              </div>
              <div className="space-y-3">
                {HYPHAE_SYSTEM_SPEC_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-3 border-b border-slate-200 dark:border-slate-600 last:border-0"
                  >
                    <span className="text-slate-600 dark:text-slate-400 text-sm shrink-0 sm:max-w-[40%]">{row.label}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200 text-sm text-left sm:text-right sm:max-w-[58%]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-10 leading-relaxed">
            Need binding figures for procurement or safety cases? Mycosoft issues revision-controlled specs
            (power budgets, environmental limits, agency marks, and interface control documents) after
            configuration sign-off—marketing pages stay accurate to the architecture, not to every draft BOM.
          </p>
          
          <div className="flex justify-center gap-4 mt-12">
            <NeuButton variant="outline" className="border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Download className="mr-2 h-4 w-4" />
              Download Full Specifications
            </NeuButton>
            <NeuButton variant="outline" className="border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Eye className="mr-2 h-4 w-4" />
              View CAD Models
            </NeuButton>
          </div>
        </div>
      </section>

      {/* CTA — light: white page band + light card + dark type; dot grid stays visible */}
      <section className="relative py-24 bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden">
        <InfrastructureDotGrid className="opacity-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-700/50 p-10 md:p-14 shadow-[12px_16px_40px_rgba(15,23,42,0.08)] dark:shadow-2xl">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
                Ready to operate your own datacenter?
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                Hyphae 1 puts the Outside Datacenter where nature and operations meet—fused sensing,
                edge inference, and command on the pole, not only in the climate-controlled row. Talk with
                Mycosoft to map modalities, mesh, and compliance for your perimeter, campus, or estate.
              </p>
              
              <div className="flex justify-center">
                <NeuButton
                  size="lg"
                  className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold px-8 min-h-[48px]"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Contact sales
                </NeuButton>
              </div>
              
              <p className="text-sm text-slate-500 dark:text-white/50 mt-8 max-w-xl mx-auto leading-relaxed">
                Configuration-specific datasheets and drawings after sign-off • Mycosoft fabric, MAS registry,
                and field integration support
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </NeuromorphicProvider>
  )
}

