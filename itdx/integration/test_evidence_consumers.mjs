import test from 'node:test'
import assert from 'node:assert/strict'
import { createSession } from '../../lib/itdx/session-core.mjs'
import { ITDX_EVIDENCE_CONSUMER_IDS, consumerIdFromPath } from '../../lib/itdx/catalog-consumers.mjs'

test('producer itdx is excluded; every other catalog consumer id is registered', () => {
  assert.equal(consumerIdFromPath('/fusarium/itdx'), null)
  assert.equal(consumerIdFromPath('/fusarium/earth-simulator'), 'earth-simulator')
  assert.ok(!ITDX_EVIDENCE_CONSUMER_IDS.includes('itdx'))
  const session = createSession({ newId: () => 'synthetic-session' })
  const seen = []
  const stops = ITDX_EVIDENCE_CONSUMER_IDS.map((appId) =>
    session.register({
      appId,
      onContext: (context) => {
        seen.push({ appId, runId: context.runId })
      },
    }),
  )
  session.select({ runId: 'run-consumer-test', dataOrigin: 'SYNTHETIC_EXERCISE' })
  const afterSelect = seen.filter((entry) => entry.runId === 'run-consumer-test')
  assert.equal(afterSelect.length, ITDX_EVIDENCE_CONSUMER_IDS.length)
  assert.ok(afterSelect.every((entry) => entry.runId === 'run-consumer-test'))
  assert.throws(() => session.register({ appId: 'earth-simulator', onContext: () => {} }))
  stops.forEach((stop) => stop())
})
