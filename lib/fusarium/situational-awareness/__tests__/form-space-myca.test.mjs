import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-sa-form-space-tests-"))
for (const name of ["contracts", "deep-links", "form-space", "mission-areas", "myca-context"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText.replace(/from "\.\/(contracts|deep-links|form-space)"/g, 'from "./$1.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const formSpace = await import(pathToFileURL(join(compiledDir, "form-space.mjs")))
const missionAreas = await import(pathToFileURL(join(compiledDir, "mission-areas.mjs")))
const myca = await import(pathToFileURL(join(compiledDir, "myca-context.mjs")))

const context = {
  missionAreaId: "area-7",
  missionAreaLabel: "Area 7",
  timeWindow: "72h",
  dataMode: "system",
  view: "earth",
  selectedModelId: "nlm-fusion",
  formSpacePresentation: "compare",
  selectedObjectId: "object-7",
  selectedEvidenceId: "evidence-7",
  sourceId: "source-7",
  classification: "UNCLASSIFIED",
}

test("Form Space catalog separates source evidence from proposed or unbound architecture", () => {
  const catalog = formSpace.buildFormSpaceCatalog("2026-09-02T17:44:00.000Z")
  assert.equal(catalog.schema, "fusarium-form-space-catalog/v1")
  assert.equal(catalog.classification, "UNCLASSIFIED")
  assert.match(catalog.evidenceBoundary, /not represented as deployed or live/i)
  assert.ok(catalog.models.length >= 10)
  assert.equal(catalog.models.find((model) => model.id === "nlm-compatibility-status").state, "not_probed")
  assert.equal(catalog.models.find((model) => model.id === "nlm-form-space-engine").state, "unbound")
  assert.equal(catalog.models.find((model) => model.id === "nlm-fusion").state, "document_proposed")
  assert.equal(catalog.mindex.authority, "proposed")
  assert.equal(catalog.mindex.persistenceState, "unbound")
  assert.equal(catalog.formState.state, "unbound")
  assert.ok(catalog.formState.requiredFields.includes("evidence references"))
  assert.ok(catalog.bindings.some((binding) => binding.id === "earth-simulator" && binding.state === "context_only"))
  assert.ok(catalog.topology.nodes.some((node) => node.id === "myca" && node.state === "context_only"))
  assert.ok(catalog.proposedApis.every((entry) => /^(GET|POST) /.test(entry)))
})

test("browser-local mission areas are bounded, sanitized, and do not claim backend persistence", () => {
  const added = missionAreas.addBrowserMissionArea([], "  Pacific\u0000 Grove  ")
  assert.deepEqual(added, [{ id: "local:pacific-grove", label: "Pacific Grove", persistence: "browser_local" }])
  const roundTrip = missionAreas.parseBrowserMissionAreas(missionAreas.serializeBrowserMissionAreas(added))
  assert.deepEqual(roundTrip, added)
  assert.deepEqual(missionAreas.addBrowserMissionArea(added, "pacific grove"), added)
  assert.deepEqual(missionAreas.parseBrowserMissionAreas("not json"), [])
  assert.deepEqual(missionAreas.normalizeBrowserMissionAreas([
    { id: "remote:untrusted", label: "Remote" },
    { id: "local:<script>", label: "Unsafe ID" },
    { id: "local:ok", label: "Local", persistence: "backend" },
    { id: "local:duplicate-label", label: "local", persistence: "browser_local" },
  ]), [{ id: "local:ok", label: "Local", persistence: "browser_local" }])
  let areas = []
  for (let index = 0; index < 25; index += 1) areas = missionAreas.addBrowserMissionArea(areas, `Area ${index}`)
  assert.equal(areas.length, 20)
})

test("MYCA receives only the typed UNCLASSIFIED context and no execution authority", () => {
  const envelope = myca.buildMycaSituationalContext(context, "2026-09-02T17:44:00.000Z")
  assert.equal(envelope.schema, "fusarium-sa-myca-context/v1")
  assert.equal(envelope.classification, "UNCLASSIFIED")
  assert.deepEqual(envelope.mission, {
    areaId: "area-7",
    areaLabel: "Area 7",
    timeWindow: "72h",
    dataMode: "system",
  })
  assert.equal(envelope.selection.modelId, "nlm-fusion")
  assert.equal(envelope.selection.objectId, "object-7")
  assert.equal(envelope.selection.evidenceId, "evidence-7")
  assert.equal(envelope.selection.view, "earth")
  assert.equal(envelope.authority.execution, "none")
  assert.equal(envelope.authority.reviewRequired, true)
  assert.equal(envelope.authority.auditPersistence, "response_only")
  assert.ok(envelope.prohibitedActions.some((item) => /device command/i.test(item)))

  const normalized = myca.buildMycaSituationalContext({
    ...context,
    selectedModelId: "https://external.example/arbitrary-model",
  })
  assert.equal(normalized.selection.modelId, "nlm-compatibility-status")
})

test("MYCA context rejects non-UNCLASSIFIED or repeated classification instead of relabeling it", () => {
  assert.throws(
    () => myca.buildMycaSituationalContext({ ...context, classification: "SECRET" }),
    /classification must be omitted or exactly UNCLASSIFIED/,
  )
  assert.throws(
    () => myca.buildMycaSituationalContext({
      ...context,
      classification: ["UNCLASSIFIED", "UNCLASSIFIED"],
    }),
    /classification must be omitted or exactly UNCLASSIFIED/,
  )

  const decision = myca.evaluateMycaProposal(
    { ...context, classification: "SECRET" },
    {
      schema: "fusarium-sa-myca-proposal/v1",
      action: "request_analysis",
      rationale: "Attempt to relabel a higher-classified context.",
      externalEffects: false,
      analysisType: "trace_provenance",
    },
  )
  assert.equal(decision.accepted, false)
  assert.equal(decision.executionPerformed, false)
  assert.match(decision.reasons.join(" "), /classification must be omitted or exactly UNCLASSIFIED/)
})

test("MYCA navigation and analysis proposals are review-only and preserve context", () => {
  const navigation = myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "navigate_view",
    rationale: "Compare the same evidence on the timeline.",
    externalEffects: false,
    view: "timeline",
    formSpacePresentation: "interaction",
  })
  assert.equal(navigation.state, "accepted_for_human_review")
  assert.equal(navigation.executionPerformed, false)
  assert.equal(navigation.persistence, "none")
  const href = new URL(navigation.href, "http://local")
  assert.equal(href.searchParams.get("view"), "timeline")
  assert.equal(href.searchParams.get("objectId"), "object-7")
  assert.equal(href.searchParams.get("evidenceId"), "evidence-7")
  assert.equal(href.searchParams.get("modelId"), "nlm-fusion")
  assert.equal(href.searchParams.get("formSpacePresentation"), "interaction")

  const analysis = myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "request_analysis",
    rationale: "Find gaps before drawing a conclusion.",
    externalEffects: false,
    analysisType: "identify_coverage_gaps",
  })
  assert.equal(analysis.accepted, true)
  assert.equal(analysis.href, null)
  assert.match(analysis.preview, /No model call or external action was executed/i)
})

