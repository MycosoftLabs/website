import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LOCAL_REPLAY_RUN_ID,
  buildCards,
  buildEvidenceSummary,
  cardIndexFromReplay,
  conformalSetLabel,
  nlmQualification,
  normalizeMasTask8,
  normalizeSituationAssessment,
  officialInjectsStatus,
  sevenRoleQualification,
} from '../../lib/itdx/run-narration.mjs'
import { AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE } from '../../lib/itdx/replay-core.mjs'

test('land AO is Fort Stewart, not 0,0 ocean', () => {
  assert.equal(AO_PLACE.includes('Fort Stewart'), true)
  assert.ok(AO_ORIGIN_LAT > 30 && AO_ORIGIN_LAT < 33)
  assert.ok(AO_ORIGIN_LNG < -80 && AO_ORIGIN_LNG > -83)
})

test('cards advance with replay clock', () => {
  assert.equal(cardIndexFromReplay(0), 0)
  assert.equal(cardIndexFromReplay(16), 1)
  assert.equal(cardIndexFromReplay(120), 7)
  const cards = buildCards({ replayIndex: 80, selected: { id: 'demo-unit-01', label: 'DEMO UNIT 01' }, task8: { source: 'local_avani', roles: [] } })
  assert.equal(cards.length, 8)
  assert.equal(cards.filter((card) => card.active).length, 1)
  assert.equal(cards[5].id, 'avani_myca')
  assert.match(cards[5].body, /UNQUALIFIED|local_avani|mas/)
})

test('evidence local replay is 200-shaped and never needs /api/run', () => {
  const summary = buildEvidenceSummary({
    context: { runId: LOCAL_REPLAY_RUN_ID, datasetId: 'demo-11', dataOrigin: 'SYNTHETIC_EXERCISE' },
    bootstrap: { runs: [] },
    dataset: { dataset: { id: 'demo-11' }, total: 960 },
  })
  assert.equal(summary.status, 200)
  assert.equal(summary.ok, true)
  assert.match(summary.detail, /no backend \/api\/run job/)
  assert.equal(summary.live, false)
})

test('NLM and official injects fail closed', () => {
  const nlm = nlmQualification({ model_loaded: false }, { count: 0, checkpoints: [] })
  assert.equal(nlm.qualification, 'UNQUALIFIED')
  assert.equal(nlm.task12_path, 'FORMSPACE_RECORDED')
  assert.match(nlm.missing_artifact, /checkpoint/)
  const injects = officialInjectsStatus(null)
  assert.equal(injects.status, 'NOT_SUPPLIED')
  assert.equal(injects.scale_1_to_5, null)
})

test('Task 8 does not invent seven green roles', () => {
  assert.equal(normalizeMasTask8({ options: [] }, '/api/avani/task8'), null)
  const seven = sevenRoleQualification({ source: 'local_avani', roles: [] })
  assert.equal(seven.qualification, 'UNQUALIFIED')
  assert.equal(seven.role_count, 0)
  const live = normalizeMasTask8({
    roles: [
      { id: 'analyst', label: 'analyst', verdict: 'PASS', bound: true },
      { id: 'critic', label: 'critic', verdict: 'REVIEW', bound: false },
    ],
  }, '/api/avani/task8')
  assert.equal(live.source, 'mas')
  assert.equal(live.roles.length, 2)
  assert.equal(live.seven_role, false)
  assert.equal(conformalSetLabel([0]), '{background}')
  assert.equal(conformalSetLabel([0, 1]), 'both')
  assert.equal(conformalSetLabel([]), 'empty')
})

test('situation-assessment object channels stay honest', () => {
  const sit = normalizeSituationAssessment({
    schema_version: 'itdx.situation_assessment/v1',
    channels: {
      weather: { status: 'NOT_SUPPLIED', note: 'Earth-2 unreachable' },
      equipment_weapons_assets: { status: 'NOT_SUPPLIED', note: '3 device-registry rows', live: { device_count: 3 } },
    },
  })
  assert.equal(sit.source, 'mas')
  const weather = sit.channels.find((channel) => channel.id === 'weather')
  const traffic = sit.channels.find((channel) => channel.id === 'traffic')
  assert.equal(weather.status, 'NOT_SUPPLIED')
  assert.equal(traffic.status, 'NOT_SUPPLIED')
  assert.match(traffic.note, /no traffic channel/)
  assert.equal(sit.p_truth, null)
})

test('situation-assessment keeps SUPPLIED cites and does not invent traffic', () => {
  const sit = normalizeSituationAssessment({
    schema_version: 'itdx.situation_assessment/v1',
    channels: {
      weather: {
        status: 'SUPPLIED',
        sources: [{ source_name: 'Open-Meteo', source_url: 'https://api.open-meteo.com/v1/forecast', sample_count: 1 }],
        live: {
          open_meteo: { ok: true, citation: 'https://api.open-meteo.com/v1/forecast', current: { temperature_2m: 28.4 } },
          nws: { ok: true, citation: 'https://api.weather.gov/points/31.8697,-81.6072', cwa: 'CHS' },
        },
      },
      biology: {
        status: 'SUPPLIED',
        live: { gbif: { count: 28 }, inaturalist: { total: 138 } },
      },
      information: {
        status: 'SUPPLIED',
        live: {
          wikipedia: {
            pages: [
              { title: 'Fort Stewart', url: 'https://en.wikipedia.org/wiki/Fort_Stewart' },
              { title: 'Hunter Army Airfield', url: 'https://en.wikipedia.org/wiki/Hunter_Army_Airfield' },
            ],
          },
        },
      },
      equipment_weapons_assets: {
        status: 'SUPPLIED',
        capability_class: 'public_road',
        live: { live: false, public_base: { nominatim: { places: [{ display_name: 'Fort Stewart, Hinesville, Liberty County, Georgia, United States' }] } } },
      },
      traffic: { status: 'NOT_SUPPLIED', reason: 'google_maps_key_missing', error: 'GOOGLE_MAPS_API_KEY unset' },
    },
  })
  const weather = sit.channels.find((channel) => channel.id === 'weather')
  const biology = sit.channels.find((channel) => channel.id === 'biology')
  const information = sit.channels.find((channel) => channel.id === 'information')
  const equipment = sit.channels.find((channel) => channel.id === 'equipment_weapons_assets')
  const traffic = sit.channels.find((channel) => channel.id === 'traffic')
  assert.equal(weather.status, 'SUPPLIED')
  assert.equal(weather.facts.temperature_c, 28.4)
  assert.match(weather.facts.nws, /weather.gov/)
  assert.equal(biology.status, 'SUPPLIED')
  assert.equal(biology.facts.gbif_count, 28)
  assert.equal(biology.facts.inaturalist_count, 138)
  assert.equal(information.facts.wikipedia[0].title, 'Fort Stewart')
  assert.equal(information.facts.wikipedia[1].title, 'Hunter Army Airfield')
  assert.equal(equipment.facts.capability_class, 'public_road')
  assert.equal(equipment.facts.live, false)
  assert.equal(traffic.status, 'NOT_SUPPLIED')
  assert.equal(traffic.reason, 'google_maps_key_missing')
})
