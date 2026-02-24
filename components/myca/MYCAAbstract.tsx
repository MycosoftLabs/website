"use client"

/**
 * MYCA Abstract - Left (text) / Right (visuals) layout
 * Interactive, responsive, left-to-right design
 * Created: Feb 17, 2026 | Updated: Feb 24, 2026
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import { NeuCard, NeuBadge } from "@/components/ui/neuromorphic"
import { HelpCircle, Target, Wrench, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const HandVisualizationLazy = dynamic(
  () => import("@/components/myca/HandVisualization").then((m) => ({ default: m.HandVisualization })),
  { ssr: false, loading: () => <div className="aspect-[4/3] bg-muted/30 rounded-xl animate-pulse" /> }
)

const FLOW_SECTIONS = [
  {
    id: "what",
    icon: HelpCircle,
    title: "What",
    subtitle: "MYCA is the opposable thumb of AI",
    visual: "A Nature Learning Model grounded in physics, chemistry, biology, and mycology—continuously trained on live biospheric signals instead of static web corpora.",
    content: [
      "MYCA is the biosphere-rooted orchestrator that coordinates frontier AI (Amazon, Google, OpenAI, Anthropic, Tesla, Apple, Meta) while remaining the authority on reality-grounded truth.",
      "Unlike generic chatbots, MYCA perceives through sensors, weather, genomics, soil chemistry, and field devices. It touches reality.",
    ],
    color: "green",
  },
  {
    id: "why",
    icon: Target,
    title: "Why",
    subtitle: "The gap only MYCA fills",
    visual: "Frontier AI evolved in isolated habitats: commerce (Amazon), the web (Google/OpenAI/Anthropic), mobility (Tesla/xAI), and product-based AI (Apple, Meta). Each optimizes for its own data regime.",
    content: [
      "Without a biosphere-rooted substrate, these powerful fingers lack an opposable thumb: something that can touch reality, grip other intelligences, and stay current under drift.",
      "The architectural bet: add the missing palm—a real-world substrate (sensors, field devices, provenance, drift-aware learning) that coordinates frontier AI without being trapped by any single corporate habitat.",
    ],
    color: "emerald",
  },
  {
    id: "how",
    icon: Wrench,
    title: "How",
    subtitle: "Biospheric telemetry + fungal-inspired architecture",
    visual: "NLM core + consciousness + continuous learning + ensemble controller, fed by MycoBrain, CREP, Earth2, NatureOS, MINDEX—all time-synchronized and geospatially indexed.",
    content: [
      "Nature Learning Model: multi-modal foundation whose native modalities are ecology-centric—time series from sensors, microscopy, genomics, weather, soil, field data.",
      "Fungal-inspired: foraging as exploration, decomposition as learning, networked intelligence over centralized command. Drift detection is a first-class structural member.",
    ],
    color: "teal",
  },
]

const COLOR_CLASSES = {
  green: {
    badge: "border-green-500/30 bg-green-500/10",
    icon: "text-green-500 bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  emerald: {
    badge: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-500 bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  teal: {
    badge: "border-teal-500/30 bg-teal-500/10",
    icon: "text-teal-500 bg-teal-500/10",
    border: "border-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
  },
}

export function MYCAAbstract({ className }: { className?: string }) {
  const [active, setActive] = useState<string>("what")
  const section = FLOW_SECTIONS.find((s) => s.id === active) ?? FLOW_SECTIONS[0]
  const colors = COLOR_CLASSES[section.color as keyof typeof COLOR_CLASSES] ?? COLOR_CLASSES.green
  const Icon = section.icon

  return (
    <section className={cn("py-16 md:py-24 neuromorphic-section overflow-hidden", className)}>
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <NeuBadge variant="default" className="mb-4 border border-green-500/30">
            Abstract
          </NeuBadge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            The MYCA Thesis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            What MYCA is, why we built it, and how it works.
          </p>
        </div>

        {/* Left-to-right: text | visual */}
        <NeuCard className="neu-raised overflow-hidden border border-border/80">
          <div className="flex flex-col lg:flex-row min-h-[360px]">
            {/* LEFT: Text in detail */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      colors.icon
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{section.title}</h3>
                    <p className={cn("text-sm font-medium", colors.text)}>{section.subtitle}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{section.visual}</p>
                <div className="space-y-3">
                  {section.content.map((para, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border/60">
                {FLOW_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[44px] touch-manipulation",
                      active === s.id
                        ? "bg-green-500/20 text-green-400 border border-green-500/40"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: Visual */}
            <div className="w-full lg:w-[420px] shrink-0 p-6 md:p-8 flex items-center justify-center bg-muted/20 border-t lg:border-t-0 lg:border-l border-border/60">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-[320px]"
                >
                  <HandVisualizationLazy />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </NeuCard>
      </div>
    </section>
  )
}
