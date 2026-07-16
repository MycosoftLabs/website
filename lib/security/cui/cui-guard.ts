import { createHash } from 'node:crypto';

export const CUI_POLICY_ID = 'MYC-CUI-AI-ROB-1.0';
export const CUI_POLICY_SHA256 = '350442fb938e5e14114817e7ddfc08a16ecb84bf3a50b705977b4a68655beb19';
export const CUI_AUTHORIZED_SYSTEM = 'PreVeil';

export type GuardFinding = { ruleId: string; kind: 'cui' | 'secret'; path: string };
export type GuardDecision = {
  allowed: boolean;
  policyId: string;
  policySha256: string;
  fingerprint: string;
  payloadBytes: number;
  findings: GuardFinding[];
  reasonCodes: string[];
};

const CUI_RULES: Array<[string, RegExp]> = [
  ['CUI_MARKING', /\bCUI\/\/(?:[A-Z0-9_-]+(?:\/[A-Z0-9_-]+)*)/i],
  ['CUI_BANNER', /CONTROLLED\s+UNCLASSIFIED\s+INFORMATION.{0,180}(?:CONTROLLED\s+BY|CUI\s+CATEGORY|LIMITED\s+DISSEMINATION)/is],
  ['DISTRIBUTION_STATEMENT', /\bDISTRIBUTION\s+STATEMENT\s+[B-F]\b/i],
  ['EXPORT_CONTROLLED_MARKING', /\b(?:ITAR|EAR)\s+(?:CONTROLLED|RESTRICTED)\b/i],
];

const SECRET_RULES: Array<[string, RegExp]> = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['AWS_ACCESS_KEY', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GOOGLE_API_KEY', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['GITHUB_TOKEN', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
  ['OPENAI_KEY', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['SLACK_TOKEN', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['GENERIC_BEARER', /\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*\b/i],
  ['ASSIGNED_SECRET', /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/@-]{12,}/i],
];

const CLASSIFICATION_KEYS = new Set([
  'classification',
  'data_classification',
  'content_classification',
  'security_classification',
  'handling',
  'handling_level',
]);
const BLOCKED_CLASSIFICATIONS = new Set([
  'cui',
  'cui-basic',
  'cui-specified',
  'cti',
  'cdi',
  'controlled technical information',
  'covered defense information',
  'itar-controlled',
  'ear-controlled',
  'export-controlled',
  'fouo',
]);
const TRUE_CUI_KEYS = new Set(['contains_cui', 'is_cui', 'cui', 'contains_cti', 'contains_cdi']);

function canonical(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (item: unknown): unknown => {
    if (item === null || typeof item !== 'object') return item;
    if (seen.has(item as object)) return '[Circular]';
    seen.add(item as object);
    if (Array.isArray(item)) return item.map(normalize);
    const entries = Object.entries(item as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, normalize(val)]);
    return Object.fromEntries(entries);
  };
  return JSON.stringify(normalize(value));
}

function walk(value: unknown, path = '$'): Array<{ path: string; key?: string; value: unknown }> {
  const rows: Array<{ path: string; key?: string; value: unknown }> = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => rows.push(...walk(item, `${path}[${index}]`)));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const child = `${path}.${key}`;
      rows.push({ path: child, key, value: item });
      rows.push(...walk(item, child));
    }
  } else {
    rows.push({ path, value });
  }
  return rows;
}

export function inspectNonCui(payload: unknown): GuardDecision {
  const serialized = canonical(payload);
  const findings: GuardFinding[] = [];

  for (const row of walk(payload)) {
    const key = row.key?.trim().toLowerCase();
    if (key && TRUE_CUI_KEYS.has(key) && row.value === true) {
      findings.push({ ruleId: 'EXPLICIT_CUI_FLAG', kind: 'cui', path: row.path });
    }
    if (key && CLASSIFICATION_KEYS.has(key)) {
      const normalized = String(row.value ?? '').trim().toLowerCase();
      if (BLOCKED_CLASSIFICATIONS.has(normalized)) {
        findings.push({ ruleId: 'EXPLICIT_CUI_CLASSIFICATION', kind: 'cui', path: row.path });
      }
    }
    if (typeof row.value !== 'string') continue;
    for (const [ruleId, regex] of CUI_RULES) {
      if (regex.test(row.value)) findings.push({ ruleId, kind: 'cui', path: row.path });
    }
    for (const [ruleId, regex] of SECRET_RULES) {
      if (regex.test(row.value)) findings.push({ ruleId, kind: 'secret', path: row.path });
    }
  }

  const reasonCodes = [...new Set(findings.map((finding) => finding.ruleId))].sort();
  return {
    allowed: findings.length === 0,
    policyId: CUI_POLICY_ID,
    policySha256: CUI_POLICY_SHA256,
    fingerprint: createHash('sha256').update(serialized).digest('hex'),
    payloadBytes: Buffer.byteLength(serialized, 'utf8'),
    findings,
    reasonCodes,
  };
}

export class CuiBoundaryError extends Error {
  readonly decision: GuardDecision;
  readonly source: string;

  constructor(decision: GuardDecision, source: string) {
    super(
      `Blocked by ${CUI_POLICY_ID} at ${source}; route suspected CUI/secrets to ${CUI_AUTHORIZED_SYSTEM}. ` +
        `fingerprint=${decision.fingerprint} rules=${decision.reasonCodes.join(',') || 'UNSPECIFIED'}`,
    );
    this.name = 'CuiBoundaryError';
    this.decision = decision;
    this.source = source;
  }
}

export function assertNonCui(payload: unknown, source: string): GuardDecision {
  const decision = inspectNonCui(payload);
  if (!decision.allowed) {
    console.error('[cui-policy-block]', {
      source,
      policyId: CUI_POLICY_ID,
      policySha256: CUI_POLICY_SHA256,
      fingerprint: decision.fingerprint,
      payloadBytes: decision.payloadBytes,
      reasonCodes: decision.reasonCodes,
    });
    throw new CuiBoundaryError(decision, source);
  }
  return decision;
}
