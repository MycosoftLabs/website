/** Named-weight truth fusion. Geometry is always scored. Other channels stay NOT_SUPPLIED / UNQUALIFIED unless they have real input. */

export const CHANNEL_WEIGHTS = Object.freeze({
  geometry: 0.4,
  nlm_pattern: 0.12,
  authority_task8: 0.1,
  weather: 0.08,
  physics: 0.06,
  biology: 0.05,
  chemistry: 0.05,
  economics: 0.04,
  topology: 0.03,
  biometry: 0.02,
  military_equipment: 0.02,
  officer_capabilities: 0.01,
  persona: 0.01,
  information: 0.01,
})

export const CHANNEL_IDS = Object.freeze(Object.keys(CHANNEL_WEIGHTS))

export const FUSION_FORMULA =
  'P(truth)=σ(Σ w_i logit(s_i) / Σ w_i) over BOUND channels with a numeric score. UNQUALIFIED and NOT_SUPPLIED are excluded — never treated as 0. P(unsupported)=1−P(truth). Coercion / confusion / counterintel stay NOT_SUPPLIED unless a real signal exists. Class-p is not a geo radius.'

export const CORRIDOR_XY = Object.freeze({ minX: -2300, maxX: 2100, minY: -1600, maxY: 1800 })
export const BOUNDARY_XY = Object.freeze({ minX: -2500, maxX: 2500, minY: -2200, maxY: 2200 })

export function clampProb(p) {
  return Math.min(0.999, Math.max(0.001, p))
}

export function logit(p) {
  const x = clampProb(p)
  return Math.log(x / (1 - x))
}

export function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))
}

export function inRectXY(xy, rect) {
  if (!Array.isArray(xy) || xy.length < 2) return null
  return xy[0] >= rect.minX && xy[0] <= rect.maxX && xy[1] >= rect.minY && xy[1] <= rect.maxY
}

export function haloColor(p) {
  if (typeof p !== 'number' || Number.isNaN(p)) return '#9caac6'
  if (p >= 0.7) return '#3ecf8e'
  if (p >= 0.45) return '#fab85e'
  return '#f07178'
}

export function unusedChannel(id, note = 'No input on this channel.') {
  return {
    id,
    status: 'NOT_SUPPLIED',
    score: null,
    weight: CHANNEL_WEIGHTS[id] ?? 0,
    input: false,
    note,
    decider: null,
  }
}

export function dataQuality(asset) {
  const flags = []
  if (asset.age_seconds != null && asset.age_seconds >= 30) flags.push('stale')
  if (asset.circle_hold === false) flags.push('contradicted')
  if (asset.corridor_hold === false) flags.push('out_of_corridor')
  if ((asset.missing_reports || 0) > 0) flags.push('missingness')
  if (asset.assumption_status === 'DECLARED_BIAS_VIOLATES_ZERO_MEAN_MODEL') flags.push('bias')
  return {
    quality: !asset.valid_reports ? 'NO_OBSERVATION' : flags.length ? 'BAD' : 'GOOD',
    flags,
  }
}

export function scoreGeometry(asset, neighbors = []) {
  const error = asset.latest_error_at_observation_m
  const radius = asset.nominal_radius_m
  const sigma = asset.sigma_m || 35
  const age = asset.age_seconds
  const received = asset.received_reports || 0
  const missing = asset.missing_reports || 0
  const valid = asset.valid_reports || 0
  const haversine = asset.haversine_error_m ?? error
  const quality = dataQuality(asset)

  if (!valid || error == null || radius == null) {
    return {
      id: 'geometry',
      status: 'BOUND',
      score: 0.12,
      weight: CHANNEL_WEIGHTS.geometry,
      input: true,
      note: 'No valid observation at this clock. Geometry still scored (low support). Math channel is never zeroed by NLM.',
      components: {},
      circle_hold: null,
      corridor_hold: asset.corridor_hold ?? null,
      haversine_error_m: haversine ?? null,
      freshness_s: age,
      quality,
      formula: 'no-observation prior 0.12',
      decider: { agent_id: 'itdx-geometry', role: 'math' },
    }
  }

  const circleHold = error <= radius
  const circle = circleHold ? 0.84 : clampProb(0.84 * Math.exp(-((error - radius) / sigma)))
  const freshness = age == null ? null : clampProb(Math.exp(-age / 90))
  const missingness = received ? clampProb(1 - missing / received) : null
  const bias = asset.assumption_status === 'DECLARED_BIAS_VIOLATES_ZERO_MEAN_MODEL' ? 0.28 : 0.8
  const corridorHold = asset.corridor_hold
  const corridor = corridorHold == null ? null : corridorHold ? 0.76 : 0.34
  const neighborHolds = neighbors.filter((item) => item && item.circle_hold != null)
  const agreement = neighborHolds.length
    ? clampProb(neighborHolds.filter((item) => item.circle_hold).length / neighborHolds.length)
    : null

  const parts = [
    ['circle', circle, 0.3],
    ['freshness', freshness, 0.2],
    ['missingness', missingness, 0.15],
    ['bias', bias, 0.2],
    ['corridor', corridor, 0.1],
    ['agreement', agreement, 0.05],
  ].filter(([, score]) => typeof score === 'number')
  const weightSum = parts.reduce((sum, [, , weight]) => sum + weight, 0)
  const logOdds = parts.reduce((sum, [, score, weight]) => sum + (weight / weightSum) * logit(score), 0)
  const score = sigmoid(logOdds)

  return {
    id: 'geometry',
    status: 'BOUND',
    score,
    weight: CHANNEL_WEIGHTS.geometry,
    input: true,
    note: 'Haversine vs synthetic truth, uncertainty-circle hold/fail, freshness, corridor, missingness, declared bias, neighbor circle agreement.',
    components: Object.fromEntries(parts.map(([key, value, weight]) => [key, { score: value, weight }])),
    circle_hold: circleHold,
    corridor_hold: corridorHold,
    haversine_error_m: haversine,
    freshness_s: age,
    quality,
    formula: 'σ(Σ (w/W) logit(component)) on circle, freshness, missingness, bias, corridor, agreement',
    decider: { agent_id: 'itdx-geometry', role: 'math' },
  }
}

