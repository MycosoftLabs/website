"use client"

/**
 * MYCAHardwareSystems — Edge compute and hardware architecture
 * Shows MYCA running across Mycosoft hardware: Mushroom 1, Hyphae 1, SporeBase, Alarm, Myconode
 * Plus NVIDIA stack positioning (NemoClaw, Nemotron, Earth-2)
 * Created: Mar 17, 2026
 */

import Image from "next/image"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import { Cpu, Server, Radio, Shield, Zap, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const HARDWARE_SYSTEMS = [
  {
    id: "mushroom1",
    name: "Mushroom 1",
    role: "Edge Compute Ground Station",
    description:
      "Primary edge data center node. Handles local AI inference, sensor aggregation, and environmental model execution at the point of collection.",
    icon: Server,
    image: "/assets/mushroom1/Main A.jpg",
    color: "green",
  },
  {
    id: "hyphae1",
    name: "Hyphae 1",
    role: "Network Backbone",
    description:
      "Mesh networking and data transport layer. Connects distributed edge nodes into a resilient, low-latency communication fabric inspired by mycelial networks.",
    icon: Radio,
    color: "emerald",
  },
  {
    id: "sporebase",
    name: "SporeBase",
    role: "Environmental Collection Platform",
    description:
      "Field-deployed environmental data collection. Gathers soil, air, biological, and chemical signals that feed MYCA's living worldview.",
    icon: Globe,
    image: "/assets/sporebase/sporebase main2.jpg",
    color: "teal",
  },
  {
    id: "alarm",
    name: "Alarm",
    role: "Monitoring & Alert System",
    description:
      "Real-time environmental monitoring and anomaly detection. Triggers early warnings when conditions deviate from expected patterns.",
    icon: Shield,
    color: "amber",
  },
  {
    id: "myconode",
    name: "Myconode",
    role: "Edge Sensing Node",
    description:
      "Compact sensing hardware for subsurface and environmental measurement. Deploys at the boundary between digital and biological systems.",
    icon: Cpu,
    image: "/assets/myconode/myconode a.png",
    color: "purple",
  },
]

const NVIDIA_STACK = [
  {
    name: "NemoClaw",
    description: "Runtime orchestration for AI model deployment and edge inference management.",
  },
  {
    name: "Nemotron",
    description: "Foundation model family for specialized reasoning tasks and domain-specific intelligence.",
  },
  {
    name: "Earth-2",
    description: "Global climate simulation and environmental prediction at planetary scale.",
  },
]

const COLOR_MAP: Record<string, { border: string; bg: string; icon: string }> = {
  green: { border: "border-green-500/30", bg: "bg-green-500/5", icon: "text-green-500" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", icon: "text-emerald-500" },
  teal: { border: "border-teal-500/30", bg: "bg-teal-500/5", icon: "text-teal-500" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/5", icon: "text-amber-500" },
  purple: { border: "border-purple-500/30", bg: "bg-purple-500/5", icon: "text-purple-500" },
}

export function MYCAHardwareSystems({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24 neuromorphic-section", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <NeuBadge variant="default" className="mb-4 border border-green-500/30">
            Edge Infrastructure
          </NeuBadge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hardware-Integrated Intelligence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            MYCA does not live in a generic data center. It operates across Mycosoft&apos;s
            purpose-built edge hardware — sensing, computing, and coordinating where
            environmental reality happens.
          </p>
        </div>

        {/* Hardware grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
          {HARDWARE_SYSTEMS.map((hw) => {
            const Icon = hw.icon
            const colors = COLOR_MAP[hw.color] ?? COLOR_MAP.green
            return (
              <NeuCard
                key={hw.id}
                className={cn(
                  "overflow-hidden neu-raised border transition-all hover:shadow-lg",
                  colors.border,
                  colors.bg
                )}
              >
                {hw.image && (
                  <div className="relative w-full h-36 overflow-hidden">
                    <Image
                      src={hw.image}
                      alt={hw.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <NeuCardContent className={hw.image ? "pt-4" : "pt-6"}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("p-2 rounded-xl", colors.bg)}>
                      <Icon className={cn("h-5 w-5", colors.icon)} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{hw.name}</h3>
                      <p className="text-xs text-muted-foreground">{hw.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {hw.description}
                  </p>
                </NeuCardContent>
              </NeuCard>
            )
          })}
        </div>

        {/* NVIDIA ecosystem positioning */}
        <div className="rounded-xl border border-border bg-muted/30 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">NVIDIA-Aligned Runtime Stack</h3>
              <p className="text-xs text-muted-foreground">
                Accelerated AI inference and planetary-scale simulation
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Mycosoft&apos;s edge hardware leverages the NVIDIA ecosystem for accelerated inference,
            model orchestration, and planetary-scale environmental modeling.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NVIDIA_STACK.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-border/50 bg-background/50 p-4"
              >
                <p className="font-semibold text-sm mb-1">{item.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Edge vs. centralized callout */}
        <NeuCard className="mt-8 border-green-500/30 bg-green-500/5 neu-raised">
          <NeuCardContent className="pt-6">
            <h3 className="font-bold mb-2 text-green-600 dark:text-green-400">
              Edge Intelligence, Not Cloud Dependence
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MYCA processes data where it originates — at the edge, inside Mycosoft hardware.
              This reduces latency, keeps sensitive environmental data local, and ensures the
              system continues operating even when connectivity is limited. The intelligence
              lives near the sensors, not in a distant data center.
            </p>
          </NeuCardContent>
        </NeuCard>
      </div>
    </section>
  )
}
