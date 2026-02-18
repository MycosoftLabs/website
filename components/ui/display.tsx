/**
 * Display utility components — mobile-first breakpoint gates
 *
 * Breakpoints:
 *   Phone portrait  : default (0px+)   < sm (640px)
 *   Phone landscape : sm (640px+)      < md (768px)
 *   Tablet          : md (768px+)      < lg (1024px)
 *   Desktop         : lg (1024px+)
 *
 * Usage:
 *   <PhoneOnly>    Only visible on phones (< 640px)       </PhoneOnly>
 *   <TabletUp>     Visible on tablet + desktop (≥ 640px)  </TabletUp>
 *   <TabletOnly>   Visible on tablet only (640–1023px)    </TabletOnly>
 *   <DesktopOnly>  Only visible on desktop (≥ 1024px)     </DesktopOnly>
 *   <PhoneHidden>  Hidden on phones, visible ≥ 640px      </PhoneHidden>
 *   <MobileHidden> Hidden on phone+tablet, visible ≥ 1024px </MobileHidden>
 */

import type React from "react"
import { cn } from "@/lib/utils"

interface DisplayProps {
  children: React.ReactNode
  className?: string
}

/** Only on phones — hidden on tablet and desktop */
export function PhoneOnly({ children, className }: DisplayProps) {
  return (
    <div className={cn("sm:hidden", className)}>
      {children}
    </div>
  )
}

/** Tablet and above — hidden on phones */
export function TabletUp({ children, className }: DisplayProps) {
  return (
    <div className={cn("hidden sm:block", className)}>
      {children}
    </div>
  )
}

/** Tablet only — hidden on phone and desktop */
export function TabletOnly({ children, className }: DisplayProps) {
  return (
    <div className={cn("hidden sm:block lg:hidden", className)}>
      {children}
    </div>
  )
}

/** Desktop only — hidden on phone and tablet */
export function DesktopOnly({ children, className }: DisplayProps) {
  return (
    <div className={cn("hidden lg:block", className)}>
      {children}
    </div>
  )
}

/** Hidden on phones (< 640px), visible on tablet+ */
export function PhoneHidden({ children, className }: DisplayProps) {
  return (
    <div className={cn("hidden sm:block", className)}>
      {children}
    </div>
  )
}

/** Hidden on phone + tablet (< 1024px), visible on desktop only */
export function MobileHidden({ children, className }: DisplayProps) {
  return (
    <div className={cn("hidden lg:block", className)}>
      {children}
    </div>
  )
}

/**
 * MobileFeatureGate
 *
 * Use for complex apps (oscilloscopes, WebGL maps, physics canvas) that
 * cannot be meaningfully compressed for phones or small tablets.
 *
 * On phone  : Shows a "best experienced on a larger screen" message
 * On tablet : Optional simplified view (pass tabletContent) or same gate
 * On desktop: Shows the real content
 *
 * Props:
 *   children         — full-featured content (tablet+ or desktop+)
 *   phoneMessage     — custom message for phone users
 *   phoneTitle       — custom title
 *   requiresDesktop  — if true, also gates tablet (requires lg+)
 *   tabletContent    — optional simplified tablet view
 *   icon             — emoji or icon character for the gate screen
 */
interface FeatureGateProps {
  children: React.ReactNode
  phoneTitle?: string
  phoneMessage?: string
  requiresDesktop?: boolean
  tabletContent?: React.ReactNode
  icon?: string
  ctaLabel?: string
  ctaHref?: string
}

export function MobileFeatureGate({
  children,
  phoneTitle = "Best on a Larger Screen",
  phoneMessage = "This feature is designed for tablet and desktop. Open it on a larger device for the full experience.",
  requiresDesktop = false,
  tabletContent,
  icon = "🖥️",
  ctaLabel = "Go Back",
  ctaHref = "/natureos",
}: FeatureGateProps) {
  const gateBreakpoint = requiresDesktop ? "lg" : "sm"
  const gateClass = requiresDesktop ? "lg:hidden" : "sm:hidden"
  const contentClass = requiresDesktop ? "hidden lg:block" : "hidden sm:block"

  return (
    <>
      {/* Phone (and tablet if requiresDesktop) gate screen */}
      <div className={`${gateClass} flex min-h-dvh flex-col items-center justify-center text-center px-6 py-12 bg-background`}>
        <div className="max-w-sm mx-auto space-y-6">
          <div className="text-6xl mb-2">{icon}</div>
          <div>
            <h2 className="text-2xl font-bold mb-3">{phoneTitle}</h2>
            <p className="text-muted-foreground leading-relaxed">{phoneMessage}</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
            >
              {ctaLabel}
            </a>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg border font-medium text-sm text-muted-foreground"
            >
              ← Go Back
            </button>
          </div>
          {/* Hint to rotate */}
          <p className="text-xs text-muted-foreground/60 pt-2">
            {requiresDesktop
              ? "Try on a tablet or desktop browser"
              : "Rotate your device to landscape for a better experience"}
          </p>
        </div>
      </div>

      {/* Tablet simplified content (if provided and not requiresDesktop) */}
      {tabletContent && !requiresDesktop && (
        <div className="hidden sm:block lg:hidden">
          {tabletContent}
        </div>
      )}

      {/* Full-featured content */}
      <div className={contentClass}>
        {children}
      </div>
    </>
  )
}
