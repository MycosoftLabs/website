"use client"

import Link from "next/link"
import { Bot, ArrowRight, Globe2 } from "lucide-react"
import HeroSearch from "./hero-search"

/**
 * ParallaxSearch - Wraps the homepage hero search (search bar always visible).
 * Updated:
 *   - Mar 14, 2026: Added "For Agents" strip for MYCA/AVANI worldstate.
 *   - Apr 17, 2026: Added Earth / CREP instant-access button so the live
 *     globe dashboard is one click from the home page (Army-proposal demo
 *     entry point).
 */
export default function ParallaxSearch() {
  return (
    <div className="space-y-4">
      <HeroSearch />

      {/* Instant CREP access — spins live 3D globe + 50+ data layers */}
      <div className="flex justify-center">
        <Link
          href="/dashboard/crep"
          aria-label="Open CREP — Common Relevant Environmental Picture"
          className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-full
                     bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-emerald-500/15
                     dark:from-cyan-500/25 dark:via-sky-500/25 dark:to-emerald-500/25
                     border border-cyan-500/30 dark:border-cyan-400/40
                     text-cyan-700 dark:text-cyan-200
                     text-sm font-semibold tracking-wide
                     shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]
                     hover:from-cyan-500/25 hover:via-sky-500/25 hover:to-emerald-500/25
                     dark:hover:from-cyan-500/35 dark:hover:via-sky-500/35 dark:hover:to-emerald-500/35
                     transition-all duration-300 min-h-[48px] min-w-[48px]"
        >
          <span className="relative flex items-center justify-center w-7 h-7">
            <span className="absolute inset-0 rounded-full bg-cyan-400/30 blur-md animate-pulse group-hover:bg-cyan-400/50" />
            <Globe2 className="relative w-6 h-6 text-cyan-500 dark:text-cyan-300 animate-[spin_24s_linear_infinite] group-hover:text-cyan-400" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-600/70 dark:text-cyan-300/70">LIVE · CUI//SP-EXPT</span>
            <span>CREP — Common Relevant Environmental Picture</span>
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="flex justify-center">
        <Link
          href="/agent"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors min-h-[44px] min-w-[44px]"
        >
          <Bot className="w-4 h-4 shrink-0" />
          For Agents — $1 one-time connection fee for MYCA & Avani Live World State
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      </div>
    </div>
  )
}
