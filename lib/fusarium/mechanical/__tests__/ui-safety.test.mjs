import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const component = readFileSync(join(here, "..", "..", "..", "..", "components", "fusarium", "sensing", "mechanical-dashboard.tsx"), "utf8")
const page = readFileSync(join(here, "..", "..", "..", "..", "app", "fusarium", "(dashboard)", "mechanical", "page.tsx"), "utf8")
const fusariumCatalog = readFileSync(join(here, "..", "..", "..", "..", "components", "fusarium", "fusarium-catalog.ts"), "utf8")
const sensesCatalog = readFileSync(join(here, "..", "..", "..", "..", "components", "fusarium", "fusarium-senses.ts"), "utf8")
const toolsCatalog = readFileSync(join(here, "..", "..", "tools-hub", "catalog.ts"), "utf8")
const runtimeCatalog = readFileSync(join(here, "..", "..", "..", "..", "..", "..", "services", "runtime", "fusarium_runtime", "platform_catalog.py"), "utf8")
const applicationDoc = readFileSync(join(here, "..", "..", "..", "..", "..", "..", "docs", "native-applications", "THERMAL_AND_MECHANICAL.md"), "utf8")

test("Tactus keeps the mechanical compatibility route with the approved user-facing name", () => {
  assert.match(component, /<h1>Tactus — Mechanical<\/h1>/)
  assert.match(page, /Tactus — Mechanical \| Fusarium/)
  assert.match(page, /description: "Tactus — Mechanical:/)
  assert.match(fusariumCatalog, /s\("mechanical", "Tactus — Mechanical"\)/)
  assert.match(sensesCatalog, /tool: "Tactus — Mechanical"/)
  assert.match(sensesCatalog, /href: "\/fusarium\/mechanical"/)
  assert.match(toolsCatalog, /id: "mechanical", name: "Tactus — Mechanical"/)
  assert.match(toolsCatalog, /href: "\/fusarium\/mechanical"/)
  assert.match(component, /data-fusarium-app="mechanical"/)
  assert.match(page, /FusariumMechanicalPage/)
  assert.match(page, /<MechanicalDashboard \/>/)
  assert.match(runtimeCatalog, /"id": "mechanical",\s+"title": "Tactus — Mechanical"/)
  assert.match(applicationDoc, /^# Thermal Field Laboratory and Tactus — Mechanical$/m)
  assert.match(applicationDoc, /^## Tactus — Mechanical$/m)
  assert.match(applicationDoc, /\*\*Compatibility route:\*\* `\/fusarium\/mechanical`/)
  assert.doesNotMatch([component, page, fusariumCatalog, sensesCatalog, toolsCatalog, runtimeCatalog, applicationDoc].join("\n"), /Mechanical Interaction Workbench|MYCA Haptic Embodiment/)
})

test("mechanical UI carries shared sensing scope without changing its route", () => {
  assert.match(component, /ConnectedSensingScopeSelector compact defaultOpen=\{false\}/)
  assert.match(component, /data-sensing-scope=\{scope\.kind\}/)
  assert.match(component, /sensingScopeContainsDevice\(scope, sequence\.deviceId\)/)
  assert.match(component, /this warning does not bind it to a device or treat it as live telemetry/i)
})

test("motion stays disabled and fake telemetry is explicitly withheld", () => {
  assert.match(component, /Flex motion locked/)
  assert.match(component, /<button type="button" disabled>Flex motion locked<\/button>/)
  assert.match(component, /No zeros or default coordinates are displayed/)
  assert.doesNotMatch(component, /send_(?:angle|angles|coord|coords)\s*\(/i)
  assert.doesNotMatch(component, /power_(?:on|off)\s*\(/i)
  assert.doesNotMatch(component, /\/dev\/ttyUSB0|\b115200\b/)
})
