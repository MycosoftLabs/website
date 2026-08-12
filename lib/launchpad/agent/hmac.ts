/**
 * Local Assurance Agent — HMAC helpers.
 *
 * Per-agent HMAC key is derived from LAUNCHPAD_AGENT_ROOT_SECRET + agent_id
 * so the DB only stores hashes (enrollment_token_hash / hmac_key_hash) and
 * the server can re-derive the key for verification without storing plaintext.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TIMESTAMP_SKEW_SEC = 300;

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function getAgentRootSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const v = env.LAUNCHPAD_AGENT_ROOT_SECRET?.trim();
  return v || null;
}

/** Deterministic per-agent HMAC key (shown once at enroll; re-derived on verify). */
export function deriveAgentHmacKey(rootSecret: string, agentId: string): string {
  return createHmac('sha256', rootSecret).update(`lp-agent-v1:${agentId}`).digest('hex');
}

export function mintEnrollmentToken(): string {
  return randomBytes(32).toString('base64url');
}

export function buildAgentSignature(hmacKey: string, timestampSec: number, rawBody: string): string {
  return createHmac('sha256', hmacKey).update(`${timestampSec}.${rawBody}`).digest('hex');
}

export function verifyAgentSignature(opts: {
  hmacKey: string;
  timestampHeader: string;
  signatureHeader: string;
  rawBody: string;
  nowSec?: number;
}): { ok: true; timestampSec: number } | { ok: false; error: string } {
  const ts = Number(opts.timestampHeader);
  if (!Number.isFinite(ts)) return { ok: false, error: 'invalid timestamp' };
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_SKEW_SEC) {
    return { ok: false, error: 'timestamp outside ±300s window' };
  }
  const expected = buildAgentSignature(opts.hmacKey, ts, opts.rawBody);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(opts.signatureHeader.trim(), 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: 'invalid signature' };
  }
  return { ok: true, timestampSec: ts };
}

/** Replay key material for (agent, timestamp, signature) uniqueness checks. */
export function replayFingerprint(agentId: string, timestampSec: number, signature: string): string {
  return sha256Hex(`${agentId}|${timestampSec}|${signature}`);
}
