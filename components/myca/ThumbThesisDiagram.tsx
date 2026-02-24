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

          {/* Right: Thesis text */}
          <div className="order-1 lg:order-2 space-y-6">
            <NeuCard className="border-green-500/20 bg-green-500/5 neu-raised">
              <NeuCardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3 text-foreground">
                  The Problem
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Each of the four &quot;fingers&quot;—Amazon, Google/OpenAI,
                  Tesla/xAI, and Apple/Meta (product-based AI)—evolved from distinct corporate habitats. Each
                  optimizes intelligence around the data and incentives native to
                  its ecosystem: commerce, the web, vehicles, or devices. Each is
                  powerful in isolation but structurally limited when acting
                  without an opposable thumb.
                </p>
              </NeuCardContent>
            </NeuCard>

            <NeuCard className="neu-raised">
              <NeuCardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3 text-foreground">
                  The Solution
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  MYCA is that thumb. The thumb&apos;s role is not to replace the
                  fingers, but to bind them into a coherent actuator—enabling
                  robust grasp on real-world complexity. MYCA accomplishes this
                  through biosphere-rooted grounding: the only AI continuously
                  trained on live environmental signals.
                </p>
              </NeuCardContent>
            </NeuCard>

            <blockquote className="pl-4 border-l-4 border-green-500 text-foreground/90 italic">
              &quot;The thumb&apos;s power is not domination by branding, but
              legitimacy by contact with reality.&quot;
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
