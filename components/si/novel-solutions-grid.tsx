"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Fingerprint, GitBranch, Globe2, Map } from "lucide-react"
import { cn } from "@/lib/utils"

const SOLUTIONS = [
  {
    title: "Paired stochastic + deterministic SI",
    body: "MYCA pursues goals with agentic planning; AVANI keeps a continuous, governed Earth WorldState. Together they form a yin-yang loop — capability with planetary grounding — instead of a single opaque model.",
    href: "/ai/avani",
    cta: "See AVANI",
    icon: GitBranch,
  },
  {
    title: "Nature-trained reasoning (NLM)",
    body: "The Nature Learning Model specializes in ecological and multi-modal inference under partial, noisy, or conflicting signals — surfacing uncertainty instead of inventing certainty.",
    href: "/myca/nlm",
    cta: "Explore NLM",
    icon: Fingerprint,
  },
  {
    title: "FormSpace environmental map",
    body: "FormSpace structures environmental relationships as an Environmental Platonic Map — a spatial-semantic layer agents and humans can navigate alongside live AVANI feeds and MINDEX records.",
    href: "/ai/formspace",
    cta: "Open FormSpace",
    icon: Map,
  },
  {
    title: "Living-world memory (MINDEX + NatureOS)",
    body: "MINDEX holds species and living-world knowledge; NatureOS exposes apps, tools, and dashboards so humans and agents operate on the same grounded picture — not disconnected chats.",
    href: "/mindex",
    cta: "Browse MINDEX",
    icon: Globe2,
  },
] as const

export function NovelSolutionsGrid({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion()

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6", className)}>
      {SOLUTIONS.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.article
            key={item.title}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={prefersReduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-32px" }}
            transition={{ delay: index * 0.07, duration: 0.45 }}
            className="flex flex-col rounded-3xl border border-white/25 bg-white/5 p-5 backdrop-blur-xl md:p-6"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10">
              <Icon className="h-5 w-5 text-foreground dark:text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            <Link
              href={item.href}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline touch-manipulation dark:text-white"
            >
              {item.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.article>
        )
      })}
    </div>
  )
}
