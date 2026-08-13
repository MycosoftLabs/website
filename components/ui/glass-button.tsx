"use client"

import Link from "next/link"
import type { ReactNode } from "react"

/**
 * GlassButton — the Petri-dish simulator's liquid-glass button, anywhere.
 *
 * The simulator's Start/Reset control is the house reference for this style:
 * frosted plate, animated conic border, a hover scale, and a real depress that
 * rotates the button back in 3D and collapses its shadow. That chrome lives in
 * globals.css under `.myco-glass-button` — the SAME rules the simulator uses,
 * aliased rather than copied, so the two can never drift apart.
 *
 * The DOM shape is load-bearing. The CSS keys off it:
 *   .myco-glass-button          scope + 3D perspective
 *     .button-wrap              takes the rotate3d on :active
 *       button | a              the glass plate itself
 *         span                  label; carries the animated border via ::after
 *       .button-shadow          drop shadow, collapses under the press
 *
 * Renders an <a> when `href` is set (internal links go through next/link) and a
 * <button> otherwise; the styling is identical either way.
 */

/**
 * One flat interface rather than a discriminated union: this project compiles
 * with `strictNullChecks` off, so `href?: undefined` is not a discriminant TS
 * can narrow on and every union branch stays live. `href` decides the element
 * at runtime; the link-only and button-only fields are simply ignored on the
 * branch that does not apply.
 */
interface GlassButtonProps {
  children: ReactNode
  /** Extra classes on the outer scope, e.g. sizing or margins. */
  className?: string
  /** Analytics hook, forwarded to the interactive element. */
  dataAnalytics?: string
  /** Present → renders an anchor; absent → renders a button. */
  href?: string
  /** Link only: open in a new tab. */
  external?: boolean
  /** Button only. */
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}

export function GlassButton(props: GlassButtonProps) {
  const { children, className = "", dataAnalytics } = props

  const inner = <span>{children}</span>

  let control: ReactNode
  if (props.href) {
    control = props.external ? (
      <a href={props.href} target="_blank" rel="noopener noreferrer" data-analytics={dataAnalytics}>
        {inner}
      </a>
    ) : (
      <Link href={props.href} data-analytics={dataAnalytics}>
        {inner}
      </Link>
    )
  } else {
    control = (
      <button
        type={props.type ?? "button"}
        onClick={props.onClick}
        disabled={props.disabled}
        data-analytics={dataAnalytics}
      >
        {inner}
      </button>
    )
  }

  return (
    <span className={`myco-glass-button ${className}`}>
      <span className="button-wrap">
        {control}
        <span className="button-shadow" />
      </span>
    </span>
  )
}

/**
 * GlassChip — the same resting glass as GlassButton, as a label.
 *
 * Used for the section eyebrows ("THE INTELLIGENCE CORE", "THE PHYSICAL
 * NETWORK", …). It reuses the identical chrome so the page has one glass
 * language, but a heading label is not a control: no hover lift, no depress,
 * default cursor, and nothing focusable. The markup keeps the same wrap and
 * shadow elements the CSS expects; only the interactive element is swapped for
 * a plain span.
 */
export function GlassChip({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`myco-glass-button myco-glass-button--static ${className}`}>
      <span className="button-wrap">
        <span className="glass-chip">
          <span>{children}</span>
        </span>
        <span className="button-shadow" />
      </span>
    </span>
  )
}

export default GlassButton
