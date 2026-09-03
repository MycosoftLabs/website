"use client"

import Link from "next/link"
import {
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  Copy,
  Database,
  ExternalLink,
  FileJson2,
  GitBranch,
  LoaderCircle,
  Network,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildSituationalHandoffLink } from "@/lib/fusarium/situational-awareness/deep-links"
import type {
  SituationalContext,
  SituationalSnapshot,
} from "@/lib/fusarium/situational-awareness/contracts"
import type {
  FormSpaceCatalog,
  FormSpaceEvidenceState,
  FormSpaceModelCatalogItem,
} from "@/lib/fusarium/situational-awareness/form-space"
import {
  buildMycaSituationalContext,
  MYCA_SITUATIONAL_PROPOSAL_SCHEMA,
  type MycaProposalDecision,
} from "@/lib/fusarium/situational-awareness/myca-context"
import styles from "./form-space-workbench.module.css"

interface Props {
  context: SituationalContext
  snapshot: SituationalSnapshot
  onContextChange: (next: SituationalContext) => void
}

interface ModelProbe {
  state: "idle" | "loading" | "available" | "degraded" | "unavailable"
  checkedAt: string | null
  health: string | null
  ready: boolean | null
  training: string | null
  note: string
}

interface ProposalApiResult {
  proposalDigest?: string
  decision?: MycaProposalDecision
  audit?: { persistence?: string; note?: string }
  error?: string
}

const DEFAULT_PROBE: ModelProbe = {
  state: "idle",
  checkedAt: null,
  health: null,
  ready: null,
  training: null,
  note: "Not probed. Status reads occur only when the operator requests them.",
}

const STATE_LABELS: Record<FormSpaceEvidenceState, string> = {
  source_present: "SOURCE PRESENT",
  document_proposed: "PROPOSED",
  context_only: "CONTEXT ONLY",
  not_probed: "NOT PROBED",
  unbound: "UNBOUND",
}

function stateIcon(state: FormSpaceEvidenceState) {
  if (state === "source_present") return <CheckCircle2 aria-hidden="true" />
  if (state === "unbound") return <CircleDashed aria-hidden="true" />
  return <TriangleAlert aria-hidden="true" />
}

function modelDescription(model: FormSpaceModelCatalogItem) {
  return `${model.description} ${model.sourceBasis}`
}

