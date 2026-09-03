import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test, { after } from "node:test"

import { cleanupCompiledModules, loadDataFusionModules } from "./transpile-harness.mjs"

after(cleanupCompiledModules)

const { fabricContract } = await loadDataFusionModules()
const { buildDataCenterFabricContract } = fabricContract

test("storage targets keep five evidence axes independent", () => {
  const contract = buildDataCenterFabricContract(
    { NATUREOS_STORAGE_ROOT: true, NAS_MOUNT_PATH: true },
    "2026-09-02T18:00:00.000Z",
  )

  assert.equal(contract.schema, "fusarium-data-center-fabric/v1")
  assert.equal(contract.access, "owner-authenticated")
  assert.equal(contract.operationMode, "read-only-inventory")
  assert.deepEqual(contract.targets.map((target) => target.id), [
    "local-disk",
    "nas",
    "removable-media",
    "fedramp-cloud",
  ])
  for (const target of contract.targets) {
    assert.deepEqual(target.axes.map((axis) => axis.name), [
      "configured",
      "reachable",
      "authorized",
      "fresh",
      "populated",
    ])
    assert.equal(target.axes.find((axis) => axis.name === "reachable")?.state, "not-probed")
    assert.equal(target.axes.find((axis) => axis.name === "authorized")?.state, "not-probed")
    assert.equal(target.axes.find((axis) => axis.name === "fresh")?.state, "unknown")
    assert.equal(target.axes.find((axis) => axis.name === "populated")?.state, "unknown")
    assert.equal(target.allowedOperation, "inventory-only")
  }
  assert.equal(contract.targets[0].axes[0].state, "satisfied")
  assert.equal(contract.targets[1].axes[0].state, "satisfied")
  assert.equal(contract.targets[2].axes[0].state, "unsatisfied")
  assert.equal(contract.targets[3].axes[0].state, "unsatisfied")
})

test("configuration output contains names and booleans but cannot carry secret values", () => {
  const contract = buildDataCenterFabricContract({ FUSARIUM_FEDRAMP_ROLE_REF: true })
  const serialized = JSON.stringify(contract)

  assert.match(serialized, /NATUREOS_STORAGE_ROOT/)
  assert.doesNotMatch(serialized, /Bearer\s|password|secret-value|token-value/i)
  assert.ok(contract.targets.flatMap((target) => target.configuration).every(
    (signal) => Object.keys(signal).sort().join(",") === "key,present,sensitivity",
  ))
  assert.equal(contract.targets.find((target) => target.id === "fedramp-cloud")?.axes[0].state, "unsatisfied")
})

test("DIRTNet sensor silos preserve evidence-to-state-to-memory lineage without counts", () => {
  const contract = buildDataCenterFabricContract()

  assert.equal(contract.silos.length, 8)
  assert.ok(contract.silos.some((silo) => silo.id === "chemical"))
  assert.ok(contract.silos.some((silo) => silo.id === "particulate"))
  assert.ok(contract.silos.every((silo) => silo.state === "unbound"))
  assert.ok(contract.silos.every((silo) => silo.lineage.includes("Form Space state")))
  assert.ok(contract.silos.every((silo) => silo.lineage.includes("MINDEX catalog")))
  assert.ok(contract.silos.every((silo) => !("count" in silo)))
})

test("API and ETL seams are never invoked or promoted to live", () => {
  const contract = buildDataCenterFabricContract()

  assert.ok(contract.pipelines.every((pipeline) => pipeline.invoked === false))
  assert.ok(contract.pipelines.every((pipeline) => !["ready", "live", "fresh", "populated"].includes(pipeline.state)))
  assert.equal(contract.pipelines.find((pipeline) => pipeline.id === "etl-observability")?.state, "unavailable")
  assert.equal(contract.pipelines.find((pipeline) => pipeline.id === "form-space-state")?.state, "unbound")
})

test("fake legacy storage routes are explicitly disqualified and never called", () => {
  const contract = buildDataCenterFabricContract()

  assert.deepEqual(contract.legacyRoutes.map((route) => route.route), [
    "/api/storage/nas",
    "/api/storage/files",
  ])
  assert.ok(contract.legacyRoutes.every((route) => route.decision === "disqualified"))
  assert.ok(contract.legacyRoutes.every((route) => route.invoked === false))
})

test("cryptographic erasure is an inert two-person policy with no action path", () => {
  const readiness = buildDataCenterFabricContract().erasureReadiness

  assert.equal(readiness.state, "policy-only")
  assert.equal(readiness.executionEnabled, false)
  assert.equal(readiness.actionEndpoint, null)
  assert.equal(readiness.minimumApprovers, 2)
  assert.deepEqual(readiness.requiredReviewRoles, ["data-custodian", "security-officer"])
  assert.ok(readiness.prerequisites.includes("retention and legal-hold clearance"))
  assert.ok(readiness.auditFields.includes("approver-one"))
  assert.ok(readiness.auditFields.includes("approver-two"))
})

test("fabric API is owner-only GET and contains no probe or mutation implementation", () => {
  const route = readFileSync(
    new URL("../../../../app/api/fusarium/data-fusion/fabric/route.ts", import.meta.url),
    "utf8",
  )

  assert.match(route, /await requireOwner\(\)/)
  assert.match(route, /export async function GET\(\)/)
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(route, /fetch\s*\(/)
  assert.doesNotMatch(route, /\/api\/storage\/(nas|files)/)
  assert.doesNotMatch(route, /node:fs|child_process|exec\s*\(|spawn\s*\(/)
})

test("protected UI calls only the owner-gated fabric contract", () => {
  const component = readFileSync(
    new URL("../../../../components/fusarium/data-fusion/protected-data-center.tsx", import.meta.url),
    "utf8",
  )

  const requests = [...component.matchAll(/fetch\(\"([^\"]+)\"/g)].map((match) => match[1])
  assert.deepEqual(requests, ["/api/fusarium/data-fusion/fabric"])
  assert.doesNotMatch(component, /\/api\/storage\/(nas|files)/)
  assert.match(component, /Policy only · two-person review · no execution path/)
})
