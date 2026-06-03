import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronRight,
  CircuitBoard,
  Code,
  Cpu,
  GitBranch,
  Leaf,
  Shield,
  Signal,
  Wifi,
  Wind,
} from "lucide-react"
import { MycobrainSensorFabricBackground } from "@/components/devices/mycobrain-sensor-fabric-background"
import { MycobrainV2BoardBackground } from "@/components/devices/mycobrain-v2-board-background"
import { MycobrainFleetBackground } from "@/components/devices/mycobrain-fleet-background"

export const metadata: Metadata = {
  title: "MycoBrain | Mycosoft Devices",
  description:
    "MycoBrain is the shared dual-ESP32-S3 sensor-acquisition, LoRa mesh, and edge-control board inside Mycosoft devices, designed for modular sensors, Jetson/NemoClaw compute, NatureOS, MINDEX, MYCA, and the Nature Learning Model.",
}

const heroMetrics = [
  { value: "Dual ESP32-S3", label: "sensor + mesh control" },
  { value: "127", label: "I2C device address space" },
  { value: "10 km", label: "LoRa line-of-sight class" },
  { value: "Jetson", label: "NemoClaw edge pairing" },
] as const

const sensorGroups = [
  {
    icon: Wind,
    title: "Air, gas, and climate",
    text: "BME688/BME690, VOC/VSC, CO2, IAQ, temperature, humidity, pressure, particulate, smoke, mold, and spore-context channels.",
  },
  {
    icon: Leaf,
    title: "Soil and fungal interface",
    text: "FCI probes, Pt-Ir electrodes, moisture, RTD temperature, EC, ISFET pH, impedance, root-zone mapping, and mycelial signal quality.",
  },
  {
    icon: Activity,
    title: "Motion and physical state",
    text: "IMU, GPS/GNSS, tactile contact, pressure, vibration, barometric state, battery, solar, and power telemetry.",
  },
  {
    icon: Signal,
    title: "Vision, radio, and acoustic",
    text: "4K/8K imaging, LiDAR, radar, thermal, microphones, hydrophones, acoustic modems, SDR, RF spectrum, LoRa, Wi-Fi, BLE, cellular, and satellite links.",
  },
] as const

const boardLanes = [
  {
    label: "Side-A acquisition",
    value: "ESP32-S3 sensor MCU",
    detail: "Analog channels, I2C, UART, GPIO, MOSFET outputs, local sampling, and device-specific payload control.",
  },
  {
    label: "Side-B routing",
    value: "ESP32-S3 mesh MCU",
    detail: "LoRa SX1262, Mycorrhizae Protocol traffic, store-and-forward telemetry, and field network coordination.",
  },
  {
    label: "Expansion fabric",
    value: "Not a fixed sensor board",
    detail: "The board can host the sensor mix each device needs instead of being locked to two BME688 sensors.",
  },
  {
    label: "Edge bridge",
    value: "Jetson, M5Stack, Blackwell-class paths",
    detail: "MycoBrain handles acquisition and control while larger compute runs models, perception, and local agents.",
  },
] as const

const deviceRoles = [
  {
    name: "Mushroom 1",
    role: "walking ground droid",
    detail: "FCI soil contact, BlueSight vision, gas, acoustic, thermal, and Jetson-class on-device AI.",
    image: "/assets/mushroom1/Main A.jpg",
    imageAlt: "Mushroom 1 walking ground droid",
  },
  {
    name: "SporeBase",
    role: "bioaerosol collector",
    detail: "Time-indexed cassette sampling with MycoBrain control, LoRa mesh, and compact edge inference.",
    image: "/assets/sporebase/sporebase%20main2.jpg",
    imageAlt: "SporeBase bioaerosol collector",
  },
  {
    name: "Hyphae 1",
    role: "industrial edge node",
    detail: "Fixed-site I/O, virtual antenna fabric, Modbus/MQTT/HTTPS, Jetson or M5Stack compute tiers.",
    image: "/assets/hyphae1/hyphae1-lab-prototype.png",
    imageAlt: "Hyphae 1 industrial edge node",
  },
  {
    name: "ALARM",
    role: "indoor safety mesh",
    detail: "Smoke, particulate, CO2, VOC, climate, light, TinyML, and optional LoRa bridge into the fleet.",
    image: "/assets/alarm/alarm-device.jpg",
    imageAlt: "ALARM environmental sensing device",
  },
  {
    name: "Agaric",
    role: "flying deployment droid",
    detail: "MycoBrain mission control for payloads, inspection, relay, BlueSight sensors, and FUSARIUM support.",
    image: "/assets/agaric/hero.jpg",
    imageAlt: "Agaric flying deployment droid",
  },
  {
    name: "Psathyrella",
    role: "swimming sensor buoy",
    detail: "Water-layer intelligence with hydrophones, transducers, satellite, LoRa, and Jetson-class edge compute.",
    image: "/assets/psathyrella/hero.png",
    imageAlt: "Psathyrella swimming sensor buoy",
  },
] as const

