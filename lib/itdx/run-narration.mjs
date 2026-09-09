/** Shared ITDX run narration + honesty helpers. No mock COP. */

export const LOCAL_REPLAY_RUN_ID = 'itdx-bulldog-demo'
export const LOCAL_DATASET_ID = 'demo-11'
export const CARD_STEP = 15
export const MAS_TASK8_PATHS = Object.freeze([
  '/api/itdx/task8',
  '/api/avani/task8',
  '/api/myca/task8',
  '/api/itdx/authority',
])
export const MAS_SITUATION_PATH = '/api/itdx/situation-assessment'
export const MAS_ITDX_HEALTH_PATH = '/api/itdx/health'
export const MAS_AVANI_STATUS_PATHS = Object.freeze([
  '/api/avani/status',
  '/api/avani/health',
])
export const FORT_STEWART_SLICE = Object.freeze({
  name: 'Fort Stewart',
  bbox: [-81.70, 31.80, -81.45, 32.05],
  center: [31.88, -81.61],
})

export const CARD_DEFS = Object.freeze([
  {
    id: 'formspace',
    title: 'FormSpace',
    math: 'Subject lives on a typed chart. F_t is the time-indexed form state; invariants are declared, not inferred from a dashboard color.',
  },
  {
    id: 'nlm',
    title: 'NLM 24-D',
    math: 'Input is 16 sensor channels + 7 missingness flags + time. Missing ≠ 0. SSM memory; 32 chart coordinates. Unloaded model cannot score live captures.',
  },
  {
    id: 'task12',
    title: 'Task 12 · pattern',
    math: 'logit z → calibrated p = σ(z/T). Class is a labeled environmental event under this chart — not “73% of all facts.”',
  },
  {
    id: 'task13',
    title: 'Task 13 · links',
    math: 'Typed edges + pair features. Question: same environmental event? Spatial proximity is the baseline, not the claim.',
  },
  {
    id: 'conformal',
    title: 'Conformal sets',
    math: 'Prediction set ∈ {{background}, {candidate}, both, empty}. Empty is abstention, not a hidden class.',
  },
  {
    id: 'avani_myca',
    title: 'Task 8 · AVANI / MYCA',
    math: 'DENY / PAUSE / PASS / REVIEW on the declared envelope. Per-role MAS results only when the Task 8 API returns them. No invented seven-agent chorus.',
  },
  {
    id: 'borda',
    title: 'Borda',
    math: 'Borda ranks preference among admissible options. It is not P(success) and not a geo radius.',
  },
  {
    id: 'task14_earth',
    title: 'Task 14 · Earth Sim',
    math: 'GeoJSON only if coordinates exist. position_uncertainty = NOT_ESTIMATED unless estimated. Class-p is not a geo radius. Overlay synthetic:true live:false.',
  },
])

export function cardIndexFromReplay(index) {
  if (!Number.isInteger(index) || index < 0) return 0
  return Math.min(CARD_DEFS.length - 1, Math.floor(index / CARD_STEP))
}

export function conformalSetLabel(predictionSet) {
  if (!Array.isArray(predictionSet) || predictionSet.length === 0) return 'empty'
  const hasBackground = predictionSet.includes(0) || predictionSet.includes('background')
  const hasCandidate = predictionSet.includes(1) || predictionSet.includes('candidate')
  if (hasBackground && hasCandidate) return 'both'
  if (hasCandidate) return '{candidate}'
  if (hasBackground) return '{background}'
  return `set=${JSON.stringify(predictionSet)}`
}

export function officialInjectsStatus(supplied) {
  if (supplied && typeof supplied === 'object' && supplied.scale_1_to_5 != null) {
    return { status: 'SUPPLIED', scale_1_to_5: supplied.scale_1_to_5 }
  }
  return { status: 'NOT_SUPPLIED', scale_1_to_5: null, note: 'Official 1–5 injects were not provided. Do not invent them.' }
}

