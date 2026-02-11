import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  Brain, 
  Cable, 
  Database, 
  Waves,
  Zap,
  GitBranch,
  AlertTriangle,
  Leaf,
  Target
} from "lucide-react"

export const metadata: Metadata = {
  title: "FCI Integration - Fungal Computer Interface | Mycosoft",
  description: "Connect MycoBrain to the Fungal Computer Interface (FCI) for bioelectric signal acquisition from mycelium networks",
}

// ============================================================================
// GFST PATTERN REFERENCE
// ============================================================================

const GFST_PATTERNS = [
  {
    name: "Baseline/Resting",
    frequency: "0.1-0.5 Hz",
    amplitude: "0.1-0.5 mV",
    description: "Normal metabolic activity with minimal external stimulation",
    category: "metabolic",
    color: "#6B7280",
  },
  {
    name: "Active Growth",
    frequency: "0.5-2.0 Hz",
    amplitude: "0.5-2.0 mV",
    description: "Nutrient uptake and hyphal extension phase",
    category: "metabolic",
    color: "#22C55E",
  },
  {
    name: "Nutrient Seeking",
    frequency: "1.0-5.0 Hz",
    amplitude: "1.0-3.0 mV",
    description: "Increased frequency during active foraging",
    category: "metabolic",
    color: "#06B6D4",
  },
  {
    name: "Temperature Stress",
    frequency: "0.2-1.0 Hz",
    amplitude: "1.0-5.0 mV",
    description: "Response to thermal changes outside optimal range",
    category: "environmental",
    color: "#F97316",
  },
  {
    name: "Moisture Stress",
    frequency: "0.5-3.0 Hz",
    amplitude: "1.0-4.0 mV",
    description: "Drought or waterlogging response patterns",
    category: "environmental",
    color: "#EAB308",
  },
  {
    name: "Chemical Stress",
    frequency: "2.0-10.0 Hz",
    amplitude: "2.0-8.0 mV",
    description: "Toxin, pollutant, or pH imbalance detection",
    category: "environmental",
    color: "#EF4444",
  },
  {
    name: "Network Communication",
    frequency: "0.1-1.0 Hz",
    amplitude: "0.5-2.0 mV",
    description: "Long-range signaling between mycelial colonies",
    category: "communication",
    color: "#A855F7",
  },
  {
    name: "Action Potential",
    frequency: "5.0-20.0 Hz",
    amplitude: "5.0-20.0 mV",
    description: "Rapid spike signals, fast propagation",
    category: "communication",
    color: "#EC4899",
  },
  {
    name: "Seismic Precursor",
    frequency: "0.01-0.1 Hz",
    amplitude: "0.2-1.0 mV",
    description: "Ultra-low frequency preceding geological events",
    category: "predictive",
    color: "#3B82F6",
  },
  {
    name: "Defense Activation",
    frequency: "2.0-8.0 Hz",
    amplitude: "2.0-6.0 mV",
    description: "Pathogen or predator detection response",
    category: "defensive",
    color: "#DC2626",
  },
  {
    name: "Sporulation Initiation",
    frequency: "0.5-2.0 Hz",
    amplitude: "1.0-3.0 mV",
    description: "Pre-reproductive signaling cascade",
    category: "reproductive",
    color: "#F59E0B",
  },
]

