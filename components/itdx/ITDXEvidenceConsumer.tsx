"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { consumerIdFromPath } from "@/lib/itdx/catalog-consumers.mjs"
import { LOCAL_DATASET_ID, LOCAL_REPLAY_RUN_ID } from "@/lib/itdx/run-narration.mjs"
import { registerITDXAdapter, useITDXContext, type ITDXContext } from "@/lib/itdx/session"
import styles from "./itdx-evidence-consumer.module.css"

interface EvidenceState {
  kind: "idle" | "loading" | "ready" | "unavailable"
  label: string
  detail: string
}

function emptyState(): EvidenceState {
  return { kind: "idle", label: "No ITDX run selected", detail: "Shared references only. Opening this app does not start a job." }
}

async function readEvidence(path: string, signal: AbortSignal) {
  const response = await fetch(path, { cache: "no-store", signal })
  if (!response.ok) {
    throw new Error(`ITDX evidence unavailable (${response.status})`)
  }
  return response.json() as Promise<Record<string, unknown>>
}

function summarize(kind: "run" | "dataset" | "document", payload: Record<string, unknown>) {
  if (kind === "run") {
    const id = typeof payload.id === "string" ? payload.id : "run"
    const origin = typeof payload.data_origin === "string" ? payload.data_origin : "UNSPECIFIED"
    const backend = typeof payload.backend === "string" ? payload.backend : "unspecified-backend"
    return `${id} · ${origin} · ${backend}`
  }
  if (kind === "dataset") {
    const dataset = payload.dataset && typeof payload.dataset === "object" ? (payload.dataset as Record<string, unknown>) : payload
    const id = typeof dataset.id === "string" ? dataset.id : "dataset"
    const total = typeof payload.total === "number" ? payload.total : null
    return `${id}${total === null ? "" : ` · ${total} records`}`
  }
  const id = typeof payload.id === "string" ? payload.id : "document"
  const name = typeof payload.name === "string" ? payload.name : id
  return name
}

/**
 * One evidence consumer for every Fusarium catalog app.
 * Registers the current route's appId and fetches the shared run/dataset/document
 * through the authenticated bridge. Not a per-app fork.
 */
export default function ITDXEvidenceConsumer() {
  const pathname = usePathname()
  const context = useITDXContext()
  const appId = consumerIdFromPath(pathname ?? "")
  const [evidence, setEvidence] = useState<EvidenceState>(emptyState)

  useEffect(() => {
    if (!appId) return
    let latest: ITDXContext | null = null
    const stop = registerITDXAdapter({
      appId,
      onContext: (next) => {
        latest = next
      },
    })
    return () => {
      stop()
      latest = null
    }
  }, [appId])

  useEffect(() => {
    if (!appId) return
    const controller = new AbortController()
    const load = async () => {
      if (!context.runId && !context.datasetId && !context.documentId) {
        setEvidence(emptyState())
        return
      }
      setEvidence({ kind: "loading", label: "Loading shared ITDX evidence…", detail: "" })
      try {
        const query = new URLSearchParams()
        query.set("runId", context.runId || LOCAL_REPLAY_RUN_ID)
        query.set("datasetId", context.datasetId || LOCAL_DATASET_ID)
        if (context.documentId) query.set("documentId", context.documentId)
        const payload = await readEvidence(`/api/fusarium/itdx/evidence?${query}`, controller.signal)
        if (controller.signal.aborted) return
        const detail = typeof payload.detail === "string" ? payload.detail : summarize("run", payload)
        setEvidence({
          kind: payload.kind === "idle" ? "idle" : "ready",
          label: `Consumer ${appId}`,
          detail,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setEvidence({
          kind: "unavailable",
          label: `Consumer ${appId}: evidence unavailable`,
          detail: error instanceof Error ? error.message : "ITDX evidence unavailable",
        })
      }
    }
    void load()
    return () => controller.abort()
  }, [appId, context.runId, context.datasetId, context.documentId, context.revision])

  const onEarthSim = (pathname ?? "").startsWith("/fusarium/earth-simulator")
  if (!appId || !onEarthSim) return null

  return (
    <aside className={styles.strip} data-testid="itdx-evidence-consumer" data-itdx-app={appId} aria-label="ITDX shared evidence">
      <p className={styles.badge}>ITDX evidence · {appId}</p>
      <p className={evidence.kind === "ready" ? styles.ok : evidence.kind === "unavailable" ? styles.warn : styles.meta}>
        {evidence.label}
      </p>
      {evidence.detail ? <p className={styles.meta}>{evidence.detail}</p> : null}
      <p className={styles.meta}>
        origin {context.dataOrigin} · synthetic flags stay on the producer. This panel does not grant access or start jobs.
      </p>
    </aside>
  )
}
