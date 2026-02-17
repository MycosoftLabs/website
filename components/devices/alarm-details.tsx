"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  AlertTriangle, Shield, Zap, Eye, Thermometer, Flame, Waves, Bell,
  Droplets, Activity, MapPin, Globe, Microscope, Database, Heart,
  Cpu, Battery, Signal, Lock, Cloud, Wifi, CircuitBoard, Home,
  ExternalLink, Check, Wind, Gauge, FlaskRound, Users, Building2,
  Radio, Volume2, AlertCircle, Sparkles
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// ALARM MEDIA ASSETS
// Place media files in: public/assets/alarm/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\alarm\
// Public URL: /assets/alarm/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const ALARM_ASSETS = {
  // Primary product image (currently using blob storage, will switch to NAS)
  mainImage: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_02_32%20PM-cWILDVnWKhQEz6toW0Y161OJRUMnyq.png",
  // Future local assets (uncomment when media is added):
  // mainImage: "/assets/alarm/main.jpg",
  // Gallery images
  gallery: [
    { src: "/assets/alarm/gallery-1.jpg", alt: "ALARM Wall Mount", location: "Home Installation" },
    { src: "/assets/alarm/gallery-2.jpg", alt: "ALARM Ceiling Mount", location: "Office Setup" },
    { src: "/assets/alarm/gallery-3.jpg", alt: "ALARM App View", location: "Mobile Interface" },
  ],
  // Demo video (add when available)
  // demoVideo: "/assets/alarm/demo.mp4",
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
    id: "smoke", 
    name: "Dual Smoke Sensors", 
    icon: Flame,
    position: { top: "10%", left: "40%" }, 
    description: "Ionization + Photoelectric detection",
    details: "Dual-mode smoke detection combines ionization sensing for fast-burning fires and photoelectric detection for smoldering fires. This combination provides the fastest possible response to all fire types while minimizing nuisance alarms from cooking."
  },
  { 
    id: "voc", 
    name: "VOC Sensor", 
    icon: Wind,
    position: { top: "20%", left: "55%" }, 
    description: "Volatile organic compound detection",
    details: "The metal-oxide semiconductor VOC sensor detects hazardous gases including formaldehyde, benzene, and other harmful compounds. It provides continuous air quality monitoring and alerts when dangerous chemical concentrations are detected."
  },
  { 
    id: "particulate", 
    name: "Particulate Sensor", 
    icon: Sparkles,
    position: { top: "30%", left: "35%" }, 
    description: "PM1.0 / PM2.5 / PM10 monitoring",
    details: "Laser-scattering particle counter measures airborne particulate matter in three size categories. Tracks dust, pollen, and fine particles that affect respiratory health. Provides real-time AQI (Air Quality Index) calculations."
  },
  { 
    id: "spore", 
    name: "Mold Spore Detector", 
    icon: Microscope,
    position: { top: "40%", left: "50%" }, 
    description: "Early mold warning system",
    details: "Proprietary bioaerosol density estimation detects elevated mold spore concentrations before visible growth appears. Combined with humidity tracking, provides actionable warnings up to 2 weeks before mold becomes a visible problem."
  },
  { 
    id: "climate", 
    name: "Climate Sensors", 
    icon: Thermometer,
    position: { top: "50%", left: "40%" }, 
    description: "Temperature, humidity, pressure",
    details: "High-precision BME688 sensor measures temperature (±0.5°C), relative humidity (±3%), and barometric pressure. This data drives comfort monitoring, mold risk prediction, and integration with HVAC systems."
  },
  { 
    id: "co2", 
    name: "CO₂ Sensor", 
    icon: Activity,
    position: { top: "60%", left: "55%" }, 
    description: "Carbon dioxide monitoring",
    details: "NDIR (non-dispersive infrared) CO₂ sensor measures carbon dioxide levels from 400-5000 ppm. Alerts when ventilation is insufficient and CO₂ reaches levels that impair cognitive function and health."
  },
  { 
    id: "processor", 
    name: "ESP32-S3 + TinyML", 
    icon: Cpu,
    position: { top: "70%", left: "45%" }, 
    description: "Edge AI for pattern recognition",
    details: "The ESP32-S3 processor runs TinyML models trained on thousands of sensor patterns. It distinguishes between normal cooking smoke and fire, identifies specific contaminant types, and learns your space's normal patterns to reduce false alarms."
  },
  { 
    id: "alert", 
    name: "Alert System", 
    icon: Volume2,
    position: { top: "80%", left: "50%" }, 
    description: "85dB siren + RGB LED ring",
    details: "85 decibel piezo siren provides code-compliant audible alerts. RGB LED ring indicates status at a glance: green for safe, yellow for advisory, red for danger. Spoken voice alerts announce specific threats in multiple languages."
  },
]

