"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { InstantHeroVideo } from "@/components/ui/instant-hero-video"
import { CircuitLinesBackground } from "@/components/devices/circuit-lines-background"
import { youtubeHeroEmbedSrc } from "@/lib/hero-youtube"
import {
  Microscope,
  Wind,
  AlertTriangle,
  Radar,
  Cpu,
  Radio,
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Truck,
  Settings,
  Play,
  Waves,
  Brain,
  Layers,
  Factory,
  RefreshCw,
  Puzzle,
  Plane,
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const devices = [
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    tagline: "Walking Ground Droid",
    description: "Our flagship autonomous environmental drone that monitors underground fungal networks, soil conditions, and environmental data in real-time with unmatched precision.",
    icon: Radar,
    color: "emerald-500",
    image: "/assets/mushroom1/Main A.jpg",
    status: "Development",
    price: "",
    specs: [
      { label: "Sensor Depth", value: "Up to 2 meters" },
      { label: "Battery Life", value: "6 months (solar)" },
      { label: "Wireless Range", value: "5km line of sight" },
      { label: "Data Storage", value: "32GB + cloud" },
      { label: "Environmental", value: "IP67 waterproof" },
      { label: "Temperature", value: "-20°C to 60°C" }
    ],
    features: [
      "Multi-depth soil probes",
      "Real-time bioelectric signal detection",
      "Mesh network with other units",
      "Environmental condition monitoring",
      "Automated data collection and analysis",
      "Long-range LoRa communication"
    ],
    applications: [
      "Forest ecosystem monitoring",
      "Agricultural soil health",
      "Climate research",
      "Conservation projects"
    ]
  },
  {
    id: "sporebase",
    name: "SporeBase",
    tagline: "Breathing Aerosol Collector",
    description: "Time-indexed bioaerosol collection with sealed adhesive tape cassettes for lab-grade analysis and long-term environmental monitoring.",
    icon: Wind,
    color: "orange-500",
    image: "/assets/sporebase/sporebase%20main2.jpg",
    status: "In Stock",
    price: "",
    specs: [
      { label: "Sampling Method", value: "Fan-driven active deposition" },
      { label: "Sample Intervals", value: "2,880 per cassette (30 days)" },
      { label: "Collection Cadence", value: "15 min default (configurable)" },
      { label: "Sample Format", value: "Sealed adhesive tape cassette" },
      { label: "Power Source", value: "MPPT solar + Li-ion battery" },
      { label: "Connectivity", value: "LoRa mesh, WiFi, cellular optional" }
    ],
    features: [
      "Fan-driven active sampling",
      "Time-indexed collection over 30 days",
      "Sealed cassette for lab analysis",
      "Chain-of-custody metadata logging",
      "MycoBrain controller (Dual ESP32-S3)",
      "Mesh networking + remote telemetry"
    ],
    applications: [
      "Mycology research",
      "Allergy forecasting",
      "Agriculture",
      "Air quality"
    ]
  },
  {
    id: "hyphae-1",
    name: "Hyphae 1",
    tagline: "Modular Data Center",
    description: "Industrial-grade modular I/O for building automation, agriculture, and industrial monitoring. Three sizes to fit any deployment.",
    icon: Microscope,
    color: "slate-500",
    image: "/assets/hyphae1/hyphae1-lab-prototype.png",
    status: "In Stock",
    price: "",
    specs: [
      { label: "Enclosure Rating", value: "IP66 / NEMA 4X" },
      { label: "Operating Temp", value: "-40°C to 70°C" },
      { label: "Sensor Channels", value: "4 / 8 / 16" },
      { label: "Communication", value: "Ethernet, LoRa, LTE" },
      { label: "Power Input", value: "24V DC or AC" },
      { label: "Warranty", value: "5 years" }
    ],
    features: [
      "IP66 weatherproof housing",
      "Modular I/O expansion",
      "Modbus/MQTT/REST protocols",
      "Edge computing capability",
      "DIN rail mounting",
      "Multi-variant sizes"
    ],
    applications: [
      "Building automation",
      "Industrial monitoring",
      "Data center climate",
      "Agricultural control"
    ]
  },
  {
    id: "myconode",
    name: "MycoNode",
    tagline: "Mesh Network Probe",
    description: "Buried sensor nodes that detect bioelectric signals from mycelial networks and monitor soil conditions at the microvolt level.",
    icon: Radar,
    color: "purple-500",
    image: "/assets/myconode/myconode-main.png",
    status: "Contact Sales",
    price: "Enterprise",
    specs: [
      { label: "Bioelectric Resolution", value: "0.1 μV" },
      { label: "Deployment Depth", value: "10-50 cm" },
      { label: "Sampling Rate", value: "0.1-10 Hz" },
      { label: "Battery Life", value: "5+ years" },
      { label: "Range", value: "10km LoRa mesh" },
      { label: "IP Rating", value: "IP68 sealed" }
    ],
    features: [
      "Bioelectric voltage sensing",
      "Multi-modal soil monitoring",
      "Edge ML processing",
      "Long-range mesh networking",
      "5-year battery life",
      "Tamper-evident enclosure"
    ],
    applications: [
      "Mycology research",
      "Precision agriculture",
      "Environmental monitoring",
      "Infrastructure protection"
    ]
  },
  {
    id: "psathyrella",
    name: "Psathyrella",
    tagline: "Swimming Sensor Buoy",
    description:
      "Biologically inspired buoy named for Psathyrella aquatica — passive acoustic classification with NLM (SSM/Mamba-class) on Jetson, MycoBrain ESP32-S3 acquisition, six-sense multimodal fusion, four turbopropellers for autonomous repositioning, and Mycorrhizae mesh backhaul into CREP and FUSARIUM.",
    icon: Waves,
    color: "sky-500",
    image: "/assets/psathyrella/hero.png",
    status: "Program",
    price: "Contact",
    specs: [
      { label: "Primary sense", value: "Passive acoustics (0.1 Hz–250 kHz)" },
      { label: "Edge AI", value: "Jetson Orin Nano + NLM" },
      { label: "MCU", value: "ESP32-S3 MycoBrain" },
      { label: "Depth target", value: "Pressure-rated 200 m" },
      { label: "Mesh", value: "LoRa · sat · acoustic modem" },
      { label: "COP / defense", value: "CREP · FUSARIUM · OEI" },
    ],
    features: [
      "NLM real-time passive acoustic classification at the buoy",
      "Graph/hypergraph + sparse attention for arrays and transients",
      "Thermal, chemical, mechanical, bioelectric, optical fusion with acoustics",
      "AVANI governance and MINDEX-style provenance on decisions",
      "Self-healing Mycorrhizae mesh — survive node loss",
      "NatureOS + AI Studio for retraining and fleet workflows",
    ],
    applications: [
      "Littoral and coastal passive acoustic surveillance",
      "Harbor, channel, and choke-point monitoring",
      "Research moorings and environmental intelligence",
      "Defense-grade COP via FUSARIUM when mission requires",
    ],
  },
  {
    id: "agaric",
    name: "Agaric",
    tagline: "Flying Myco Drone",
    description:
      "MycoBrain-powered flying hub that deploys, retrieves, and data-mules for every Mycosoft device. Three variants: Mini, Standard, Heavy-Lift.",
    icon: Plane,
    color: "violet-500",
    image: "/assets/agaric/hero.jpg",
    status: "Development",
    price: "$799 / $1,299 / $2,999",
    specs: [
      { label: "Take-off weight", value: "<249 g / ~800 g / ~4.5 kg (variants)" },
      { label: "Payload", value: "<100 g / ~500 g / up to ~2 kg" },
      { label: "Flight time (target)", value: "34–40 / ~46 / ~50 min" },
      { label: "Range class", value: "LoRa mesh + Wi‑Fi + optional sat" },
      { label: "Payload interface", value: "MicoLatch + winch (Heavy-Lift)" },
      { label: "Ingress", value: "IP55 airframe (Heavy-Lift target)" },
    ],
    features: [
      "Flying Mycorrhizae / MDP gateway",
      "Pixhawk + MycoBrain MAVLink bridge",
      "Deploy & retrieve SporeBase, MycoNode, Mushroom 1",
      "NDAA-oriented BOM path (program)",
      "NatureOS + MAS mission agents",
      "Open ArduPilot / PX4 compatible",
    ],
    applications: [
      "Scientific field deployment",
      "Agriculture & forestry mesh extension",
      "Defense / SAR sensor lift",
      "Ocean relay with Psathyrella-class buoys",
    ],
  },
  {
    id: "alarm",
    name: "ALARM",
    tagline: "Biological Home Alarm",
    description: "Next-generation indoor safety monitor. Detects smoke, mold, pathogens, and air quality threats before they become problems.",
    icon: AlertTriangle,
    color: "red-500",
    image: "/assets/alarm/alarm-device.jpg",
    status: "Coming Soon",
    price: "$49.99",
    specs: [
      { label: "Sensors", value: "8+ types" },
      { label: "Alert Latency", value: "< 60 seconds" },
      { label: "Power", value: "AC + Battery backup" },
      { label: "Connectivity", value: "WiFi, Bluetooth, LoRa" },
      { label: "Form Factor", value: "Standard mount" },
      { label: "Certification", value: "UL 217, CE, FCC" }
    ],
    features: [
      "Dual smoke detection",
      "Mold spore early warning",
      "CO₂ and VOC monitoring",
      "TinyML pattern recognition",
      "Mesh networking",
      "Spoken voice alerts"
    ],
    applications: [
      "Home safety",
      "Schools & daycare",
      "Healthcare facilities",
      "Commercial buildings"
    ]
  }
]

