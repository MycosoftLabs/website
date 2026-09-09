export function collectTruthBinds(slice: {
  index: number
  replay_time: string
  selected?: Record<string, unknown> | null
  neighbors?: Array<Record<string, unknown>>
  weather?: unknown
}): Promise<{
  nlm: Record<string, unknown>
  myca: unknown
  myca_status: number
  task8: unknown
  task8_probes: unknown[]
  governor: { ok?: boolean; status: number; data?: any } | null
  weather: Record<string, unknown>
  earth2: Record<string, unknown>
  crep: Record<string, unknown>
  physics: Record<string, unknown>
  channels: Array<Record<string, unknown>>
  map_slice: Record<string, unknown>
}>
