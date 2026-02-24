"use client"

/**
 * FingerCards - Four competitor finger cards
 * Amazon, Google/OpenAI/Anthropic, Tesla/xAI/Starlink, Apple/Meta (product-based AI)
 */

import { NeuCard, NeuCardContent } from "@/components/ui/neuromorphic"
import { ShoppingBag, Search, Car, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

const FINGERS = [
  {
    id: "amazon",
    icon: ShoppingBag,
    title: "Amazon",
    subtitle: "Commerce Finger",
    lineage: "Commerce-scale behavior loops",
    dataRoot: "Purchase history, catalog, recommendations",
    limitation:
      "Optimizes for conversion, not ecological understanding",
    color: "text-orange-500",
    borderColor: "border-orange-500/20",
    bgColor: "bg-orange-500/5",
  },
  {
    id: "google",
    icon: Search,
    title: "Google / OpenAI / Anthropic",
    subtitle: "Web Finger",
    lineage: "Web-scale indexing, Transformers",
    dataRoot: "Common Crawl, internet text, curated corpora",
    limitation: "Static corpora, no live grounding",
    color: "text-blue-500",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
  },
  {
    id: "tesla",
    icon: Car,
    title: "Tesla / xAI / Starlink",
    subtitle: "Mobility Finger",
    lineage: "Embodied perception, social data",
    dataRoot: "Road telemetry, X posts, orbital connectivity",
    limitation: "Road-world only, not biosphere-wide",
    color: "text-cyan-500",
    borderColor: "border-cyan-500/20",
    bgColor: "bg-cyan-500/5",
  },
  {
    id: "apple",
    icon: Smartphone,
    title: "Apple / Meta",
    subtitle: "Product-based AI",
    lineage: "Device UX, privacy positioning, social & product ecosystems",
    dataRoot: "User interactions, on-device + private cloud, product data",
    limitation: "Intimate but isolated, no planetary view",
    color: "text-gray-500",
    borderColor: "border-gray-500/20",
    bgColor: "bg-gray-500/5",
  },
]

export function FingerCards({ className }: { className?: string }) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-green-500 mb-2">
            The Four Fingers
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Habitat-Locked Intelligence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Each finger optimizes for its corporate habitat&apos;s data regime.
            None learns continuously from the living planet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {FINGERS.map((finger) => {
            const Icon = finger.icon
            return (
              <NeuCard
                key={finger.id}
                className={cn(
                  "h-full border transition-all hover:shadow-lg",
                  finger.borderColor,
                  finger.bgColor
                )}
              >
                <NeuCardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-xl",
                        finger.bgColor,
                        finger.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{finger.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {finger.subtitle}
                      </p>
                    </div>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Lineage
                      </dt>
                      <dd className="font-medium">{finger.lineage}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Data Root
                      </dt>
                      <dd className="text-muted-foreground">
                        {finger.dataRoot}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Limitation
                      </dt>
                      <dd className="text-amber-600/90 dark:text-amber-400/90 italic">
                        {finger.limitation}
                      </dd>
                    </div>
                  </dl>
                </NeuCardContent>
              </NeuCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