test("MYCA model selection is limited to the catalog and never invokes inference", () => {
  const accepted = myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "select_model",
    rationale: "Compare the fusion model declaration.",
    externalEffects: false,
    targetId: "nlm-fusion",
  })
  assert.equal(accepted.accepted, true)
  assert.match(accepted.preview, /does not invoke inference or training/i)
  assert.equal(new URL(accepted.href, "http://local").searchParams.get("modelId"), "nlm-fusion")

  const rejected = myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "select_model",
    rationale: "Select an arbitrary provider.",
    externalEffects: false,
    targetId: "https://external.example/model",
  })
  assert.equal(rejected.accepted, false)
})

test("MYCA seam rejects execution, release, external send, classification change, and browser control", () => {
  const prohibitedFields = [
    ["deviceCommand", { deviceId: "device-1", command: "start" }],
    ["missionRelease", true],
    ["externalSend", { destination: "remote" }],
    ["classificationChange", "SECRET"],
    ["externalUrl", "https://external.example"],
    ["browserScript", "location.href='https://external.example'"],
  ]
  for (const [field, value] of prohibitedFields) {
    const decision = myca.evaluateMycaProposal(context, {
      schema: "fusarium-sa-myca-proposal/v1",
      action: "request_analysis",
      rationale: "Attempt a prohibited expansion.",
      externalEffects: false,
      analysisType: "trace_provenance",
      [field]: value,
    })
    assert.equal(decision.accepted, false, field)
    assert.equal(decision.executionPerformed, false, field)
    assert.equal(decision.persistence, "none", field)
  }
  assert.equal(myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "request_analysis",
    rationale: "Missing explicit no-effects declaration.",
    analysisType: "trace_provenance",
  }).accepted, false)
  assert.equal(myca.evaluateMycaProposal(context, {
    schema: "fusarium-sa-myca-proposal/v1",
    action: "request_analysis",
    rationale: "Attempt an undeclared action field.",
    externalEffects: false,
    analysisType: "trace_provenance",
    shellCommand: "whoami",
  }).accepted, false)
})

