import { stableStringify, sha256Prefixed, createRecordId, textEncode } from "./encoding"
import { signEd25519, verifyEd25519 } from "./signatures"

export interface MINDEXRecord {
  record_id: string
  data_hash: string // sha256:...
  prev_hash: string | null // sha256:... | null for genesis
  signature: string // ed25519:...
  timestamp: string // ISO 8601
  device_id?: string
  user_id?: string
  payload: unknown
  public_key?: string // ed25519:... (optional for verification convenience)
}

export interface CreateRecordInput {
  payload: unknown
  prevHash?: string | null
  timestamp?: string
  deviceId?: string
  userId?: string
  signingPrivateKey: string // ed25519:<raw32>
  signingPublicKey?: string // optional to embed for downstream verification
}

export function hashPayload(payload: unknown): string {
  const canonical = stableStringify(payload)
  return sha256Prefixed(canonical)
}

export function hashLink(prevHash: string | null, dataHash: string): string {
  const linkMaterial = stableStringify({ prev_hash: prevHash, data_hash: dataHash })
  return sha256Prefixed(linkMaterial)
}

export function createSignedRecord(input: CreateRecordInput): MINDEXRecord {
  const record_id = createRecordId()
  const timestamp = input.timestamp || new Date().toISOString()
  const prev_hash = input.prevHash ?? null
  const data_hash = hashPayload(input.payload)

  const link_hash = hashLink(prev_hash, data_hash)
  const message = textEncode(link_hash)
  const signature = signEd25519(message, input.signingPrivateKey)

  const record: MINDEXRecord = {
    record_id,
    data_hash,
    prev_hash,
    signature,
    timestamp,
    payload: input.payload,
  }

  if (input.deviceId) record.device_id = input.deviceId
  if (input.userId) record.user_id = input.userId
  if (input.signingPublicKey) record.public_key = input.signingPublicKey

  return record
}

export function verifyRecordSignature(record: MINDEXRecord, publicKey: string): boolean {
  const link_hash = hashLink(record.prev_hash ?? null, record.data_hash)
  const message = textEncode(link_hash)
  return verifyEd25519(message, record.signature, publicKey)
}

export function verifyHashChain(records: MINDEXRecord[], publicKeyByRecordId?: Record<string, string>): {
  valid: boolean
  failures: Array<{ record_id: string; reason: string }>
} {
  const failures: Array<{ record_id: string; reason: string }> = []

  for (let i = 0; i < records.length; i++) {
    const current = records[i]
    const previous = i > 0 ? records[i - 1] : null

    const expectedPrev = previous ? hashLink(previous.prev_hash ?? null, previous.data_hash) : null
    const actualPrev = current.prev_hash ?? null

    if (expectedPrev !== actualPrev) {
      failures.push({
        record_id: current.record_id,
        reason: `prev_hash mismatch (expected ${expectedPrev ?? "null"}, got ${actualPrev ?? "null"})`,
      })
    }

    const expectedDataHash = hashPayload(current.payload)
    if (expectedDataHash !== current.data_hash) {
      failures.push({
        record_id: current.record_id,
        reason: `data_hash mismatch (expected ${expectedDataHash}, got ${current.data_hash})`,
      })
    }

    const publicKey = current.public_key || publicKeyByRecordId?.[current.record_id]
    if (!publicKey) {
      failures.push({ record_id: current.record_id, reason: "missing public key for signature verification" })
      continue
    }

    const sigOk = verifyRecordSignature(current, publicKey)
    if (!sigOk) failures.push({ record_id: current.record_id, reason: "invalid ed25519 signature" })
  }

  return { valid: failures.length === 0, failures }
}

