export const CHANNEL_WEIGHTS: Readonly<Record<string, number>>
export const CHANNEL_IDS: readonly string[]
export const FUSION_FORMULA: string
export const CORRIDOR_XY: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>
export const BOUNDARY_XY: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>
export function clampProb(p: number): number
export function logit(p: number): number
export function sigmoid(z: number): number
export function inRectXY(xy: number[] | null | undefined, rect: { minX: number; maxX: number; minY: number; maxY: number }): boolean | null
export function haloColor(p: number | null | undefined): string
export function unusedChannel(id: string, note?: string): TruthChannel
export function dataQuality(asset: Record<string, unknown>): { quality: string; flags: string[] }
export function scoreGeometry(asset: Record<string, any>, neighbors?: Array<Record<string, any>>): TruthChannel
export function scoreTopology(asset: Record<string, any>): TruthChannel
export function fuseChannels(channels: TruthChannel[]): TruthFusion
export function scoreAsset(asset: Record<string, any>, neighbors?: Array<Record<string, any>>, extraChannels?: TruthChannel[]): TruthFusion & {
  asset_id: string
  label?: string
  quality: string
  quality_flags: string[]
  geometry: TruthChannel
}
export function scoreFrame(frame: { assets?: Array<Record<string, any>> }, extraByAsset?: Record<string, TruthChannel[]>): any
export function applyFusionProperties(feature: any, fusion: TruthFusion | null | undefined): any

export interface TruthChannel {
  id: string
  status: 'BOUND' | 'UNQUALIFIED' | 'NOT_SUPPLIED'
  score: number | null
  weight: number
  input: boolean
  note: string
  decider?: { agent_id: string; role: string; note?: string } | null
  components?: Record<string, { score: number; weight: number }>
  circle_hold?: boolean | null
  corridor_hold?: boolean | null
  haversine_error_m?: number | null
  freshness_s?: number | null
  quality?: { quality: string; flags: string[] }
  formula?: string
}

export interface TruthFusion {
  formula: string
  weights: Readonly<Record<string, number>>
  active_weight_sum: number
  log_odds: number | null
  p_truth: number | null
  p_unsupported: number | null
  p_deception: null
  deception_status: 'NOT_SUPPLIED'
  coercion_status: 'NOT_SUPPLIED'
  confusion_status: 'NOT_SUPPLIED'
  counterintel_status: 'NOT_SUPPLIED'
  class_p_is_geo_radius: false
  overlay: { synthetic: true; live: false }
  channels: TruthChannel[]
  who_decided: Array<{ agent_id: string; role: string; note?: string }>
  halo_color: string
  p_truth_pct: string
  p_unsupported_pct: string
}
