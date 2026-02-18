"use client"

/**
 * CREPDashboardLoader
 *
 * Phone    : "Requires tablet/desktop" — WebGL + Deck.gl maps can't
 *             render usefully on small screens.
 * Tablet+  : Full CREP map with entity overlays, satellites, aircraft, vessels.
 */

import nextDynamic from "next/dynamic"
import { RefreshCw, Map, Monitor, Tablet } from "lucide-react"
import Link from "next/link"

const CREPDashboardClient = nextDynamic(
  () => import("./CREPDashboardClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

function CREPPhoneFallback() {
  return (
    <div className="min-h-dvh bg-[#0a0f1e] flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center gap-4">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <Map className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">CREP Dashboard</h2>
          <p className="text-blue-300/80 text-sm leading-relaxed">
            The Common Relevant Environmental Picture uses a real-time 3D globe with
            satellite tracks, aircraft, and vessel overlays that require a tablet or
            desktop display.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-3">
          <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-wide">Best on tablet or desktop</p>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Tablet className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Rotate to landscape for a preview on this device</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Monitor className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Full WebGL map experience on desktop</span>
          </div>
        </div>
        <Link
          href="/natureos"
          className="inline-flex items-center justify-center gap-2 w-full min-h-[48px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium active:scale-95 transition-all"
        >
          Back to NatureOS
        </Link>
      </div>
    </div>
  )
}

export default function CREPDashboardLoader() {
  return (
    <>
      {/* Phone: simplified message */}
      <div className="md:hidden">
        <CREPPhoneFallback />
      </div>
      {/* Tablet+: full WebGL dashboard */}
      <div className="hidden md:block">
        <CREPDashboardClient />
      </div>
    </>
  )
}
