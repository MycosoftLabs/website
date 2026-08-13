/**
 * Envelope encryption for recoverable BYO AI provider keys.
 *
 * Model B (Claude readiness contract Aug 12 2026):
 *   - Random DEK per secret encrypts the provider key (AES-256-GCM).
 *   - DEK is wrapped by the platform master key (AES-256-GCM).
 *   - Ciphertext + wrapped DEK live in Postgres bytea; DEK never at rest in plaintext.
 *   - Decrypt in-request only via service role. Never log, never return, never Stripe.
 *
 * Env (gitignored `.env.local` only):
 *   - `LAUNCHPAD_KMS_MASTER_KEY` — 32-byte key as **64 hex chars** (Claude contract).
 *   - `LAUNCHPAD_KMS_MASTER_KEY_ID` — identifier written to `key_kms_key_id`.
 *   - `LAUNCHPAD_KMS_KEY` — legacy alias, 32-byte **standard base64**.
 *   - `LAUNCHPAD_KMS_ARN` — AWS KMS target; **not provisioned**. If set, wrap fails closed.
 *
 * Hashed tenant API keys / agent enroll secrets remain a different storage class.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export const ENVELOPE_ALG = 'aes-256-gcm';
export type KmsBackend = 'env_master' | 'aws_kms';
export const DEFAULT_MASTER_KEY_ID = 'env-master-v1';

export interface EnvelopeBlob {
  ciphertext: string;
  nonce: string;
  tag: string;
  wrappedDek: string;
  wrapNonce: string;
  wrapTag: string;
  dekId: string;
  alg: typeof ENVELOPE_ALG;
  kmsBackend: KmsBackend;
  masterKeyId: string;
}

export class EnvelopeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeConfigError';
  }
}

function decodeHexKey(raw: string): Buffer {
  const hex = raw.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_MASTER_KEY must be 32 bytes encoded as 64 hex characters.',
    );
  }
  return Buffer.from(hex, 'hex');
}

function decodeBase64Key(raw: string): Buffer {
  const buf = Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_KEY (legacy) must be 32 bytes encoded as standard base64 (AES-256).',
    );
  }
  return buf;
}

export function masterKeyId(): string {
  const id = (process.env.LAUNCHPAD_KMS_MASTER_KEY_ID ?? '').trim();
  return id || DEFAULT_MASTER_KEY_ID;
}

/** Returns null when no env master key is set — callers must fail closed. */
export function loadEnvMasterKey(): Buffer | null {
  const hex = (process.env.LAUNCHPAD_KMS_MASTER_KEY ?? '').trim();
  if (hex) return decodeHexKey(hex);
  const b64 = (process.env.LAUNCHPAD_KMS_KEY ?? '').trim();
  if (b64) return decodeBase64Key(b64);
  return null;
}

export function kmsBackendStatus(): {
  backend: KmsBackend | 'unconfigured';
  masterKeyId: string | null;
  awsKmsArnSet: boolean;
  envMasterConfigured: boolean;
  wrapAlgorithm: typeof ENVELOPE_ALG;
  note: string;
} {
  const envMasterConfigured = Boolean(
    (process.env.LAUNCHPAD_KMS_MASTER_KEY ?? '').trim() || (process.env.LAUNCHPAD_KMS_KEY ?? '').trim(),
  );
  const awsKmsArnSet = Boolean((process.env.LAUNCHPAD_KMS_ARN ?? '').trim());
  const id = envMasterConfigured ? masterKeyId() : null;
  if (awsKmsArnSet) {
    return {
      backend: 'aws_kms',
      masterKeyId: id,
      awsKmsArnSet,
      envMasterConfigured,
      wrapAlgorithm: ENVELOPE_ALG,
      note: 'LAUNCHPAD_KMS_ARN is set but AWS KMS wrap is not provisioned. Unset the ARN and use LAUNCHPAD_KMS_MASTER_KEY (hex) until KMS is wired.',
    };
  }
  if (envMasterConfigured) {
    return {
      backend: 'env_master',
      masterKeyId: id,
      awsKmsArnSet,
      envMasterConfigured,
      wrapAlgorithm: ENVELOPE_ALG,
      note: 'Application envelope: random DEK per secret, DEK wrapped with env master key (AES-256-GCM). Not AWS KMS.',
    };
  }
  return {
    backend: 'unconfigured',
    masterKeyId: null,
    awsKmsArnSet,
    envMasterConfigured,
    wrapAlgorithm: ENVELOPE_ALG,
    note: 'Set LAUNCHPAD_KMS_MASTER_KEY (64 hex chars) and LAUNCHPAD_KMS_MASTER_KEY_ID in gitignored .env.local.',
  };
}