export default function FCIIntegrationPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Brain className="h-10 w-10 text-purple-500" />
          Fungal Computer Interface (FCI)
        </h1>
        <p className="text-xl text-muted-foreground">
          Transform MycoBrain into a bio-computational sensor that reads and interprets
          mycelium bioelectric signals using the Mycorrhizae Protocol and GFST pattern library.
        </p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <Badge variant="outline" className="border-purple-500 text-purple-400">FCI Peripheral</Badge>
        <Badge variant="outline">ADS1115 ADC</Badge>
        <Badge variant="outline">Bioelectric Signals</Badge>
        <Badge variant="outline">GFST Patterns</Badge>
        <Badge variant="outline">Mycorrhizae Protocol</Badge>
        <Badge variant="outline">HPL Integration</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="patterns">GFST Patterns</TabsTrigger>
          <TabsTrigger value="protocol">Protocol</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-gradient-to-br from-purple-950/20 to-slate-900 border-purple-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                What is FCI?
              </CardTitle>
              <CardDescription>
                Two-way communication with living fungal networks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The Fungal Computer Interface (FCI) is a bioelectric signal acquisition and 
                interpretation system that connects to mycelium networks. Unlike conventional 
                sensors that only measure environmental parameters, FCI reads the electrical 
                activity of the fungi themselves—treating mycelium as living sensors and 
                computational substrates.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <Cable className="h-8 w-8 text-cyan-400 mb-3" />
                    <h4 className="font-semibold mb-2">Read Bioelectric Signals</h4>
                    <p className="text-sm text-muted-foreground">
                      0.1–100 Hz, µV to mV range bioelectric potentials from mycelium
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <Brain className="h-8 w-8 text-purple-400 mb-3" />
                    <h4 className="font-semibold mb-2">Interpret Patterns</h4>
                    <p className="text-sm text-muted-foreground">
                      GFST pattern library classifies growth, stress, communication states
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <Zap className="h-8 w-8 text-yellow-400 mb-3" />
                    <h4 className="font-semibold mb-2">Stimulate Response</h4>
                    <p className="text-sm text-muted-foreground">
                      Bi-directional interface can apply electrical stimuli to mycelium
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/crep">
                    <Waves className="mr-2 h-4 w-4" />
                    CREP Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/devices/mycobrain/integration/mindex">
                    <Database className="mr-2 h-4 w-4" />
                    MINDEX Storage
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/protocols/mycorrhizae">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Mycorrhizae Protocol
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hardware Tab */}
        <TabsContent value="hardware" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>FCI Hardware Components</CardTitle>
              <CardDescription>Required hardware for bioelectric signal acquisition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Core Components</h4>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">ADC</Badge>
                      <span>ADS1115 16-bit differential ADC (860 SPS, ±6.144V range)</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">MCU</Badge>
                      <span>MycoBrain ESP32-S3 (dual-core, 240 MHz, WiFi/BLE)</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">ENV</Badge>
                      <span>BME688 for temperature, humidity, pressure, VOC correlation</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">DAC</Badge>
                      <span>ESP32 DAC for bi-directional stimulation output</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Probe Types</h4>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <Badge className="bg-orange-600 shrink-0">Type A</Badge>
                      <span>Copper-steel differential with agar interface</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge className="bg-gray-500 shrink-0">Type B</Badge>
                      <span>Silver/Silver-chloride reference electrode</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge className="bg-gray-400 shrink-0">Type C</Badge>
                      <span>Platinum-iridium high-precision probes</span>
                    </li>
                    <li className="flex gap-3">
                      <Badge className="bg-gray-700 shrink-0">Type D</Badge>
                      <span>Carbon fiber for minimal galvanic interference</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Signal Characteristics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Frequency Range</p>
                    <p className="font-mono text-cyan-400">0.01 – 100 Hz</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amplitude Range</p>
                    <p className="font-mono text-cyan-400">10 µV – 50 mV</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sample Rate</p>
                    <p className="font-mono text-cyan-400">128 Hz</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Electrode Impedance</p>
                    <p className="font-mono text-cyan-400">1 – 100 kΩ</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GFST Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-400" />
                GFST Pattern Library
              </CardTitle>
              <CardDescription>
                Global Fungi Symbiosis Theory patterns for biological signal interpretation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GFST_PATTERNS.map((pattern) => (
                  <Card 
                    key={pattern.name} 
                    className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{pattern.name}</h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: pattern.color, color: pattern.color }}
                        >
                          {pattern.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {pattern.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Frequency:</span>
                          <p className="font-mono text-cyan-400">{pattern.frequency}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amplitude:</span>
                          <p className="font-mono text-cyan-400">{pattern.amplitude}</p>
                        </div>
                      </div>
                      <div 
                        className="w-full h-1 mt-3 rounded-full"
                        style={{ backgroundColor: pattern.color }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Tab */}
        <TabsContent value="protocol" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-purple-400" />
                Mycorrhizae Protocol
              </CardTitle>
              <CardDescription>
                Novel biological computing communication protocol for FCI data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                The Mycorrhizae Protocol is a first-of-its-kind biological computing protocol
                that translates raw bioelectric signals into semantically meaningful interpretations.
                Unlike conventional IoT protocols, it understands the biological context of fungal signals.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Protocol Layers</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <Target className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Semantic Layer</strong>: GFST pattern interpretation</span>
                    </li>
                    <li className="flex gap-2">
                      <Target className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Signal Layer</strong>: DSP, FFT, feature extraction</span>
                    </li>
                    <li className="flex gap-2">
                      <Target className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Transport Layer</strong>: WebSocket, MQTT, CoAP</span>
                    </li>
                    <li className="flex gap-2">
                      <Target className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Physical Layer</strong>: FCI probes, electrodes</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Message Types</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <Activity className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>fci_telemetry</strong>: Raw signal + features</span>
                    </li>
                    <li className="flex gap-2">
                      <Brain className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>pattern_event</strong>: Detected GFST pattern</span>
                    </li>
                    <li className="flex gap-2">
                      <Zap className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <span><strong>stimulus_command</strong>: Bi-directional control</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-800 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Example Envelope</h4>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "version": "1.0.0",
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-10T12:34:56.789Z",
  "source": {
    "device_id": "mycobrain-001",
    "type": "fci_peripheral",
    "probe_type": "copper_steel_agar"
  },
  "payload_type": "pattern_event",
  "payload": {
    "pattern_name": "active_growth",
    "confidence": 0.87,
    "semantic": {
      "meaning": "Nutrient uptake active",
      "implications": ["Healthy mycelium"],
      "actions": ["Continue monitoring"]
    }
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Steps</CardTitle>
              <CardDescription>
                Connect FCI to the Mycosoft ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ol className="space-y-4 text-muted-foreground">
                <li className="flex gap-4">
                  <Badge className="bg-purple-600 shrink-0">1</Badge>
                  <div>
                    <strong className="text-foreground">Flash FCI Firmware</strong>
                    <p className="text-sm">Upload MycoBrain_FCI firmware via PlatformIO</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge className="bg-purple-600 shrink-0">2</Badge>
                  <div>
                    <strong className="text-foreground">Connect Probes</strong>
                    <p className="text-sm">Wire ADS1115 differential inputs to electrode pair</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge className="bg-purple-600 shrink-0">3</Badge>
                  <div>
                    <strong className="text-foreground">Configure WiFi</strong>
                    <p className="text-sm">Set SSID, password, and Mycorrhizae WebSocket URL</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge className="bg-purple-600 shrink-0">4</Badge>
                  <div>
                    <strong className="text-foreground">Register Device</strong>
                    <p className="text-sm">POST to /api/fci/devices to register in MINDEX</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge className="bg-purple-600 shrink-0">5</Badge>
                  <div>
                    <strong className="text-foreground">Monitor in CREP</strong>
                    <p className="text-sm">View live signals and patterns in CREP dashboard</p>
                  </div>
                </li>
              </ol>

              <div className="flex gap-3 mt-6">
                <Button asChild>
                  <Link href="/crep">
                    Open CREP Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/docs/fci-firmware">
                    Firmware Documentation
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
