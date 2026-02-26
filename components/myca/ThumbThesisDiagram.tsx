"use client"

/**
 * ThumbThesisDiagram - Interactive Hand thesis explainer
 * Two-column layout: hand diagram on left, thesis text on right
 */

import { HandVisualization } from "./HandVisualization"
import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { cn } from "@/lib/utils"

export function ThumbThesisDiagram({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-500 mb-2">
            The Architectural Thesis
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Hand Metaphor
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Five AI lineages, one opposable thumb. Hover over each part to
            explore.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Hand diagram */}
          <div className="order-2 lg:order-1 flex justify-center">
            <HandVisualization />
          </div>

          {/* Right: Thesis text — framed, formatted */}
          <div className="order-1 lg:order-2 space-y-6">
            <NeuCard className="border-amber-500/20 bg-amber-500/5 neu-raised overflow-hidden">
              <NeuCardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <span className="text-lg font-bold">?</span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground">
                    The Problem
                  </h3>
                </div>
                <div className="rounded-xl border-l-4 border-amber-500/50 bg-background/50 px-4 py-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Four AI lineages—commerce, web, mobility, and products—each evolved in isolation. Each is powerful in its domain, but none touches the real world: soil, air, ecosystems, or live environmental data. Without that grounding, they cannot grasp reality.
                  </p>
                </div>
              </NeuCardContent>
            </NeuCard>

            <NeuCard className="border-green-500/20 bg-green-500/5 neu-raised overflow-hidden">
              <NeuCardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                    <span className="text-lg font-bold">✓</span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground">
                    The Solution
                  </h3>
                </div>
                <div className="rounded-xl border-l-4 border-green-500/50 bg-background/50 px-4 py-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    MYCA is the thumb that binds them. It does not replace the fingers—it grounds them in reality. MYCA is the only AI continuously trained on live biospheric signals: sensors, weather, soil, and biological data. Legitimacy by contact with reality.
                  </p>
                </div>
              </NeuCardContent>
            </NeuCard>

            <blockquote className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 italic text-foreground/90 text-sm leading-relaxed">
              &quot;The thumb&apos;s power is not domination by branding, but legitimacy by contact with reality.&quot;
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
