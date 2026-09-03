import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const source = await readFile(new URL("../adapter.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const adapter = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)

const evaluatedAt = "2026-09-01T20:00:30.000Z"

test("binds exact MycoBrain sensor identities and canonical field units without device-type inference", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["mycobrain-COM7"], async (sourceRef) => {
    const payload = sourceRef === "/api/mycobrain/devices" ? { devices: [{ device_id: "mycobrain-COM7", last_message_time: "2026-09-01T20:00:00Z", sensor_data: { bme688_1: { sensor_id: "amb-0x77", temperature: 22.4, humidity: 51.2, gas_resistance: 81234 } } }] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: payload ? "ok" : "empty" }
  }, evaluatedAt)
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.deepEqual(result.sampleSeries.map((series) => [series.sensorId, series.unit, series.values[0]]), [
    ["amb-0x77:gas_resistance", "Ω", 81234], ["amb-0x77:humidity", "%RH", 51.2], ["amb-0x77:temperature", "°C", 22.4],
  ])
  assert.ok(result.sampleSeries.every((series) => series.deviceId === "mycobrain-COM7" && series.provenance.mode === "LIVE"))
})

test("binds the exact operator device and sensor key used by the Device Manager path", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["node-a-amb-192-168-0-123"], async (sourceRef) => {
    const payload = sourceRef === "/api/mycobrain/devices" ? { devices: [{ device_id: "node-a-amb-192-168-0-123", device_info: { last_heartbeat: "2026-09-01T20:00:00Z" }, sensor_data: { bme688_amb: { temperature: 20.8, humidity: 49.1, gas_resistance: 90001 } } }] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt)
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.deepEqual(result.sampleSeries.map((series) => series.sensorId), ["bme688_amb:gas_resistance", "bme688_amb:humidity", "bme688_amb:temperature"])
})

test("normalizes the passive MycoBrain service's nested Side-A BME payload without issuing a sensor command", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["mycobrain-COM4"], async (sourceRef) => {
    const payload = sourceRef === "/api/mycobrain/devices" ? { devices: [{
      device_id: "mycobrain-COM4",
      sensor_data: {
        last_update: "2026-09-01T20:00:00Z",
        bme688: {
          a: { sensor_slot: "bme688_a", address: "0x77", temperature_c_comp: 24.3, humidity_pct_comp: 52.1, pressure_hpa: 1009.4, gas_resistance_ohm_comp: 76100 },
          b: { sensor_slot: "bme688_b", address: "0x76", ambient_temperature_c: 23.8, ambient_humidity_pct: 50.4, gas_resistance_ohm: 80120 },
        },
      },
    }] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt)
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.deepEqual([...new Set(result.sampleSeries.map((series) => series.sensorId.split(":")[0]))], ["bme688_a", "bme688_b"])
  assert.ok(result.sampleSeries.some((series) => series.sensorId === "bme688_a:temperature" && series.values[0] === 24.3 && series.unit === "°C"))
  assert.ok(result.sampleSeries.every((series) => series.provenance.sourceId === "/api/mycobrain/devices"))
})

test("binds a catalog selection to its exact authoritative registry alias and reads only the registry id", async () => {
  const reads = []
  const result = await adapter.collectSameOriginSensingTelemetry(["mushroom-1"], async (sourceRef) => {
    reads.push(sourceRef)
    const payload = sourceRef === "/api/devices/network/mycobrain-mushroom1-jetson-123/telemetry" ? {
      device_id: "mycobrain-mushroom1-jetson-123",
      telemetry: { sensor_id: "amb-0x77", observed_at: "2026-09-01T20:00:00Z", temperature_c: 21.9, humidity_pct: 48.7 },
    } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "mushroom-1": ["mycobrain-mushroom1-jetson-123"] },
    readDeviceIds: ["mycobrain-mushroom1-jetson-123"],
  })
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.ok(result.sampleSeries.every((series) => series.deviceId === "mushroom-1"))
  assert.ok(reads.some((sourceRef) => sourceRef.includes("mycobrain-mushroom1-jetson-123")))
  assert.ok(reads.every((sourceRef) => !sourceRef.includes("/mushroom-1/telemetry")))
})

