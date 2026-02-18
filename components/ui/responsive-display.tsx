"use client"

/**
 * Responsive Display Utilities
 *
 * Tier 1 — Phone   (< 640px  / default → sm):  Bare minimum, no WebGL/canvas/complex UI
 * Tier 2 — Tablet  (640-1023px / sm → lg):      Condensed but functional
 * Tier 3 — Desktop (≥ 1024px  / lg+):           Full experience
 *
 * Usage:
 *   <PhoneOnly>  shown only on phones  </PhoneOnly>
 *   <TabletUp>   shown on tablet and above  </TabletUp>
 *   <DesktopOnly> shown only on desktop  </DesktopOnly>
 *   <PhoneHidden> hidden on phones, visible tablet+  </PhoneHidden>
 *   <TabletDown>  hidden on desktop, visible phone+tablet  </TabletDown>
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Props {
  children: ReactNode
  className?: string
}

/** Only visible on phones (< 640px) */
export function PhoneOnly({ children, className }: Props) {
  return <div className={cn("sm:hidden", className)}>{children}</div>
}

/** Visible on tablet and above (≥ 640px) */
export function TabletUp({ children, className }: Props) {
  return <div className={cn("hidden sm:block", className)}>{children}</div>
}

/** Only visible on desktop (≥ 1024px) */
export function DesktopOnly({ children, className }: Props) {
  return <div className={cn("hidden lg:block", className)}>{children}</div>
}

/** Hidden on phones, visible tablet+ (≥ 640px) */
export function PhoneHidden({ children, className }: Props) {
  return <div className={cn("hidden sm:block", className)}>{children}</div>
}

/** Visible on phones and tablets, hidden on desktop (< 1024px) */
export function TabletDown({ children, className }: Props) {
  return <div className={cn("lg:hidden", className)}>{children}</div>
}

/** Only visible on tablets (640–1023px) */
export function TabletOnly({ children, className }: Props) {
  return <div className={cn("hidden sm:block lg:hidden", className)}>{children}</div>
}

/**
 * RequiresTablet
 * Wraps heavy apps (WebGL, canvas, oscilloscopes) that cannot function on phones.
 * Shows a clean "open on tablet/desktop" message on phones.
 */
export function RequiresTablet({
  children,
  appName = "This app",
  reason = "requires a larger screen for the best experience.",
}: {
  children: ReactNode
  appName?: string
  reason?: string
}) {
  return (
    <>
      {/* Phone fallback */}
      <div className="sm:hidden flex flex-col items-center justify-center min-h-dvh bg-background text-center px-6 py-12 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-bold">{appName}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {reason}
          </p>
          <p className="text-muted-foreground text-sm">
            Please open this page on a <strong>tablet</strong> or <strong>desktop</strong> for the full experience.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            ← Back to Home
          </a>
          <a
            href="/devices"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border text-sm font-medium"
          >
            Browse Devices
          </a>
        </div>
      </div>
      {/* Tablet and above: show full app */}
      <div className="hidden sm:block">{children}</div>
    </>
  )
}
