export function masBase(): string
export function probeMasTask8(mapSlice?: Record<string, unknown> | null): Promise<{
  task8: {
    source: 'mas'
    path: string
    schema: string
    roles: Array<{ id: string; label: string; verdict: string; bound: boolean; note: string }>
    options: unknown[]
    seven_role: boolean
  } | null
  probes: Array<{ method: string; path: string; status: number; ok: boolean }>
}>
export function evaluateMasGovernor(option: { id: string; title?: string }): Promise<{ ok: boolean; status: number; data: unknown }>
export function mycaHealth(): Promise<{ ok: boolean; status: number; data: unknown }>
export function nlmBind(): Promise<{ health: unknown; checkpoints: unknown; health_status: number; checkpoint_status: number }>
export function mindexHealth(): Promise<{
  health: unknown
  health_status: number
  species_status: number
  species_rows: number
  empty_state: boolean
  note: string
}>
