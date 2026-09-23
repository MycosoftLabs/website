"use client"

/**
 * Animated layered SI ecosystem diagram — MYCA / AVANI / NLM / FormSpace / MINDEX / NatureOS.
 */

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ProductIcon } from "@/components/brand/product-icon"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface LayerDef {
  id: string
  label: string
  subtitle: string
  href: string
  tone: string
  icon: "myca" | "nlm" | "formspace" | "natureos" | "avani" | "mindex"
}

const LAYERS: LayerDef[] = [
  {
    id: "myca",
    label: "MYCA",
    subtitle: "Operating intelligence · agents · orchestration",
    href: "/myca",
    tone: "from-white/25 via-slate-900/80 to-black/90 border-white/35",
    icon: "myca",
  },
  {
    id: "avani",
    label: "AVANI",
    subtitle: "Live Earth substrate · governance · WorldState",
    href: "/ai/avani",
    tone: "from-rose-200/40 via-rose-100/25 to-transparent border-rose-300/45",
    icon: "avani",
  },
  {
    id: "nlm",
    label: "NLM",
    subtitle: "Nature Learning Model · grounded inference",
    href: "/myca/nlm",
    tone: "from-emerald-400/25 via-emerald-500/10 to-transparent border-emerald-400/40",
    icon: "nlm",
  },
  {
    id: "formspace",
    label: "FormSpace",
    subtitle: "Environmental Platonic Map · spatial structure",
    href: "/ai/formspace",
    tone: "from-sky-400/20 via-violet-400/10 to-transparent border-sky-300/40",
    icon: "formspace",
  },
  {
    id: "mindex",
    label: "MINDEX",
    subtitle: "Living-world species & knowledge store",
    href: "/mindex",
    tone: "from-amber-400/20 via-amber-500/10 to-transparent border-amber-300/40",
    icon: "mindex",
  },
  {
    id: "natureos",
    label: "NatureOS",
    subtitle: "Human & agent interfaces · apps · tools",
    href: "/natureos",
    tone: "from-teal-400/20 via-teal-500/10 to-transparent border-teal-300/40",
    icon: "natureos",
  },
]

function LayerIcon({ icon }: { icon: LayerDef["icon"] }) {
  if (icon === "avani") {
    return <Shield className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" aria-hidden />
  }
  if (icon === "mindex") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-amber-400/50 text-[10px] font-bold text-amber-700 dark:text-amber-300">
        M
      </span>
    )
  }
  return (
    <ProductIcon
      product={icon}
      variant="current"
      className="h-5 w-5 shrink-0"
      title={icon}
    />
  )
}

export function LayeredEcosystemDiagram({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion()

  return (
    <div className={cn("relative w-full", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        {!prefersReduced && (
          <motion.div
            className="absolute left-1/2 top-1/2 h-[120%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-emerald-400/10 via-sky-400/5 to-transparent blur-3xl"
            animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.04, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      <ol className="mx-auto flex max-w-2xl flex-col gap-3">
        {LAYERS.map((layer, index) => (
          <motion.li
            key={layer.id}
            initial={prefersReduced ? false : { opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={prefersReduced ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-24px" }}
            transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={layer.href}
              className={cn(
                "group relative flex min-h-[56px] items-center gap-3 rounded-2xl border bg-gradient-to-r px-4 py-3 backdrop-blur-xl transition",
                "touch-manipulation hover:border-white/50 hover:shadow-[0_12px_36px_rgba(0,0,0,0.18)]",
                layer.tone
              )}
              style={{ marginInline: `${index * 2}%` }}
            >
              <LayerIcon icon={layer.icon} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold tracking-tight text-foreground dark:text-white">
                    {layer.label}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    Layer {index + 1}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{layer.subtitle}</p>
              </div>
              {!prefersReduced && (
                <motion.span
                  className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90 sm:block"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.2 }}
                  aria-hidden
                />
              )}
            </Link>
            {index < LAYERS.length - 1 && (
              <div className="flex justify-center py-1" aria-hidden>
                <motion.div
                  className="h-4 w-px bg-gradient-to-b from-white/40 to-white/10"
                  initial={prefersReduced ? false : { scaleY: 0 }}
                  whileInView={prefersReduced ? undefined : { scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + index * 0.07, duration: 0.35 }}
                  style={{ originY: 0 }}
                />
              </div>
            )}
          </motion.li>
        ))}
      </ol>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Each layer is independently useful and purpose-built to amplify the others — open a product
        page to go deeper.
      </p>
    </div>
  )
}
