"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Microscope, 
  Wind, 
  AlertTriangle, 
  Radar,
  Cpu,
  Radio,
  Battery,
  Wifi,
  Shield,
  Thermometer,
  Droplets,
  Zap,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Package,
  Truck,
  Settings,
  Play
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
    tagline: "Quadrupedal Enviornment Droid",
    description: "Our flagship autonomous environmental drone that monitors underground fungal networks, soil conditions, and environmental data in real-time with unmatched precision.",
    icon: Radar,
    color: "emerald-500",
    image: "/assets/mushroom1/Main A.jpg",
    status: "Pre-order",
    price: "$2,000",
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
    tagline: "Biological Collection System",
    description: "Time-indexed bioaerosol collection with sealed adhesive tape cassettes for lab-grade analysis and long-term environmental monitoring.",
    icon: Wind,
    color: "orange-500",
    image: "/assets/sporebase/sporebase%20main2.jpg",
    status: "In Stock",
    price: "$299",
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
    tagline: "Modular Sensor Platform",
    description: "Industrial-grade modular I/O for building automation, agriculture, and industrial monitoring. Three sizes to fit any deployment.",
    icon: Microscope,
    color: "slate-500",
    image: "/placeholder.svg?height=600&width=800&text=Hyphae1",
    status: "In Stock",
    price: "From $199",
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
    tagline: "Subsurface Bioelectric Probe",
    description: "Buried sensor nodes that detect bioelectric signals from mycelial networks and monitor soil conditions at the microvolt level.",
    icon: Radar,
    color: "purple-500",
    image: "/assets/myconode/myconode%20a.png",
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
    id: "alarm",
    name: "ALARM",
    tagline: "The Smartest Safety Device Ever Built",
    description: "Next-generation indoor safety monitor. Detects smoke, mold, pathogens, and air quality threats before they become problems.",
    icon: AlertTriangle,
    color: "red-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%208%2C%202025%2C%2004_02_32%20PM-cWILDVnWKhQEz6toW0Y161OJRUMnyq.png",
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

const accessories = [
  { 
    name: "Deployment Kit", 
    description: "Complete tools and supplies for professional field installation. Includes mounting hardware, calibration tools, and quick-start guide.",
    icon: Package,
    image: "/assets/devices/deployment-kit.jpg"
  },
  { 
    name: "LoRa Gateway", 
    description: "Long-range mesh network gateway supporting up to 50 connected nodes. Weather-resistant with solar power option.",
    icon: Radio,
    image: "/assets/devices/lora-gateway.jpg"
  },
  { 
    name: "Solar Power Unit", 
    description: "Off-grid power solution for remote deployments. 20W panel with 72-hour battery backup for continuous operation.",
    icon: Zap,
    image: "/assets/devices/solar-unit.jpg"
  },
  { 
    name: "Ruggedized Case", 
    description: "MIL-STD-810G certified transport and storage case. Foam-lined interior protects devices during deployment.",
    icon: Shield,
    image: "/assets/devices/ruggedized-case.jpg"
  }
]

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
    <div className="min-h-dvh">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container max-w-7xl mx-auto relative z-10 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <NeuBadge variant="default" className="mb-4">Hardware Platform</NeuBadge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Environmental
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-500">
                Sensing Hardware
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Purpose-built sensors and platforms for persistent environmental intelligence. 
              Defense-grade reliability with research-quality precision.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://www.youtube.com/@mycosoft" target="_blank" rel="noopener noreferrer">
                <NeuButton variant="primary" className="w-full sm:w-auto gap-2">
                  <Play className="h-5 w-5" />
                  Watch Videos
                </NeuButton>
              </a>
              <Link href="/devices/specifications">
                <NeuButton variant="default" className="w-full sm:w-auto gap-2">
                  View Specifications
                  <ChevronRight className="h-5 w-5" />
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
      <section className="hidden md:block py-16 bg-muted/30">
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
                <a href="https://www.youtube.com/@mycosoft" target="_blank" rel="noopener noreferrer">
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
      <section ref={detailRef} className="md:hidden bg-muted/30 pb-8">
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
            <a href="https://www.youtube.com/@mycosoft" target="_blank" rel="noopener noreferrer">
              <NeuButton variant="default" className="w-full gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </NeuButton>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Applications Section */}
      <section className="py-24">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Nature First Technology</NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Giving Nature a Voice
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
              <NeuCard key={app.title} className="text-center transition-colors">
                <NeuCardContent className="pt-8">
                  <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-4">
                    <app.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{app.title}</h3>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Accessories Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <NeuBadge variant="default" className="mb-4">Accessories</NeuBadge>
            <h2 className="text-4xl font-bold mb-6">
              Complete Your Deployment
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {accessories.map((item) => (
              <NeuCard key={item.name} className="transition-colors">
                <NeuCardContent className="pt-6">
                  <item.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Support & Services */}
      <section className="py-24">
        <div className="container px-4 max-w-6xl mx-auto">
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
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Monitoring Today
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Whether you&apos;re a researcher, conservationist, farmer, or technologist - 
              our devices help you understand the environment like never before.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/devices/mushroom-1">
                <NeuButton variant="primary" className="text-lg px-8 gap-2">
                  Get Mushroom 1
                  <ArrowRight className="h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/natureos">
                <NeuButton variant="default" className="text-lg px-8">
                  Explore NatureOS
                </NeuButton>
              </Link>
            </div>

            <div className="mt-12 pt-12 border-t">
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
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
    </div>
    </NeuromorphicProvider>
  )
}



































