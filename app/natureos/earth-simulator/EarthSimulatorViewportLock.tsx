"use client"

import { useEffect, useRef, type ReactNode } from "react"

export default function EarthSimulatorViewportLock({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyHeight = document.body.style.height
    let lastViewportOffset = -1
    let frame = 0

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    document.body.style.height = "100dvh"

    const updateDashboardHeight = () => {
      frame = 0
      const dashboard = rootRef.current?.querySelector<HTMLElement>(".crep-dashboard-root")
      if (!dashboard) return
      const top = Math.max(0, Math.round(dashboard.getBoundingClientRect().top))
      if (top === lastViewportOffset) return
      lastViewportOffset = top
      dashboard.style.setProperty("--crep-viewport-offset", `${top}px`)
    }
    const scheduleDashboardHeight = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateDashboardHeight)
    }

    updateDashboardHeight()
    const frames = [
      window.requestAnimationFrame(scheduleDashboardHeight),
      window.requestAnimationFrame(() => window.requestAnimationFrame(scheduleDashboardHeight)),
    ]
    const timers = [50, 150, 350, 800, 1500].map((delay) =>
      window.setTimeout(scheduleDashboardHeight, delay),
    )
    const observer = new MutationObserver(scheduleDashboardHeight)
    if (rootRef.current) {
      observer.observe(rootRef.current, { childList: true })
    }
    window.addEventListener("resize", scheduleDashboardHeight)
    window.visualViewport?.addEventListener("resize", scheduleDashboardHeight)

    return () => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame))
      timers.forEach((timer) => window.clearTimeout(timer))
      if (frame) window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", scheduleDashboardHeight)
      window.visualViewport?.removeEventListener("resize", scheduleDashboardHeight)
      const dashboard = rootRef.current?.querySelector<HTMLElement>(".crep-dashboard-root")
      dashboard?.style.removeProperty("--crep-viewport-offset")
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.height = previousBodyHeight
    }
  }, [])

  return (
    <div ref={rootRef} className="relative min-h-dvh min-h-0 overflow-hidden">
      {children}
      <a
        href="/natureos/bluesight-trail"
        className="absolute right-3 top-3 z-40 inline-flex min-h-[44px] items-center rounded-md border border-amber-500/50 bg-zinc-950/80 px-3 text-xs font-medium text-amber-200 backdrop-blur"
      >
        BlueSight Trail · SYNTHETIC EXERCISE
      </a>
    </div>
  )
}
