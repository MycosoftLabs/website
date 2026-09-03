import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-stack-recovery-tests-"))
for (const name of ["contracts", "provider", "recovery"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
    .replace('from "./contracts"', 'from "./contracts.mjs"')
    .replace('from "./provider"', 'from "./provider.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const contracts = await import(pathToFileURL(join(compiledDir, "contracts.mjs")))
const provider = await import(pathToFileURL(join(compiledDir, "provider.mjs")))
const recovery = await import(pathToFileURL(join(compiledDir, "recovery.mjs")))

const NOW = new Date("2026-09-02T18:00:00.000Z")

const failedOutcome = (endpoint, status = 503) => ({
  endpoint,
  ok: false,
  status,
  receivedAt: NOW.toISOString(),
  payload: { detail: { error: "not_bound" } },
  error: `HTTP ${status} · not_bound`,
})

const item = (snapshot, id) => {
  const found = snapshot.inventory.find((entry) => entry.id === id)
  assert.ok(found, `missing inventory item ${id}`)
  return found
}

test("local unavailable rows produce an approval-gated fixed read proposal", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    failedOutcome(provider.STACK_ENDPOINTS.contract),
  ], NOW)
  const target = item(snapshot, "service:intelligence-v1")
  const proposed = recovery.createStackRemediationProposal(target, "please fix this", NOW)
  const evaluated = recovery.evaluateStackRemediationPolicy(proposed)

  assert.equal(target.state, "unavailable")
  assert.equal(proposed.actionId, "refresh_local_readonly_status")
  assert.equal(evaluated.stage, "awaiting_approval")
  assert.equal(evaluated.policyDecision, "allowed")
  assert.equal(evaluated.requiresApproval, true)
  assert.deepEqual(evaluated.bounds, {
    maxRequests: 4,
    timeoutMs: 10_000,
    sameOriginOnly: true,
    readOnly: true,
    externalEffects: false,
  })
  assert.match(recovery.describeInventoryAttention(target).reason, /HTTP 503/)
})

test("the lifecycle requires approval and verifies the read without claiming a repair", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    failedOutcome(provider.STACK_ENDPOINTS.health),
  ], NOW)
  const target = item(snapshot, "service:intelligence-health")
  const evaluated = recovery.evaluateStackRemediationPolicy(
    recovery.createStackRemediationProposal(target, "diagnose", NOW),
  )

  assert.throws(
    () => recovery.beginStackRemediation(evaluated, new Set(), NOW),
    /requires an approved proposal/,
  )
  const approved = recovery.approveStackRemediation(evaluated, NOW)
  const executing = recovery.beginStackRemediation(approved, new Set(), NOW)
  const acknowledged = recovery.acknowledgeStackRemediation(executing, NOW)
  const verified = recovery.verifyStackRemediation(acknowledged, snapshot, NOW)

  assert.equal(executing.stage, "executing")
  assert.equal(acknowledged.stage, "acknowledged")
  assert.equal(verified.stage, "verified")
  assert.match(verified.resultDetail, /still reports unavailable/)
  assert.match(verified.resultDetail, /No repair is claimed/)
})

test("external and non-status dependencies produce instructions without execution", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([], NOW)
  const target = item(snapshot, "connector:lattice")
  const evaluated = recovery.evaluateStackRemediationPolicy(
    recovery.createStackRemediationProposal(target, "reconnect this", NOW),
  )

  assert.equal(evaluated.actionId, "present_manual_recovery")
  assert.equal(evaluated.stage, "instructions_only")
  assert.equal(evaluated.policyDecision, "manual_only")
  assert.equal(evaluated.bounds.maxRequests, 0)
  assert.equal(evaluated.bounds.externalEffects, false)
  assert.ok(evaluated.instructions.some((entry) => /separately approved operator workflow/.test(entry)))
})

test("forged endpoints and expanded bounds fail the default-deny policy", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    failedOutcome(provider.STACK_ENDPOINTS.readiness),
  ], NOW)
  const target = item(snapshot, "service:intelligence-readiness")
  const proposed = recovery.createStackRemediationProposal(target, "retry", NOW)

  const external = recovery.evaluateStackRemediationPolicy({
    ...proposed,
    endpoint: "https://example.invalid/admin/restart",
  })
  const expanded = recovery.evaluateStackRemediationPolicy({
    ...proposed,
    bounds: { ...proposed.bounds, maxRequests: 5 },
  })

  assert.equal(external.stage, "policy_blocked")
  assert.equal(expanded.stage, "policy_blocked")
})

test("idempotency prevents repeating an already completed dependency-state check", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    failedOutcome(provider.STACK_ENDPOINTS.operator),
  ], NOW)
  const target = item(snapshot, "service:operator-state")
  const evaluated = recovery.evaluateStackRemediationPolicy(
    recovery.createStackRemediationProposal(target, "retry", NOW),
  )
  const approved = recovery.approveStackRemediation(evaluated, NOW)
  const duplicate = recovery.beginStackRemediation(
    approved,
    new Set([approved.idempotencyKey]),
    NOW,
  )

  assert.equal(duplicate.stage, "verified")
  assert.match(duplicate.resultDetail, /already completed/)
})

test("browser activity records append, deduplicate, and evict only at the bound", () => {
  const makeRecord = (id, at) => recovery.stackActivityRecord({
    id,
    at,
    kind: "poll_accepted",
    actor: "stack-inventory",
    state: "live",
    summary: id,
    evidenceRef: "/api/fusarium/v1/health",
    correlationId: "poll:1",
  })
  const first = recovery.appendStackActivityRecords([], [
    makeRecord("one", "2026-09-02T18:00:00.000Z"),
    makeRecord("two", "2026-09-02T18:00:01.000Z"),
  ], 3)
  const second = recovery.appendStackActivityRecords(first, [
    makeRecord("two", "2026-09-02T18:00:09.000Z"),
    makeRecord("three", "2026-09-02T18:00:02.000Z"),
    makeRecord("four", "2026-09-02T18:00:03.000Z"),
  ], 3)

  assert.deepEqual(first.map((entry) => entry.id), ["one", "two"])
  assert.deepEqual(second.map((entry) => entry.id), ["two", "three", "four"])
  assert.equal(second[0].at, "2026-09-02T18:00:01.000Z")
})

test("semantic change detection records rows removed by a newer accepted snapshot", () => {
  const previous = provider.buildStackInventorySnapshotForTest([], NOW)
  const removed = previous.inventory[0]
  const next = { ...previous, inventory: previous.inventory.slice(1) }
  const changes = contracts.snapshotChanges(previous, next)

  assert.deepEqual(changes, [{
    itemId: removed.id,
    summary: `${removed.name} is absent from the newly accepted inventory; its current state is unknown.`,
    state: "unknown",
  }])
})

test("the Stack route inherits the owner-only Fusarium server gate", () => {
  const layoutPath = fileURLToPath(new URL("../../../../app/fusarium/(dashboard)/layout.tsx", import.meta.url))
  const pagePath = fileURLToPath(new URL("../../../../components/fusarium/stack-inventory/stack-inventory-page.tsx", import.meta.url))
  const layoutSource = readFileSync(layoutPath, "utf8")
  const pageSource = readFileSync(pagePath, "utf8")

  assert.match(layoutSource, /const auth = await requireOwner\(\)/)
  assert.match(pageSource, /Fixed allowlist only/)
  assert.doesNotMatch(pageSource, /child_process|powershell|cmd\.exe|fetch\(request/)
})