export function nlmQualification(health, checkpoints, predict) {
  const loaded = health?.model_loaded === true
  const count = Number(checkpoints?.count ?? checkpoints?.checkpoints?.length ?? 0)
  const predictText = typeof predict === 'string' ? predict : predict?.text
  const stub = typeof predictText === 'string' && /not yet fully trained/i.test(predictText)
  if (loaded && !stub) {
    return {
      qualification: 'BOUND',
      task12_path: 'NLM_LIVE',
      model_loaded: true,
      checkpoint_count: count,
    }
  }
  return {
    qualification: 'UNQUALIFIED',
    task12_path: 'FORMSPACE_RECORDED',
    model_loaded: loaded,
    checkpoint_count: count,
    missing_artifact: stub
      ? 'MAS /api/nlm/health may say model_loaded=true, but /api/nlm/predict still returns the untrained stub. Stub confidence is not Task 12 p. Math channel is unchanged.'
      : count === 0
      ? 'No NLM training checkpoint on MAS 188 (/api/nlm/training/checkpoints count=0). /api/nlm/load was not called.'
      : 'Checkpoints listed but model_loaded=false. Load only via existing API when ops allow; do not unload as a probe.',
  }
}

export function sevenRoleQualification(task8) {
  const roles = Array.isArray(task8?.roles) ? task8.roles.filter((role) => role && role.bound === true) : []
  if (roles.length >= 7 && task8?.source === 'mas') {
    return { qualification: 'BOUND', role_count: roles.length, source: 'mas' }
  }
  return {
    qualification: 'UNQUALIFIED',
    role_count: roles.length,
    source: task8?.source || 'none',
    missing_artifact: 'No 7-role Task 8 payload from MAS. Live paths: POST /api/itdx/situation-assessment, GET/POST /api/itdx/task8, aliases ' + MAS_TASK8_PATHS.join(', ') + '. Health GET /api/itdx/health. Seven roles are REVIEW/PASS/PAUSE as returned — not seven PASS.',
  }
}

export function normalizeMasTask8(payload, path) {
  if (!payload || typeof payload !== 'object') return null
  const rawRoles = payload.roles || payload.agents || payload.per_role || payload.task8?.roles || null
  if (!Array.isArray(rawRoles) || rawRoles.length === 0) return null
  const roles = rawRoles.map((role, i) => {
    const verdict = String(role.verdict || role.gate || role.decision || role.status || 'UNQUALIFIED').toUpperCase()
    const bound = role.bound === true || role.live === true
    return {
      id: String(role.id || role.role_id || role.agent_id || role.name || `role-${i}`),
      label: String(role.label || role.title || role.name || role.id || `role-${i}`),
      verdict: ['DENY', 'PAUSE', 'PASS', 'REVIEW'].includes(verdict) ? verdict : 'UNQUALIFIED',
      bound,
      note: typeof role.note === 'string' ? role.note : typeof role.missing_artifact === 'string' ? role.missing_artifact : '',
    }
  })
  return {
    source: 'mas',
    path,
    schema: payload.schema || payload.schema_version || 'itdx-task8/v1',
    schema_version: payload.schema_version || payload.schema || 'itdx-task8/v1',
    roles,
    options: Array.isArray(payload.options) ? payload.options : [],
    seven_role: roles.filter((role) => role.bound).length >= 7,
    p_truth: null,
    p_truth_owner: 'website_geometry',
  }
}

const SITUATION_CHANNEL_IDS = Object.freeze([
  'nlm',
  'earth2',
  'myca',
  'brain',
  'crep',
  'weather',
  'biology',
  'information',
  'equipment_weapons_assets',
  'physics',
])
export const DEMO_SITUATION_CHANNEL_IDS = Object.freeze([
  'traffic',
  'pathways',
  'navigation',
  'base',
  'vehicle_constraints',
])

