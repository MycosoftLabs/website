"use client"

/**
 * FUSARIUM console shell — the operator chrome, as a Next layout.
 *
 * This is the chrome the platform already had on the runtime SPA
 * (services/runtime/fusarium_runtime/static/operator/index.html): the
 * classification banner, the FUSARIUM topbar with LOCAL/ZULU clocks, a health
 * strip and the theme toggle, the "Environmental Intelligence / Defense
 * platform" sidebar with collapsible sections, and the bottom status banner.
 * Same markup, same class names, same stylesheet — ported to React so it can
 * host the twin apps directly instead of framing them.
 *
 * It is deliberately NOT the NatureOS shell. FUSARIUM has its own identity —
 * slate and graphite with the desaturated sage accent and the glass surfaces —
 * and the two consoles are not meant to look alike.
 *
 * Everything is wrapped in .fx-chrome, and fusarium-operator.css scopes every
 * rule to that class. The scoping is load-bearing, not tidiness: the operator
 * stylesheet styles bare elements and generic class names, and when it was
 * unscoped it reached into the CREP dashboard and broke its layout. The app in
 * the workspace must be untouched by the chrome around it.
 */

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme as useNextTheme } from "next-themes"
import { FusariumNav } from "@/components/fusarium/fusarium-nav"
import { findFusariumApp } from "@/components/fusarium/fusarium-catalog"
import {
  ClassificationFloorControl,
  ClassificationNotice,
  ClassificationProvider,
  useClassification,
} from "@/components/fusarium/fusarium-classification"
import { FusariumAccountControl } from "@/components/fusarium/fusarium-account-control"

/** Routes whose workspace is a full-bleed app and must not get chrome padding. */
function isAppRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/fusarium/earth-simulator") ||
    pathname.startsWith("/fusarium/aerosol") ||
    pathname.startsWith("/fusarium/crep") ||
    pathname.startsWith("/fusarium/gcs")
  )
}

/**
 * The clocks own their state, in their own component, on purpose.
 *
 * This used to be a useClocks() hook called by the chrome, which meant a
 * setState EVERY SECOND on the component that renders the topbar, the 45-item
 * sidebar and the workspace. React does bail out of re-rendering `children`
 * (same element reference), so the Earth Simulator itself was spared — but the
 * chrome around it, including 45 Links and 45 icons, re-rendered once a second
 * while a WebGL globe was competing for the same main thread.
 *
 * Isolating it means the per-second render is this one <time> pair and nothing
 * else. Same for the health strip below.
 */
function Clocks() {
  const [t, setT] = useState<{ local: string; zulu: string }>({ local: "—", zulu: "—" })
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setT({ local: d.toLocaleTimeString(), zulu: d.toISOString().slice(11, 19) + "Z" })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="clocks" aria-label="Time">
      <span>
        <em>LOCAL</em> {t.local}
      </span>
      <span>
        <em>ZULU</em> {t.zulu}
      </span>
    </div>
  )
}

/** Health reads the Fusarium runtime, the same bind the SPA used. Isolated for
 *  the same reason as the clocks: a 15s poll should not re-render the console. */
function useRuntimeHealth() {
  const [health, setHealth] = useState("CONNECTING")
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await fetch("/api/fusarium/operator/state", { cache: "no-store", credentials: "same-origin" })
        if (!res.ok) {
          if (alive) setHealth("RUNTIME DEGRADED")
          return
        }
        const data = (await res.json()) as { status?: string }
        if (alive) setHealth(data.status === "live" ? "LIVE UNCLASSIFIED" : "RUNTIME UNREACHABLE")
      } catch {
        if (alive) setHealth("RUNTIME UNREACHABLE")
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return health
}

function HealthStrip() {
  const health = useRuntimeHealth()
  return <div className={`health${health === "LIVE UNCLASSIFIED" ? " ok" : ""}`}>{health}</div>
}


/**
 * One theme, one source of truth.
 *
 * next-themes owns it. It is already mounted in the root layout, it writes
 * `html.dark` before first paint, and the whole cloned app tree — CREP
 * included — reads that class. The chrome reads the same class.
 *
 * The earlier version kept its own `data-theme` attribute and toggled it
 * directly. next-themes simply put the class back on its next render, so the
 * console went light while the dashboard inside it stayed dark. Driving
 * next-themes instead makes that state unrepresentable.
 *
 * `data-theme` is still mirrored, because the same stylesheet also runs on the
 * standalone runtime SPA, which has no next-themes.
 */
