import Link from "next/link"
import {
  ChevronDown,
  ClipboardCheck,
  FileText,
  Globe2,
  KeyRound,
  Map,
  Network,
  RadioTower,
  ServerCog,
  TriangleAlert,
  Waypoints,
  type LucideIcon,
} from "lucide-react"
import type {
  ConnectorPayload,
  OverviewCardPayload,
  OverviewContext,
  OverviewRecord,
  OverviewSnapshot,
} from "@/lib/fusarium/overview/contracts"
import { buildOverviewLink, type OverviewAppRoute } from "@/lib/fusarium/overview/deep-links"
import { EvidenceCard, RecordContent } from "./evidence-card"
import styles from "./overview.module.css"

const NATIVE_APPS: { route: OverviewAppRoute; title: string; description: string; icon: LucideIcon }[] = [
  {
    route: "situationalAwareness",
    title: "Situational Awareness",
    description: "Objects · space · time",
    icon: Map,
  },
  {
    route: "threatAssessment",
    title: "Threat Assessment",
    description: "Anomaly · exposure · resilience",
    icon: TriangleAlert,
  },
  {
    route: "dataFusion",
    title: "Data Fusion",
    description: "Coverage · coupling · lineage",
    icon: Network,
  },
  {
    route: "commandControl",
    title: "Command & Control",
    description: "Observation · review · routing",
    icon: ClipboardCheck,
  },
  {
    route: "oeiNarrative",
    title: "OEI Narrative",
    description: "Briefs · judgments · products",
    icon: FileText,
  },
  {
    route: "stackInventory",
    title: "Stack Inventory",
    description: "Devices · services · connectors",
    icon: ServerCog,
  },
]

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeader}>
        <p>{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        {description ? <span>{description}</span> : null}
      </header>
      {children}
    </section>
  )
}

function RecordGrid({
  records,
  nowMs,
  hrefFor,
  columns = 3,
}: {
  records: OverviewRecord<OverviewCardPayload>[]
  nowMs: number
  hrefFor: (record: OverviewRecord<OverviewCardPayload>) => string | undefined
  columns?: 2 | 3 | 4
}) {
  return (
    <div className={styles[`grid${columns}`]}>
      {records.map((record) => (
        <EvidenceCard key={record.recordId} record={record} nowMs={nowMs} href={hrefFor(record)}>
          <RecordContent record={record} />
        </EvidenceCard>
      ))}
    </div>
  )
}

export function NativeAppSwitchboard({ context }: { context: OverviewContext }) {
  return (
    <nav className={styles.appSwitchboard} aria-label="Fusarium native applications">
      {NATIVE_APPS.map((app) => {
        const AppIcon = app.icon
        return (
          <Link
            key={app.route}
            href={buildOverviewLink(app.route, context, {
              objectType: "mission-area",
              objectId: context.missionAreaId,
            })}
          >
            <AppIcon className={styles.appIcon} size={18} aria-hidden="true" />
            <strong>{app.title}</strong>
            <span>{app.description}</span>
            <em aria-hidden="true">→</em>
          </Link>
        )
      })}
    </nav>
  )
}

export function OperationalPosture({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="operational-posture"
      eyebrow="01 · Environmental posture"
      title="What is happening, why it matters, and what needs a human decision"
    >
      <EvidenceCard
        record={snapshot.operationalPosture}
        nowMs={nowMs}
        variant="posture"
        href={buildOverviewLink("situationalAwareness", context, {
          objectType: "mission-area",
          objectId: context.missionAreaId,
        })}
        actionLabel="Open mission area"
      >
        <RecordContent record={snapshot.operationalPosture} />
      </EvidenceCard>
    </Section>
  )
}

export function MissionBriefAndContinuity({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="mission-brief"
      eyebrow="02 · Mission environmental brief"
      title="Current environmental judgment and active mission continuity"
    >
      <div className={styles.grid2}>
        <EvidenceCard
          record={snapshot.oeiBrief}
          nowMs={nowMs}
          href={buildOverviewLink("oeiNarrative", context, {
            objectType: "brief",
            objectId: snapshot.oeiBrief.recordId,
          })}
          actionLabel="Open OEI Narrative"
        >
          <RecordContent record={snapshot.oeiBrief} />
        </EvidenceCard>
        <EvidenceCard
          record={snapshot.missionContinuity}
          nowMs={nowMs}
          href={buildOverviewLink("commandControl", context, {
            objectType: "mission-continuity",
            objectId: snapshot.missionContinuity.recordId,
          })}
          actionLabel="Open continuity context"
        >
          <RecordContent record={snapshot.missionContinuity} />
        </EvidenceCard>
      </div>
    </Section>
  )
}

