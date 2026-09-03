import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { canonicalSha256, canonicalizeOperation, runEvidenceOperation } from "../evidence-operations.ts"

const root = process.cwd()
const view = fs.readFileSync(path.join(root, "components/fusarium/tools-hub/evidence-operations-workspace.tsx"), "utf8")
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/tools-hub/catalog.ts"), "utf8")

const provenance = (sourceRecordId) => ({ sourceId: "operator-local", sourceRef: "local://bounded-import", sourceRecordId, receivedAt: "2026-09-01T12:01:00.000Z" })

test("four evidence-operation tools have dedicated routes and mounted catalog links", () => {
  for (const [slug, kind] of [["chain-of-custody", "custody"], ["evidence-timeline", "timeline"], ["field-packet", "packet"], ["evidence-diff", "diff"]]) {
    const route = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/tools/${slug}/page.tsx`), "utf8")
    assert.match(route, new RegExp(`kind="${kind}"`))
    assert.match(catalog, new RegExp(`href: "/fusarium/tools/${slug}"`))
  }
})

test("canonicalization is stable across object key order", async () => {
  assert.equal(canonicalizeOperation({ z: 1, a: { y: 2, b: 3 } }), canonicalizeOperation({ a: { b: 3, y: 2 }, z: 1 }))
  assert.equal(await canonicalSha256({ b: 2, a: 1 }), await canonicalSha256({ a: 1, b: 2 }))
})

test("custody inspector verifies append order, revisions, provenance, classification, and hash links", async () => {
  const first = { eventId: "event-1", revision: 1, action: "collected", actorRef: "operator-7", occurredAt: "2026-09-01T12:00:00Z", recordedAt: "2026-09-01T12:00:30Z", previousEventHash: null, classification: "UNCLASSIFIED", provenance: provenance("source-1") }
  const firstHash = await canonicalSha256({ evidenceId: "evidence-1", ...first, occurredAt: "2026-09-01T12:00:00.000Z", recordedAt: "2026-09-01T12:00:30.000Z", declaredEventHash: undefined })
  const second = { eventId: "event-2", revision: 2, action: "transferred", actorRef: "operator-8", occurredAt: "2026-09-01T12:02:00Z", recordedAt: "2026-09-01T12:02:30Z", previousEventHash: firstHash, classification: "UNCLASSIFIED", provenance: provenance("source-2") }
  const result = await runEvidenceOperation("custody", { schemaVersion: "fusarium-chain-of-custody/v1", evidenceId: "evidence-1", classification: "UNCLASSIFIED", provenance: provenance("ledger-1"), events: [first, second] })
  assert.equal(result.state, "verified")
  assert.equal(result.recordCount, 2)
  assert.equal(result.issues.length, 0)
  assert.match(result.canonicalHash, /^[a-f0-9]{64}$/)

  const broken = await runEvidenceOperation("custody", { schemaVersion: "fusarium-chain-of-custody/v1", evidenceId: "evidence-1", classification: "UNCLASSIFIED", provenance: provenance("ledger-1"), events: [second, first] })
  assert.equal(broken.state, "error")
  assert.ok(broken.issues.some((issue) => /append order|revision|previous-event hash/.test(issue.message)))
})

test("timeline builder deterministically orders supplied records and does not invent gaps", async () => {
  const result = await runEvidenceOperation("timeline", { schemaVersion: "fusarium-evidence-timeline-source/v1", timelineId: "timeline-1", classification: "UNCLASSIFIED", records: [
    { recordId: "b", eventType: "lab-result", summary: "Result supplied", observedAt: "2026-09-01T13:00:00Z", recordedAt: "2026-09-01T13:02:00Z", classification: "UNCLASSIFIED", provenance: provenance("b") },
    { recordId: "a", eventType: "observation", summary: "Observation supplied", observedAt: "2026-09-01T12:00:00Z", recordedAt: "2026-09-01T12:01:00Z", classification: "UNCLASSIFIED", provenance: provenance("a") },
  ] })
  assert.equal(result.state, "verified")
  assert.deepEqual(result.output.entries.map((entry) => entry.recordId), ["a", "b"])
  assert.equal(result.output.entries.length, 2)
})

test("field packet enforces time bounds, classification, provenance, and local deterministic manifest", async () => {
  const input = { schemaVersion: "fusarium-field-packet-source/v1", packetId: "packet-1", classification: "UNCLASSIFIED", assembledAt: "2026-09-01T14:00:00Z", assembledByRef: "operator-7", missionArea: { id: "area-1", label: "Field plot" }, timeWindow: { start: "2026-09-01T12:00:00Z", end: "2026-09-01T13:00:00Z" }, provenance: provenance("packet-source"), records: [{ recordId: "record-1", observedAt: "2026-09-01T12:30:00Z", classification: "UNCLASSIFIED", provenance: provenance("record-1"), value: 7 }] }
  const result = await runEvidenceOperation("packet", input)
  assert.equal(result.state, "verified")
  assert.match(result.output.canonicalPacketHash, /^[a-f0-9]{64}$/)
  const outside = await runEvidenceOperation("packet", { ...input, records: [{ ...input.records[0], observedAt: "2026-09-02T12:30:00Z" }] })
  assert.equal(outside.state, "error")
  assert.ok(outside.issues.some((issue) => issue.message.includes("outside")))
})

test("evidence diff reports added, removed, changed, and unchanged records", async () => {
  const base = { evidenceId: "evidence-1", classification: "UNCLASSIFIED", recordedAt: "2026-09-01T12:00:00Z", provenance: provenance("rev") }
  const result = await runEvidenceOperation("diff", { schemaVersion: "fusarium-evidence-diff-source/v1", classification: "UNCLASSIFIED", left: { ...base, revision: 1, records: [{ recordId: "same", value: 1 }, { recordId: "changed", value: 1 }, { recordId: "removed", value: 1 }] }, right: { ...base, revision: 2, recordedAt: "2026-09-01T13:00:00Z", records: [{ recordId: "same", value: 1 }, { recordId: "changed", value: 2 }, { recordId: "added", value: 1 }] } })
  assert.equal(result.state, "verified")
  assert.deepEqual(result.output.counts, { added: 1, removed: 1, changed: 1, unchanged: 1 })
})

test("empty, unavailable, and error remain distinct", async () => {
  const empty = await runEvidenceOperation("timeline", { schemaVersion: "fusarium-evidence-timeline-source/v1", timelineId: "timeline-empty", classification: "UNCLASSIFIED", records: [] })
  assert.equal(empty.state, "empty")
  const invalid = await runEvidenceOperation("timeline", { schemaVersion: "fusarium-evidence-timeline-source/v1", timelineId: "timeline-bad", classification: "SECRET", records: [] })
  assert.equal(invalid.state, "error")
  assert.match(view, /No evidence has been supplied or processed in this browser session/)
  assert.match(view, /No local evidence was supplied\. This is unavailable, not an empty result/)
})

test("workspace is browser-local and has no persistence or external request path", () => {
  assert.match(view, /No upload, persistence, external call, credential, backend write, inferred evidence/)
  assert.match(view, /URL\.createObjectURL/)
  assert.doesNotMatch(view, /\bfetch\s*\(/)
  assert.doesNotMatch(view, /localStorage|sessionStorage|indexedDB|method:\s*["']POST/)
  assert.match(view, /No sample evidence is preloaded/)
})
