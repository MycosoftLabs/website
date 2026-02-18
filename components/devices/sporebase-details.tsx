"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SporeUniverse } from "@/components/effects/star-universe"
import { SporeGravity } from "@/components/effects/particle-gravity"
import { SporeWave } from "@/components/effects/particle-wave"
import { SporeParticleCanvas } from "@/components/devices/spore-particle-canvas"
import { 
  ShoppingCart, Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Wind, Droplets, Network, Shield, Zap, Sun, Eye, Thermometer,
  Activity, MapPin, Globe, Trees, Microscope, Database,
  Cpu, Battery, Signal, Lock, Cloud, Leaf, AlertTriangle, Check,
  ExternalLink, Youtube, Home, CircuitBoard, Cable, Car, Building,
  FlaskRound, Beaker, Filter, Timer, Radio, BarChart3
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// SPOREBASE MEDIA ASSETS
// Place media files in: public/assets/sporebase/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\sporebase\
// Public URL: /assets/sporebase/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const SPOREBASE_ASSETS = {
  // Gallery images - replace paths when real photos are added
  images: [
    { src: "/assets/sporebase/1.jpg", alt: "SporeBase Urban Deployment", location: "Urban Monitoring" },
    { src: "/assets/sporebase/2.jpg", alt: "SporeBase Vehicle Mount", location: "Mobile Collection" },
    { src: "/assets/sporebase/3.jpg", alt: "SporeBase Building Install", location: "Building Mounted" },
    { src: "/assets/sporebase/4.jpg", alt: "SporeBase Research Station", location: "Research Station" },
    { src: "/assets/sporebase/5.jpg", alt: "SporeBase Network", location: "Mesh Network" },
  ],
  // Primary product image (currently using blob storage, will switch to NAS)
  mainImage: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SporeBase%20%20website-HFUWL3s1Ga7G7AZOnbrzy2YQoahLYu.png",
  // Hero video (add when available)
  // heroVideo: "/assets/sporebase/hero.mp4",
}

// Device Components - UPDATED with accurate specifications (see docs/SPOREBASE_TECHNICAL_SPECIFICATION.md)
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
    id: "intake", 
    name: "Air Intake", 
    icon: Wind,
    position: { top: "10%", left: "40%" }, 
    description: "Protected sampling inlet",
    details: "The air intake uses a controlled fan to pull ambient air across a protected sampling path. The inlet guard prevents rain and debris ingress while allowing biological particles to deposit onto the adhesive tape collection surface."
  },
  { 
    id: "cassette", 
    name: "Tape Cassette", 
    icon: Timer,
    position: { top: "25%", left: "55%" }, 
    description: "Sealed time-indexed collection",
    details: "The sealed tape cassette advances every 15 minutes (configurable) creating 2,880 timestamped collection intervals over 30 days. Each tape segment captures particles via adhesive deposition and is preserved for lab analysis including microscopy, qPCR, and sequencing."
  },
  { 
    id: "fan", 
    name: "Sampling Fan", 
    icon: Activity,
    position: { top: "40%", left: "35%" }, 
    description: "Fan-driven active sampling",
    details: "A precision fan drives airflow across the sampling head where particles deposit onto the adhesive tape. PWM control with tachometer feedback ensures consistent, repeatable collection rates across varying environmental conditions."
  },
  { 
    id: "drive", 
    name: "Tape Drive", 
    icon: Timer,
    position: { top: "50%", left: "60%" }, 
    description: "Stepper motor tape advance",
    details: "The precision stepper motor advances the adhesive tape at fixed intervals, creating a continuous chronological timeline. Each advance distance (ΔL) is precisely controlled, enabling exact correlation between tape position and collection timestamp."
  },
  { 
    id: "sensors", 
    name: "Environmental Sensors", 
    icon: Thermometer,
    position: { top: "55%", left: "30%" }, 
    description: "BME688/BME690 + BMV080",
    details: "Modular sensor payload includes Bosch BME69x for temperature, humidity, pressure, and VOC sensing. Optional BMV080 provides particulate correlation. All telemetry is timestamped and stored with sample metadata via Mycorrhizae Protocol."
  },
  { 
    id: "mycobrain", 
    name: "MycoBrain Controller", 
    icon: Cpu,
    position: { top: "65%", left: "50%" }, 
    description: "Dual ESP32-S3 + LoRa",
    details: "MycoBrain embedded controller features dual ESP32-S3 modules, LoRa radio for mesh networking, MPPT solar charging, actuator outputs for fan/motor control, and I2C expansion. Data is normalized via Mycorrhizae Protocol and stored with MINDEX chain-of-custody."
  },
  { 
    id: "solar", 
    name: "Solar + Battery", 
    icon: Sun,
    position: { top: "75%", left: "40%" }, 
    description: "MPPT solar charging",
    details: "MPPT solar charging via CN3903 enables field deployments with solar panels. Combined with Li-ion battery pack, enables autonomous 30-day operation. Battery voltage and charge state are monitored as device health telemetry."
  },
  { 
    id: "mount", 
    name: "Universal Mount", 
    icon: Building,
    position: { top: "85%", left: "55%" }, 
    description: "IP65 weatherproof enclosure",
    details: "IP65-rated enclosure with gasket sealing and hydrophobic vent membrane. Universal mounting system includes adapters for buildings, poles, vehicles, and tripods. Sealed cable glands for external power connections."
  },
]

