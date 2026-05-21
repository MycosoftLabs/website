import type { BlueSightObservation, PetriTruthState } from "@/lib/bluesight/types"

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}))
  return payload as T
}

export async function bluesightLatestObservation(profile = "petri", runId?: string): Promise<BlueSightObservation | null> {
  const query = new URLSearchParams()
  query.set("profile", profile)
  if (runId) query.set("run_id", runId)
  const response = await fetch(`/api/natureos/bluesight/observations/latest?${query.toString()}`, {
    cache: "no-store",
  })
  if (!response.ok) return null
  const data = await parseJson<{ observation?: BlueSightObservation }>(response)
  return data.observation ?? null
}

export async function upsertPetriTruthState(runId: string, state: Omit<PetriTruthState, "run_id">): Promise<boolean> {
  const response = await fetch(`/api/natureos/petri/runs/${encodeURIComponent(runId)}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  })
  return response.ok
}

export async function submitPetriFrameObservation(runId: string, body: Record<string, unknown>): Promise<BlueSightObservation | null> {
  const response = await fetch(`/api/natureos/petri/runs/${encodeURIComponent(runId)}/frame`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) return null
  const data = await parseJson<{ observation?: BlueSightObservation }>(response)
  return data.observation ?? null
}

