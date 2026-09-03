"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Ban,
  CloudCog,
  Database,
  GitBranch,
  HardDrive,
  KeyRound,
  Network,
  RefreshCw,
  ShieldCheck,
  Usb,
  Workflow,
} from "lucide-react"

import type {
  DataCenterFabricContract,
  EvidenceAxisState,
  FabricTargetKind,
} from "@/lib/fusarium/data-fusion/fabric-contract"
import styles from "./protected-data-center.module.css"

const TARGET_ICONS: Record<FabricTargetKind, typeof HardDrive> = {
  "local-disk": HardDrive,
  nas: Database,
  "removable-media": Usb,
  "fedramp-cloud": CloudCog,
}

function stateLabel(state: EvidenceAxisState | string) {
  return state.replaceAll("-", " ")
}

export function ProtectedDataCenter() {
  const [fabric, setFabric] = useState<DataCenterFabricContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/fusarium/data-fusion/fabric", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const detail = body && typeof body.error === "string" ? body.error : `HTTP ${response.status}`
        throw new Error(detail)
      }
      if (!body || body.schema !== "fusarium-data-center-fabric/v1") {
        throw new Error("The protected data-center contract was missing or invalid.")
      }
      setFabric(body as DataCenterFabricContract)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      setFabric(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  return (
    <section className={styles.shell} aria-labelledby="protected-data-center-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck aria-hidden="true" /> Owner-gated · UNCLASSIFIED</p>
          <h2 id="protected-data-center-title">Protected data center</h2>
          <p>
            Storage, sensor silos, lineage, and pipeline readiness are shown as evidence—not inferred
            from a path, a credential name, or an empty response.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className={styles.refresh}>
          <RefreshCw aria-hidden="true" className={loading ? styles.spinning : undefined} />
          {loading ? "Checking contract" : "Refresh inventory"}
        </button>
      </header>

      {error ? (
        <div className={styles.error} role="alert">
          <Ban aria-hidden="true" />
          <div><strong>Protected inventory unavailable</strong><p>{error}</p><p>No storage state was substituted.</p></div>
        </div>
      ) : !fabric ? (
        <div className={styles.loading} role="status">Reading the owner-authenticated inventory contract…</div>
      ) : (
        <>
          <div className={styles.truthStrip}>
            <span><strong>Mode</strong>{fabric.operationMode}</span>
            <span><strong>Evidence rule</strong>{fabric.evidenceRule}</span>
            <span><strong>Observed</strong><time dateTime={fabric.generatedAt}>{fabric.generatedAt}</time></span>
          </div>

          <section className={styles.section} aria-labelledby="fabric-targets-title">
            <div className={styles.sectionTitle}>
              <div><HardDrive aria-hidden="true" /><span><strong id="fabric-targets-title">Storage target readiness</strong><small>Configuration references are names only; values never leave the server.</small></span></div>
              <span className={styles.readOnly}>Inventory only</span>
            </div>
            <div className={styles.targetGrid}>
              {fabric.targets.map((target) => {
                const Icon = TARGET_ICONS[target.id]
                return (
                  <article key={target.id} className={styles.targetCard}>
                    <header><Icon aria-hidden="true" /><div><h3>{target.label}</h3><p>{target.role}</p></div></header>
                    <div className={styles.configRefs} aria-label={`${target.label} configuration references`}>
                      {target.configuration.map((signal) => (
                        <span key={signal.key} data-present={signal.present} title="Configuration name only; no value read or returned">
                          {signal.key} · {signal.present ? "present" : "not present"}
                        </span>
                      ))}
                    </div>
                    <dl className={styles.axisGrid}>
                      {target.axes.map((axis) => (
                        <div key={axis.name} data-state={axis.state} title={axis.detail}>
                          <dt>{axis.name}</dt>
                          <dd>{stateLabel(axis.state)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

          <div className={styles.twoColumn}>
            <section className={styles.section} aria-labelledby="silo-title">
              <div className={styles.sectionTitle}>
                <div><Database aria-hidden="true" /><span><strong id="silo-title">Compartment and sensor silos</strong><small>Device, sensor, mission, location, and time remain explicit scope.</small></span></div>
              </div>
              <div className={styles.siloGrid}>
                {fabric.silos.map((silo) => (
                  <article key={silo.id}>
                    <header><strong>{silo.label}</strong><span data-state={silo.state}>{stateLabel(silo.state)}</span></header>
                    <p>{silo.scopeKey}</p>
                    <small>{silo.detail}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="lineage-title">
              <div className={styles.sectionTitle}>
                <div><GitBranch aria-hidden="true" /><span><strong id="lineage-title">Evidence-to-memory lineage</strong><small>Every transition needs a source record and provenance.</small></span></div>
              </div>
              <ol className={styles.lineage}>
                {fabric.lineagePlanes.map((plane, index) => (
                  <li key={plane}><span>{String(index + 1).padStart(2, "0")}</span><strong>{plane}</strong></li>
                ))}
              </ol>
            </section>
          </div>

          <section className={styles.section} aria-labelledby="pipeline-title">
            <div className={styles.sectionTitle}>
              <div><Workflow aria-hidden="true" /><span><strong id="pipeline-title">API and ETL fabric</strong><small>Declared seams are not promoted to live, fresh, or populated.</small></span></div>
            </div>
            <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="API and ETL fabric status table">
              <table>
                <thead><tr><th>Pipeline</th><th>Direction</th><th>Contract</th><th>Status</th><th>Evidence</th></tr></thead>
                <tbody>
                  {fabric.pipelines.map((pipeline) => (
                    <tr key={pipeline.id}>
                      <th scope="row">{pipeline.label}</th>
                      <td>{pipeline.direction}</td>
                      <td><code>{pipeline.contract}</code></td>
                      <td><span className={styles.state} data-state={pipeline.state}>{stateLabel(pipeline.state)}</span></td>
                      <td>{pipeline.detail}{pipeline.statusEndpoint ? <small> Declared: <code>{pipeline.statusEndpoint}</code>; not invoked.</small> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={styles.guardrailGrid}>
            <section className={styles.guardrail} aria-labelledby="legacy-title">
              <div><Ban aria-hidden="true" /><h3 id="legacy-title">Legacy storage quarantine</h3></div>
              {fabric.legacyRoutes.map((legacy) => (
                <article key={legacy.route}>
                  <code>{legacy.route}</code><span>Disqualified · never invoked</span><p>{legacy.reason}</p>
                </article>
              ))}
            </section>

            <section className={styles.guardrail} aria-labelledby="erasure-title">
              <div><KeyRound aria-hidden="true" /><h3 id="erasure-title">Cryptographic-erasure readiness</h3></div>
              <p className={styles.policyBanner}>Policy only · two-person review · no execution path</p>
              <p>{fabric.erasureReadiness.detail}</p>
              <dl className={styles.erasureFacts}>
                <div><dt>Execution</dt><dd>Disabled</dd></div>
                <div><dt>Approvers</dt><dd>{fabric.erasureReadiness.minimumApprovers} distinct roles</dd></div>
                <div><dt>Action endpoint</dt><dd>Absent</dd></div>
                <div><dt>Audit fields</dt><dd>{fabric.erasureReadiness.auditFields.length} required</dd></div>
              </dl>
              <details><summary>Readiness prerequisites</summary><ul>{fabric.erasureReadiness.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></details>
            </section>
          </div>

          <footer className={styles.footer}><Network aria-hidden="true" /> No path, mount, file, database, network, cloud, credential, upload, delete, or key operation occurs in this surface.</footer>
        </>
      )}
    </section>
  )
}
