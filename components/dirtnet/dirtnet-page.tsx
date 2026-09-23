"use client"

import Link from "next/link"
import {
  ArrowRight,
  Cpu,
  Database,
  GitBranch,
  Network,
  Radio,
  Satellite,
  Waves,
  Wifi,
} from "lucide-react"
import { ProductIcon } from "@/components/brand/product-icon"
import { DirtNetEarthOrbit } from "@/components/dirtnet/dirtnet-earth-orbit"
import {
  DIRTNET_ORBIT_DEVICES,
  DIRTNET_SYSTEM_LINKS,
} from "@/components/dirtnet/dirtnet-devices"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"

const networkLayers = [
  {
    title: "MDP",
    subtitle: "Mycosoft Device Protocol",
    body: "MDP is the field language for MycoBrain devices. It carries telemetry, commands, status, sensing payloads, and device state from embedded hardware into Mycosoft systems without forcing every node through a cloud round trip.",
    icon: Cpu,
  },
  {
    title: "Mycorrhizae Protocol",
    subtitle: "Mesh-native environmental messaging",
    body: "Mycorrhizae organizes device data, environmental context, commands, and events into a shared schema so NatureOS, MINDEX, MYCA, and field systems can understand the same signals.",
    icon: GitBranch,
  },
  {
    title: "MycoSpeak",
    subtitle: "Device-to-device vocabulary",
    body: "MycoSpeak is the operational vocabulary for devices and agents: compact intents, local instructions, environmental alerts, and structured state across radio, mesh, MQTT, and edge gateways.",
    icon: Radio,
  },
]

const flowSteps = [
  {
    title: "Sense at the edge",
    body: "MycoBrain-powered nodes collect soil, air, water, acoustic, optical, gas, and bioelectric signals where the world is changing.",
    icon: Waves,
  },
  {
    title: "Speak MDP / MycoSpeak",
    body: "Local buses and radios carry structured payloads between devices, relays, and gateways without collapsing into a single cloud dependency.",
    icon: Radio,
  },
  {
    title: "Mesh with Mycorrhizae",
    body: "The Mycorrhizae Protocol keeps environmental context, commands, and events coherent across LoRa, LoRaWAN, Meshtastic, MQTT, Wi-Fi, and cellular paths.",
    icon: Network,
  },
  {
    title: "Preserve in MINDEX & NatureOS",
    body: "Observations land in MINDEX with provenance, then surface in NatureOS, Earth Simulator, and scientific tools as real environmental intelligence.",
    icon: Database,
  },
]

const meshIntegrations = [
  "LoRa for long-range low-power field links",
  "LoRaWAN for managed regional sensor networks",
  "Meshtastic for resilient off-grid mesh participation",
  "MQTT for brokered telemetry and command channels",
  "Wi-Fi, LTE, satellite, and device-to-device relays",
  "MDP-native MycoBrain traffic on Mycosoft-controlled networks",
]

