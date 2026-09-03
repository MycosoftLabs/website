import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, "..", "physical-device.ts"), "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const identity = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)
const deployments = readFileSync(resolve(here, "..", "..", "..", "devices", "field-deployments.ts"), "utf8")

const hyphaeFrame = {
  selectedDeviceId: identity.HYPHAE_1_REGISTRY_ID,
  observedAt: "2026-09-02T18:00:00.000Z",
  receivedAt: "2026-09-02T18:00:01.000Z",
  sourceRef: "/api/mycobrain/devices",
  sensorKeys: ["bvoc", "eco2", "gas_resistance", "humidity", "iaq", "pressure", "temperature"],
}

test("Hyphae 1 and Mushroom 1 stay distinct despite a shared MDP token", () => {
  assert.match(deployments, new RegExp(identity.HYPHAE_1_REGISTRY_ID))
  assert.match(deployments, new RegExp(identity.MUSHROOM_1_REGISTRY_ID))
  assert.match(deployments, /mycobrain-sidea-10b41d/)

  const hyphae = identity.resolvePhysicalDeviceIdentity({ registry_id: identity.HYPHAE_1_REGISTRY_ID })
  const mushroom = identity.resolvePhysicalDeviceIdentity({ catalog_id: "mushroom-1" })
  assert.equal(hyphae.registryId, identity.HYPHAE_1_REGISTRY_ID)
  assert.equal(mushroom.registryId, identity.MUSHROOM_1_REGISTRY_ID)
  assert.equal(identity.resolvePhysicalDeviceIdentity({ device_id: identity.SHARED_MDP_DEVICE_ID }), null)
  assert.deepEqual(
    identity.mergeProvenRegistryEntries([
      { registry_id: identity.HYPHAE_1_REGISTRY_ID, name: "Hyphae 1" },
      { registry_id: identity.HYPHAE_1_REGISTRY_ID, catalog_id: "hyphae-1" },
      { device_id: identity.SHARED_MDP_DEVICE_ID },
      { name: "Hyphae 1" },
      { registry_id: identity.MUSHROOM_1_REGISTRY_ID },
    ]).map((device) => device.registryId),
    [identity.HYPHAE_1_REGISTRY_ID, identity.MUSHROOM_1_REGISTRY_ID],
  )
  assert.deepEqual(
    identity.mergeProvenRegistryEntries([
      { registry_id: "mycobrain-COM4" },
      { device_id: "mycobrain-COM3" },
      { catalog_id: "psathyrella-buoy-com4" },
    ]).map((device) => device.registryId),
    ["mycobrain-COM4"],
  )
})

test("lifecycle states stay distinct and missing sensors stay unavailable", () => {
  assert.equal(identity.classifyPhysicalDeviceLifecycle({
    declared: true, authorized: false, reachable: true, connected: false, hasVerifiedFrame: false, stale: false,
  }), "unauthorized")
  assert.equal(identity.classifyPhysicalDeviceLifecycle({
    declared: true, authorized: true, reachable: false, connected: false, hasVerifiedFrame: false, stale: false,
  }), "offline")
  assert.equal(identity.classifyPhysicalDeviceLifecycle({
    declared: true, authorized: true, reachable: true, connected: true, hasVerifiedFrame: false, stale: false,
  }), "connected")
  assert.equal(identity.classifyPhysicalDeviceLifecycle({
    declared: true, authorized: true, reachable: true, connected: true, hasVerifiedFrame: true, stale: true,
  }), "stale")
  assert.equal(identity.classifyPhysicalDeviceLifecycle({
    declared: true, authorized: true, reachable: true, connected: true, hasVerifiedFrame: true, stale: false,
  }), "live")
  assert.equal(identity.missingSensorIsUnavailable(false), "unavailable")
})

test("Senses Overview retains the last verified frame across same-device refresh", () => {
  const overview = readFileSync(resolve(here, "..", "..", "..", "..", "components", "fusarium", "sensing", "sensing-overview.tsx"), "utf8")
  assert.match(overview, /selectedScopeKeyRef/)
  assert.match(overview, /last verified frame is retained/)
  assert.match(overview, /payloadMatchesSelection/)
  assert.match(overview, /if \(selectedScopeKeyRef\.current !== exactSelectedDeviceKey\)/)
})

test("selected device and last verified frame survive failed polls and reject another device", () => {
  const started = identity.createLiveTelemetrySession(identity.HYPHAE_1_REGISTRY_ID, true)
  const live = identity.applyLiveTelemetryPoll(started, {
    selectedDeviceId: identity.HYPHAE_1_REGISTRY_ID,
    liveSessionIntent: true,
    authorized: true,
    reachable: true,
    connected: true,
    failed: false,
    stale: false,
    frame: hyphaeFrame,
  })
  assert.equal(live.lifecycle, "live")
  assert.equal(live.liveSessionIntent, true)
  assert.equal(live.lastVerifiedFrame.sensorKeys.length, 7)

  const failed = identity.applyLiveTelemetryPoll(live, {
    selectedDeviceId: identity.HYPHAE_1_REGISTRY_ID,
    liveSessionIntent: true,
    authorized: true,
    reachable: false,
    connected: false,
    failed: true,
    stale: false,
    frame: null,
  })
  assert.equal(failed.selectedDeviceId, identity.HYPHAE_1_REGISTRY_ID)
  assert.equal(failed.liveSessionIntent, true)
  assert.equal(failed.retainedLastVerifiedFrame, true)
  assert.deepEqual(failed.lastVerifiedFrame, hyphaeFrame)

  const swapped = identity.applyLiveTelemetryPoll(failed, {
    selectedDeviceId: identity.HYPHAE_1_REGISTRY_ID,
    liveSessionIntent: true,
    authorized: true,
    reachable: true,
    connected: true,
    failed: false,
    stale: false,
    frame: { ...hyphaeFrame, selectedDeviceId: identity.MUSHROOM_1_REGISTRY_ID },
  })
  assert.equal(swapped.retainedLastVerifiedFrame, true)
  assert.equal(swapped.lastVerifiedFrame.selectedDeviceId, identity.HYPHAE_1_REGISTRY_ID)
  assert.equal(identity.bindTelemetryFrameToSelectedDevice(identity.HYPHAE_1_REGISTRY_ID, identity.MUSHROOM_1_REGISTRY_ID), false)
})
