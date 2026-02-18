/**
 * Responsive Gate Components
 *
 * Use these to show/hide content based on screen size WITHOUT JavaScript —
 * all gates use CSS only (Tailwind) so there is zero layout shift.
 *
 * Breakpoints:
 *   Phone:   < 640px  (default / no prefix)
 *   Tablet:  640–1023px (sm)
 *   Desktop: ≥ 1024px  (lg)
 *
 * Usage:
 *   <PhoneOnly>   shown only on phones   </PhoneOnly>
 *   <TabletUp>    shown on tablet+        </TabletUp>
 *   <DesktopOnly> shown only on desktop   </DesktopOnly>
 *   <PhoneHidden> hidden on phones        </PhoneHidden>
 *   <TabletDown>  shown on phone + tablet </TabletDown>
 */

import type React from "react"
import { cn } from "@/lib/utils"

interface GateProps {
  children: React.ReactNode
  className?: string
}

/** Visible only on phones (< 640px). Hidden on tablet and desktop. */
export function PhoneOnly({ children, className }: GateProps) {
  return <div className={cn("sm:hidden", className)}>{children}</div>
}

/** Visible on tablet and desktop (≥ 640px). Hidden on phones. */
export function TabletUp({ children, className }: GateProps) {
  return <div className={cn("hidden sm:block", className)}>{children}</div>
}

/** Visible only on desktop (≥ 1024px). Hidden on phone and tablet. */
export function DesktopOnly({ children, className }: GateProps) {
  return <div className={cn("hidden lg:block", className)}>{children}</div>
}

/** Hidden on phones. Visible on tablet and desktop. Same as TabletUp but semantic alias. */
export function PhoneHidden({ children, className }: GateProps) {
  return <div className={cn("hidden sm:block", className)}>{children}</div>
}

/** Visible on phone and tablet (< 1024px). Hidden on desktop. */
export function TabletDown({ children, className }: GateProps) {
  return <div className={cn("lg:hidden", className)}>{children}</div>
}

/** Visible only on tablet (640–1023px). Hidden on phone and desktop. */
export function TabletOnly({ children, className }: GateProps) {
  return <div className={cn("hidden sm:block lg:hidden", className)}>{children}</div>
}

/**
 * RequiresTablet — Displays a "requires tablet or desktop" message on phones.
 * Shows the full content on tablet+.
 *
 * Use for: WebGL maps, oscilloscopes, spectrum analyzers, 3D canvases,
 *          complex data dashboards that cannot be meaningfully compressed.
 */
export function RequiresTablet({
  children,
  appName = "This feature",
  className,
}: GateProps & { appName?: string }) {
  return (
    <>
      {/* Phone: friendly upgrade prompt */}
      <div className={cn("sm:hidden flex flex-col items-center justify-center min-h-[60dvh] px-6 py-12 text-center", className)}>
        <div className="mb-6 p-5 rounded-2xl bg-muted border">
          <svg viewBox="0 0 24 24" className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="9" y1="21" x2="15" y2="21" />
            <rect x="9" y="8" width="6" height="8" rx="1" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">{appName}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This interface uses advanced visualizations that work best on a tablet or larger screen.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Rotate your phone to landscape, or open on a tablet or computer for the full experience.
        </p>
      </div>
      {/* Tablet+: full content */}
      <div className="hidden sm:block h-full">{children}</div>
    </>
  )
}

/**
 * RequiresDesktop — Shows on desktop only. Phone and tablet see an upgrade prompt.
 */
export function RequiresDesktop({
  children,
  appName = "This feature",
  className,
}: GateProps & { appName?: string }) {
  return (
    <>
      {/* Phone + Tablet: prompt */}
      <div className={cn("lg:hidden flex flex-col items-center justify-center min-h-[60dvh] px-6 py-12 text-center", className)}>
        <div className="mb-6 p-5 rounded-2xl bg-muted border">
          <svg viewBox="0 0 24 24" className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <line x1="8" y1="20" x2="16" y2="20" />
            <line x1="12" y1="18" x2="12" y2="20" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">{appName}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This interface requires a desktop-sized screen for the full experience.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Open on a laptop or desktop computer to access this feature.
        </p>
      </div>
      {/* Desktop: full content */}
      <div className="hidden lg:block h-full">{children}</div>
    </>
  )
}
