import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")
const executableSource = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")

test("the Fusarium GCS route mounts a passive selector instead of a second Psathyrella controller", () => {
  const route = read("app", "fusarium", "(dashboard)", "gcs", "page.tsx")
  const selector = read("components", "fusarium", "gcs", "GlobalControlSystemSelector.tsx")
  const reachableSource = executableSource(`${route}\n${selector}`)

  assert.match(route, /components\/fusarium\/gcs\/GlobalControlSystemSelector/)
  assert.match(selector, /PsathyrellaControllerPresentation/)
  assert.match(selector, /profileId === "psathyrella"/)
  assert.match(selector, /<VehicleProfileConsole profileId=\{profileId\}/)
  assert.doesNotMatch(reachableSource, /PsathyrellaConsole|useBuoyTelemetry|useControlSession|sendCommand/)
  assert.doesNotMatch(reachableSource, /@\/components\/psathyrella|@\/lib\/psathyrella/)
})

test("the Psathyrella profile is presentation-only and deep-links without prefetch or embedding", () => {
  const presentation = read("components", "fusarium", "gcs", "PsathyrellaControllerPresentation.tsx")
  const executable = executableSource(presentation)

  assert.match(presentation, /PSATHYRELLA_CONTROLLER_PATH = "\/natureos\/psathyrella"/)
  assert.match(presentation, /data-gcs-surface="presentation-only"/)
  assert.match(presentation, /Presentation only/)
  assert.match(presentation, /Presentation is not actuation/)
  assert.match(presentation, /Opening the protected controller is navigation only/)
  assert.match(presentation, /href=\{PSATHYRELLA_CONTROLLER_PATH\}/)
  assert.match(presentation, /target="_blank"/)
  assert.match(presentation, /rel="noopener noreferrer"/)
  assert.match(presentation, /Same-origin owner-gated route · opens in a new tab · no prefetch/)
  assert.doesNotMatch(executable, /<iframe|fetch\(|PsathyrellaConsole|useBuoyTelemetry|useControlSession|sendCommand/)
  assert.doesNotMatch(executable, /\/api\/fusarium\/gcs/)
})

test("both the Fusarium presentation and protected Psathyrella target retain server-side owner gates", () => {
  const layout = read("app", "fusarium", "(dashboard)", "layout.tsx")
  const routes = read("lib", "access", "routes.ts")

  assert.match(layout, /const auth = await requireOwner\(\)/)
  assert.match(layout, /redirect\("\/login\?redirectTo=%2Ffusarium"\)/)
  assert.match(routes, /\{ path: '\/natureos\/psathyrella',[\s\S]*features: \['owner-only'\]/)
  assert.match(routes, /\{ path: '\/fusarium',[\s\S]*features: \['owner-only'\]/)
  assert.match(routes, /export function pathRequiresOwner/)
})

test("Psathyrella, Agaric, and Mushroom 1 remain the three explicit profiles", () => {
  const profiles = read("lib", "fusarium", "gcs", "device-profiles.ts")
  const profileRows = profiles.slice(profiles.indexOf("= ["), profiles.indexOf("] as const"))

  assert.match(profiles, /displayName: "Psathyrella"/)
  assert.match(profiles, /displayName: "Agaric"/)
  assert.match(profiles, /displayName: "Mushroom 1"/)
  assert.equal((profileRows.match(/\{\s*id: "(?:psathyrella|agaric|mushroom-1)"/g) ?? []).length, 3)
  assert.equal((profileRows.match(/adapterState: "presentation-only"/g) ?? []).length, 1)
  assert.equal((profileRows.match(/adapterState: "unbound"/g) ?? []).length, 2)
  assert.equal((profileRows.match(/telemetryEndpoint: null/g) ?? []).length, 3)
  assert.equal((profileRows.match(/commandEndpoint: null/g) ?? []).length, 3)
  assert.equal((profileRows.match(/commandAuthority: "none"/g) ?? []).length, 3)
  assert.match(profileRows, /id: "psathyrella"[\s\S]*presentationRoute: "\/natureos\/psathyrella"/)
})

test("query selection preserves all three vehicle profiles and fails closed to Psathyrella presentation", () => {
  const selector = read("components", "fusarium", "gcs", "GlobalControlSystemSelector.tsx")
  assert.match(selector, /candidate === "agaric" \|\| candidate === "mushroom-1" \|\| candidate === "psathyrella"/)
  assert.match(selector, /\? candidate : "psathyrella"/)
  assert.match(selector, /url\.searchParams\.set\("vehicle", next\)/)
  assert.match(read("components", "fusarium", "gcs", "PsathyrellaControllerPresentation.tsx"), /GLOBAL_CONTROL_DEVICE_PROFILES\.map/)
  assert.match(read("components", "fusarium", "gcs", "VehicleProfileConsole.tsx"), /GLOBAL_CONTROL_DEVICE_PROFILES\.map/)
})

test("the mounted Agaric and Mushroom 1 profiles retain vehicle-specific flight and gait interfaces", () => {
  const consoleSource = read("components", "fusarium", "gcs", "VehicleProfileConsole.tsx")
  const profiles = read("lib", "fusarium", "gcs", "device-profiles.ts")
  const controls = read("components", "fusarium", "gcs", "panels", "VehicleControlPanel.tsx")
  const viewport = read("components", "fusarium", "gcs", "VehicleCenterViewport.tsx")
  const status = read("components", "fusarium", "gcs", "panels", "VehicleStatusBar.tsx")

  assert.match(consoleSource, /Global Control System/)
  assert.match(consoleSource, /Back to Fusarium/)
  assert.match(profiles, /vehicleLabel: "Flying drone"/)
  assert.match(profiles, /operationLabel: "Flight"/)
  assert.match(profiles, /Altitude AGL/)
  assert.match(profiles, /vehicleLabel: "Walking drone"/)
  assert.match(profiles, /operationLabel: "Gait"/)
  assert.match(profiles, /Body clearance/)
  assert.match(profiles, /Step height/)
  assert.match(controls, /profile\.axes\.map/)
  assert.match(viewport, /profile\.kind === "flying"/)
  assert.match(status, /profile\.statusFields/)
})

test("Agaric and Mushroom 1 cannot issue commands while their adapters are unbound", () => {
  const consoleSource = executableSource(read("components", "fusarium", "gcs", "VehicleProfileConsole.tsx"))
  const controls = executableSource(read("components", "fusarium", "gcs", "panels", "VehicleControlPanel.tsx"))
  const viewport = executableSource(read("components", "fusarium", "gcs", "VehicleCenterViewport.tsx"))

  assert.doesNotMatch(consoleSource, /useBuoyTelemetry|useControlSession|sendCommand|fetch\(/)
  assert.doesNotMatch(controls, /sendCommand|fetch\(/)
  assert.doesNotMatch(viewport, /sendCommand|fetch\(/)
  assert.match(consoleSource, /Command authority[\s\S]*None/)
  assert.match(controls, /disabled/)
})

test("every Fusarium GCS API method remains owner-gated, unbound, and body-blind", () => {
  const route = read("app", "api", "fusarium", "gcs", "[[...path]]", "route.ts")

  assert.match(route, /const auth = await requireOwner\(\)/)
  assert.match(route, /status: 503/)
  assert.match(route, /state: "unbound"/)
  assert.match(route, /bound: false/)
  assert.match(route, /presentationOnly: true/)
  assert.match(route, /actuation: "unbound"/)
  assert.match(route, /accepted: false/)
  assert.match(route, /persisted: false/)
  assert.match(route, /forwarded: false/)
  assert.match(route, /protectedControllerPath: "\/natureos\/psathyrella"/)
  assert.doesNotMatch(route, /request\.json|request\.text|\.body/)
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    assert.match(route, new RegExp(`export async function ${method}\\([\\s\\S]*?return unbound\\(context\\)`))
  }
})

test("Fusarium display preferences remain outside the protected station namespace", () => {
  const display = read("lib", "fusarium", "gcs", "useDisplayMode.ts")
  assert.match(display, /fusarium\.gcs\.display\.theme/)
  assert.match(display, /fusarium\.gcs\.display\.field/)
  assert.doesNotMatch(display, /psathyrella\.display/)
})

test("the dedicated Psathyrella application remains in its protected original namespace", () => {
  const page = read("app", "natureos", "psathyrella", "page.tsx")
  const consoleSource = read("components", "psathyrella", "PsathyrellaConsole.tsx")
  const contract = read("lib", "psathyrella", "contract.ts")

  assert.match(page, /components\/psathyrella\/PsathyrellaConsole/)
  assert.match(consoleSource, /export function PsathyrellaConsole/)
  assert.match(contract, /\/api\/psathyrella\/telemetry/)
  assert.doesNotMatch(page, /components\/fusarium\/gcs/)
  assert.doesNotMatch(consoleSource, /@\/components\/fusarium|@\/lib\/fusarium/)
})