test("opt-in live mode consumes the owner-gated field-operator inventory for Mushroom and Hyphae", async () => {
  const reads = []
  const result = await adapter.collectSameOriginSensingTelemetry(["mushroom-1"], async (sourceRef) => {
    reads.push(sourceRef)
    const payload = sourceRef === "/api/mycobrain?device_id=mycobrain-mushroom1-jetson-123" ? { devices: [{
      device_id: "mycobrain-mushroom1-jetson-123",
      verified: true,
      source: "operator-http",
      network_host: "192.168.0.123",
      device_info: { last_heartbeat: "2026-09-01T20:00:00Z", reported_device_id: "mycobrain-sidea-10b41d" },
      sensor_data: { bme688_amb: { sensor_id: "amb-0x77", observed_at: "2026-09-01T20:00:00Z", temperature: 22.8, humidity: 50.4, gas_resistance: 83000 } },
    }] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "mushroom-1": ["mycobrain-mushroom1-jetson-123"] },
    readDeviceIds: ["mycobrain-mushroom1-jetson-123"],
    liveReadDeviceIds: ["mycobrain-mushroom1-jetson-123"],
  })
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.ok(reads.includes("/api/mycobrain?device_id=mycobrain-mushroom1-jetson-123"))
  assert.equal(reads.some((sourceRef) => sourceRef === "/api/mycobrain"), false)
  assert.equal(reads.some((sourceRef) => sourceRef.includes("live_selected=1")), false)
  assert.ok(result.sampleSeries.some((series) => series.deviceId === "mushroom-1" && series.sensorId === "amb-0x77:temperature" && series.values[0] === 22.8))
})

test("reuses an exact Device Manager MycoBrain sample through the command-free cache-only path", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["psathyrella-buoy-com4"], async (sourceRef) => {
    const payload = sourceRef === "/api/mycobrain/mycobrain-COM3/sensors?cache_only=1" ? {
      port: "COM3",
      device_id: "mycobrain-COM3",
      sensors: {
        bme688_1: { sensor_id: "amb-0x77", address: "0x77", temperature: 23.4, humidity: 49.5, pressure: 1008.2, gas_resistance: 78100 },
      },
      timestamp: "2026-09-01T20:00:00Z",
      cache: { hit: true, age_ms: 2500, stale: true },
    } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "psathyrella-buoy-com4": ["mycobrain-COM4", "mycobrain-COM3"] },
    readDeviceIds: ["mycobrain-COM4", "mycobrain-COM3"],
  })
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.ok(result.sampleSeries.every((series) => series.deviceId === "psathyrella-buoy-com4"))
  assert.ok(result.sampleSeries.every((series) => series.provenance.sourceId.endsWith("cache_only=1")))
  assert.ok(result.sampleSeries.some((series) => series.sensorId === "amb-0x77:temperature" && series.values[0] === 23.4))
})

test("issues an opt-in sensor read only for the exact authorized selected-device identity", async () => {
  const reads = []
  const result = await adapter.collectSameOriginSensingTelemetry(["psathyrella-buoy-com4"], async (sourceRef) => {
    reads.push(sourceRef)
    const payload = sourceRef === "/api/mycobrain/mycobrain-COM3/sensors?live_selected=1" ? {
      port: "COM3",
      device_id: "mycobrain-COM3",
      sensors: { bme688_1: { sensor_id: "amb-0x77", temperature: 24.1, humidity: 51.2 } },
      timestamp: "2026-09-01T20:00:00Z",
    } : null
    return { sourceRef, state: payload ? "available" : "unavailable", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "psathyrella-buoy-com4": ["mycobrain-COM4", "mycobrain-COM3"] },
    readDeviceIds: ["mycobrain-COM4", "mycobrain-COM3"],
    liveReadDeviceIds: ["mycobrain-COM3"],
  })
  assert.equal(result.state, "available", JSON.stringify(result))
  assert.equal(reads.filter((sourceRef) => sourceRef.includes("live_selected=1")).length, 1)
  assert.ok(reads.includes("/api/mycobrain/mycobrain-COM3/sensors?live_selected=1"))
  assert.ok(reads.every((sourceRef) => sourceRef !== "/api/mycobrain/mycobrain-COM4/sensors?live_selected=1"))
  assert.ok(result.sampleSeries.every((series) => series.deviceId === "psathyrella-buoy-com4"))
})

