export const MECHANICAL_SEQUENCE_SCHEMA = "mycosoft.mechanical.sequence.v1" as const
export const MECHANICAL_MAX_SAMPLES = 100_000

export interface MechanicalContact { x: number; y: number; pressureN: number }
export interface MechanicalSample {
  sampleId: string
  observedAt: string
  contacts: MechanicalContact[]
  forceN: { x: number; y: number; z: number }
  jointsDeg: Record<string, number>
  label: string | null
}
export interface MechanicalSequence {
  schema: typeof MECHANICAL_SEQUENCE_SCHEMA
  sequenceId: string
  deviceId: string | null
  samples: MechanicalSample[]
  provenance: { source: "file_import" | "local_capture"; notes: string | null }
}
export type MechanicalValidation =
  | { ok: true; value: MechanicalSequence; issues: [] }
  | { ok: false; value: null; issues: string[] }

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) }
function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null }
function finite(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null }
function timestamp(value: unknown): string | null { const candidate = text(value); return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null }

function parseSample(value: unknown, index: number, issues: string[]): MechanicalSample | null {
  const path = `samples[${index}]`
  if (!record(value)) { issues.push(`${path} must be an object.`); return null }
  const sampleId = text(value.sampleId)
  const observedAt = timestamp(value.observedAt)
  if (!sampleId) issues.push(`${path}.sampleId is required.`)
  if (!observedAt) issues.push(`${path}.observedAt must be an ISO-compatible timestamp.`)
  const contactsInput = Array.isArray(value.contacts) ? value.contacts : null
  if (!contactsInput) issues.push(`${path}.contacts must be an array.`)
  else if (contactsInput.length > 4096) issues.push(`${path}.contacts exceeds 4096 points.`)
  const contacts: MechanicalContact[] = []
  for (const [contactIndex, item] of (contactsInput ?? []).entries()) {
    if (!record(item)) { issues.push(`${path}.contacts[${contactIndex}] must be an object.`); continue }
    const x = finite(item.x), y = finite(item.y), pressureN = finite(item.pressureN)
    if (x === null || x < 0 || x > 1 || y === null || y < 0 || y > 1) issues.push(`${path}.contacts[${contactIndex}] x and y must be normalized from 0 to 1.`)
    if (pressureN === null || pressureN < 0) issues.push(`${path}.contacts[${contactIndex}].pressureN must be non-negative and finite.`)
    if (x !== null && x >= 0 && x <= 1 && y !== null && y >= 0 && y <= 1 && pressureN !== null && pressureN >= 0) contacts.push({ x, y, pressureN })
  }
  const forceInput = record(value.forceN) ? value.forceN : null
  const fx = forceInput ? finite(forceInput.x) : null, fy = forceInput ? finite(forceInput.y) : null, fz = forceInput ? finite(forceInput.z) : null
  if (fx === null || fy === null || fz === null) issues.push(`${path}.forceN must contain finite x, y, and z values.`)
  const jointsInput = record(value.jointsDeg) ? value.jointsDeg : null
  if (!jointsInput) issues.push(`${path}.jointsDeg must be an object.`)
  const jointsDeg: Record<string, number> = {}
  for (const [joint, raw] of Object.entries(jointsInput ?? {})) {
    const angle = finite(raw)
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(joint) || angle === null) issues.push(`${path}.jointsDeg.${joint} must be a finite named joint angle.`)
    else jointsDeg[joint] = angle
  }
  const label = value.label === null || value.label === undefined ? null : text(value.label)
  if (value.label !== null && value.label !== undefined && !label) issues.push(`${path}.label must be non-empty or null.`)
  if (!sampleId || !observedAt || fx === null || fy === null || fz === null || !jointsInput) return null
  return { sampleId, observedAt, contacts, forceN: { x: fx, y: fy, z: fz }, jointsDeg, label }
}

