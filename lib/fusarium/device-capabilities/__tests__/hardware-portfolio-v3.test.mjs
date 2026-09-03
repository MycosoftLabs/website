import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "hardware-portfolio-v3.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-hardware-portfolio-"))
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
writeFileSync(join(compiledDir, "hardware-portfolio-v3.mjs"), compiled)
const portfolio = await import(pathToFileURL(join(compiledDir, "hardware-portfolio-v3.mjs")).href)
test.after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("publishes a versioned, internally valid UNCLASSIFIED portfolio contract", () => {
  assert.equal(portfolio.HARDWARE_PORTFOLIO_V1.schema, "fusarium-hardware-portfolio/v1")
  assert.equal(portfolio.HARDWARE_PORTFOLIO_V1.version, "3.0-source-contract.3")
  assert.equal(portfolio.HARDWARE_PORTFOLIO_V1.classification, "UNCLASSIFIED")
  assert.deepEqual(portfolio.validateHardwarePortfolioV1(), [])
})

test("keeps commercial confidentiality separate from national-security classification", () => {
  assert.equal(portfolio.HARDWARE_PORTFOLIO_V1.commercialConfidentiality, "MYCOSOFT_CONFIDENTIAL")
  assert.equal(portfolio.HARDWARE_PORTFOLIO_V1.nationalSecurityClassification, "UNCLASSIFIED")
  assert.notEqual(
    portfolio.HARDWARE_PORTFOLIO_V1.commercialConfidentiality,
    portfolio.HARDWARE_PORTFOLIO_V1.nationalSecurityClassification,
  )
})

test("pins the reviewed source digest and rejects silent revision drift", () => {
  assert.equal(portfolio.HARDWARE_PORTFOLIO_SOURCE.sha256, "b18a1b66f9ddb4cf04605206e7e737d3af404e0ead41c4db5a1bc1f6c0ce5a06")
  const staleVersion = { ...portfolio.HARDWARE_PORTFOLIO_V1, version: "3.0-source-contract.2" }
  assert.match(portfolio.validateHardwarePortfolioV1(staleVersion).join(" "), /contract version mismatch/i)
  const changedSource = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    source: { ...portfolio.HARDWARE_PORTFOLIO_V1.source, sha256: "0".repeat(64) },
  }
  assert.match(portfolio.validateHardwarePortfolioV1(changedSource).join(" "), /source revision mismatch/i)
})

test("covers every device family named by the source portfolio", () => {
  assert.deepEqual(
    portfolio.HARDWARE_PORTFOLIO_V1.devices.map((device) => device.id).sort(),
    ["agaric", "alarm", "hyphae-1", "mushroom-1", "mushroom-2", "mycobrain", "myconode", "petraeus", "psathyrella", "sporebase", "tricorder"].sort(),
  )
  assert.equal(portfolio.hardwarePortfolioDevice("psathyrella")?.label, "Psathyrella")
  assert.equal(portfolio.hardwarePortfolioDevice("hyphae-1")?.label, "Hyphae 1")
})

test("never converts portfolio declarations into installed-device evidence", () => {
  for (const device of portfolio.HARDWARE_PORTFOLIO_V1.devices) {
    assert.equal(device.portfolioStatusEvidence, "source-document-claim")
    assert.ok(device.components.length > 0)
    assert.ok(device.components.every((claim) => claim.installationEvidence === "not-observed"))
  }
})

test("exposes upgrade candidates without claiming that they are installed", () => {
  const mycobrainCandidates = portfolio.hardwarePortfolioUpgradeCandidates("mycobrain")
  assert.ok(mycobrainCandidates.some((claim) => claim.id === "compute.future-board-revisions" && claim.claimState === "future"))
  assert.ok(mycobrainCandidates.every((claim) => claim.installationEvidence === "not-observed"))
  assert.match(portfolio.HARDWARE_PORTFOLIO_V1.upgradeStateRule, /never become an installed configuration/i)
})

