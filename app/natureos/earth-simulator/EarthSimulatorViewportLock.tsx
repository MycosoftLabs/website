"use client"

import { useEffect, useRef, type ReactNode } from "react"

export default function EarthSimulatorViewportLock({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyHeight = document.body.style.height

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    document.body.style.height = "100dvh"

    const updateDashboardHeight = () => {
      const dashboard = rootRef.current?.querySelector<HTMLElement>(".crep-dashboard-root")
      if (!dashboard) return
      const top = Math.max(0, Math.round(dashboard.getBoundingClientRect().top))
      dashboard.style.setProperty("--crep-viewport-offset", `${top}px`)
    }

    updateDashboardHeight()
    const frames = [
      window.requestAnimationFrame(updateDashboardHeight),
      window.requestAnimationFrame(() => window.requestAnimationFrame(updateDashboardHeight)),
    ]
    const timers = [50, 150, 350, 800, 1500].map((delay) =>
      window.setTimeout(updateDashboardHeight, delay),
    )
    const observer = new MutationObserver(updateDashboardHeight)
    if (rootRef.current) {
      observer.observe(rootRef.current, { childList: true, subtree: true })
    }
    window.addEventListener("resize", updateDashboardHeight)

    return () => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame))
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
      window.removeEventListener("resize", updateDashboardHeight)
      const dashboard = rootRef.current?.querySelector<HTMLElement>(".crep-dashboard-root")
      dashboard?.style.removeProperty("--crep-viewport-offset")
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.height = previousBodyHeight
    }
  }, [])

  return (
    <div ref={rootRef} className="min-h-0 overflow-hidden">
      {children}
    </div>
  )
}
