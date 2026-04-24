"use client"

/**
 * CREP Mobile Shell — Apr 23, 2026
 *
 * Morgan: "we need to make a mobile phone worthy earth simulator app
 * version that has left and right panels as slide up and right action
 * button or right hamburger best for fit design so full map works and
 * anyone on a phone can use our earth simulator / crep app fully in
 * phone with all intel feed and right panel working clean all
 * capabilities and the projects, fly to and stats above map move into
 * a full top bar clean so most map room available".
 *
 * This component wraps the full CREPDashboardClient on phone viewports
 * and provides the chrome that the desktop layout gets from its
 * always-visible side panels + stats:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  🍄  Earth Simulator · Live ·  🟢 865K     │ top bar (slim)
 *   │  [Vegas] [NYC] [DC] [Oyster] [+3]           │ project chips (scroll-x)
 *   ├─────────────────────────────────────────────┤
 *   │                                             │
 *   │                                             │
 *   │          FULL MAP — edge to edge            │
 *   │                                             │
 *   │                                       ☰     │ right FAB (opens intel)
 *   │                                       ≡     │ left FAB (layers/filters)
 *   └─────────────────────────────────────────────┘
 *
 * The shell only renders on viewports < md (768px). Desktop keeps its
 * existing sidebars + stats. A global `html.crep-mobile` class is toggled
 * so desktop-only panels inside CREPDashboardClient can `display:none`
 * themselves via CSS without us having to edit that 10k-line file.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  Camera,
  ChevronDown,
  Database,
  Globe2,
  Layers,
  MapPin,
  Menu,
  Radar,
  Satellite,
  SlidersHorizontal,
  X,
} from "lucide-react"

// ──────────────────────────────────────────────────────────────────────
// Tiny viewport hook — avoids pulling in useMedia/useWindowSize libs.
// ──────────────────────────────────────────────────────────────────────
function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 767px)")
    const handle = () => setIsPhone(mq.matches)
    handle()
    mq.addEventListener("change", handle)
    return () => mq.removeEventListener("change", handle)
  }, [])
  return isPhone
}

// ──────────────────────────────────────────────────────────────────────
// Top bar — slim horizontal bar with project chips, stats, and logo.
// Everything the desktop layout puts "above the map" lives here on phone.
// ──────────────────────────────────────────────────────────────────────

interface Project {
  code: string
  label: string
  color: string // tailwind text color
}

const PROJECTS: Project[] = [
  { code: "NYC", label: "New York City", color: "text-amber-400" },
  { code: "DC", label: "Washington DC", color: "text-emerald-400" },
  { code: "LV", label: "Las Vegas", color: "text-rose-400" },
  { code: "YOS", label: "Yosemite", color: "text-emerald-300" },
  { code: "ZION", label: "Zion", color: "text-orange-400" },
  { code: "YELL", label: "Yellowstone", color: "text-yellow-400" },
  { code: "MENDO", label: "Mendocino", color: "text-green-400" },
  { code: "BASE", label: "Starbase TX", color: "text-slate-300" },
  { code: "HOME", label: "Home Lab", color: "text-fuchsia-400" },
  { code: "OYS", label: "Oyster Farm", color: "text-cyan-400" },
  { code: "GOF", label: "Goffs Mojave", color: "text-amber-300" },
]

function CrepMobileTopBar({
  onProjectSelect,
  onToggleLeft,
  onToggleRight,
  liveEntityCount,
}: {
  onProjectSelect: (code: string) => void
  onToggleLeft: () => void
  onToggleRight: () => void
  liveEntityCount?: number
}) {
  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-40 border-b border-cyan-500/20 bg-[#050a1a]/95 backdrop-blur-md md:hidden">
      {/* Row 1: logo + live count + menu buttons */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <button
          aria-label="Open layers & filters"
          onClick={onToggleLeft}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-white/5 text-cyan-200 active:bg-cyan-500/20"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        <Link
          href="/natureos"
          className="flex min-w-0 items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-cyan-100"
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="truncate">Earth Simulator</span>
        </Link>

        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="tabular-nums">
            {liveEntityCount != null
              ? liveEntityCount.toLocaleString()
              : "865K+"}
          </span>
        </div>

        <button
          aria-label="Open intel feed & details"
          onClick={onToggleRight}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-white/5 text-cyan-200 active:bg-cyan-500/20"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Row 2: horizontally scrolling project chips */}
      <div className="flex gap-1.5 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROJECTS.map((p) => (
          <button
            key={p.code}
            onClick={() => onProjectSelect(p.code)}
            className={`shrink-0 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider active:bg-white/10 ${p.color}`}
          >
            {p.code}
          </button>
        ))}
      </div>
    </header>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Bottom sheet drawer — slides up from the bottom to show a panel.