test("keeps current and proposed Agaric propulsion separate", () => {
  const agaric = portfolio.hardwarePortfolioDevice("agaric")
  assert.ok(agaric)
  assert.equal(agaric.components.find((claim) => claim.id === "controller.flight")?.claimState, "unknown")
  assert.equal(agaric.components.find((claim) => claim.id === "controller.esc")?.claimState, "unknown")
  assert.equal(agaric.components.find((claim) => claim.id === "mechanical.coaxial-propulsion")?.claimState, "proposed")
  assert.match(agaric.unresolved.join(" "), /current flight controller/i)
})

test("keeps Psathyrella and Mushroom compute SKUs unresolved by configuration", () => {
  const psathyrella = portfolio.hardwarePortfolioDevice("psathyrella")
  const mushroom = portfolio.hardwarePortfolioDevice("mushroom-1")
  assert.equal(psathyrella.components.find((claim) => claim.id === "compute.edge")?.claimState, "variant-dependent")
  assert.equal(mushroom.components.find((claim) => claim.id === "compute.edge")?.claimState, "variant-dependent")
  assert.match(psathyrella.unresolved.join(" "), /compute SKU/i)
  assert.match(mushroom.unresolved.join(" "), /Jetson Orin Nano versus Blackwell/i)
})

test("preserves optional and delayed-evidence SporeBase boundaries", () => {
  const sporebase = portfolio.hardwarePortfolioDevice("sporebase")
  assert.equal(sporebase.components.find((claim) => claim.id === "sensor.bmv080")?.claimState, "declared-optional")
  assert.match(sporebase.components.find((claim) => claim.id === "mechanical.tape-cassette")?.note ?? "", /laboratory identifications are delayed evidence/i)
})

test("does not expand unresolved MDP or MMP names into false protocol authority", () => {
  const mdp = portfolio.PORTFOLIO_PROTOCOL_REFERENCES_V1.find((item) => item.id === "mdp")
  const mmp = portfolio.PORTFOLIO_PROTOCOL_REFERENCES_V1.find((item) => item.id === "mmp")
  assert.equal(mdp.expandedName, null)
  assert.equal(mmp.expandedName, null)
  assert.equal(mdp.claimState, "naming-unresolved")
  assert.equal(mmp.claimState, "naming-unresolved")
  assert.ok(portfolio.PORTFOLIO_PROTOCOL_REFERENCES_V1.every((item) => item.authority === "portfolio-reference-only"))
})

test("types every named system and integration as a non-deployed source claim", () => {
  assert.deepEqual(
    portfolio.PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1.map((item) => item.id).sort(),
    ["http-s", "mas", "mindex", "modbus", "mqtt", "myca", "natureos", "ntp", "ota", "ptp", "rest"].sort(),
  )
  assert.ok(portfolio.PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1.every((item) => item.claimEvidence === "source-document-claim"))
  assert.ok(portfolio.PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1.every((item) => item.deploymentEvidence === "not-observed"))
  assert.ok(portfolio.PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1.every((item) => item.authority === "portfolio-reference-only"))
  assert.equal(portfolio.PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1.find((item) => item.id === "http-s")?.label, "HTTP(S)")
})

test("publishes an exact-id consumer contract for Device Manager, DIRTNet, MDP, and MMP", () => {
  const binding = portfolio.HARDWARE_PORTFOLIO_V1.consumerBinding
  assert.equal(binding.schema, "fusarium-hardware-portfolio-consumer/v1")
  assert.deepEqual(binding.compatibleConsumers, ["device-manager", "dirtnet", "mdp", "mmp"])
  assert.equal(binding.familyBinding.match, "exact-canonical-id-only")
  assert.equal(binding.familyBinding.inferFromDisplayName, false)
  assert.equal(binding.familyBinding.inferFromDeviceType, false)
  assert.equal(binding.familyBinding.inferFromCapabilities, false)
  assert.equal(binding.authority, "portfolio-reference-only")
  assert.equal(binding.mutationAuthority, false)
})