/** Full-bleed /devices hero — NAS: `/assets/devices/droids-hero.mp4` (optional `-web`). Override: `NEXT_PUBLIC_DEVICES_HERO_MP4`. */
const DEVICES_PORTAL_HERO_SOURCES = [
  process.env.NEXT_PUBLIC_DEVICES_HERO_MP4?.trim() || "/assets/devices/droids-hero.mp4",
]
const DEVICES_HERO_YOUTUBE_ID = "9B4sFqvhvSQ"
const DEVICES_HERO_YOUTUBE_URL = "https://www.youtube.com/channel/UCUUEOg35426XDmZ9sPXbDYg"

const MYCOBRAIN_SECTION_BACKGROUNDS = {
  dark: "/assets/devices/mycobrainjetson-black.jpg",
  light: "/assets/devices/mycobrainjetson-white.jpg",
} as const

const MYCOBRAIN_ACTION_VIDEO = {
  mp4: "/assets/devices/mycobrain-hero.mp4",
  poster: MYCOBRAIN_SECTION_BACKGROUNDS.dark,
  youtube: "3WDneg9OHtU",
} as const

const MYCOSOFT_YOUTUBE_CHANNEL = "https://www.youtube.com/@mycosoft"
const DEVICE_YOUTUBE_URLS: Record<string, string> = {
  "mushroom-1": "https://www.youtube.com/watch?v=jpQrYCCACm4",
  sporebase: "https://www.youtube.com/watch?v=Gc3FUxi6Q1k",
  "hyphae-1": "https://www.youtube.com/watch?v=SUcga8cMXbw",
  psathyrella: "https://www.youtube.com/watch?v=RYelhYjPNts",
  agaric: "https://www.youtube.com/watch?v=fk2rCM9hnpQ",
  mycobrain: `https://www.youtube.com/watch?v=${MYCOBRAIN_ACTION_VIDEO.youtube}`,
}

