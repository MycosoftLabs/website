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
import { MYCAProvider } from "@/contexts/myca-context"
import { CREPProvider } from "@/contexts/crep-context"
import { GroundStationProvider } from "@/lib/ground-station/context"
import { CREPErrorBoundary } from "@/components/crep/crep-error-boundary"

/**
 * CREP loading screen — animated rotating globe with live data pings.
 * No mention of build errors or internal infrastructure. Just a smooth,
 * cinematic pre-load that signals "data is streaming in" to the viewer.
 */
function CrepLoadingGlobe() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#050a1a] via-[#0a0f1e] to-[#0a1628] flex flex-col items-center justify-center gap-6 px-6 text-center overflow-hidden relative">
      {/* Starfield backdrop — subtle twinkling dots */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute block w-[2px] h-[2px] bg-cyan-300/80 rounded-full animate-[twinkle_3s_ease-in-out_infinite]"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 61) % 100}%`,
              animationDelay: `${(i * 83) % 3000}ms`,
            }}
          />
        ))}
      </div>

      {/* Globe with rotating meridians + data pings */}
      <div className="relative w-40 h-40 [perspective:800px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#134e4a,#0a1628_70%)] shadow-[0_0_60px_rgba(34,211,238,0.25),inset_0_0_40px_rgba(6,182,212,0.15)]" />
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full animate-[spin_14s_linear_infinite] opacity-80">
          <defs>
            <linearGradient id="merGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="98" stroke="url(#merGrad)" strokeWidth="0.6" fill="none" />
          {/* Latitude lines (flattened ellipses) */}
          {[30, 60, 90, 120, 150].map((y) => (
            <ellipse key={y} cx="100" cy={y} rx="98" ry={Math.abs(100 - y) * 0.8} stroke="url(#merGrad)" strokeWidth="0.5" fill="none" opacity="0.45" />
          ))}
          {/* Longitude lines (rotated ellipses) */}
          {[0, 30, 60, 90, 120, 150].map((r) => (
            <ellipse
              key={r}
              cx="100"
              cy="100"
              rx="98"
              ry="98"
              transform={`rotate(${r} 100 100) scale(0.3 1) translate(${100 * 0.7 / 0.3}, 0) scale(${1 / 0.3} 1) translate(-100, 0)`}
              stroke="url(#merGrad)"
              strokeWidth="0.4"
              fill="none"
              opacity="0.25"
            />
          ))}
        </svg>
        {/* Data-ping dots around the globe — spawn, pulse, fade */}
        {[
          { top: "22%", left: "30%", delay: "0ms", color: "bg-sky-400" },
          { top: "48%", left: "68%", delay: "600ms", color: "bg-emerald-400" },
          { top: "70%", left: "35%", delay: "1200ms", color: "bg-amber-400" },
          { top: "35%", left: "75%", delay: "1800ms", color: "bg-violet-400" },
          { top: "60%", left: "20%", delay: "400ms", color: "bg-cyan-300" },
          { top: "25%", left: "55%", delay: "2400ms", color: "bg-pink-400" },
        ].map((p, i) => (
          <span
            key={i}
            className={`absolute w-2 h-2 rounded-full ${p.color} animate-[crepPing_1.8s_ease-out_infinite]`}
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}
      </div>

      {/* Label + sub-text */}
      <div className="relative max-w-md space-y-2">
        <p className="text-sm font-mono font-medium text-cyan-100/95 tracking-wider uppercase">
          Streaming live data
        </p>
        <p className="text-[11px] text-cyan-200/55 leading-relaxed">
          Aircraft · Vessels · Satellites · Nature · Infrastructure
        </p>
      </div>

      {/* Keyframes — scoped via <style> so we don't touch global CSS */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes crepPing {
          0%   { transform: scale(0.3); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

const CREPDashboardClient = nextDynamic(
  () => import("./CREPDashboardClient"),
  {
    ssr: false,
    loading: () => <CrepLoadingGlobe />,
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
        <MYCAProvider>
          <CREPProvider>
            <GroundStationProvider>
              <CREPErrorBoundary componentName="CREP Dashboard">
                <CREPDashboardClient />
              </CREPErrorBoundary>
            </GroundStationProvider>
          </CREPProvider>
        </MYCAProvider>
      </div>
    </>
  )
}
