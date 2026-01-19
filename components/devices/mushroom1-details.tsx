"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ShoppingCart, Download, Share2, Play, Pause, ChevronLeft, ChevronRight,
  Antenna, Radio, Wifi, Network, Shield, Zap, Sun, Eye, Thermometer,
  Droplets, Wind, Activity, MapPin, Globe, Trees, Microscope, Database,
  Cpu, Battery, Signal, Lock, Cloud, Leaf, AlertTriangle, Check,
  ExternalLink, Youtube
} from "lucide-react"

// Asset configuration
const MUSHROOM1_ASSETS = {
  images: [
    { src: "/assets/mushroom1/1.jpg", alt: "Mushroom 1 Field Deployment 1", location: "Field Deployment" },
    { src: "/assets/mushroom1/2.jpg", alt: "Mushroom 1 Field Deployment 2", location: "Environmental Sensing" },
    { src: "/assets/mushroom1/3.jpg", alt: "Mushroom 1 Field Deployment 3", location: "Research Station" },
    { src: "/assets/mushroom1/4.jpg", alt: "Mushroom 1 Field Deployment 4", location: "Forest Monitoring" },
    { src: "/assets/mushroom1/6.jpg", alt: "Mushroom 1 Field Deployment 5", location: "Ecosystem Study" },
  ],
  mainImage: "/assets/mushroom1/Main A.jpg",
  videos: {
    background: "/assets/mushroom1/PXL_20250404_210633484.VB-02.MAIN.mp4",
    walking: "/assets/mushroom1/mushroom 1 walking.mp4",
    waterfall: "/assets/mushroom1/waterfall 1.mp4",
    demo: "/assets/mushroom1/2025-04-05-160513069.mp4",
    promo: "/assets/mushroom1/grok_video_2026-01-12-01-28-34.mp4",
  },
  useCaseVideos: [
    "/assets/mushroom1/a.mp4",
    "/assets/mushroom1/b.mp4", 
    "/assets/mushroom1/c.mp4",
    "/assets/mushroom1/d.mp4",
  ],
  youtubeVideos: [
    { id: "jpQrYCCACm4", title: "Mushroom 1 - Commercial Teaser" },
    { id: "F7txuDmpSa4", title: "Mushroom 1 - Product Overview" },
    { id: "Z5pC9lEceKM", title: "Mushroom 1 - Technology Deep Dive" },
  ]
}

// Component architecture data for blueprint
const DEVICE_COMPONENTS = [
  { id: "solar", name: "Solar Panels", position: { top: "8%", left: "30%" }, description: "4x High-efficiency monocrystalline cells" },
  { id: "cap", name: "Cap Housing", position: { top: "15%", left: "50%" }, description: "UV-resistant polycarbonate dome" },
  { id: "leds", name: "Status LEDs", position: { top: "25%", left: "70%" }, description: "RGB status indicators (power, network, alert)" },
  { id: "antenna", name: "LoRa Antenna", position: { top: "30%", left: "25%" }, description: "Long-range 915MHz mesh network antenna" },
  { id: "bme688", name: "BME688 Sensors", position: { top: "40%", left: "60%" }, description: "Dual environmental sensors (AMB + ENV)" },
  { id: "esp32", name: "ESP32-S3 Brain", position: { top: "50%", left: "40%" }, description: "Main processing unit with 16MB flash" },
  { id: "battery", name: "Li-Po Battery", position: { top: "55%", left: "70%" }, description: "3.7V 6600mAh rechargeable" },
  { id: "stem", name: "Stem Housing", position: { top: "65%", left: "50%" }, description: "IP67 weatherproof enclosure" },
  { id: "legs", name: "Tripod Legs", position: { top: "80%", left: "35%" }, description: "Adjustable ground anchors" },
  { id: "probe", name: "Soil Probe", position: { top: "90%", left: "55%" }, description: "2m depth sensor array" },
]

