/**
 * Unit tests for NLM device↔sensor binding helpers (no live network required).
 */
import { describe, expect, it } from "vitest"
import { normalizeIngestBindings } from "./device-ingest-bindings"

describe("normalizeIngestBindings", () => {
  it("keeps only rows with device_id + sensor_id", () => {
    const out = normalizeIngestBindings([
      { device_id: "mycobrain-COM4", sensor_id: "bme688_ambient" },
      { deviceId: "x", sensorId: "gas" },
      { device_id: "missing-sensor" },
      null,
      "bad",
    ])
    expect(out).toEqual([
      { device_id: "mycobrain-COM4", sensor_id: "bme688_ambient" },
      { device_id: "x", sensor_id: "gas" },
    ])
  })

  it("returns empty for non-arrays", () => {
    expect(normalizeIngestBindings(null)).toEqual([])
    expect(normalizeIngestBindings({})).toEqual([])
  })
})
