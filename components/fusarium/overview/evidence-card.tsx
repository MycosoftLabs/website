import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronDown, Clock3, Files, Gauge, Link2, MapPin, TrendingUp, UserRound } from "lucide-react"
import type { OverviewRecord } from "@/lib/fusarium/overview/contracts"
import styles from "./overview.module.css"

const STATE_LABELS = {
  not_implemented: "NOT IMPLEMENTED",
  artifact_only: "ARTIFACT ONLY",
  simulated: "SIMULATED",
  configured: "CONFIGURED / UNVERIFIED",
  live: "LIVE LOCAL",
  degraded: "DEGRADED",
  blocked: "BLOCKED",
  unreachable: "UNREACHABLE",
  unknown: "UNKNOWN",
} as const

function statusTone(record: OverviewRecord<unknown>): string {
  if (record.dataMode === "simulated") return styles.toneSimulated
  if (record.dataMode === "replay") return styles.toneReplay
  if (record.status.condition === "unauthorized" || record.status.state === "blocked") return styles.toneBlocked
  if (record.status.state === "live") return styles.toneLive
  if (record.status.state === "degraded" || record.status.condition === "partial" || record.status.condition === "stale") {
    return styles.toneDegraded
  }
  return styles.toneNeutral
}

function freshnessSignal(record: OverviewRecord<unknown>, nowMs: number): { short: string; detail: string; tone: string } {
  const observedAt = record.freshness.observedAt
  if (!observedAt) return { short: "—", detail: "Freshness unknown; the source supplied no timestamp.", tone: styles.signalUnknown }
  const observedMs = Date.parse(observedAt)
  if (!Number.isFinite(observedMs)) return { short: "—", detail: "Freshness unknown; the source timestamp is invalid.", tone: styles.signalUnknown }
  const seconds = Math.max(0, Math.floor((nowMs - observedMs) / 1000))
  const age = seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h`
  const basis =
    record.freshness.basis === "scenario_clock"
      ? "scenario clock"
      : record.freshness.basis === "client_poll"
        ? "client poll"
        : record.freshness.basis.replaceAll("_", " ")
  return {
    short: age,
    detail: `${record.freshness.state} freshness, ${age} old, based on ${basis}. Source time: ${observedAt}; received: ${record.freshness.receivedAt}.`,
    tone: record.freshness.state === "fresh" ? styles.signalGood : record.freshness.state === "stale" ? styles.signalBad : styles.signalUnknown,
  }
}

function confidenceSignal(record: OverviewRecord<unknown>): { short: string; detail: string; tone: string; segments: number } {
  if (record.confidence.score === null) {
    return { short: "N/A", detail: `Confidence not assessed. ${record.confidence.basis}`, tone: styles.signalUnknown, segments: 0 }
  }
  const percentage = Math.round(record.confidence.score * 100)
  return {
    short: `${percentage}%`,
    detail: `${record.confidence.label} confidence, ${percentage} percent. ${record.confidence.basis}`,
    tone: percentage >= 80 ? styles.signalGood : percentage >= 60 ? styles.signalWarn : styles.signalBad,
    segments: Math.max(1, Math.round(record.confidence.score * 5)),
  }
}

function provenanceSignal(record: OverviewRecord<unknown>): { short: string; detail: string; tone: string } {
  if (record.dataMode === "simulated") {
    return { short: "DEMO", detail: `Deterministic demonstration reference: ${record.provenanceRef}`, tone: styles.signalDemo }
  }
  if (record.provenanceRef.startsWith("local-api://")) {
    return { short: "LOCAL", detail: `Local provider reference: ${record.provenanceRef}`, tone: styles.signalGood }
  }
  if (record.provenanceRef.startsWith("build://")) {
    return { short: "BUILD", detail: `Build or schema reference: ${record.provenanceRef}`, tone: styles.signalWarn }
  }
  return { short: "REF", detail: `Provenance reference: ${record.provenanceRef}`, tone: styles.signalUnknown }
}

function Signal({
  icon,
  label,
  value,
  detail,
  tone,
  segments,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone: string
  segments?: number
}) {
  return (
    <span className={`${styles.signal} ${tone}`} tabIndex={0} role="img" aria-label={`${label}: ${detail}`} data-tooltip={detail}>
      <span className={styles.signalIcon} aria-hidden="true">{icon}</span>
      <span className={styles.signalText}>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
      {segments !== undefined ? (
        <span className={styles.signalSegments} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((segment) => (
            <i key={segment} className={segment < segments ? styles.segmentOn : undefined} />
          ))}
        </span>
      ) : (
        <span className={styles.signalDot} aria-hidden="true" />
      )}
    </span>
  )
}

function compactLead(text: string): string {
  const sentenceEnd = text.indexOf(".")
  const firstSentence = sentenceEnd > 0 ? text.slice(0, sentenceEnd + 1) : text
  return firstSentence.length <= 118 ? firstSentence : `${firstSentence.slice(0, 115).trimEnd()}…`
}

export function EvidenceCard<T>({
  record,
  nowMs,
  href,
  actionLabel = "Open owning app",
  variant = "default",
  children,
}: {
  record: OverviewRecord<T>
  nowMs: number
  href?: string
  actionLabel?: string
  variant?: "default" | "posture" | "compact"
  children?: ReactNode
}) {
  const isLoading = record.status.condition === "loading"
  const hasPayload = record.payload !== null
  const modeLabel = record.dataMode === "replay" ? "REPLAY" : STATE_LABELS[record.status.state]
  const confidence = confidenceSignal(record)
  const freshness = freshnessSignal(record, nowMs)
  const provenance = provenanceSignal(record)
  const evidenceCount = record.sourceIds.length
  const evidenceTone = evidenceCount > 1 ? styles.signalGood : evidenceCount === 1 ? styles.signalWarn : styles.signalUnknown
  const variantClass = variant === "default" ? "" : styles[`card_${variant}`]

  return (
    <article
      className={`${styles.evidenceCard} ${variantClass} ${statusTone(record)}`}
      aria-busy={isLoading}
      data-state={record.status.state}
    >
      <header className={styles.cardHeader}>
        <span className={styles.statusChip}>{modeLabel}</span>
        <span className={styles.classification}>{record.classification}</span>
      </header>

      {isLoading ? (
        <div className={styles.loadingBlock} role="status">
          <span className={styles.loadingLine} />
          <span className={styles.loadingLineShort} />
          <span className="sr-only">Loading {record.status.surface}</span>
        </div>
      ) : hasPayload ? (
        children
      ) : (
        <div className={styles.emptyState} role={record.status.condition === "error" ? "alert" : "status"}>
          <strong>
            {record.status.condition === "unauthorized"
              ? "Authorization required"
              : record.status.condition === "error"
                ? "Provider error"
                : record.status.state === "unreachable"
                  ? "Provider unreachable"
                  : "No evidence-backed record"}
          </strong>
          <p>{compactLead(record.status.reason)}</p>
          <details className={styles.cardDetails}>
            <summary><ChevronDown size={13} aria-hidden="true" /> Why unavailable</summary>
            <p>{record.status.reason} No value was estimated in its place.</p>
          </details>
        </div>
      )}

      {!isLoading ? (
        <div className={styles.evidenceMeta} role="group" aria-label="Confidence, freshness, evidence, and provenance">
          <Signal icon={<Gauge size={15} />} label="Confidence" value={confidence.short} detail={confidence.detail} tone={confidence.tone} segments={confidence.segments} />
          <Signal icon={<Clock3 size={15} />} label="Freshness" value={freshness.short} detail={freshness.detail} tone={freshness.tone} />
          <Signal
            icon={<Files size={15} />}
            label="Evidence"
            value={evidenceCount > 0 ? String(evidenceCount) : "—"}
            detail={evidenceCount > 0 ? `${evidenceCount} linked source identifier${evidenceCount === 1 ? "" : "s"}: ${record.sourceIds.join(", ")}` : "No linked source identifiers."}
            tone={evidenceTone}
            segments={Math.min(5, evidenceCount)}
          />
          <Signal icon={<Link2 size={15} />} label="Provenance" value={provenance.short} detail={provenance.detail} tone={provenance.tone} />
        </div>
      ) : null}

      {record.status.condition === "stale" || record.status.condition === "partial" ? (
        <details className={styles.stateNotice}>
          <summary>{record.status.condition === "stale" ? "STALE SOURCE" : "PARTIAL SOURCE"}</summary>
          <p>{record.status.reason}</p>
        </details>
      ) : null}

      {href ? (
        <footer className={styles.cardFooter}>
          <Link href={href} className={styles.cardLink}>
            {actionLabel}
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      ) : null}
    </article>
  )
}

export function RecordContent({ record }: { record: OverviewRecord<{ title: string; summary: string; kicker?: string; location?: string; trend?: string; nextStep?: string; owner?: string; value?: string; details?: { label: string; value: string }[] }> }) {
  const payload = record.payload
  if (!payload) return null
  const lead = compactLead(payload.summary)

  return (
    <div className={styles.cardBody}>
      {payload.kicker ? <p className={styles.kicker}>{payload.kicker}</p> : null}
      <h3>{payload.title}</h3>
      {payload.value ? <p className={styles.primaryValue}>{payload.value}</p> : null}
      <p className={styles.summaryCompact}>{lead}</p>
      {payload.location || payload.trend || payload.owner ? (
        <div className={styles.contextSignals}>
          {payload.location ? <span title={`Where: ${payload.location}`}><MapPin size={13} aria-hidden="true" />{payload.location}</span> : null}
          {payload.trend ? <span title={`Change: ${payload.trend}`}><TrendingUp size={13} aria-hidden="true" />{payload.trend}</span> : null}
          {payload.owner ? <span title={`Human owner: ${payload.owner}`}><UserRound size={13} aria-hidden="true" />{payload.owner}</span> : null}
        </div>
      ) : null}
      {payload.details && payload.details.length > 0 ? (
        <dl className={styles.detailList}>
          {payload.details.map((detail) => (
            <div key={`${record.recordId}-${detail.label}`}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {payload.nextStep || lead !== payload.summary ? (
        <details className={styles.cardDetails}>
          <summary><ChevronDown size={13} aria-hidden="true" /> Record detail</summary>
          {lead !== payload.summary ? <p>{payload.summary}</p> : null}
          {payload.nextStep ? <p><strong>Next:</strong> {payload.nextStep}</p> : null}
        </details>
      ) : null}
    </div>
  )
}
