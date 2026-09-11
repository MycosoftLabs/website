import test from 'node:test'
import assert from 'node:assert/strict'
import { honestyStatus, preferBound, bindPackagedCatalog, bindSyntheticPhysics } from '../../lib/itdx/local-situation-bind.mjs'

test('honesty: missing env is no source; empty result is no data', () => {
  assert.equal(honestyStatus({ configured: false, ok: false, rows: 0, sourceName: 'Google Maps' }).status, 'NOT_SUPPLIED')
  assert.match(honestyStatus({ configured: false, ok: false, rows: 0, sourceName: 'Google Maps' }).note, /no configured source/)
  assert.equal(honestyStatus({ configured: true, ok: true, rows: 0, sourceName: 'OSM Overpass' }).status, 'NO_DATA')
  assert.match(honestyStatus({ configured: true, ok: true, rows: 0, sourceName: 'OSM Overpass' }).note, /No data from OSM Overpass/)
  assert.equal(honestyStatus({ configured: true, ok: false, rows: 0, sourceName: 'Open-Meteo' }).status, 'UNQUALIFIED')
  assert.equal(honestyStatus({ configured: true, ok: true, rows: 4, sourceName: 'Open-Meteo' }).status, 'BOUND')
})

test('local catalog and replay physics are already in the package', () => {
  const catalog = bindPackagedCatalog()
  assert.equal(catalog.status, 'BOUND')
  assert.ok((catalog.citations || []).length >= 3)
  assert.equal(bindSyntheticPhysics().status, 'BOUND')
})

test('website local bind wins over MAS NOT_SUPPLIED', () => {
  const merged = preferBound(
    { id: 'weather', status: 'NOT_SUPPLIED', note: 'MAS field absent.' },
    { id: 'weather', status: 'BOUND', note: 'Open-Meteo' },
  )
  assert.equal(merged.status, 'BOUND')
  assert.equal(merged.mas_status, 'NOT_SUPPLIED')
})