export function FormSpaceWorkbench({ context, snapshot, onContextChange }: Props) {
  const [catalog, setCatalog] = useState<FormSpaceCatalog | null>(null)
  const [catalogState, setCatalogState] = useState<"loading" | "available" | "unavailable">("loading")
  const [catalogNote, setCatalogNote] = useState("Reading the owner-gated same-origin catalog.")
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [probe, setProbe] = useState<ModelProbe>(DEFAULT_PROBE)
  const [proposalText, setProposalText] = useState("")
  const [proposalState, setProposalState] = useState<"idle" | "checking" | "accepted" | "rejected">("idle")
  const [proposalResult, setProposalResult] = useState<ProposalApiResult | null>(null)
  const [copyState, setCopyState] = useState("Copy context")
  const probeControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setCatalogState("loading")
    setCatalogNote("Reading the owner-gated same-origin catalog.")
    fetch("/api/fusarium/situational-awareness/form-space", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<FormSpaceCatalog>
      })
      .then((next) => {
        if (controller.signal.aborted) return
        if (next?.schema !== "fusarium-form-space-catalog/v1" || next.classification !== "UNCLASSIFIED") {
          throw new Error("invalid catalog")
        }
        setCatalog(next)
        setCatalogState("available")
        setCatalogNote(next.evidenceBoundary)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setCatalog(null)
        setCatalogState("unavailable")
        setCatalogNote("The local Form Space catalog could not be read. No fallback topology was inserted.")
      })
    return () => controller.abort()
  }, [catalogRefresh])

  const selectedModel = useMemo(
    () => catalog?.models.find((model) => model.id === context.selectedModelId) ?? catalog?.models[0] ?? null,
    [catalog, context.selectedModelId],
  )

  useEffect(() => {
    probeControllerRef.current?.abort()
    probeControllerRef.current = null
    setProbe(DEFAULT_PROBE)
  }, [context.selectedModelId])

  useEffect(() => () => probeControllerRef.current?.abort(), [])

  const contextEnvelope = useMemo(
    () => buildMycaSituationalContext(context),
    [context],
  )

  const copyContext = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(contextEnvelope, null, 2))
      setCopyState("Context copied")
    } catch {
      setCopyState("Copy unavailable")
    }
    window.setTimeout(() => setCopyState("Copy context"), 1600)
  }, [contextEnvelope])

  const probeSelectedModel = useCallback(async () => {
    if (!selectedModel?.statusPath) return
    probeControllerRef.current?.abort()
    const controller = new AbortController()
    probeControllerRef.current = controller
    setProbe({ ...DEFAULT_PROBE, state: "loading", note: "Reading the selected model's fixed same-origin status contract." })
    try {
      const response = await fetch(selectedModel.statusPath, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
      const body = response.ok ? await response.json().catch(() => null) : null
      const engineState = String(body?.engine?.state ?? "").toLowerCase()
      const state: ModelProbe["state"] = response.ok && engineState === "available"
        ? "available"
        : response.ok
          ? "degraded"
          : "unavailable"
      setProbe({
        state,
        checkedAt: new Date().toISOString(),
        health: body?.engine?.health ? String(body.engine.health) : null,
        ready: typeof body?.engine?.ready === "boolean" ? body.engine.ready : null,
        training: body?.training?.state ? String(body.training.state) : null,
        note: response.ok
          ? "This proves only the selected status response. It does not establish Form Space inference, model validation, or a device binding."
          : `The fixed same-origin status route returned HTTP ${response.status}.`,
      })
    } catch {
      if (controller.signal.aborted) return
      setProbe({
        ...DEFAULT_PROBE,
        state: "unavailable",
        checkedAt: new Date().toISOString(),
        note: "The fixed same-origin status route was unavailable. No alternate endpoint was attempted.",
      })
    } finally {
      if (probeControllerRef.current === controller) probeControllerRef.current = null
    }
  }, [selectedModel])

  const validateProposal = useCallback(async () => {
    let proposal: unknown
    try {
      proposal = JSON.parse(proposalText)
    } catch {
      setProposalState("rejected")
      setProposalResult({ error: "Proposal must be valid JSON." })
      return
    }
    setProposalState("checking")
    setProposalResult(null)
    try {
      const response = await fetch("/api/fusarium/situational-awareness/myca-context", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, proposal }),
      })
      const body = await response.json().catch(() => null) as ProposalApiResult | null
      setProposalResult(body ?? { error: `Validation returned HTTP ${response.status}.` })
      setProposalState(body?.decision?.accepted ? "accepted" : "rejected")
    } catch {
      setProposalState("rejected")
      setProposalResult({ error: "The same-origin proposal validator was unavailable." })
    }
  }, [context, proposalText])

  const loadProposalExample = useCallback(() => {
    setProposalText(JSON.stringify({
      schema: MYCA_SITUATIONAL_PROPOSAL_SCHEMA,
      action: "request_analysis",
      rationale: "Identify declared source and coverage gaps before drawing a mission conclusion.",
      externalEffects: false,
      analysisType: "identify_coverage_gaps",
    }, null, 2))
    setProposalState("idle")
    setProposalResult(null)
  }, [])

  return (
    <section className={styles.workbench} aria-labelledby="form-space-heading" data-testid="sa-form-space-workbench">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>NLM · MINDEX · DIRTNet · MYCA</span>
          <h2 id="form-space-heading">Form Space environmental state</h2>
          <p>
            A truthful topology and model catalog for the synchronized picture. Environmental observations are not promoted to Form States without an evidence-bearing model contract.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span data-state={catalogState}>{catalogState === "loading" ? "CATALOG LOADING" : catalogState === "available" ? "SOURCE CATALOG" : "CATALOG UNAVAILABLE"}</span>
          <button type="button" onClick={() => setCatalogRefresh((value) => value + 1)} disabled={catalogState === "loading"}>
            <RefreshCw className={catalogState === "loading" ? styles.spin : undefined} aria-hidden="true" /> Refresh catalog
          </button>
        </div>
      </header>

      <div className={styles.boundaryNotice} role="status">
        <ShieldCheck aria-hidden="true" />
        <span><strong>Evidence boundary</strong>{catalogNote}</span>
      </div>

      <div className={styles.controls}>
        <label>
          <span>NLM model</span>
          <select
            value={selectedModel?.id ?? context.selectedModelId}
            onChange={(event) => onContextChange({ ...context, selectedModelId: event.target.value })}
            disabled={!catalog?.models.length}
          >
            {!catalog?.models.length ? <option value={context.selectedModelId}>Catalog unavailable</option> : null}
            {catalog?.models.map((model) => (
              <option key={model.id} value={model.id}>{model.label} · {STATE_LABELS[model.state]}</option>
            ))}
          </select>
          <small>Selection changes the view only; it does not invoke inference or training.</small>
        </label>
        <fieldset>
          <legend>Model presentation</legend>
          <div>
            {(["model", "compare", "interaction"] as const).map((presentation) => (
              <button
                type="button"
                key={presentation}
                aria-pressed={context.formSpacePresentation === presentation}
                onClick={() => onContextChange({ ...context, formSpacePresentation: presentation })}
              >
                {presentation === "model" ? "MODEL" : presentation === "compare" ? "COMPARE" : "FORM SPACE"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {catalogState === "loading" ? (
        <div className={styles.loading}><LoaderCircle className={styles.spin} aria-hidden="true" /> Reading local architecture catalog</div>
      ) : catalog && selectedModel ? (
        <div className={styles.content}>
          {context.formSpacePresentation === "model" ? (
            <div className={styles.modelView}>
              <article className={styles.modelCard} data-state={selectedModel.state}>
                <div className={styles.cardTitle}>
                  <BrainCircuit aria-hidden="true" />
                  <div><span>{selectedModel.family}</span><h3>{selectedModel.label}</h3></div>
                  <b>{STATE_LABELS[selectedModel.state]}</b>
                </div>
                <p>{modelDescription(selectedModel)}</p>
                <div className={styles.chips}>{selectedModel.dimensions.map((dimension) => <span key={dimension}>{dimension}</span>)}</div>
                <dl>
                  <div><dt>Status contract</dt><dd>{selectedModel.statusPath ?? "UNBOUND"}</dd></div>
                  <div><dt>Inference contract</dt><dd>{selectedModel.inferencePath ?? "UNBOUND"}</dd></div>
                  <div><dt>Observed objects</dt><dd>{snapshot.objects.length || "NO RECORDS"}</dd></div>
                  <div><dt>Evidence records</dt><dd>{snapshot.evidence.length || "UNAVAILABLE"}</dd></div>
                </dl>
                {selectedModel.statusPath ? (
                  <button type="button" className={styles.probeButton} onClick={probeSelectedModel} disabled={probe.state === "loading"}>
                    {probe.state === "loading" ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                    Check selected model status
                  </button>
                ) : (
                  <p className={styles.unboundLine}><CircleDashed aria-hidden="true" /> No status adapter is bound for this model family.</p>
                )}
              </article>
              <article className={styles.formStateCard} data-state="unbound">
                <div className={styles.cardTitle}>
                  <Database aria-hidden="true" />
                  <div><span>Structured inference</span><h3>Current Form State</h3></div>
                  <b>UNBOUND</b>
                </div>
                <p>{catalog.formState.note}</p>
                <details>
                  <summary>{catalog.formState.requiredFields.length} required fields</summary>
                  <ul>{catalog.formState.requiredFields.map((field) => <li key={field}>{field}</li>)}</ul>
                </details>
                <div className={styles.probeResult} data-state={probe.state}>
                  <strong>{probe.state === "idle" ? "MODEL STATUS NOT PROBED" : probe.state.toUpperCase()}</strong>
                  <span>{probe.note}</span>
                  {probe.checkedAt ? <small>Checked {new Date(probe.checkedAt).toLocaleString()}</small> : null}
                  {probe.health ? <small>Health {probe.health} · readiness {probe.ready === null ? "unknown" : String(probe.ready)} · training {probe.training ?? "unknown"}</small> : null}
                </div>
              </article>
            </div>
          ) : context.formSpacePresentation === "compare" ? (
            <div className={styles.compareGrid}>
              {catalog.models.map((model) => (
                <button
                  type="button"
                  key={model.id}
                  data-selected={model.id === selectedModel.id}
                  data-state={model.state}
                  onClick={() => onContextChange({ ...context, selectedModelId: model.id, formSpacePresentation: "model" })}
                >
                  <span>{stateIcon(model.state)} {STATE_LABELS[model.state]}</span>
                  <strong>{model.label}</strong>
                  <small>{model.family} · {model.dimensions.join(" · ")}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.interactionView}>
              <div className={styles.topologyPane}>
                <div className={styles.selectedTopologyModel} data-state={selectedModel.state}>
                  <BrainCircuit aria-hidden="true" />
                  <span><small>Selected model context</small><strong>{selectedModel.label}</strong></span>
                  <b>{STATE_LABELS[selectedModel.state]}</b>
                  <p>Selection highlights the declared model context only; it does not bind the sensor-native NLM-to-Form-Space edge.</p>
                </div>
                <div className={styles.topology} aria-label="Form Space architecture topology">
                  {catalog.topology.nodes.map((node) => (
                    <div key={node.id} className={styles.topologyStep}>
                      <article data-state={node.state}>
                        <span>{stateIcon(node.state)} {STATE_LABELS[node.state]}</span>
                        <strong>{node.label}</strong>
                        <small>{node.role}</small>
                      </article>
                    </div>
                  ))}
                </div>
                <div className={styles.edgeLedger} aria-label="Form Space topology relationships">
                  {catalog.topology.edges.map((edge) => {
                    const from = catalog.topology.nodes.find((node) => node.id === edge.from)?.label ?? edge.from
                    const to = catalog.topology.nodes.find((node) => node.id === edge.to)?.label ?? edge.to
                    return (
                      <div key={`${edge.from}:${edge.to}:${edge.label}`} data-state={edge.state}>
                        <span>{from}</span>
                        <GitBranch aria-hidden="true" />
                        <strong>{edge.label}</strong>
                        <GitBranch aria-hidden="true" />
                        <span>{to}</span>
                        <small>{STATE_LABELS[edge.state]}</small>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className={styles.bindingList}>
                <h3><Network aria-hidden="true" /> Binding ledger</h3>
                {catalog.bindings.map((binding) => (
                  <article key={binding.id} data-state={binding.state}>
                    <div><strong>{binding.label}</strong><span>{STATE_LABELS[binding.state]}</span></div>
                    <p>{binding.note}</p>
                    <code>{binding.endpoint ?? "NO ENDPOINT BOUND"}</code>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className={styles.catalogFooter}>
            <details>
              <summary>MINDEX Atlas schema · {catalog.mindex.persistenceState.toUpperCase()}</summary>
              <p>These are proposed authoritative table names from the implementation package. No migration or database read was performed.</p>
              <div className={styles.codeGrid}>{catalog.mindex.tables.map((table) => <code key={table}>{table}</code>)}</div>
            </details>
            <details>
              <summary>Proposed APIs · not deployed proof</summary>
              <div className={styles.codeGrid}>{catalog.proposedApis.map((api) => <code key={api}>{api}</code>)}</div>
            </details>
            <details>
              <summary>Architecture source catalog</summary>
              <ul>{catalog.documents.map((document) => <li key={document.id}><strong>{document.title}</strong><span>{document.role} · {STATE_LABELS[document.evidenceState]}</span></li>)}</ul>
            </details>
          </div>
        </div>
      ) : (
        <div className={styles.unavailable}><TriangleAlert aria-hidden="true" /><strong>Form Space catalog unavailable</strong><span>The environmental picture remains usable without inferred Form State.</span></div>
      )}

      <section className={styles.mycaPanel} aria-labelledby="myca-context-heading">
        <div className={styles.mycaIntro}>
          <div className={styles.cardTitle}>
            <FileJson2 aria-hidden="true" />
            <div><span>Bidirectional review seam</span><h3 id="myca-context-heading">MYCA context & proposal review</h3></div>
            <b>NO EXECUTION</b>
          </div>
          <p>
            MYCA may read the current mission, model, object, evidence, source, synchronized-picture view, and Form Space presentation. It may propose only allowlisted UI navigation or analysis for human review.
          </p>
          <div className={styles.mycaActions}>
            <button type="button" onClick={copyContext}><Copy aria-hidden="true" /> {copyState}</button>
            <button type="button" onClick={loadProposalExample}><FileJson2 aria-hidden="true" /> Load safe example</button>
          </div>
          <details>
            <summary>Current typed context</summary>
            <pre>{JSON.stringify(contextEnvelope, null, 2)}</pre>
          </details>
        </div>
        <div className={styles.proposalForm}>
          <label htmlFor="myca-sa-proposal">MYCA proposal JSON</label>
          <textarea
            id="myca-sa-proposal"
            value={proposalText}
            onChange={(event) => {
              setProposalText(event.target.value.slice(0, 12_000))
              setProposalState("idle")
              setProposalResult(null)
            }}
            placeholder={`{\n  "schema": "${MYCA_SITUATIONAL_PROPOSAL_SCHEMA}",\n  "action": "request_analysis",\n  "rationale": "...",\n  "externalEffects": false,\n  "analysisType": "identify_coverage_gaps"\n}`}
          />
          <button type="button" onClick={validateProposal} disabled={!proposalText.trim() || proposalState === "checking"}>
            {proposalState === "checking" ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            Validate for human review
          </button>
          <p className={styles.prohibited}>
            Device commands, mission release, external send, classification change, credentials, unrestricted URLs, browser scripts, and self-approval are rejected.
          </p>
          {proposalResult ? (
            <div className={styles.proposalDecision} data-state={proposalState} role="status">
              <strong>{proposalResult.decision?.state?.replaceAll("_", " ").toUpperCase() ?? "REJECTED"}</strong>
              <span>{proposalResult.decision?.preview ?? proposalResult.error ?? proposalResult.decision?.reasons?.join(" ")}</span>
              {proposalResult.proposalDigest ? <code>sha256:{proposalResult.proposalDigest}</code> : null}
              {proposalResult.decision?.href ? (
                <Link href={proposalResult.decision.href}>
                  Review proposed navigation <ExternalLink aria-hidden="true" />
                </Link>
              ) : null}
              <small>No action was executed. This response is not durably persisted.</small>
            </div>
          ) : null}
        </div>
      </section>

      <footer className={styles.earthFooter}>
        <span><Network aria-hidden="true" /> Earth Simulator and Form Space remain separate truth surfaces.</span>
        <Link href={buildSituationalHandoffLink("earthSimulator", context)}>
          Open the same Earth context <ExternalLink aria-hidden="true" />
        </Link>
      </footer>
    </section>
  )
}