test("builds versioned consumer views only from exact canonical family ids", () => {
  const view = portfolio.hardwarePortfolioConsumerView("hyphae-1")
  assert.ok(view)
  assert.equal(view.portfolioFamilyId, "hyphae-1")
  assert.equal(view.revision.contractVersion, "3.0-source-contract.3")
  assert.equal(view.revision.sourceSha256, portfolio.HARDWARE_PORTFOLIO_SOURCE.sha256)
  assert.ok(view.sensorCapabilities.some((claim) => claim.capabilityId === "wifi-sense"))
  assert.ok(view.computeTopologyNodes.some((node) => node.family === "mycobrain"))
  assert.equal(portfolio.hardwarePortfolioConsumerView("Hyphae 1"), null)
  assert.equal(portfolio.hardwarePortfolioConsumerView("hyphae"), null)
  assert.equal(portfolio.hardwarePortfolioConsumerView("fixed edge data center"), null)
})

test("normalizes every sensor component without claiming an installed sensor or adapter", () => {
  const sensorComponentKeys = portfolio.HARDWARE_PORTFOLIO_V1.devices.flatMap((device) =>
    device.components.filter((claim) => claim.category === "sensor").map((claim) => `${device.id}/${claim.id}`),
  )
  const coveredKeys = new Set(portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.map((claim) => `${claim.deviceId}/${claim.componentRef}`))
  assert.ok(sensorComponentKeys.every((key) => coveredKeys.has(key)))
  assert.ok(portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.every((claim) => claim.installationEvidence === "not-observed"))
  assert.ok(portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.every((claim) => claim.adapterEvidence === "unbound"))
  assert.ok(portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.every((claim) => claim.authority === "portfolio-reference-only"))

  const sporebaseParticle = portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.find((claim) => claim.id === "sporebase/sensor.bmv080/particulate")
  assert.equal(sporebaseParticle?.claimState, "declared-optional")
  const passiveHydrophone = portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.find((claim) => claim.id === "psathyrella/sensor.hydrophone/acoustic-underwater-passive")
  assert.equal(passiveHydrophone?.claimState, "declared-baseline")
})

test("models MycoBrain dual processors and edge-compute pairings as non-deployed topology", () => {
  const nodes = portfolio.HARDWARE_PORTFOLIO_V1.computeTopologyNodes
  const edges = portfolio.HARDWARE_PORTFOLIO_V1.computeTopologyEdges
  assert.ok(nodes.some((node) => node.id === "mycobrain/esp32-side-a" && node.role === "Sensor acquisition and I/O"))
  assert.ok(nodes.some((node) => node.id === "mycobrain/esp32-side-b" && node.role === "LoRa mesh routing"))
  assert.ok(edges.some((edge) => edge.id === "mycobrain/side-a-uart-side-b" && edge.relation === "uart-bridge"))
  for (const deviceId of ["mushroom-1", "sporebase", "hyphae-1", "agaric", "psathyrella"]) {
    assert.ok(edges.some((edge) => edge.deviceId === deviceId && edge.relation === "paired-with"))
  }
  assert.ok(nodes.every((node) => node.installationEvidence === "not-observed"))
  assert.ok(edges.every((edge) => edge.installationEvidence === "not-observed"))
})

test("keeps the Agaric flight-controller and ESC path unresolved and model-free", () => {
  const view = portfolio.hardwarePortfolioConsumerView("agaric")
  const flight = view.computeTopologyNodes.find((node) => node.family === "flight-controller")
  const esc = view.computeTopologyNodes.find((node) => node.family === "esc")
  assert.equal(flight.claimState, "unknown")
  assert.equal(flight.model, null)
  assert.equal(esc.claimState, "unknown")
  assert.equal(esc.model, null)
  assert.equal(view.computeTopologyEdges.filter((edge) => edge.relation === "unresolved-control-path").length, 2)
  assert.ok(view.computeTopologyEdges.filter((edge) => edge.relation === "unresolved-control-path").every((edge) => edge.authority === "portfolio-reference-only"))
})

