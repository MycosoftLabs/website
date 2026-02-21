"use client"

import { useState, useRef, useEffect } from "react"
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
  ShoppingCart, Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Box, Network, Shield, Zap, Eye, Thermometer, Server, HardDrive,
  Droplets, Activity, MapPin, Globe, Microscope, Database, Package,
  Cpu, Battery, Signal, Lock, Cloud, Plug, Cable, Radio,
  ExternalLink, Check, CircuitBoard, Layers, LayoutGrid, Maximize,
  ArrowRight, Square, RectangleHorizontal, RectangleVertical
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { InfrastructureGrid } from "@/components/effects/scrolling-grid"
import { InfrastructureDotGrid } from "@/components/effects/dot-grid-pulse"
import { ProductShowcaseDots } from "@/components/effects/connected-dots"

// ============================================================================
// HYPHAE 1 MEDIA ASSETS
// Place media files in: public/assets/hyphae1/ (local)
// NAS path: \\192.168.0.105\mycosoft.com\website\assets\hyphae1\
// Public URL: /assets/hyphae1/...
// See docs/DEVICE_MEDIA_ASSETS_PIPELINE.md for details
// ============================================================================
const HYPHAE1_ASSETS = {
  // Product images by variant - replace when real photos are available
  compact: "/assets/hyphae1/compact.jpg",
  standard: "/assets/hyphae1/standard.jpg",
  industrial: "/assets/hyphae1/industrial.jpg",
  // Generic fallback
  mainImage: "/placeholder.svg?height=600&width=800&text=Hyphae1",
  // Gallery images
  gallery: [
    { src: "/assets/hyphae1/gallery-1.jpg", alt: "Hyphae 1 Compact", location: "Panel Mounted" },
    { src: "/assets/hyphae1/gallery-2.jpg", alt: "Hyphae 1 Standard", location: "DIN Rail" },
    { src: "/assets/hyphae1/gallery-3.jpg", alt: "Hyphae 1 Industrial", location: "Field Deploy" },
  ],
  // Hero video (add when available)
  // heroVideo: "/assets/hyphae1/hero.mp4",
}

// Hyphae 1 comes in 3 sizes - like electric junction boxes
const HYPHAE_VARIANTS = [
  {
    id: "compact",
    name: "Hyphae 1 Compact",
    size: "Small",
    dimensions: "15cm × 10cm × 5cm",
    capacity: "Basic",
    icon: Square,
    channels: 4,
    price: 199,
    description: "Perfect for single-point monitoring and tight spaces"
  },
  {
    id: "standard",
    name: "Hyphae 1 Standard",
    size: "Medium",
    dimensions: "25cm × 15cm × 8cm",
    capacity: "Standard",
    icon: RectangleHorizontal,
    channels: 8,
    price: 399,
    description: "The versatile workhorse for most deployments"
  },
  {
    id: "industrial",
    name: "Hyphae 1 Industrial",
    size: "Large",
    dimensions: "40cm × 25cm × 12cm",
    capacity: "Extended",
    icon: Maximize,
    channels: 16,
    price: 799,
    description: "Maximum capacity for complex installations"
  }
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
    name: "IP66 Enclosure", 
    icon: Box,
    position: { top: "10%", left: "45%" }, 
    description: "Fiberglass-reinforced polymer housing",
    details: "The Hyphae 1 enclosure is constructed from UV-stabilized fiberglass-reinforced polymer (FRP) rated IP66. It withstands extreme temperatures, UV exposure, and physical impact while remaining lightweight. Available in white or grey to match any installation environment."
  },
  { 
    id: "terminal", 
    name: "Terminal Block", 
    icon: Cable,
    position: { top: "25%", left: "30%" }, 
    description: "Modular connection system",
    details: "Industrial-grade terminal blocks support 4-16 sensor channels depending on variant. Each terminal handles 2A continuous current with surge protection. Color-coded and labeled for easy installation. Accepts wire gauges from 22-12 AWG."
  },
  { 
    id: "controller", 
    name: "Control Module", 
    icon: Cpu,
    position: { top: "40%", left: "55%" }, 
    description: "ESP32-S3 with RS-485 bus",
    details: "The ESP32-S3 control module manages all sensor channels via an RS-485 industrial bus. Supports Modbus RTU/TCP protocols for integration with existing SCADA and BMS systems. Edge processing capability enables local analytics and alerting."
  },
  { 
    id: "power", 
    name: "Power Supply", 
    icon: Plug,
    position: { top: "50%", left: "35%" }, 
    description: "24V DC / 120-240V AC options",
    details: "Flexible power input accepts 24V DC or 120-240V AC (50/60Hz). Integrated surge protection handles transients up to 6kV. Optional battery backup module provides 24-hour operation during power outages."
  },
  { 
    id: "io", 
    name: "I/O Expansion", 
    icon: CircuitBoard,
    position: { top: "60%", left: "50%" }, 
    description: "Analog and digital I/O",
    details: "Expansion slots accept analog input cards (4-20mA, 0-10V), digital I/O cards, and relay output modules. Mix and match to create custom configurations for any monitoring or control application."
  },
  { 
    id: "comms", 
    name: "Communications", 
    icon: Radio,
    position: { top: "70%", left: "40%" }, 
    description: "Ethernet, LoRa, WiFi, LTE",
    details: "Multiple communication options ensure connectivity in any environment. Hardwired Ethernet for reliable building integration, WiFi for quick setup, LoRa for long-range mesh networking, and optional LTE cellular for remote sites."
  },
  { 
    id: "din", 
    name: "DIN Rail Mount", 
    icon: Layers,
    position: { top: "80%", left: "55%" }, 
    description: "Standard 35mm DIN rail compatible",
    details: "Mounts directly on standard 35mm DIN rails for panel installation. Wall-mount and pole-mount kits also available. Tool-free installation with secure snap-fit design."
  },
  { 
    id: "display", 
    name: "Status Display", 
    icon: Eye,
    position: { top: "35%", left: "65%" }, 
    description: "LED indicators + optional LCD",
    details: "Front-panel LED indicators show power, network, channel status, and alarms at a glance. Optional LCD module provides local readout of sensor values, configuration menus, and diagnostic information."
  },
]

