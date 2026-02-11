import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Code,
  Cpu,
  Download,
  GitBranch,
  Terminal,
  BookOpen,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Zap,
  Shield,
  Wifi,
  Radio,
  Settings,
  FileCode,
  Package,
  AlertCircle,
  CheckCircle,
  Copy,
  Layers,
} from "lucide-react"

export const metadata: Metadata = {
  title: "FCI Firmware Documentation | Mycosoft",
  description: "Technical documentation for the Fungal Computer Interface (FCI) firmware. Learn how to flash, configure, and develop with MycoBrain devices.",
}

const quickLinks = [
  {
    title: "Getting Started",
    description: "Install tools and flash your first firmware",
    href: "#getting-started",
    icon: Zap,
  },
  {
    title: "API Reference",
    description: "REST endpoints and MQTT topics",
    href: "#api-reference",
    icon: Code,
  },
  {
    title: "FCI Protocol",
    description: "Fungal Computer Interface specification",
    href: "#fci-protocol",
    icon: Radio,
  },
  {
    title: "Troubleshooting",
    description: "Common issues and solutions",
    href: "#troubleshooting",
    icon: AlertCircle,
  },
]

const firmwareVersions = [
  {
    version: "v2.1.0",
    date: "Feb 8, 2026",
    status: "stable",
    changes: ["Added FCI v2 protocol support", "Improved BSEC2 calibration", "Fixed WiFi reconnection bug"],
  },
  {
    version: "v2.0.1",
    date: "Jan 25, 2026",
    status: "stable",
    changes: ["Security patches", "Memory optimization"],
  },
  {
    version: "v2.0.0",
    date: "Jan 10, 2026",
    status: "deprecated",
    changes: ["Major rewrite with MDP v1 protocol", "Dual BME688 support"],
  },
]

const codeExamples = {
  flashCommand: `# Install PlatformIO CLI
pip install platformio

# Clone the firmware repository
git clone https://github.com/mycosoft/mycobrain-firmware.git
cd mycobrain-firmware

# Build and upload
pio run -t upload`,

  apiExample: `// Get current sensor readings
const response = await fetch('http://mycobrain.local/api/sensors');
const data = await response.json();

console.log(data);
// {
//   temperature: 23.5,
//   humidity: 65.2,
//   pressure: 1013.25,
//   iaq: 42,
//   eco2: 450,
//   bvoc: 0.5
// }`,

  mqttExample: `# Subscribe to sensor data
mosquitto_sub -h mycobrain.local -t "mycobrain/+/sensors"

# Publish configuration
mosquitto_pub -h mycobrain.local -t "mycobrain/config" \\
  -m '{"sample_rate": 5000}'`,

  fciProtocol: `// FCI Signal Structure
interface FCISignal {
  timestamp: number;      // Unix timestamp
  channel: number;        // ADC channel (0-3)
  value: number;          // Raw ADC value (0-4095)
  voltage: number;        // Calculated voltage
  impedance: number;      // Calculated impedance
  fft: number[];          // FFT bins (optional)
}

// Example FCI data packet
{
  "type": "fci_signal",
  "device_id": "MB-001",
  "signals": [
    { "channel": 0, "value": 2048, "voltage": 1.65, "impedance": 12500 },
    { "channel": 1, "value": 1876, "voltage": 1.52, "impedance": 14200 }
  ]
}`,
}

