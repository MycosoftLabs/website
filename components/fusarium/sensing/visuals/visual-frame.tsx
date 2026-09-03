import type { ReactNode } from "react"
import type { VisualDataState, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import styles from "./sensing-visuals.module.css"

export function VisualFrame({ title, subtitle, state, unit, provenance, children, emptyMessage, legend }: { title: string; subtitle?: string; state: VisualDataState; unit?: string; provenance?: VisualProvenance; children?: ReactNode; emptyMessage?: string; legend?: ReactNode }) {
  const ready = state === "ready" || state === "stale"
  return <section className={styles.panel} data-visual-state={state} aria-label={title}>
    <header className={styles.header}><div><h3 className={styles.title}>{title}</h3>{subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}<p className={styles.meta}>{[provenance?.mode, unit, provenance?.sourceId, provenance?.observedAt].filter(Boolean).join(" · ") || "No source bound"}</p></div><span className={styles.badge} data-state={state}>{state}</span></header>
    <div className={styles.chart}>{ready && children ? children : <div className={styles.idle}>{emptyMessage ?? (state === "idle" ? "Waiting for supplied samples." : "No verified sample series is bound for this scope.")}</div>}</div>
    {ready && legend ? <div className={styles.legend}>{legend}</div> : null}
  </section>
}

export function ChartGrid({ width = 600, height = 180 }: { width?: number; height?: number }) {
  return <g aria-hidden="true">{[.2,.4,.6,.8].map((ratio)=><line key={`h${ratio}`} className={styles.grid} x1="0" x2={width} y1={height*ratio} y2={height*ratio}/>)}{[.2,.4,.6,.8].map((ratio)=><line key={`v${ratio}`} className={styles.grid} y1="0" y2={height} x1={width*ratio} x2={width*ratio}/>)}<line className={styles.axis} x1="0" x2={width} y1={height-1} y2={height-1}/></g>
}

export { styles as sensingVisualStyles }