export function EnvironmentalPicture({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="environmental-picture"
      eyebrow="03 · Environmental operating picture"
      title="Read-only picture summary and environmental state matrix"
      description="The environment is the primary intelligence object—not a backdrop behind another track set."
    >
      <div className={styles.grid2}>
        <EvidenceCard
          record={snapshot.environmentalPicture}
          nowMs={nowMs}
          href={buildOverviewLink("situationalAwareness", context, {
            objectType: "environmental-picture",
            objectId: snapshot.environmentalPicture.recordId,
          })}
          actionLabel="Inspect environmental objects"
        >
          <RecordContent record={snapshot.environmentalPicture} />
          <div className={styles.secondaryAction}>
            <Link
              href={buildOverviewLink("earthSimulator", context, {
                objectType: "mission-area",
                objectId: context.missionAreaId,
              })}
            >
              Open Earth Simulator as a secondary world-model view
            </Link>
            <span>No Earth data is embedded or queried by this fallback.</span>
          </div>
        </EvidenceCard>

        <EvidenceCard
          record={snapshot.environmentalStateMatrix}
          nowMs={nowMs}
          href={buildOverviewLink("situationalAwareness", context, {
            objectType: "state-matrix",
            objectId: snapshot.environmentalStateMatrix.recordId,
          })}
          actionLabel="Inspect domain relationships"
        >
          <RecordContent record={snapshot.environmentalStateMatrix} />
        </EvidenceCard>
      </div>
    </Section>
  )
}

export function ConditionsCausalityAndOutlook({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  const threatHref = (objectType: string) => (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("threatAssessment", context, { objectType, objectId: record.recordId })
  return (
    <Section
      id="conditions-causality"
      eyebrow="04 · Environmental change assessment"
      title="Priority conditions, competing explanations, and stability outlook"
      description="Hypotheses remain distinct from observations and keep uncertainty visible."
    >
      <div className={styles.tripleBand}>
        <div>
          <h3 className={styles.subheading}>Priority environmental conditions</h3>
          <RecordGrid records={snapshot.priorityAnomalies} nowMs={nowMs} hrefFor={threatHref("anomaly")} columns={2} />
        </div>
        <div>
          <h3 className={styles.subheading}>Causal chain and competing explanations</h3>
          <RecordGrid records={snapshot.causalAssessment} nowMs={nowMs} hrefFor={threatHref("hypothesis")} columns={2} />
        </div>
        <div>
          <h3 className={styles.subheading}>Forecast and stability outlook</h3>
          <RecordGrid records={snapshot.stabilityOutlook} nowMs={nowMs} hrefFor={threatHref("outlook")} columns={2} />
        </div>
      </div>
    </Section>
  )
}

export function ObservationsReviewsAndEvidence({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="observations-evidence"
      eyebrow="05 · Observation and trust"
      title="Recommended observations, human review, and evidence health"
      description="Observation recommendations close evidence gaps; this surface has no actuation or external-send controls."
    >
      <div className={styles.balancedBand3}>
        <div>
          <h3 className={styles.subheading}>Recommended observations</h3>
          <RecordGrid
            records={snapshot.recommendedObservations}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("commandControl", context, { objectType: "observation", objectId: record.recordId })}
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Human review and policy holds</h3>
          <RecordGrid
            records={snapshot.governanceQueue}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("commandControl", context, { objectType: "review", objectId: record.recordId })}
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Evidence and provenance health</h3>
          <RecordGrid
            records={snapshot.provenanceHealth}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("dataFusion", context, { objectType: "provenance", objectId: record.recordId })}
            columns={2}
          />
        </div>
      </div>
    </Section>
  )
}

export function CoverageAndProducts({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="coverage-products"
      eyebrow="06 · Sources and products"
      title="Source, modality, and fusion coverage with product review queues"
    >
      <div className={styles.balancedBand4}>
        <div>
          <h3 className={styles.subheading}>Device and domain readiness</h3>
          <RecordGrid
            records={snapshot.deviceDomainHealth}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("stackInventory", context, { objectType: "domain", objectId: record.recordId })}
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Modality and fusion coverage</h3>
          <RecordGrid
            records={snapshot.modalityCoverage}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("dataFusion", context, { objectType: "modality", objectId: record.recordId })}
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Mission and alert review path</h3>
          <RecordGrid
            records={snapshot.missionRouting}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("commandControl", context, { objectType: "routing", objectId: record.recordId })}
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Intelligence-product and review queue</h3>
          <RecordGrid
            records={snapshot.productQueue}
            nowMs={nowMs}
            hrefFor={(record) => buildOverviewLink("oeiNarrative", context, { objectType: "product", objectId: record.recordId })}
            columns={2}
          />
        </div>
      </div>
    </Section>
  )
}