export default function FCIFirmwareDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-16 md:py-20 border-b overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 to-background z-0" />
        <div className="container max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/devices/mycobrain" className="hover:text-foreground">MycoBrain</Link>
            <ChevronRight className="h-4 w-4" />
            <span>FCI Firmware</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  v2.1.0
                </Badge>
                <Badge variant="outline">Stable</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                FCI Firmware Documentation
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Technical documentation for the Fungal Computer Interface firmware. 
                Learn how to flash, configure, and develop with MycoBrain devices.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://github.com/mycosoft/mycobrain-firmware" target="_blank" rel="noopener noreferrer">
                  <GitBranch className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Download className="h-4 w-4" />
                Download v2.1.0
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 border-b bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <a key={link.title} href={link.href}>
                <Card className="h-full hover:border-emerald-500/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <link.icon className="h-5 w-5 text-emerald-500 mb-2" />
                    <CardTitle className="text-base">{link.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <p className="font-semibold mb-3">On This Page</p>
              {[
                { label: "Getting Started", href: "#getting-started" },
                { label: "Prerequisites", href: "#prerequisites" },
                { label: "Installation", href: "#installation" },
                { label: "API Reference", href: "#api-reference" },
                { label: "REST API", href: "#rest-api" },
                { label: "MQTT Topics", href: "#mqtt" },
                { label: "FCI Protocol", href: "#fci-protocol" },
                { label: "Signal Structure", href: "#signal-structure" },
                { label: "Firmware Versions", href: "#versions" },
                { label: "Troubleshooting", href: "#troubleshooting" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3 space-y-16">
            {/* Getting Started */}
            <section id="getting-started">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Zap className="h-8 w-8 text-emerald-500" />
                Getting Started
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                This guide will walk you through setting up your development environment 
                and flashing the FCI firmware to your MycoBrain device.
              </p>

              <h3 id="prerequisites" className="text-xl font-semibold mb-4">Prerequisites</h3>
              <ul className="space-y-2 mb-8">
                {[
                  "MycoBrain V1 or V2 hardware",
                  "USB-C cable for flashing",
                  "Python 3.8+ installed",
                  "PlatformIO CLI or VS Code with PlatformIO extension",
                  "Git for cloning the repository",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h3 id="installation" className="text-xl font-semibold mb-4">Installation</h3>
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Terminal</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-emerald-400 overflow-x-auto">
                    <code>{codeExamples.flashCommand}</code>
                  </pre>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* API Reference */}
            <section id="api-reference">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Code className="h-8 w-8 text-emerald-500" />
                API Reference
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                MycoBrain exposes a REST API for querying sensor data and configuring the device, 
                as well as MQTT topics for real-time data streaming.
              </p>

              <h3 id="rest-api" className="text-xl font-semibold mb-4">REST API</h3>
              <Card className="mb-8">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { method: "GET", path: "/api/sensors", description: "Get current sensor readings" },
                      { method: "GET", path: "/api/config", description: "Get device configuration" },
                      { method: "POST", path: "/api/config", description: "Update device configuration" },
                      { method: "GET", path: "/api/fci/signals", description: "Get FCI signal data" },
                      { method: "POST", path: "/api/fci/calibrate", description: "Start FCI calibration" },
                      { method: "GET", path: "/api/status", description: "Get device status and health" },
                    ].map((endpoint) => (
                      <div key={endpoint.path} className="flex items-center gap-4 p-4">
                        <Badge 
                          variant="secondary"
                          className={endpoint.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                        <span className="text-sm text-muted-foreground ml-auto">{endpoint.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <h4 className="font-semibold mb-3">Example: Get Sensor Data</h4>
              <Card className="bg-slate-950 border-slate-800 mb-8">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">JavaScript</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-emerald-400 overflow-x-auto">
                    <code>{codeExamples.apiExample}</code>
                  </pre>
                </CardContent>
              </Card>

              <h3 id="mqtt" className="text-xl font-semibold mb-4">MQTT Topics</h3>
              <Card className="mb-4">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { topic: "mycobrain/{device_id}/sensors", type: "Publish", description: "Real-time sensor data" },
                      { topic: "mycobrain/{device_id}/fci", type: "Publish", description: "FCI signal data" },
                      { topic: "mycobrain/{device_id}/status", type: "Publish", description: "Device status updates" },
                      { topic: "mycobrain/config", type: "Subscribe", description: "Configuration commands" },
                    ].map((item) => (
                      <div key={item.topic} className="flex items-center gap-4 p-4">
                        <Badge 
                          variant="secondary"
                          className={item.type === "Publish" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"}
                        >
                          {item.type}
                        </Badge>
                        <code className="text-sm font-mono">{item.topic}</code>
                        <span className="text-sm text-muted-foreground ml-auto">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">MQTT Examples</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-emerald-400 overflow-x-auto">
                    <code>{codeExamples.mqttExample}</code>
                  </pre>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* FCI Protocol */}
            <section id="fci-protocol">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Radio className="h-8 w-8 text-emerald-500" />
                FCI Protocol
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The Fungal Computer Interface (FCI) protocol defines how biological signals from 
                mycelium networks are captured, processed, and transmitted. FCI v2 introduces 
                improved signal processing and multi-channel support.
              </p>

              <h3 id="signal-structure" className="text-xl font-semibold mb-4">Signal Structure</h3>
              <Card className="bg-slate-950 border-slate-800 mb-8">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">TypeScript / JSON</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-emerald-400 overflow-x-auto">
                    <code>{codeExamples.fciProtocol}</code>
                  </pre>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-500" />
                    Learn More About FCI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    For a complete guide to the FCI protocol, including signal interpretation, 
                    calibration procedures, and integration examples, see the full specification.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/devices/mycobrain/integration/fci" className="gap-2">
                      FCI Protocol Specification <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Firmware Versions */}
            <section id="versions">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Package className="h-8 w-8 text-emerald-500" />
                Firmware Versions
              </h2>
              <div className="space-y-4">
                {firmwareVersions.map((version) => (
                  <Card key={version.version}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle>{version.version}</CardTitle>
                          <Badge 
                            variant="secondary"
                            className={
                              version.status === "stable" 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : "bg-slate-500/20 text-slate-400"
                            }
                          >
                            {version.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{version.date}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {version.changes.map((change) => (
                          <li key={change} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Troubleshooting */}
            <section id="troubleshooting">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-emerald-500" />
                Troubleshooting
              </h2>
              <div className="space-y-4">
                {[
                  {
                    problem: "Device not detected when connected via USB",
                    solution: "Install the CP2102 USB driver. On Windows, check Device Manager for COM port assignment. On macOS/Linux, check /dev/tty* for the device.",
                  },
                  {
                    problem: "Firmware upload fails with timeout error",
                    solution: "Hold the BOOT button while pressing RESET to enter bootloader mode. Release BOOT after the upload starts.",
                  },
                  {
                    problem: "WiFi connection keeps dropping",
                    solution: "Check signal strength and ensure the device is within range. Update to the latest firmware which includes improved WiFi reconnection logic.",
                  },
                  {
                    problem: "Sensor readings seem incorrect",
                    solution: "Allow 30 minutes for BSEC2 calibration after power-on. Ensure sensors are not exposed to direct sunlight or extreme temperatures.",
                  },
                ].map((item, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg text-red-400">{item.problem}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.solution}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="mt-8 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
                <CardHeader>
                  <CardTitle>Still Having Issues?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Check our support center for more troubleshooting guides, or reach out to the community.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" asChild>
                      <Link href="/support">Support Center</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="https://github.com/mycosoft/mycobrain-firmware/issues" target="_blank" rel="noopener noreferrer">
                        GitHub Issues <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
