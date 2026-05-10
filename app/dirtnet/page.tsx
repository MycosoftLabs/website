import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Brain,
  Cpu,
  Database,
  GitBranch,
  Network,
  Radio,
  Satellite,
  Server,
  Shield,
  Waves,
  Wifi,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "DirtNet | Mycosoft",
  description:
    "DirtNet is Mycosoft's decentralized edge network for MycoBrain devices, MDP, Mycorrhizae Protocol, MycoSpeak, LoRa, LoRaWAN, and Meshtastic.",
}

const networkLayers = [
  {
    title: "MDP",
    subtitle: "Mycosoft Device Protocol",
    body:
      "MDP is the field language for MycoBrain devices. It carries telemetry, commands, status, sensing payloads, and device state from embedded hardware into Mycosoft systems without forcing every node to depend on a cloud round trip.",
    icon: Cpu,
  },
  {
    title: "Mycorrhizae Protocol",
    subtitle: "Mesh-native environmental messaging",
    body:
      "The Mycorrhizae Protocol organizes device data, environmental context, commands, and events into a shared schema so NatureOS, MINDEX, MYCA, FUSARIUM, and field systems can understand the same signals.",
    icon: GitBranch,
  },
  {
    title: "MycoSpeak",
    subtitle: "The device-to-device language layer",
    body:
      "MycoSpeak is the operational vocabulary for devices and agents: compact intents, local instructions, environmental alerts, and structured state that can move across radio, mesh, MQTT, and edge gateways.",
    icon: Radio,
  },
]

const edgePillars = [
  { title: "Decentralized AI", body: "Agents reason locally first, then coordinate upward only when needed.", icon: Brain },
  { title: "Decentralized Devices", body: "Every MycoBrain-powered node can sense, speak, relay, and act at the edge.", icon: Network },
  { title: "Decentralized Inference", body: "Jetson, TPU, MCU, and accelerator nodes run models where the signal is created.", icon: Server },
  { title: "Decentralized Data", body: "MINDEX preserves field data with context, provenance, and integrity instead of trapping it in one silo.", icon: Database },
]

const integrations = [
  "LoRa for long-range low-power field links",
  "LoRaWAN for managed regional sensor networks",
  "Meshtastic for resilient off-grid mesh participation",
  "MQTT for brokered telemetry and command channels",
  "Wi-Fi, LTE, satellite, and device-to-device relays",
  "MDP-native MycoBrain traffic over Mycosoft-controlled networks",
]

const sensingSystems = [
  {
    name: "BlueSight",
    body:
      "Fungi-aware blue-light sensing for biological response work, pairing optical stimulation, response tracking, and environmental context.",
  },
  {
    name: "SINE",
    body:
      "Acoustic sensing and communication using hydrophones, transducers, MEMS microphones, and acoustic comms protocols for marine life, birds, propellers, explosions, human sounds, and recorded sound libraries.",
  },
  {
    name: "GANDHA",
    body:
      "Smell and gas intelligence using VOC, VSC, BME690, BME688, BME680, Bosch smell-blob training workflows, and BMV080 particle counters.",
  },
  {
    name: "Spatial Sensing",
    body:
      "LiDAR, radar, WiFiSense, 8K 360 camera coverage, and 4K directional cameras turn movement, geometry, presence, and scene context into field data.",
  },
  {
    name: "Fungi Compute + FCI",
    body:
      "Fungal Computer Interface probes and fungi-compute experiments bring bioelectric and biological signals into the same device fabric as conventional sensors.",
  },
]

export default function DirtNetPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(239,68,68,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.72))] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.2),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(239,68,68,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,8,0.96),rgba(2,6,8,0.84))]" />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-4xl">
            <Badge variant="outline" className="mb-5">DirtNet</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              The anti-SkyNet for Earth intelligence.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              DirtNet is Mycosoft&apos;s decentralized edge network: AI, devices, inference, and data distributed through soil, air, water, machines, and field nodes instead of trapped inside one centralized data center.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/devices/mycobrain">
                  MycoBrain Devices <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/protocols/mycorrhizae">Mycorrhizae Protocol</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="mb-10 max-w-3xl">
          <Badge variant="outline" className="mb-4">Network Stack</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">MDP, MycoSpeak, and Mycorrhizae working as one field network</h2>
          <p className="mt-4 text-muted-foreground">
            DirtNet is not one radio and not one cloud service. It is a layered network that lets Mycosoft devices communicate across local buses, radio links, gateways, mesh routes, MQTT, MAS, MINDEX, MYCA, NatureOS, and FUSARIUM.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {networkLayers.map(({ title, subtitle, body, icon: Icon }) => (
            <Card key={title} className="bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
                  <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">{body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="outline" className="mb-4">Edge First</Badge>
              <h2 className="text-3xl font-bold md:text-4xl">The opposite of a central machine brain</h2>
              <p className="mt-4 text-muted-foreground">
                Movie-style SkyNet imagines intelligence collapsing into a centralized command system. DirtNet moves the other way: intelligence lives across local devices, local inference, local memory, and local networks that can keep operating when the cloud is slow, denied, or unavailable.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {edgePillars.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-xl border border-border bg-background/75 p-5 backdrop-blur">
                  <Icon className="mb-4 h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
                <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Radio and mesh integration</CardTitle>
              <CardDescription>Built to route through what exists and extend it with Mycosoft-native MDP paths.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {integrations.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
                <Satellite className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Where DirtNet runs</CardTitle>
              <CardDescription>On devices, gateways, mobile nodes, and command surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {["MycoBrain boards", "Jetson edge compute", "AGARIC aerial relays", "Psathyrella buoy systems", "Hyphae 1 exterior datacenters", "Mushroom 1 field droids", "SporeBase aerosol nodes", "NatureOS and FUSARIUM"].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-muted/40 px-3 py-2">{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-black text-white">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="mb-10 max-w-3xl">
            <Badge variant="outline" className="mb-4 border-white/25 text-white">Sensing Packages</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">DirtNet carries more than telemetry</h2>
            <p className="mt-4 text-white/70">
              It moves biological, acoustic, optical, spatial, radio, particle, and gas signals from field sensors into edge inference and Mycosoft intelligence systems.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {sensingSystems.map((system) => (
              <div key={system.name} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Waves className="h-5 w-5 text-green-300" />
                </div>
                <h3 className="font-semibold">{system.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/68">{system.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">DirtNet turns the planet into an edge network.</h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                Centralized platforms wait for data to arrive. DirtNet lets Mycosoft devices sense, infer, communicate, and preserve intelligence where the world is actually changing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/natureos">Open NatureOS</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/defense/fusarium">FUSARIUM</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