function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!resolvedTheme) return
    document.documentElement.setAttribute("data-theme", resolvedTheme)
    try {
      localStorage.setItem("fusarium-theme", resolvedTheme)
    } catch {
      /* not fatal — the SPA falls back to the OS preference */
    }
  }, [resolvedTheme])

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  // Before mount the server and client can disagree on the resolved theme;
  // render the neutral label rather than a wrong one.
  return { theme: mounted ? (resolvedTheme as "light" | "dark" | undefined) : undefined, toggle }
}

/**
 * The provider has to sit ABOVE the chrome, because the banners, the outline and
 * the segmented control all read the same level.
 */
export default function FusariumLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ClassificationProvider>
      <FusariumChrome>{children}</FusariumChrome>
    </ClassificationProvider>
  )
}

function FusariumChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/fusarium"
  const { theme, toggle } = useTheme()
  const [navOpen, setNavOpen] = useState(false)
  // Collapse the whole rail to icons, the way NatureOS does. Persisted, because
  // an operator who reclaims the width expects it to stay reclaimed.
  const [railCollapsed, setRailCollapsed] = useState(false)
  const { level } = useClassification()

  useEffect(() => {
    try {
      setRailCollapsed(localStorage.getItem("fusarium-rail") === "collapsed")
    } catch {
      /* storage blocked — default expanded */
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.add("fusarium-operator")
    document.body.classList.add("fusarium-operator")
    return () => {
      document.documentElement.classList.remove("fusarium-operator")
      document.body.classList.remove("fusarium-operator")
    }
  }, [])

  const toggleRail = useCallback(() => {
    setRailCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("fusarium-rail", next ? "collapsed" : "open")
      } catch {
        /* not fatal */
      }
      return next
    })
  }, [])

  // Close the mobile drawer on navigation, exactly as the SPA did.
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  const current = findFusariumApp(pathname)

  return (
    <div className="fx-chrome" data-classification={level.id}>
      <div className="banner banner-top" role="status">
        {level.banner}
      </div>

      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Toggle platform menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          ☰
        </button>

        <div className="brand">
          <Link href="/fusarium" className="mark">
            FUSARIUM
          </Link>
          <span className="sub">
            {current ? `${current.section} · ${current.title}` : "Operational Environmental Intelligence"}
          </span>
        </div>

        <Clocks />

        <ClassificationFloorControl />

        <HealthStrip />

        <FusariumAccountControl />

        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-label="Switch between light and dark theme"
        >
          {theme ? theme.toUpperCase() : "THEME"}
        </button>
      </header>

      <div className="workbench">
        <aside
          className={`sidebar${navOpen ? " open" : ""}${railCollapsed ? " collapsed" : ""}`}
          id="sidebar"
          aria-label="Platform navigation"
        >
          <div className="sidebar-head">
            <div className="sidebar-head-text">
              <strong>Environmental Intelligence</strong>
              <span>Defense platform</span>
            </div>
            <button
              type="button"
              className="rail-toggle"
              onClick={toggleRail}
              aria-expanded={!railCollapsed}
              aria-controls="sidebar-nav"
              title={railCollapsed ? "Expand navigation" : "Collapse navigation to icons"}
            >
              <span aria-hidden="true">{railCollapsed ? "»" : "«"}</span>
              <span className="sr-only">
                {railCollapsed ? "Expand navigation" : "Collapse navigation to icons"}
              </span>
            </button>
          </div>
          <nav id="sidebar-nav">
            <FusariumNav collapsed={railCollapsed} />
          </nav>
        </aside>

        <div
          className={`scrim${navOpen ? " show" : ""}`}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />

        {/* An app route gets a bare, full-size surface: no chrome padding and no
            scroll context, so the dashboard lays out against the frame itself. */}
        {/* The notice never goes inside an app workspace.
            .workspace--app is a flex column whose children are told to fill it,
            so a notice rendered there became a second full-height pane and the
            Earth Simulator got what was left. On an app route the marking is
            already unmissable — the banner top and bottom and the coloured
            outline down both edges — so the explanatory strip is redundant
            there and is simply not rendered. */}
        <main className={`workspace${isAppRoute(pathname) ? " workspace--app" : ""}`} aria-live="polite">
          {isAppRoute(pathname) ? null : <ClassificationNotice />}
          {children}
        </main>
      </div>

      <footer className="banner banner-bottom">{level.banner}</footer>
    </div>
  )
}
