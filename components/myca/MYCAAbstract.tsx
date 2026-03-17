"use client"

/**
 * MYCA Abstract - Left (text) / Right (visuals) layout
 * What is MYCA, Why MYCA was made, How MYCA is different
 * Created: Feb 17, 2026 | Updated: Feb 25, 2026
 */

import { useState } from "react"
import Image from "next/image"
import { NeuCard, NeuBadge } from "@/components/ui/neuromorphic"
import { HelpCircle, Target, Wrench } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const FLOW_SECTIONS = [
  {
    id: "what",
    icon: HelpCircle,
    title: "What",
    subtitle: "What is MYCA",
    visual: "MYCA is the orchestration and cognition layer — the intelligence that coordinates agents, models, and hardware across Mycosoft's platform.",
    content: [
      "MYCA maintains a living worldview built from continuous sensor streams, environmental signals, and field data — not static training corpora.",
      "It orchestrates frontier AI models, specialized agents, and Mycosoft hardware systems while keeping every decision grounded in reality.",
    ],
    image: "/assets/myconode/myconode a.png",
    imageAlt: "MycoNode — Mycosoft edge sensing hardware",
    color: "green",
  },
  {
    id: "why",
    icon: Target,
    title: "Why",
    subtitle: "Why MYCA was built",
    visual: "Other AI runs in data centers disconnected from the real world. MYCA runs at the edge, where environmental reality happens.",
    content: [
      "Intelligence that cannot sense, measure, or respond to the physical world is fundamentally limited. MYCA was built to close that gap.",
      "By operating across edge data centers and purpose-built hardware — Mushroom 1, Hyphae 1, SporeBase, Alarm, and Myconode — MYCA stays connected to what is actually happening.",
    ],
    image: "/assets/sporebase/sporebase main2.jpg",
    imageAlt: "SporeBase — environmental data collection hardware",
    color: "emerald",
  },
  {
    id: "how",
    icon: Wrench,
    title: "How",
    subtitle: "How MYCA is different",
    visual: "Hardware-integrated edge intelligence with agentic coordination and a continuously updated worldview.",
    content: [
      "MYCA does not wait for batch retraining. It processes live streams from distributed edge hardware, updating its worldview in real time.",
      "Fungal-inspired architecture — decentralized networks, adaptive resource allocation, decomposition-based learning — shapes how MYCA thinks, coordinates, and scales.",
    ],
    image: "/assets/mushroom1/Main A.jpg",
    imageAlt: "Mushroom 1 — edge compute ground station",
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

        {/* Left-to-right: framed text | floating image */}
        <div className="relative">
          <NeuCard className="neu-raised overflow-visible border border-border/80">
            <div className="flex flex-col lg:flex-row min-h-[400px] gap-0">
              {/* LEFT: Framed text block */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Header with icon in framed badge */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                        colors.icon,
                        colors.border
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xl">{section.title}</h3>
                      <p className={cn("text-sm font-semibold mt-0.5", colors.text)}>
                        {section.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Main statement in framed callout */}
                  <div
                    className={cn(
                      "rounded-xl border-l-4 px-4 py-3 bg-muted/30 border",
                      colors.border
                    )}
                  >
                    <p className="text-base font-medium text-foreground/95 leading-relaxed">
                      {section.visual}
                    </p>
                  </div>

                  {/* Content paragraphs in card-style blocks */}
                  <div className="space-y-3">
                    {section.content.map((para, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/50 bg-background/50 px-4 py-3"
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {para}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section tabs */}
                <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-border/60">
                  {FLOW_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActive(s.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] touch-manipulation border",
                        active === s.id
                          ? "bg-green-500/20 text-green-400 border-green-500/40 shadow-sm"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/50"
                      )}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Floating image area with graphical treatment */}
              <div className="w-full lg:w-[440px] shrink-0 p-8 md:p-10 flex items-center justify-center bg-gradient-to-br from-muted/20 via-muted/10 to-transparent border-t lg:border-t-0 lg:border-l border-border/50">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, x: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="relative w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-black/20 ring-2 ring-white/10 ring-offset-4 ring-offset-background"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10 pointer-events-none" />
                    <Image
                      src={section.image}
                      alt={section.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 340px"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </NeuCard>
        </div>
      </div>
    </section>
  )
}