test("rejects consumer, sensor, or compute projections that promote planning claims", () => {
  const invalidConsumer = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    consumerBinding: { ...portfolio.HARDWARE_PORTFOLIO_V1.consumerBinding, mutationAuthority: true },
  }
  assert.match(portfolio.validateHardwarePortfolioV1(invalidConsumer).join(" "), /cannot grant mutation authority/i)

  const invalidSensor = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    sensorCapabilities: [
      { ...portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities[0], adapterEvidence: "available" },
      ...portfolio.HARDWARE_PORTFOLIO_V1.sensorCapabilities.slice(1),
    ],
  }
  assert.match(portfolio.validateHardwarePortfolioV1(invalidSensor).join(" "), /cannot claim installation or adapter binding/i)

  const invalidCompute = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    computeTopologyEdges: [
      { ...portfolio.HARDWARE_PORTFOLIO_V1.computeTopologyEdges[0], installationEvidence: "observed" },
      ...portfolio.HARDWARE_PORTFOLIO_V1.computeTopologyEdges.slice(1),
    ],
  }
  assert.match(portfolio.validateHardwarePortfolioV1(invalidCompute).join(" "), /compute topology edge cannot claim deployment/i)
})

test("models DIRTNet and fleet topology without asserting a deployed graph", () => {
  const edges = portfolio.PORTFOLIO_TOPOLOGY_EDGES_V1
  assert.ok(edges.some((edge) => edge.scope === "dirtnet" && edge.from.id === "hyphae-1" && edge.to.id === "dirtnet"))
  assert.ok(edges.some((edge) => edge.scope === "fleet" && edge.from.id === "mycobrain" && edge.relation === "shared-compute-fabric-for"))
  assert.ok(edges.some((edge) => edge.scope === "fleet" && edge.from.id === "agaric" && edge.to.id === "psathyrella"))
  assert.ok(edges.every((edge) => edge.claimEvidence === "source-document-claim"))
  assert.ok(edges.every((edge) => edge.deploymentEvidence === "not-observed"))
  assert.ok(edges.every((edge) => edge.authority === "portfolio-reference-only"))
})

test("rejects topology or integration records that claim deployment", () => {
  const invalidTopology = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    topologyEdges: [
      { ...portfolio.HARDWARE_PORTFOLIO_V1.topologyEdges[0], deploymentEvidence: "observed" },
    ],
  }
  assert.match(portfolio.validateHardwarePortfolioV1(invalidTopology).join(" "), /topology edge cannot claim deployment/i)

  const invalidIntegration = {
    ...portfolio.HARDWARE_PORTFOLIO_V1,
    systemIntegrationReferences: [
      { ...portfolio.HARDWARE_PORTFOLIO_V1.systemIntegrationReferences[0], deploymentEvidence: "observed" },
    ],
  }
  assert.match(portfolio.validateHardwarePortfolioV1(invalidIntegration).join(" "), /system\/integration reference cannot claim deployment/i)
})

test("the portfolio contract remains data-only with no service or device action seam", () => {
  assert.doesNotMatch(source, /\b(?:fetch|WebSocket|EventSource|setInterval|setTimeout)\s*\(/)
  assert.doesNotMatch(source, /(?:child_process|navigator\.|process\.env|method:\s*["'](?:POST|PUT|PATCH|DELETE))/)
  assert.doesNotMatch(source, /(?:serialPort|mqtt\.connect|firmwareUpdate|dispatchCommand)\s*\(/i)
})

test("models BlueSight as a composable stack rather than a device or installed payload", () => {
  assert.equal(portfolio.hardwarePortfolioDevice("bluesight"), null)
  assert.equal(portfolio.SHARED_BLUESIGHT_STACK_V1.kind, "shared-sensing-stack")
  assert.match(portfolio.SHARED_BLUESIGHT_STACK_V1.rule, /never proves/i)
  assert.ok(portfolio.SHARED_BLUESIGHT_STACK_V1.proposedCoreAdditions.includes("GNSS/GPS"))
})

test("keeps pre-production biological hardware in proposed or future states", () => {
  for (const deviceId of ["tricorder", "petraeus", "mushroom-2"]) {
    const device = portfolio.hardwarePortfolioDevice(deviceId)
    assert.ok(device)
    assert.ok(device.components.every((claim) => ["declared-optional", "variant-dependent", "proposed", "future", "unknown"].includes(claim.claimState)))
  }
})