function requireMasterKey(): { key: Buffer; backend: KmsBackend; masterKeyId: string } {
  const arn = (process.env.LAUNCHPAD_KMS_ARN ?? '').trim();
  if (arn) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_ARN is set but the AWS KMS wrap path is not provisioned. Unset the ARN and use LAUNCHPAD_KMS_MASTER_KEY until KMS is wired.',
    );
  }
  const key = loadEnvMasterKey();
  if (!key) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_MASTER_KEY is not configured. BYO provider keys cannot be stored until a 32-byte hex master key is set in gitignored env.',
    );
  }
  return { key, backend: 'env_master', masterKeyId: masterKeyId() };
}

function gcmEncrypt(key: Buffer, plaintext: Buffer): { nonce: Buffer; ciphertext: Buffer; tag: Buffer } {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ENVELOPE_ALG, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { nonce, ciphertext, tag };
}

function gcmDecrypt(key: Buffer, nonce: Buffer, ciphertext: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv(ENVELOPE_ALG, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function envelopeEncrypt(plaintext: string): EnvelopeBlob {
  const { key: master, backend, masterKeyId: id } = requireMasterKey();
  const dek = randomBytes(32);
  try {
    const inner = gcmEncrypt(dek, Buffer.from(plaintext, 'utf8'));
    const wrapped = gcmEncrypt(master, dek);
    const dekId = createHash('sha256').update(wrapped.ciphertext).digest('hex').slice(0, 16);
    return {
      ciphertext: inner.ciphertext.toString('base64'),
      nonce: inner.nonce.toString('base64'),
      tag: inner.tag.toString('base64'),
      wrappedDek: wrapped.ciphertext.toString('base64'),
      wrapNonce: wrapped.nonce.toString('base64'),
      wrapTag: wrapped.tag.toString('base64'),
      dekId,
      alg: ENVELOPE_ALG,
      kmsBackend: backend,
      masterKeyId: id,
    };
  } finally {
    dek.fill(0);
  }
}

export function envelopeDecrypt(blob: EnvelopeBlob): string {
  if (blob.alg !== ENVELOPE_ALG) {
    throw new EnvelopeConfigError(`Unsupported envelope alg ${blob.alg}`);
  }
  if (blob.kmsBackend === 'aws_kms') {
    throw new EnvelopeConfigError('AWS KMS unwrap is not provisioned in this build.');
  }
  const { key: master } = requireMasterKey();
  const dek = gcmDecrypt(
    master,
    Buffer.from(blob.wrapNonce, 'base64'),
    Buffer.from(blob.wrappedDek, 'base64'),
    Buffer.from(blob.wrapTag, 'base64'),
  );
  try {
    const plain = gcmDecrypt(
      dek,
      Buffer.from(blob.nonce, 'base64'),
      Buffer.from(blob.ciphertext, 'base64'),
      Buffer.from(blob.tag, 'base64'),
    );
    return plain.toString('utf8');
  } finally {
    dek.fill(0);
  }
}

/** Postgres bytea literal for PostgREST (`\\x` + hex). Never contains plaintext. */
export function envelopeToByteaHex(blob: EnvelopeBlob): {
  ciphertextHex: string;
  wrappedHex: string;
} {
  const inner = Buffer.from(
    JSON.stringify({
      ciphertext: blob.ciphertext,
      nonce: blob.nonce,
      tag: blob.tag,
      alg: blob.alg,
    }),
    'utf8',
  );
  const wrap = Buffer.from(
    JSON.stringify({
      wrappedDek: blob.wrappedDek,
      wrapNonce: blob.wrapNonce,
      wrapTag: blob.wrapTag,
      dekId: blob.dekId,
      kmsBackend: blob.kmsBackend,
      masterKeyId: blob.masterKeyId,
    }),
    'utf8',
  );
  return {
    ciphertextHex: '\\x' + inner.toString('hex'),
    wrappedHex: '\\x' + wrap.toString('hex'),
  };
}

function decodeByteaJson(raw: unknown): Record<string, string> | null {
  if (raw == null) return null;
  let buf: Buffer | null = null;
  if (typeof raw === 'string') {
    if (raw.startsWith('\\x') || raw.startsWith('\\X')) {
      buf = Buffer.from(raw.slice(2), 'hex');
    } else {
      try {
        buf = Buffer.from(raw, 'base64');
      } catch {
        buf = Buffer.from(raw, 'utf8');
      }
    }
  } else if (Buffer.isBuffer(raw)) {
    buf = raw;
  }
  if (!buf) return null;
  try {
    const parsed = JSON.parse(buf.toString('utf8')) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Reconstruct an envelope from either text columns or production bytea custody columns. */
export function envelopeFromCustodyRow(row: {
  ciphertext?: string | null;
  nonce?: string | null;
  tag?: string | null;
  wrapped_dek?: string | null;
  wrap_nonce?: string | null;
  wrap_tag?: string | null;
  dek_id?: string | null;
  alg?: string | null;
  kms_backend?: string | null;
  key_ciphertext?: unknown;
  key_dek_wrapped?: unknown;
  key_kms_key_id?: string | null;
}): EnvelopeBlob | null {
  if (row.ciphertext && row.nonce && row.tag && row.wrapped_dek && row.wrap_nonce && row.wrap_tag) {
    return {
      ciphertext: row.ciphertext,
      nonce: row.nonce,
      tag: row.tag,
      wrappedDek: row.wrapped_dek,
      wrapNonce: row.wrap_nonce,
      wrapTag: row.wrap_tag,
      dekId: row.dek_id ?? '',
      alg: (row.alg as EnvelopeBlob['alg']) || ENVELOPE_ALG,
      kmsBackend: (row.kms_backend as EnvelopeBlob['kmsBackend']) || 'env_master',
      masterKeyId: row.key_kms_key_id || DEFAULT_MASTER_KEY_ID,
    };
  }
  const inner = decodeByteaJson(row.key_ciphertext);
  const wrap = decodeByteaJson(row.key_dek_wrapped);
  if (!inner?.ciphertext || !inner.nonce || !inner.tag || !wrap?.wrappedDek || !wrap.wrapNonce || !wrap.wrapTag) {
    return null;
  }
  return {
    ciphertext: inner.ciphertext,
    nonce: inner.nonce,
    tag: inner.tag,
    wrappedDek: wrap.wrappedDek,
    wrapNonce: wrap.wrapNonce,
    wrapTag: wrap.wrapTag,
    dekId: wrap.dekId || row.dek_id || '',
    alg: (inner.alg as EnvelopeBlob['alg']) || ENVELOPE_ALG,
    kmsBackend: (wrap.kmsBackend as EnvelopeBlob['kmsBackend']) || 'env_master',
    masterKeyId: row.key_kms_key_id || wrap.masterKeyId || DEFAULT_MASTER_KEY_ID,
  };
}

/** Redact anything that looks like a provider key from log-bound strings. */
export function redactSecrets(input: string): string {
  return input
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bpk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bxai-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bpplx-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bkey_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]');
}
