import assert from "node:assert/strict"
import test, { after } from "node:test"

import { cleanupCompiledModules, loadDataFusionModules } from "./transpile-harness.mjs"

after(cleanupCompiledModules)

const { contracts, deepLinks } = await loadDataFusionModules()
const {
  FUSION_MODALITIES,
  dataPresenceFromCount,
  emptyCoverage,
} = contracts
const {
  buildFusionLink,
  contextForSelectedNode,
  parseFusionContext,
} = deepLinks

test("deep links preserve mission, area, time, mode, role, and every selection", () => {
  const context = parseFusionContext(
    new URLSearchParams({
      missionId: "mission-river-12",
      missionAreaId: "area-delta-4",
      missionAreaLabel: "Delta 4",
      timeWindow: "72h",
      mode: "replay",
      operatorRole: "analyst",
      nodeId: "node-observation-8",
      objectId: "object-watershed-3",
      objectType: "environmental-object",
      evidenceId: "evidence-frame-21",
      sourceId: "source-spectral-2",
    }),
  )

  const link = new URL(buildFusionLink("situationalAwareness", context), "http://local")
  assert.equal(link.pathname, "/fusarium/situational-awareness")
  assert.equal(link.searchParams.get("missionId"), context.missionId)
  assert.equal(link.searchParams.get("missionAreaId"), context.missionAreaId)
  assert.equal(link.searchParams.get("missionAreaLabel"), context.missionAreaLabel)
  assert.equal(link.searchParams.get("timeWindow"), context.timeWindow)
  assert.equal(link.searchParams.get("mode"), context.mode)
  assert.equal(link.searchParams.get("operatorRole"), context.operatorRole)
  assert.equal(link.searchParams.get("nodeId"), context.selectedNodeId)
  assert.equal(link.searchParams.get("objectId"), context.selectedObjectId)
  assert.equal(link.searchParams.get("evidenceId"), context.selectedEvidenceId)
  assert.equal(link.searchParams.get("sourceId"), context.selectedSourceId)
  assert.equal(link.searchParams.get("objectType"), "environmental-object")
  assert.equal(link.searchParams.get("classification"), "UNCLASSIFIED")

  const reparsed = parseFusionContext(link.searchParams)
  assert.deepEqual(reparsed, context)
})

test("command-center modes and typed object links are parsed without broadening trust", () => {
  const replay = parseFusionContext(new URLSearchParams({
    contextId: "context-river-12",
    ccMode: "replay",
    dataMode: "system",
    start: "2026-08-01T04:00:00.000Z",
    end: "2026-08-01T10:00:00.000Z",
    objectId: "object-allowed",
    objectType: "environmental-object",
  }))
  assert.equal(replay.mode, "replay")
  assert.equal(replay.contextId, "context-river-12")
  assert.deepEqual(replay.timeRange, {
    start: "2026-08-01T04:00:00.000Z",
    end: "2026-08-01T10:00:00.000Z",
  })
  assert.equal(replay.selectedObjectId, "object-allowed")
  const replayLink = new URL(buildFusionLink("dataFusion", replay), "http://local")
  assert.equal(replayLink.searchParams.get("contextId"), "context-river-12")
  assert.equal(replayLink.searchParams.get("start"), "2026-08-01T04:00:00.000Z")
  assert.equal(replayLink.searchParams.get("end"), "2026-08-01T10:00:00.000Z")

  const unsupported = parseFusionContext(new URLSearchParams({
    ccMode: "forecast",
    objectId: "provenance-record-7",
    objectType: "provenance-record",
  }))
  assert.equal(unsupported.mode, "forecast")
  assert.equal(unsupported.selectedObjectId, null)
})

test("legacy demo links opt into simulated mode without changing the trust boundary", () => {
  const context = parseFusionContext(
    new URLSearchParams({
      dataMode: "demo",
      role: "viewer",
      classification: "SECRET",
    }),
  )

  assert.equal(context.mode, "simulated")
  assert.equal(context.operatorRole, "viewer")
  assert.equal(context.classification, "UNCLASSIFIED")

  const link = new URL(buildFusionLink("dataFusion", context), "http://local")
  assert.equal(link.searchParams.get("dataMode"), "demo")
  assert.equal(link.searchParams.get("classification"), "UNCLASSIFIED")
})

test("selecting a lineage node synchronizes object, evidence, and source context", () => {
  const context = parseFusionContext(new URLSearchParams({ missionId: "mission-1" }))
  const selected = contextForSelectedNode(context, {
    id: "node-1",
    objectIds: ["object-1", "object-2"],
    evidenceIds: ["evidence-1", "evidence-2"],
    sourceIds: ["source-1", "source-2"],
  })

  assert.deepEqual(
    {
      node: selected.selectedNodeId,
      object: selected.selectedObjectId,
      evidence: selected.selectedEvidenceId,
      source: selected.selectedSourceId,
    },
    {
      node: "node-1",
      object: "object-1",
      evidence: "evidence-1",
      source: "source-1",
    },
  )

  const cleared = contextForSelectedNode(selected, null)
  assert.equal(cleared.selectedNodeId, null)
  assert.equal(cleared.selectedObjectId, null)
  assert.equal(cleared.selectedEvidenceId, null)
  assert.equal(cleared.selectedSourceId, null)
  assert.equal(cleared.missionId, context.missionId)
})

test("coverage always names all six sensing modalities without inventing counts", () => {
  const coverage = emptyCoverage("No modality contract is bound.")

  assert.equal(coverage.length, 6)
  assert.deepEqual(coverage.map((item) => item.modality), [...FUSION_MODALITIES])
  assert.ok(coverage.every((item) => item.observedRecords === null))
  assert.ok(coverage.every((item) => item.expectedRecords === null))
  assert.ok(coverage.every((item) => item.state === "unavailable"))
})

test("a valid zero record count is empty, never measured environmental absence", () => {
  assert.equal(dataPresenceFromCount(0, true), "empty")
  assert.equal(dataPresenceFromCount(null, true), "unknown")
  assert.equal(dataPresenceFromCount(0, false), "unknown")
  assert.notEqual(dataPresenceFromCount(0, true), "measured_absence")
})
