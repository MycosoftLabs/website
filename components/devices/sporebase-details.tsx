"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    id: "intake", 
    name: "Air Intake", 
    icon: Wind,
    position: { top: "10%", left: "40%" }, 
    description: "High-flow bioaerosol intake port",
    details: "The precision-engineered air intake draws in up to 100 liters per minute of ambient air through a pre-filter that removes large debris while allowing biological particles to pass through. The intake design prevents rain and moisture ingress while maintaining optimal airflow."
  },
  { 
    id: "filter", 
    name: "Collection Filter", 
    icon: Filter,
    position: { top: "25%", left: "55%" }, 
    description: "Multi-stage spore capture system",
    details: "A three-stage filtration system captures bioaerosols with 99.7% efficiency. The primary filter captures particles 10μm and larger, the secondary targets 2.5-10μm, and the tertiary nano-filter captures particles down to 0.3μm including spores, pollen, and bacteria."
  },
  { 
    id: "pump", 
    name: "Sampling Pump", 
    icon: Activity,
    position: { top: "40%", left: "35%" }, 
    description: "Variable-speed precision pump",
    details: "The brushless DC pump provides consistent airflow rates from 10-100 L/min. It operates quietly (<35dB) for urban deployments and features a 50,000-hour operational life. Flow rate is automatically adjusted based on environmental conditions."
  },
  { 
    id: "carousel", 
    name: "Sample Carousel", 
    icon: Timer,
    position: { top: "50%", left: "60%" }, 
    description: "24-position time-indexed collection",
    details: "The motorized carousel holds 24 individual collection substrates, each exposed for a configurable time window (15 minutes to 24 hours). This creates a complete time-resolved record of airborne biological particles, enabling correlation with weather and events."
  },
  { 
    id: "sensors", 
    name: "Environmental Sensors", 
    icon: Thermometer,
    position: { top: "55%", left: "30%" }, 
    description: "BME688 + UV + particle counter",
    details: "Integrated sensors measure temperature, humidity, pressure, UV index, and real-time particle counts. This metadata is logged alongside each collection sample, providing complete context for lab analysis."
  },
  { 
    id: "esp32", 
    name: "Control Unit", 
    icon: Cpu,
    position: { top: "65%", left: "50%" }, 
    description: "ESP32-S3 with cellular modem",
    details: "The ESP32-S3 processor manages all operations including pump control, carousel positioning, sensor readings, and data transmission. Includes LTE Cat-M1 cellular modem for remote areas and LoRa for mesh networking with other SporeBase units."
  },
  { 
    id: "solar", 
    name: "Solar Panel", 
    icon: Sun,
    position: { top: "75%", left: "40%" }, 
    description: "10W weatherproof panel",
    details: "The 10W monocrystalline solar panel provides primary power in remote deployments. Combined with the internal battery, it enables fully autonomous operation for months without maintenance."
  },
  { 
    id: "mount", 
    name: "Universal Mount", 
    icon: Building,
    position: { top: "85%", left: "55%" }, 
    description: "Multi-platform mounting system",
    details: "The universal mounting system includes adapters for building walls, poles, vehicles, and tripods. Quick-release design allows the collection carousel to be swapped in seconds without tools."
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

// Specs
const SPECIFICATIONS = {
  "Collection Rate": "10-100 L/min adjustable",
  "Sample Positions": "24 time-indexed slots",
  "Filter Efficiency": "99.7% at 0.3μm",
  "Power Source": "Solar + 5200mAh battery",
  "Battery Life": "30 days (sampling 4hr/day)",
  "Connectivity": "LTE Cat-M1, LoRa, WiFi",
  "Weather Rating": "IP65 all-weather",
  "Operating Temp": "-10°C to 50°C",
  "Dimensions": "20cm × 15cm × 40cm",
  "Weight": "2.8kg",
  "Data Storage": "16GB local + cloud",
  "Analysis Output": "PCR-ready, microscopy-ready"
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
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <motion.div 
          style={{ scale: heroScale }}
          className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-amber-900/20 to-slate-950"
        />
        
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/30 rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: (typeof window !== 'undefined' ? window.innerHeight : 1080) + 100,
                opacity: 0
              }}
              animate={{ 
                y: -100,
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
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
            The world&apos;s most advanced bioaerosol collector.
            <br />
            <span className="text-orange-400">Capturing the invisible. Making it visible.</span>
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Order Now - $299
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
                Our Mission
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why SporeBase Exists
              </h2>
              <div className="space-y-4 text-lg text-white/70">
                <p>
                  The air around us carries billions of invisible biological particles—spores, pollen, 
                  bacteria, and more. Understanding what&apos;s in the air we breathe has never been more 
                  important.
                </p>
                <p>
                  SporeBase is a distributed bioaerosol collection network that creates time-indexed 
                  samples for laboratory analysis. Mount it on buildings, vehicles, or research stations 
                  to map the invisible world of airborne biology.
                </p>
                <p>
                  From tracking seasonal allergies to early disease detection in crops, SporeBase 
                  provides the data needed to understand our atmospheric environment.
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">100L</div>
                  <div className="text-sm text-white/50">Per Minute</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">24</div>
                  <div className="text-sm text-white/50">Time Slots</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">1km</div>
                  <div className="text-sm text-white/50">Mesh Range</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">IP65</div>
                  <div className="text-sm text-white/50">Weather Rated</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-slate-900">
                <Image
                  src={SPOREBASE_ASSETS.mainImage}
                  alt="SporeBase Device"
                  fill
                  className="object-contain p-8"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 p-4 bg-orange-500/20 backdrop-blur-xl rounded-2xl border border-orange-500/30">
                <Wind className="h-8 w-8 text-orange-400" />
                <p className="text-sm font-medium mt-2 text-orange-400">Bioaerosol Capture</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collection System Section */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/30">
              Technology
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Advanced Collection System
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Three-stage filtration captures particles from 10μm down to 0.3μm with 99.7% efficiency.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Wind, title: "Active Sampling", desc: "100L/min precision pump draws air through multi-stage filters" },
              { icon: Timer, title: "Time-Indexed", desc: "24 collection slots create temporal resolution for analysis" },
              { icon: Filter, title: "99.7% Capture", desc: "Three-stage filtration captures particles down to 0.3μm" },
              { icon: FlaskRound, title: "Lab-Ready", desc: "Samples ready for PCR, microscopy, or culturing" },
            ].map((item) => (
              <Card key={item.title} className="bg-slate-800/50 border-orange-500/20 hover:border-orange-500/40 transition-colors">
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
      <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4">
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
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
      <section className="py-24 bg-gradient-to-b from-slate-950 to-orange-950/30">
        <div className="max-w-4xl mx-auto text-center px-4">
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
              Order Now - $299
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
