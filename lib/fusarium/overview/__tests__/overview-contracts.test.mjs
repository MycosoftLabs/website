import assert from "node:assert/strict"
import test from "node:test"

import { createOverviewRecord, withFreshness } from "../contracts.ts"
import { buildOverviewLink, parseOverviewContext } from "../deep-links.ts"
import {
  DEFAULT_OVERVIEW_WIDGET_LAYOUT,
  OVERVIEW_LAYOUT_VERSION,
  moveOverviewWidget,
  normalizeOverviewLayout,
  parseOverviewLayout,
  reorderOverviewWidgets,
  serializeOverviewLayout,
  setOverviewWidgetSize,
} from "../layout.ts"

test("simulated records are explicit and never invent confidence", () => {
  const record = createOverviewRecord({
    recordId: "demo-record",
    missionAreaId: "alpha-7",
    now: "2026-09-01T12:00:00.000Z",
    payload: { title: "Scenario object" },
    state: "simulated",
    condition: "simulated",
    source: "sanitized-scenario",
    surface: "Overview test",
    reason: "Deterministic sanitized scenario.",
    dataMode: "simulated",
  })

  assert.equal(record.demo, true)
  assert.equal(record.status.synthetic, true)
  assert.equal(record.dataMode, "simulated")
  assert.equal(record.confidence.score, null)
  assert.equal(record.confidence.label, "not_assessed")
})

test("missing observation time stays unknown instead of measured zero", () => {
  const record = createOverviewRecord({
    recordId: "empty-device-domain",
    missionAreaId: "alpha-7",
    now: "2026-09-01T12:00:00.000Z",
    payload: null,
    state: "unknown",
    condition: "empty",
    source: "device-registry",
    surface: "Overview test",
    reason: "Registry returned no records.",
    observedAt: null,
  })

  assert.equal(record.asOf, "2026-09-01T12:00:00.000Z")
  assert.equal(record.freshness.state, "unknown")
  assert.equal(record.confidence.score, null)
  assert.equal(record.payload, null)
})

test("freshness becomes stale only after its declared threshold", () => {
  const record = createOverviewRecord({
    recordId: "local-health",
    missionAreaId: "alpha-7",
    now: "2026-09-01T12:00:00.000Z",
    payload: { status: "up" },
    state: "live",
    condition: "ready",
    source: "local-runtime",
    surface: "Overview test",
    reason: "Local poll answered.",
    staleAfterSeconds: 30,
  })

  assert.equal(withFreshness(record, Date.parse("2026-09-01T12:00:29.000Z")).freshness.state, "fresh")
  const stale = withFreshness(record, Date.parse("2026-09-01T12:00:31.000Z"))
  assert.equal(stale.freshness.state, "stale")
  assert.equal(stale.status.condition, "stale")
})

test("context parsing and drilldowns preserve all five routing keys", () => {
  const context = parseOverviewContext(
    new URLSearchParams("missionAreaId=exercise-bravo&timeWindow=72h&dataMode=demo"),
  )
  const url = new URL(
    buildOverviewLink("dataFusion", context, {
      objectType: "provenance",
      objectId: "bundle-17",
    }),
    "https://local.invalid",
  )

  assert.equal(url.pathname, "/fusarium/data-fusion")
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    missionAreaId: "exercise-bravo",
    timeWindow: "72h",
    dataMode: "demo",
    objectType: "provenance",
    objectId: "bundle-17",
  })
})

test("stored layouts reject old versions and corrupt payloads", () => {
  const defaults = DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item }))
  assert.deepEqual(parseOverviewLayout("not-json"), defaults)
  assert.deepEqual(
    normalizeOverviewLayout({ version: OVERVIEW_LAYOUT_VERSION + 1, items: [] }),
    defaults,
  )
})

test("stored layouts ignore unknown and duplicate IDs and append new defaults", () => {
  const candidate = {
    version: OVERVIEW_LAYOUT_VERSION,
    items: [
      { id: "mission-brief", size: "tall" },
      { id: "unknown-widget", size: "wide" },
      { id: "mission-brief", size: "compact" },
      { id: "operational-posture", size: "invalid" },
    ],
  }
  const normalized = normalizeOverviewLayout(candidate)

  assert.equal(normalized.length, DEFAULT_OVERVIEW_WIDGET_LAYOUT.length)
  assert.deepEqual(normalized.slice(0, 2), [
    { id: "mission-brief", size: "tall" },
    { id: "operational-posture", size: "wide" },
  ])
  assert.equal(new Set(normalized.map((item) => item.id)).size, normalized.length)
})

test("move, reorder, and discrete size updates preserve a complete layout", () => {
  const defaults = DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item }))
  assert.deepEqual(moveOverviewWidget(defaults, defaults[0].id, -1), defaults)

  const moved = moveOverviewWidget(defaults, "mission-brief", 1)
  assert.deepEqual(moved.slice(0, 3).map((item) => item.id), [
    "operational-posture",
    "environmental-picture",
    "mission-brief",
  ])

  const sized = setOverviewWidgetSize(moved, "mission-brief", "tall")
  assert.equal(sized.find((item) => item.id === "mission-brief")?.size, "tall")

  const reordered = reorderOverviewWidgets(sized, ["activity-timeline", "mission-brief"])
  assert.deepEqual(reordered.slice(0, 2).map((item) => item.id), ["activity-timeline", "mission-brief"])
  assert.equal(reordered.length, defaults.length)

  assert.deepEqual(parseOverviewLayout(serializeOverviewLayout(reordered)), reordered)
})