test("same-origin route sources are owner-gated, no-store, bounded, and do not execute proposals", () => {
  const hostRoot = join(sourceDir, "..", "..", "..")
  const formRoute = readFileSync(join(hostRoot, "app", "api", "fusarium", "situational-awareness", "form-space", "route.ts"), "utf8")
  const mycaRoute = readFileSync(join(hostRoot, "app", "api", "fusarium", "situational-awareness", "myca-context", "route.ts"), "utf8")
  assert.match(formRoute, /requireOwner\(\)/)
  assert.match(formRoute, /Cache-Control[^\n]+no-store/)
  assert.doesNotMatch(formRoute, /\bfetch\s*\(/)
  assert.doesNotMatch(formRoute, /export async function POST/)
  assert.match(mycaRoute, /requireOwner\(\)/)
  assert.match(mycaRoute, /MAX_PROPOSAL_BYTES = 24 \* 1024/)
  assert.match(mycaRoute, /createHash\("sha256"\)/)
  assert.match(mycaRoute, /persistence: "none"/)
  assert.doesNotMatch(mycaRoute, /\bfetch\s*\(/)
  assert.doesNotMatch(mycaRoute, /deviceCommand\s*\(/)
  assert.doesNotMatch(mycaRoute, /\b422\b/)
})

test("dashboard source gates the existing Earth renderer behind the Earth view and exposes the workbench", () => {
  const hostRoot = join(sourceDir, "..", "..", "..")
  const dashboard = readFileSync(join(hostRoot, "components", "fusarium", "situational-awareness", "situational-awareness-dashboard.tsx"), "utf8")
  const workbench = readFileSync(join(hostRoot, "components", "fusarium", "situational-awareness", "form-space-workbench.tsx"), "utf8")
  assert.match(dashboard, /context\.view === "earth"/)
  assert.match(dashboard, /<CREPDashboardLoader[\s\S]*?embedded/)
  assert.match(dashboard, /focusLocation=\{focusLocation\}/)
  assert.match(dashboard, /typeof object\.position\.latitude === "number"/)
  assert.match(dashboard, /<FormSpaceWorkbench/)
  assert.match(workbench, /Selection changes the view only; it does not invoke inference or training\./)
  assert.match(workbench, /No action was executed\. This response is not durably persisted\./)
  assert.match(workbench, /Device commands, mission release, external send, classification change/)
})