// Use cases
const USE_CASES = [
  {
    title: "Building Automation",
    icon: Server,
    color: "from-slate-400 to-slate-600",
    description: "Integrate with BMS systems for HVAC control, energy monitoring, and environmental sensing.",
    applications: ["HVAC integration", "Energy monitoring", "Occupancy sensing", "Air quality control"]
  },
  {
    title: "Industrial Monitoring",
    icon: HardDrive,
    color: "from-slate-500 to-slate-700",
    description: "Monitor industrial processes, equipment status, and environmental conditions.",
    applications: ["Process monitoring", "Equipment health", "Leak detection", "Temperature mapping"]
  },
  {
    title: "Data Centers",
    icon: Database,
    color: "from-slate-300 to-slate-500",
    description: "Track temperature, humidity, and airflow in server rooms and data centers.",
    applications: ["Hot/cold aisle monitoring", "Humidity control", "Water leak detection", "Power monitoring"]
  },
  {
    title: "Agriculture",
    icon: Droplets,
    color: "from-slate-400 to-slate-500",
    description: "Monitor greenhouses, storage facilities, and processing environments.",
    applications: ["Greenhouse climate", "Cold storage monitoring", "Irrigation control", "Livestock environment"]
  },
]

// Specs
const SPECIFICATIONS = {
  "Enclosure Rating": "IP66 / NEMA 4X",
  "Operating Temp": "-40°C to 70°C",
  "Housing Material": "UV-stabilized FRP",
  "Sensor Channels": "4 / 8 / 16 (by variant)",
  "Communication": "Ethernet, WiFi, LoRa, LTE",
  "Power Input": "24V DC or 120-240V AC",
  "Power Consumption": "< 5W typical",
  "Mounting": "DIN rail, wall, pole",
  "Protocols": "Modbus RTU/TCP, MQTT, HTTP API",
  "Certifications": "CE, UL, FCC, RoHS",
  "Warranty": "5 years",
  "Data Storage": "8GB local buffer"
}