test("binds only verified MINDEX sample history with timestamps, units, stream ids, and verification provenance", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["mushroom-1"], async (sourceRef) => {
    const payload = sourceRef.startsWith("/api/mindex/telemetry/samples?device_slug=mycobrain-mushroom1-jetson-123") ? [
      { envelope_msg_id: "env-1", recorded_at: "2026-09-01T20:00:00Z", stream_key: "bme688.amb.temperature", value_numeric: 21.2, verified: true },
      { envelope_msg_id: "env-2", recorded_at: "2026-09-01T20:00:10Z", stream_key: "bme688.amb.temperature", value_numeric: 21.4, verified: false },
      { envelope_msg_id: "env-3", recorded_at: "2026-09-01T20:00:15Z", stream_key: "bme688.amb.temperature", value_numeric: 21.6 },
      { envelope_msg_id: "wrong-device", device_slug: "other-device", recorded_at: "2026-09-01T20:00:10Z", stream_key: "bme688.amb.temperature", value_numeric: 99, verified: true },
    ] : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:20Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "mushroom-1": ["mycobrain-mushroom1-jetson-123"] },
    readDeviceIds: ["mycobrain-mushroom1-jetson-123"],
  })
  assert.equal(result.sampleSeries.length, 1, JSON.stringify(result))
  assert.equal(result.sampleSeries[0].sensorId, "bme688.amb.temperature:temperature")
  assert.equal(result.sampleSeries[0].unit, "°C")
  assert.deepEqual(result.sampleSeries[0].values, [21.2])
  assert.match(result.sampleSeries[0].provenance.evidenceId, /^mindex:verified:env-1$/)
  assert.ok(result.sourceRuns.some((run) => run.sourceRef.startsWith("/api/mindex/telemetry/samples?") && run.rejectedPointCount === 3))
})

test("MINDEX rows cannot cross-label one selected device with another selected device's evidence", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["device-a", "device-b"], async (sourceRef) => {
    const payload = sourceRef.includes("device_slug=device-a") ? [
      { envelope_msg_id: "cross", device_slug: "device-b", recorded_at: "2026-09-01T20:00:00Z", stream_key: "bme.temperature", value_numeric: 99, verified: true },
    ] : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt)
  assert.equal(result.sampleSeries.some((series) => series.values.includes(99)), false)
  assert.ok(result.sourceRuns.some((run) => run.sourceRef.includes("device_slug=device-a") && run.rejectedPointCount === 1))
})

test("sensor evidence timestamps reject missing zones and impossible calendar dates", async () => {
  for (const timestamp of ["2026-09-01T20:00:00", "2026-02-31T20:00:00Z"]) {
    const result = await adapter.collectSameOriginSensingTelemetry(["mycobrain-COM7"], async (sourceRef) => ({
      sourceRef,
      state: sourceRef === "/api/mycobrain/devices" ? "available" : "empty",
      receivedAt: "2026-09-01T20:00:02Z",
      payload: sourceRef === "/api/mycobrain/devices" ? { devices: [{ device_id: "mycobrain-COM7", last_message_time: timestamp, sensor_data: { bme688_1: { sensor_id: "amb-0x77", temperature: 22.4 } } }] } : null,
      message: "fixture",
    }), evaluatedAt)
    assert.equal(result.state, "unbound", timestamp)
  }
})

test("rejects a wrapped device telemetry sample when its physical source identity does not match the selected deployment", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["mushroom-1"], async (sourceRef) => {
    const payload = sourceRef === "/api/devices/network/mycobrain-mushroom1-jetson-123/telemetry" ? {
      device_id: "mycobrain-mushroom1-jetson-123",
      telemetry: { source_device_id: "mycobrain-COM3", sensor_id: "amb-0x77", observed_at: "2026-09-01T20:00:00Z", temperature_c: 21.9 },
    } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt, {
    aliasesBySelected: { "mushroom-1": ["mycobrain-mushroom1-jetson-123"] },
    readDeviceIds: ["mycobrain-mushroom1-jetson-123"],
  })
  assert.equal(result.state, "unbound", JSON.stringify(result))
  assert.deepEqual(result.sampleSeries, [])
})

test("binds FCI readings only when device, channel, unit, and timestamp are explicit", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["fci-device-1"], async (sourceRef) => {
    const payload = sourceRef.startsWith("/api/fci/telemetry") ? { readings: [
      { id: "r1", device_id: "fci-device-1", channel_id: "electrode-a", timestamp: "2026-09-01T20:00:00Z", received_at: "2026-09-01T20:00:01Z", raw_value: 14.2, unit: "mV" },
      { id: "r2", device_id: "other-device", channel_id: "electrode-a", timestamp: "2026-09-01T20:00:00Z", raw_value: 99, unit: "mV" },
    ] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt)
  assert.equal(result.sampleSeries.length, 1)
  assert.equal(result.sampleSeries[0].sensorId, "electrode-a:bioelectric")
  assert.deepEqual(result.sampleSeries[0].values, [14.2])
})