export function validateMechanicalSequence(input: unknown): MechanicalValidation {
  if (!record(input)) return { ok: false, value: null, issues: ["Sequence root must be an object."] }
  const issues: string[] = []
  if (input.schema !== MECHANICAL_SEQUENCE_SCHEMA) issues.push(`schema must equal ${MECHANICAL_SEQUENCE_SCHEMA}.`)
  const sequenceId = text(input.sequenceId)
  if (!sequenceId) issues.push("sequenceId is required.")
  const rows = Array.isArray(input.samples) ? input.samples : null
  if (!rows) issues.push("samples must be an array.")
  else if (rows.length === 0) issues.push("samples must contain at least one sample.")
  else if (rows.length > MECHANICAL_MAX_SAMPLES) issues.push(`samples exceeds the ${MECHANICAL_MAX_SAMPLES}-sample limit.`)
  const samples = (rows ?? []).map((row, index) => parseSample(row, index, issues)).filter((row): row is MechanicalSample => row !== null)
  const provenanceInput = record(input.provenance) ? input.provenance : null
  const source = provenanceInput?.source
  if (source !== "file_import" && source !== "local_capture") issues.push("provenance.source must be file_import or local_capture.")
  const ids = new Set<string>(); for (const sample of samples) { if (ids.has(sample.sampleId)) issues.push(`Duplicate sampleId: ${sample.sampleId}.`); ids.add(sample.sampleId) }
  if (issues.length || !sequenceId) return { ok: false, value: null, issues: [...new Set(issues)].slice(0, 50) }
  return { ok: true, value: { schema: MECHANICAL_SEQUENCE_SCHEMA, sequenceId, deviceId: text(input.deviceId), samples, provenance: { source: source === "local_capture" ? "local_capture" : "file_import", notes: provenanceInput ? text(provenanceInput.notes) : null } }, issues: [] }
}

export function mechanicalSampleSummary(sample: MechanicalSample) {
  const forceMagnitudeN = Math.hypot(sample.forceN.x, sample.forceN.y, sample.forceN.z)
  const totalPressureN = sample.contacts.reduce((sum, contact) => sum + contact.pressureN, 0)
  const peakPressureN = sample.contacts.reduce((peak, contact) => Math.max(peak, contact.pressureN), 0)
  return { sampleId: sample.sampleId, contactCount: sample.contacts.length, forceMagnitudeN, totalPressureN, peakPressureN, jointCount: Object.keys(sample.jointsDeg).length }
}

export function stageMechanicalLabel(sequence: MechanicalSequence, sampleId: string, label: string): MechanicalValidation {
  const clean = text(label)
  if (!clean) return { ok: false, value: null, issues: ["A non-empty label is required."] }
  const index = sequence.samples.findIndex((sample) => sample.sampleId === sampleId)
  if (index < 0) return { ok: false, value: null, issues: [`Unknown sampleId: ${sampleId}.`] }
  return { ok: true, value: { ...sequence, samples: sequence.samples.map((sample, current) => current === index ? { ...sample, label: clean } : sample) }, issues: [] }
}

export function mechanicalTrainingReadiness(sequence: MechanicalSequence | null, providerBound: boolean) {
  const reasons: string[] = []
  if (!sequence) reasons.push("Import a valid mechanical sequence.")
  if (sequence && sequence.samples.some((sample) => sample.label === null)) reasons.push("Label every sample before training.")
  if (!providerBound) reasons.push("Bind an approved simulation or training provider.")
  return { canSubmit: reasons.length === 0, reasons }
}


export function mechanicalSequenceSummary(sequence: MechanicalSequence) {
  const observedTimes = sequence.samples.map((sample) => Date.parse(sample.observedAt))
  const summaries = sequence.samples.map(mechanicalSampleSummary)
  return {
    sampleCount: sequence.samples.length,
    durationMs: Math.max(0, Math.max(...observedTimes) - Math.min(...observedTimes)),
    peakForceN: Math.max(...summaries.map((summary) => summary.forceMagnitudeN)),
    peakPressureN: Math.max(...summaries.map((summary) => summary.peakPressureN)),
    labeledCount: sequence.samples.filter((sample) => sample.label !== null).length,
    jointNames: [...new Set(sequence.samples.flatMap((sample) => Object.keys(sample.jointsDeg)))].sort(),
  }
}

export function mechanicalTrend(sequence: MechanicalSequence) {
  return sequence.samples.map((sample) => {
    const summary = mechanicalSampleSummary(sample)
    return {
      sampleId: sample.sampleId,
      observedAt: sample.observedAt,
      forceMagnitudeN: summary.forceMagnitudeN,
      totalPressureN: summary.totalPressureN,
      peakPressureN: summary.peakPressureN,
      contactCount: summary.contactCount,
    }
  })
}
