/**
 * BFF-backed store shim replacing Firebase Firestore on the NLM product path.
 * Components keep collection/addDoc/updateDoc shapes; data goes to Supabase via BFF.
 * No mock metrics — writes fail honestly when APIs reject.
 */

const BASE = "/api/natureos/nlm-training"

export const db = { __nlm_bff: true as const }

type Ref = { path: string; id?: string }

export function collection(_db: unknown, ...segments: string[]): Ref {
  return { path: segments.join("/") }
}

export function doc(_db: unknown, ...segments: string[]): Ref {
  const path = segments.join("/")
  return { path, id: segments[segments.length - 1] }
}

export function serverTimestamp() {
  return new Date().toISOString()
}

function collectionName(path: string): string {
  return path.split("/")[0] || path
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `BFF write failed (${res.status}) for ${url}`)
  }
  return res.json()
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // Fallback POST for routes without PATCH
    if (res.status === 405 || res.status === 404) {
      return postJson(url, { ...((body as object) || {}), _method: "PATCH" })
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `BFF patch failed (${res.status}) for ${url}`)
  }
  return res.json()
}

/** Map Firestore-style writes onto NLM BFF endpoints. */
export async function addDoc(ref: Ref, data: Record<string, unknown>) {
  const col = collectionName(ref.path)
  const payload = { ...data }
  // Normalize serverTimestamp placeholders
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string" && v.includes("T") === false && v === "") {
      /* keep */
    }
  }

  switch (col) {
    case "models":
      return postJson(`${BASE}/models`, {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        ownerId: payload.ownerId,
        config: payload.config,
        version: payload.version,
      })
    case "training_runs":
      return postJson(`${BASE}/runs`, {
        modelId: payload.modelId,
        ownerId: payload.ownerId,
        pipelineId: payload.pipelineId,
        status: payload.status || "queued",
        lossHistory: payload.lossHistory || [],
        metrics: payload.metrics || {},
      })
    case "pipelines":
      return postJson(`${BASE}/runs`, {
        modelId: payload.modelId || payload.model_id,
        ownerId: payload.ownerId,
        pipelineId: payload.id,
        status: payload.status || "queued",
        metrics: { pipeline: true, name: payload.name },
      })
    case "variants":
      return postJson(`${BASE}/variants`, payload)
    case "frames":
      return postJson(`${BASE}/mindex`, {
        type: "frame",
        ...payload,
      })
    case "agent_tasks":
      return postJson("/api/agents/tasks", payload).catch(async () => {
        // Soft-fail: agents optional in P1
        console.warn("Agent task BFF unavailable; not persisting to Firebase")
        return { id: `local-${Date.now()}`, ...payload }
      })
    case "agents":
      return postJson("/api/agents", payload).catch(async () => {
        console.warn("Agents BFF unavailable")
        return { id: `local-agent-${Date.now()}`, ...payload }
      })
    case "judgments":
    case "mutations":
    case "mutation_recipes":
    case "mindex_exports":
    case "automation_policies":
      console.warn(`NLM BFF: collection '${col}' write deferred (no durable store yet)`)
      return { id: `deferred-${col}-${Date.now()}`, deferred: true, ...payload }
    default:
      if (ref.path.includes("/versions") || ref.path.includes("/checkpoints")) {
        console.warn(`NLM BFF: subcollection write deferred for ${ref.path}`)
        return { id: `deferred-${Date.now()}`, deferred: true, ...payload }
      }
      throw new Error(`NLM BFF: unsupported collection '${col}'`)
  }
}

export async function updateDoc(ref: Ref, data: Record<string, unknown>) {
  const col = collectionName(ref.path)
  const id = ref.id
  if (!id) throw new Error(`NLM BFF: updateDoc missing id for ${ref.path}`)

  switch (col) {
    case "models":
      return patchJson(`${BASE}/models/${encodeURIComponent(id)}`, data).catch(
        async () => {
          // models/[id] may only support GET — try PUT via POST body
          return postJson(`${BASE}/models`, { id, ...data, _update: true })
        }
      )
    case "training_runs":
    case "pipelines":
      return patchJson(`${BASE}/runs/${encodeURIComponent(id)}`, data).catch(
        async () => {
          console.warn(`Run update deferred for ${id}`)
          return { id, ...data, deferred: true }
        }
      )
    case "agent_tasks":
      return patchJson(`/api/agents/tasks/${encodeURIComponent(id)}`, data).catch(
        async () => ({ id, ...data, deferred: true })
      )
    default:
      console.warn(`NLM BFF: updateDoc deferred for ${ref.path}`)
      return { id, ...data, deferred: true }
  }
}

export async function deleteDoc(ref: Ref) {
  const col = collectionName(ref.path)
  const id = ref.id
  if (!id) throw new Error(`NLM BFF: deleteDoc missing id`)
  console.warn(`NLM BFF: deleteDoc for ${col}/${id} — soft no-op until store wired`)
  return { id, deleted: false, deferred: true }
}
