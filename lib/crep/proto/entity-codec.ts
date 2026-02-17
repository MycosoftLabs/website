import type { UnifiedEntity, UnifiedEntityBatch } from "@/lib/crep/entities/unified-entity-schema";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeEntityBatchToBinary(batch: UnifiedEntityBatch): Uint8Array {
  return textEncoder.encode(JSON.stringify(batch));
}

export function decodeEntityBatchFromBinary(payload: ArrayBuffer): UnifiedEntityBatch {
  const json = textDecoder.decode(new Uint8Array(payload));
  return JSON.parse(json) as UnifiedEntityBatch;
}

export function decodeEntityFromBinary(payload: ArrayBuffer): UnifiedEntity {
  const parsed = decodeEntityBatchFromBinary(payload);
  if (parsed.entities.length === 0) {
    throw new Error("Entity payload does not contain entities");
  }
  return parsed.entities[0];
}
