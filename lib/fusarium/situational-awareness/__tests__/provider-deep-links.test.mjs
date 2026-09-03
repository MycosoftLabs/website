import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-sa-tests-"))
for (const name of ["contracts", "deep-links", "scenario", "provider"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText.replace(/from "\.\/(contracts|scenario)"/g, 'from "./$1.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const {
  buildSituationalHandoffLink,
  buildSituationalSelfLink,
  parseSituationalContext,
} = await import(pathToFileURL(join(compiledDir, "deep-links.mjs")))
const { buildRuntimeSnapshot } = await import(pathToFileURL(join(compiledDir, "provider.mjs")))

const outcome = (endpoint, payload, status = 200) => ({
  endpoint,
  ok: status >= 200 && status < 300,
  status,
  receivedAt: "2026-09-01T20:00:00.000Z",
  payload,
  error: status >= 200 && status < 300 ? null : `HTTP ${status}`,
})

const systemContext = parseSituationalContext(new URLSearchParams())

test("deep links preserve mission, time, mode, selection, evidence, source, Earth view, and Form Space model", () => {
  const context = {
    ...systemContext,
    missionAreaId: "area-7",
    missionAreaLabel: "Area 7",
    timeWindow: "72h",
    dataMode: "demo",
    view: "earth",
    selectedModelId: "nlm-fusion",
    formSpacePresentation: "compare",
    selectedObjectId: "object-1",
    selectedEvidenceId: "evidence-1",
    sourceId: "source-1",
  }
  const self = new URL(buildSituationalSelfLink(context), "http://local")
  assert.equal(self.pathname, "/fusarium/situational-awareness")
  assert.equal(self.searchParams.get("missionAreaId"), "area-7")
  assert.equal(self.searchParams.get("view"), "earth")
  assert.equal(self.searchParams.get("modelId"), "nlm-fusion")
  assert.equal(self.searchParams.get("formSpacePresentation"), "compare")
  assert.equal(self.searchParams.get("evidenceId"), "evidence-1")
  assert.equal(self.searchParams.get("classification"), "UNCLASSIFIED")
  const reparsed = parseSituationalContext(self.searchParams)
  assert.equal(reparsed.view, "earth")
  assert.equal(reparsed.selectedModelId, "nlm-fusion")
  assert.equal(reparsed.formSpacePresentation, "compare")
  const handoff = new URL(buildSituationalHandoffLink("dataFusion", context), "http://local")
  assert.equal(handoff.pathname, "/fusarium/data-fusion")
  assert.equal(handoff.searchParams.get("objectId"), "object-1")
  assert.equal(handoff.searchParams.get("sourceId"), "source-1")
  assert.equal(handoff.searchParams.get("modelId"), "nlm-fusion")
})

test("deep links reject non-UNCLASSIFIED or repeated classification context instead of relabeling it", () => {
  const valid = parseSituationalContext(new URLSearchParams(
    "missionAreaId=area-7&missionAreaLabel=Area+7&classification=UNCLASSIFIED",
  ))
  assert.equal(valid.missionAreaId, "area-7")
  assert.equal(valid.missionAreaLabel, "Area 7")
  assert.equal(valid.classification, "UNCLASSIFIED")

  for (const query of [
    "classification=SECRET",
    "classification=unclassified",
    "classification=",
    "classification=UNCLASSIFIED&classification=UNCLASSIFIED",
    "classification=UNCLASSIFIED&classification=SECRET",
  ]) {
    assert.throws(
      () => parseSituationalContext(new URLSearchParams(query)),
      /supplied exactly once as UNCLASSIFIED/,
      query,
    )
  }

  assert.throws(
    () => buildSituationalSelfLink({ ...systemContext, classification: "SECRET" }),
    /classification must be exactly UNCLASSIFIED/,
  )
})

test("healthy empty runtime stays explicitly empty with six coverage gaps", () => {
  const snapshot = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", []),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      auth_mode: "commercial_unclassified",
      natureos: { devices: [], events: [] },
      fusion: null,
      il: { tracks: [], correlations: [] },
      honest_gaps: [],
    }),
    Date.parse("2026-09-01T20:00:00.000Z"),
  )
  assert.equal(snapshot.condition, "empty")
  assert.equal(snapshot.objects.length, 0)
  assert.ok(snapshot.domains.every((domain) => domain.coverage === "gap"))
  assert.match(snapshot.note, /Empty does not mean environmentally clear/)
})