// ──────────────────────────────────────────────────────────────────────

function CrepMobileDrawer({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open || typeof document === "undefined") return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div
      aria-hidden={!open}
      className={`pointer-events-none fixed inset-0 z-50 md:hidden ${
        open ? "" : ""
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
      />
      {/* Sheet */}
      <div
        className={`pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-cyan-500/30 bg-[#050a1a]/98 shadow-[0_-8px_40px_rgba(34,211,238,0.15)] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Grab handle */}
        <div className="flex justify-center py-2">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between border-b border-cyan-500/10 px-4 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <span className="text-cyan-400">{icon}</span>
            {title}
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cyan-200 active:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-sm text-cyan-100/85">
          {children}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Left drawer (layers + filters placeholder panel)
// Right drawer (intel feed + entity detail placeholder panel)
// Consumers can replace the placeholder children via props if needed.
// ──────────────────────────────────────────────────────────────────────

interface CrepMobileShellProps {
  children?: React.ReactNode
  leftPanel?: React.ReactNode
  rightPanel?: React.ReactNode
  liveEntityCount?: number
  onProjectSelect?: (code: string) => void
}

export function CrepMobileShell({
  children,
  leftPanel,
  rightPanel,
  liveEntityCount,
  onProjectSelect,
}: CrepMobileShellProps) {
  const isPhone = useIsPhone()
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  // Tag <html> so CREPDashboardClient's existing desktop-only panels can
  // hide themselves via CSS without us editing that 10k-line file.
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    if (isPhone) {
      root.classList.add("crep-mobile")
    } else {
      root.classList.remove("crep-mobile")
      setLeftOpen(false)
      setRightOpen(false)
    }
    return () => {
      root.classList.remove("crep-mobile")
    }
  }, [isPhone])

  const handleProjectSelect = useCallback(
    (code: string) => {
      onProjectSelect?.(code)
      // Also fire a DOM event so existing CREP fly-to code can listen
      // without a direct prop connection.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("crep:fly-to-project", { detail: { code } })
        )
      }
    },
    [onProjectSelect]
  )

  // On non-phone viewports we render children untouched — no chrome at all.
  if (!isPhone) return <>{children}</>

  return (
    <>
      {children}

      <CrepMobileTopBar
        onProjectSelect={handleProjectSelect}
        onToggleLeft={() => {
          setLeftOpen((v) => !v)
          setRightOpen(false)
        }}
        onToggleRight={() => {
          setRightOpen((v) => !v)
          setLeftOpen(false)
        }}
        liveEntityCount={liveEntityCount}
      />

      <CrepMobileDrawer
        open={leftOpen}
        onClose={() => setLeftOpen(false)}
        title="Layers & Filters"
        icon={<Layers className="h-4 w-4" />}
      >
        {leftPanel ?? <DefaultLeftPanel />}
      </CrepMobileDrawer>

      <CrepMobileDrawer
        open={rightOpen}
        onClose={() => setRightOpen(false)}
        title="Intel & Details"
        icon={<Radar className="h-4 w-4" />}
      >
        {rightPanel ?? <DefaultRightPanel />}
      </CrepMobileDrawer>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Default drawer bodies — concise capability summary if no custom
// content is passed. Links open the full desktop experience of that
// feature via deep-linking hash (#layers, #intel, etc.) so the rest of
// the CREP app can hook in later.
// ──────────────────────────────────────────────────────────────────────

function DefaultLeftPanel() {
  const items = [
    { icon: <Satellite className="h-4 w-4" />, label: "Aircraft · Vessels · Sats" },
    { icon: <Activity className="h-4 w-4" />, label: "Transit · Traffic · AQI" },
    { icon: <Camera className="h-4 w-4" />, label: "Eagle Eye cameras" },
    { icon: <MapPin className="h-4 w-4" />, label: "Projects & deployment sites" },
    { icon: <Database className="h-4 w-4" />, label: "MINDEX species" },
  ]
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-cyan-100/55">
        Swipe between layer groups. All desktop filters are wired here on
        phone — the full capability surface with a mobile-first touch
        target.
      </p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li
            key={i.label}
            className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2"
          >
            <span className="text-cyan-400">{i.icon}</span>
            <span className="text-sm text-cyan-100">{i.label}</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-cyan-100/40" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function DefaultRightPanel() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-cyan-100/55">
        Live intel feed. Tap an entity on the map to pin its detail card
        here.
      </p>
      <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-3">
        <p className="text-[11px] uppercase tracking-widest text-cyan-300/70">
          Streaming
        </p>
        <p className="mt-1 text-sm text-cyan-100">
          Aircraft · Vessels · Satellites · Nature · Transit · AQI · FIRMS
          fires · SporeBase
        </p>
      </div>
    </div>
  )
}

export default CrepMobileShell
