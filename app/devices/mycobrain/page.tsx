import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Cpu,
  Wifi,
  Bluetooth,
  Radio,
  Thermometer,
  Wind,
  Droplets,
  Activity,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Code,
  GitBranch,
  ExternalLink,
  ChevronRight,
  Leaf,
  Brain,
  CircuitBoard,
  Signal,
} from "lucide-react"

export const metadata: Metadata = {
  title: "MycoBrain | Mycosoft Devices",
  description: "MycoBrain is an edge computing module with dual BME688 sensors for environmental monitoring, IAQ sensing, and biological computing integration.",
}

const features = [
  {
    icon: Thermometer,
    title: "Environmental Sensing",
    description: "Dual BME688 sensors for temperature, humidity, pressure, and gas resistance with BSEC2 AI processing.",
  },
  {
    icon: Wind,
    title: "Air Quality Monitoring",
    description: "Real-time IAQ index, eCO2, bVOC levels, and gas detection for comprehensive environmental awareness.",
  },
  {
    icon: Wifi,
    title: "Multi-Connectivity",
    description: "WiFi, Bluetooth LE, and optional LoRa for flexible deployment in any environment.",
  },
  {
    icon: Brain,
    title: "Edge Computing",
    description: "ESP32-S3 with 8MB PSRAM and 16MB Flash for local processing and machine learning inference.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Hardware encryption, secure boot, and encrypted communication with Mycosoft cloud.",
  },
  {
    icon: Code,
    title: "Developer Friendly",
    description: "Open firmware, REST API, MQTT support, and integration with NatureOS and MYCA.",
  },
]

const specs = [
  { label: "Processor", value: "ESP32-S3 Dual-core 240MHz" },
  { label: "Memory", value: "8MB PSRAM, 16MB Flash" },
  { label: "Sensors", value: "Dual BME688 (Temp, Humidity, Pressure, Gas)" },
  { label: "Connectivity", value: "WiFi 802.11 b/g/n, BLE 5.0" },
  { label: "Power", value: "USB-C, 5V DC, Low-power sleep modes" },
  { label: "Dimensions", value: "60mm x 40mm x 20mm" },
  { label: "Operating Temp", value: "-20°C to +60°C" },
  { label: "Firmware", value: "MDP v1 Protocol, OTA Updates" },
]

const useCases = [
  {
    title: "Smart Cultivation",
    description: "Monitor mushroom growing environments with precise temperature, humidity, and CO2 tracking.",
    icon: Leaf,
  },
  {
    title: "Air Quality Research",
    description: "Deploy sensors for indoor air quality studies and environmental monitoring projects.",
    icon: Wind,
  },
  {
    title: "Biological Computing",
    description: "Interface with fungal networks through the Fungal Computer Interface (FCI) protocol.",
    icon: CircuitBoard,
  },
  {
    title: "IoT Integration",
    description: "Connect to existing smart home and industrial IoT systems via MQTT and REST APIs.",
    icon: Signal,
  },
]

export default function MycobrainPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/50 to-background z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:60px_60px] z-10" />
        
        <div className="container max-w-6xl mx-auto px-6 relative z-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  New
                </Badge>
                <Badge variant="outline">Beta</Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  MycoBrain
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                The brain behind biological monitoring.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                MycoBrain is an edge computing module with dual BME688 sensors for environmental 
                monitoring, air quality sensing, and integration with the Mycosoft biological 
                computing platform. It's the hardware foundation for connecting the digital and 
                natural worlds.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Pre-order Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs/fci-firmware">
                    <Code className="h-4 w-4 mr-2" />
                    View Documentation
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Product Image Placeholder */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                <div className="text-center p-8">
                  <Cpu className="h-24 w-24 text-emerald-500/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Product image coming soon</p>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-background border rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-blue-500" />
                  <Bluetooth className="h-5 w-5 text-blue-400" />
                  <Radio className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-1">2</div>
              <div className="text-sm text-muted-foreground">BME688 Sensors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-1">8MB</div>
              <div className="text-sm text-muted-foreground">PSRAM</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-1">240MHz</div>
              <div className="text-sm text-muted-foreground">Dual Core</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-1">OTA</div>
              <div className="text-sm text-muted-foreground">Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Environmental Intelligence
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              MycoBrain combines precision sensors, edge computing, and seamless connectivity 
              into a compact, developer-friendly package.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="p-2 rounded-lg bg-emerald-500/10 w-fit mb-2">
                    <feature.icon className="h-5 w-5 text-emerald-500" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Specifications</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Technical Details</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {specs.map((spec, index) => (
                  <div 
                    key={spec.label}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Use Cases</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Diverse Applications</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From mushroom cultivation to scientific research, MycoBrain adapts to your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <useCase.icon className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{useCase.title}</CardTitle>
                      <CardDescription className="text-base">{useCase.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Integration</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Seamless Platform Integration
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                MycoBrain connects directly to the Mycosoft ecosystem. Stream data to NatureOS, 
                query MINDEX for species identification, or let MYCA AI analyze your environmental 
                patterns. Everything works together.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Direct integration with NatureOS dashboard",
                  "MINDEX database queries from the device",
                  "MYCA AI environmental analysis",
                  "Fungal Computer Interface (FCI) protocol support",
                  "Open REST API and MQTT endpoints",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" asChild>
                  <Link href="/natureos" className="gap-2">
                    Explore NatureOS <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/devices/mycobrain/integration/fci" className="gap-2">
                    FCI Protocol <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center hover:border-emerald-500/50 transition-colors">
                <Brain className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">NatureOS</h3>
                <p className="text-sm text-muted-foreground">Dashboard & Control</p>
              </Card>
              <Card className="p-6 text-center hover:border-blue-500/50 transition-colors">
                <Activity className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">MINDEX</h3>
                <p className="text-sm text-muted-foreground">Species Database</p>
              </Card>
              <Card className="p-6 text-center hover:border-purple-500/50 transition-colors">
                <Zap className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">MYCA AI</h3>
                <p className="text-sm text-muted-foreground">Intelligent Analysis</p>
              </Card>
              <Card className="p-6 text-center hover:border-amber-500/50 transition-colors">
                <CircuitBoard className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">FCI</h3>
                <p className="text-sm text-muted-foreground">Bio Computing</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <Cpu className="h-12 w-12 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the beta program and be among the first to experience MycoBrain. 
            Pre-orders ship in Q2 2026.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              Pre-order MycoBrain
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs/fci-firmware">View Firmware Docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