test("runtime records keep unknown confidence unknown and omit unsupported domains", () => {
  const snapshot = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", []),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      natureos: {
        devices: [],
        events: [
          {
            eventId: "good",
            sourceDevice: "node-1",
            kingdomDomain: "FUNGA",
            eventType: "observation",
            timestamp: "2026-09-01T19:55:00.000Z",
            classification: "UNCLASSIFIED",
            payload: { summary: "Observed event", confidence: 72 },
          },
          {
            eventId: "unknown-domain",
            sourceDevice: "node-2",
            kingdomDomain: "opaque",
            classification: "UNCLASSIFIED",
            payload: {},
          },
          {
            eventId: "restricted",
            sourceDevice: "node-3",
            kingdomDomain: "FUNGA",
            classification: "SECRET",
            payload: {},
          },
        ],
      },
      fusion: null,
      il: { tracks: [], correlations: [] },
      honest_gaps: [],
    }),
    Date.parse("2026-09-01T20:00:00.000Z"),
  )
  assert.equal(snapshot.objects.length, 1)
  assert.equal(snapshot.objects[0].domain, "living")
  assert.equal(snapshot.objects[0].confidence, null)
  assert.ok(snapshot.gaps.some((gap) => gap.includes("non-UNCLASSIFIED")))
})

test("classification fails closed for envelopes and quarantines unmarked or restricted leaves", () => {
  for (const classification of [null, "CUI", "SECRET", "TS-SCI", "TS/SCI", "IL4"]) {
    const envelope = buildRuntimeSnapshot(
      systemContext,
      outcome("/api/Devices", []),
      outcome("/api/fusarium/operator/state", {
        ...(classification ? { classification } : {}),
        natureos: {
          devices: [],
          events: [{ eventId: "would-be-visible", kingdomDomain: "FUNGA", classification: "UNCLASSIFIED" }],
        },
        fusion: null,
        il: { tracks: [], correlations: [] },
      }),
    )
    assert.equal(envelope.objects.length, 0, `envelope ${classification ?? "missing"}`)
    assert.equal(envelope.sources.find((source) => source.id === "runtime-operator").classificationAccepted, false)
    assert.equal(envelope.sources.find((source) => source.id === "runtime-operator").responseAccepted, false)
  }

  const leaves = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", [{ deviceId: "unmarked-device" }]),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      natureos: {
        devices: [],
        events: [
          { eventId: "good", kingdomDomain: "FUNGA", classification: "UNCLASSIFIED" },
          { eventId: "missing", kingdomDomain: "FUNGA" },
          ...["CUI", "SECRET", "TS-SCI", "TS/SCI", "IL4"].map((classification, index) => ({
            eventId: `restricted-${index}`,
            kingdomDomain: "FUNGA",
            classification,
          })),
        ],
      },
      fusion: null,
      il: {
        tracks: [],
        correlations: [{ fromId: "good", toId: "good", evidenceIds: ["runtime-event:good"] }],
      },
    }),
  )
  assert.deepEqual(leaves.objects.map((object) => object.id), ["event:good"])
  assert.equal(leaves.relationships.length, 0)
  assert.ok(leaves.gaps.some((gap) => gap.includes("without an explicit UNCLASSIFIED")))
  assert.ok(leaves.gaps.some((gap) => gap.includes("non-UNCLASSIFIED")))
})

