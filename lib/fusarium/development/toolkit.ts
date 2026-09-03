export const DEVELOPMENT_JSON_LIMIT = 65_536
export const DEVELOPMENT_MAX_DEPTH = 16
export const DEVELOPMENT_MAX_KEYS = 1_000

export type ContractField = { name: string; type: string; required: boolean; description: string }
export type MountedContract = {
  id: string
  title: string
  schema: string
  source: string
  endpoint: string
  fields: readonly ContractField[]
  example: Readonly<Record<string, unknown>>
}

export const MOUNTED_CONTRACTS: readonly MountedContract[] = [
  {
    id: "sensing-scope", title: "Sensing scope", schema: "fusarium-sensing-scope/v1", source: "lib/fusarium/sensing-scope/contracts.ts", endpoint: "/api/fusarium/sensing/scope/options",
    fields: [
      { name: "schema", type: "literal", required: true, description: "Contract discriminator." },
      { name: "kind", type: "unbound | devices | mission | location | environment", required: true, description: "Read-only selection kind." },
      { name: "deviceIds", type: "string[]", required: true, description: "Stable device identifiers." },
      { name: "contextId", type: "string | null", required: true, description: "Mission, location, or environment identifier." },
      { name: "contextLabel", type: "string | null", required: true, description: "Display-only context label." },
    ],
    example: { schema: "fusarium-sensing-scope/v1", kind: "unbound", deviceIds: [], contextId: null, contextLabel: null },
  },
  {
    id: "device-observation-scope", title: "Device observation scope", schema: "fusarium-device-observations/v1", source: "lib/fusarium/device-observations/contracts.ts", endpoint: "/api/fusarium/device-observations",
    fields: [
      { name: "schema", type: "literal", required: true, description: "Contract discriminator." },
      { name: "deviceIds", type: "string[]", required: true, description: "Read filter; never command authority." },
      { name: "context", type: "object", required: true, description: "Mission, location, and environment identifiers." },
      { name: "modalities", type: "string[]", required: true, description: "Requested passive sensing modalities." },
      { name: "classification", type: "UNCLASSIFIED", required: true, description: "Current commercial handling boundary." },
    ],
    example: { schema: "fusarium-device-observations/v1", deviceIds: [], context: { missionId: null, locationId: null, environmentId: null }, modalities: [], classification: "UNCLASSIFIED" },
  },
  {
    id: "mechanical-sequence", title: "Mechanical sequence", schema: "mycosoft.mechanical.sequence.v1", source: "lib/fusarium/mechanical/contracts.ts", endpoint: "local validation only",
    fields: [
      { name: "schema", type: "literal", required: true, description: "Contract discriminator." },
      { name: "sequenceId", type: "string", required: true, description: "Stable local sequence identifier." },
      { name: "deviceId", type: "string | null", required: true, description: "Optional passive device association." },
      { name: "samples", type: "array", required: true, description: "Bounded mechanical samples." },
      { name: "provenance", type: "object", required: true, description: "File import or local capture evidence." },
    ],
    example: { schema: "mycosoft.mechanical.sequence.v1", sequenceId: "example-sequence", deviceId: null, samples: [], provenance: { source: "file_import", notes: null } },
  },
  {
    id: "gandha-dataset", title: "GANDHA dataset", schema: "mycosoft.gandha.dataset.v1", source: "lib/fusarium/gandha/contracts.ts", endpoint: "local validation only",
    fields: [
      { name: "schema", type: "literal", required: true, description: "Contract discriminator." },
      { name: "datasetId", type: "string", required: true, description: "Stable local dataset identifier." },
      { name: "createdAt", type: "ISO timestamp", required: true, description: "Dataset creation time." },
      { name: "sensor", type: "object", required: true, description: "Sensor family and device evidence." },
      { name: "samples", type: "array", required: true, description: "Bounded gas-sensor samples." },
      { name: "provenance", type: "object", required: true, description: "File import or local capture evidence." },
    ],
    example: { schema: "mycosoft.gandha.dataset.v1", datasetId: "example-dataset", createdAt: "2026-09-01T00:00:00.000Z", sensor: { family: "BME69x", deviceId: null, firmwareVersion: null }, channelUnits: {}, samples: [], provenance: { source: "file_import", notes: null } },
  },
] as const

export type ValidationResult = { ok: boolean; issues: string[]; bytes: number; depth: number; keys: number; parsed: unknown | null }