test("binds exact Device Network telemetry only when the payload names its sensor", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["network-node-1"], async (sourceRef) => {
    const payload = sourceRef.startsWith("/api/devices/network?") ? { devices: [{ id: "network-node-1", last_seen: "2026-09-01T20:00:00Z", telemetry: { sensor_id: "bme-0x76", temperature_c: 23.1, humidity_pct: 48.2 } }] } : null
    return { sourceRef, state: payload ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload, message: "fixture" }
  }, evaluatedAt)
  assert.equal(result.state, "available")
  assert.deepEqual(result.sampleSeries.map((series) => series.sensorId), ["bme-0x76:humidity_pct", "bme-0x76:temperature_c"])
})

test("binds owner-gated Psathyrella BME evidence for exact aliases only", async () => {
  const reader = async (sourceRef) => ({ sourceRef, state: sourceRef === "/api/psathyrella/bme" ? "available" : "empty", receivedAt: "2026-09-01T20:00:02Z", payload: sourceRef === "/api/psathyrella/bme" ? { sensors: { bme688_1: { temperature: 25.5, humidity: 48.9, pressure: 648, gas_resistance: 81200, iaq: 50, co2_equivalent: 502, voc_equivalent: 0.8, present: true, address: "0x77", label: "Side A" }, bme688_2: null }, timestamp: "2026-09-01T20:00:00Z", source: "telemetry-hub" } : null, message: "fixture" })
  const exact = await adapter.collectSameOriginSensingTelemetry(["mycobrain-COM4"], reader, evaluatedAt)
  assert.equal(exact.state, "available")
  assert.equal(exact.sampleSeries.length, 7)
  assert.ok(exact.sampleSeries.every((series) => series.deviceId === "mycobrain-COM4" && series.sensorId.startsWith("bme688_1@0x77:")))
  const inferred = await adapter.collectSameOriginSensingTelemetry(["psathyrella-looking-device"], reader, evaluatedAt)
  assert.equal(inferred.state, "unbound")
  assert.equal(inferred.sourceRuns.some((run) => run.sourceRef === "/api/psathyrella/bme"), false)
})

test("rejects null or timestamp-free Psathyrella frames", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["psathyrella-buoy-com4"], async (sourceRef) => ({ sourceRef, state: "available", receivedAt: evaluatedAt, payload: sourceRef === "/api/psathyrella/bme" ? { sensors: { bme688_1: null }, timestamp: null } : {}, message: "fixture" }), evaluatedAt)
  assert.equal(result.state, "unbound")
  assert.deepEqual(result.sampleSeries, [])
})

test("keeps selected devices unbound when reachable payloads lack exact sensor identity or timestamps", async () => {
  const result = await adapter.collectSameOriginSensingTelemetry(["device-1"], async (sourceRef) => ({
    sourceRef, state: "available", receivedAt: evaluatedAt,
    payload: sourceRef.includes("/api/devices/device-1/") ? { device_id: "device-1", telemetry: [{ payload: { temperature: 21.5 } }] } : {}, message: "reachable",
  }), evaluatedAt)
  assert.equal(result.state, "unbound")
  assert.deepEqual(result.sampleSeries, [])
  assert.ok(result.sourceRuns.some((run) => run.state === "withheld"))
})

test("adapter uses bounded same-origin GET references and contains no direct command or generated-data seam", () => {
  assert.doesNotMatch(source, /method\s*:\s*["']POST|sendCommand|read_sensors|Math\.random|setInterval/)
  assert.match(source, /\/api\/mycobrain\/devices/)
  assert.match(source, /\/api\/mycobrain\?device_id=\$\{encodeURIComponent\(deviceId\)\}/)
  assert.match(source, /\/api\/devices\/network\?include_offline=true/)
  assert.match(source, /\/api\/devices\/network\/\$\{encodeURIComponent\(deviceId\)\}\/telemetry/)
  assert.match(source, /\/api\/mycobrain\/\$\{encodeURIComponent\(deviceId\)\}\/sensors\?cache_only=1/)
  assert.match(source, /liveReadDeviceIds\.flatMap/)
  assert.match(source, /\/api\/mycobrain\/\$\{encodeURIComponent\(deviceId\)\}\/sensors\?live_selected=1/)
  assert.match(source, /\/api\/mindex\/telemetry\/samples\?device_slug=/)
  assert.doesNotMatch(source, /\/api\/earth-simulator\/devices/)
  assert.doesNotMatch(source, /\/api\/devices\/\$\{encodeURIComponent\(deviceId\)\}\/telemetry/)
  assert.match(source, /\/api\/fci\/telemetry/)
  assert.match(source, /PSATHYRELLA_DEVICE_ALIASES/)
  assert.doesNotMatch(source, /mycobrain-service-192-168-0-241|["']psathyrella-1["']/)
  assert.match(source, /\/api\/psathyrella\/bme/)
  assert.match(source, /\/api\/psathyrella\/telemetry/)
})
