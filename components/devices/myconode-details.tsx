"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Radio, Network, Shield, Zap, Eye, Thermometer, Waves, Antenna,
  Droplets, Activity, MapPin, Globe, Microscope, Database, Sparkles,
  Cpu, Battery, Signal, Lock, Cloud, Cable, CircuitBoard, Target,
  ExternalLink, Check, Layers, Gauge, FlaskRound, TreeDeciduous
} from "lucide-react"
import { UndergroundFlow } from "@/components/effects/perlin-flow"
import { MyceliumNetwork } from "@/components/ui/mycelium-network"
import { ParticleFlow } from "@/components/ui/particle-flow"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// MYCONODE MEDIA ASSETS
// Place media files in: public/assets/myconode/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\myconode\
// Public URL: /assets/myconode/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const MYCONODE_ASSETS = {
  // Hero video background
  heroVideo: "/assets/myconode/myconode hero1.mp4",
  // Primary product image - main marketing image
  mainImage: "/assets/myconode/myconode a.png",
  // White version for probe visualization
  probeImage: "/assets/myconode/myconode white.jpg",
  // Mycelium background video for Applications section
  myceliumVideo: "/assets/myconode/myconode mycelium.mp4",
  // Deployment video showing installation
  deployVideo: "/assets/myconode/myconode deploy1.mp4",
  // Lab testing video showing device being built and tested
  labTestVideo: "/assets/myconode/Myconode test1.mp4",
  // Live operation video
  liveVideo: "/assets/myconode/myconode live1.mp4",
  // Color options for product selector
  colors: [
    { 
      name: "White", 
      image: "/assets/myconode/myconode white.jpg", 
      hex: "#FFFFFF",
      environments: "Labs, greenhouses, indoor gardens, research facilities",
      description: "Perfect for controlled environments and demonstrations. White stands out intentionally in labs and research settings where visibility is preferred. Also blends naturally with white fencing, PVC irrigation pipes, and greenhouse structures."
    },
    { 
      name: "Black", 
      image: "/assets/myconode/myconode black.jpg", 
      hex: "#1a1a1a",
      environments: "Gardens with dark mulch, near black planters, driveways, parking lots",
      description: "Disappears into dark mulch, black plastic edging, and shadowy corners of gardens. Ideal near asphalt, dark stone pathways, or black raised bed frames. Also complements modern architecture with dark accents."
    },
    { 
      name: "Purple", 
      image: "/assets/myconode/myconode purple.jpg", 
      hex: "#8B5CF6",
      environments: "Lavender fields, flower gardens, near purple flowers like salvia or iris",
      description: "Blends beautifully with lavender, purple sage, alliums, and ornamental flowers. A natural choice for cottage gardens, butterfly gardens, and anywhere purple blooms thrive. Echoes the hues of many wild mushroom species."
    },
    { 
      name: "Blue", 
      image: "/assets/myconode/myconode blue.jpg", 
      hex: "#3B82F6",
      environments: "Near water features, pools, boats, blue-painted structures, hydrangeas",
      description: "Ideal for waterfront installations, near pools, ponds, or boats. Matches blue hydrangeas, delphiniums, and blue garden decor. Perfect alongside blue-painted fences, sheds, or nautical-themed properties."
    },
    { 
      name: "Orange", 
      image: "/assets/myconode/myconode orange.jpg", 
      hex: "#F97316",
      environments: "Autumn gardens, pumpkin patches, near marigolds, terracotta pots",
      description: "Naturally camouflages in fall foliage, near marigolds, orange lilies, and pumpkin patches. Complements terracotta planters, brick walls, and rust-colored mulch. Perfect for farms and orchards in harvest season."
    },
    { 
      name: "Red", 
      image: "/assets/myconode/myconode red.jpg", 
      hex: "#EF4444",
      environments: "Rose gardens, near red barns, brick walls, geraniums, red mulch",
      description: "Vanishes among red roses, geraniums, and ruby-colored shrubs. Perfect match for classic red barns, brick walls, and red-dyed mulch. Also blends with red garden markers and clay pots in traditional gardens."
    },
    { 
      name: "Yellow", 
      image: "/assets/myconode/myconode yellow.jpg", 
      hex: "#EAB308",
      environments: "Sunflower fields, near daffodils, lemon trees, golden crops, sandy areas",
      description: "Disappears among sunflowers, daffodils, black-eyed susans, and golden wheat fields. Blends with sandy soil, straw mulch, and golden-hour lighting. Ideal for farms growing corn, hay, or sunflower crops."
    },
    { 
      name: "Camo Green", 
      image: "/assets/myconode/myconode camo green.jpg", 
      hex: "#4D5C3C",
      environments: "Forests, wild areas, grass lawns, shrubs, natural landscapes",
      description: "Our most versatile option for natural environments. Virtually invisible in forests, grass lawns, and wild meadows. Blends with moss, ferns, shrubs, and tree bark. The ultimate choice for conservation areas and undisturbed ecosystems."
    },
  ],
  // Colors overview image
  colorsOverview: "/assets/myconode/myconode colors.png",
  // Mushroom-shaped node variant
  mushroomNode: "/assets/myconode/myconode mushroom.jpg",
}

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
    id: "electrode", 
    name: "Bioelectric Electrodes", 
    icon: Zap,
    position: { top: "10%", left: "40%" }, 
    description: "Platinum-iridium sensing array",
    details: "Ultra-sensitive platinum-iridium electrodes detect bioelectric signals at the microvolt level. The array configuration captures voltage gradients created by mycelial networks, root systems, and soil microbiome activity with 0.1μV resolution."
  },
  { 
    id: "moisture", 
    name: "Soil Moisture Sensor", 
    icon: Droplets,
    position: { top: "25%", left: "55%" }, 
    description: "Capacitive multi-depth sensing",
    details: "Frequency-domain reflectometry (FDR) sensors measure volumetric water content at multiple depths. Unlike resistive sensors, our capacitive design is immune to soil salinity variations and provides accurate readings across all soil types."
  },
  { 
    id: "temp", 
    name: "Temperature Array", 
    icon: Thermometer,
    position: { top: "40%", left: "35%" }, 
    description: "Precision RTD sensors",
    details: "Multiple platinum RTD temperature sensors provide ±0.1°C accuracy from surface to 50cm depth. Temperature gradients reveal soil thermal dynamics, decomposition activity, and microbial metabolic processes."
  },
  { 
    id: "conductivity", 
    name: "EC Sensor", 
    icon: Gauge,
    position: { top: "50%", left: "60%" }, 
    description: "Electrical conductivity measurement",
    details: "Four-electrode conductivity cells measure soil EC from 0-20 dS/m with automatic temperature compensation. Track fertilizer levels, salt accumulation, and nutrient availability in real-time."
  },
  { 
    id: "ph", 
    name: "pH Probe", 
    icon: FlaskRound,
    position: { top: "60%", left: "40%" }, 
    description: "Solid-state ISFET sensor",
    details: "The solid-state ISFET pH sensor provides maintenance-free operation for years. Unlike glass electrodes, it's immune to breakage and pressure variations, making it ideal for buried installations."
  },
  { 
    id: "processor", 
    name: "ESP32-S3 Core", 
    icon: Cpu,
    position: { top: "70%", left: "55%" }, 
    description: "Edge processing with ML",
    details: "The ESP32-S3 processor runs TinyML models for real-time pattern recognition in bioelectric signals. Onboard algorithms detect mycelial network activity, stress signatures, and anomalous patterns before transmitting to the cloud."
  },
  { 
    id: "radio", 
    name: "LoRa Radio", 
    icon: Radio,
    position: { top: "80%", left: "45%" }, 
    description: "Long-range mesh networking",
    details: "Sub-GHz LoRa radio enables mesh networking with up to 10km range in open terrain. AES-256 encryption ensures data security. The mesh topology provides redundant paths for reliable data delivery even if nodes fail."
  },
  { 
    id: "power", 
    name: "Battery System", 
    icon: Battery,
    position: { top: "85%", left: "60%" }, 
    description: "90+ day rechargeable",
    details: "High-capacity lithium battery provides 90+ days of continuous operation between charges. Solar charging option available. Low self-discharge and wide temperature range (-40°C to 85°C) ensure reliable power in all environments."
  },
]