const specs = [
  { label: "Production board", value: "85 x 55 mm PCB, 45 g class" },
  { label: "Module variant", value: "USB-C 5 V, 8 MB PSRAM, 16 MB flash" },
  { label: "Side-A MCU", value: "ESP32-S3-WROOM, dual-core Xtensa LX7 at 240 MHz" },
  { label: "Side-B MCU", value: "ESP32-S3-WROOM paired with Semtech SX1262 LoRa" },
  { label: "I2C fabric", value: "SDA GPIO 21, SCL GPIO 22, 3.3 V pull-ups, up to 127 devices" },
  { label: "Analog inputs", value: "4 channels, 0-3.3 V, 12-bit ADC" },
  { label: "Outputs", value: "4 MOSFET channels, up to 30 V / 5 A per channel" },
  { label: "Protocols", value: "MDP v1, REST, MQTT, OTA, MINDEX, NatureOS, MYCA, FCI" },
  { label: "Power", value: "5-12 V DC production input, onboard 3.3 V regulation" },
  { label: "Field range", value: "LoRa EU868 / US915 / AS923, up to 10 km line-of-sight" },
] as const

const intelligenceFlow = [
  "Sensors measure physical state",
  "MycoBrain samples, timestamps, and normalizes",
  "NemoClaw routes commands and telemetry on Jetson",
  "NVIDIA models and NLM encoders infer local state",
  "MINDEX records provenance and chain-of-custody",
  "NatureOS and MYCA coordinate fleet decisions",
] as const

const protocols = [
  "Mesh Device Protocol",
  "Mesh Mission Protocol",
  "Mycorrhizae Protocol",
  "MQTT telemetry",
  "REST command APIs",
  "OTA firmware",
  "MINDEX identity",
  "NatureOS fleet ops",
] as const

const glassCardClass = "mycobrain-glass-card rounded-lg border"
const glassPillClass = "mycobrain-glass-pill rounded-full border"

function MycobrainGlassLink({
  href,
  children,
  icon,
  className = "",
}: {
  href: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <span className={`natureos-glass-page mycobrain-petri-scope ${className}`}>
      <span className="petri-codepen-button-demo petri-codepen-button-demo-rect mycobrain-petri-link">
        <span className="button-wrap">
          <Link href={href} role="button">
            <span className="mycobrain-petri-label">
              {children}
              {icon}
            </span>
          </Link>
          <span className="button-shadow" aria-hidden="true" />
        </span>
      </span>
    </span>
  )
}

