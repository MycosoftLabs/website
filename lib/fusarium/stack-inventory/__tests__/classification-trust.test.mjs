import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const testDir = fileURLToPath(new URL(".", import.meta.url))
const sourcePath = fileURLToPath(
  new URL("../../../../components/fusarium/fusarium-classification.tsx", import.meta.url),
)
const source = readFileSync(sourcePath, "utf8")
const compiledDir = mkdtempSync(join(testDir, ".classification-trust-"))
const compiledPath = join(compiledDir, "fusarium-classification.mjs")

const output = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText

writeFileSync(compiledPath, output)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const classification = await import(pathToFileURL(compiledPath))

test("classification capability model exposes all tiers but only U is active", () => {
  assert.deepEqual(
    classification.CLASSIFICATIONS.map(({ id, short, restricted }) => ({ id, short, restricted })),
    [
      { id: "U", short: "U", restricted: false },
      { id: "CUI", short: "CUI", restricted: true },
      { id: "SECRET", short: "SECRET", restricted: true },
      { id: "TS_SCI", short: "TS/SCI", restricted: true },
    ],
  )
  assert.equal(
    classification.classificationById("U").banner,
    "UNCLASSIFIED // COMMERCIAL // MYCOSOFT_INC",
  )

  const markup = renderToStaticMarkup(
    React.createElement(
      classification.ClassificationProvider,
      null,
      React.createElement(classification.ClassificationFloorControl),
    ),
  )
  const buttons = [...markup.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag)

  assert.equal(buttons.length, 4)
  assert.match(markup, /aria-describedby="classification-capability-guardrail"/)
  assert.match(markup, /This commercial host is not accredited for classified processing/)
  assert.match(buttons[0], /data-level="U"/)
  assert.match(buttons[0], /aria-pressed="true"/)
  assert.doesNotMatch(buttons[0], /\sdisabled(?:=|\s|>)/)

  for (const [index, id] of ["CUI", "SECRET", "TS_SCI"].entries()) {
    const button = buttons[index + 1]
    assert.match(button, new RegExp(`data-level="${id}"`))
    assert.match(button, /aria-pressed="false"/)
    assert.match(button, /\sdisabled=""/)
    assert.match(button, /not accredited/)
  }
})

test("classification context fails closed without server evidence", () => {
  function Probe() {
    const context = classification.useClassification()
    context.setLevel("TS_SCI")
    return React.createElement("output", {
      "data-level": context.level.id,
      "data-authorized": String(context.authorized),
      "data-auth-resolved": String(context.authResolved),
    })
  }

  const markup = renderToStaticMarkup(
    React.createElement(classification.ClassificationProvider, null, React.createElement(Probe)),
  )

  assert.match(markup, /data-level="U"/)
  assert.match(markup, /data-authorized="false"/)
  assert.match(markup, /data-auth-resolved="false"/)
  assert.equal(renderToStaticMarkup(React.createElement(classification.ClassificationNotice)), "")
})

test("classification source permits only owner local-dev simulation while server authority stays fail-closed", () => {
  const forbidden = [
    "local" + "Storage",
    "session" + "Storage",
    "use" + "Auth",
    "OWNER_" + "ALLOWED_EMAILS",
    "use" + "SearchParams",
    "search" + "Params",
    "document" + ".cookie",
  ]

  for (const token of forbidden) assert.equal(source.includes(token), false, token)
  assert.match(source, /payload\?\.user\?\.localDev === true/)
  assert.match(source, /payload\?\.user\?\.role === "owner"/)
  assert.match(source, /DEVELOPMENT SIMULATION ONLY \/\/ NO CLASSIFIED DATA/)
  assert.match(source, /authorized: false/)
  assert.match(source, /const locked = classification\.restricted && !canSimulate/)
  assert.match(source, /disabled=\{locked\}/)
  assert.match(source, /: runtimeLevel/)
})
