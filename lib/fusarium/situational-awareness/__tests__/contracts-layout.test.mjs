import test from "node:test"
import assert from "node:assert/strict"

import {
  deriveCondition,
  emptyDomains,
} from "../contracts.ts"
import {
  DEFAULT_SITUATIONAL_WIDGET_LAYOUT,
  SITUATIONAL_LAYOUT_VERSION,
  moveSituationalWidget,
  normalizeSituationalLayout,
  parseSituationalLayout,
  reorderSituationalWidgets,
  serializeSituationalLayout,
  setSituationalWidgetSize,
} from "../layout.ts"

const source = (state, synthetic = false) => ({
  id: state,
  label: state,
  endpoint: "/test",
  state,
  httpStatus: null,
  receivedAt: null,
  observedAt: null,
  recordCount: null,
  schemaValid: true,
  classificationAccepted: true,
  responseAccepted: state === "live" || state === "empty" || state === "stale",
  synthetic,
  note: "test",
})

const object = (freshness) => ({ id: freshness, freshness })

test("condition derivation distinguishes empty, partial, unavailable, stale, ready, and simulated", () => {
  assert.equal(deriveCondition([source("empty"), source("empty")], []), "empty")
  assert.equal(deriveCondition([source("live"), source("unreachable")], [object("fresh")]), "partial")
  assert.equal(deriveCondition([source("unreachable"), source("unreachable")], []), "error")
  assert.equal(deriveCondition([source("unauthorized"), source("unauthorized")], []), "unauthorized")
  assert.equal(deriveCondition([source("live"), source("empty")], [object("stale")]), "stale")
  assert.equal(deriveCondition([source("live"), source("empty")], [object("unknown")]), "partial")
  assert.equal(deriveCondition([source("live"), source("empty")], [object("fresh")]), "ready")
  assert.equal(deriveCondition([source("empty"), source("simulated", true)], []), "simulated")
})

test("empty domain state never reads as a measured zero", () => {
  const domains = emptyDomains()
  assert.equal(domains.length, 6)
  assert.ok(domains.every((domain) => domain.coverage === "gap"))
  assert.ok(domains.every((domain) => domain.note.includes("No records")))
})

test("layout storage is versioned, normalized, and merges missing widgets", () => {
  const candidate = {
    version: SITUATIONAL_LAYOUT_VERSION,
    items: [
      { id: "source-coverage", size: "tall" },
      { id: "source-coverage", size: "wide" },
      { id: "unknown", size: "compact" },
      { id: "domain-state", size: "invalid" },
    ],
  }
  const normalized = normalizeSituationalLayout(candidate)
  assert.equal(normalized.length, DEFAULT_SITUATIONAL_WIDGET_LAYOUT.length)
  assert.deepEqual(normalized[0], { id: "source-coverage", size: "tall" })
  assert.deepEqual(normalized[1], { id: "domain-state", size: "wide" })
  assert.deepEqual(parseSituationalLayout(serializeSituationalLayout(normalized)), normalized)
  assert.deepEqual(
    parseSituationalLayout(JSON.stringify({ version: 999, items: [] })),
    DEFAULT_SITUATIONAL_WIDGET_LAYOUT,
  )
})

test("keyboard move, visual reorder, and snapped size helpers preserve stable IDs", () => {
  const moved = moveSituationalWidget(DEFAULT_SITUATIONAL_WIDGET_LAYOUT, "source-coverage", -1)
  assert.equal(moved[0].id, "source-coverage")
  const resized = setSituationalWidgetSize(moved, "source-coverage", "compact")
  assert.equal(resized[0].size, "compact")
  const reversed = reorderSituationalWidgets(resized, [...resized].reverse().map((item) => item.id))
  assert.deepEqual(reversed.map((item) => item.id), [...resized].reverse().map((item) => item.id))
})
