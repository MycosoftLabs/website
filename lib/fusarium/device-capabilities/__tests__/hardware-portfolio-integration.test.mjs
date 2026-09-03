import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../../..")
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8")

test("the hardware portfolio is exposed only through an owner-gated read route", () => {
  const route = read("app", "api", "fusarium", "hardware-portfolio", "route.ts")
  const gate = route.indexOf("const auth = await requireOwner()")
  const validation = route.indexOf("const validationIssues = validateHardwarePortfolioV1()")
  const consumerLookup = route.indexOf("hardwarePortfolioConsumerView(requestedFamilyId)")
  assert.ok(gate >= 0 && validation > gate && consumerLookup > validation)
  assert.match(route, /export async function GET\(request: NextRequest\)/)
  assert.doesNotMatch(route, /export async function (?:POST|PUT|PATCH|DELETE)/)
  assert.match(route, /mutationAuthority: false/)
  assert.match(route, /registry-or-device-specific-evidence/)
  assert.match(route, /portfolioFamilyId/)
  assert.match(route, /inferenceAttempted: false/)
  assert.match(route, /consumerContract: HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1/)
  assert.match(route, /consumerView/)
})

test("DirtNet Operations presents the hardware reference without replacing observed inventory", () => {
  const page = read("app", "fusarium", "(dashboard)", "devices", "page.tsx")
  const panel = read("components", "fusarium", "platform-operations", "hardware-portfolio-reference.tsx")
  assert.match(page, /HardwarePortfolioReference/)
  assert.match(panel, /\/api\/fusarium\/hardware-portfolio/)
  assert.match(panel, /never claims that a component is installed or online/i)
  assert.match(panel, /Declared reference · not observed/)
  assert.match(panel, /Portfolio claim only/)
  assert.match(panel, /Commercial handling/)
  assert.match(panel, /National-security class/)
  assert.match(panel, /DIRTNet and fleet topology claims/)
  assert.match(panel, /System and integration references/)
  assert.match(panel, /Source claim · deployment not observed/)
  assert.match(panel, /Reference consumption boundary/)
  assert.match(panel, /exact canonical/)
  assert.match(panel, /Names, device types, and capability lists never infer a family/)
  assert.match(panel, /Normalized sensor capabilities/)
  assert.match(panel, /installation not observed, and adapter unbound/)
  assert.match(panel, /Compute and control topology/)
  assert.match(panel, /establish no deployed service, transport, credentials, synchronization, update path, or command authority/i)
  assert.doesNotMatch(panel, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/)
})

test("the API portfolio payload carries separated handling and typed source-reference collections", () => {
  const contract = read("lib", "fusarium", "device-capabilities", "hardware-portfolio-v3.ts")
  assert.match(contract, /commercialConfidentiality:/)
  assert.match(contract, /nationalSecurityClassification:/)
  assert.match(contract, /topologyEdges:\s*PORTFOLIO_TOPOLOGY_EDGES_V1/)
  assert.match(contract, /systemIntegrationReferences:\s*PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1/)
  assert.match(contract, /sensorCapabilities:\s*PORTFOLIO_SENSOR_CAPABILITIES_V1/)
  assert.match(contract, /computeTopologyNodes:\s*PORTFOLIO_COMPUTE_TOPOLOGY_NODES_V1/)
  assert.match(contract, /computeTopologyEdges:\s*PORTFOLIO_COMPUTE_TOPOLOGY_EDGES_V1/)
  assert.match(contract, /consumerBinding:\s*HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1/)
  assert.match(contract, /deploymentEvidence:\s*"not-observed"/)
  assert.match(contract, /adapterEvidence:\s*"unbound"/)
  assert.doesNotMatch(contract, /expandedName:\s*"(?:Mycosoft Device Protocol|Mycosoft Mission Protocol|Mesh Device Protocol|Mesh Mission Protocol)"/)
})

test("the shared operation workspace accepts an optional native extension panel", () => {
  const workspace = read("components", "fusarium", "platform-operations", "platform-operation-workspace.tsx")
  assert.match(workspace, /children\?: ReactNode/)
  assert.match(workspace, /\{children\}/)
})
