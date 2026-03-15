"use client"

import Link from "next/link"
import { Bot, ArrowRight } from "lucide-react"
import HeroSearch from "./hero-search"

/**
 * ParallaxSearch - Wraps the homepage hero search (search bar always visible).
 * Updated: March 14, 2026 - Added "For Agents" strip for MYCA/AVANI worldstate monetization.
 */
export default function ParallaxSearch() {
  return (
    <div className="space-y-4">
      <HeroSearch />
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