export function validateLocalJson(text: string, contractId: string): ValidationResult {
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > DEVELOPMENT_JSON_LIMIT) return { ok: false, issues: [`Input exceeds ${DEVELOPMENT_JSON_LIMIT} bytes.`], bytes, depth: 0, keys: 0, parsed: null }
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return { ok: false, issues: ["Input is not valid JSON."], bytes, depth: 0, keys: 0, parsed: null } }
  const shape = inspectShape(parsed)
  const issues: string[] = []
  if (shape.depth > DEVELOPMENT_MAX_DEPTH) issues.push(`Object depth exceeds ${DEVELOPMENT_MAX_DEPTH}.`)
  if (shape.keys > DEVELOPMENT_MAX_KEYS) issues.push(`Object key count exceeds ${DEVELOPMENT_MAX_KEYS}.`)
  const contract = MOUNTED_CONTRACTS.find((candidate) => candidate.id === contractId)
  if (!contract) issues.push("Select a known mounted contract.")
  if (!isRecord(parsed)) issues.push("Contract root must be a JSON object.")
  if (contract && isRecord(parsed)) {
    if (parsed.schema !== contract.schema) issues.push(`schema must equal ${contract.schema}.`)
    for (const field of contract.fields.filter((candidate) => candidate.required)) if (!(field.name in parsed)) issues.push(`${field.name} is required.`)
    issues.push(...validateKnownShape(contract.id, parsed))
  }
  return { ok: issues.length === 0, issues: [...new Set(issues)].slice(0, 25), bytes, depth: shape.depth, keys: shape.keys, parsed }
}

export function generateSdkArtifact(contractId: string, language: "typescript" | "python" | "json"): string {
  const contract = MOUNTED_CONTRACTS.find((candidate) => candidate.id === contractId)
  if (!contract) return "Unknown mounted contract."
  if (language === "json") return JSON.stringify(contract.example, null, 2)
  const safeName = contract.title.replace(/[^A-Za-z0-9]/g, "")
  if (language === "python") {
    const fields = contract.fields.map((field) => `    ${field.name}: ${pythonType(field.type)}`).join("\n")
    return `# Generated from ${contract.source}\n# Local example only; no request is executed or package published.\nfrom typing import Any\nfrom pydantic import BaseModel\n\nclass ${safeName}(BaseModel):\n${fields}`
  }
  const fields = contract.fields.map((field) => `  ${field.name}${field.required ? "" : "?"}: ${typescriptType(field.type)}`).join("\n")
  return `// Generated from ${contract.source}\n// Local example only; no request is executed or package published.\nexport interface ${safeName} {\n${fields}\n}\n\nexport const example: ${safeName} = ${JSON.stringify(contract.example, null, 2)} as ${safeName}`
}

function inspectShape(value: unknown, depth = 1): { depth: number; keys: number } {
  if (Array.isArray(value)) return value.reduce((state, item) => { const next = inspectShape(item, depth + 1); return { depth: Math.max(state.depth, next.depth), keys: state.keys + next.keys } }, { depth, keys: 0 })
  if (!isRecord(value)) return { depth, keys: 0 }
  return Object.values(value).reduce((state, item) => { const next = inspectShape(item, depth + 1); return { depth: Math.max(state.depth, next.depth), keys: state.keys + next.keys } }, { depth, keys: Object.keys(value).length })
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) }
function validateKnownShape(id: string, value: Record<string, unknown>): string[] {
  const issues: string[] = []
  if (id === "sensing-scope") {
    if (!Array.isArray(value.deviceIds)) issues.push("deviceIds must be an array.")
    if (!["unbound", "devices", "mission", "location", "environment"].includes(String(value.kind))) issues.push("kind is not a supported sensing scope.")
  }
  if (id === "device-observation-scope") {
    if (!Array.isArray(value.deviceIds)) issues.push("deviceIds must be an array.")
    if (!Array.isArray(value.modalities)) issues.push("modalities must be an array.")
    if (!isRecord(value.context)) issues.push("context must be an object.")
    if (value.classification !== "UNCLASSIFIED") issues.push("classification must equal UNCLASSIFIED.")
  }
  if (id === "mechanical-sequence" || id === "gandha-dataset") if (!Array.isArray(value.samples)) issues.push("samples must be an array.")
  return issues
}
function typescriptType(type: string): string {
  if (type === "literal") return "string"
  if (type.includes("string[]")) return "string[]"
  if (type === "array") return "unknown[]"
  if (type === "object") return "Record<string, unknown>"
  if (type.includes("null")) return "string | null"
  if (type.includes(" | ")) return type.split(" | ").map((part) => `\"${part}\"`).join(" | ")
  return "string"
}
function pythonType(type: string): string {
  if (type.includes("string[]")) return "list[str]"
  if (type === "array") return "list[Any]"
  if (type === "object") return "dict[str, Any]"
  if (type.includes("null")) return "str | None"
  return "str"
}
