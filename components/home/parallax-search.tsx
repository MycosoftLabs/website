"use client"

import Link from "next/link"
import { Bot, ArrowRight } from "lucide-react"
import HeroSearch from "./hero-search"

/**
 * ParallaxSearch - Wraps the homepage hero search (search bar always visible).
 *
 * Updated:
 *   - Mar 14, 2026: Added "For Agents" strip for MYCA/AVANI worldstate.
 *   - Apr 17, 2026: Added standalone CREP instant-access pill.
 *   - Apr 18, 2026: CREP pill REMOVED. Earth Simulator entry moved into
 *     the search bar itself (Globe2 icon beside voice + submit). Product
 *     naming plan:
 *       • Public / NatureOS users → "Earth Simulator" (same underlying
 *         CREP engine; civilian framing)
 *       • FUSARIUM users → "CREP" with military data overlays
 *     For now both route to /dashboard/crep; naming diverges at the
 *     destination page once the /earth-simulator consumer route ships.
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
