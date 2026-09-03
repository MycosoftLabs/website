"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpenCheck, ChevronDown, ChevronUp, RefreshCw, ShieldAlert } from "lucide-react"

export type MultimodalCatalogApplication =
  | "GANDHA"
  | "BlueSight"
  | "FCI"
  | "Thermal"
  | "Tactus — Mechanical"

interface MultimodalCandidateSummary {
  id: string
  application: MultimodalCatalogApplication
  modalities: readonly string[]
  artifactKinds: readonly string[]
  trainingSourceRole: string
  sourceSummary: string
  authorityReferences: readonly {
    title: string
    kind: string
    observationState: "observed" | "future-required"
    locatorAvailable: boolean
  }[]
  terms: { state: string; observedLicenses: readonly string[]; summary: string; sufficientForAcquisition: false }
  version: { state: string; observedLabel: string | null; immutableArtifactFrozen: false }
  checksum: { state: string; providerChecksumCount: number; mycosoftSha256: null }
  size: { state: string; publishedSummary: string; boundedObjectManifestPresent: false; destinationCapacityVerified: false }
  destination: { state: string; physicalLocationVerified: false }
  provenance: { state: "requirements-only"; captured: false }
  validation: { state: string; completed: false }
  approval: { state: "absent"; approver: null; approvedAt: null; scope: null }
  statuses: readonly string[]
  gate: { state: "closed"; blockers: readonly string[] }
  executionAuthority: false
}

interface MultimodalEnvelope {
  state: "available"
  multimodal: {
    schema: string
    version: string
    counts: { total: number; approved: number; acquired: number }
    candidates: readonly MultimodalCandidateSummary[]
    executionPolicy: {
      metadataOnly: true
      networkRequestsAuthorized: false
      downloadsAuthorized: false
      filesystemOrNasAccessAuthorized: false
      credentialUseAuthorized: false
      trainingAuthorized: false
      modelPromotionAuthorized: false
      serviceChangesAuthorized: false
      deviceActionsAuthorized: false
    }
  }
}

function isMultimodalEnvelope(value: unknown): value is MultimodalEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const envelope = value as Record<string, unknown>
  if (envelope.state !== "available" || !envelope.multimodal || typeof envelope.multimodal !== "object") return false
  const multimodal = envelope.multimodal as Record<string, unknown>
  return typeof multimodal.version === "string" && Array.isArray(multimodal.candidates)
}

const humanize = (value: string) => value.replaceAll("-", " ")

export function MultimodalSourceCatalog({ application }: { application: MultimodalCatalogApplication }) {
  const [envelope, setEnvelope] = useState<MultimodalEnvelope | null>(null)
  const [state, setState] = useState<"loading" | "available" | "unavailable">("loading")
  const [reason, setReason] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setState("loading")
    setReason(null)
    try {
      const response = await fetch("/api/fusarium/training-data/sources", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok || !isMultimodalEnvelope(body)) {
        setEnvelope(null)
        setState("unavailable")
        setReason(`The protected research registry is unavailable (HTTP ${response.status}).`)
        return
      }
      setEnvelope(body)
      setState("available")
    } catch {
      setEnvelope(null)
      setState("unavailable")
      setReason("The protected research registry could not be read.")
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const candidates = useMemo(
    () => envelope?.multimodal.candidates.filter((candidate) => candidate.application === application) ?? [],
    [application, envelope],
  )
  const headingId = `multimodal-source-${application.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`

  return (
    <section
      aria-labelledby={headingId}
      className="mx-3 my-3 rounded-xl border border-emerald-300/20 bg-black/55 p-3 text-zinc-100 shadow-2xl backdrop-blur-xl"
      data-multimodal-source-catalog={application}
      data-source-state={state}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/75">Controlled source research</p>
          <h2 id={headingId} className="mt-1 flex items-center gap-2 text-base font-black text-white">
            <BookOpenCheck className="h-4 w-4 text-emerald-300" />
            {application} source candidates
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Current-source research is visible as planning evidence only. Nothing listed here is downloaded, installed, licensed, approved, or accepted for training.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={state === "loading"} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-50">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide sources" : "Review sources"}
          </button>
        </div>
      </div>

      {state === "loading" ? <p className="mt-3 text-xs text-zinc-500">Loading the owner-gated research registry…</p> : null}
      {state === "unavailable" ? (
        <div role="status" className="mt-3 flex gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-100">
          <ShieldAlert className="h-4 w-4 shrink-0" /> {reason} No acquisition state is inferred.
        </div>
      ) : null}
      {envelope ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Fact label={`${application} candidates`} value={String(candidates.length)} />
          <Fact label="Approved" value="0" />
          <Fact label="Acquired" value="0" />
          <Fact label="Registry" value={envelope.multimodal.version} />
        </div>
      ) : null}

      {expanded && envelope ? (
        <div className="mt-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-[11px] leading-5 text-amber-100/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>All transfer, rights, version, checksum, size, destination, validation, and human-approval gates remain closed. This surface cannot download, train, promote a model, write storage, or contact a device.</p>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-lg border border-white/10 bg-zinc-950/75 p-3">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-xs leading-5 text-zinc-100">{candidate.authorityReferences[0]?.title ?? candidate.id}</strong>
                  <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-200">Gated</span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-zinc-400">{candidate.sourceSummary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {candidate.modalities.map((modality) => <span key={modality} className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2 py-0.5 text-[9px] text-emerald-100">{humanize(modality)}</span>)}
                </div>
                <dl className="mt-3 grid gap-1 text-[10px] text-zinc-500">
                  <div className="flex justify-between gap-3"><dt>Role</dt><dd className="text-right text-zinc-300">{humanize(candidate.trainingSourceRole)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Terms</dt><dd className="text-right text-zinc-300">{humanize(candidate.terms.state)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Version</dt><dd className="text-right text-zinc-300">{candidate.version.observedLabel ?? humanize(candidate.version.state)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Closed gates</dt><dd className="text-right text-amber-200">{candidate.gate.blockers.length}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</span><strong className="mt-1 block text-sm text-zinc-100">{value}</strong></div>
}