// Use cases
const USE_CASES = [
  {
    title: "Mycology Research",
    icon: Microscope,
    color: "from-purple-500 via-fuchsia-500 to-pink-500",
    description: "Map mycelial networks and study fungal communication in natural ecosystems.",
    applications: ["Network mapping", "Signal analysis", "Species identification", "Growth dynamics"]
  },
  {
    title: "Precision Agriculture",
    icon: TreeDeciduous,
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    description: "Optimize irrigation, fertilization, and soil health with deep soil insights.",
    applications: ["Irrigation control", "Nutrient management", "Root zone monitoring", "Yield prediction"]
  },
  {
    title: "Environmental Monitoring",
    icon: Globe,
    color: "from-blue-500 via-indigo-500 to-violet-500",
    description: "Track soil health, contamination, and ecosystem dynamics at scale.",
    applications: ["Contamination detection", "Carbon sequestration", "Restoration monitoring", "Biodiversity tracking"]
  },
  {
    title: "Infrastructure Protection",
    icon: Shield,
    color: "from-amber-500 via-orange-500 to-red-500",
    description: "Monitor soil conditions around critical infrastructure for early warning.",
    applications: ["Subsidence detection", "Moisture intrusion", "Corrosion risk", "Seismic sensing"]
  },
]

// Specs
const SPECIFICATIONS = {
  "Bioelectric Resolution": "0.1 μV",
  "Deployment Depth": "10-50 cm",
  "Sampling Rate": "0.1-10 Hz configurable",
  "Battery Life": "90+ days minimum",
  "Communication": "LoRa 915MHz mesh",
  "Range": "10km line-of-sight",
  "IP Rating": "IP68 fully sealed",
  "Operating Temp": "-40°C to 85°C",
  "Dimensions": "Ø 5cm × 25cm",
  "Weight": "450g",
  "Certifications": "IP68, MIL-STD-810G",
  "Data Storage": "32MB onboard buffer"
}