// Use cases
const USE_CASES = [
  {
    title: "Home Safety",
    icon: Home,
    color: "from-red-500 to-rose-600",
    description: "Protect your family with the smartest smoke alarm ever built.",
    applications: ["Fire detection", "Air quality monitoring", "Mold prevention", "CO₂ alerts"]
  },
  {
    title: "Schools & Daycare",
    icon: Users,
    color: "from-rose-500 to-pink-600",
    description: "Keep children safe with comprehensive environmental monitoring.",
    applications: ["Classroom air quality", "Virus risk detection", "Fire safety", "Allergen alerts"]
  },
  {
    title: "Healthcare Facilities",
    icon: Heart,
    color: "from-red-600 to-red-700",
    description: "Critical air quality monitoring for hospitals and clinics.",
    applications: ["Infection control", "Clean room monitoring", "Patient safety", "Compliance reporting"]
  },
  {
    title: "Commercial Buildings",
    icon: Building2,
    color: "from-rose-600 to-red-600",
    description: "Smart building integration with mesh networking.",
    applications: ["HVAC optimization", "Occupancy sensing", "Fire detection", "IAQ compliance"]
  },
]

// Specs
const SPECIFICATIONS = {
  "Form Factor": "5.5\" diameter × 1.8\" height",
  "Weight": "128 grams",
  "Power": "3.7V 2000mAh Li-ion + AC backup",
  "Battery Life": "2 months battery / continuous with AC",
  "Connectivity": "WiFi b/g/n, Bluetooth 5.0, LoRa optional",
  "Alert Latency": "< 60 seconds",
  "Sound Level": "85 dB @ 10 feet",
  "Sensors": "Smoke, CO₂, VOC, PM, Temp, Humidity, Pressure, Light",
  "Processing": "ESP32-S3 with TinyML",
  "Mounting": "Standard ceiling/wall mount",
  "Certifications": "UL 217, CE, FCC",
  "Price": "$49.99 Standard / $79.99 Pro"
}

// Detection capabilities
const DETECTIONS = [
  { icon: Flame, name: "Smoke & Fire", desc: "Dual ionization + photoelectric" },
  { icon: Wind, name: "VOCs", desc: "Volatile organic compounds" },
  { icon: Sparkles, name: "Particulates", desc: "PM1.0, PM2.5, PM10" },
  { icon: Microscope, name: "Mold Spores", desc: "Early warning before visible growth" },
  { icon: Activity, name: "CO₂", desc: "Ventilation quality monitoring" },
  { icon: Thermometer, name: "Climate", desc: "Temperature & humidity" },
  { icon: AlertCircle, name: "Pathogens", desc: "Bioaerosol density estimation" },
  { icon: Gauge, name: "Pressure", desc: "Barometric changes" },
]

