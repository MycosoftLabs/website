import type { Metadata } from "next"
import Link from "next/link"
import { 
  ArrowLeft,
  ArrowRight,
  Radar,
  Microscope,
  Wind,
  AlertTriangle,
  Cpu,
  Radio,
  Battery,
  Wifi,
  Thermometer,
  Droplets,
  Eye,
  Play,
  Download,
  RotateCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Device Specifications - Hardware Technical Details | Mycosoft",
  description: "Detailed technical specifications, 3D renderings, and component breakdowns for all Mycosoft environmental sensing devices.",
}

const devices = [
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    tagline: "Ground-Based Fungal Intelligence Station",
    icon: Radar,
    color: "orange-500",
    dimensions: {
      height: "100 cm",
      width: "30 cm",
      depth: "30 cm",
      weight: "4.5 kg"
    },
    sensors: [
      { name: "Bioelectric Probes", description: "Multi-depth soil probes for mycelial network detection", range: "0.1 μV - 10 mV" },
      { name: "Temperature Array", description: "Distributed temperature sensing at 5 depths", range: "-40°C to +85°C" },
      { name: "Moisture Sensors", description: "Capacitive soil moisture at multiple levels", range: "0-100% VWC" },
      { name: "EC Conductivity", description: "Electrical conductivity for soil health", range: "0-20 dS/m" },
      { name: "pH Sensor", description: "Soil pH measurement (optional)", range: "pH 3-10" },
    ],
    communications: [
      { type: "LoRa", range: "5 km line of sight", power: "20 dBm" },
      { type: "WiFi", range: "100m", power: "802.11 b/g/n" },
      { type: "Bluetooth", range: "10m", power: "BLE 5.0" },
    ],
    power: {
      source: "Solar + LiFePO4 Battery",
      panelWatts: "10W",
      batteryCapacity: "20Ah",
      runtime: "6 months without sun"
    },
    certifications: ["IP67", "FCC Part 15", "CE", "RoHS"],
    processing: "ESP32-S3 with 8MB PSRAM, Edge AI capable"
  },
  {
    id: "myconode",
    name: "MycoNode",
    tagline: "Subsurface Bioelectric Probe",
    icon: Microscope,
    color: "primary",
    dimensions: {
      height: "25 cm (probe)",
      width: "5 cm",
      depth: "5 cm",
      weight: "0.4 kg"
    },
    sensors: [
      { name: "Bioelectric", description: "High-resolution voltage and impedance", range: "0.1 μV resolution" },
      { name: "Temperature", description: "Precision thermistor", range: "-40°C to +85°C ±0.1°C" },
      { name: "Moisture", description: "Capacitive volumetric water content", range: "0-100% VWC ±2%" },
      { name: "EC", description: "Electrical conductivity", range: "0-20 dS/m" },
    ],
    communications: [
      { type: "LoRa", range: "2 km", power: "14 dBm" },
      { type: "I2C", range: "Chain up to 127 nodes", power: "N/A" },
    ],
    power: {
      source: "Internal LiSOCl2 Battery",
      panelWatts: "N/A",
      batteryCapacity: "19Ah",
      runtime: "5+ years at 10 min intervals"
    },
    certifications: ["IP68", "MIL-STD-810G"],
    processing: "STM32L4 Ultra-Low Power MCU"
  },
  {
    id: "sporebase",
    name: "SporeBase",
    tagline: "Bioaerosol Collection System",
    icon: Wind,
    color: "blue-500",
    dimensions: {
      height: "40 cm",
      width: "20 cm",
      depth: "15 cm",
      weight: "2.8 kg"
    },
    sensors: [
      { name: "Air Sampling", description: "Active pump with time-segmented collection", range: "100 L/min" },
      { name: "Particle Counter", description: "Laser-based PM detection", range: "PM1.0/2.5/10" },
      { name: "Temperature", description: "Ambient air temperature", range: "-20°C to +60°C" },
      { name: "Humidity", description: "Relative humidity", range: "0-100% RH ±2%" },
      { name: "Pressure", description: "Barometric pressure", range: "300-1100 hPa" },
    ],
    communications: [
      { type: "Cellular", range: "LTE Cat-M1", power: "Global coverage" },
      { type: "LoRa", range: "1 km", power: "14 dBm" },
      { type: "WiFi", range: "50m", power: "802.11 b/g/n" },
    ],
    power: {
      source: "Solar + Li-ion Battery",
      panelWatts: "5W",
      batteryCapacity: "10Ah",
      runtime: "72 hours without sun"
    },
    certifications: ["IP65", "FCC", "CE"],
    processing: "ESP32-S3 with cellular modem"
  },
  {
    id: "alarm",
    name: "ALARM",
    tagline: "Indoor Environmental Monitor",
    icon: AlertTriangle,
    color: "destructive",
    dimensions: {
      height: "4.5 cm",
      width: "14 cm (diameter)",
      depth: "14 cm",
      weight: "0.128 kg"
    },
    sensors: [
      { name: "Smoke Detection", description: "Dual ionization + photoelectric", range: "0.5-4% obscuration" },
      { name: "CO₂", description: "NDIR carbon dioxide sensor", range: "400-10000 ppm ±30ppm" },
      { name: "VOC", description: "Metal oxide volatile organics", range: "0-500 ppb" },
      { name: "Temperature", description: "Precision thermistor", range: "-10°C to +55°C ±0.3°C" },
      { name: "Humidity", description: "Capacitive RH sensor", range: "0-100% RH ±2%" },
      { name: "Particulate", description: "Laser PM sensor", range: "PM1.0/2.5/10" },
    ],
    communications: [
      { type: "WiFi", range: "30m indoors", power: "802.11 b/g/n" },
      { type: "Bluetooth", range: "10m", power: "BLE 5.0" },
      { type: "LoRa (optional)", range: "500m", power: "14 dBm" },
    ],
    power: {
      source: "AC + Li-ion Backup",
      panelWatts: "N/A",
      batteryCapacity: "2000mAh",
      runtime: "2 months on battery"
    },
    certifications: ["UL 217", "UL 2034", "CE", "FCC"],
    processing: "ESP32-S3 with TinyML inference"
  }
]

