import assert from "node:assert/strict"
import test, { after } from "node:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-tools-links-"))
const source = readFileSync(new URL("../deep-links.ts", import.meta.url), "utf8")
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const compiled = join(compiledDir, "deep-links.mjs")
writeFileSync(compiled, output)
const { buildToolsHubLink, toolsHubContextParams } = await import(pathToFileURL(compiled).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("mission, time, evidence, source, and device scope survive a Tools Hub handoff", () => {
  const input = new URLSearchParams({
    contextId: "context-river",
    missionId: "mission-river",
    missionAreaId: "area-delta",
    missionAreaLabel: "Delta",
    timeWindow: "72h",
    start: "2026-09-01T18:00:00-07:00",
    end: "2026-09-01T19:00:00-07:00",
    mode: "replay",
    dataMode: "replay",
    evidenceId: "evidence-7",
    sourceId: "source-3",
    objectId: "object-4",
    objectType: "environmental-object",
    deviceId: "device-a",
  })
  input.append("deviceId", "device-b")
  const url = new URL(buildToolsHubLink("/fusarium/tools/incident-timeline", input), "http://local")

  assert.equal(url.pathname, "/fusarium/tools/incident-timeline")
  assert.equal(url.searchParams.get("missionId"), "mission-river")
  assert.equal(url.searchParams.get("timeWindow"), "72h")
  assert.equal(url.searchParams.get("evidenceId"), "evidence-7")
  assert.equal(url.searchParams.get("sourceId"), "source-3")
  assert.deepEqual(url.searchParams.getAll("deviceId"), ["device-a", "device-b"])
  assert.equal(url.searchParams.get("classification"), "UNCLASSIFIED")
})

test("credentials, arbitrary URLs, invalid time, and client authority are never propagated", () => {
  const input = new URLSearchParams({
    missionId: "mission-safe",
    token: "secret",
    authorization: "Bearer hidden",
    endpoint: "https://example.test/private",
    operatorRole: "admin",
    classification: "UNCLASSIFIED",
    start: "not-a-time",
    end: "2026-09-01T19:00:00Z",
  })
  const out = toolsHubContextParams(input)
  assert.equal(out.get("missionId"), "mission-safe")
  assert.equal(out.get("classification"), "UNCLASSIFIED")
  for (const key of ["token", "authorization", "endpoint", "operatorRole", "start", "end"]) assert.equal(out.has(key), false)
})

test("explicit higher classifications fail closed without automatic relabeling or context propagation", () => {
  for (const classification of ["CUI", "SECRET", "TS/SCI"]) {
    const out = toolsHubContextParams(new URLSearchParams({ classification, missionId: "mission-sensitive", evidenceId: "evidence-sensitive", deviceId: "device-sensitive" }))
    assert.equal(out.toString(), "", classification)
    assert.equal(buildToolsHubLink("/fusarium/tools/incident-timeline", new URLSearchParams({ classification, missionId: "mission-sensitive" })), "/fusarium/tools/incident-timeline", classification)
  }
})

test("every repeated classification value must remain explicitly UNCLASSIFIED", () => {
  const mixed = new URLSearchParams({ classification: "UNCLASSIFIED", missionId: "mission-sensitive" })
  mixed.append("classification", "SECRET")
  assert.equal(toolsHubContextParams(mixed).toString(), "")
  assert.equal(buildToolsHubLink("/fusarium/tools/incident-timeline", mixed), "/fusarium/tools/incident-timeline")

  const consistent = new URLSearchParams({ classification: "UNCLASSIFIED", missionId: "mission-safe" })
  consistent.append("classification", "unclassified")
  assert.equal(toolsHubContextParams(consistent).get("missionId"), "mission-safe")
})

test("an unscoped directory link remains clean", () => {
  assert.equal(buildToolsHubLink("/fusarium/aerosol", "query=ignored"), "/fusarium/aerosol")
})