export function scoreTopology(asset) {
  if (asset.boundary_hold == null && asset.corridor_hold == null) {
    return unusedChannel('topology', 'No AO polygon / position pair for this sample.')
  }
  const inside = asset.boundary_hold !== false
  return {
    id: 'topology',
    status: 'BOUND',
    score: inside ? (asset.corridor_hold === false ? 0.42 : 0.78) : 0.18,
    weight: CHANNEL_WEIGHTS.topology,
    input: true,
    note: 'Authored Fort Stewart AO polygon + display corridor. Not movement feasibility.',
    decider: { agent_id: 'itdx-geometry', role: 'topology' },
  }
}

export function fuseChannels(channels) {
  const list = CHANNEL_IDS.map((id) => channels.find((channel) => channel?.id === id) || unusedChannel(id))
  const active = list.filter((channel) => channel.status === 'BOUND' && typeof channel.score === 'number')
  const weightSum = active.reduce((sum, channel) => sum + (channel.weight || 0), 0)
  const logOdds = weightSum
    ? active.reduce((sum, channel) => sum + ((channel.weight || 0) / weightSum) * logit(channel.score), 0)
    : logit(0.5)
  const pTruth = weightSum ? sigmoid(logOdds) : null
  const pUnsupported = pTruth == null ? null : 1 - pTruth
  const who = active.map((channel) => channel.decider).filter(Boolean)
  const authority = list.find((channel) => channel.id === 'authority_task8')
  if (authority?.decider) who.push(authority.decider)

  return {
    formula: FUSION_FORMULA,
    weights: CHANNEL_WEIGHTS,
    active_weight_sum: weightSum,
    log_odds: weightSum ? logOdds : null,
    p_truth: pTruth,
    p_unsupported: pUnsupported,
    p_deception: null,
    deception_status: 'NOT_SUPPLIED',
    coercion_status: 'NOT_SUPPLIED',
    confusion_status: 'NOT_SUPPLIED',
    counterintel_status: 'NOT_SUPPLIED',
    class_p_is_geo_radius: false,
    overlay: { synthetic: true, live: false },
    channels: list,
    who_decided: who.length
      ? who
      : [{ agent_id: 'itdx-geometry', role: 'math', note: 'Geometry-only until a MAS/NLM channel is BOUND with a score.' }],
    halo_color: haloColor(pTruth),
    p_truth_pct: pTruth == null ? '—' : `${Math.round(pTruth * 100)}%`,
    p_unsupported_pct: pUnsupported == null ? '—' : `${Math.round(pUnsupported * 100)}%`,
  }
}

export function scoreAsset(asset, neighbors = [], extraChannels = []) {
  const geometry = scoreGeometry(asset, neighbors)
  const topology = scoreTopology(asset)
  const fused = fuseChannels([geometry, topology, ...extraChannels])
  const quality = geometry.quality || dataQuality(asset)
  return {
    ...fused,
    asset_id: asset.id,
    label: asset.label,
    quality: quality.quality,
    quality_flags: quality.flags,
    geometry,
  }
}

export function scoreFrame(frame, extraByAsset = {}) {
  const prelim = (frame.assets || []).map((asset) => ({
    ...asset,
    circle_hold: asset.circle_hold ?? (asset.latest_error_at_observation_m != null && asset.nominal_radius_m != null
      ? asset.latest_error_at_observation_m <= asset.nominal_radius_m
      : null),
  }))
  const assets = prelim.map((asset) => {
    const neighbors = prelim.filter((item) => item.id !== asset.id)
    return scoreAsset(asset, neighbors, extraByAsset[asset.id] || [])
  })
  const byId = Object.fromEntries(assets.map((item) => [item.asset_id, item]))
  return { ...frame, truth: { schema: 'itdx-truth-fusion/v1', assets, byId } }
}

export function applyFusionProperties(feature, fusion) {
  if (!fusion || feature?.properties?.kind !== 'asset') return feature
  return {
    ...feature,
    properties: {
      ...feature.properties,
      p_truth: fusion.p_truth,
      p_unsupported: fusion.p_unsupported,
      p_truth_pct: fusion.p_truth_pct,
      p_unsupported_pct: fusion.p_unsupported_pct,
      halo_color: fusion.halo_color,
      data_quality: fusion.quality,
      deception_status: fusion.deception_status,
      probability_data_true: fusion.p_truth,
      probability_deception: fusion.p_unsupported,
      badge: `${feature.properties.label} ${fusion.p_truth_pct}`,
    },
  }
}