export default function MycobrainPage() {
  return (
    <main className="mycobrain-glass-page min-h-screen bg-[#f7f8f4] text-slate-950 dark:bg-black dark:text-white">
      <section className="relative min-h-[92vh] overflow-hidden bg-black text-white">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/assets/devices/mycobrain-hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/assets/devices/mycobrain-hero-web.mp4" type="video/mp4" />
          <source src="/assets/devices/mycobrain-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/64 to-black/18" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f7f8f4] via-[#f7f8f4]/42 to-transparent dark:from-black dark:via-black/60" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 items-center gap-10 px-5 py-24 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="max-w-3xl">
            <div className={`${glassPillClass} mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white`}>
              <CircuitBoard className="h-4 w-4" />
              Shared board architecture for the Mycosoft fleet
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              MycoBrain
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 sm:text-xl">
              The central brain and sensing processor for the future of droids. Mycobrain is the first non-human computer built specifically for Mycosoft devices. It&apos;s a modular nervous system that lets every droid carry the sensor stack its mission needs.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MycobrainGlassLink href="/natureos/devices/network" className="mycobrain-petri-over-video" icon={<ArrowRight className="h-4 w-4" />}>
                Device network
              </MycobrainGlassLink>
              <MycobrainGlassLink href="/natureos/devices/onsite-ai" className="mycobrain-petri-over-video" icon={<ChevronRight className="h-4 w-4" />}>
                NemoClaw on-site AI
              </MycobrainGlassLink>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-white/8 blur-2xl" aria-hidden="true" />
            <div className={`${glassCardClass} relative overflow-hidden shadow-2xl`}>
              <Image
                src="/assets/devices/mycobrainjetson-white.jpg"
                alt="MycoBrain board with NVIDIA Jetson companion on a light background"
                width={1280}
                height={853}
                priority
                className="block h-auto w-full object-cover dark:hidden"
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
              <Image
                src="/assets/devices/mycobrainjetson-black.jpg"
                alt="MycoBrain board with sensors and NVIDIA Jetson companion on a dark background"
                width={1280}
                height={853}
                priority
                className="hidden h-auto w-full object-cover dark:block"
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white/72 py-8 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 sm:px-6 md:grid-cols-4 lg:px-8">
          {heroMetrics.map((metric) => (
            <div key={metric.label} className={`${glassCardClass} min-h-[92px] p-4`}>
              <div className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{metric.value}</div>
              <div className="mt-2 text-sm leading-5 text-slate-600 dark:text-zinc-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Platform role</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">One controller board, every device class</h2>
              <p className="mt-5 text-base leading-8 text-slate-700 dark:text-zinc-300">
                MycoBrain is the dual-ESP32-S3 board that gives Mycosoft hardware a common acquisition layer, command layer, and mesh identity. Side-A is optimized for sensors and local peripherals. Side-B keeps the device in the Mycosoft mesh through LoRa. Larger platforms add Jetson or other edge compute beside it, but MycoBrain remains the board that talks to the physical world.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-700 dark:text-zinc-300">
                The Mycobrain board can carry gas, particle, soil, optical, acoustic, thermal, RF, power, navigation, and bioelectric payloads through its I/O fabric and daughterboard routes.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {boardLanes.map((lane) => (
                <div key={lane.label} className={`${glassCardClass} p-5`}>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">{lane.label}</div>
                  <h3 className="mt-3 text-xl font-semibold">{lane.value}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">{lane.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 text-black dark:bg-black dark:text-white sm:py-24">
        <MycobrainV2BoardBackground />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:items-center lg:px-8">
          <div className={`${glassCardClass} p-6`}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">V2 board front</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">The circuit face exposes the real expansion fabric</h2>
            <p className="mt-5 text-base leading-8 text-slate-800 dark:text-zinc-300">
              The V2 front view shows why MycoBrain belongs in every droid: paired Side-A and Side-B control zones, edge connectors for analog and digital peripherals, UART lanes, USB-C service, NeoPixel/actuator paths, LoRa routing, and board-level power handling. This is the hardware surface that lets each device become a different sensor organism without changing the core nervous system.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Side-A sensor and peripheral acquisition",
                "Side-B routing and LoRa mesh traffic",
                "Analog inputs, UART, I2C, GPIO, and actuator outputs",
                "Board-level identity for MINDEX and NatureOS",
              ].map((item) => (
                <div key={item} className="mycobrain-glass-card flex items-start gap-3 rounded-md border px-4 py-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                  <span className="text-sm leading-6 text-slate-800 dark:text-zinc-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`${glassCardClass} overflow-hidden p-2 shadow-2xl`}>
            <Image
              src="/images/devices/mycobrain-v2-front.png"
              alt="MycoBrain V2 front PCB render showing Side-A, Side-B, UART, analog, and output connectors"
              width={1600}
              height={1516}
              className="h-auto w-full rounded-md object-contain"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 text-slate-950 dark:bg-[#666666] dark:text-white sm:py-24">
        <MycobrainSensorFabricBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Sensor fabric</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Built for the full Mycosoft sensing stack</h2>
            <div className={`${glassCardClass} mt-6 p-6`}>
              <p className="text-base leading-8 text-slate-700 dark:text-zinc-300">
                MycoBrain sits below BlueSight, FCI, SporeBase sampling, ALARM safety sensing, Agaric payloads, Psathyrella maritime telemetry, and Hyphae industrial I/O. It gives each product a shared way to connect sensors while keeping the payload flexible.
              </p>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {sensorGroups.map((group) => (
              <div key={group.title} className={`${glassCardClass} p-6`}>
                <group.icon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                <h3 className="mt-4 text-xl font-semibold">{group.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-400">{group.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20 dark:border-white/10 dark:bg-zinc-950 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.86fr_1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Jetson combination</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">MycoBrain plus NemoClaw turns devices into field data centers</h2>
            <p className="mt-5 text-base leading-8 text-slate-700 dark:text-zinc-300">
              On larger devices, MycoBrain pairs with NVIDIA Jetson-class compute running NemoClaw, Nemotron paths, NVIDIA models, and Mycosoft's in-house Nature Learning Model. MycoBrain handles the physical sensor and command layer; the Jetson side performs local perception, model inference, buffering, telemetry decisions, and agent workflows before the cloud is involved.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MycobrainGlassLink href="/myca/nlm" icon={<ArrowRight className="h-4 w-4" />}>
                Nature Learning Model
              </MycobrainGlassLink>
              <MycobrainGlassLink href="/natureos/mycobrain" icon={<ChevronRight className="h-4 w-4" />}>
                MycoBrain console
              </MycobrainGlassLink>
            </div>
          </div>
          <ol className="grid gap-3">
            {intelligenceFlow.map((step, index) => (
              <li key={step} className={`${glassCardClass} grid grid-cols-[44px_1fr] items-start gap-4 p-4`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-700 text-sm font-bold text-white dark:bg-emerald-400 dark:text-slate-950">
                  {index + 1}
                </span>
                <span className="pt-2 text-sm font-medium leading-6 text-slate-700 dark:text-zinc-200">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 dark:bg-black sm:py-24">
        <MycobrainFleetBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.76fr_1fr]">
            <div className={`${glassCardClass} max-w-xl self-start p-6`}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Fleet integration</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Same internal system, different missions</h2>
              <p className="mt-5 text-base leading-8 text-slate-700 dark:text-zinc-300">
                MycoBrain lets manufacturing scale across bodies and payloads. The board repeats, firmware profiles change, and sensor suites become mission-specific.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {deviceRoles.map((device) => (
                <div key={device.name} className={`${glassCardClass} relative isolate min-h-[190px] overflow-hidden p-5`}>
                  <Image
                    src={device.image}
                    alt={device.imageAlt}
                    fill
                    className="absolute inset-0 -z-20 object-cover opacity-50"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24vw"
                  />
                  <div className="absolute inset-0 -z-10 bg-white/65 dark:bg-black/55" aria-hidden="true" />
                  <div className="text-lg font-semibold text-slate-950 dark:text-white">{device.name}</div>
                  <div className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">{device.role}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-zinc-100">{device.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-20 dark:bg-zinc-950 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Technical baseline</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Production specs from the hardware portfolio</h2>
            <dl className={`${glassCardClass} mt-8 divide-y divide-slate-200 dark:divide-white/10`}>
              {specs.map((spec) => (
                <div key={spec.label} className="grid gap-2 p-4 sm:grid-cols-[190px_1fr]">
                  <dt className="text-sm font-semibold text-slate-900 dark:text-white">{spec.label}</dt>
                  <dd className="text-sm leading-6 text-slate-600 dark:text-zinc-400">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={`${glassCardClass} p-6`}>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
              <h3 className="text-xl font-semibold">Protocol and trust layer</h3>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {protocols.map((protocol) => (
                <span key={protocol} className={`${glassPillClass} px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300`}>
                  {protocol}
                </span>
              ))}
            </div>
            <div className="mt-8 grid gap-4">
              {[
                { icon: Code, title: "Developer-facing", text: "REST, MQTT, OTA, MDP v1, and firmware profiles keep integrations field-serviceable." },
                { icon: GitBranch, title: "Chain-of-custody aware", text: "MINDEX identity and provenance turn raw sensor events into auditable records." },
                { icon: Brain, title: "Model-ready", text: "NLM receives calibrated, contextual physical signals instead of late-stage descriptions." },
                { icon: Wifi, title: "Mesh-native", text: "LoRa, Wi-Fi, BLE, cellular, satellite, and device relays let the fleet survive partial connectivity." },
              ].map((item) => (
                <div key={item.title} className="grid grid-cols-[36px_1fr] gap-3">
                  <item.icon className="mt-1 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-zinc-400">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 text-slate-950 dark:bg-black dark:text-white sm:py-24">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-[0.68] dark:opacity-[0.78]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/assets/devices/mycobrainspin.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-white/24 dark:bg-black/34" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/62 via-white/18 to-white/48 dark:from-black/68 dark:via-black/26 dark:to-black/46" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
          <Cpu className="mx-auto h-10 w-10 text-slate-950 dark:text-white" />
          <h2 className="mycobrain-final-heading mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
            <span>A</span>
            <span className="mycobrain-word-scroll" aria-label="board">
              <span className="mycobrain-word-scroll-track" aria-hidden="true">
                <span>board</span>
                <span>brain</span>
                <span>computer</span>
                <span>sensor</span>
                <span>board</span>
              </span>
            </span>
            <span>for every body Mycosoft builds</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-700 dark:text-zinc-300 sm:text-lg">
            MycoBrain is the repeatable hardware core behind droids that walk, fly, float, listen, breathe, sample, watch, relay, and learn from nature. The sensor suite changes. The device body changes. The acquisition and mesh fabric stays common.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <MycobrainGlassLink href="/devices" icon={<ArrowRight className="h-4 w-4" />}>
              Back to devices
            </MycobrainGlassLink>
            <MycobrainGlassLink href="/docs/devices/mycobrain" icon={<ChevronRight className="h-4 w-4" />}>
              Technical docs
            </MycobrainGlassLink>
          </div>
        </div>
      </section>
    </main>
  )
}
