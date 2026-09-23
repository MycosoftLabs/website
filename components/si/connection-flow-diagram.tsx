"use client"

/**
 * How SI pieces connect — architecture flow with subtle motion.
 */

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ProductIcon } from "@/components/brand/product-icon"
import { Shield, Database } from "lucide-react"
import { cn } from "@/lib/utils"

const NODES = [
  {
    id: "sensors",
    label: "Edge & sensors",
    href: "/devices",
    detail: "MycoBrain · field nodes",
  },
  {
    id: "avani",
    label: "AVANI",
    href: "/ai/avani",
    detail: "WorldState · governance",
  },
  {
    id: "myca",
    label: "MYCA",
    href: "/myca",
    detail: "Agents · plans · voice",
  },
  {
    id: "nlm",
    label: "NLM",
    href: "/myca/nlm",
    detail: "Nature reasoning",
  },
  {
    id: "mindex",
    label: "MINDEX",
    href: "/mindex",
    detail: "Species knowledge",
  },
  {
    id: "formspace",
    label: "FormSpace",
    href: "/ai/formspace",
    detail: "Platonic map",
  },
  {
    id: "natureos",
    label: "NatureOS",
    href: "/natureos",
    detail: "Apps & consoles",
  },
] as const

function NodeGlyph({ id }: { id: string }) {
  if (id === "avani") return <Shield className="h-3.5 w-3.5" aria-hidden />
  if (id === "mindex") return <Database className="h-3.5 w-3.5" aria-hidden />
  if (id === "myca") return <ProductIcon product="myca" variant="current" className="h-3.5 w-3.5" />
  if (id === "nlm") return <ProductIcon product="nlm" variant="current" className="h-3.5 w-3.5" />
  if (id === "formspace")
    return <ProductIcon product="formspace" variant="current" className="h-3.5 w-3.5" />
  if (id === "natureos")
    return <ProductIcon product="natureos" variant="current" className="h-3.5 w-3.5" />
  return <ProductIcon product="mycobrain" variant="current" className="h-3.5 w-3.5" />
}

export function ConnectionFlowDiagram({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion()

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/25 bg-white/5 p-4 backdrop-blur-xl md:p-6",
        className
      )}
    >
      {/* Desktop SVG backbone */}
      <div className="mb-6 hidden md:block" aria-hidden>
        <svg viewBox="0 0 640 160" className="mx-auto h-auto w-full max-w-3xl">
          <defs>
            <linearGradient id="si-flow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(52,211,153,0.7)" />
              <stop offset="50%" stopColor="rgba(56,189,248,0.55)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.55)" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 40 80 C 120 20, 200 20, 280 80 S 440 140, 520 80 S 600 40, 600 80"
            fill="none"
            stroke="url(#si-flow)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={prefersReduced ? false : { pathLength: 0, opacity: 0.3 }}
            whileInView={prefersReduced ? undefined : { pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
          {!prefersReduced && (
            <motion.circle
              r={4}
              fill="rgba(167,243,208,0.95)"
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
            >
              <animateMotion dur="4.5s" repeatCount="indefinite" path="M 40 80 C 120 20, 200 20, 280 80 S 440 140, 520 80 S 600 40, 600 80" />
            </motion.circle>
          )}
          {[
            [80, 72],
            [220, 48],
            [320, 80],
            [420, 108],
            [540, 72],
          ].map(([cx, cy], i) => (
            <motion.circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={5}
              fill="rgba(255,255,255,0.85)"
              stroke="rgba(52,211,153,0.8)"
              strokeWidth={1.5}
              initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
              whileInView={prefersReduced ? undefined : { scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
            />
          ))}
        </svg>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NODES.map((node, index) => (
          <motion.li
            key={node.id}
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            whileInView={prefersReduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
          >
            <Link
              href={node.href}
              className="flex min-h-[52px] items-start gap-3 rounded-2xl border border-white/20 bg-black/25 px-3 py-3 backdrop-blur-md transition hover:border-white/40 touch-manipulation"
            >
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-foreground dark:text-white">
                <NodeGlyph id={node.id} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground dark:text-white">
                  {node.label}
                </span>
                <span className="block text-xs text-muted-foreground">{node.detail}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>

      <p className="mt-4 text-center text-xs text-muted-foreground md:text-sm">
        Closed loop: sense → ground (AVANI) → decide (MYCA) → reason (NLM) → store &amp; map (MINDEX
        / FormSpace) → operate (NatureOS).
      </p>
    </div>
  )
}
