/**
 * Responsive display utility components
 *
 * Breakpoints (Tailwind defaults):
 *   Phone portrait  : default  (0–639px)
 *   Phone landscape / small tablet: sm (640px+)
 *   Tablet          : md (768px+)
 *   Desktop         : lg (1024px+)
 *   Large desktop   : xl (1280px+)
 *
 * Usage:
 *   <PhoneOnly>   only phones (<640px)          </PhoneOnly>
 *   <TabletUp>    tablet and above (≥768px)     </TabletUp>
 *   <DesktopOnly> desktop and above (≥1024px)   </DesktopOnly>
 *   <PhoneHidden> hidden on phones, visible ≥640px </PhoneHidden>
 *   <MobileOnly>  phones + small tablets (<768px) </MobileOnly>
 *   <AppOnly>     requires tablet or larger — shows "upgrade" on phone </AppOnly>
 */

import type React from "react"
import { Monitor, Tablet, Smartphone } from "lucide-react"

interface Props {
  children: React.ReactNode
  className?: string
}

/** Visible ONLY on phones (< 640px). Hidden on everything larger. */
export function PhoneOnly({ children, className = "" }: Props) {
  return <div className={`sm:hidden ${className}`}>{children}</div>
}

/** Hidden on phones. Visible on sm (640px) and above. */
export function PhoneHidden({ children, className = "" }: Props) {
  return <div className={`hidden sm:block ${className}`}>{children}</div>
}

/** Visible ONLY on tablets and above (≥ 768px). Hidden on phones. */
export function TabletUp({ children, className = "" }: Props) {
  return <div className={`hidden md:block ${className}`}>{children}</div>
}

/** Visible ONLY on desktop (≥ 1024px). Hidden on phones and tablets. */
export function DesktopOnly({ children, className = "" }: Props) {
  return <div className={`hidden lg:block ${className}`}>{children}</div>
}

/** Visible on phones and tablets (< 1024px). Hidden on desktop. */
export function MobileTabletOnly({ children, className = "" }: Props) {
  return <div className={`lg:hidden ${className}`}>{children}</div>
}

/** Visible on phones AND small tablets (< 768px). Hidden on tablet+. */
export function MobileOnly({ children, className = "" }: Props) {
  return <div className={`md:hidden ${className}`}>{children}</div>
}

/**
 * AppOnly — wraps complex apps that require a tablet or larger screen.
 * On phones: shows a clear "best on tablet/desktop" message with a link.
 * On tablet+: renders children normally.
 *
 * @param title       App name shown in the phone message
 * @param description Short description of what the app does
 */
interface AppOnlyProps extends Props {
  title: string
  description?: string
  href?: string
}

export function AppOnly({ children, title, description, href, className = "" }: AppOnlyProps) {
  return (
    <>
      {/* Phone fallback — shown only on phones */}
      <div className="md:hidden min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-6">
          {/* Device icons */}
          <div className="flex items-center justify-center gap-4">
            <div className="p-3 rounded-xl bg-muted">
              <Tablet className="h-8 w-8 text-primary" />
            </div>
            <div className="p-3 rounded-xl bg-muted">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description ?? "This app requires a tablet or desktop for the full experience. It uses advanced visualizations and real-time data that need more screen space."}
            </p>
          </div>

          {/* What they're missing */}
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Best on tablet or desktop</p>
            <div className="flex items-center gap-2 text-sm">
              <Tablet className="h-4 w-4 text-primary shrink-0" />
              <span>Rotate your phone to landscape for a better view</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary shrink-0" />
              <span>Or open on a tablet / computer for the full experience</span>
            </div>
          </div>

          {/* Back button */}
          <a
            href={href ?? "/natureos"}
            className="inline-flex items-center justify-center gap-2 w-full min-h-[48px] px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform"
          >
            Back to NatureOS
          </a>
        </div>
      </div>

      {/* Tablet+ — full app */}
      <div className={`hidden md:block ${className}`}>{children}</div>
    </>
  )
}

/**
 * PhoneSimplified — shows a simplified version on phone, full version on tablet+.
 * @param phoneFallback  The simplified phone UI
 * @param children       The full tablet/desktop UI
 */
interface PhoneSimplifiedProps {
  phoneFallback: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PhoneSimplified({ phoneFallback, children, className = "" }: PhoneSimplifiedProps) {
  return (
    <>
      <div className={`md:hidden ${className}`}>{phoneFallback}</div>
      <div className={`hidden md:block ${className}`}>{children}</div>
    </>
  )
}
