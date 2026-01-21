"use client"

import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const devices = [
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    tagline: "Ground-Based Fungal Intelligence Station",
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
    tagline: "Bioaerosol Collection System",
    description: "The world's most advanced bioaerosol collector. Time-indexed spore capture for research and atmospheric monitoring.",
    icon: Wind,
    color: "orange-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SporeBase%20%20website-HFUWL3s1Ga7G7AZOnbrzy2YQoahLYu.png",
    status: "In Stock",
    price: "$299",
    specs: [
      { label: "Collection Rate", value: "100L/min" },
      { label: "Sample Slots", value: "24 time-indexed" },
      { label: "Filter Efficiency", value: "99.7% @ 0.3μm" },
      { label: "Power", value: "Solar/Battery" },
      { label: "Connectivity", value: "LTE, LoRa, WiFi" },
      { label: "Weather Rating", value: "IP65" }
    ],
    features: [
      "Active sampling pump",
      "Time-segmented collection",
      "Lab-ready sample output",
      "Environmental metadata logging",
      "Weather-resistant enclosure",
      "Remote configuration"
    ],
    applications: [
      "Mycology research",
      "Allergy forecasting",
      "Agriculture disease warning",
      "Air quality monitoring"
    ]
  },
  {
    id: "hyphae-1",
    name: "Hyphae 1",
    tagline: "Modular I/O Platform",
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
    image: "/placeholder.svg?height=600&width=800&text=MycoNode",
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8884_1px,transparent_1px),linear-gradient(to_bottom,#8884_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container max-w-7xl mx-auto relative z-10 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge className="mb-4">Hardware Platform</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
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

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="https://www.youtube.com/@mycosoft" target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Videos
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/devices/specifications">
                  View Specifications
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Device Selection Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedDevice.id === device.id 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <CardContent className="pt-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${
                      device.color === 'emerald-500' ? 'bg-emerald-500/10' :
                      device.color === 'orange-500' ? 'bg-orange-500/10' :
                      device.color === 'slate-500' ? 'bg-slate-500/10' :
                      device.color === 'purple-500' ? 'bg-purple-500/10' :
                      device.color === 'red-500' ? 'bg-red-500/10' :
                      'bg-primary/10'
                    }`}>
                      <device.icon className={`h-6 w-6 ${
                        device.color === 'emerald-500' ? 'text-emerald-500' :
                        device.color === 'orange-500' ? 'text-orange-500' :
                        device.color === 'slate-500' ? 'text-slate-500' :
                        device.color === 'purple-500' ? 'text-purple-500' :
                        device.color === 'red-500' ? 'text-red-500' :
                        'text-primary'
                      }`} />
                    </div>
                    <h3 className="font-bold text-lg">{device.name}</h3>
                    <p className="text-sm text-muted-foreground">{device.tagline}</p>
                    <Badge variant="outline" className="mt-3 text-xs">
                      {device.status}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Selected Device Detail */}
          <motion.div
            key={selectedDevice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-12"
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
                <Badge className="mb-4">{selectedDevice.status}</Badge>
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
              <div className="flex gap-4">
                <Button size="lg" asChild>
                  <a href="https://www.youtube.com/@mycosoft" target="_blank" rel="noopener noreferrer">
                    <Play className="mr-2 h-5 w-5" />
                    Learn More
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/devices/${selectedDevice.id}`}>
                    Full Details
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="py-24">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Nature First Technology</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Giving Nature a Voice
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our devices put technology in nature 24/7, collecting live data 
              and providing early warning detection capabilities to everyone on the planet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
              <Card key={app.title} className="text-center hover:border-primary/50 transition-colors">
                <CardContent className="pt-8">
                  <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-4">
                    <app.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{app.title}</h3>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Accessories Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Accessories</Badge>
            <h2 className="text-4xl font-bold mb-6">
              Complete Your Deployment
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {accessories.map((item) => (
              <Card key={item.name} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <item.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support & Services */}
      <section className="py-24">
        <div className="container px-4 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
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
              <Card key={service.title}>
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
              </Card>
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
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href="/devices/mushroom-1">
                  Get Mushroom 1
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link href="/natureos">
                  Explore NatureOS
                </Link>
              </Button>
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
  )
}


