test("blank numeric strings stay unavailable while explicit numeric zero remains valid", () => {
  const snapshot = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", [
      {
        deviceId: "blank-position",
        deviceType: "sensor",
        classification: "UNCLASSIFIED",
        confidence: " ",
        location: { latitude: "", longitude: "0" },
      },
    ]),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      natureos: {
        devices: [],
        events: [
          {
            eventId: "blank-value",
            kingdomDomain: "FUNGA",
            classification: "UNCLASSIFIED",
            payload: { value: " ", confidence: "" },
          },
          {
            eventId: "real-zero",
            kingdomDomain: "WATER",
            classification: "UNCLASSIFIED",
            payload: { value: 0, confidence: 0 },
          },
        ],
      },
      fusion: { run_id: "blank-fusion", classification: "UNCLASSIFIED", threat_score: " ", confidence: "" },
      il: {
        tracks: [],
        correlations: [
          {
            id: "blank-confidence",
            classification: "UNCLASSIFIED",
            fromId: "blank-value",
            toId: "real-zero",
            confidence: " ",
            evidenceIds: ["runtime-event:blank-value", "runtime-event:real-zero"],
          },
        ],
      },
    }),
  )
  const device = snapshot.objects.find((object) => object.id === "device:blank-position")
  const blank = snapshot.objects.find((object) => object.id === "event:blank-value")
  const zero = snapshot.objects.find((object) => object.id === "event:real-zero")
  const fusion = snapshot.objects.find((object) => object.id === "fusion:blank-fusion")
  assert.equal(device.position, null)
  assert.equal(device.confidence, null)
  assert.equal(blank.current, null)
  assert.equal(blank.confidence, null)
  assert.equal(zero.current.value, 0)
  assert.equal(zero.confidence, 0)
  assert.equal(fusion.current, null)
  assert.equal(snapshot.relationships[0].confidence, null)
})

test("partial and unauthorized transports remain distinguishable", () => {
  const partial = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", []),
    outcome("/api/fusarium/operator/state", null, 500),
  )
  assert.equal(partial.condition, "partial")

  const unauthorized = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", null, 401),
    outcome("/api/fusarium/operator/state", null, 403),
  )
  assert.equal(unauthorized.condition, "unauthorized")
})

test("transport response, authorization rejection, and schema validity remain separate", () => {
  const invalidSchema = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", { unexpected: true }),
    outcome("/api/fusarium/operator/state", null, 401),
  )
  const devices = invalidSchema.sources.find((source) => source.id === "runtime-devices")
  const operator = invalidSchema.sources.find((source) => source.id === "runtime-operator")
  assert.equal(devices.httpStatus, 200)
  assert.equal(devices.schemaValid, false)
  assert.equal(devices.responseAccepted, false)
  assert.equal(devices.recordCount, null)
  assert.equal(operator.httpStatus, 401)
  assert.equal(operator.state, "unauthorized")
  assert.equal(operator.schemaValid, null)
})

test("nested device records retain operator-state provenance when the direct registry fails", () => {
  const snapshot = buildRuntimeSnapshot(
    systemContext,
    outcome("/api/Devices", null, 500),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      natureos: {
        devices: [{ deviceId: "nested-1", deviceType: "sensor", classification: "UNCLASSIFIED" }],
        events: [],
      },
      fusion: null,
      il: { tracks: [], correlations: [] },
      honest_gaps: [],
    }),
    Date.parse("2026-09-01T20:00:00.000Z"),
  )
  assert.equal(snapshot.condition, "partial")
  assert.deepEqual(snapshot.objects[0].sourceIds, ["runtime-operator"])
  assert.equal(snapshot.evidence[0].sourceId, "runtime-operator")
  assert.match(snapshot.evidence[0].sourceRef, /operator\/state#natureos\.devices/)
  assert.equal(snapshot.sources.find((source) => source.id === "runtime-operator").recordCount, 1)
})

test("sanitized scenario is opt-in and every scenario object/evidence/source is marked", () => {
  const context = { ...systemContext, dataMode: "demo" }
  const snapshot = buildRuntimeSnapshot(
    context,
    outcome("/api/Devices", []),
    outcome("/api/fusarium/operator/state", {
      classification: "UNCLASSIFIED",
      natureos: { devices: [], events: [] },
      fusion: null,
      il: { tracks: [], correlations: [] },
      honest_gaps: [],
    }),
    Date.parse("2026-09-01T20:00:00.000Z"),
  )
  assert.equal(snapshot.condition, "simulated")
  assert.ok(snapshot.objects.length > 0)
  assert.ok(snapshot.objects.every((item) => item.synthetic))
  assert.ok(snapshot.evidence.every((item) => item.synthetic))
  assert.ok(snapshot.sources.filter((item) => item.synthetic).every((item) => item.state === "simulated"))
})
