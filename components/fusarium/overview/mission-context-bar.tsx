import Link from "next/link"
import type { OverviewContext, OverviewSnapshot } from "@/lib/fusarium/overview/contracts"
import { buildOverviewLink } from "@/lib/fusarium/overview/deep-links"
import styles from "./overview.module.css"

function pollAge(generatedAt: string, nowMs: number): string {
  const generatedMs = Date.parse(generatedAt)
  if (!Number.isFinite(generatedMs)) return "UNKNOWN"
  const seconds = Math.max(0, Math.floor((nowMs - generatedMs) / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`
}

function connectionState(snapshot: OverviewSnapshot): { label: string; tone: string } {
  const runtime = snapshot.coreServices.find((record) => record.recordId === "fusarium-runtime")
  if (!runtime || runtime.status.condition === "loading") return { label: "CONNECTING", tone: styles.connectionNeutral }
  if (runtime.status.state === "live") return { label: "LOCAL RUNTIME AVAILABLE", tone: styles.connectionLive }
  if (runtime.status.condition === "unauthorized") return { label: "AUTHORIZATION REQUIRED", tone: styles.connectionBlocked }
  return { label: "LOCAL RUNTIME DEGRADED", tone: styles.connectionBlocked }
}

export function MissionContextBar({
  context,
  snapshot,
  nowMs,
  onChange,
  onRefresh,
}: {
  context: OverviewContext
  snapshot: OverviewSnapshot
  nowMs: number
  onChange: (next: OverviewContext) => void
  onRefresh: () => void
}) {
  const connection = connectionState(snapshot)
  const missionHref = buildOverviewLink("situationalAwareness", context, {
    objectType: "mission-area",
    objectId: context.missionAreaId,
  })

  return (
    <>
      <div className={styles.demoBanner} role="status">
        SANITIZED DEMONSTRATION — NOT A LIVE OPERATIONAL PICTURE
      </div>
      <section className={styles.contextBar} aria-label="Mission context">
        <div className={styles.contextControlWide}>
          <span className={styles.contextLabel}>Mission area</span>
          <Link href={missionHref} className={styles.contextLink}>
            {context.missionAreaLabel}
          </Link>
        </div>

        <label className={styles.contextControl}>
          <span className={styles.contextLabel}>Time window</span>
          <select
            value={context.timeWindow}
            onChange={(event) => onChange({ ...context, timeWindow: event.target.value as OverviewContext["timeWindow"] })}
          >
            <option value="6h">LAST 6 HOURS</option>
            <option value="24h">LAST 24 HOURS</option>
            <option value="72h">LAST 72 HOURS</option>
          </select>
        </label>

        <label className={styles.contextControl}>
          <span className={styles.contextLabel}>Data mode</span>
          <select
            value={context.dataMode}
            onChange={(event) => onChange({ ...context, dataMode: event.target.value as OverviewContext["dataMode"] })}
          >
            <option value="system">SYSTEM STATUS ONLY</option>
            <option value="demo">SIMULATED SCENARIO</option>
          </select>
        </label>

        <div className={styles.contextControl}>
          <span className={styles.contextLabel}>Marking</span>
          <strong>UNCLASSIFIED · COMMERCIAL</strong>
        </div>

        <div className={styles.contextControl}>
          <span className={styles.contextLabel}>Freshness</span>
          <button type="button" className={styles.textButton} onClick={onRefresh}>
            POLL AGE {pollAge(snapshot.generatedAt, nowMs)} · REFRESH
          </button>
        </div>

        <div className={styles.contextControl}>
          <span className={styles.contextLabel}>Connection</span>
          <strong className={connection.tone}>{connection.label}</strong>
        </div>

        <div className={styles.contextControl}>
          <span className={styles.contextLabel}>Operator role</span>
          <strong>{context.operatorRole}</strong>
        </div>
      </section>
    </>
  )
}
