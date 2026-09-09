/** Live MAS / NLM / CREP / Earth-2 binds for truth channels. Never invent a score. */

import { AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE } from './replay-core.mjs'
import { nlmQualification } from './run-narration.mjs'
import { assessSituation, evaluateMasGovernor, masBase, mindexHealth, mycaHealth, nlmBind, probeMasTask8 } from './task8-client.mjs'
import { unusedChannel } from './truth-fusion.mjs'

async function readJson(url, init) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), ...init })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: String(text).slice(0, 240) } }
  return { ok: response.ok, status: response.status, data }
}

function mapSlicePayload(slice) {
  return {
    schema: 'itdx-map-slice/v1',
    origin: 'SYNTHETIC_EXERCISE',
    execution: 'ADVISORY_ONLY',
    overlay: { synthetic: true, live: false },
    ao_place: AO_PLACE,
    ao_origin: [AO_ORIGIN_LNG, AO_ORIGIN_LAT],
    index: slice.index,
    replay_time: slice.replay_time,
    selected: slice.selected || null,
    neighbors: slice.neighbors || [],
    weather: slice.weather || null,
    topology: { ao_place: AO_PLACE, corridor: 'authored_display_corridor', boundary: 'authored_exercise_boundary' },
  }
}

export async function collectTruthBinds(slice) {
  const base = masBase()
  const payload = mapSlicePayload(slice)
  const [nlm, task8, myca, situation, mindex, weather, earth2, crep, physics, nlmPredict] = await Promise.all([
    nlmBind(),
    probeMasTask8(payload),
    mycaHealth(),
    assessSituation(payload),
    mindexHealth(),
    readJson(`${base}/api/earthlive/weather?lat=${AO_ORIGIN_LAT}&lon=${AO_ORIGIN_LNG}`).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
    readJson(`${base}/api/earth2/status`).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
    readJson(`${base}/api/crep/status`).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
    readJson(`${base}/api/physics/diffusion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: AO_ORIGIN_LAT, lon: AO_ORIGIN_LNG, map_slice: payload }),
    }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
    readJson(`${base}/api/nlm/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `ITDX synthetic map slice ${payload.selected?.id || 'none'} clock=${payload.replay_time} index=${payload.index} AO=${AO_PLACE} ${AO_ORIGIN_LAT},${AO_ORIGIN_LNG} neighbors=${(payload.neighbors || []).map((item) => item.id).join(',')}`,
        query_type: 'ecology',
        temperature: 0,
        max_tokens: 64,
        context: payload,
      }),
    }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
  ])

  const nlmQ = nlmQualification(nlm.health, nlm.checkpoints, nlmPredict.data)
  const nlmLive = nlmQ.qualification === 'BOUND'
  const nlmChannel = {
    id: 'nlm_pattern',
    status: nlmLive ? 'BOUND' : 'UNQUALIFIED',
    score: nlmLive && typeof nlmPredict.data?.confidence === 'number' ? nlmPredict.data.confidence : null,
    weight: 0.12,
    input: nlmPredict.status === 200,
    note: nlmLive
      ? 'Live NLM Task 12 pattern p from MAS /api/nlm/predict.'
      : `${nlmQ.qualification}: MAS /api/nlm/predict was called (status ${nlmPredict.status}). NLM channel only — math channel unchanged. ${nlmQ.missing_artifact || ''}`,
    decider: nlmPredict.status === 200 ? { agent_id: 'mas-nlm', role: 'nlm_pattern' } : null,
    mas_status: nlmPredict.status,
    model_loaded: nlmQ.model_loaded,
  }

  const weatherLat = Number(weather.data?.latitude)
  const weatherLon = Number(weather.data?.longitude)
  const weatherOnAo = weather.ok && Math.abs(weatherLat - AO_ORIGIN_LAT) < 0.4 && Math.abs(weatherLon - AO_ORIGIN_LNG) < 0.4
  const weatherChannel = weatherOnAo
    ? {
      id: 'weather',
      status: 'BOUND',
      score: null,
      weight: 0.08,
      input: true,
      note: 'EarthLive/CREP returned AO weather, but no weather→track likelihood model is bound. Score excluded from fusion.',
      decider: { agent_id: 'mas-earthlive', role: 'weather' },
      observation: { temperature_c: weather.data?.temperature_c, source: weather.data?.source, latitude: weatherLat, longitude: weatherLon },
    }
    : unusedChannel('weather', weather.ok
      ? `Weather API returned ${weatherLat},${weatherLon} (not Fort Stewart AO). No AO weather→track model.`
      : `Weather bind failed (${weather.status}).`)

  const physicsChannel = physics.ok && typeof physics.data?.score === 'number'
    ? { id: 'physics', status: 'BOUND', score: physics.data.score, weight: 0.06, input: true, note: 'MAS physics diffusion returned a numeric score.', decider: { agent_id: 'mas-physics', role: 'physics' } }
    : unusedChannel('physics', `MAS /api/physics/diffusion ${physics.status}${physics.data?.detail ? ` · ${physics.data.detail}` : ''}. No physics score.`)

  const authority = task8.task8
    ? {
      id: 'authority_task8',
      status: 'BOUND',
      score: null,
      weight: 0.1,
      input: true,
      note: `MAS Task 8 roles from ${task8.task8.path}. Who decided is listed; no invented support score.`,
      decider: {
        agent_id: task8.task8.roles.find((role) => role.bound)?.id || task8.task8.roles[0]?.id || 'mas-task8',
        role: task8.task8.roles.find((role) => role.bound)?.label || 'task8',
      },
      roles: task8.task8.roles,
    }
    : unusedChannel('authority_task8', 'MAS Task 8 paths returned no roles[]. Governor evaluate is advisory, not a truth score.')

  let governor = null
  if (!task8.task8) {
    governor = await evaluateMasGovernor({
      id: payload.selected?.id || 'observe',
      title: `Observe ${payload.selected?.id || 'slice'} at ${payload.replay_time}`,
    }).catch(() => null)
  }

  const unusedScience = [
    unusedChannel('biology', 'No MAS biology agent score for this map slice.'),
    unusedChannel('chemistry', 'No MAS chemistry agent score for this map slice.'),
    unusedChannel('economics', 'No MAS economics agent score for this map slice.'),
    unusedChannel('biometry', 'No MAS biometry agent score for this map slice.'),
    unusedChannel('military_equipment', 'No MAS military-equipment / weapons / tools agent score. No fake COP inventory.'),
    unusedChannel('officer_capabilities', 'No officer-capability bind on this slice.'),
    unusedChannel('persona', 'No persona bind on this slice.'),
    unusedChannel('information', nlmQ.model_loaded ? 'NLM is loaded but no separate information-channel score was returned.' : 'Information channel waits on a loaded NLM or Task 8 info score.'),
  ]

  return {
    nlm: { ...nlm, ...nlmQ, predict_status: nlmPredict.status, predict_called: true },
    myca: myca.data,
    myca_status: myca.status,
    task8: task8.task8,
    task8_probes: task8.probes,
    situation: situation.situation,
    situation_status: situation.status,
    mindex,
    governor,
    weather: { status: weather.status, on_ao: weatherOnAo, latitude: weatherLat, longitude: weatherLon, source: weather.data?.source || null },
    earth2: { status: earth2.status, available: earth2.data?.available === true, source: earth2.data?.source || null },
    crep: { status: crep.status, state: crep.data?.status || null },
    physics: { status: physics.status, detail: physics.data?.detail || null },
    channels: [nlmChannel, authority, weatherChannel, physicsChannel, ...unusedScience],
    map_slice: payload,
  }
}
