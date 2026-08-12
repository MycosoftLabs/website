/**
 * FUSARIUM Launchpad — prompt firewall.
 *
 * Two jobs (master plan §10.2 control 5 and §11.7):
 *   sanitizeForModel  — strips restricted-field patterns from anything headed
 *                       to an LLM (EIN/SSN-like ids, secret-looking strings).
 *   filterModelOutput — post-filters generated text so no draft can carry a
 *                       prohibited compliance claim, and guarantees the DRAFT
 *                       label is present.
 *
 * This is a guardrail, not a classifier: it blocks obvious patterns and the
 * schema/UX prevent the rest (evidence has no content column; EIN is never
 * collected). Perfect CUI detection is impossible by definition — the product
 * never claims otherwise.
 */

import { DRAFT_LABEL, PROHIBITED_CLAIMS } from '@/lib/launchpad/constants';

const RESTRICTED_PATTERNS: Array<[RegExp, string]> = [
  // SSN-like
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-ID]'],
  // EIN-like (12-3456789)
  [/\b\d{2}-\d{7}\b/g, '[REDACTED-ID]'],
  // Bearer/API-key-looking strings
  [/\b(sk|pk|rk|mk|key|token|bearer)[-_][A-Za-z0-9_-]{16,}\b/gi, '[REDACTED-SECRET]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED-SECRET]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED-KEY]'],
  // CUI banner lines must never round-trip through a model prompt
  [/^.*\bCUI\s*\/\/.*$/gim, '[LINE REMOVED — CUI-MARKED CONTENT IS PROHIBITED IN THIS WORKSPACE]'],
];

export function sanitizeForModel(input: string): { text: string; redactions: number } {
  let text = input;
  let redactions = 0;
  for (const [re, replacement] of RESTRICTED_PATTERNS) {
    text = text.replace(re, () => {
      redactions++;
      return replacement;
    });
  }
  return { text, redactions };
}

/**
 * Post-filter model output: neutralize prohibited claims and ensure the DRAFT
 * label leads the document body.
 */
export function filterModelOutput(output: string): { text: string; flagged: string[] } {
  let text = output;
  const flagged: string[] = [];
  for (const claim of PROHIBITED_CLAIMS) {
    const re = new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(text)) {
      flagged.push(claim);
      text = text.replace(re, '[CLAIM REMOVED — requires authorized third-party or government record]');
    }
  }
  if (!text.includes(DRAFT_LABEL)) {
    text = `${DRAFT_LABEL}\n\n${text}`;
  }
  return { text, flagged };
}