// Use cases - now with video backgrounds
const USE_CASES = [
  {
    title: "Scientific Research",
    icon: Microscope,
    color: "from-blue-500 to-cyan-500",
    description: "Universities and research institutions use Mushroom 1 to study mycelial network communication, forest health, and ecosystem dynamics.",
    applications: ["Mycology research", "Forest ecology studies", "Climate change monitoring", "Biodiversity assessment"],
    video: "/assets/mushroom1/a.mp4"
  },
  {
    title: "Conservation & Wildlife",
    icon: Trees,
    color: "from-green-500 to-emerald-500",
    description: "National parks and conservation areas deploy Mushroom 1 networks to monitor ecosystem health and detect environmental threats early.",
    applications: ["Park ecosystem monitoring", "Wildlife habitat tracking", "Fire risk assessment", "Pollution detection"],
    video: "/assets/mushroom1/b.mp4"
  },
  {
    title: "Agriculture & Farming",
    icon: Leaf,
    color: "from-amber-500 to-orange-500",
    description: "Farmers and agricultural operations use Mushroom 1 to monitor soil health, predict crop conditions, and optimize growing environments.",
    applications: ["Soil health monitoring", "Irrigation optimization", "Pest early warning", "Organic certification"],
    video: "/assets/mushroom1/c.mp4"
  },
  {
    title: "Defense & Security",
    icon: Shield,
    color: "from-slate-600 to-slate-800",
    description: "Military and security operations leverage Mushroom 1 for persistent environmental awareness and operational intelligence.",
    applications: ["Base perimeter monitoring", "Contamination detection", "Early warning systems", "Threat assessment"],
    video: "/assets/mushroom1/d.mp4"
  },
]