export function DirtNetPage() {
  return (
    <NeuromorphicProvider>
      <main className="product-glass-page launchpad-glass-page min-h-dvh text-foreground">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden border-b border-black/10 py-16 md:py-24 dark:border-white/15">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.7),transparent_42%),radial-gradient(circle_at_88%_0%,rgba(15,23,42,0.06),transparent_36%)] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_36%)]" />
          <div className="container relative z-10 mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-4xl text-center">
              <GlassChip className="mb-5">DIRTNET</GlassChip>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                The decentralized device network for Earth intelligence.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                DirtNet is Mycosoft&apos;s edge fabric: MycoBrain devices, MDP, Mycorrhizae Protocol,
                and MycoSpeak working as one mesh across soil, air, water, and machines. Intelligence
                lives on the nodes first — then flows into NatureOS and MINDEX with real provenance —
                not as a single centralized command brain.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <GlassButton href="/devices" dataAnalytics="dirtnet_hero_devices">
                  Explore devices
                </GlassButton>
                <GlassButton href="/protocols/mycorrhizae" dataAnalytics="dirtnet_hero_mycorrhizae">
                  Mycorrhizae Protocol
                </GlassButton>
                <GlassButton href="#earth-network" dataAnalytics="dirtnet_hero_orbit">
                  See the network
                </GlassButton>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SYSTEM LINKS ================= */}
        <section className="border-b border-black/10 py-14 md:py-16 dark:border-white/15">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-8 max-w-3xl">
              <GlassChip className="mb-4">SENSORS &amp; SYSTEMS</GlassChip>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Real device and protocol surfaces
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every link below is a live Mycosoft route — portfolio pages, protocols, NatureOS, and
                Earth Simulator — not placeholders.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {DIRTNET_SYSTEM_LINKS.map((link) => (
                <Link
                  key={link.href + link.title}
                  href={link.href}
                  className="group flex min-h-[44px] gap-3 rounded-2xl border border-black/10 bg-white/45 p-4 backdrop-blur-xl transition hover:bg-white/70 dark:border-white/15 dark:bg-white/8 dark:hover:bg-white/14"
                >
                  <span className="myco-glass-tile flex h-11 w-11 shrink-0 items-center justify-center">
                    {link.product ? (
                      <ProductIcon
                        product={link.product}
                        variant="glass"
                        className="h-7 w-7"
                        title={link.title}
                      />
                    ) : (
                      <Network className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="flex items-center gap-1 font-semibold">
                      {link.title}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {link.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EARTH ORBIT ================= */}
        <section
          id="earth-network"
          className="border-b border-black/10 py-16 md:py-24 dark:border-white/15"
        >
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <GlassChip className="mb-4">DEVICE NETWORK</GlassChip>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Earth at the center. Devices on the mesh.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Click any ProductIcon around Earth to open a glass detail panel with the real device
                image, what it does, and how it contributes to DirtNet. Earth opens{" "}
                <Link
                  href="/natureos/earth-simulator"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Earth Simulator
                </Link>
                .
              </p>
            </div>
            <DirtNetEarthOrbit />
            <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
              Orbit nodes: {DIRTNET_ORBIT_DEVICES.map((d) => d.name).join(" · ")}
            </p>
          </div>
        </section>

        {/* ================= PROTOCOL STACK ================= */}
        <section className="border-b border-black/10 py-16 md:py-20 dark:border-white/15">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-10 max-w-3xl">
              <GlassChip className="mb-4">NETWORK STACK</GlassChip>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                MDP, MycoSpeak, and Mycorrhizae as one field network
              </h2>
              <p className="mt-4 text-muted-foreground">
                DirtNet is not one radio and not one cloud service. It is a layered network that lets
                Mycosoft devices communicate across local buses, radio links, gateways, mesh routes,
                MQTT, MAS, MINDEX, MYCA, and NatureOS.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {networkLayers.map(({ title, subtitle, body, icon: Icon }) => (
                <article
                  key={title}
                  data-slot="card"
                  className="rounded-2xl border border-black/10 p-6 dark:border-white/15"
                >
                  <div className="myco-glass-tile mb-4 flex h-11 w-11 items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
            <div className="mt-8">
              <GlassButton href="/protocols/mycorrhizae" dataAnalytics="dirtnet_stack_protocol">
                Read Mycorrhizae Protocol
              </GlassButton>
            </div>
          </div>
        </section>

        {/* ================= SENSE → MINDEX FLOW ================= */}
        <section className="border-b border-black/10 py-16 md:py-20 dark:border-white/15">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-10 max-w-3xl">
              <GlassChip className="mb-4">DATA FLOW</GlassChip>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Sensing → mesh → MINDEX &amp; NatureOS
              </h2>
              <p className="mt-4 text-muted-foreground">
                Field signals stay local when they should, then join a shared intelligence surface
                when they need context, search, simulation, or fleet operations.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {flowSteps.map(({ title, body, icon: Icon }, index) => (
                <article
                  key={title}
                  data-slot="card"
                  className="rounded-2xl border border-black/10 p-5 dark:border-white/15"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="myco-glass-tile flex h-10 w-10 items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= MESH ================= */}
        <section className="border-b border-black/10 py-16 md:py-20 dark:border-white/15">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid gap-8 lg:grid-cols-2">
              <article
                data-slot="card"
                className="rounded-2xl border border-black/10 p-6 md:p-8 dark:border-white/15"
              >
                <div className="myco-glass-tile mb-4 flex h-11 w-11 items-center justify-center">
                  <Wifi className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold">Radio and mesh integration</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Built to route through what exists and extend it with Mycosoft-native MDP paths.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {meshIntegrations.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article
                data-slot="card"
                className="rounded-2xl border border-black/10 p-6 md:p-8 dark:border-white/15"
              >
                <div className="myco-glass-tile mb-4 flex h-11 w-11 items-center justify-center">
                  <Satellite className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold">Where DirtNet runs</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  On devices, gateways, mobile nodes, and NatureOS command surfaces.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {DIRTNET_ORBIT_DEVICES.map((device) => (
                    <Link
                      key={device.id}
                      href={device.href}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl border border-black/10 bg-white/35 px-3 py-2 text-sm transition hover:bg-white/60 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <ProductIcon
                        product={device.product}
                        variant="current"
                        className="h-4 w-4"
                      />
                      {device.name}
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ================= CLOSING ================= */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto max-w-7xl px-4">
            <div
              data-slot="card"
              className="rounded-2xl border border-black/10 p-6 md:p-10 dark:border-white/15"
            >
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <GlassChip className="mb-4">EDGE FIRST</GlassChip>
                  <h2 className="text-2xl font-bold md:text-3xl">
                    DirtNet turns the planet into an edge network.
                  </h2>
                  <p className="mt-3 max-w-3xl text-muted-foreground">
                    Centralized platforms wait for data to arrive. DirtNet lets Mycosoft devices
                    sense, infer, communicate, and preserve intelligence where the world is actually
                    changing — then hands coherent context to NatureOS and MINDEX.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <GlassButton href="/natureos" dataAnalytics="dirtnet_footer_natureos">
                    Open NatureOS
                  </GlassButton>
                  <GlassButton href="/devices/mycobrain" dataAnalytics="dirtnet_footer_mycobrain">
                    MycoBrain
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </NeuromorphicProvider>
  )
}