function collectSituationFields(payload) {
  const map = {}
  const raw = payload?.channels
  if (Array.isArray(raw)) {
    for (const channel of raw) {
      const id = String(channel?.id || channel?.name || '')
      if (id) map[id] = channel
    }
  } else if (raw && typeof raw === 'object') {
    Object.assign(map, raw)
  }
  for (const id of [...SITUATION_CHANNEL_IDS, ...DEMO_SITUATION_CHANNEL_IDS]) {
    if (payload?.[id] != null && map[id] == null) map[id] = payload[id]
  }
  return map
}

export function extractSituationGeojson(value) {
  if (!value || typeof value !== 'object') return null
  if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return value
  if (value.geojson) return extractSituationGeojson(value.geojson)
  if (value.geometry && value.geometry.type) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: value.geometry, properties: value.properties || {} }] }
  }
  if (Array.isArray(value.features) && value.features.length) {
    return { type: 'FeatureCollection', features: value.features }
  }
  if (value.live) return extractSituationGeojson(value.live)
  return null
}

export function normalizeSituationAssessment(payload) {
  if (!payload || typeof payload !== 'object') return null
  const fields = collectSituationFields(payload)
  const ids = Array.from(new Set([
    ...Object.keys(fields),
    ...SITUATION_CHANNEL_IDS,
    ...DEMO_SITUATION_CHANNEL_IDS,
  ]))
  const channels = ids.map((id) => situationChannelFromField(id, fields[id]))
  const geojson = channels.map((channel) => channel.geojson).find((item) => item?.features?.length) || extractSituationGeojson(payload)
  return {
    schema_version: payload.schema_version || 'itdx.situation_assessment/v1',
    source: 'mas',
    path: MAS_SITUATION_PATH,
    source_url: `http://192.168.0.188:8001${MAS_SITUATION_PATH}`,
    ao: payload.ao || { name: FORT_STEWART_SLICE.name, bbox: FORT_STEWART_SLICE.bbox, center: FORT_STEWART_SLICE.center },
    clock: payload.clock || null,
    channels,
    geojson: geojson || null,
    equipment: fields.equipment_weapons_assets || payload.equipment_weapons_assets || null,
    p_truth: null,
    p_truth_owner: 'website_geometry',
    note: 'MAS situation channels are qualification only. Website geometry owns P(truth). MAS p_truth is ignored when NOT_SUPPLIED.',
    synthetic: true,
    live_cop: false,
  }
}

function citationList(value) {
  const rows = []
  for (const item of value?.sources || []) {
    if (!item) continue
    rows.push({
      name: item.source_name || item.name || item.source || 'source',
      url: item.source_url || item.url || item.citation || '',
      count: typeof item.sample_count === 'number' ? item.sample_count : null,
    })
  }
  return rows
}

export function extractChannelFacts(id, value) {
  const live = value?.live && typeof value.live === 'object' ? value.live : {}
  const facts = {
    reason: value?.reason || (value?.error === 'GOOGLE_MAPS_API_KEY unset' ? 'google_maps_key_missing' : null),
    capability_class: value?.capability_class || live.capability_class || null,
    live: live.live === false ? false : live.live === true ? true : null,
  }
  const current = live.open_meteo?.current || live.open_meteo || {}
  const temp = current.temperature_2m ?? current.temperature_c ?? live.temperature_2m
  if (typeof temp === 'number' && Number.isFinite(temp)) facts.temperature_c = temp
  if (live.nws?.ok || live.nws?.citation) {
    facts.nws = live.nws.citation || live.nws.source_url || 'https://api.weather.gov'
    facts.nws_cwa = live.nws.cwa || null
  }
  if (live.open_meteo?.citation) facts.open_meteo = live.open_meteo.citation
  const gbifCount = live.gbif?.count ?? live.gbif?.total
  if (typeof gbifCount === 'number') facts.gbif_count = gbifCount
  const inatCount = live.inaturalist?.count ?? live.inaturalist?.total_results ?? live.inaturalist?.total
  if (typeof inatCount === 'number') facts.inaturalist_count = inatCount
  const wikiPages = live.wikipedia?.pages || live.public_base?.wikipedia?.pages || []
  if (Array.isArray(wikiPages) && wikiPages.length) {
    facts.wikipedia = wikiPages.map((page) => ({
      title: page.title || page.display_name || 'Wikipedia',
      url: page.url || page.citation || '',
    }))
  }
  const places = live.public_base?.nominatim?.places || []
  if (Array.isArray(places) && places.length) {
    facts.nominatim = places.map((place) => place.display_name || place.query).filter(Boolean)
  }
  if (id === 'equipment_weapons_assets' && facts.capability_class == null) facts.capability_class = 'public_road'
  if (id === 'equipment_weapons_assets' && facts.live == null) facts.live = false
  return facts
}