// Use cases
const USE_CASES = [
  {
    title: "Mycology Research",
    icon: Microscope,
    color: "from-orange-500 to-amber-500",
    description: "Track spore dispersal patterns and seasonal fungal activity across landscapes.",
    applications: ["Spore migration studies", "Fruiting body prediction", "Species distribution mapping", "Ecosystem connectivity"]
  },
  {
    title: "Allergy Forecasting",
    icon: Activity,
    color: "from-orange-600 to-red-500",
    description: "Provide real-time pollen and mold spore counts for public health advisories.",
    applications: ["Daily pollen counts", "Mold spore alerts", "Seasonal trend analysis", "Health impact correlation"]
  },
  {
    title: "Agriculture",
    icon: Leaf,
    color: "from-amber-500 to-yellow-500",
    description: "Early detection of crop disease spores before symptoms appear in fields.",
    applications: ["Disease early warning", "Crop protection timing", "Beneficial fungi tracking", "Organic certification"]
  },
  {
    title: "Air Quality",
    icon: Wind,
    color: "from-orange-400 to-amber-400",
    description: "Monitor bioaerosol levels in urban, industrial, and indoor environments.",
    applications: ["Urban air monitoring", "Industrial compliance", "Indoor air quality", "Remediation verification"]
  },
]

// Specs - UPDATED with accurate specifications (see docs/SPOREBASE_TECHNICAL_SPECIFICATION.md)
const SPECIFICATIONS = {
  "Sampling Method": "Fan-driven active deposition",
  "Sample Intervals": "2,880 per cassette (30 days)",
  "Collection Cadence": "15 min default (configurable)",
  "Sample Format": "Sealed adhesive tape cassette",
  "Power Source": "MPPT solar + Li-ion battery",
  "Controller": "MycoBrain (Dual ESP32-S3)",
  "Connectivity": "LoRa mesh, WiFi, cellular optional",
  "Weather Rating": "IP65 design target",
  "Operating Temp": "-10°C to +50°C",
  "Dimensions": "~194 × 149 × 53 mm",
  "Sensors": "BME688/690, BMV080 (optional)",
  "Data Storage": "microSD (32-256 GB)"
}