// Sensor specifications
const SENSORS = [
  { name: "BME688 (Ambient)", icon: Thermometer, specs: ["Temperature: -40°C to 85°C", "Humidity: 0-100% RH", "Pressure: 300-1100 hPa", "Gas: VOCs, CO2 equivalent"] },
  { name: "BME688 (Environmental)", icon: Wind, specs: ["Air quality index", "Spore density estimation", "Pollution detection", "Pathogen indicators"] },
  { name: "Soil Probe Array", icon: Droplets, specs: ["Moisture: 0-100%", "Temperature: 2m depth", "pH estimation", "Mycelial activity detection"] },
  { name: "Light Sensor", icon: Sun, specs: ["Ambient light level", "UV index", "Day/night cycle", "Canopy coverage"] },
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    setSelectedVideo(videoId)
    setIsVideoModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section - Fullscreen Video */}
      <motion.section 
        ref={heroRef}
        className="relative h-screen w-full overflow-hidden"
        style={{ opacity: heroOpacity }}
      >
        {/* Background Video */}
        <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={MUSHROOM1_ASSETS.videos.background} type="video/mp4" />
          </video>
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
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-sm px-4 py-1">
              Pre-Order Now - $2,000
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-200 to-emerald-400">
              Mushroom 1
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-white/80 mb-8 max-w-3xl font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            The world&apos;s first ground-based fungal intelligence station.
            <br />
            <span className="text-emerald-400">Giving nature a voice.</span>
          </motion.p>

          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Pre-Order Now
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Play className="mr-2 h-5 w-5" />
              Watch Film
            </Button>
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
      <section className="py-24 px-4 bg-gradient-to-b from-black via-slate-950 to-black">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Our Mission</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why <span className="text-emerald-400">Mushroom 1</span> Exists
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <p className="text-xl text-white/80 leading-relaxed">
                For billions of years, fungi have been the Earth&apos;s oldest and most sophisticated communication network. 
                Beneath every forest floor, meadow, and ecosystem, mycelial networks exchange information, nutrients, 
                and warnings at scales we&apos;re only beginning to understand.
              </p>
              <p className="text-xl text-white/80 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Mushroom 1</span> is humanity&apos;s first attempt to listen. 
                By deploying persistent, solar-powered sensor stations that tap into environmental signals—from soil bioelectrics 
                to atmospheric conditions—we can finally give nature a voice.
              </p>
              <p className="text-xl text-white/80 leading-relaxed">
                This isn&apos;t just monitoring. It&apos;s <span className="text-emerald-400 font-semibold">Environmental Intelligence</span>—a 
                new paradigm where the natural world becomes an active participant in our decision-making, 
                warning us of fires before they ignite, detecting contamination before it spreads, and 
                revealing the hidden health of ecosystems in real-time.
              </p>
              
              <div className="flex gap-4 pt-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">2m</div>
                  <div className="text-sm text-white/60">Sensing Depth</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">5km</div>
                  <div className="text-sm text-white/60">Mesh Range</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">6mo</div>
                  <div className="text-sm text-white/60">Battery Life</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">IP67</div>
                  <div className="text-sm text-white/60">Weatherproof</div>
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
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-500/20">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover object-center"
                >
                  <source src={MUSHROOM1_ASSETS.videos.waterfall} type="video/mp4" />
                </video>
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

      {/* Photo Gallery Carousel */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-white/10 text-white border-white/20">Field Deployments</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              In the <span className="text-emerald-400">Wild</span>
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
                    src={MUSHROOM1_ASSETS.images[currentSlide].src}
                    alt={MUSHROOM1_ASSETS.images[currentSlide].alt}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <Badge className="bg-black/50 backdrop-blur-sm border-white/20 mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {MUSHROOM1_ASSETS.images[currentSlide].location}
                    </Badge>
                    <p className="text-white/80">{MUSHROOM1_ASSETS.images[currentSlide].alt}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 transition-all"
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
                  <Image src={img.src} alt={img.alt} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-gradient-to-b from-black via-slate-950 to-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Applications</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Who Uses <span className="text-emerald-400">Mushroom 1</span>?
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              From remote research stations to military bases, Mushroom 1 provides persistent environmental intelligence across every domain.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
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
                  className={`cursor-pointer p-6 rounded-xl border transition-all ${
                    activeUseCase === i 
                      ? 'bg-gradient-to-r ' + useCase.color + ' border-white/20' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${activeUseCase === i ? 'bg-white/20' : 'bg-white/10'}`}>
                      <useCase.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{useCase.title}</h3>
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
                        <Badge key={app} className="bg-white/20 border-white/30">{app}</Badge>
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
              <video
                key={USE_CASES[activeUseCase].video}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src={USE_CASES[activeUseCase].video} type="video/mp4" />
              </video>
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
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-red-500/10 text-red-400 border-red-500/30">
              <Youtube className="h-4 w-4 mr-1" />
              Watch
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Official <span className="text-red-400">Videos</span>
            </h2>
            <p className="text-xl text-white/60">
              See Mushroom 1 in action through our official commercials and demos.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
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
                  src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 fill-white" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-semibold">{video.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sensor Capabilities */}
      <section className="py-24 bg-gradient-to-b from-black via-slate-950 to-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/30">Technology</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Advanced <span className="text-cyan-400">Sensor Suite</span>
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Military-grade environmental sensors packed into a compact, solar-powered package.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SENSORS.map((sensor, i) => (
              <motion.div
                key={sensor.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:border-cyan-500/50 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-cyan-500/10">
                        <sensor.icon className="h-6 w-6 text-cyan-400" />
                      </div>
                      <CardTitle className="text-white">{sensor.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {sensor.specs.map((spec, j) => (
                        <li key={j} className="flex items-center gap-2 text-white/70 text-sm">
                          <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          {spec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
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
                className="text-center p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4">
                  <feature.icon className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-white/60 mt-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Blueprint Section - Placeholder for Interactive 2D Diagram */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/30">Engineering</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Inside <span className="text-amber-400">Mushroom 1</span>
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Explore the internal components and signal pathways of our fungal intelligence station.
            </p>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            {/* Blueprint container */}
            <div className="relative aspect-[3/4] bg-slate-950 rounded-2xl border border-amber-500/20 overflow-hidden">
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                  linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }} />
              
              {/* Device outline */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  <Image
                    src={MUSHROOM1_ASSETS.mainImage}
                    alt="Mushroom 1 Blueprint"
                    width={400}
                    height={600}
                    className="opacity-30 filter grayscale"
                  />
                  
                  {/* Interactive component markers */}
                  {DEVICE_COMPONENTS.map((component) => (
                    <motion.div
                      key={component.id}
                      className="absolute"
                      style={{ top: component.position.top, left: component.position.left }}
                      onMouseEnter={() => setHoveredComponent(component.id)}
                      onMouseLeave={() => setHoveredComponent(null)}
                    >
                      <motion.div
                        className={`w-4 h-4 rounded-full cursor-pointer ${
                          hoveredComponent === component.id ? 'bg-amber-400' : 'bg-amber-500/50'
                        }`}
                        animate={{
                          scale: hoveredComponent === component.id ? 1.5 : [1, 1.2, 1],
                          boxShadow: hoveredComponent === component.id 
                            ? '0 0 20px rgba(251,191,36,0.8)' 
                            : '0 0 10px rgba(251,191,36,0.3)'
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* Tooltip */}
                      <AnimatePresence>
                        {hoveredComponent === component.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute z-10 left-6 top-0 bg-slate-900 border border-amber-500/30 rounded-lg p-3 w-64"
                          >
                            <h4 className="font-semibold text-amber-400">{component.name}</h4>
                            <p className="text-sm text-white/70 mt-1">{component.description}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Animated signal lines placeholder */}
              <div className="absolute bottom-8 left-8 right-8 text-center">
                <p className="text-amber-400/60 text-sm">
                  Interactive 2D wire diagram with live signal processing coming soon
                </p>
              </div>
            </div>

            {/* Component legend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
              {DEVICE_COMPONENTS.slice(0, 5).map((component) => (
                <div 
                  key={component.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    hoveredComponent === component.id 
                      ? 'bg-amber-500/20 border-amber-500/50' 
                      : 'bg-white/5 border-white/10 hover:border-amber-500/30'
                  }`}
                  onMouseEnter={() => setHoveredComponent(component.id)}
                  onMouseLeave={() => setHoveredComponent(null)}
                >
                  <div className="text-xs text-amber-400 font-medium">{component.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mesh Network Visualization */}
      <section className="py-24 bg-gradient-to-b from-black via-slate-950 to-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/30">Connectivity</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-purple-400">Mesh Network</span> Intelligence
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Deploy multiple units to create an intelligent, self-healing network that spans entire ecosystems.
            </p>
          </motion.div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-500/20">
            <Image
              src="/assets/mushroom1/hill 1.jpg"
              alt="Mushroom 1 Mesh Network Deployment"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            
            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <Globe className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Area Coverage</h3>
                  <p className="text-white/70">A single network of 10 units can monitor up to 80 square kilometers of terrain.</p>
                </div>
                <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <Network className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Self-Healing</h3>
                  <p className="text-white/70">If one node fails, the network automatically reroutes data through alternate paths.</p>
                </div>
                <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <Database className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Cloud Sync</h3>
                  <p className="text-white/70">All data streams to NatureOS and MINDEX for real-time analysis and long-term storage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-slate-500/10 text-slate-400 border-slate-500/30">Specifications</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Technical <span className="text-slate-400">Details</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  Hardware
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Processor", value: "ESP32-S3 Dual-Core 240MHz" },
                  { label: "Memory", value: "16MB Flash + 8MB PSRAM" },
                  { label: "Connectivity", value: "WiFi, Bluetooth 5.0, LoRa 915MHz" },
                  { label: "Power", value: "4x Solar Panels + 6600mAh Li-Po" },
                  { label: "Battery Life", value: "6 months (solar rechargeable)" },
                  { label: "Dimensions", value: "30cm x 30cm x 100cm" },
                  { label: "Weight", value: "4.5kg" },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                    <span className="text-white/60">{spec.label}</span>
                    <span className="text-white font-medium">{spec.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  Environmental
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "IP Rating", value: "IP67 Waterproof" },
                  { label: "Operating Temp", value: "-20°C to 60°C" },
                  { label: "Humidity Range", value: "0-100% RH" },
                  { label: "Sensor Depth", value: "Up to 2 meters" },
                  { label: "Wireless Range", value: "5km line of sight" },
                  { label: "Data Storage", value: "32GB local + cloud sync" },
                  { label: "Certifications", value: "FCC, CE, ROHS" },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                    <span className="text-white/60">{spec.label}</span>
                    <span className="text-white font-medium">{spec.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Download className="mr-2 h-5 w-5" />
              Download Full Specifications
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <ExternalLink className="mr-2 h-5 w-5" />
              View CAD Models
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section with Walking Video Background - Much taller to show more video (square-ish) */}
      <section className="relative py-40 md:py-56 min-h-[800px] md:min-h-[900px] overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 70%' }}
          >
            <source src={MUSHROOM1_ASSETS.videos.walking} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center flex flex-col justify-center min-h-[600px] md:min-h-[700px]">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to take a walk in nature?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Join the future of environmental intelligence. Pre-order Mushroom 1 today and be among the first to deploy the world&apos;s most advanced fungal sensing network.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-6 text-lg">
                <ShoppingCart className="mr-2 h-6 w-6" />
                Pre-Order - $2,000
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg">
                <Download className="mr-2 h-6 w-6" />
                Download Brochure
              </Button>
            </div>
            <p className="text-white/50 mt-6 text-sm">
              Expected shipping Q2 2026 • 30-day money-back guarantee • Free worldwide shipping
            </p>
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
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-xl"
              />
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
  )
}