function situationChannelFromField(id, value) {
  const sourceUrl = `http://192.168.0.188:8001${MAS_SITUATION_PATH}#${id}`
  if (value == null) {
    const demoNote = DEMO_SITUATION_CHANNEL_IDS.includes(id)
      ? `MAS ${MAS_SITUATION_PATH} has no ${id} channel. Shown as NOT_SUPPLIED — no invented COP.`
      : 'MAS field absent.'
    return { id, status: 'NOT_SUPPLIED', score: null, note: demoNote, source_url: sourceUrl, geojson: null, facts: { reason: null } }
  }
  if (typeof value !== 'object') {
    return { id, status: 'NOT_SUPPLIED', score: null, note: String(value), source_url: sourceUrl, geojson: null, facts: { reason: null } }
  }
  const raw = String(value.qualification || value.status || value.state || '').toUpperCase()
  let status = 'NOT_SUPPLIED'
  if (['BOUND', 'UNQUALIFIED', 'NOT_SUPPLIED', 'SUPPLIED'].includes(raw)) status = raw
  else if (value.available === true || value.model_loaded === true) status = 'BOUND'
  else if (value.available === false || value.error || raw === 'DORMANT' || raw === 'UNHEALTHY') status = 'UNQUALIFIED'
  const facts = extractChannelFacts(id, value)
  const citations = citationList(value)
  return {
    id,
    status,
    score: typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : null,
    note: value.note || value.error || value.hint || facts.reason || raw || 'No numeric score from MAS.',
    reason: facts.reason,
    source_url: value.source_url || citations[0]?.url || sourceUrl,
    citations,
    facts,
    geojson: extractSituationGeojson(value),
    agent_id: value.agent_id || null,
  }
}

export function buildEvidenceSummary({ context, bootstrap, dataset, document, backendRun }) {
  const runId = context?.runId || null
  const datasetId = context?.datasetId || null
  const documentId = context?.documentId || null
  const runs = Array.isArray(bootstrap?.runs) ? bootstrap.runs : []
  const runExists = Boolean(runId && runs.some((run) => (run?.id || run) === runId))
  const parts = []
  const refs = []

  if (runId && runExists && backendRun) {
    parts.push(`${runId} · backend job · ${backendRun.data_origin || backendRun.origin || 'UNSPECIFIED'}`)
    refs.push({ kind: 'run', id: runId, origin: 'itdx-8765' })
  } else if (runId === LOCAL_REPLAY_RUN_ID || (runId && !runExists)) {
    parts.push(`${runId} · SYNTHETIC_EXERCISE · local Earth Sim replay · no backend /api/run job`)
    refs.push({ kind: 'local_replay', id: runId, origin: 'replay-core', live: false, synthetic: true })
  }

  if (dataset?.dataset || dataset?.id || datasetId) {
    const id = dataset?.dataset?.id || dataset?.id || datasetId
    const total = typeof dataset?.total === 'number' ? dataset.total : dataset?.dataset?.record_count
    parts.push(`${id}${total != null ? ` · ${total} records` : ''} · SYNTHETIC_TEST`)
    refs.push({ kind: 'dataset', id, origin: 'itdx-8765' })
  }

  if (document) {
    const id = document.id || documentId
    parts.push(document.name || id)
    refs.push({ kind: 'document', id, origin: 'itdx-8765' })
  }

  return {
    ok: true,
    status: 200,
    kind: refs.length ? 'ready' : 'idle',
    label: refs.length ? 'ITDX evidence' : 'No ITDX run selected',
    detail: parts.join(' · ') || 'Shared references only. Opening this app does not start a job.',
    refs,
    data_origin: context?.dataOrigin || 'UNSPECIFIED',
    synthetic: true,
    live: false,
  }
}

