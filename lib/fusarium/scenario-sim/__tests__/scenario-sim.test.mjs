import assert from "node:assert/strict"
import test from "node:test"

import { nlmVarFromStatus } from "../nlm-from-status.ts"
import { applyScenarioSimToOverview } from "../overview-bind.ts"
import { buildFrame, IDLE_NLM } from "../packet.ts"
import { listScenarioSurfaces } from "../surfaces.ts"

test("idle frame is never a live COP and never stubs Fusarium p", () => {
  const frame = buildFrame({ index: 0, running: false })
  assert.equal(frame.live, false)
  assert.equal(frame.banner, "SYNTHETIC EXERCISE")
  assert.equal(frame.variables.nlm.p, null)
  assert.equal(frame.variables.nlm.bound_to_ollama, false)
  assert.equal(frame.variables.nlm.forecast_qualified, false)
  assert.equal(frame.variables.nlm.weights.length, 0)
  assert.equal(frame.ao.lng, -81.6072)
  assert.equal(frame.ao.lat, 31.8697)
  assert.equal(frame.variables.weather.temperatureC, null)
})

test("running frame lights bound Fusarium surfaces including overview, ITDX, Earth Sim, personnel, NLM", () => {
  const surfaces = listScenarioSurfaces(true)
  const ids = surfaces.map((row) => row.id)
  assert.ok(ids.some((id) => id.includes("overview")))
  assert.ok(ids.some((id) => id.includes("itdx")))
  assert.ok(ids.some((id) => id.includes("earth-simulator") || id.includes("earth-overlay")))
  assert.ok(ids.some((id) => id.includes("personnel")))
  assert.ok(ids.some((id) => id.includes("nlm")))
  const injects = surfaces.find((row) => row.id === "official-injects")
  assert.equal(injects.bind, "NOT_SUPPLIED")
  assert.equal(injects.lit, false)
  const overview = surfaces.find((row) => row.id === "app-overview")
  assert.equal(overview.lit, true)
  assert.equal(overview.bind, "LIT")
})

test("NLM mapper never invents weights and never binds Ollama or p=0.85", () => {
  const unreachable = nlmVarFromStatus(null, false)
  assert.equal(unreachable.p, null)
  assert.equal(unreachable.bound_to_ollama, false)
  assert.equal(unreachable.weights.length, 0)

  const stubAttempt = nlmVarFromStatus(
    {
      nlm: { model_loaded: true, bound_to_ollama: true, forecast_qualified: true, p: 0.85, weights_sha256: null },
      weights: { checkpoints: [] },
    },
    true,
  )
  assert.equal(stubAttempt.p, null)
  assert.equal(stubAttempt.bound_to_ollama, false)
  assert.equal(stubAttempt.forecast_qualified, false)
  assert.equal(stubAttempt.weights.length, 0)

  const real = nlmVarFromStatus(
    {
      nlm: {
        model_loaded: true,
        forecast_qualified: false,
        bound_to_ollama: false,
        p: null,
        weights_sha256: "0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2",
        model_dir: "/mnt/mycosoft-nas/models/nlm/reference",
      },
      runtime: {
        model_id: "formspace-environmental-reference/0.1.0",
        tensor_count: 47,
        parameter_count: 25728,
        weights_sha256: "0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2",
      },
      weights: {
        count: 1,
        items: [
          {
            name: "weights.pt",
            path: "/mnt/mycosoft-nas/models/nlm/reference/weights.pt",
            bytes: 117846,
            sha256: "0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2",
            source: "MAS /api/nlm/weights",
            modified_at: "2026-09-10T14:53:57.600851",
          },
        ],
      },
    },
    true,
  )
  assert.equal(real.weights.length, 1)
  assert.equal(real.weights[0].path, "/mnt/mycosoft-nas/models/nlm/reference/weights.pt")
  assert.equal(real.weights[0].bytes, 117846)
  assert.equal(real.weights[0].sha256, "0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2")
  assert.equal(real.p, null)
  assert.equal(real.bound_to_ollama, false)
})

test("overview bind keeps confidence score null and live=false while running", () => {
  const frame = buildFrame({
    index: 3,
    running: true,
    nlm: { ...IDLE_NLM, loaded: true, weights: [{ id: "weights", path: "/mnt/x/weights.pt", bytes: 10, sha256: "abc", source: "disk", modifiedAt: null }] },
  })
  const snapshot = {
    context: { missionAreaId: "alpha-7" },
    generatedAt: "2026-09-11T18:00:00.000Z",
    operationalPosture: { confidence: { score: 0.4 } },
    environmentalPicture: {},
    oeiBrief: {},
    activity: [],
  }
  const next = applyScenarioSimToOverview(snapshot, frame)
  assert.equal(next.operationalPosture.confidence.score, null)
  assert.equal(next.operationalPosture.demo, true)
  assert.match(next.operationalPosture.payload.kicker, /SYNTHETIC EXERCISE/)
  assert.equal(frame.live, false)
})
