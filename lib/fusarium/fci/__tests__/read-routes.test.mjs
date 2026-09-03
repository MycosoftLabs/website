import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const host = join(root, "..", "..", "..")

function loadTs(rel) {
  const source = readFileSync(join(root, rel), "utf8")
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
}

function loadRoute(rel) {
  return readFileSync(join(host, "app", "api", "fci", rel), "utf8")
}

const { validateFciDeviceEvidence, validateFciEventLedger, validateFciWsStatus, unavailableFciRead, fetchFciUpstreamJson } =
  await import(`data:text/javascript;base64,${Buffer.from(loadTs("read-boundary.ts")).toString("base64")}`)

const HYPHAE = "mycobrain-hyphae1-jetson-228"
const MUSHROOM = "mycobrain-mushroom1-jetson-123"

function jsonResponse(status, body, headers = { "content-type": "application/json" }) {
  const encoded = Buffer.from(JSON.stringify(body))
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    body: {
      getReader() {
        let sent = false
        return {
          read: async () => {
            if (sent) return { done: true, value: undefined }
            sent = true
            return { done: false, value: encoded }
          },
          cancel: async () => undefined,
          releaseLock() {},
        }
      },
      cancel: async () => undefined,
    },
  }
}

describe("FCI read-route truth and denial", () => {
  it("does not stamp requested identity onto mismatched source evidence", () => {
    const result = validateFciDeviceEvidence(
      {
        device_id: MUSHROOM,
        generated_at: "2026-09-02T22:00:00.000Z",
        fingerprint: { source: "mas-fci", sample_count: 12 },
      },
      HYPHAE,
      "fingerprint",
    )
    assert.equal(result.ok, false)
    assert.match(result.error, /requested device identity/)
  })

  it("accepts fingerprint evidence only when source device and timestamp are proven", () => {
    const result = validateFciDeviceEvidence(
      {
        device_id: HYPHAE,
        generated_at: "2026-09-02T22:00:00.000Z",
        fingerprint: { source: "mas-fci", sample_count: 12 },
      },
      HYPHAE,
      "fingerprint",
    )
    assert.equal(result.ok, true)
  })

  it("rejects event ledgers that do not prove the requested device", () => {
    const result = validateFciEventLedger(
      {
        events: [
          {
            id: "evt-1",
            timestamp: "2026-09-02T22:00:00.000Z",
            source: "mas-fci",
            device_id: MUSHROOM,
          },
        ],
      },
      HYPHAE,
    )
    assert.equal(result.ok, false)
  })

  it("treats failed correlation and fingerprint reads as unavailable, not empty success", () => {
    const correlations = loadRoute("correlations/[deviceId]/route.ts")
    const fingerprint = loadRoute("fingerprint/[deviceId]/route.ts")
    for (const source of [correlations, fingerprint]) {
      assert.match(source, /unavailableFciRead/)
      assert.match(source, /requireOwner/)
      assert.match(source, /validateFciDeviceEvidence/)
      assert.doesNotMatch(source, /return NextResponse\.json\(\s*\[\s*\]/)
      assert.doesNotMatch(source, /status:\s*200[\s\S]*unavailableFciRead/)
    }
  })

  it("does not advertise SDR after a failed or unproven websocket status", () => {
    const failed = validateFciWsStatus({ active_devices: [], total_connections: 0 })
    assert.equal(failed.ok, false)
    const route = loadRoute("ws-status/route.ts")
    assert.match(route, /sdr_available: null/)
    assert.match(route, /unavailableFciRead/)
  })

  it("does not use unlabeled hardcoded GFST fallbacks", () => {
    const route = loadRoute("gfst/route.ts")
    assert.match(route, /fallback: false/)
    assert.match(route, /unavailableFciRead/)
    assert.match(route, /validateFciGfstPatterns/)
    assert.doesNotMatch(route, /DEFAULT_GFST/)
    assert.doesNotMatch(route, /HARDCODED_PATTERNS/)
  })

  it("events GET never POSTs correlate and never treats 404 as empty success", () => {
    const route = loadRoute("events/route.ts")
    assert.match(route, /requireOwner/)
    assert.match(route, /unavailableFciRead/)
    assert.match(route, /existing-evidence-only/)
    assert.doesNotMatch(route, /\/api\/fci\/events\/correlate/)
    assert.doesNotMatch(route, /empty success/)
  })

  it("denied FCI reads do not contact upstream", async () => {
    const events = loadRoute("events/route.ts")
    const correlations = loadRoute("correlations/[deviceId]/route.ts")
    const nlm = loadRoute("nlm/[deviceId]/route.ts")
    for (const source of [events, correlations, nlm]) {
      assert.ok(source.indexOf("requireOwner") < source.indexOf("fetchFciUpstreamJson"))
    }
  })

  it("fetchFciUpstreamJson maps 404 to unavailable, not empty success", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => jsonResponse(404, { events: [] })
    try {
      const result = await fetchFciUpstreamJson({ url: "http://example.invalid/api/fci/events" })
      assert.equal(result.ok, false)
      assert.equal(result.available, false)
      assert.equal(result.status, 503)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it("unavailableFciRead never claims identity was proven", () => {
    const body = unavailableFciRead("FCI upstream did not return authoritative evidence.", 503)
    assert.equal(body.available, false)
    assert.equal(body.status, 503)
    assert.equal("identityProven" in body, false)
    assert.equal("sourceDeviceId" in body, false)
  })
})