export function buildCards({ replayIndex, selected, bind, formspace, task8 }) {
  const active = cardIndexFromReplay(replayIndex)
  const clock = selected?.observed_at || bind?.replay_time || null
  const asset = selected?.label || selected?.id || 'none'
  const nlm = nlmQualification(bind?.nlm, bind?.nlm_checkpoints)
  const seven = sevenRoleQualification(task8)
  const injects = officialInjectsStatus(bind?.official_injects)
  const t12 = formspace?.task12?.metrics?.classifier
  const t13 = formspace?.task13?.metrics?.classifier
  const pred = formspace?.task12?.predictions?.[0]
  const setLabel = conformalSetLabel(pred?.prediction_set)
  const gates = (task8?.options || formspace?.task8?.options || []).map((option) => option.formspace_gate || option.gate || option.verdict).filter(Boolean)
  const borda = formspace?.task8?.rank_semantics || 'Preference only; never probability of success'
  const ao = bind?.ao_place || 'Fort Stewart, Liberty County, Georgia'

  const live = [
    `clock=${clock || '—'}`,
    `unit=${asset}`,
    `T12 F1=${t12?.f1 ?? 'UNQUALIFIED'} (${nlm.task12_path})`,
    `T13 F1=${t13?.f1 ?? 'UNQUALIFIED'}`,
    `set=${setLabel}`,
    `gate=${gates.join('/') || 'UNQUALIFIED'}`,
    `task8=${task8?.source || 'none'}`,
    `NLM=${nlm.qualification}`,
    `injects=${injects.status}`,
  ]

  return CARD_DEFS.map((def, i) => {
    let body = def.math
    if (def.id === 'formspace') {
      body += ` Chart ${pred?.chart_id || 'environmental-ssm32/v1'}. Origin ${formspace?.origin || bind?.formspace_origin || 'UNQUALIFIED'}. F_t / form_state recorded on the chart; capability claim remains ENGINEERED_REFERENCE.`
    }
    if (def.id === 'nlm') {
      body += ` ${nlm.qualification}: ${nlm.missing_artifact || 'model_loaded=true'} Task 12 path ${nlm.task12_path}.`
    }
    if (def.id === 'task12' && t12) {
      body += ` Bundled recorded F1=${t12.f1} Brier=${t12.brier} n=${t12.n}. ${nlm.task12_path === 'NLM_LIVE' ? 'Live NLM bound.' : 'Labeled recorded FormSpace path.'}`
    }
    if (def.id === 'task13' && t13) {
      body += ` Bundled recorded F1=${t13.f1} n=${t13.n}.`
    }
    if (def.id === 'conformal') {
      body += ` Current sample set ${setLabel}.`
    }
    if (def.id === 'avani_myca') {
      body += ` Source ${task8?.source || 'none'}. ${seven.qualification}${seven.missing_artifact ? ` · ${seven.missing_artifact}` : ''}`
    }
    if (def.id === 'borda') {
      body += ` ${borda}`
    }
    if (def.id === 'task14_earth') {
      const pTruth = typeof selected?.p_truth === 'number' ? `${(100 * selected.p_truth).toFixed(1)}%` : 'geometry-pending'
      body += ` Land AO ${ao}. Play sample ${replayIndex}/120. Selected ${asset}. P(truth)=${pTruth} from named-weight log-odds (geometry always; NLM/MAS only if BOUND). Class-p is not a geo radius.`
    }
    return {
      ...def,
      index: i,
      active: i === active,
      reached: i <= active,
      live,
      body,
    }
  })
}