export function MycoNodeDetails() {
  const [selectedComponent, setSelectedComponent] = useState("electrode")
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState(0)
  const [selectedColor, setSelectedColor] = useState(0)
  const [hoveredSensor, setHoveredSensor] = useState<number | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <div className="relative bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Hero Section - with Video Background */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster="/assets/myconode/myconode a.png"
          >
            <source src={MYCONODE_ASSETS.heroVideo} type="video/mp4" />
          </video>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/70 via-purple-950/50 to-slate-950/90" />
        </div>
        
        {/* Animated gradient accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Floating spore particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 4 + 2,
                height: Math.random() * 4 + 2,
                backgroundColor: ['#a855f7', '#d946ef', '#06b6d4', '#22c55e', '#f59e0b'][Math.floor(Math.random() * 5)] + '40',
              }}
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                opacity: 0
              }}
              animate={{ 
                y: [null, Math.random() * -200 - 100],
                x: [null, (Math.random() - 0.5) * 100],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 6 + Math.random() * 6,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <Badge className="mb-4 bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-500/50 text-sm px-4 py-1">
            Subsurface Intelligence
          </Badge>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
              MycoNode
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            Listening to the underground.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              Where fungal networks speak in bioelectric whispers.
            </span>
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Contact Sales
            </Button>
            <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-purple-500/30 flex justify-center pt-2">
            <motion.div 
              className="w-1.5 h-3 bg-gradient-to-b from-purple-400 to-fuchsia-400 rounded-full"
              animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-purple-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">
                The Mission
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Decoding the Underground
              </h2>
              <div className="space-y-4 text-lg text-white/70">
                <p>
                  Beneath every forest, every field, every garden lies an invisible network—the 
                  mycelium. This &quot;wood wide web&quot; connects plants, transfers nutrients, and 
                  communicates through bioelectric signals we&apos;re only beginning to understand.
                </p>
                <p>
                  MycoNode is a buried sensor probe that listens to these signals. With 
                  microvolt-level sensitivity and years of battery life, it reveals the hidden 
                  conversations happening in the soil.
                </p>
                <p>
                  Whether you&apos;re a researcher studying fungal networks, a farmer optimizing 
                  soil health, or a conservationist monitoring ecosystem recovery—MycoNode 
                  provides the data you can&apos;t see any other way.
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400">0.1μV</div>
                  <div className="text-sm text-white/50">Resolution</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">90d</div>
                  <div className="text-sm text-white/50">Battery</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-400">10km</div>
                  <div className="text-sm text-white/50">Range</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-amber-400">IP68</div>
                  <div className="text-sm text-white/50">Sealed</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-slate-950">
                <Image
                  src={MYCONODE_ASSETS.mainImage}
                  alt="MycoNode soil probe device"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 p-4 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/30">
                <Zap className="h-8 w-8 text-purple-400" />
                <p className="text-sm font-medium mt-2 text-purple-400">Bioelectric Sensing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Section - How It Works */}
      <section className="relative py-24 bg-gradient-to-b from-purple-950/50 to-purple-950/30 overflow-hidden">
        {/* Mycelium Network Background Animation */}
        <div className="absolute inset-0 pointer-events-none">
          <MyceliumNetwork hue={280} opacity={0.7} />
          {/* Subtle gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-transparent to-purple-950/30" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Quick Start
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Deploy in Minutes
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Simple installation, automatic network connection, instant data streaming.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: 1-2-3 Instructions */}
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl font-bold shadow-lg shadow-emerald-500/30">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-emerald-400">Plant the Probe</h3>
                  <p className="text-white/70">
                    Push MycoNode into the soil at your desired depth (10-50cm). The mushroom-shaped 
                    head stays above ground for radio communication while sensors reach deep underground.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold shadow-lg shadow-purple-500/30">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-purple-400">Auto-Connect to Mycosoft Network</h3>
                  <p className="text-white/70">
                    The device automatically establishes a secure LoRa mesh connection with nearby 
                    MycoNodes and Mycosoft infrastructure. No configuration required—just plant and go.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/30">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-cyan-400">Start Streaming Fungal Data</h3>
                  <p className="text-white/70">
                    Bioelectric signals, soil conditions, and environmental factors are immediately 
                    broadcast to our cloud platform. View real-time data on your dashboard within seconds.
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <div className="flex items-center gap-4 text-white/50 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>No tools required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Waterproof IP68</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Solar option</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Deployment Video */}
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden border border-purple-500/20 bg-slate-900">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  poster={MYCONODE_ASSETS.mainImage}
                >
                  <source src={MYCONODE_ASSETS.deployVideo} type="video/mp4" />
                </video>
              </div>
              <div className="absolute -bottom-4 -left-4 p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl border border-emerald-500/30">
                <MapPin className="h-6 w-6 text-emerald-400" />
                <p className="text-xs font-medium mt-1 text-emerald-400">Field Deployment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sensor Technology Section */}
      <section className="py-24 bg-purple-950/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">
              Sensing Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Multi-Modal Soil Intelligence
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Eight sensor modalities create a complete picture of underground dynamics.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Zap, 
                title: "Bioelectric", 
                desc: "Detect mycelial network signals at μV precision", 
                color: "from-purple-500 to-fuchsia-500",
                specs: "0.1μV resolution • 0.1-1000Hz bandwidth • Platinum-iridium electrodes",
                details: "Our bioelectric sensing array uses platinum-iridium electrodes with ultra-low noise amplification to detect the faint electrical signals produced by fungal mycelium and plant root systems."
              },
              { 
                icon: Droplets, 
                title: "Moisture", 
                desc: "Multi-depth volumetric water content", 
                color: "from-blue-500 to-cyan-500",
                specs: "0-100% VWC • ±2% accuracy • FDR technology",
                details: "Frequency Domain Reflectometry (FDR) sensors measure volumetric water content at multiple depths. Immune to soil salinity variations for reliable readings in all soil types."
              },
              { 
                icon: Thermometer, 
                title: "Temperature", 
                desc: "RTD sensors from surface to 50cm", 
                color: "from-orange-500 to-red-500",
                specs: "±0.1°C accuracy • -40°C to 85°C range • Multi-point profiling",
                details: "Platinum RTD sensors provide laboratory-grade temperature accuracy. Multi-point profiling reveals thermal gradients and microbial activity in different soil layers."
              },
              { 
                icon: Gauge, 
                title: "Conductivity", 
                desc: "Soil EC for nutrient monitoring", 
                color: "from-green-500 to-emerald-500",
                specs: "0-20 dS/m range • 4-electrode design • Auto temperature compensation",
                details: "Four-electrode conductivity cells eliminate contact resistance errors. Track fertilizer levels, salt accumulation, and nutrient availability with automatic temperature compensation."
              },
              { 
                icon: FlaskRound, 
                title: "pH Level", 
                desc: "Solid-state ISFET technology", 
                color: "from-amber-500 to-yellow-500",
                specs: "pH 2-12 range • ±0.1 pH accuracy • No maintenance required",
                details: "Solid-state ISFET pH sensors provide years of maintenance-free operation. Unlike glass electrodes, they're immune to breakage and pressure variations."
              },
              { 
                icon: Waves, 
                title: "Impedance", 
                desc: "Complex bioelectric signatures", 
                color: "from-indigo-500 to-violet-500",
                specs: "1Hz-100kHz sweep • Complex impedance (Z, θ) • Network mapping",
                details: "Electrochemical impedance spectroscopy reveals the complex bioelectric signatures of soil organisms. Map mycelial network connectivity and health in real-time."
              },
              { 
                icon: Signal, 
                title: "Signal Quality", 
                desc: "Environmental noise rejection", 
                color: "from-pink-500 to-rose-500",
                specs: "60dB CMRR • Active shielding • Digital filtering",
                details: "Advanced common-mode rejection and active shielding eliminate environmental interference. Onboard DSP filters separate biological signals from noise."
              },
              { 
                icon: Target, 
                title: "Root Detection", 
                desc: "Plant root zone mapping", 
                color: "from-teal-500 to-cyan-500",
                specs: "Capacitive sensing • Growth rate tracking • Species differentiation",
                details: "Detect and map plant root systems using capacitive proximity sensing. Track root growth patterns and differentiate between plant species based on electrical signatures."
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                onHoverStart={() => setHoveredSensor(index)}
                onHoverEnd={() => setHoveredSensor(null)}
                className="relative"
              >
                <Card className="bg-slate-900/50 border-purple-500/20 hover:border-purple-500/40 transition-all overflow-hidden h-full cursor-pointer">
                  <CardContent className="pt-6 relative">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.color} opacity-10 rounded-full blur-2xl`} />
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} w-fit mb-4`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-white">{item.title}</h3>
                    <p className="text-white/60 text-sm">{item.desc}</p>
                    
                    {/* Hover expansion */}
                    <AnimatePresence>
                      {hoveredSensor === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-purple-500/20">
                            <p className="text-xs font-mono text-purple-400 mb-2">{item.specs}</p>
                            <p className="text-sm text-white/70">{item.details}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Applications Section - with Video Background */}
      <section className="relative py-24 overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster={MYCONODE_ASSETS.mainImage}
          >
            <source src={MYCONODE_ASSETS.myceliumVideo} type="video/mp4" />
          </video>
          {/* Dark overlay for content readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/85 via-slate-950/80 to-slate-950/90" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30 backdrop-blur-sm">
              Applications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Who Uses MycoNode?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedCase(index)}
                className={`cursor-pointer rounded-2xl border p-6 transition-all ${
                  selectedCase === index
                    ? 'bg-gradient-to-br ' + useCase.color + ' border-transparent text-white shadow-xl'
                    : 'bg-slate-900/50 border-purple-500/20 hover:border-purple-500/50'
                }`}
              >
                <useCase.icon className={`h-10 w-10 mb-4 ${selectedCase === index ? 'text-white' : 'text-purple-400'}`} />
                <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                <p className={`text-sm mb-4 ${selectedCase === index ? 'text-white/90' : 'text-white/60'}`}>
                  {useCase.description}
                </p>
                <div className="space-y-1">
                  {useCase.applications.map((app) => (
                    <div key={app} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${selectedCase === index ? 'text-white/80' : 'text-purple-400/60'}`} />
                      <span className={selectedCase === index ? 'text-white/90' : 'text-white/50'}>{app}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inside MycoNode - Blueprint Section */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">
              Engineering
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Inside MycoNode
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Explore the components that enable underground sensing.
            </p>
          </div>

          {/* Control Device Layout */}
          <div className="relative bg-gradient-to-br from-purple-950/50 to-slate-900/50 rounded-3xl border border-purple-500/30 p-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel */}
                <div className="bg-slate-950 rounded-2xl border border-purple-500/40 p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-purple-400/70 uppercase tracking-wider">Component Selector</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_COMPONENTS.map((component) => {
                      const IconComponent = component.icon
                      const isSelected = selectedComponent === component.id
                      return (
                        <motion.button
                          key={component.id}
                          onClick={() => setSelectedComponent(component.id)}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected 
                              ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-400 shadow-lg shadow-purple-500/30' 
                              : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/40'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${isSelected ? 'text-purple-400' : 'text-white/50'}`} />
                            <span className={`text-xs font-medium ${isSelected ? 'text-purple-400' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget */}
                <div className="bg-slate-950 rounded-2xl border border-purple-500/40 p-4 shadow-inner flex-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
                    <span className="text-xs font-mono text-purple-400/70 uppercase tracking-wider">Component Details</span>
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
                          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/30">
                            <component.icon className="h-6 w-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-purple-400">{component.name}</h3>
                            <p className="text-xs text-white/50 font-mono">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{component.details}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: Visualization */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative flex-1 min-h-[500px] bg-slate-950 rounded-2xl border border-purple-500/40 overflow-hidden shadow-inner">
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-cyan-950/20" />
                  
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-900 to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">Probe Visualization</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">MYCONODE // REV 1.0</span>
                    </div>
                  </div>
                  
                  {/* Probe Visual - Real Image */}
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative w-full h-full">
                      <Image
                        src={MYCONODE_ASSETS.probeImage}
                        alt="MycoNode probe device"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    </div>
                  </div>
                  
                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-purple-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
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

      {/* Color Picker Section */}
      <section className="py-24 bg-gradient-to-b from-black to-purple-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30">
              Customization
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Color
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              MycoNode comes in 8 colors to blend with any environment.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Color selector on left */}
            <div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {MYCONODE_ASSETS.colors.map((color, index) => (
                  <motion.button
                    key={color.name}
                    onClick={() => setSelectedColor(index)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedColor === index 
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/50 scale-105' 
                        : 'border-purple-500/20 hover:border-purple-500/50'
                    }`}
                    whileHover={{ scale: selectedColor === index ? 1.05 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Image
                      src={color.image}
                      alt={`MycoNode ${color.name}`}
                      fill
                      className="object-cover object-top"
                      sizes="100px"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs font-medium text-white text-center">{color.name}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="bg-slate-900/50 rounded-2xl border border-purple-500/20 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl border border-white/20"
                    style={{ backgroundColor: MYCONODE_ASSETS.colors[selectedColor].hex }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      MycoNode {MYCONODE_ASSETS.colors[selectedColor].name}
                    </h3>
                    <p className="text-sm text-white/50">
                      {MYCONODE_ASSETS.colors[selectedColor].hex}
                    </p>
                  </div>
                </div>
                
                {/* Environment tags */}
                <div className="mb-4">
                  <p className="text-xs text-purple-400 font-medium mb-2 uppercase tracking-wider">Best For:</p>
                  <div className="flex flex-wrap gap-2">
                    {MYCONODE_ASSETS.colors[selectedColor].environments.split(', ').map((env, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300">
                        {env}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Full description */}
                <p className="text-white/70 text-sm leading-relaxed">
                  {MYCONODE_ASSETS.colors[selectedColor].description}
                </p>
              </div>
            </div>
            
            {/* Selected color image on right */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedColor}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="aspect-square rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-slate-950"
                >
                  <Image
                    src={MYCONODE_ASSETS.colors[selectedColor].image}
                    alt={`MycoNode ${MYCONODE_ASSETS.colors[selectedColor].name}`}
                    fill
                    className="object-cover object-top rounded-2xl"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>
              
              {/* Color overview badge */}
              <div className="absolute -bottom-4 -right-4 p-3 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 backdrop-blur-xl rounded-xl border border-fuchsia-500/30">
                <p className="text-xs font-medium text-fuchsia-400">8 Colors Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lab Testing Video Section */}
      <section className="relative py-24 bg-purple-950/30 overflow-hidden">
        {/* Particle Flow Background Animation - Interactive with mouse */}
        <div className="absolute inset-0">
          <ParticleFlow opacity={0.5} />
          {/* Very light gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-purple-950/20 pointer-events-none" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              Behind The Scenes
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built & Tested at Mycosoft Labs
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Watch the device being assembled and tested by our team. Real hardware, real sensors, real results.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-500/20 bg-slate-900 shadow-2xl shadow-purple-500/20">
              <video
                controls
                playsInline
                className="w-full h-full object-cover"
                poster={MYCONODE_ASSETS.mainImage}
              >
                <source src={MYCONODE_ASSETS.labTestVideo} type="video/mp4" />
              </video>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                <Cpu className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Hand-Assembled</p>
                <p className="text-xs text-white/50">Quality craftsmanship</p>
              </div>
              <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                <Activity className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Real Testing</p>
                <p className="text-xs text-white/50">Verified sensors</p>
              </div>
              <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                <Shield className="h-6 w-6 text-fuchsia-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Production Ready</p>
                <p className="text-xs text-white/50">Not a prototype</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-24 bg-gradient-to-b from-purple-950/30 to-purple-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">
              Specifications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Technical Details
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/50 rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-purple-400" />
                <span className="font-semibold">Sensing</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-white/60">{key}</span>
                    <span className="font-medium text-purple-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/50 rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-5 w-5 text-purple-400" />
                <span className="font-semibold">System</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-white/60">{key}</span>
                    <span className="font-medium text-purple-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-12">
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Download className="mr-2 h-4 w-4" />
              Download Full Specifications
            </Button>
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Eye className="mr-2 h-4 w-4" />
              View 3D Model
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-slate-950 overflow-hidden">
        {/* Perlin flow background animation */}
        <UndergroundFlow className="opacity-80" />
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-transparent to-slate-950/60 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-purple-500/20 shadow-xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to listen to the underground?
            </h2>
            <p className="text-xl text-white/60 mb-8">
              Join researchers and organizations around the world using MycoNode 
              to decode the secrets of soil ecosystems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold px-8">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Contact Sales
              </Button>
              <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                <Download className="mr-2 h-5 w-5" />
                Download Research Papers
              </Button>
            </div>
            
            <p className="text-sm text-white/40 mt-8">
              Enterprise pricing • Custom configurations available • Academic discounts
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