export function SporeBaseDetails() {
  const [selectedComponent, setSelectedComponent] = useState("intake")
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState(0)
  const [currentImage, setCurrentImage] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])

  return (
    <div className="relative bg-gradient-to-b from-orange-950 via-slate-950 to-black text-white overflow-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-dvh flex items-center justify-center overflow-hidden">
        {/* Background gradient - matching CodePen style */}
        <motion.div 
          style={{ scale: heroScale }}
          className="absolute inset-0"
          >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00223e] to-[#ffa17f] opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-amber-900/20 to-slate-950" />
        </motion.div>
        
        {/* Star/Spore Universe Animation */}
        <SporeUniverse starCount={300} maxTime={25} className="z-0" />
        
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/50 text-sm px-4 py-1">
            Bioaerosol Collection
          </Badge>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-200 to-orange-400">
              SporeBase
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            Time-indexed bioaerosol collection for the real world.
            <br />
            <span className="text-orange-400">Capturing the invisible. Making it measurable.</span>
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Pre-Order Now
            </Button>
            <Button size="lg" variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
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
          <div className="w-6 h-10 rounded-full border-2 border-orange-500/30 flex justify-center pt-2">
            <motion.div 
              className="w-1.5 h-3 bg-orange-500 rounded-full"
              animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
                Our Mission
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why SporeBase Exists
              </h2>
              <div className="space-y-4 text-lg text-white/70">
                <p>
                  The air around us carries billions of microscopic particles—spores, pollen, 
                  dust, and other biological material. Understanding what&apos;s in the air we breathe 
                  has never been more important.
                </p>
                <p>
                  SporeBase creates <strong className="text-orange-400">time-indexed physical samples</strong> for 
                  lab analysis while logging environmental context. Unlike snapshot sampling that loses temporal 
                  context, SporeBase advances a sealed adhesive-tape cassette every 15 minutes, creating a 
                  chronological record spanning <strong className="text-orange-400">30 days (2,880 intervals)</strong>.
                </p>
                <p>
                  Deploy on buildings, vehicles, or research stations. SporeBase works standalone 
                  or as part of the Mycosoft Environmental Intelligence network via <strong className="text-white/90">Mycorrhizae 
                  Protocol + MINDEX</strong>, visualized through <strong className="text-white/90">NatureOS</strong>.
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">2,880</div>
                  <div className="text-sm text-white/50">Sample Intervals</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">30</div>
                  <div className="text-sm text-white/50">Days Per Cassette</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">15m</div>
                  <div className="text-sm text-white/50">Collection Cadence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">IP65</div>
                  <div className="text-sm text-white/50">Weather Rated</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              {/* Background with floating pixels effect */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                {/* Animated floating pixels */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-orange-400/40 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.2, 0.6, 0.2],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
                {/* Larger floating particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`large-${i}`}
                    className="absolute w-2 h-2 bg-orange-500/30 rounded-full blur-[1px]"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                    }}
                    animate={{
                      y: [0, -30, 0],
                      x: [0, 10, 0],
                      opacity: [0.1, 0.4, 0.1],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 3,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                    }}
                  />
                ))}
              </div>
              
              {/* Shadow layer behind the image */}
              <div className="absolute inset-4 rounded-3xl bg-orange-500/20 blur-2xl" />
              
              {/* Main image with depth effect - floating above */}
              <motion.div 
                className="relative aspect-square rounded-3xl overflow-hidden border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-slate-900 shadow-2xl shadow-orange-500/20"
                initial={{ y: 0 }}
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src={SPOREBASE_ASSETS.mainImage}
                  alt="SporeBase Device"
                  fill
                  className="object-cover"
                />
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent pointer-events-none" />
              </motion.div>
              
              <div className="absolute -bottom-6 -right-6 p-4 bg-orange-500/20 backdrop-blur-xl rounded-2xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
                <Wind className="h-8 w-8 text-orange-400" />
                <p className="text-sm font-medium mt-2 text-orange-400">Bioaerosol Capture</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collection System Section */}
      <section className="relative py-24 bg-slate-900 overflow-hidden">
        {/* Particle canvas background */}
        <div className="absolute inset-0 z-0">
          <SporeParticleCanvas />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
              Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How SporeBase Works
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Fan-driven active sampling deposits particles onto adhesive tape, creating 2,880 time-indexed samples per cassette.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Wind, title: "Fan-Driven Sampling", desc: "Controlled fan pulls ambient air across the sampling head where particles deposit onto adhesive tape" },
              { icon: Timer, title: "Time-Indexed", desc: "2,880 intervals per cassette (15-min cadence × 30 days) with precise timestamping" },
              { icon: Database, title: "Chain of Custody", desc: "MINDEX provides tamper-evident records with Mycorrhizae Protocol data encoding" },
              { icon: FlaskRound, title: "Lab-Ready", desc: "Sealed cassettes ready for microscopy, qPCR, sequencing, or archive storage" },
            ].map((item) => (
              <Card key={item.title} className="bg-slate-800/50 border-orange-500/20 hover:border-orange-500/40 transition-colors backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="p-3 rounded-xl bg-orange-500/20 w-fit mb-4">
                    <item.icon className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">{item.title}</h3>
                  <p className="text-white/60 text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="relative py-24 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
        {/* Interactive particle gravity effect - mouse/touch responsive */}
        <SporeGravity className="opacity-70" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
              Applications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Who Uses SporeBase?
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              From research labs to public health agencies, SporeBase provides critical bioaerosol data.
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
                className={`cursor-pointer rounded-2xl border p-6 transition-all ${
                  selectedCase === index
                    ? 'bg-gradient-to-br ' + useCase.color + ' border-transparent text-black'
                    : 'bg-slate-800/50 border-slate-700 hover:border-orange-500/50'
                }`}
              >
                <useCase.icon className={`h-10 w-10 mb-4 ${selectedCase === index ? 'text-black/80' : 'text-orange-400'}`} />
                <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                <p className={`text-sm ${selectedCase === index ? 'text-black/70' : 'text-white/60'}`}>
                  {useCase.description}
                </p>
                <div className="mt-4 space-y-1">
                  {useCase.applications.map((app) => (
                    <div key={app} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${selectedCase === index ? 'text-black/60' : 'text-orange-400/60'}`} />
                      <span className={selectedCase === index ? 'text-black/80' : 'text-white/50'}>{app}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inside SporeBase - Blueprint Section */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
              Engineering
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Inside SporeBase
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Explore the components that make SporeBase the most advanced bioaerosol collector.
            </p>
          </div>

          {/* Control Device Layout */}
          <div className="relative bg-slate-900/50 rounded-3xl border-2 border-orange-500/30 p-6 shadow-2xl shadow-orange-500/5">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel */}
                <div className="bg-slate-950 rounded-2xl border border-orange-500/40 p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-orange-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-orange-400/70 uppercase tracking-wider">Component Selector</span>
                  </div>
                  
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
                              ? 'bg-orange-500/20 border-orange-400 shadow-lg shadow-orange-500/30' 
                              : isHovered
                                ? 'bg-orange-500/10 border-orange-500/50'
                                : 'bg-slate-900/50 border-slate-700 hover:border-orange-500/40'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-orange-500/30' : 'bg-slate-800'}`}>
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-orange-400' : 'text-white/50'}`} />
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-orange-400' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget */}
                <div className="bg-slate-950 rounded-2xl border border-orange-500/40 p-4 shadow-inner flex-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-500/20">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs font-mono text-orange-400/70 uppercase tracking-wider">Component Details</span>
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
                          <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/30">
                            <component.icon className="h-6 w-6 text-orange-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-orange-400">{component.name}</h3>
                            <p className="text-xs text-white/50 font-mono">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{component.details}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: Blueprint */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative flex-1 min-h-[500px] bg-slate-950 rounded-2xl border border-orange-500/40 overflow-hidden shadow-inner">
                  {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: `
                      linear-gradient(rgba(251,146,60,0.4) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(251,146,60,0.4) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                  }} />
                  
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-900 to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">Interactive Schematic</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">SPOREBASE // REV 1.0</span>
                    </div>
                  </div>
                  
                  {/* Device Image */}
                  <div className="absolute inset-0 flex items-center justify-center pt-10">
                    <div className="relative h-[85%] aspect-[2/3] max-w-full">
                      <Image
                        src={SPOREBASE_ASSETS.mainImage}
                        alt="SporeBase Schematic"
                        fill
                        className="opacity-40 filter grayscale object-contain"
                      />
                    </div>
                  </div>
                  
                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-orange-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
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

      {/* Technical Specifications */}
      <section className="py-24 bg-gradient-to-b from-black to-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
              Specifications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Technical Details
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/50 rounded-2xl border border-orange-500/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Wind className="h-5 w-5 text-orange-400" />
                <span className="font-semibold">Collection System</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-white/60">{key}</span>
                    <span className="font-medium text-orange-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/50 rounded-2xl border border-orange-500/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-5 w-5 text-orange-400" />
                <span className="font-semibold">System Specifications</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-white/60">{key}</span>
                    <span className="font-medium text-orange-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-12">
            <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
              <Download className="mr-2 h-4 w-4" />
              Download Full Specifications
            </Button>
            <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
              <Eye className="mr-2 h-4 w-4" />
              View CAD Models
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background with CodePen gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00223e] to-[#ffa17f] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-orange-950/30" />
        
        {/* Flowing particle wave effect - sinusoidal animation */}
        <SporeWave className="opacity-70" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to map the invisible world?
          </h2>
          <p className="text-xl text-white/60 mb-8">
            Join researchers, health agencies, and environmental monitors using SporeBase 
            to understand what&apos;s really in the air we breathe.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Pre-Order Now
            </Button>
            <Button size="lg" variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
              <Download className="mr-2 h-5 w-5" />
              Download Brochure
            </Button>
          </div>
          
          <p className="text-sm text-white/40 mt-8">
            In Stock • Free worldwide shipping • 30-day money-back guarantee
          </p>
        </div>
      </section>
    </div>
  )
}

