"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  Network,
  Cpu,
  Globe2,
  FlaskConical,
  ArrowRight,
  Leaf,
  Brain,
  Database,
  Server,
} from "lucide-react"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"
import { cn } from "@/lib/utils"

interface EarthStage {
  id: string
  step: string
  title: string
  body: string
  icon: typeof Leaf
  href?: string
  hrefLabel?: string
}

const EARTH_STAGES: EarthStage[] = [
  {
    id: "mycelium",
    step: "01",
    title: "Mycelium in the ground",
    body: "Mycelium already forms computational systems beneath ecosystems — living hyphal networks that sense chemistry, moisture, vibration, and biological neighbors. Mycosoft starts here: mycelium as the first substrate of a global computer network woven through the Earth.",
    icon: Leaf,
    href: "/sensing/fungi-compute-fci",
    hrefLabel: "Fungi Compute & FCI",
  },
  {
    id: "interface",
    step: "02",
    title: "FCI / interface devices",
    body: "Fungal Computer Interface (FCI) hardware and MycoBrain edge nodes connect to that living mesh — reading bioelectric and environmental signals so mycelium becomes addressable compute and sensing at the field edge, routed through DirtNet.",
    icon: Cpu,
    href: "/devices/mycobrain",
    hrefLabel: "MycoBrain",
  },
  {
    id: "map",
    step: "03",
    title: "Model mycelium networks",
    body: "Observations land in MINDEX — Mycosoft's nature data memory — so mycelium and environmental signals become searchable maps. DirtNet and Mycorrhizae protocols link nodes into one mesh: turning mycelium into a global computer network, not a warehouse silo.",
    icon: Network,
    href: "/mindex",
    hrefLabel: "MINDEX",
  },
  {
    id: "simulate",
    step: "04",
    title: "Simulate planet & mycelium",
    body: "First we simulate the planet and its mycelium networks. Nature Learning Models learn from live streams; Earth Simulator and NatureOS run planetary and mycelial scenarios grounded in real catalogs and field programs — simulation tied to measured reality.",
    icon: Globe2,
    href: PUBLIC_TOOL_HREFS.earthSimulator,
    hrefLabel: "Earth Simulator",
  },
  {
    id: "organisms",
    step: "05",
    title: "Organisms on the system map",
    body: "Eventually the same Earth Computer map expands to include simulated organisms and richer biological actors — growing from mycelium networks outward into multi-organism planetary systems, still fed by sensors, MINDEX, and MYCA orchestration.",
    icon: FlaskConical,
    href: "/natureos",
    hrefLabel: "NatureOS",
  },
]

const PRODUCT_LINKS = [
  { name: "MycoBrain / FCI", href: "/devices/mycobrain", icon: Cpu },
  { name: "DirtNet", href: "/dirtnet", icon: Network },
  { name: "MINDEX", href: "/mindex", icon: Database },
  { name: "NLM", href: "/myca/nlm", icon: Brain },
  { name: "Earth Simulator", href: PUBLIC_TOOL_HREFS.earthSimulator, icon: Globe2 },
  { name: "NatureOS", href: "/natureos", icon: Server },
  { name: "MYCA / MAS", href: "/myca", icon: Brain },
]

export function EarthComputerNarrative() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Opening philosophy — public company goal */}
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        <p className="text-lg leading-relaxed !text-white/90 md:text-xl">
          Mycosoft&apos;s goal is turning the Earth into a computer — starting with mycelium computational systems
          already in the ground, and turning that living mesh into a{" "}
          <span className="font-semibold text-white">global computer network</span>.
        </p>
        <p className="text-base leading-relaxed !text-white/78 md:text-lg">
          We simulate the entire planet and its mycelium first. The path is concrete: mycelium in the ground → FCI and
          interface devices → model and simulate mycelium networks → planetary simulation → eventually organisms on the
          system map. Hardware, DirtNet, MINDEX, NLM, Earth Simulator, NatureOS, and MYCA are how Mycosoft builds that
          stack in the real world.
        </p>
      </div>

      {/* Staged visual narrative */}
      <ol className="relative mx-auto grid max-w-5xl grid-cols-1 gap-4 md:gap-5">
        {/* Vertical connector on md+ */}
        <div
          className="pointer-events-none absolute left-[1.65rem] top-8 bottom-8 hidden w-px bg-gradient-to-b from-white/40 via-white/20 to-transparent md:block"
          aria-hidden
        />

        {EARTH_STAGES.map((stage, index) => {
          const Icon = stage.icon
          return (
            <motion.li
              key={stage.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : index * 0.06 }}
              className={cn(
                "relative rounded-2xl border border-white/30 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl md:p-6",
                "md:pl-16",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3 md:absolute md:left-4 md:top-6 md:mb-0 md:flex-col md:items-center md:gap-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="font-mono text-xs tracking-widest text-white/55 md:mt-2">{stage.step}</span>
              </div>

              <h3 className="mb-2 text-xl font-bold !text-white md:text-2xl">{stage.title}</h3>
              <p className="text-sm leading-relaxed !text-white/80 md:text-base">{stage.body}</p>

              {stage.href && stage.hrefLabel ? (
                <Link
                  href={stage.href}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium !text-white/90 underline-offset-4 hover:underline touch-manipulation"
                >
                  {stage.hrefLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </motion.li>
          )
        })}
      </ol>

      {/* Diagram strip — mycelium → interface → map → simulation */}
      <div className="mx-auto max-w-5xl overflow-x-auto rounded-2xl border border-white/25 bg-black/35 p-4 backdrop-blur-xl md:p-6">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/55">
          Path to the Earth Computer
        </p>
        <div className="flex min-w-[640px] items-stretch justify-between gap-2 sm:min-w-0 sm:gap-3">
          {[
            { label: "Mycelium", sub: "In the ground" },
            { label: "FCI / devices", sub: "Interface" },
            { label: "Network models", sub: "Global mesh" },
            { label: "Planet sim", sub: "Then organisms" },
          ].map((node, i, arr) => (
            <div key={node.label} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className="flex flex-1 flex-col items-center rounded-xl border border-white/30 bg-white/10 px-2 py-3 text-center backdrop-blur-md sm:px-3">
                <span className="text-sm font-semibold !text-white">{node.label}</span>
                <span className="mt-1 text-[11px] text-white/55">{node.sub}</span>
              </div>
              {i < arr.length - 1 ? (
                <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Product grounding */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 text-center">
          <GlassChip className="mb-3">Grounded in real products</GlassChip>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed !text-white/75 md:text-base">
            No mock metrics — the Earth Computer is the product system Mycosoft ships and operates: sensing hardware,
            mesh networking, nature memory, learning models, simulation, and the NatureOS / MYCA surfaces that make them
            usable.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 md:gap-3">
          {PRODUCT_LINKS.map((product) => {
            const Icon = product.icon
            return (
              <Link key={product.name} href={product.href} className="block h-full touch-manipulation">
                <div className="flex h-full min-h-[44px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-3 backdrop-blur-md transition-colors hover:bg-white/16">
                  <Icon className="h-4 w-4 shrink-0 text-white/80" />
                  <span className="text-xs font-medium !text-white sm:text-sm">{product.name}</span>
                </div>
              </Link>
            )
          })}
        </div>
        <div className="mt-6 flex justify-center">
          <GlassButton href="/natureos" dataAnalytics="about_earth_open_natureos">
            Open NatureOS
            <ArrowRight className="ml-2 h-4 w-4 text-current" />
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
