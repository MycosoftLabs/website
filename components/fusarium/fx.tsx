"use client"

/**
 * FUSARIUM glass primitives.
 *
 * The button is the Petri dish simulator's, structurally identical:
 *
 *   <span class="fx-btn-wrap">
 *     <button class="fx-btn"><span>Label</span></button>
 *     <span class="fx-btn-shadow" aria-hidden="true"></span>
 *   </span>
 *
 * The wrapper and the shadow sibling are not decoration — the resting lift, the
 * hover rise and the press depression are all built from the three elements
 * moving against each other. A bare `<button class="fx-btn">` renders flat.
 *
 * A `<span>` wrapper, not a `<div>`: these buttons sit inside paragraphs and
 * inline rows, and a block element there gets hoisted out by the HTML parser —
 * which once pushed a whole page sideways.
 */

import Link from "next/link"
import type { ReactNode } from "react"

export function FxButton({
  children,
  onClick,
  disabled,
  type = "button",
  ...rest
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <span className="fx-btn-wrap">
      <button type={type} className="fx-btn" onClick={onClick} disabled={disabled} {...rest}>
        <span>{children}</span>
      </button>
      <span className="fx-btn-shadow" aria-hidden="true" />
    </span>
  )
}

/** Navigation variant — same chrome, an anchor rather than an action. */
export function FxLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <span className="fx-btn-wrap">
      <Link className="fx-btn" href={href}>
        <span>{children}</span>
      </Link>
      <span className="fx-btn-shadow" aria-hidden="true" />
    </span>
  )
}

/** A frosted panel. The console's main content surface. */
export function FxPanel({
  title,
  children,
  actions,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="fx-panel">
      {title || actions ? (
        <header className="fx-panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions ? <div className="fx-panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="fx-panel-body">{children}</div>
    </section>
  )
}

/** A transparent tile for a single figure. */
export function FxTile({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="glass-tile fx-tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {hint ? <div className="tile-hint">{hint}</div> : null}
    </div>
  )
}

export function FxTiles({ children }: { children: ReactNode }) {
  return <div className="fx-tiles">{children}</div>
}

/**
 * Page header.
 *
 * `binds` names the live API bindings the runtime declares for this workspace.
 * When there are none it says so — an empty workspace with no explanation reads
 * as "this app has no data", which is a different and untrue claim.
 */
export function FxPageHead({
  title,
  blurb,
  binds,
}: {
  title: string
  blurb?: string
  binds?: string[]
}) {
  return (
    <header className="fx-page-head">
      <h1>{title}</h1>
      {blurb ? <p className="fx-lede">{blurb}</p> : null}
      <p className="fx-hint">
        This is the Fusarium instance of this workspace. It holds defense-side data only and does
        not read from, or write to, the civilian deployment.
      </p>
      <p className="fx-hint">
        {binds && binds.length > 0
          ? `Live binds: ${binds.join(" · ")}`
          : "No live bind yet. The workspace stays empty rather than inventing data."}
      </p>
    </header>
  )
}

/** Label/value rows. `tone` marks a value that is holding vs one never set. */
export function FxMeta({ rows }: { rows: [string, string, ("holds" | "unset")?][] }) {
  return (
    <dl className="fx-meta">
      {rows.map(([k, v, tone]) => (
        <div key={k} className="fx-meta-row">
          <dt>{k}</dt>
          <dd className={`fx-meta-value${tone ? ` fx-meta-${tone}` : ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
