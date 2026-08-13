/**
 * Upload / text interceptor for the COMMERCIAL // NON-CUI workspace.
 *
 * Blocks obvious CUI banners, API-key-shaped strings, SF-86 markers, and
 * private-key PEM blocks. This is a guardrail, not a classifier — CUI depends
 * on source and context. Hits write an immutable quarantine/audit event; the
 * payload itself is never stored.
 */

export type DlpHitKind =
  | 'cui_marker'
  | 'api_key_shape'
  | 'private_key_pem'
  | 'sf86'
  | 'ssn_like'
  | 'classified_marker';

export interface DlpHit {
  kind: DlpHitKind;
  excerpt: string;
}

export interface DlpResult {
  blocked: boolean;
  hits: DlpHit[];
}

const CHECKS: Array<{ kind: DlpHitKind; re: RegExp }> = [
  { kind: 'cui_marker', re: /\bCUI\s*\/\//i },
  { kind: 'classified_marker', re: /\b(TOP SECRET|SECRET\/\/|CONFIDENTIAL\/\/)\b/i },
  { kind: 'sf86', re: /\bSF[-\s]?86\b|\b(e-QIP|eQIP|NBIS)\b/i },
  { kind: 'private_key_pem', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'api_key_shape', re: /\b(sk|pk|rk|xai|pplx|ghp)[-_][A-Za-z0-9_-]{16,}\b/i },
  { kind: 'api_key_shape', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'ssn_like', re: /\b\d{3}-\d{2}-\d{4}\b/ },
];

function excerptAround(text: string, index: number): string {
  const start = Math.max(0, index - 12);
  const end = Math.min(text.length, index + 12);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

export function scanTextForBoundary(input: string): DlpResult {
  const hits: DlpHit[] = [];
  for (const check of CHECKS) {
    const re = new RegExp(check.re.source, check.re.flags.includes('g') ? check.re.flags : `${check.re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      hits.push({ kind: check.kind, excerpt: excerptAround(input, m.index) });
      if (hits.length >= 8) break;
    }
    if (hits.length >= 8) break;
  }
  return { blocked: hits.length > 0, hits };
}

export function filenameLooksDangerous(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('sf-86') || n.includes('sf86') || n.endsWith('.pcap') || n.endsWith('.pcapng');
}
