/**
 * Envelope encryption for recoverable BYO AI provider keys.
 *
 * Model B (Claude handoff §2.2, Morgan/Cursor default Aug 12 2026):
 *   - Per-connection data encryption key (DEK) encrypts the provider secret.
 *   - DEK is wrapped by a platform master key.
 *   - Ciphertext lives in Postgres; DEK never at rest in plaintext.
 *   - Decrypt in-request only. Never log, never return, never put in Stripe.
 *
 * KMS backend:
 *   - Target: AWS KMS wrap of the DEK (`LAUNCHPAD_KMS_ARN`) — not provisioned yet.
 *   - Fallback (honest, current): AES-256-GCM wrap with `LAUNCHPAD_KMS_KEY`
 *     (32-byte base64 in gitignored env). Same envelope shape so swapping the
 *     wrap step to KMS later does not change the table.
 *
 * This is a NEW storage class vs launchpad_api_keys / agent enroll hashes,
 * which remain unrecoverable by design. Provider keys cannot be hashed.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export const ENVELOPE_ALG = 'aes-256-gcm';
export type KmsBackend = 'env_master' | 'aws_kms';

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
}

export class EnvelopeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeConfigError';
  }
}

function decodeMasterKey(raw: string): Buffer {
  const buf = Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_KEY must be 32 bytes encoded as standard base64 (AES-256).',
    );
  }
  return buf;
}

/** Returns null when the env master key is unset — callers must fail closed. */
export function loadEnvMasterKey(): Buffer | null {
  const raw = (process.env.LAUNCHPAD_KMS_KEY ?? '').trim();
  if (!raw) return null;
  return decodeMasterKey(raw);
}

export function kmsBackendStatus(): {
  backend: KmsBackend | 'unconfigured';
  awsKmsArnSet: boolean;
  envMasterConfigured: boolean;
} {
  const envMasterConfigured = Boolean((process.env.LAUNCHPAD_KMS_KEY ?? '').trim());
  const awsKmsArnSet = Boolean((process.env.LAUNCHPAD_KMS_ARN ?? '').trim());
  if (awsKmsArnSet) return { backend: 'aws_kms', awsKmsArnSet, envMasterConfigured };
  if (envMasterConfigured) return { backend: 'env_master', awsKmsArnSet, envMasterConfigured };
  return { backend: 'unconfigured', awsKmsArnSet, envMasterConfigured };
}

function requireMasterKey(): { key: Buffer; backend: KmsBackend } {
  const arn = (process.env.LAUNCHPAD_KMS_ARN ?? '').trim();
  if (arn) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_ARN is set but the AWS KMS wrap path is not provisioned in this build. Unset the ARN and use LAUNCHPAD_KMS_KEY until KMS is wired.',
    );
  }
  const key = loadEnvMasterKey();
  if (!key) {
    throw new EnvelopeConfigError(
      'LAUNCHPAD_KMS_KEY is not configured. BYO provider keys cannot be stored until a 32-byte base64 master key is set in gitignored env.',
    );
  }
  return { key, backend: 'env_master' };
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
  const { key: master, backend } = requireMasterKey();
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

/** Redact anything that looks like a provider key from log-bound strings. */
export function redactSecrets(input: string): string {
  return input
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bpk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bxai-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bpplx-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]')
    .replace(/\bkey_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED-SECRET]');
}
