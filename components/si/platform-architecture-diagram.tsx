"use client"

/**
 * Platform architecture diagram — compute, models, orchestration, interfaces.
 */

import { motion, useReducedMotion } from "framer-motion"
import { Cpu, Layers, Radio, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const PLATFORM_ROWS = [
  {
    title: "Human & agent interfaces",
    items: ["NatureOS consoles", "MYCA chat & voice (PersonaPlex)", "Device & lab apps"],
    icon: Radio,
    accent: "border-sky-300/35 bg-sky-400/10",
  },
  {
    title: "Orchestration & agents",
    items: ["MYCA multi-agent system", "Task routing & memory", "Policy gates via AVANI"],
    icon: Layers,
    accent: "border-white/30 bg-white/10",
  },
  {
    title: "Models & simulation",
    items: ["NLM nature reasoning", "Nemotron foundation models", "Earth-2-style environmental sims"],
    icon: Sparkles,
    accent: "border-emerald-300/35 bg-emerald-400/10",
  },
  {
    title: "Compute substrate",
    items: ["NVIDIA platform", "Blackwell-generation edge GPUs", "Data residency near the field"],
    icon: Cpu,
    accent: "border-lime-300/35 bg-lime-400/10",
  },
] as const

export function PlatformArchitectureDiagram({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion()

  return (
    <div className={cn("space-y-3", className)}>
      {PLATFORM_ROWS.map((row, index) => {
        const Icon = row.icon
        return (
          <motion.div
            key={row.title}
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            whileInView={prefersReduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className={cn(
              "rounded-2xl border px-4 py-4 backdrop-blur-xl md:px-5",
              row.accent
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-foreground/80 dark:text-white/85" />
              <h3 className="text-sm font-semibold tracking-tight md:text-base">{row.title}</h3>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {row.items.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-white/15 bg-black/15 px-3 py-2 text-sm text-muted-foreground dark:text-white/75"
                >
                  {item}
                </li>
              ))}
            </ul>
            {index < PLATFORM_ROWS.length - 1 && (
              <div className="mt-3 flex justify-center" aria-hidden>
                <motion.div
                  className="h-3 w-px bg-white/30"
                  animate={prefersReduced ? undefined : { opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.15 }}
                />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