function deviceYoutubeUrl(deviceId: string) {
  return DEVICE_YOUTUBE_URLS[deviceId] ?? MYCOSOFT_YOUTUBE_CHANNEL
}

const mycobrainPillars = [
  {
    icon: Layers,
    title: "Expandable",
    description: "Stack new sensing lanes and capacity without redesigning the core board architecture.",
  },
  {
    icon: Puzzle,
    title: "Modifiable",
    description: "Firmware, buses, and MDP-facing profiles evolve with each deployment class.",
  },
  {
    icon: RefreshCw,
    title: "Interchangeable",
    description: "Same internal system across bodies — swap enclosures and payloads while keeping compute consistent.",
  },
  {
    icon: Factory,
    title: "Scalable manufacturing",
    description: "One qualified motherboard line feeds every SKU — faster ramps when you introduce new device types.",
  },
] as const

export function DevicesPortal() {
  const [selectedDevice, setSelectedDevice] = useState(devices[0])
  const detailRef = useRef<HTMLElement>(null)

  const handleSelectDevice = useCallback((device: typeof devices[0]) => {
    setSelectedDevice(device)
    // On mobile: scroll to detail section so user sees content immediately
    // without having to manually scroll down
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    }
  }, [])

  return (
    <NeuromorphicProvider>
    <div className="devices-glass-page min-h-dvh">
      {/* Hero — full-viewport video (MycoBrain + device collage on NAS) */}
      <section
        className="devices-hero relative min-h-[100dvh] flex flex-col justify-center overflow-hidden border-0 pt-20 pb-12 md:py-28"
        data-over-video
      >
        <iframe
          src={youtubeHeroEmbedSrc(DEVICES_HERO_YOUTUBE_ID)}
          title="Mycosoft devices hero video"
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[56.25vw] min-h-full w-screen min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
        />
        {DEVICES_PORTAL_HERO_SOURCES[0] ? (
          <AutoplayVideo
            src={DEVICES_PORTAL_HERO_SOURCES[0]}
            sources={DEVICES_PORTAL_HERO_SOURCES}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            style={{ filter: "brightness(0.9) contrast(1.04)" }}
            encodeSrc
            hideUntilPlaying
          />
        ) : null}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-black/10" />
        <div className="absolute inset-x-0 bottom-0 z-[2] pointer-events-none h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="container max-w-7xl mx-auto relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <NeuBadge variant="default" className="mb-4 portal-hero-badge">
              Hardware platform
            </NeuBadge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6 portal-hero-title">
              <span className="devices-hero-title-text">
                Droids
              </span>
            </h1>
            <p className="text-base sm:text-xl max-w-2xl mx-auto mb-8 px-1 portal-hero-subtitle leading-relaxed">
              We build droids, or robots with sensors, built to live outside continuously — each device shares the
              same MycoBrain core, so the fleet scales manufacturing, adds new sensors, and ships new devices without
              reinventing the nervous system.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={DEVICES_HERO_YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
                <NeuButton variant="primary" className="w-full sm:w-auto gap-2 min-h-[44px]">
                  <Play className="h-5 w-5" />
                  Watch videos
                </NeuButton>
              </a>
              <Link href="/devices/mycobrain">
                <NeuButton variant="default" className="w-full sm:w-auto gap-2 min-h-[44px] devices-hero-mycobrain-btn">
                  <Brain className="h-5 w-5" />
                  MycoBrain
                </NeuButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MOBILE: Sticky tab strip — stays at top while scrolling details ── */}
      {/* Sits just below the main header (top-12 = 48px) */}
      <div className="md:hidden sticky top-12 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div
          className="flex overflow-x-auto gap-1 px-3 py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {devices.map((device) => {
            const isSelected = selectedDevice.id === device.id
            const colorClass =
              device.color === "emerald-500" ? (isSelected ? "bg-emerald-500 text-white" : "text-emerald-500") :
              device.color === "orange-500"  ? (isSelected ? "bg-orange-500 text-white"  : "text-orange-500")  :
              device.color === "purple-500"  ? (isSelected ? "bg-purple-500 text-white"  : "text-purple-500")  :
              device.color === "red-500"     ? (isSelected ? "bg-red-500 text-white"     : "text-red-500")     :
              device.color === "slate-500"   ? (isSelected ? "bg-slate-500 text-white"   : "text-slate-500")   :
                                              (isSelected ? "bg-primary text-primary-foreground" : "text-primary")
            return (
              <button
                key={device.id}
                onClick={() => handleSelectDevice(device)}
                className={`flex-none flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[76px] min-h-[60px] transition-all active:scale-95 ${
                  isSelected
                    ? `${colorClass} shadow-sm`
                    : "text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={isSelected}
              >
                <device.icon className="h-5 w-5" />
                <span className="text-xs font-medium whitespace-nowrap leading-tight">
                  {device.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── DESKTOP: 5-column card grid ── */}
      <section className="hidden md:block py-16 bg-muted/30 dark:bg-black">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <NeuCard
                  className={`cursor-pointer transition-all ${
                    selectedDevice.id === device.id
                      ? "ring-2 ring-primary/20"
                      : ""
                  }`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <NeuCardContent className="pt-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${
                      device.color === "emerald-500" ? "bg-emerald-500/10" :
                      device.color === "orange-500"  ? "bg-orange-500/10"  :
                      device.color === "slate-500"   ? "bg-slate-500/10"   :
                      device.color === "purple-500"  ? "bg-purple-500/10"  :
                      device.color === "red-500"     ? "bg-red-500/10"     :
                      "bg-primary/10"
                    }`}>
                      <device.icon className={`h-6 w-6 ${
                        device.color === "emerald-500" ? "text-emerald-500" :
                        device.color === "orange-500"  ? "text-orange-500"  :
                        device.color === "slate-500"   ? "text-slate-500"   :
                        device.color === "purple-500"  ? "text-purple-500"  :
                        device.color === "red-500"     ? "text-red-500"     :
                        "text-primary"
                      }`} />
                    </div>
                    <h3 className="font-bold text-lg">{device.name}</h3>
                    <p className="text-sm text-muted-foreground">{device.tagline}</p>
                  </NeuCardContent>
                </NeuCard>
              </motion.div>
            ))}
          </div>

          {/* Selected Device Detail */}
          <motion.div
            key={selectedDevice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          >
            {/* Device Image/Visual */}
            <div className="aspect-square rounded-2xl border overflow-hidden relative bg-muted">
              <img
                src={selectedDevice.image}
                alt={selectedDevice.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to icon if image fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className={`hidden h-full flex items-center justify-center ${
                selectedDevice.color === 'emerald-500' ? 'bg-gradient-to-br from-emerald-500/10 to-muted' :
                selectedDevice.color === 'orange-500' ? 'bg-gradient-to-br from-orange-500/10 to-muted' :
                selectedDevice.color === 'slate-500' ? 'bg-gradient-to-br from-slate-500/10 to-muted' :
                selectedDevice.color === 'purple-500' ? 'bg-gradient-to-br from-purple-500/10 to-muted' :
                selectedDevice.color === 'red-500' ? 'bg-gradient-to-br from-red-500/10 to-muted' :
                'bg-gradient-to-br from-primary/10 to-muted'
              }`}>
                <selectedDevice.icon className={`h-48 w-48 ${
                  selectedDevice.color === 'emerald-500' ? 'text-emerald-500/30' :
                  selectedDevice.color === 'orange-500' ? 'text-orange-500/30' :
                  selectedDevice.color === 'slate-500' ? 'text-slate-500/30' :
                  selectedDevice.color === 'purple-500' ? 'text-purple-500/30' :
                  selectedDevice.color === 'red-500' ? 'text-red-500/30' :
                  'text-primary/30'
                }`} />
              </div>
            </div>

            {/* Device Details */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-2">{selectedDevice.name}</h2>
                <p className="text-xl text-muted-foreground mb-4">{selectedDevice.tagline}</p>
                <p className="text-muted-foreground">{selectedDevice.description}</p>
              </div>

              {/* Specifications */}
              <div>
                <h3 className="font-semibold mb-4">Specifications</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedDevice.specs.map((spec) => (
                    <div key={spec.label} className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">{spec.label}</div>
                      <div className="font-medium">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-4">Key Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedDevice.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={deviceYoutubeUrl(selectedDevice.id)} target="_blank" rel="noopener noreferrer">
                  <NeuButton variant="primary" className="w-full sm:w-auto gap-2">
                    <Play className="h-5 w-5" />
                    Learn More
                  </NeuButton>
                </a>
                <Link href={`/devices/${selectedDevice.id}`}>
                  <NeuButton variant="default" className="w-full sm:w-auto">
                    Full Details
                  </NeuButton>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MOBILE: Device detail — shown below the sticky tab strip ── */}
      {/* ref={detailRef} so selecting a device auto-scrolls here */}
      <section ref={detailRef} className="md:hidden bg-muted/30 pb-8 dark:bg-black">
        <motion.div
          key={`mobile-${selectedDevice.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pt-4 space-y-6"
        >
          {/* Device image */}
          <div className="aspect-video rounded-xl border overflow-hidden relative bg-muted">
            <img
              src={selectedDevice.image}
              alt={selectedDevice.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.style.display = "none"
                t.nextElementSibling?.classList.remove("hidden")
              }}
            />
            <div className={`hidden h-full flex items-center justify-center ${
              selectedDevice.color === "emerald-500" ? "bg-gradient-to-br from-emerald-500/10 to-muted" :
              selectedDevice.color === "orange-500"  ? "bg-gradient-to-br from-orange-500/10 to-muted"  :
              selectedDevice.color === "slate-500"   ? "bg-gradient-to-br from-slate-500/10 to-muted"   :
              selectedDevice.color === "purple-500"  ? "bg-gradient-to-br from-purple-500/10 to-muted"  :
              selectedDevice.color === "red-500"     ? "bg-gradient-to-br from-red-500/10 to-muted"     :
              "bg-gradient-to-br from-primary/10 to-muted"
            }`}>
              <selectedDevice.icon className="h-24 w-24 text-muted-foreground/30" />
            </div>
          </div>

          {/* Name + status + description */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{selectedDevice.name}</h2>
            </div>
            <p className="text-base text-muted-foreground font-medium mb-2">{selectedDevice.tagline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedDevice.description}</p>
          </div>

          {/* Specs grid */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Specifications</h3>
            <div className="grid grid-cols-2 gap-2">
              {selectedDevice.specs.map((spec) => (
                <div key={spec.label} className="bg-background rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-0.5">{spec.label}</div>
                  <div className="font-semibold text-sm">{spec.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Key Features</h3>
            <div className="space-y-2">
              {selectedDevice.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3 pb-2">
            <Link href={`/devices/${selectedDevice.id}`}>
              <NeuButton variant="primary" className="w-full gap-2">
                View Full Details
                <ChevronRight className="h-5 w-5" />
              </NeuButton>
            </Link>
            <a href={deviceYoutubeUrl(selectedDevice.id)} target="_blank" rel="noopener noreferrer">
              <NeuButton variant="default" className="w-full gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </NeuButton>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Applications Section */}
      <section className="devices-nature-first relative overflow-hidden py-24 text-white" data-over-video>
        <img
          src="/assets/devices/deviceallwhite.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover dark:hidden"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/assets/devices/devicesall.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover dark:block"
          loading="lazy"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-black/32 dark:bg-black/45" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/48 via-black/14 to-black/50 dark:from-black/65 dark:via-black/28 dark:to-black/65" aria-hidden="true" />
        <div className="container relative z-10 px-4 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4 border-white/30 bg-white/15 text-white">Nature First Technology</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Giving Nature a Voice
            </h2>
            <p className="text-xl text-white/82 max-w-2xl mx-auto">
              Our devices put technology in nature 24/7, collecting live data
              and providing early warning detection capabilities to everyone on the planet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Microscope,
                title: "Give Nature Eyes",
                description: "Real-time environmental monitoring that sees what humans cannot"
              },
              {
                icon: Radio,
                title: "Give Nature Ears",
                description: "Listen to bioelectric signals and atmospheric patterns"
              },
              {
                icon: Wind,
                title: "Give Nature a Nose",
                description: "Detect spores, pathogens, and air quality changes"
              },
              {
                icon: Zap,
                title: "Early Warning Detection",
                description: "Alert systems that protect before threats become visible"
              }
            ].map((app) => (
              <NeuCard key={app.title} className="text-center transition-colors border-white/25 bg-white/12 text-white">
                <NeuCardContent className="pt-8">
                  <div className="inline-flex p-4 rounded-xl bg-white/15 mb-4">
                    <app.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{app.title}</h3>
                  <p className="text-sm text-white/78">{app.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* MycoBrain — shared motherboard across all droids */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-background border-y border-border/60">
        <img
          src={MYCOBRAIN_SECTION_BACKGROUNDS.light}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.42] dark:hidden"
          loading="lazy"
          decoding="async"
        />
        <img
          src={MYCOBRAIN_SECTION_BACKGROUNDS.dark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-[0.58] dark:block"
          loading="lazy"
          decoding="async"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-background/42 dark:bg-background/36"
          aria-hidden="true"
        />
        <div className="container relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
            <NeuBadge variant="default" className="mb-4">
              MycoBrain
            </NeuBadge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              One motherboard inside every device
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              MycoBrain is the ESP32-S3 compute and sensor fabric shared across our droids — built so manufacturing
              stays expandable, firmware modifiable, hardware interchangeable between bodies, and production scalable
              when you introduce new sensors or entirely new device types. Same internal system, different missions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 md:mb-14 max-w-6xl mx-auto">
            {mycobrainPillars.map((pillar) => (
              <NeuCard key={pillar.title} className="h-full bg-background/70 dark:bg-background/55 backdrop-blur-sm">
                <NeuCardContent className="pt-6 pb-6">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-3">
                    <pillar.icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link href="/devices/mycobrain">
              <NeuButton variant="primary" className="w-full sm:w-auto gap-2 min-h-[44px]">
                MycoBrain deep dive
                <ChevronRight className="h-5 w-5" />
              </NeuButton>
            </Link>
            <Link href="/natureos/devices/network">
              <NeuButton variant="default" className="w-full sm:w-auto gap-2 min-h-[44px]">
                Device network
                <ArrowRight className="h-5 w-5" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="devices-mycobrain-action relative min-h-[72vh] overflow-hidden border-b border-border/60 bg-black text-white">
        <InstantHeroVideo
          mp4Src={MYCOBRAIN_ACTION_VIDEO.mp4}
          youtubeId={MYCOBRAIN_ACTION_VIDEO.youtube}
          poster={MYCOBRAIN_ACTION_VIDEO.poster}
          className="absolute inset-0"
          videoClassName="object-contain"
          posterClassName="object-cover"
          youtubeIframeStyle={{
            width: "calc(100% + 170px)",
            height: "calc(100% + 96px)",
          }}
          showPoster={false}
          nasProbeTimeoutMs={700}
          mp4StartTimeoutMs={8000}
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/82 via-black/48 to-black/18" aria-hidden />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-black/25" aria-hidden />
        <div className="container relative z-30 max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <NeuBadge variant="default" className="mb-4 bg-white/10 text-white border-white/20">
              MycoBrain In Action
            </NeuBadge>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-5">
              Edge control for every sensing droid
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-white/82 mb-6">
              MycoBrain coordinates sensor input, camera lanes, power, telemetry, and acquisition timing across the
              device fleet. Paired with Jetson compute, it turns raw environmental signals into onboard intelligence
              that can buffer, classify, relay, and synchronize data before it reaches NatureOS.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
              {[
                "Sensor and camera acquisition",
                "Edge AI and Jetson coordination",
                "Mesh telemetry and field sync",
                "Shared board architecture across devices",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur-md">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support & Services */}
      <section className="devices-support-circuit relative overflow-hidden py-24 bg-white dark:bg-black">
        <CircuitLinesBackground />
        <div className="absolute inset-0 bg-white/68 dark:bg-black/62" aria-hidden="true" />
        <div className="container relative z-10 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Truck,
                title: "Global Deployment",
                description: "Worldwide shipping with expedited options for government customers. Full logistics support available."
              },
              {
                icon: Settings,
                title: "Integration Support",
                description: "Expert assistance for system integration, calibration, and connection to existing infrastructure."
              },
              {
                icon: Play,
                title: "Training Programs",
                description: "Comprehensive operator training for deployment, maintenance, and data interpretation."
              }
            ].map((service) => (
              <NeuCard key={service.title}>
                <NeuCardContent>
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="devices-footer-cta relative overflow-hidden py-24 bg-gradient-to-b from-muted/30 to-background text-white dark:bg-black" data-over-video>
        <AutoplayVideo
          src="/assets/devices/mycobrain-hero.mp4"
          sources={["/assets/devices/devices-footer-motion.mp4", "/assets/devices/mycobrain-hero.mp4"]}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          style={{ filter: "brightness(0.72) contrast(1.06)" }}
          encodeSrc
          hideUntilPlaying
        />
        <div className="absolute inset-0 z-[1] bg-black/48" aria-hidden="true" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/72 via-black/30 to-black/78" aria-hidden="true" />
        <div className="container relative z-10 max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
              Start Monitoring Today
            </h2>
            <p className="text-xl text-white/82 mb-8">
              Whether you&apos;re a researcher, conservationist, farmer, or technologist -
              our devices help you understand the environment like never before.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/devices/mushroom-1">
                <NeuButton variant="primary" className="text-lg px-8 gap-2 text-white">
                  Get Mushroom 1
                  <ArrowRight className="h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/natureos">
                <NeuButton variant="default" className="devices-footer-natureos-btn text-lg px-8 text-white">
                  Explore NatureOS
                </NeuButton>
              </Link>
            </div>

            <div className="mt-12 pt-12 border-t-0">
              <div className="flex flex-wrap justify-center gap-8 text-sm text-white/72">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Worldwide Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Integration Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>30-Day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <style jsx global>{`
        .devices-glass-page .portal-hero-badge {
          color: #fff !important;
          border-color: rgba(255, 255, 255, 0.34) !important;
          background: rgba(255, 255, 255, 0.18) !important;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
        }

        .devices-glass-page .devices-hero,
        .devices-glass-page .devices-hero * {
          border-top-color: transparent !important;
          border-bottom-color: transparent !important;
        }

        .devices-glass-page .devices-hero::before,
        .devices-glass-page .devices-hero::after,
        .devices-glass-page .devices-hero > div::before,
        .devices-glass-page .devices-hero > div::after {
          content: none !important;
          display: none !important;
        }

        .devices-glass-page .devices-hero .neu-btn::before,
        .devices-glass-page .devices-hero .neu-btn::after,
        .devices-glass-page .devices-hero [class*="rounded-xl"][class*="border"]::before,
        .devices-glass-page .devices-hero [class*="rounded-xl"][class*="border"]::after,
        .devices-glass-page .devices-hero [class*="rounded-2xl"][class*="border"]::before,
        .devices-glass-page .devices-hero [class*="rounded-2xl"][class*="border"]::after,
        .devices-glass-page .devices-hero [class*="rounded-3xl"][class*="border"]::before,
        .devices-glass-page .devices-hero [class*="rounded-3xl"][class*="border"]::after {
          content: none !important;
          display: none !important;
        }

        .devices-glass-page .devices-hero-title-text {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          background: none !important;
          text-shadow:
            -2px -2px 0 rgba(0, 0, 0, 0.86),
            2px -2px 0 rgba(0, 0, 0, 0.86),
            -2px 2px 0 rgba(0, 0, 0, 0.86),
            2px 2px 0 rgba(0, 0, 0, 0.86),
            0 12px 32px rgba(0, 0, 0, 0.72);
        }

        .devices-glass-page .portal-hero-subtitle {
          color: #fff !important;
          text-shadow:
            0 2px 8px rgba(0, 0, 0, 0.92),
            0 8px 28px rgba(0, 0, 0, 0.7);
        }

        .devices-glass-page .devices-footer-cta,
        .devices-glass-page .devices-footer-cta h2,
        .devices-glass-page .devices-footer-cta p,
        .devices-glass-page .devices-footer-cta span,
        .devices-glass-page .devices-footer-cta svg {
          color: #fff !important;
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.82);
        }

        .devices-glass-page .devices-footer-cta .text-white\\/72,
        .devices-glass-page .devices-footer-cta .text-white\\/82 {
          color: rgba(255, 255, 255, 0.88) !important;
        }

        .devices-glass-page .devices-footer-cta .devices-footer-natureos-btn,
        .devices-glass-page .devices-footer-cta .devices-footer-natureos-btn *,
        .devices-glass-page .devices-footer-cta .devices-footer-natureos-btn svg {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.78);
        }

        .devices-glass-page .devices-mycobrain-action,
        .devices-glass-page .devices-mycobrain-action h2,
        .devices-glass-page .devices-mycobrain-action h3,
        .devices-glass-page .devices-mycobrain-action p,
        .devices-glass-page .devices-mycobrain-action span,
        .devices-glass-page .devices-mycobrain-action div,
        .devices-glass-page .devices-mycobrain-action svg {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.86);
        }

        .devices-glass-page .devices-nature-first,
        .devices-glass-page .devices-nature-first h2,
        .devices-glass-page .devices-nature-first h3,
        .devices-glass-page .devices-nature-first p,
        .devices-glass-page .devices-nature-first span,
        .devices-glass-page .devices-nature-first svg,
        .devices-glass-page .devices-nature-first .neu-raised,
        .devices-glass-page .devices-nature-first .neu-raised *,
        .devices-glass-page .devices-nature-first .neu-raised-sm,
        .devices-glass-page .devices-nature-first .neu-raised-sm *,
        .devices-glass-page .devices-nature-first [class*="rounded-xl"][class*="border"],
        .devices-glass-page .devices-nature-first [class*="rounded-xl"][class*="border"] *,
        .devices-glass-page .devices-nature-first [class*="rounded-2xl"][class*="border"],
        .devices-glass-page .devices-nature-first [class*="rounded-2xl"][class*="border"] *,
        .devices-glass-page .devices-nature-first [class*="rounded-3xl"][class*="border"],
        .devices-glass-page .devices-nature-first [class*="rounded-3xl"][class*="border"] * {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.82);
        }

        .devices-glass-page .devices-nature-first .text-white\\/78,
        .devices-glass-page .devices-nature-first .text-white\\/82 {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .devices-glass-page .neu-raised,
        .devices-glass-page .neu-raised-sm,
        .devices-glass-page .neu-btn,
        .devices-glass-page [class*="rounded-xl"][class*="border"],
        .devices-glass-page [class*="rounded-2xl"][class*="border"],
        .devices-glass-page [class*="rounded-3xl"][class*="border"] {
          position: relative;
          overflow: hidden;
          border-color: rgba(255, 255, 255, 0.32) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0.035)) !important;
          box-shadow:
            0 18px 52px rgba(0, 0, 0, 0.28),
            0 7px 18px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.58),
            inset 0 -22px 38px rgba(255, 255, 255, 0.07) !important;
          backdrop-filter: blur(18px) saturate(1.22);
          -webkit-backdrop-filter: blur(18px) saturate(1.22);
        }

        .devices-glass-page .neu-btn {
          color: #111827 !important;
        }

        .devices-glass-page .devices-hero-mycobrain-btn {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
        }

        .devices-glass-page .devices-hero-mycobrain-btn *,
        .devices-glass-page .devices-hero-mycobrain-btn svg {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          stroke: currentColor !important;
        }

        .dark .devices-glass-page .neu-btn,
        .devices-glass-page [data-over-video] .neu-btn,
        .devices-glass-page section.text-white .neu-btn {
          color: #fff !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
        }

        .devices-glass-page .neu-raised::before,
        .devices-glass-page .neu-raised-sm::before,
        .devices-glass-page .neu-btn::before,
        .devices-glass-page [class*="rounded-xl"][class*="border"]::before,
        .devices-glass-page [class*="rounded-2xl"][class*="border"]::before,
        .devices-glass-page [class*="rounded-3xl"][class*="border"]::before {
          content: "";
          position: absolute;
          inset: 1px 2px auto;
          height: 42%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
          pointer-events: none;
        }

        .devices-glass-page [data-over-video] .neu-btn::before,
        .devices-glass-page [data-over-video] [class*="rounded-xl"][class*="border"]::before,
        .devices-glass-page [data-over-video] [class*="rounded-2xl"][class*="border"]::before,
        .devices-glass-page [data-over-video] [class*="rounded-3xl"][class*="border"]::before {
          display: none !important;
        }

        .devices-glass-page .neu-btn:hover,
        .devices-glass-page .neu-raised:hover,
        .devices-glass-page .neu-raised-sm:hover,
        .devices-glass-page [class*="rounded-xl"][class*="border"]:hover,
        .devices-glass-page [class*="rounded-2xl"][class*="border"]:hover,
        .devices-glass-page [class*="rounded-3xl"][class*="border"]:hover {
          border-color: rgba(255, 255, 255, 0.52) !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.11) 42%, rgba(255, 255, 255, 0.045)) !important;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.34),
            0 9px 24px rgba(255, 255, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.75),
            inset 0 -22px 38px rgba(255, 255, 255, 0.09) !important;
        }
      `}</style>
    </div>
    </NeuromorphicProvider>
  )
}
