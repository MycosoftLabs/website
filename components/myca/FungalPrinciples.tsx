"use client"

/**
 * FungalPrinciples - Three fungal-inspired computation principles
 * Foraging, Decomposition, Networked Intelligence
 */

import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { Search, Layers, Network } from "lucide-react"
import { cn } from "@/lib/utils"

const PRINCIPLES = [
  {
    id: "foraging",
    icon: Search,
    title: "Foraging as Exploration",
    description:
      "Allocate sensing and sampling to regions of high informational value—novelty, uncertainty, ecological edge cases. The biosphere analog of Tesla's corner-case fleet learning, except the 'road' is the planet's living surface.",
    animation: "animate-pulse",
  },
  {
    id: "decomposition",
    icon: Layers,
    title: "Decomposition as Learning",
    description:
      "Transform messy raw sensor-stream reality into stable representations. Fungi digest complex substrates into usable building blocks; MYCA treats sensor data as substrate to be decomposed into features, embeddings, and causal hypotheses.",
    animation: "animate-pulse",
  },
  {
    id: "networked",
    icon: Network,
    title: "Networked Intelligence",
    description:
      "Distributed sensing and response over centralized command. Mycelium distributes sensing across hyphae; MYCA coordinates across agents, sensors, and external models—prioritizing redundancy and anti-fragility.",
    animation: "animate-pulse",
  },
]

export function FungalPrinciples({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24 relative overflow-hidden", className)}>
      {/* Optional subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/10 via-transparent to-green-950/10 pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-500 mb-2">
            Mycological Design
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Fungal-Inspired Architecture
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            MYCA's computation patterns are biomimetic: inspired by how fungi
            explore, adapt, allocate resources, and convert decay into
            regeneration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRINCIPLES.map((principle) => {
            const Icon = principle.icon
            return (
              <NeuCard
                key={principle.id}
                className="border-green-500/20 bg-card/80 backdrop-blur-sm hover:border-green-500/40 transition-colors neu-raised"
              >
                <NeuCardContent className="pt-6">
                  <div
                    className={cn(
                      "inline-flex p-3 rounded-xl bg-green-500/15 mb-4",
                      principle.animation
                    )}
                  >
                    <Icon className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{principle.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {principle.description}
                  </p>
                </NeuCardContent>
              </NeuCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