export function AlarmDetails() {
  const [selectedComponent, setSelectedComponent] = useState("smoke")
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <div className="relative bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 overflow-hidden">
      {/* Hero Section - Clean Glass Lab Aesthetic */}
      <section ref={heroRef} className="relative min-h-dvh flex items-center justify-center overflow-hidden">
        {/* Clean white/glass background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f920_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f920_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Pulsing warning light effects */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-red-300 rounded-full shadow-lg shadow-red-300/50 animate-pulse" style={{ animationDelay: '1s' }} />
        
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <Badge className="mb-4 bg-red-500 text-white border-0 text-sm px-4 py-1">
            Indoor Safety Monitor
          </Badge>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-red-700 to-slate-800">
              ALARM
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-slate-600 mb-8 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            The smartest safety device ever built for Earth.
            <br />
            <span className="text-red-600 font-medium">Know what&apos;s coming—before it arrives.</span>
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Pre-Order - $49.99
            </Button>
            <Button size="lg" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              <Play className="mr-2 h-5 w-5" />
              Watch Video
            </Button>
          </motion.div>
          
          <motion.p
            className="text-sm text-slate-500 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
          >
            Shipping Q4 2026 • Replaces any standard smoke detector
          </motion.p>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-red-200 flex justify-center pt-2">
            <motion.div 
              className="w-1.5 h-3 bg-red-400 rounded-full"
              animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-red-100 text-red-600 border-red-200">
                The Vision
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
                Replace Every Smoke Alarm on Earth
              </h2>
              <div className="space-y-4 text-lg text-slate-600">
                <p>
                  Smoke alarms haven&apos;t evolved in 50 years. They&apos;re dumb, reactive, and 
                  often annoying. ALARM changes everything—same size, same mounting, 
                  exponentially smarter.
                </p>
                <p>
                  Beyond smoke, ALARM detects mold before you see it, warns about air 
                  quality issues, monitors for pathogens, and even knows when a wildfire 
                  is approaching your neighborhood.
                </p>
                <p>
                  With mesh networking, your entire building becomes a unified safety 
                  system. One ALARM detects a threat, all ALARMs respond. Real-time 
                  data pushes to your phone, your family, and emergency services.
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600">8+</div>
                  <div className="text-sm text-slate-500">Sensors</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600">&lt;60s</div>
                  <div className="text-sm text-slate-500">Alert Time</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600">UL</div>
                  <div className="text-sm text-slate-500">Certified</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600">AI</div>
                  <div className="text-sm text-slate-500">Powered</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white shadow-2xl flex items-center justify-center">
                <Image
                  src={ALARM_ASSETS.mainImage}
                  alt="ALARM Device"
                  fill
                  className="object-contain p-8"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 p-4 bg-red-500 rounded-2xl shadow-xl shadow-red-500/30">
                <AlertTriangle className="h-8 w-8 text-white" />
                <p className="text-sm font-medium mt-2 text-white">Smart Safety</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detection Capabilities */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 border-red-200">
              8+ Sensors
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800">
              What ALARM Detects
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Far more than smoke. ALARM monitors everything that affects your indoor air quality and safety.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DETECTIONS.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white border-slate-200 hover:border-red-200 hover:shadow-lg transition-all h-full">
                  <CardContent className="pt-6">
                    <div className="p-3 rounded-xl bg-red-50 w-fit mb-4">
                      <item.icon className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-slate-800">{item.name}</h3>
                    <p className="text-slate-600 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 to-white border border-slate-200 p-8 flex items-center justify-center">
                <div className="text-center">
                  <Cpu className="h-20 w-20 text-red-400 mx-auto mb-4" />
                  <p className="text-2xl font-bold text-slate-700">TinyML Inference</p>
                  <p className="text-slate-500">Pattern recognition at the edge</p>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <Badge className="mb-4 bg-red-100 text-red-600 border-red-200">
                Artificial Intelligence
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
                Smart Enough to Know the Difference
              </h2>
              <div className="space-y-4 text-lg text-slate-600">
                <p>
                  Nuisance alarms from cooking are the #1 reason people disable smoke 
                  detectors. ALARM&apos;s onboard AI learns the difference between burnt 
                  toast and a real fire.
                </p>
                <p>
                  The ESP32-S3 runs TinyML models trained on thousands of sensor patterns. 
                  It recognizes &quot;danger fingerprints&quot; that distinguish mold from smoke, 
                  virus from pollen, cooking from fire.
                </p>
              </div>
              
              <div className="mt-8 space-y-4">
                {[
                  "Recognizes multi-sensor danger patterns",
                  "Learns your space's normal conditions",
                  "Updates over-the-air with new capabilities",
                  "Reduces false alarms by 90%"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-green-100">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 border-red-200">
              Applications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800">
              Where ALARM Protects
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
                className={`cursor-pointer rounded-2xl border-2 p-6 transition-all ${
                  selectedCase === index
                    ? 'bg-gradient-to-br ' + useCase.color + ' border-transparent text-white shadow-xl'
                    : 'border-slate-200 bg-white hover:border-red-200 hover:shadow-lg'
                }`}
              >
                <useCase.icon className={`h-10 w-10 mb-4 ${selectedCase === index ? 'text-white' : 'text-red-500'}`} />
                <h3 className={`font-bold text-lg mb-2 ${selectedCase === index ? 'text-white' : 'text-slate-800'}`}>
                  {useCase.title}
                </h3>
                <p className={`text-sm mb-4 ${selectedCase === index ? 'text-white/90' : 'text-slate-600'}`}>
                  {useCase.description}
                </p>
                <div className="space-y-1">
                  {useCase.applications.map((app) => (
                    <div key={app} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${selectedCase === index ? 'text-white/80' : 'text-red-400'}`} />
                      <span className={selectedCase === index ? 'text-white/90' : 'text-slate-500'}>{app}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inside ALARM - Blueprint Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-red-500/20 text-red-400 border-red-500/30">
              Engineering
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Inside ALARM
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Advanced sensor array packed into a standard smoke detector form factor.
            </p>
          </div>

          {/* Control Device Layout */}
          <div className="relative bg-slate-800/50 rounded-3xl border border-red-500/20 p-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel */}
                <div className="bg-slate-950 rounded-2xl border border-red-500/30 p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-red-400/70 uppercase tracking-wider">Component Selector</span>
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
                              ? 'bg-red-500/20 border-red-400 shadow-lg shadow-red-500/20' 
                              : 'bg-slate-900/50 border-slate-700 hover:border-red-500/40'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${isSelected ? 'text-red-400' : 'text-white/50'}`} />
                            <span className={`text-xs font-medium ${isSelected ? 'text-red-400' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget */}
                <div className="bg-slate-950 rounded-2xl border border-red-500/30 p-4 shadow-inner flex-1">
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

              {/* RIGHT SIDE: Device Visual */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative flex-1 min-h-[500px] bg-slate-950 rounded-2xl border border-red-500/30 overflow-hidden shadow-inner">
                  {/* Clean grid */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `
                      linear-gradient(rgba(248,113,113,0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(248,113,113,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                  }} />
                  
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-900 to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Device Cross-Section</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">ALARM // REV 1.0</span>
                    </div>
                  </div>
                  
                  {/* Device Visual */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src={ALARM_ASSETS.mainImage}
                      alt="ALARM Device"
                      width={300}
                      height={300}
                      className="opacity-60"
                    />
                  </div>
                  
                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-red-400">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        ALL CLEAR
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 border-red-200">
              Specifications
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800">
              Technical Details
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-slate-800">Physical</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">{key}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-slate-800">System</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">{key}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-12">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <Download className="mr-2 h-4 w-4" />
              Download Full Specifications
            </Button>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <Eye className="mr-2 h-4 w-4" />
              View 3D Model
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-red-50">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
            Ready to breathe easier?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Pre-order ALARM today and be among the first to experience 
            the future of indoor safety.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Pre-Order - $49.99
            </Button>
            <Button size="lg" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              <ExternalLink className="mr-2 h-5 w-5" />
              Bulk Ordering
            </Button>
          </div>
          
          <p className="text-sm text-slate-500 mt-8">
            Pre-orders open now • Shipping Q4 2026 • 30-day money-back guarantee
          </p>
        </div>
      </section>
    </div>
  )
}
