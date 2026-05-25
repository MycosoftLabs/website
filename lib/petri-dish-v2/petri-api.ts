/** Client helpers for Petri v2 REST (via Next proxy). Date: May 02, 2026 */

import type { PetriAction, PetriStateSnapshot } from "@/components/petri-dish-v2/types"

const PREFIX = "/api/simulation/petri/v2"

async function parseJson(res: Response): Promise<unknown> {
  const t = await res.text()
  try {
    return JSON.parse(t) as unknown
  } catch {
    return { raw: t }
  }
}

export async function petriHealth(): Promise<unknown> {
  const res = await fetch(`${PREFIX}/health`, { cache: "no-store" })
  return parseJson(res)
}

export async function petriState(): Promise<PetriStateSnapshot> {
  const res = await fetch(`${PREFIX}/state`, { cache: "no-store" })
  if (!res.ok) throw new Error(`state ${res.status}`)
  return (await parseJson(res)) as PetriStateSnapshot
}

export async function petriStep(n = 1, force = false): Promise<PetriStateSnapshot> {
  const res = await fetch(`${PREFIX}/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n, force }),
  })
  if (!res.ok) throw new Error(`step ${res.status}`)
  return (await parseJson(res)) as PetriStateSnapshot
}

export async function petriReset(seedHex?: string): Promise<PetriStateSnapshot> {
  const res = await fetch(`${PREFIX}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed_hex: seedHex ?? null }),
  })
  if (!res.ok) throw new Error(`reset ${res.status}`)
  return (await parseJson(res)) as PetriStateSnapshot
}

export async function petriPause(paused: boolean): Promise<PetriStateSnapshot> {
  const res = await fetch(`${PREFIX}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paused }),
  })
  if (!res.ok) throw new Error(`pause ${res.status}`)
  return (await parseJson(res)) as PetriStateSnapshot
}

export async function petriAction(action: PetriAction): Promise<PetriStateSnapshot> {
  const res = await fetch(`${PREFIX}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  })
  if (!res.ok) throw new Error(`action ${res.status}`)
  return (await parseJson(res)) as PetriStateSnapshot
}