export function Hyphae1Details() {
  const [selectedVariant, setSelectedVariant] = useState(HYPHAE_VARIANTS[1])
  const [selectedComponent, setSelectedComponent] = useState("housing")
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05])

  return (
    <NeuromorphicProvider>
    <div className="relative min-h-dvh bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden">
      {/* Hero Section - Clean White Industrial */}
      <section ref={heroRef} className="relative min-h-dvh flex items-center justify-center overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <NeuBadge variant="default" className="mb-4 bg-slate-800 text-white border-0 text-sm px-4 py-1">
            Modular I/O Platform
          </NeuBadge>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-400 dark:to-slate-300">
              Hyphae 1
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            Industrial-grade modular I/O.
            <br />
            <span className="text-slate-900 dark:text-slate-100 font-medium">Three sizes. Infinite possibilities.</span>
          </motion.p>
          
          {/* Size selector */}
          <motion.div 
            className="flex justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            {HYPHAE_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`px-6 py-3 rounded-xl border-2 transition-all ${
                  selectedVariant.id === variant.id
                    ? 'border-slate-800 dark:border-slate-200 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-500 dark:hover:border-slate-400'
                }`}
              >
                <variant.icon className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm font-medium">{variant.size}</span>
              </button>
            ))}
          </motion.div>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
          >
            <NeuButton size="lg" className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Configure & Order
            </NeuButton>
            <NeuButton size="lg" variant="outline" className="border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Download className="mr-2 h-5 w-5" />
              Download Datasheet
            </NeuButton>
          </motion.div>
        </motion.div>
      </section>

      {/* Variant Showcase - Product Line: light bg/dots; dark mode = dark widgets + light text; light mode = white widgets + dark text */}
      <section className="hyphae1-product-line relative py-24 bg-slate-100 dark:bg-slate-200 overflow-hidden">
        {/* Connected dots background animation - light in both modes for contrast with dark widgets */}
        <ProductShowcaseDots className="opacity-100" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-product-badge mb-4 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-900 border-slate-300 dark:border-slate-500">
              Product Line
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-900">
              Choose Your Size
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-800 max-w-2xl mx-auto">
              From compact single-point monitors to industrial-scale systems, 
              Hyphae 1 scales to your needs.
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
                    ? 'border-slate-800 dark:border-slate-200 bg-slate-50 dark:bg-slate-800 shadow-xl dark:shadow-slate-900/50 hyphae1-product-card-selected'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-500 dark:hover:border-slate-400 hover:shadow-lg'
                }`}
              >
                <div className={`p-4 rounded-2xl mb-6 w-fit ${
                  selectedVariant.id === variant.id ? 'bg-slate-800 dark:bg-slate-500' : 'bg-slate-100 dark:bg-slate-600'
                }`}>
                  <variant.icon className={`h-10 w-10 ${
                    selectedVariant.id === variant.id ? 'text-white' : 'text-slate-600 dark:text-slate-100'
                  }`} />
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">{variant.name}</h3>
                <p className="text-slate-600 dark:text-slate-200 mb-4">{variant.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-300">Dimensions</span>
                    <span className="font-medium text-slate-700 dark:text-slate-100">{variant.dimensions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-300">Channels</span>
                    <span className="font-medium text-slate-700 dark:text-slate-100">{variant.channels}</span>
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  ${variant.price}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="hyphae1-why py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeuBadge variant="default" className="mb-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                Why Hyphae 1
              </NeuBadge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                The Industrial Standard
              </h2>
              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-300">
                <p>
                  Hyphae 1 is a modular I/O platform designed for industrial, commercial, 
                  and agricultural environments. It bridges the gap between simple sensors 
                  and complex building management systems.
                </p>
                <p>
                  With IP66-rated enclosures, industrial communication protocols, and 
                  flexible mounting options, Hyphae 1 integrates seamlessly into any 
                  existing infrastructure.
                </p>
                <p>
                  Whether you&apos;re monitoring a greenhouse, a data center, or an industrial 
                  facility, Hyphae 1 provides the reliable connectivity your operation demands.
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">IP66</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Weather Rating</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">16</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Max Channels</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">5yr</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Warranty</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">UL</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Certified</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                <div className="relative w-3/4 h-3/4">
                  <Box className="w-full h-full text-slate-300 dark:text-slate-600" strokeWidth={0.5} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{selectedVariant.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">{selectedVariant.dimensions}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="hyphae1-capabilities py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-capabilities-badge mb-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              Capabilities
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Built for Industry
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "IP66 Rated", desc: "Dust-tight and water-resistant for harsh environments" },
              { icon: Network, title: "Multi-Protocol", desc: "Modbus, MQTT, REST API, and more" },
              { icon: Plug, title: "Flexible Power", desc: "24V DC or universal AC input" },
              { icon: LayoutGrid, title: "Modular Design", desc: "Expandable I/O with plug-in cards" },
              { icon: Radio, title: "Multi-Connectivity", desc: "Ethernet, WiFi, LoRa, LTE options" },
              { icon: HardDrive, title: "Edge Computing", desc: "Local processing and analytics" },
              { icon: Lock, title: "Secure", desc: "TLS encryption, access control" },
              { icon: Layers, title: "DIN Rail", desc: "Standard industrial mounting" },
            ].map((item) => (
              <NeuCard key={item.title} className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-lg transition-all">
                <NeuCardContent className="pt-6">
                  <div className="p-3 rounded-xl bg-slate-800 dark:bg-slate-600 w-fit mb-4">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">{item.desc}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="hyphae1-applications relative py-24 bg-slate-100 dark:bg-slate-900 overflow-hidden">
        {/* Scrolling grid background effect - prominent visibility */}
        <InfrastructureGrid className="opacity-90" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="hyphae1-applications-badge mb-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              Applications
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Deployed Everywhere
            </h2>
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
                    ? 'border-slate-800 dark:border-slate-400 bg-slate-800 dark:bg-slate-700 text-white'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <useCase.icon className={`h-10 w-10 mb-4 ${selectedCase === index ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                <h3 className={`font-bold text-lg mb-2 ${selectedCase === index ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                  {useCase.title}
                </h3>
                <p className={`text-sm mb-4 ${selectedCase === index ? 'text-white/80' : 'text-slate-600 dark:text-slate-300'}`}>
                  {useCase.description}
                </p>
                <div className="space-y-1">
                  {useCase.applications.map((app) => (
                    <div key={app} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${selectedCase === index ? 'text-white/60' : 'text-slate-400 dark:text-slate-400'}`} />
                      <span className={selectedCase === index ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}>{app}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inside Hyphae 1 - Blueprint Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4 bg-white/10 text-white border-white/20">
              Engineering
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Inside Hyphae 1
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Industrial-grade components built for decades of reliable operation.
            </p>
          </div>

          {/* Control Device Layout */}
          <div className="relative bg-slate-800/50 rounded-3xl border border-slate-700 p-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              {/* LEFT SIDE: Controller Panel + Description */}
              <div className="lg:w-80 flex flex-col gap-4">
                {/* Controller Panel */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-white/70 uppercase tracking-wider">Component Selector</span>
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
                              ? 'bg-white/10 border-white/40' 
                              : 'bg-slate-800/50 border-slate-700 hover:border-white/30'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-white/50'}`} />
                            <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                              {component.name}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Description Widget */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 shadow-inner flex-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-mono text-white/70 uppercase tracking-wider">Component Details</span>
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
                          <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                            <component.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{component.name}</h3>
                            <p className="text-xs text-white/50 font-mono">{component.description}</p>
                          </div>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">{component.details}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT SIDE: Schematic */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative flex-1 min-h-[500px] bg-slate-950 rounded-2xl border border-slate-700 overflow-hidden shadow-inner">
                  {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                  }} />
                  
                  {/* Panel Header */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-slate-900 to-transparent z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Schematic View</span>
                      <div className="flex-1" />
                      <span className="text-xs font-mono text-white/30">HYPHAE-1 // {selectedVariant.size.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  {/* Device Visual */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-3/4 h-3/4 border border-slate-600 rounded-lg bg-slate-800/50">
                      <Box className="absolute inset-0 w-full h-full text-slate-600/30" strokeWidth={0.3} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-mono text-slate-500">HYPHAE 1</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex items-center justify-between text-xs font-mono text-white/30">
                      <span>COMPONENT: <span className="text-white/70">{DEVICE_COMPONENTS.find(c => c.id === selectedComponent)?.name.toUpperCase()}</span></span>
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
      <section className="hyphae1-tech-specs py-24 bg-white dark:bg-slate-800" data-section="tech-specs">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              Specifications
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Technical Details
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="hyphae1-spec-card bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Box className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">Physical</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-slate-600 dark:text-slate-400">{key}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="hyphae1-spec-card bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-100">System</span>
              </div>
              <div className="space-y-3">
                {Object.entries(SPECIFICATIONS).slice(6).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-slate-600 dark:text-slate-400">{key}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
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

      {/* CTA Section */}
      <section className="relative py-24 bg-slate-900 text-white overflow-hidden">
        {/* Pulsing dot grid background effect - full visibility */}
        <InfrastructureDotGrid className="opacity-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          {/* Container widget to separate text from animated background */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-10 md:p-14 shadow-2xl">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to modernize your infrastructure?
              </h2>
              <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                Configure your Hyphae 1 system with our online tool or speak 
                with our integration specialists.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <NeuButton size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Configure & Order
                </NeuButton>
                <NeuButton size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Contact Sales
                </NeuButton>
              </div>
              
              <p className="text-sm text-white/50 mt-8">
                Starting at $199 • 5-year warranty • Free technical support
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </NeuromorphicProvider>
  )
}