export function ActionAndReview({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  const threatHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("threatAssessment", context, { objectType: "anomaly", objectId: record.recordId })
  const observationHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("commandControl", context, { objectType: "observation", objectId: record.recordId })
  const reviewHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("commandControl", context, { objectType: "review", objectId: record.recordId })

  return (
    <Section
      id="action-review"
      eyebrow="03 · Evidence gaps and review"
      title="Priority anomalies, recommended observations, and human governance"
      description="Recommendations close environmental evidence gaps. They do not direct assets, actuate systems, or authorize external release."
    >
      <div className={styles.tripleBand}>
        <div>
          <h3 className={styles.subheading}>Priority anomalies</h3>
          <RecordGrid records={snapshot.priorityAnomalies} nowMs={nowMs} hrefFor={threatHref} columns={2} />
        </div>
        <div>
          <h3 className={styles.subheading}>Recommended observations</h3>
          <RecordGrid records={snapshot.recommendedObservations} nowMs={nowMs} hrefFor={observationHref} columns={2} />
        </div>
        <div>
          <h3 className={styles.subheading}>Governance queue</h3>
          <RecordGrid records={snapshot.governanceQueue} nowMs={nowMs} hrefFor={reviewHref} columns={2} />
        </div>
      </div>
    </Section>
  )
}

export function ChangeAndCoverage({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  const threatHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("threatAssessment", context, { objectType: "outlook", objectId: record.recordId })
  const stackHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("stackInventory", context, { objectType: "domain", objectId: record.recordId })
  const fusionHref = (record: OverviewRecord<OverviewCardPayload>) =>
    buildOverviewLink("dataFusion", context, {
      objectType: record.recordId.includes("provenance") ? "provenance" : "modality",
      objectId: record.recordId,
    })

  return (
    <Section
      id="change-coverage"
      eyebrow="04 · Change, balance, and trust"
      title="Stability outlook, domain readiness, coverage, and provenance"
    >
      <div className={styles.bandStack}>
        <div>
          <h3 className={styles.subheading}>Environmental stability and change outlook</h3>
          <RecordGrid records={snapshot.stabilityOutlook} nowMs={nowMs} hrefFor={threatHref} columns={2} />
        </div>
        <div className={styles.grid2}>
          <div>
            <h3 className={styles.subheading}>Device and domain health</h3>
            <RecordGrid records={snapshot.deviceDomainHealth} nowMs={nowMs} hrefFor={stackHref} columns={2} />
          </div>
          <div>
            <h3 className={styles.subheading}>Modality and source coverage</h3>
            <RecordGrid records={snapshot.modalityCoverage} nowMs={nowMs} hrefFor={fusionHref} columns={2} />
          </div>
        </div>
        <div>
          <h3 className={styles.subheading}>Provenance health</h3>
          <RecordGrid records={snapshot.provenanceHealth} nowMs={nowMs} hrefFor={fusionHref} columns={2} />
        </div>
      </div>
    </Section>
  )
}

export function MissionAndProducts({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="mission-products"
      eyebrow="05 · Mission consequence"
      title="Human routing and environmental intelligence products"
    >
      <div className={styles.grid2}>
        <div>
          <h3 className={styles.subheading}>Mission and alert routing</h3>
          <RecordGrid
            records={snapshot.missionRouting}
            nowMs={nowMs}
            hrefFor={(record) =>
              buildOverviewLink("commandControl", context, { objectType: "routing", objectId: record.recordId })
            }
            columns={2}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>Intelligence-product queue</h3>
          <RecordGrid
            records={snapshot.productQueue}
            nowMs={nowMs}
            hrefFor={(record) =>
              buildOverviewLink("oeiNarrative", context, { objectType: "product", objectId: record.recordId })
            }
            columns={2}
          />
        </div>
      </div>
    </Section>
  )
}

function ConnectorContent({ record }: { record: OverviewRecord<ConnectorPayload> }) {
  const payload = record.payload
  if (!payload) return null
  return (
    <div className={styles.cardBody}>
      {payload.kicker ? <p className={styles.kicker}>{payload.kicker}</p> : null}
      <h3>{payload.title}</h3>
      <p className={styles.primaryValue}>{payload.readiness}</p>
      <div className={styles.connectorSignals} role="group" aria-label={`${payload.title} connector status`}>
        <span title={`Environment: ${payload.environment}`}><Globe2 size={14} aria-hidden="true" /><strong>{payload.environment}</strong><small>Environment</small></span>
        <span title={`Interface scope: ${payload.interfaceScope}`}><Waypoints size={14} aria-hidden="true" /><strong>{payload.interfaceScope}</strong><small>Scope</small></span>
        <span title={`Authentication: ${payload.authMode}`}><KeyRound size={14} aria-hidden="true" /><strong>{payload.authMode}</strong><small>Auth</small></span>
        <span title={`Acknowledgement: ${payload.lastAcknowledgement}`}><RadioTower size={14} aria-hidden="true" /><strong>{payload.lastAcknowledgement}</strong><small>Last ack</small></span>
      </div>
      <details className={styles.cardDetails}>
        <summary><ChevronDown size={13} aria-hidden="true" /> Connector evidence</summary>
        <p>{payload.summary}</p>
        <dl className={styles.connectorFacts}>
          <div><dt>Protocol</dt><dd>{payload.protocol}</dd></div>
          <div><dt>Permission probe</dt><dd>{payload.permissionProbe}</dd></div>
          <div><dt>Last handshake</dt><dd>{payload.lastHandshake}</dd></div>
          <div><dt>TTL / provenance</dt><dd>{payload.ttlPolicy}</dd></div>
        </dl>
        {payload.nextStep ? <p><strong>Next:</strong> {payload.nextStep}</p> : null}
      </details>
    </div>
  )
}

export function PlatformHealth({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="platform-health"
      eyebrow="07 · Platform readiness"
      title="Core services, partner exchange boundaries, and foundation blockers"
    >
      <div className={styles.platformBands}>
        <div>
          <h3 className={styles.subheading}>Core-service health</h3>
          <RecordGrid
            records={snapshot.coreServices}
            nowMs={nowMs}
            hrefFor={(record) =>
              buildOverviewLink("stackInventory", context, { objectType: "service", objectId: record.recordId })
            }
            columns={4}
          />
        </div>
        <div>
          <h3 className={styles.subheading}>External connector readiness</h3>
          <div className={styles.grid2}>
            {snapshot.connectorHealth.map((record) => (
              <EvidenceCard
                key={record.recordId}
                record={record}
                nowMs={nowMs}
                href={buildOverviewLink("stackInventory", context, {
                  objectType: "connector",
                  objectId: record.recordId,
                })}
                actionLabel="Inspect connector evidence"
              >
                <ConnectorContent record={record} />
              </EvidenceCard>
            ))}
          </div>
        </div>
        <div className={styles.platformBlockers}>
          <h3 className={styles.subheading}>Shared-platform blockers</h3>
          <RecordGrid
            records={snapshot.foundationBlockers}
            nowMs={nowMs}
            hrefFor={(record) =>
              buildOverviewLink("stackInventory", context, { objectType: "blocker", objectId: record.recordId })
            }
            columns={4}
          />
        </div>
      </div>
    </Section>
  )
}

function activityRoute(recordId: string): { route: OverviewAppRoute; objectType: string } {
  if (recordId.includes("brief")) return { route: "oeiNarrative", objectType: "brief" }
  if (recordId.includes("observation")) return { route: "commandControl", objectType: "observation" }
  if (recordId.includes("anomaly")) return { route: "threatAssessment", objectType: "anomaly" }
  return { route: "stackInventory", objectType: "activity" }
}

export function ActivityTimeline({
  snapshot,
  context,
  nowMs,
}: {
  snapshot: OverviewSnapshot
  context: OverviewContext
  nowMs: number
}) {
  return (
    <Section
      id="activity-timeline"
      eyebrow="08 · Recent change and decisions"
      title="Activity and audit timeline"
      description="Local poll events and simulated workflow events remain visibly distinct."
    >
      <div className={styles.timeline}>
        {snapshot.activity.map((record) => {
          const target = activityRoute(record.recordId)
          return (
            <EvidenceCard
              key={record.recordId}
              record={record}
              nowMs={nowMs}
              variant="compact"
              href={buildOverviewLink(target.route, context, {
                objectType: target.objectType,
                objectId: record.recordId,
              })}
              actionLabel="Open event context"
            >
              <RecordContent record={record} />
            </EvidenceCard>
          )
        })}
      </div>
    </Section>
  )
}