export default function SpecificationsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/devices" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Devices
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">Technical Specifications</Badge>
            <h1 className="text-5xl font-bold mb-4">
              Device Specifications
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Detailed technical specifications, sensor capabilities, and system requirements 
              for all Mycosoft environmental sensing devices.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="outline" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Datasheet (PDF)
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Device Tabs */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <Tabs defaultValue="mushroom-1" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl mx-auto mb-12">
              {devices.map((device) => (
                <TabsTrigger key={device.id} value={device.id} className="gap-2">
                  <device.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{device.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {devices.map((device) => (
              <TabsContent key={device.id} value={device.id}>
                <div className="grid lg:grid-cols-2 gap-12">
                  {/* 3D Rendering Placeholder */}
                  <div className={`aspect-square rounded-2xl border overflow-hidden ${
                    device.color === 'primary' ? 'bg-gradient-to-br from-primary/10 to-muted' :
                    device.color === 'blue-500' ? 'bg-gradient-to-br from-blue-500/10 to-muted' :
                    device.color === 'destructive' ? 'bg-gradient-to-br from-destructive/10 to-muted' :
                    'bg-gradient-to-br from-orange-500/10 to-muted'
                  }`}>
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <device.icon className={`h-32 w-32 mb-6 ${
                        device.color === 'primary' ? 'text-primary/30' :
                        device.color === 'blue-500' ? 'text-blue-500/30' :
                        device.color === 'destructive' ? 'text-destructive/30' :
                        'text-orange-500/30'
                      }`} />
                      <div className="text-center">
                        <Badge variant="outline" className="mb-2">
                          <RotateCw className="h-3 w-3 mr-1" />
                          3D Model Coming Soon
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Interactive 3D rendering with exploded view
                        </p>
                      </div>
                      <Button variant="outline" className="mt-4">
                        <Play className="mr-2 h-4 w-4" />
                        View Animation
                      </Button>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">{device.name}</h2>
                      <p className="text-lg text-muted-foreground">{device.tagline}</p>
                    </div>

                    {/* Dimensions */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Physical Dimensions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Height</div>
                            <div className="font-semibold">{device.dimensions.height}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Width</div>
                            <div className="font-semibold">{device.dimensions.width}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Depth</div>
                            <div className="font-semibold">{device.dimensions.depth}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Weight</div>
                            <div className="font-semibold">{device.dimensions.weight}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sensors */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Sensor Array
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {device.sensors.map((sensor) => (
                            <div key={sensor.name} className="flex justify-between items-start border-b border-border/50 pb-2 last:border-0">
                              <div>
                                <div className="font-medium">{sensor.name}</div>
                                <div className="text-sm text-muted-foreground">{sensor.description}</div>
                              </div>
                              <Badge variant="secondary" className="shrink-0 ml-4">{sensor.range}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Communications */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Radio className="h-4 w-4" />
                          Communications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {device.communications.map((comm) => (
                            <div key={comm.type} className="flex justify-between items-center">
                              <div className="font-medium">{comm.type}</div>
                              <div className="text-right">
                                <div className="text-sm">{comm.range}</div>
                                <div className="text-xs text-muted-foreground">{comm.power}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Power */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Battery className="h-4 w-4" />
                          Power System
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Source</div>
                            <div className="font-semibold">{device.power.source}</div>
                          </div>
                          {device.power.panelWatts !== "N/A" && (
                            <div>
                              <div className="text-sm text-muted-foreground">Solar Panel</div>
                              <div className="font-semibold">{device.power.panelWatts}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-muted-foreground">Battery</div>
                            <div className="font-semibold">{device.power.batteryCapacity}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Runtime</div>
                            <div className="font-semibold">{device.power.runtime}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Processing & Certifications */}
                    <div className="flex flex-wrap gap-4">
                      <Card className="flex-1 min-w-[200px]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            Processing
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{device.processing}</p>
                        </CardContent>
                      </Card>
                      <Card className="flex-1 min-w-[200px]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Certifications</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {device.certifications.map((cert) => (
                              <Badge key={cert} variant="outline">{cert}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* CTA */}
                    <div className="flex gap-4">
                      <Button size="lg" asChild>
                        <Link href={`/devices/${device.id}`}>
                          View Full Details
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Wire Diagram Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Technical Diagrams</Badge>
            <h2 className="text-4xl font-bold mb-4">System Architecture</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Detailed wire diagrams and processing pipeline visualizations coming soon.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-8">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="font-semibold mb-2">Processing Pipeline</h3>
                <p className="text-sm text-muted-foreground">
                  See how sensor data flows from collection to analysis.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Radio className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="font-semibold mb-2">Mesh Network Topology</h3>
                <p className="text-sm text-muted-foreground">
                  Understand how devices communicate in the field.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Eye className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="font-semibold mb-2">Internal Components</h3>
                <p className="text-sm text-muted-foreground">
                  Exploded view of sensor arrays and electronics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
