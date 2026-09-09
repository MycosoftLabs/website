import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshot } from '../../lib/itdx/replay-core.mjs'
import {
  CHANNEL_IDS,
  FUSION_FORMULA,
  fuseChannels,
  scoreAsset,
  unusedChannel,
} from '../../lib/itdx/truth-fusion.mjs'
import { attachReplay, LAYERS, SOURCE_ID } from '../../lib/itdx/map-layer.mjs'

test('geometry scores every asset and numbers move with the track', () => {
  const early = snapshot(8)
  const late = snapshot(80)
  for (const frame of [early, late]) {
    assert.equal(frame.assets.length, 4)
    for (const asset of frame.assets) {
      assert.equal(typeof asset.p_truth, 'number')
      assert.equal(typeof asset.p_unsupported, 'number')
      assert.ok(Math.abs(asset.p_truth + asset.p_unsupported - 1) < 1e-9)
      assert.notEqual(asset.probability_data_true, null)
      assert.equal(asset.truth_fusion.deception_status, 'NOT_SUPPLIED')
      assert.equal(asset.truth_fusion.class_p_is_geo_radius, false)
      const geometry = asset.truth_fusion.channels.find((channel) => channel.id === 'geometry')
      assert.equal(geometry.status, 'BOUND')
      assert.equal(typeof geometry.score, 'number')
    }
  }
  const unitEarly = early.assets.find((asset) => asset.id === 'demo-unit-01').p_truth
  const vehicleLate = late.assets.find((asset) => asset.id === 'demo-vehicle-02')
  const airLate = late.assets.find((asset) => asset.id === 'demo-air-04')
  assert.ok(vehicleLate.p_truth < unitEarly, 'declared bias after sample 40 must lower P(truth)')
  assert.ok(vehicleLate.quality_flags.includes('bias'))
  assert.equal(vehicleLate.data_quality, 'BAD')
  assert.ok(airLate.age_seconds >= 30)
  assert.ok(airLate.quality_flags.includes('stale'))
})

test('unqualified NLM does not zero the math channel', () => {
  const frame = snapshot(47)
  const asset = frame.assets.find((item) => item.id === 'demo-unit-01')
  const geometryOnly = scoreAsset(asset, frame.assets.filter((item) => item.id !== asset.id))
  const withNlm = scoreAsset(asset, frame.assets.filter((item) => item.id !== asset.id), [{
    id: 'nlm_pattern',
    status: 'UNQUALIFIED',
    score: null,
    weight: 0.12,
    input: true,
    note: 'model_loaded=false',
    decider: { agent_id: 'mas-nlm', role: 'nlm_pattern' },
  }])
  assert.ok(Math.abs(geometryOnly.p_truth - withNlm.p_truth) < 1e-9)
  assert.equal(withNlm.channels.find((channel) => channel.id === 'nlm_pattern').status, 'UNQUALIFIED')
  assert.equal(withNlm.channels.find((channel) => channel.id === 'geometry').status, 'BOUND')
})

test('NOT_SUPPLIED is excluded from the weighted average, not scored as 0', () => {
  const bound = { id: 'geometry', status: 'BOUND', score: 0.8, weight: 0.4, input: true, note: '', decider: { agent_id: 'itdx-geometry', role: 'math' } }
  const missing = unusedChannel('biology')
  const fused = fuseChannels([bound, missing])
  assert.ok(Math.abs(fused.p_truth - 0.8) < 1e-6)
  assert.equal(fused.channels.find((channel) => channel.id === 'biology').status, 'NOT_SUPPLIED')
  assert.match(FUSION_FORMULA, /NOT_SUPPLIED/)
  assert.equal(CHANNEL_IDS.includes('authority_task8'), true)
})

class FakeMap {
  constructor() {
    this.sources = new Map([['real-feed', { kept: true }]])
    this.layers = new Map([['real-layer', { kept: true }]])
    this.events = []
    this.loaded = false
  }
  isStyleLoaded() { return this.loaded }
  getSource(id) { return this.sources.get(id) }
  getLayer(id) { return this.layers.get(id) }
  addSource(id, source) { this.sources.set(id, { data: source.data, setData(data) { this.data = data } }) }
  addLayer(layer) { this.layers.set(layer.id, layer) }
  removeSource(id) { this.sources.delete(id) }
  removeLayer(id) { this.layers.delete(id) }
  fitBounds() {}
  on(...args) { this.events.push(args) }
  off(...args) { this.events = this.events.filter((event) => !event.every((item, i) => item === args[i])) }
  emit(name, event) { for (const item of [...this.events]) if (item[0] === name) item.at(-1)(event) }
}

test('map halo and badge carry P(truth)', () => {
  const map = new FakeMap()
  map.loaded = true
  const controller = attachReplay(map)
  map.emit('load')
  controller.update(47)
  assert.ok(LAYERS.some((layer) => layer.id.endsWith('-halo')))
  const assets = map.getSource(SOURCE_ID).data.features.filter((feature) => feature.properties.kind === 'asset')
  assert.equal(assets.length, 4)
  for (const feature of assets) {
    assert.equal(typeof feature.properties.p_truth, 'number')
    assert.ok(feature.properties.badge.includes('%'))
    assert.ok(feature.properties.halo_color)
  }
  controller.setFusion({
    'demo-unit-01': { p_truth: 0.91, p_unsupported: 0.09, p_truth_pct: '91%', p_unsupported_pct: '9%', halo_color: '#3ecf8e', quality: 'GOOD', deception_status: 'NOT_SUPPLIED' },
  })
  const unit = map.getSource(SOURCE_ID).data.features.find((feature) => feature.properties.id === 'demo-unit-01')
  assert.equal(unit.properties.p_truth, 0.91)
  controller.dispose()
})
